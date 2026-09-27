import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

import type {
  CreateEventRelationDto,
  EventRelationDirection,
  EventRelationItemDto,
  EventRelationTypeValue,
  UpdateEventRelationDto,
} from '../presentation/dto/event-relation.dto'

/**
 * 관련 사건(EventRelation) — 상위/하위(계보 소속)로는 표현할 수 없는 '별개 사건끼리의 연결'.
 * 예: '아바르 칸국 건국' —계기가 됨→ '롬바르드 왕국 건국'.
 *
 * ## 불변식(이 서비스가 강제)
 * - 한 쌍(두 사건)에 한 행 — 방향과 무관하게. (DB 유니크는 (eventId, relatedEventId) 한 방향뿐이라
 *   역방향 중복은 여기서 막는다.)
 * - 자기 자신과의 연결 금지.
 * - 두 사건 모두 요청자 소유(사건 연결 공통 규약 '본인이 등록한 사건만 연결').
 * - 소프트삭제된 사건에는 새로 잇지 않는다. 이미 있는 행은 남기고 응답에서 거른다
 *   (복구하면 그대로 돌아온다 — 이벤트 도메인 조인테이블 관례).
 *
 * ## 방향
 * 저장 행은 eventId → relatedEventId로 읽는다. API는 '지금 보는 사건' 기준 direction
 * (outgoing = 이 사건이 출발점)으로 주고받는다. 무방향 유형(CONCURRENT·RELATED)도 저장은
 * 한쪽을 출발점으로 두지만 화면은 방향 없이 그린다.
 */
@Injectable()
export class EventRelationService {
  constructor(private readonly prisma: PrismaClient) {}

