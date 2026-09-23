import { BadRequestException, Injectable } from '@nestjs/common'
import { EventCountryRole, Prisma, PrismaClient } from '@prisma/client'

/**
 * 사건 참여국 — **쓰기 단일 통로**.
 *
 * 개념: 한 행 = "이 사건에서 이 나라가 맡은 배역". 국가(현대|역사) + 역할 + 역할 서술 +
 * 비고 + 표시 순서. 예전에 따로 놀던 세 개념
 *   - `relatedCountryIds` (id 배열)
 *   - `primaryCountryId` (별표 = 주도국)
 *   - `EventCountryRelation.role` (시드만 쓰던 10종 enum)
 * 은 여기서 하나로 접혔다. **주도국은 role=INITIATOR일 뿐이다.**
 *
 * ## 왜 delete-and-recreate가 아닌가
 * 예전 저장은 `deleteMany` → `create` 전량 재생성이었고, 재생성 시 role을
 * `primary 일치 ? INITIATOR : PARTICIPANT`로만 찍었다. 그 결과 사건 상세에서 관련국을
 * **하나만 추가해도** 그 사건의 역할 10종과 roleDescription이 통째로 날아갔다
 * (실측: 270 사건 중 66건이 큐레이션된 역할·서술을 갖고 있었다). 그래서 이 서비스는
 * 자연키 머지만 한다 — 살아남은 행은 UPDATE조차 하지 않으므로 무손실이다.
 *
 * ## 3상 규약 (레포 공통)
 * - 필드 `undefined` → 그 값은 **건드리지 않는다** (기존 값 유지)
 * - 필드 `null`      → 비운다
 * - 값               → 설정
 *
 * 배열 자체가 `undefined`면 참여국 테이블에 아예 손대지 않는다. `[]`는 전부 제거다.
 */
@Injectable()
export class EventCountryParticipantService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 참여국 목록 동기화. 배열 순서가 곧 표시 순서(sortOrder)다.
   *
   * @param tx    호출자의 트랜잭션 클라이언트. 사건 본문 저장과 같은 트랜잭션에 묶어
   *              부분 실패로 참여국이 반쯤 지워진 상태를 남기지 않는다.
   */
  async sync(
    tx: Prisma.TransactionClient,
    eventId: string,
    participants: EventCountryParticipantInput[],
  ): Promise<void> {
    const desired = participants.map((participant, index) =>
      normalizeParticipant(participant, index),
    )
    assertNoDuplicateParty(desired)

    const existing = await tx.eventCountryRelation.findMany({
      where: { eventId },
      select: {
        id: true,
        countryId: true,
        historicalCountryId: true,
        role: true,
        roleDescription: true,
        note: true,
        sortOrder: true,
      },
    })
    const existingByKey = new Map(existing.map((row) => [partyKeyOf(row), row]))
    const desiredKeys = new Set(desired.map((participant) => participant.key))

    /** 요청에서 빠진 행 = 제거 */
    const removedIds = existing
      .filter((row) => !desiredKeys.has(partyKeyOf(row)))
      .map((row) => row.id)
    if (removedIds.length > 0) {
      await tx.eventCountryRelation.deleteMany({ where: { id: { in: removedIds } } })
    }

    for (const participant of desired) {
      const current = existingByKey.get(participant.key)

      if (!current) {
        await tx.eventCountryRelation.create({
          data: {
            eventId,
            countryId: participant.countryId,
            historicalCountryId: participant.historicalCountryId,
            // 새 행인데 역할이 지정되지 않았다면 가장 약한 해석인 '참여국'으로 둔다.
            role: participant.role ?? EventCountryRole.PARTICIPANT,
            roleDescription: participant.roleDescription ?? null,
            note: participant.note ?? null,
            sortOrder: participant.sortOrder,
          },
        })
        continue
      }

      /**
       * 살아남은 행 — 실제로 달라지는 값만 UPDATE한다. 3상 규약상 `undefined`인 필드는
       * 후보에서 빠지므로, id만 보내는 호출(예: 국가 칩 추가)은 역할·서술을 보존한다.
       */
      const patch: Prisma.EventCountryRelationUpdateInput = {}
      if (participant.role !== undefined && participant.role !== current.role) {
        patch.role = participant.role
      }
      if (
        participant.roleDescription !== undefined &&
        participant.roleDescription !== current.roleDescription
      ) {
        patch.roleDescription = participant.roleDescription
      }
      if (participant.note !== undefined && participant.note !== current.note) {
        patch.note = participant.note
      }
      if (participant.sortOrder !== current.sortOrder) {
        patch.sortOrder = participant.sortOrder
      }
      if (Object.keys(patch).length > 0) {
        await tx.eventCountryRelation.update({ where: { id: current.id }, data: patch })
      }
    }
  }

  /**
   * 사건 생성 직후용 — 기존 행이 없음이 보장되므로 한 번의 createMany로 끝낸다.
   */
  async createAll(
    tx: Prisma.TransactionClient,
    eventId: string,
    participants: EventCountryParticipantInput[],
  ): Promise<void> {
    const desired = participants.map((participant, index) =>
      normalizeParticipant(participant, index),
    )
    assertNoDuplicateParty(desired)
    if (desired.length === 0) return

    await tx.eventCountryRelation.createMany({
      data: desired.map((participant) => ({
        eventId,
        countryId: participant.countryId,
        historicalCountryId: participant.historicalCountryId,
        role: participant.role ?? EventCountryRole.PARTICIPANT,
        roleDescription: participant.roleDescription ?? null,
        note: participant.note ?? null,
        sortOrder: participant.sortOrder,
      })),
    })
  }
}

