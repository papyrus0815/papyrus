/**
 * Event Entity - Public API
 * FSD: entities/event/model
 */

export { useEvents, visitedEventsQueryOptions } from './useEvents'
export type { UseEventsOptions } from './useEvents'
export { transformEventsFromApi } from './eventTransformers'
export type {
  CenturyFilter,
  FilterChip,
  EventHierarchyNode,
  EventTimelinePoint,
  EventTheater,
  EventKeyFigure,
  EventCountryRelation,
  EventInfluenceMetric,
  EventMapMarker,
  EventVisualAsset,
  EventSection,
  EventImage,
  EventVisuals,
  HistoricalEvent,
  HistoricalEventCategory,
} from './types'
export { CENTURY_UNKNOWN } from './types'
export {
  CATEGORY_LABEL,
  CATEGORY_ICON_MAP,
  extractCategoryKey,
} from './category-constants'
