import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ObservationSubjectType } from '@prisma/client'
import { PrismaService } from '../../../../prisma/prisma.service'

/**
 * 측정값 대상(다형)의 존재·쓰기 권한 판정 — **한 곳에서만** 한다.
 *
 * 대상 테이블에 FK가 없으므로(Comment와 같은 다형 패턴) 존재 확인을 DB가 해 주지 않는다.
 * 그래서 쓰기 통로는 반드시 이 판정을 거친다. 소유 규약은 각 도메인의 기존 규약을 그대로 따른다.
 *
 * | 대상 | 소유자 | 근거 |
 * |---|---|---|
 * | 사건 · 참여국 줄 · 진영 | `event.createdById` | event.service의 수정·연결 가드 |
 * | 현대·역사 국가 · 인물 | `accountId` 일치 | country.repository `where: { id, accountId }` |
 * | 조직 | (소유 개념 없음) | organization 도메인에 계정 필드 없음 |
 */
@Injectable()
export class SubjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** 대상이 존재하는가 — 없으면 404. 읽기 경로용 */
  async assertExists(subjectType: ObservationSubjectType, subjectId: string): Promise<void> {
    await this.resolveOwner(subjectType, subjectId)
  }

  /** 대상에 쓸 수 있는가 — 없으면 404, 남의 것이면 403 */
  async assertWritable(
    subjectType: ObservationSubjectType,
    subjectId: string,
    actorId: string,
  ): Promise<void> {
    const owner = await this.resolveOwner(subjectType, subjectId)
    if (owner.kind === 'unowned') return
    if (owner.ownerId !== actorId) {
      throw new ForbiddenException('본인이 등록한 대상에만 측정값을 기록할 수 있습니다')
    }
  }

  /** 사건 하위 대상(참여국 줄·진영)이 속한 사건 id — 사건 단위 조회에 쓴다 */
  async eventIdOf(subjectType: ObservationSubjectType, subjectId: string): Promise<string | null> {
    switch (subjectType) {
      case ObservationSubjectType.EVENT:
        return subjectId
      case ObservationSubjectType.EVENT_PARTICIPANT: {
        const row = await this.prisma.eventCountryRelation.findUnique({
          where: { id: subjectId },
          select: { eventId: true },
        })
        return row?.eventId ?? null
      }
      case ObservationSubjectType.EVENT_SIDE: {
        const row = await this.prisma.belligerentSide.findUnique({
          where: { id: subjectId },
          select: { eventId: true },
        })
        return row?.eventId ?? null
      }
      default:
        return null
    }
  }

  private async resolveOwner(
    subjectType: ObservationSubjectType,
    subjectId: string,
  ): Promise<{ kind: 'owned'; ownerId: string | null } | { kind: 'unowned' }> {
    const notFound = () =>
      new NotFoundException(`측정값 대상(${subjectType})을 찾을 수 없습니다: ${subjectId}`)

    switch (subjectType) {
      case ObservationSubjectType.EVENT:
        return this.eventOwner(subjectId, notFound)
      case ObservationSubjectType.EVENT_PARTICIPANT:
      case ObservationSubjectType.EVENT_SIDE: {
        const eventId = await this.eventIdOf(subjectType, subjectId)
        if (!eventId) throw notFound()
        return this.eventOwner(eventId, notFound)
      }
      case ObservationSubjectType.COUNTRY: {
        const row = await this.prisma.country.findUnique({
          where: { id: subjectId },
          select: { accountId: true },
        })
        if (!row) throw notFound()
        return { kind: 'owned', ownerId: row.accountId }
      }
      case ObservationSubjectType.HISTORICAL_COUNTRY: {
        const row = await this.prisma.historicalCountry.findUnique({
          where: { id: subjectId },
          select: { accountId: true },
        })
        if (!row) throw notFound()
        return { kind: 'owned', ownerId: row.accountId }
      }
      case ObservationSubjectType.PERSON: {
        const row = await this.prisma.person.findUnique({
          where: { id: subjectId },
          select: { accountId: true },
        })
        if (!row) throw notFound()
        return { kind: 'owned', ownerId: row.accountId }
      }
      case ObservationSubjectType.ORGANIZATION: {
        const row = await this.prisma.organization.findUnique({
          where: { id: subjectId },
          select: { id: true },
        })
        if (!row) throw notFound()
        return { kind: 'unowned' }
      }
    }
  }

  private async eventOwner(
    eventId: string,
    notFound: () => NotFoundException,
  ): Promise<{ kind: 'owned'; ownerId: string | null }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true, deletedAt: true },
    })
    if (!event || event.deletedAt) throw notFound()
    return { kind: 'owned', ownerId: event.createdById }
  }
}
