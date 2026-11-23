/**
 * 정당 사이 관계(B6, docs/political-party-model-review.md §4.6) — 방향 규약.
 *
 * - 대칭 종류(자매 정당·공동 교섭단체)는 방향이 없다 → (작은 id → 큰 id)로 정규화해 한 쌍에 한 행.
 * - 비대칭 종류(위성·계파)는 from이 '딸린 쪽' — "from은 to의 위성/계파". 반대 방향 같은 종류는 모순이라 막는다.
 * - 계보(전신·후신·합당·분당)는 여기 아님 — PoliticalPartyTransition.
 */
import { PoliticalPartyLinkKind } from '@prisma/client'

export const SYMMETRIC_LINK_KINDS = new Set<PoliticalPartyLinkKind>([
  PoliticalPartyLinkKind.SISTER_PARTY,
  PoliticalPartyLinkKind.PARLIAMENTARY_UNION,
  PoliticalPartyLinkKind.OTHER,
])

export const LINK_KIND_VALUES = new Set<string>(Object.values(PoliticalPartyLinkKind))

/**
 * 이 정당에서 본 관계 → 저장 방향.
 * role 'subordinate' = 이 정당이 딸린 쪽(from), 'superior' = 상대가 딸린 쪽.
 */
export function orientLink(
  kind: PoliticalPartyLinkKind,
  partyId: string,
  otherPartyId: string,
  role: 'subordinate' | 'superior',
): { fromPartyId: string; toPartyId: string } {
  if (SYMMETRIC_LINK_KINDS.has(kind)) {
    return partyId < otherPartyId
      ? { fromPartyId: partyId, toPartyId: otherPartyId }
      : { fromPartyId: otherPartyId, toPartyId: partyId }
  }
  return role === 'subordinate'
    ? { fromPartyId: partyId, toPartyId: otherPartyId }
    : { fromPartyId: otherPartyId, toPartyId: partyId }
}

/** 저장된 관계를 한 정당 입장에서 — 상대와 이 정당의 자리 */
export function linkPerspective(
  row: { fromPartyId: string; toPartyId: string; kind: PoliticalPartyLinkKind },
  partyId: string,
): { otherPartyId: string; role: 'subordinate' | 'superior' | 'peer' } {
  const otherPartyId = row.fromPartyId === partyId ? row.toPartyId : row.fromPartyId
  if (SYMMETRIC_LINK_KINDS.has(row.kind)) return { otherPartyId, role: 'peer' }
  return { otherPartyId, role: row.fromPartyId === partyId ? 'subordinate' : 'superior' }
}