/** 참여국 입력 — 3상 규약이 적용되는 canonical 입력 형태 */
export interface EventCountryParticipantInput {
  /** 현대 국가 id. historicalCountryId와 **동시 지정 불가** */
  countryId?: string | null
  /** 역사적 국가 id */
  historicalCountryId?: string | null
  role?: EventCountryRole
  roleDescription?: string | null
  note?: string | null
}

interface NormalizedParticipant {
  key: string
  countryId: string | null
  historicalCountryId: string | null
  role?: EventCountryRole
  roleDescription?: string | null
  note?: string | null
  sortOrder: number
}

/**
 * 자연키 — `m:<uuid>` | `h:<uuid>`.
 *
 * 이 키를 DB 컬럼으로 승격해 `@@unique`를 거는 안은 기각했다. 시드 46개 파일이
 * `prisma.eventCountryRelation.create`를 직접 호출하므로 NOT NULL 컬럼이 늘면 전부
 * 깨진다. 한편 `@@unique([eventId, countryId, historicalCountryId])`는 MySQL이 NULL을
 * 서로 다른 값으로 보기 때문에 **아무것도 막지 못한다**(두 FK 중 하나는 항상 NULL).
 * 그래서 중복 방지는 이 서비스가 진다.
 */
function partyKeyOf(row: {
  countryId: string | null
  historicalCountryId: string | null
}): string {
  return row.countryId ? `m:${row.countryId}` : `h:${row.historicalCountryId}`
}

function normalizeParticipant(
  participant: EventCountryParticipantInput,
  index: number,
): NormalizedParticipant {
  const countryId = emptyToNull(participant.countryId)
  const historicalCountryId = emptyToNull(participant.historicalCountryId)

  if (countryId && historicalCountryId) {
    throw new BadRequestException(
      '참여국 한 줄에 현대 국가와 역사적 국가를 동시에 지정할 수 없습니다. 두 줄로 나누세요.',
    )
  }
  if (!countryId && !historicalCountryId) {
    throw new BadRequestException(
      '참여국에는 현대 국가 또는 역사적 국가 중 하나가 반드시 필요합니다.',
    )
  }

  return {
    key: countryId ? `m:${countryId}` : `h:${historicalCountryId}`,
    countryId,
    historicalCountryId,
    role: participant.role,
    roleDescription: trimToNull(participant.roleDescription),
    note: trimToNull(participant.note),
    sortOrder: index,
  }
}

function assertNoDuplicateParty(participants: NormalizedParticipant[]): void {
  const seen = new Set<string>()
  for (const participant of participants) {
    if (seen.has(participant.key)) {
      throw new BadRequestException(
        '같은 국가가 참여국 목록에 두 번 들어 있습니다. 한 국가는 한 줄이어야 합니다.',
      )
    }
    seen.add(participant.key)
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** 3상 보존 — undefined는 undefined 그대로 넘겨 '건드리지 않음'을 유지한다. */
function trimToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
