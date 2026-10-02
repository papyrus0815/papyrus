import { Injectable } from '@nestjs/common'
import { CombatType, ConflictType, PrismaClient } from '@prisma/client'

import type { MilitaryDetailsDto, MilitaryEventDto } from '../presentation/dto/military-event.dto.js'

/**
 * 군사 정보 — **작전 정보(MilitaryDetailsNorm)만** 다룬다.
 *
 * 진영·참전국·사상자는 여기서 빠졌다(docs/event-detail-data-foundation.md D1·D3).
 * 예전 saveMilitaryData는 진영·참전국·관계·사상자·작전 정보를 **전부 지우고 다시 만들었다**.
 * 진영 이름 하나만 고쳐도 진영 id가 새로 발급돼, 진영에 붙은 측정값이 저장할 때마다 고아가 됐다.
 * - 진영 → EventSideService (자연키 = id, 머지)
 * - 소속 → 참여국 줄의 sideId (EventCountryParticipantService)
 * - 병력·사상자 → Observation (EvidenceModule)
 */
@Injectable()
export class MilitaryEventService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 작전 정보 저장 — upsert. `militaryDetails === null`이면 삭제, 생략이면 손대지 않는다.
   * 전투 유형은 집합이라 차이만 반영한다.
   */
  async saveMilitaryData(eventId: string, data: MilitaryEventDto): Promise<void> {
    const details = data.militaryDetails
    if (details === undefined) return
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.militaryDetailsNorm.findUnique({
        where: { eventId },
        select: { id: true, combatTypes: { select: { id: true, combatType: true } } },
      })
      if (details === null) {
        if (existing) {
          await tx.militaryDetailsCombatType.deleteMany({ where: { militaryDetailsId: existing.id } })
          await tx.militaryDetailsNorm.delete({ where: { id: existing.id } })
        }
        return
      }
      const fields = toDetailsFields(details)
      const detailsId = existing
        ? (await tx.militaryDetailsNorm.update({ where: { id: existing.id }, data: fields, select: { id: true } })).id
        : (await tx.militaryDetailsNorm.create({ data: { eventId, ...fields }, select: { id: true } })).id

      if (details.combatTypes === undefined) return
      const desired = new Set(details.combatTypes as unknown as CombatType[])
      const current = existing?.combatTypes ?? []
      const removed = current.filter((row) => !desired.has(row.combatType)).map((row) => row.id)
      if (removed.length > 0) await tx.militaryDetailsCombatType.deleteMany({ where: { id: { in: removed } } })
      const have = new Set(current.map((row) => row.combatType))
      for (const combatType of desired) {
        if (!have.has(combatType)) {
          await tx.militaryDetailsCombatType.create({ data: { militaryDetailsId: detailsId, combatType } })
        }
      }
    })
  }

  /** 작전 정보 조회 — 없으면 null */
  async getMilitaryData(eventId: string): Promise<MilitaryEventDto | null> {
    const details = await this.prisma.militaryDetailsNorm.findUnique({
      where: { eventId },
      include: { combatTypes: true },
    })
    if (!details) return null
    return {
      militaryDetails: {
        conflictType: (details.conflictType ?? undefined) as MilitaryDetailsDto['conflictType'],
        combatTypes: details.combatTypes.map(
          (row) => row.combatType as unknown as NonNullable<MilitaryDetailsDto['combatTypes']>[number],
        ),
        objective: details.objective ?? undefined,
        tactics: details.tactics ?? undefined,
        strategy: details.strategy ?? undefined,
        outcome: details.outcome ?? undefined,
        territoryChanges: details.territoryChanges ?? undefined,
        treaty: details.treaty ?? undefined,
        strategicImpact: details.strategicImpact ?? undefined,
      },
    }
  }
}

/** 생략 필드는 손대지 않는다(3상) — 빈 문자열은 비움 */
function toDetailsFields(dto: MilitaryDetailsDto) {
  const text = (value: string | undefined) =>
    value === undefined ? undefined : value.trim() ? value.trim() : null
  return {
    ...(dto.conflictType !== undefined && { conflictType: dto.conflictType as unknown as ConflictType }),
    objective: text(dto.objective),
    tactics: text(dto.tactics),
    strategy: text(dto.strategy),
    outcome: text(dto.outcome),
    territoryChanges: text(dto.territoryChanges),
    treaty: text(dto.treaty),
    strategicImpact: text(dto.strategicImpact),
  }
}
