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
  TIMELINE: 'timeline',
  LIST: 'list',
  MAP: 'map',
  GRID: 'grid',
  DASHBOARD: 'dashboard',
  TREE: 'tree',
  GALLERY: 'gallery',
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

/**
 * 특수 필터 값
 */
export const FILTER_ALL = 'all' as const

/**
 * 전역 표시 직책 ID (교황 등 — 모든 국가 화면에서 표시되며 토글로 켜고 끌 수 있음)
 */
export const GLOBAL_POSITION_DEFINITION_IDS = ['gov-pos-pope'] as const
