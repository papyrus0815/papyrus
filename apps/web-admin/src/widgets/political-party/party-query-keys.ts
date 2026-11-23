/**
 * 정당 상세 곁가지 조회 키 — 한 곳에서.
 *
 * 섹션(이름·이념·조직…)과 인포박스가 같은 키로 같은 캐시를 읽는다. 섹션에서 고치면 인포박스도 같이 바뀐다.
 */
export const partyKeys = {
  detail: (partyId: string) => ['political-parties', 'detail', partyId] as const,
  aliases: (partyId: string) => ['political-parties', partyId, 'aliases'] as const,
  legalStatuses: (partyId: string) => ['political-parties', partyId, 'legal-statuses'] as const,
  ideologies: (partyId: string) => ['political-parties', partyId, 'ideologies'] as const,
  positionPeriods: (partyId: string) => ['political-parties', partyId, 'position-periods'] as const,
  organizations: (partyId: string) => ['political-parties', partyId, 'organizations'] as const,
  memberships: (partyId: string) => ['political-parties', partyId, 'memberships'] as const,
  symbols: (partyId: string) => ['political-parties', partyId, 'symbols'] as const,
  expressions: (partyId: string) => ['political-parties', partyId, 'expressions'] as const,
  headquarters: (partyId: string) => ['political-parties', partyId, 'headquarters'] as const,
  links: (partyId: string) => ['political-parties', partyId, 'links'] as const,
  citations: (partyId: string) => ['political-parties', partyId, 'citations'] as const,
  lineage: (partyId: string) => ['political-party-lineage', partyId] as const,
  observations: (partyId: string) => ['observations', 'POLITICAL_PARTY', partyId] as const,
}
