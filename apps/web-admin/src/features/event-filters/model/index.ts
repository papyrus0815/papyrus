/**
 * Event Filters Feature - Public API
 * FSD: features/event-filters/model
 */

export { useEventFilters } from './useEventFilters'
export type { EventFilterOptions } from './useEventFilters'
/**
 * 라벨 폴백 규약 — 트리거(위젯)와 칩(훅)이 같은 문자열·같은 원인 구분을 쓰게 하는
 * 단일 출처(검토 URL-1/IA-16/DATA-17 · GAP-5).
 */
export {
  REFERENCE_FALLBACK_LABEL,
  READY_REFERENCE_STATE,
  combineReferenceState,
  resolveFilterValueLabel,
} from './reference-label'
export type {
  FilterReferenceState,
  ReferenceLoadState,
} from './reference-label'
/**
 * 옵션 모집단 규약 — 옵션 목록이 참조 DB 순서가 아니라 '내 데이터'를 반영하게 하는
 * 건수·drop-one-out(검토 IA-13 · IA-12 · IA-2).
 */
export {
  EMPTY_FILTER_OPTION_COUNTS,
  buildFilterOptionCounts,
} from './option-facets'
export type { FilterOptionCounts } from './option-facets'
export type { FilterAxisKey } from './axis-predicates'
