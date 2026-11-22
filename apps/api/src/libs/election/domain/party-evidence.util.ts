/**
 * 정당 근거 — 인용 대상(정당 본체 + 곁가지 9종)과 지울 때의 정리(B5, docs/political-party-model-review.md §4.9·4.11).
 *
 * 인용·측정값은 다형이라 DB FK가 없다(근거 도메인 원칙). 그래서 정당 쪽 기록을 지우는 모든 길이
 * 같은 트랜잭션 안에서 여기를 불러 그 기록의 인용을 함께 지운다. 출처(Source)는 공유 자원이라 남긴다.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CitationTargetType, ObservationSubjectType, type Prisma, type PrismaClient } from '@prisma/client'

import { removeObservationsForSubjects } from '../../evidence/application/observation-cleanup'

type Db = PrismaClient | Prisma.TransactionClient

/** 정당에 딸린 인용 대상 — 본체 + 곁가지 */
export const PARTY_CITATION_TARGETS = [
  CitationTargetType.POLITICAL_PARTY,
  CitationTargetType.PARTY_ALIAS,
  CitationTargetType.PARTY_LEGAL_STATUS,
  CitationTargetType.PARTY_IDEOLOGY,
  CitationTargetType.PARTY_POSITION_PERIOD,
  CitationTargetType.PARTY_ORGANIZATION,
  CitationTargetType.PARTY_MEMBERSHIP,
  CitationTargetType.PARTY_SYMBOL,
  CitationTargetType.PARTY_EXPRESSION,
  CitationTargetType.PARTY_HEADQUARTERS,
] as const

export type PartyCitationTarget = (typeof PARTY_CITATION_TARGETS)[number]

export function isPartyCitationTarget(value: string): value is PartyCitationTarget {
  return (PARTY_CITATION_TARGETS as readonly string[]).includes(value)
}

/** 곁가지 표별 '이 정당의 행 id들' */
async function idsOf(db: Db, targetType: PartyCitationTarget, partyId: string): Promise<string[]> {
  const where = { partyId }
  const select = { id: true } as const
  switch (targetType) {
    case CitationTargetType.POLITICAL_PARTY:
      return [partyId]
    case CitationTargetType.PARTY_ALIAS:
      return (await db.politicalPartyAlias.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_LEGAL_STATUS:
      return (await db.politicalPartyLegalStatus.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_IDEOLOGY:
      return (await db.politicalPartyIdeology.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_POSITION_PERIOD:
      return (await db.politicalPartyPositionPeriod.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_ORGANIZATION:
      return (await db.politicalPartyOrganization.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_MEMBERSHIP:
      return (await db.politicalPartyMembership.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_SYMBOL:
      return (await db.politicalPartySymbol.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_EXPRESSION:
      return (await db.politicalPartyExpression.findMany({ where, select })).map((row) => row.id)
    case CitationTargetType.PARTY_HEADQUARTERS:
      return (await db.politicalPartyHeadquarters.findMany({ where, select })).map((row) => row.id)
  }
}

/** 정당의 모든 인용 대상 — targetType별 id */
export async function partyCitationTargetIds(db: Db, partyId: string): Promise<Map<PartyCitationTarget, string[]>> {
  const map = new Map<PartyCitationTarget, string[]>()
  for (const targetType of PARTY_CITATION_TARGETS) {
    map.set(targetType, await idsOf(db, targetType, partyId))
  }
  return map
}

/** 이 대상이 이 정당의 것인가 — 아니면 400/404 */
export async function assertPartyCitationTarget(
  db: Db,
  partyId: string,
  targetType: string,
  targetId: string,
): Promise<PartyCitationTarget> {
  if (!isPartyCitationTarget(targetType)) {
    throw new BadRequestException(`정당 인용 대상이 아닙니다: ${targetType}`)
  }
  const ids = await idsOf(db, targetType, partyId)
  if (!ids.includes(targetId)) throw new NotFoundException('이 정당의 기록이 아닙니다.')
  return targetType
}

/** 곁가지 행을 지울 때 — 그 행의 인용도 */
export async function removePartyCitations(
  tx: Prisma.TransactionClient,
  targetType: PartyCitationTarget,
  targetIds: string[],
): Promise<void> {
  if (targetIds.length === 0) return
  await tx.citation.deleteMany({ where: { targetType, targetId: { in: targetIds } } })
}

/** 정당을 지울 때 — 곁가지 전부의 인용과 정당의 측정값(+그 인용). 곁가지 행 자체는 FK CASCADE */
export async function removePartyEvidence(tx: Prisma.TransactionClient, partyId: string): Promise<void> {
  const targets = await partyCitationTargetIds(tx, partyId)
  for (const [targetType, ids] of targets) await removePartyCitations(tx, targetType, ids)
  await removeObservationsForSubjects(tx, ObservationSubjectType.POLITICAL_PARTY, [partyId])
}