  /** 요청자 소유 사건인지 확인 — 쓰기면 소프트삭제도 막는다 */
  private async assertOwnedEvent(eventId: string, userId: string, forWrite: boolean) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true, deletedAt: true },
    })
    if (!event) throw new NotFoundException('사건을 찾을 수 없습니다.')
    if (event.createdById !== userId) {
      throw new ForbiddenException(
        forWrite ? '본인이 등록한 사건만 수정할 수 있습니다.' : '본인이 등록한 사건만 조회할 수 있습니다.',
      )
    }
    if (forWrite && event.deletedAt) {
      throw new ConflictException('삭제된 사건은 수정할 수 없습니다 — 복구 후 다시 시도하세요.')
    }
  }

  /** 이 사건에 걸린 관계 행을 찾고, 그 행에서 지금 사건의 방향을 돌려준다 */
  private async findRelationFor(eventId: string, relationId: string) {
    const row = await this.prisma.eventRelation.findUnique({ where: { id: relationId } })
    if (!row || (row.eventId !== eventId && row.relatedEventId !== eventId)) {
      throw new NotFoundException('관계를 찾을 수 없습니다.')
    }
    const direction: EventRelationDirection = row.eventId === eventId ? 'outgoing' : 'incoming'
    return { row, direction }
  }

  private normalizeDescription(value: string | null | undefined) {
    if (value === undefined) return undefined
    const trimmed = value?.trim() ?? ''
    return trimmed ? trimmed : null
  }

  async list(eventId: string, userId: string): Promise<EventRelationItemDto[]> {
    await this.assertOwnedEvent(eventId, userId, false)

    const counterpartSelect = {
      id: true,
      title: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      startDate: true,
      startDatePrecision: true,
      deletedAt: true,
      category: { select: { name: true } },
    } as const

    const rows = await this.prisma.eventRelation.findMany({
      where: { OR: [{ eventId }, { relatedEventId: eventId }] },
      include: {
        event: { select: counterpartSelect },
        relatedEvent: { select: counterpartSelect },
      },
      orderBy: { createdAt: 'asc' },
    })

    return rows.flatMap((row) => {
      const direction: EventRelationDirection = row.eventId === eventId ? 'outgoing' : 'incoming'
      const other = direction === 'outgoing' ? row.relatedEvent : row.event
      // 상대가 소프트삭제면 숨긴다(행은 남겨 복구 시 되살아나게)
      if (other.deletedAt) return []
      return [
        {
          id: row.id,
          relationType: row.relationType as EventRelationTypeValue,
          direction,
          description: row.relationDescription ?? null,
          event: {
            id: other.id,
            title: other.title,
            startEra: (other.startEra as 'BC' | 'AD' | null) ?? null,
            startYear: other.startYear ?? null,
            startMonth: other.startMonth ?? null,
            startDay: other.startDay ?? null,
            startDate: other.startDate ? other.startDate.toISOString() : null,
            startDatePrecision: other.startDatePrecision ?? null,
            categoryName: other.category?.name ?? null,
          },
          createdAt: row.createdAt.toISOString(),
        },
      ]
    })
  }

  async create(
    eventId: string,
    userId: string,
    dto: CreateEventRelationDto,
  ): Promise<EventRelationItemDto> {
    await this.assertOwnedEvent(eventId, userId, true)
    const otherId = dto.relatedEventId
    if (otherId === eventId) {
      throw new BadRequestException('자기 자신과는 연결할 수 없습니다.')
    }
    const other = await this.prisma.event.findUnique({
      where: { id: otherId },
      select: { createdById: true, deletedAt: true },
    })
    if (!other || other.deletedAt) {
      throw new NotFoundException('연결하려는 사건을 찾을 수 없습니다.')
    }
    if (other.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 사건만 연결할 수 있습니다.')
    }

    const existing = await this.prisma.eventRelation.findFirst({
      where: {
        OR: [
          { eventId, relatedEventId: otherId },
          { eventId: otherId, relatedEventId: eventId },
        ],
      },
      select: { id: true },
    })
    if (existing) {
      throw new ConflictException('이미 연결된 사건입니다 — 기존 관계를 수정하세요.')
    }

    const incoming = dto.direction === 'incoming'
    const created = await this.prisma.eventRelation.create({
      data: {
        eventId: incoming ? otherId : eventId,
        relatedEventId: incoming ? eventId : otherId,
        relationType: dto.relationType,
        relationDescription: this.normalizeDescription(dto.description) ?? null,
      },
      select: { id: true },
    })
    return this.getItem(eventId, created.id, userId)
  }

  async update(
    eventId: string,
    relationId: string,
    userId: string,
    dto: UpdateEventRelationDto,
  ): Promise<EventRelationItemDto> {
    await this.assertOwnedEvent(eventId, userId, true)
    const { row, direction } = await this.findRelationFor(eventId, relationId)

    // 방향 뒤집기 = 저장 행의 양 끝 교환. 유니크 (eventId, relatedEventId)는 역방향 행이
    // 없음이 불변식으로 보장되므로 충돌하지 않는다.
    const flip = dto.direction !== undefined && dto.direction !== direction
    const description = this.normalizeDescription(dto.description)

    await this.prisma.eventRelation.update({
      where: { id: row.id },
      data: {
        ...(dto.relationType !== undefined ? { relationType: dto.relationType } : {}),
        ...(description !== undefined ? { relationDescription: description } : {}),
        ...(flip ? { eventId: row.relatedEventId, relatedEventId: row.eventId } : {}),
      },
    })
    return this.getItem(eventId, row.id, userId)
  }

  async remove(eventId: string, relationId: string, userId: string): Promise<void> {
    // 해제는 정리라 소프트삭제 사건에서도 허용(cabinets 해제와 같은 규약)
    await this.assertOwnedEvent(eventId, userId, false)
    const { row } = await this.findRelationFor(eventId, relationId)
    await this.prisma.eventRelation.delete({ where: { id: row.id } })
  }

  private async getItem(eventId: string, relationId: string, userId: string) {
    const items = await this.list(eventId, userId)
    const item = items.find((candidate) => candidate.id === relationId)
    if (!item) throw new NotFoundException('관계를 찾을 수 없습니다.')
    return item
  }
}
