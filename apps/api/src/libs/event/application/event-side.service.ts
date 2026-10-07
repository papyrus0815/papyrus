import {
  BadRequestException,
  Injectable,
} from '@nestjs/common'
import { ObservationSubjectType, PrismaClient, SideLevel } from '@prisma/client'

import { assertEventOwnership } from '../domain/event-ownership'

import { removeObservationsForSubjects } from '../../evidence/application/observation-cleanup'
import { columnsToPoint, type StructuredPoint } from '../../shared/structured-point'

/** 진영 한 줄 입력 — id가 있으면 기존 진영, 없으면 새 진영 */
export interface EventSideInput {
  id?: string
  name: string
  level?: SideLevel | null
  color?: string | null
  description?: string | null
  parentSideId?: string | null
}

export interface EventSideMemberCountry {
  participantId: string
  countryId: string | null
  historicalCountryId: string | null
  name: string
  role: string
  participation: string | null
  join: StructuredPoint | null
  joinReason: string | null
  withdraw: StructuredPoint | null
  withdrawReason: string | null
}

export interface EventSideView {
  id: string
  name: string
  level: SideLevel | null
  color: string | null
  description: string | null
  parentSideId: string | null
  sortOrder: number
  participants: EventSideMemberCountry[]
  persons: Array<{ personEventId: string; personId: string; name: string; surname: string | null; role: string | null }>
  organizations: Array<{ relationId: string; organizationId: string; name: string; role: string }>
}

/**
 * 사건 진영(D1) — **쓰기 단일 통로**.
 *
 * 진영은 참여자를 묶는 층이다. 이 서비스는 진영 자체(이름·색·순서)만 쓰고, '어느 나라가 어느 편'은
 * 참여국 줄의 sideId(EventCountryParticipantService)가 쓴다 — 같은 사실을 두 곳에 적지 않는다.
 *
 * 저장은 id 자연키 머지다. 예전 군사 저장(saveMilitaryData)은 진영을 전부 지우고 다시 만들어
 * 저장할 때마다 진영 id가 바뀌었고, 진영에 붙은 측정값이 고아가 됐다.
 * 진영을 지우면: 소속 참여자는 sideId만 풀리고(FK SetNull), 진영에 붙은 측정값은 함께 지운다.
 */
@Injectable()
export class EventSideService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(eventId: string): Promise<EventSideView[]> {
    const sides = await this.prisma.eventSide.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        participants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            country: { select: { name: true } },
            historicalCountry: { select: { name: true } },
          },
        },
        persons: {
          orderBy: { sortOrder: 'asc' },
          include: { person: { select: { name: true, surname: true } } },
        },
        organizations: { include: { organization: { select: { name: true } } } },
      },
    })
    return sides.map((side) => ({
      id: side.id,
      name: side.name,
      level: side.level,
      color: side.color,
      description: side.description,
      parentSideId: side.parentSideId,
      sortOrder: side.sortOrder,
      participants: side.participants.map((row) => ({
        participantId: row.id,
        countryId: row.countryId,
        historicalCountryId: row.historicalCountryId,
        name: row.historicalCountry?.name ?? row.country?.name ?? '',
        role: row.role,
        participation: row.participation,
        join: columnsToPoint({ era: row.joinEra, year: row.joinYear, month: row.joinMonth, day: row.joinDay }),
        joinReason: row.joinReason,
        withdraw: columnsToPoint({
          era: row.withdrawEra,
          year: row.withdrawYear,
          month: row.withdrawMonth,
          day: row.withdrawDay,
        }),
        withdrawReason: row.withdrawReason,
      })),
      persons: side.persons.map((row) => ({
        personEventId: row.id,
        personId: row.personId,
        name: row.person.name,
        surname: row.person.surname,
        role: row.role,
      })),
      organizations: side.organizations.map((row) => ({
        relationId: row.id,
        organizationId: row.organizationId,
        name: row.organization.name,
        role: row.role,
      })),
    }))
  }

  /** 진영 목록을 요청과 같게 만든다. 배열 순서 = 표시 순서 */
  async sync(actorId: string, eventId: string, inputs: EventSideInput[]): Promise<EventSideView[]> {
    await this.assertOwner(eventId, actorId)
    const names = inputs.map((input) => input.name.trim())
    if (names.some((name) => !name)) throw new BadRequestException('진영 이름이 비어 있습니다')
    if (new Set(names).size !== names.length) {
      throw new BadRequestException('같은 이름의 진영이 두 번 들어 있습니다')
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.eventSide.findMany({ where: { eventId }, select: { id: true } })
      const existingIds = new Set(existing.map((row) => row.id))
      for (const input of inputs) {
        if (input.id && !existingIds.has(input.id)) {
          throw new BadRequestException(`이 사건의 진영이 아닙니다: ${input.id}`)
        }
      }
      const keepIds = new Set(inputs.map((input) => input.id).filter((id): id is string => !!id))
      const removedIds = existing.map((row) => row.id).filter((id) => !keepIds.has(id))
      if (removedIds.length > 0) {
        await removeObservationsForSubjects(tx, ObservationSubjectType.EVENT_SIDE, removedIds)
        await tx.eventSide.deleteMany({ where: { id: { in: removedIds } } })
      }

      /* 상위 진영은 같은 사건 또는 상위 사건의 진영만 — 자기 자신은 안 된다 */
      const parentIds = [
        ...new Set(inputs.map((input) => input.parentSideId).filter((id): id is string => !!id)),
      ]
      if (parentIds.length > 0) {
        const parents = await tx.eventSide.findMany({
          where: { id: { in: parentIds } },
          select: { id: true, eventId: true },
        })
        if (parents.length !== parentIds.length) {
          throw new BadRequestException('상위 진영을 찾을 수 없습니다')
        }
      }

      for (const [index, input] of inputs.entries()) {
        if (input.id && input.parentSideId === input.id) {
          throw new BadRequestException('진영이 자기 자신을 상위로 가질 수 없습니다')
        }
        const data = {
          name: input.name.trim(),
          ...(input.level !== undefined && { level: input.level }),
          ...(input.color !== undefined && { color: input.color }),
          ...(input.description !== undefined && { description: input.description?.trim() || null }),
          ...(input.parentSideId !== undefined && { parentSideId: input.parentSideId }),
          sortOrder: index,
        }
        if (input.id) await tx.eventSide.update({ where: { id: input.id }, data })
        else await tx.eventSide.create({ data: { eventId, ...data } })
      }
    })
    return this.list(eventId)
  }

  private async assertOwner(eventId: string, actorId: string): Promise<void> {
    await assertEventOwnership(this.prisma, eventId, actorId, {
      action: '진영 편집',
      deleted: 'not-found',
    })
  }
}
