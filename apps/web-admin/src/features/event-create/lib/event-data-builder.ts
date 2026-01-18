/**
 * 이벤트 데이터 생성 로직
 * FSD: features/event-create/lib
 */
import {
  CombatType,
  ConflictType,
  type MilitaryEvent,
  MilitaryRelationType,
  SideLevel,
} from '@/shared/types/military-event.types'

import type {
  BelligerentSide,
  CasualtyData,
  MilitaryConflictDetails,
} from '../../../pages/events/create/military-event-form'
import type { EventBelligerentsGraph } from '../../../pages/events/types/belligerents-graph.types'
import type { ConferenceEvent } from '../../../pages/events/types/conference-event.types'
import type { EventSection } from '../model/use-event-basic-info'
import {
  categoryNameMap,
  participationMap,
  relationTypeMap,
  sideLevelMap,
  toCombatType,
  toConflictType,
} from './type-converters'

/**
 * 멘션 데이터 추출
 */
export const extractMentions = (sections: EventSection[]) => {
  const allMentions = sections.flatMap((section) => section.mentions)

  const mentionedPersons = allMentions
    .filter((mention) => mention.type === 'person')
    .map((mention) => ({
      personId: mention.id,
      role: '',
      note: '',
    }))

  const mentionedEvents = allMentions
    .filter((mention) => mention.type === 'event')
    .map((mention) => mention.id)

  return { mentionedPersons, mentionedEvents }
}

/**
 * 군사 이벤트 데이터 변환
 */
export const buildMilitaryEventData = (
  category: string,
  militaryState: {
    belligerents: BelligerentSide[]
    belligerentsGraph: EventBelligerentsGraph
    militaryDetails: MilitaryConflictDetails
    casualties: { [sideId: string]: CasualtyData }
    warCost: string
  },
): MilitaryEvent | undefined => {
  if (category !== 'military') {
    return undefined
  }

  const {
    belligerents,
    belligerentsGraph,
    militaryDetails,
    casualties,
    warCost,
  } = militaryState

  // 1. belligerentSides 변환
  const convertedBelligerentSides =
    belligerents && belligerents.length > 0
      ? belligerents.map((side) => ({
          name: side.name,
          level: (sideLevelMap[side.level || 'country'] || 'COUNTRY') as
            | 'COALITION'
            | 'COUNTRY'
            | 'FORCE',
          commander: side.commander,
          commanderPersonId: side.commanderPersonId,
          forces: side.forces,
          description: side.description,
          countries: (side.countries || []).map((country) => ({
            countryId: country.isHistorical ? undefined : country.countryId,
            historicalCountryId: country.isHistorical
              ? country.countryId
              : undefined,
            commander: country.commander,
            commanderPersonId: country.commanderPersonId,
            forces: country.forces,
            participationType:
              participationMap[country.participation || 'full'],
            joinDate: country.joinDate,
            withdrawDate: country.withdrawDate,
            description: country.description,
          })),
        }))
      : // belligerentsGraph에서 자동 변환
        belligerentsGraph?.countries && belligerentsGraph.countries.length > 0
        ? (() => {
            const countriesByRole: Record<
              string,
              typeof belligerentsGraph.countries
            > = {}
            belligerentsGraph.countries.forEach((country) => {
              const roleName = country.role || 'Unknown'
              if (!countriesByRole[roleName]) {
                countriesByRole[roleName] = []
              }
              countriesByRole[roleName].push(country)
            })

            return Object.entries(countriesByRole).map(
              ([roleName, countries]) => ({
                name: roleName,
                level: 'COUNTRY' as const,
                commander: undefined,
                commanderPersonId: undefined,
                forces: undefined,
                description: undefined,
                countries: countries.map((country) => ({
                  countryId: country.isHistorical
                    ? undefined
                    : country.countryId,
                  historicalCountryId: country.isHistorical
                    ? country.countryId
                    : undefined,
                  commander: undefined,
                  commanderPersonId: undefined,
                  forces: country.forces,
                  participationType:
                    participationMap[country.participation || 'full'],
                  joinDate: (country as { joinDate?: string }).joinDate,
                  withdrawDate: (country as { withdrawDate?: string })
                    .withdrawDate,
                  description: undefined,
                })),
              }),
            )
          })()
        : undefined

  // 2. relations 변환
  const convertedRelations =
    belligerentsGraph?.relations && belligerentsGraph.relations.length > 0
      ? belligerentsGraph.relations
          .map((relation) => {
            const fromCountryInfo = belligerentsGraph.countries.find(
              (country) => country.countryId === relation.fromCountry,
            )
            const toCountryInfo = belligerentsGraph.countries.find(
              (country) => country.countryId === relation.toCountry,
            )

            return {
              fromCountryId:
                fromCountryInfo && !fromCountryInfo.isHistorical
                  ? relation.fromCountry
                  : undefined,
              fromHistoricalCountryId: fromCountryInfo?.isHistorical
                ? relation.fromCountry
                : undefined,
              toCountryId:
                toCountryInfo && !toCountryInfo.isHistorical
                  ? relation.toCountry
                  : undefined,
              toHistoricalCountryId: toCountryInfo?.isHistorical
                ? relation.toCountry
                : undefined,
              relationType: (relationTypeMap[relation.relationType || ''] ||
                'NEUTRAL') as
                | 'ALLIED'
                | 'COOPERATION'
                | 'NON_AGGRESSION'
                | 'NEUTRAL'
                | 'ENEMY'
                | 'PUPPET'
                | 'OCCUPIED',
              startDate: relation.startDate || undefined,
              endDate: relation.endDate || undefined,
              strength:
                relation.strength && relation.strength > 0
                  ? relation.strength
                  : undefined,
              description: relation.description || undefined,
            }
          })
          .filter(
            (relation) =>
              relation.relationType &&
              (relation.fromCountryId || relation.fromHistoricalCountryId) &&
              (relation.toCountryId || relation.toHistoricalCountryId),
          )
      : undefined

  // 3. militaryDetails 변환
  const convertedMilitaryDetails =
    militaryDetails &&
    (militaryDetails.type || militaryDetails.combatType?.length)
      ? {
          conflictType: toConflictType(militaryDetails.type),
          combatTypes: (militaryDetails.combatType || []).map(toCombatType),
          objective: militaryDetails.objective || undefined,
          tactics: militaryDetails.tactics || undefined,
          strategy: militaryDetails.strategy || undefined,
          outcome: militaryDetails.outcome || undefined,
          territoryChanges: militaryDetails.territoryChanges || undefined,
          treaty: militaryDetails.treaty || undefined,
          strategicImpact: militaryDetails.strategicImpact || undefined,
        }
      : undefined

  // 4. casualties 변환
  const convertedCasualties =
    casualties && Object.keys(casualties).length > 0
      ? Object.entries(casualties).map(([sideName, casualty]) => ({
          sideName,
          totalKilled: casualty.total,
          totalWounded: casualty.military?.wounded || '0',
          countries: [],
        }))
      : undefined

  return {
    belligerentSides: convertedBelligerentSides?.map((side) => ({
      ...side,
      level: side.level as SideLevel,
    })) as MilitaryEvent['belligerentSides'],
    relations: convertedRelations?.map((relation) => ({
      ...relation,
      relationType: relation.relationType as MilitaryRelationType,
    })) as MilitaryEvent['relations'],
    militaryDetails: convertedMilitaryDetails
      ? {
          ...convertedMilitaryDetails,
          conflictType: convertedMilitaryDetails.conflictType as ConflictType,
          combatTypes: convertedMilitaryDetails.combatTypes as CombatType[],
        }
      : undefined,
    casualties: convertedCasualties,
    warCost: warCost || undefined,
  } as MilitaryEvent
}

