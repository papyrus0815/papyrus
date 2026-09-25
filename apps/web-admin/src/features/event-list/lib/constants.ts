/**
 * 이벤트 목록 관련 상수
 * FSD: features/event-list/lib
 */

/**
 * 정렬 옵션
 */
export const SORT_OPTIONS = {
  RECENT: 'recent',
  DURATION: 'duration',
  /**
   * 등록순 — `createdAt` 내림차순.
   *
   * 'recent'는 이름과 달리 **startDate**(사건이 일어난 시점) 기준이라 방금 입력한 사건이
   * 목록 어디에 떨어질지 알 수 없다. 20건을 연달아 입력한 뒤 그것만 모아 보려면 등록 시각
   * 축이 필요한데 목록 뷰에는 그 축이 없었다(검토 CR-4).
   * 응답 DTO가 createdAt을 이미 싣고 있어 클라이언트 정렬로 충분하다.
   */
  CREATED: 'created',
  /**
   * 하위 많은 순 — 서브트리 자손 수 내림차순(`getEventDescendantCount`).
   *
   * 생존 루트 167건 중 147건(88%)이 자식 0인 단독 사건이라, 시간축 정렬만 있으면
   * '1차세계대전' 같은 앵커가 단발 사건들 사이에 그대로 파묻힌다. 모드(앵커만 칩)에
   * 들어가지 않고도 앵커가 스스로 떠오르게 하는 **수동적 발견성** 축이다
   * (docs/event-root-designation-review.md 근인 1).
   */
  DESCENDANTS: 'descendants',
} as const

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS]

/*
 * (제거) 뷰 모드 — `VIEW_MODES`·`ViewMode`.
 *
 * 한때 사건 카탈로그에는 뷰가 일곱 개 있었다(타임라인·목록·지도·격자·통계·트리·갤러리,
 * 나중에 '시대'까지 여덟). 타임라인이 목록에 흡수된 뒤로도 나머지 여섯이 남아 있었지만,
 * 전부 **같은 사건 집합을 다르게 칠한 변주**였고 목록만이 검색·정렬·필터·상세·계층을
 * 모두 지원하는 정본이었다. 뷰 전환 세그먼트·`?view=` 축·디바이스별 기본값 추론·
 * lazy 슬롯 스위치가 그 여섯을 살려 두기 위한 배선이었다.
 *
 * 2026-09-24 사용자 결정으로 목록 하나만 남기고 전부 제거했다. 뷰를 다시 늘리려면
 * 이 상수를 되살리는 것이 아니라, 새 지면을 별도 라우트로 두는 쪽을 먼저 검토할 것 —
 * 여덟 개가 한 지면에 겹쳐 있던 시절의 근인이 '축 하나에 지면 여덟'이었다.
 */

/**
 * 요약 뷰 모드
 */
export const SUMMARY_VIEW_MODES = {
  TREE: 'tree',
} as const

export type SummaryViewMode =
  (typeof SUMMARY_VIEW_MODES)[keyof typeof SUMMARY_VIEW_MODES]

/*
 * (제거) 타임라인 뷰 전용 URL 축 — 레인(`lane`, v4에서 폐지)에 이어 시간 창(`tlw`)과
 * 카테고리 숨김(`hide`)도 사라졌다. 타임라인 뷰 자체가 목록에 흡수됐기 때문이다.
 * 셋 다 use-catalog-url-sync가 첫 write에서 구 URL에서 걷어낸다.
 * docs/event-timeline-merged-into-list.md 참고.
 */

/**
 * 특수 필터 값
 */
export const FILTER_ALL = 'all' as const

/**
 * 전역 표시 직책 ID (교황 등 — 모든 국가 화면에서 표시되며 토글로 켜고 끌 수 있음)
 */
export const GLOBAL_POSITION_DEFINITION_IDS = ['gov-pos-pope'] as const
