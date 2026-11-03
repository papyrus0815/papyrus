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
} from './types'
export { CENTURY_UNKNOWN, EVENTS_PAGE_SIZE_ALL } from './types'
export {
  EVENT_COUNTRY_ROLE_OPTIONS,
  eventCountryRoleHint,
  eventCountryRoleLabel,
  findReplacementForMismatchedCountry,
  moveParticipant,
  participantKey,
  quickRoleDescriptionPresets,
  readRecentParticipants,
  recordRecentParticipants,
  resolveBatchCountryQuery,
  roleDescriptionPlaceholderForType,
  sortParticipantsByRolePriority,
  suggestCountriesForEra,
  suggestCountriesFromTitle,
  swapTwoParticipants,
  toParticipants,
} from './country-participant'
export type {
  EventCountryParticipant,
  EventCountryRole,
  RecentParticipantRef,
  SuggestedCountryCandidate,
} from './country-participant'
export {
  EVENT_DOMAIN_OPTIONS,
  EVENT_DOMAIN_ORDER,
  EVENT_DOMAINS,
  domainAccent,
  domainLabel,
  eventDomainDef,
  isEventDomainKey,
} from './event-domain'
export type {
  DomainCardTone,
  DomainSoftTone,
  EventDomainDef,
  EventDomainKey,
  EventDomainOption,
} from './event-domain'
export {
  DOMAIN_SUBTYPES,
  EVENT_TYPE_GROUPS,
  EVENT_TYPE_ORDER,
  EVENT_TYPES,
  FACET_LABEL,
  FREQUENT_EVENT_TYPES,
  defaultDomainForType,
  eventTypeDef,
  eventTypeFeatures,
  eventTypeLabel,
  eventTypeShort,
  facetWeight,
  formatDomainPath,
  groupSubtypes,
  isArmedConflictType,
  isEventTypeKey,
  metricsFor,
  readRecentClassifications,
  recordRecentClassification,
  searchClassifications,
  subtypesForDomain,
  suggestClassificationFromTitle,
  typeFacets,
} from './event-type-registry'
export type {
  ClassificationSearchMatch,
  EventClassificationSuggestion,
  EventFacetKey,
  EventTypeDef,
  EventTypeFeatures,
  EventTypeGroup,
  EventTypeMetrics,
  EventTypeKey,
  RecentClassificationCombo,
  TypeModuleKey,
} from './event-type-registry'
