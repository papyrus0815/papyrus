/**
 * Event Hierarchy Feature - Public API
 * FSD: features/event-hierarchy/model
 */

export { useEventHierarchy } from './useEventHierarchy'
export type { FlattenedHierarchyItem } from './useEventHierarchy'
export {
  buildYearBuckets,
  groupYearsByCentury,
  selectVisibleRows,
} from './list-grouping'
export type { YearBuckets } from './list-grouping'

