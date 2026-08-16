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
export {
  ANCHOR_MIN_DESCENDANTS,
  getAnchorBadgeLabel,
  getDescendantCount,
  getEventDescendantCount,
  isAnchorEvent,
  isEmptyAnchorEvent,
  isSoloRootEvent,
} from './anchor'
export type {
  AnchorEventLike,
  AnchorHierarchyNodeLike,
  AnchorOverride,
} from './anchor'
export { isRenderRoot, isTreeRoot } from './root-event'
export type { RootPredicateEventLike } from './root-event'