/**
 * 이벤트 제출 데이터 생성
 */
export const buildEventSubmitData = (params: {
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  category: string
  location: string
  thumbnail: string
  parentEventId: string
  tags: string[]
  relatedCountryIds: string[]
  relatedHistoricalCountryIds: string[]
  relatedPersons: Array<{ personId: string; role: string; note: string }>
  relatedEventIds: string[]
  sections: EventSection[]
  militaryEvent?: MilitaryEvent
  conferenceEvent?: ConferenceEvent
  belligerentsGraph: EventBelligerentsGraph
  warCost: string
  mentionedPersons: Array<{ personId: string; role: string; note: string }>
  mentionedEvents: string[]
  childEvents?: Array<{
    title: string
    startDate?: string
    endDate?: string
    description?: string
    location?: string
    thumbnail?: string
  }>
}) => {
  return {
    title: params.title,
    description: params.description || undefined,
    startDate: params.startTime
      ? `${params.startDate}T${params.startTime}:00.000Z`
      : `${params.startDate}T00:00:00.000Z`,
    endDate: params.endDate
      ? params.endTime
        ? `${params.endDate}T${params.endTime}:00.000Z`
        : `${params.endDate}T00:00:00.000Z`
      : undefined,
    // 🔧 FIX: category는 이미 categoryId (cat-military-001)이므로 직접 전달
    categoryId: params.category || undefined,
    location: params.location.trim() || undefined,
    thumbnail: params.thumbnail || undefined,
    parentEventId: params.parentEventId || undefined,
    tags: params.tags.length > 0 ? params.tags : undefined,
    relatedCountryIds:
      params.relatedCountryIds.length > 0
        ? params.relatedCountryIds
        : undefined,
    relatedHistoricalCountryIds:
      params.relatedHistoricalCountryIds.length > 0
        ? params.relatedHistoricalCountryIds
        : undefined,
    relatedPersons:
      [...params.relatedPersons, ...params.mentionedPersons].length > 0
        ? [...params.relatedPersons, ...params.mentionedPersons]
        : undefined,
    relatedEventIds:
      [...params.relatedEventIds, ...params.mentionedEvents].length > 0
        ? [...params.relatedEventIds, ...params.mentionedEvents]
        : undefined,
    sections:
      params.sections.length > 0 &&
      params.sections.some((section) => section.content.trim())
        ? {
            items: params.sections,
          }
        : undefined,
    militaryEvent:
      params.militaryEvent &&
      (params.militaryEvent.belligerentSides?.length ||
        params.militaryEvent.relations?.length ||
        params.militaryEvent.militaryDetails?.conflictType ||
        params.militaryEvent.militaryDetails?.combatTypes?.length ||
        params.militaryEvent.casualties?.length ||
        params.militaryEvent.warCost)
        ? params.militaryEvent
        : undefined,
    conferenceEvent: params.conferenceEvent
      ? params.conferenceEvent
      : undefined,
    belligerentsGraph:
      params.belligerentsGraph.countries.length > 0 ||
      params.belligerentsGraph.relations.length > 0
        ? params.belligerentsGraph
        : undefined,
    warCost: params.warCost || undefined,
    childEvents: params.childEvents && params.childEvents.length > 0
      ? params.childEvents
      : undefined, // 🆕 하위 사건 추가
  }
}
