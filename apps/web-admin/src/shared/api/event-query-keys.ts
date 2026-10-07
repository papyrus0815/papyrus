/**
 * 사건 react-query 키 — 단일 팩토리.
 *
 * 규칙은 두 개다.
 *  1. **목록류는 전부 `['events', …]` 아래** — 사건 목록·연결 후보·국가별 목록·홈 대시보드·
 *     총개수까지. 사건을 만들거나 고치면 `eventKeys.lists()` 한 번으로 전부 무효화된다.
 *  2. **상세는 `['event-detail', id]`** — 목록 무효화가 열린 상세를 전부 다시 받지 않게 갈라
 *     둔다(상세 mutation은 자기 키에 진행 중 게이트를 건다).
 *
 * 예전엔 `['events-by-country']`·`['events-count']`·`['dashboard-recent-events']`·
 * `['events-for-cabinet-linkage-fallback']`처럼 접두사가 제각각이라 `['events']` 무효화가
 * 닿지 않았고, 새 mutation마다 무효화 목록을 손으로 맞춰야 했다(국가 대시보드 폼은 하나도
 * 안 맞춰 등록 뒤 화면이 안 바뀌었다). 키 문자열을 직접 쓰지 말고 이 팩토리를 거친다.
 *
 * shared 계층에 두는 이유: shared/hooks·widgets·pages·entities 모두가 import할 수 있어야 한다.
 */
export const eventKeys = {
  /** 목록류 전체의 루트 — 무효화는 대개 이것 하나면 된다 */
  lists: () => ['events'] as const,
  /** 헤더 '전체 N건' 권위 총개수 */
  count: () => ['events', 'count'] as const,
  /** 계정별 목록 (useEventsByAccount) */
  byAccount: (accountId: string | null | undefined) =>
    ['events', 'by-account', accountId] as const,
  /** 국가(현대·역사)별 사건 — 국가 대시보드 */
  byCountryAll: () => ['events', 'by-country'] as const,
  byCountry: (countryId: string | null | undefined, variant?: string) =>
    variant
      ? (['events', 'by-country', countryId, variant] as const)
      : (['events', 'by-country', countryId] as const),
  /** 연결 후보 서버 검색 (link-candidates) — 뒤 요소는 검색 조건 */
  linkCandidatesAll: () => ['events', 'link-candidates'] as const,
  linkCandidates: (...conditions: unknown[]) =>
    ['events', 'link-candidates', ...conditions] as const,
  /** 같은 상위를 둔 형제 사건 */
  siblings: (parentEventId: string | null | undefined) =>
    ['events', 'siblings', parentEventId] as const,
  /** 국가의 건국·멸망 사건 */
  statehoodAll: () => ['events', 'statehood'] as const,
  statehood: (filter: { historicalCountryId?: string; countryId?: string }) =>
    ['events', 'statehood', filter] as const,
  /** 홈 대시보드 최근 사건 */
  dashboardRecent: () => ['events', 'dashboard-recent'] as const,
  /** 행정부 연동 그룹 모달의 사건 폴백 목록 */
  cabinetLinkageFallback: () => ['events', 'cabinet-linkage-fallback'] as const,
  /** 삭제한 사건(휴지통) — 목록류라 사건을 지우면 함께 무효화된다 */
  deleted: () => ['events', 'deleted'] as const,
  /** 수장 타임라인 사건 오버레이 후보 */
  headsOfStateOverlay: () => ['events', 'heads-of-state-overlay-list'] as const,

  /** 상세 전체의 루트 — 계층 변경처럼 *다른* 사건의 상세가 바뀔 때 */
  detailAll: () => ['event-detail'] as const,
  /** 단일 사건 상세 */
  detail: (eventId: string) => ['event-detail', eventId] as const,
  /** 사건 단위 측정값(사건 + 참여국 줄 + 진영) */
  observations: (eventId: string) => ['event-detail', eventId, 'observations'] as const,
}
