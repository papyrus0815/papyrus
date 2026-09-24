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

/**
 * 뷰 모드 — 사건의 다양한 차원을 각자의 1차 표현으로.
 *  - TIMELINE  : 시간×카테고리 가로 막대 (동시대성·기간·밀도)
 *  - LIST      : 행 기반 컴팩트 리스트 (검색·정렬·관리)
 *  - MAP       : 지도 위 마커 (공간 차원)
 *  - GRID      : 연대(decade) 카드 격자 (거시 탐색 진입점)
 *  - DASHBOARD : 분포 차트·통계 (인사이트·데이터 품질)
 *  - TREE      : root + hierarchy 1차 표현 (위계 구조)
 *  - GALLERY   : heroImage 기반 카드 (비주얼 발견)
 */
export const VIEW_MODES = {
  /**
   * 유일한 기본 뷰. 예전에는 `TIMELINE`(연속 가로 시간축)이 함께 있었지만, 둘 다
   * '시간순으로 묶인 행 목록'이라 사실상 같은 화면이었다 — 타임라인 쪽이 제목·설명·
   * 분류를 잃고 막대를 얻었을 뿐이다. 두 뷰를 합쳐 목록의 조판을 정본으로 삼고,
   * 타임라인이 유일하게 더 갖고 있던 인코딩(시간 비례 막대)은 기간 열이 흡수했다
   * (`widgets/event-list-compact/lib/year-span.ts`).
   */
  LIST: 'list',
  MAP: 'map',
  GRID: 'grid',
  DASHBOARD: 'dashboard',
  TREE: 'tree',
  GALLERY: 'gallery',
  /** 시대별 — 재위(빅토리아·건륭제 등)로 사건을 묶어 본다 */
  ERA: 'era',
} as const

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

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
