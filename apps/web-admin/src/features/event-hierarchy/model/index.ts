/**
 * Event Hierarchy Feature - Public API
 * FSD: features/event-hierarchy/model
 */

export { useEventHierarchy } from './useEventHierarchy'
export type { FlattenedHierarchyItem } from './useEventHierarchy'
export {
  buildYearBuckets,
  formatGapLabel,
  gapSpacingPx,
  groupYearsByCentury,
  orderRowsForRender,
  selectVisibleRows,
} from './list-grouping'
export type { YearBuckets, YearGap } from './list-grouping'
export { selectMatchedRows } from './matched-rows'
export type { SelectMatchedRowsOptions } from './matched-rows'

