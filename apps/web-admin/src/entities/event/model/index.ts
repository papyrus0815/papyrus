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
export { CENTURY_UNKNOWN, EVENTS_PAGE_SIZE_ALL } from './types'
export {
  EVENT_COUNTRY_ROLE_OPTIONS,
  eventCountryRoleLabel,
  participantKey,
  toParticipants,
} from './country-participant'
export type {
  EventCountryParticipant,
  EventCountryRole,
} from './country-participant'
export {
  CATEGORY_LABEL,
  CATEGORY_ICON_MAP,
  extractCategoryKey,
} from './category-constants'
export {
  DOMAIN_SUBTYPES,
  EVENT_TYPE_ORDER,
  EVENT_TYPES,
  FACET_LABEL,
  eventTypeDef,
  eventTypeFeatures,
  eventTypeLabel,
  facetWeight,
  formatDomainPath,
  isArmedConflictType,
  isEventTypeKey,
  metricsFor,
  subtypesForDomain,
  typeFacets,
} from './event-type-registry'
export type {
  EventFacetKey,
  EventTypeDef,
  EventTypeFeatures,
  EventTypeMetrics,
  EventTypeKey,
  TypeModuleKey,
} from './event-type-registry'
