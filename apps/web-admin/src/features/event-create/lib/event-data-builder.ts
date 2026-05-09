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
import type { MentionEntityType } from '@/shared/lib/mention/mention-system'

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
 * RichText HTML에서 멘션(`<span class="entity-link" data-entity-type="..." data-entity-id="..." data-entity-name="...">`)을 추출.
 *
 * 편집 모드에서 서버가 돌려준 본문 HTML을 EventSection.mentions로 복원할 때 사용.
 * SSR 환경 안전을 위해 DOMParser가 없으면 빈 배열 반환.
 *
 * startIndex/endIndex는 원본 HTML 내 노드의 outerHTML 위치로 채우되,
 * 정확한 텍스트 오프셋 계산이 어려우므로 -1로 두어 "위치 미상" 신호로 처리.
 * 멘션 자체의 type/id/name은 보존되므로 연관 엔티티 매핑에는 충분.
 */
export const extractMentionsFromHtml = (
  html: string,
): EventSection['mentions'] => {
  if (!html || typeof DOMParser === 'undefined') return []
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const nodes = doc.querySelectorAll<HTMLElement>(
      'span.entity-link[data-entity-id][data-entity-type]',
    )
    return Array.from(nodes).map((el) => ({
      type: (el.getAttribute('data-entity-type') ?? 'event') as MentionEntityType,
      id: el.getAttribute('data-entity-id') ?? '',
      name:
        el.getAttribute('data-entity-name') ??
        el.textContent?.trim() ??
        '',
      startIndex: -1,
      endIndex: -1,
    }))
  } catch {
    return []
  }
}

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
  startDatePrecision?: 'year' | 'month' | 'day'
  endDate: string
  endTime: string
  endDatePrecision?: 'year' | 'month' | 'day'
  category: string
  location: string
  thumbnail: string
  parentEventId: string
  tags: string[]
  relatedCountryIds: string[]
  relatedHistoricalCountryIds: string[]
  /** 메인(주도) 국가 — INITIATOR 마킹 대상. 없으면 모두 PARTICIPANT */
  primaryCountryId?: string | null
  primaryHistoricalCountryId?: string | null
  relatedPersons: Array<{ personId: string; role: string; note: string }>
  relatedEventIds: string[]
  sections: EventSection[]
  militaryEvent?: MilitaryEvent
  conferenceEvent?: ConferenceEvent
  belligerentsGraph: EventBelligerentsGraph
  warCost: string
  mentionedPersons: Array<{ personId: string; role: string; note: string }>
  mentionedEvents: string[]
  childEventIds?: string[] // 기존 사건을 하위 사건으로 연결
  /** 키워드 (동일 사건 매핑용) */
  keywords?: string[]
  /** 다중 이미지(대시보드 등). 있으면 thumbnail 대신 사용 */
  eventImages?: Array<{ imageUrl: string; caption?: string; order: number; isPrimary: boolean }>
}) => {
  const resolvedEventImages =
    params.eventImages && params.eventImages.length > 0
      ? params.eventImages.map((img) => ({
          imageUrl: img.imageUrl,
          caption: img.caption,
          source: undefined,
          order: img.order,
          isPrimary: img.isPrimary,
        }))
      : params.thumbnail
        ? [
            {
              imageUrl: params.thumbnail,
              caption: undefined,
              source: undefined,
              order: 0,
              isPrimary: true,
            },
          ]
        : undefined

  return {
    title: params.title,
    description: params.description || undefined,
    startDate: params.startTime
      ? `${params.startDate}T${params.startTime}:00.000Z`
      : `${params.startDate}T00:00:00.000Z`,
    startDatePrecision: params.startDatePrecision ?? undefined,
    endDate: params.endDate
      ? params.endTime
        ? `${params.endDate}T${params.endTime}:00.000Z`
        : `${params.endDate}T00:00:00.000Z`
      : undefined,
    endDatePrecision: params.endDatePrecision ?? undefined,
    // 🔧 FIX: category는 이미 categoryId (cat-military-001)이므로 직접 전달
    categoryId: params.category || undefined,
    location: params.location.trim() || undefined,
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
    // primary는 선택된 ID 목록 안에 있을 때만 전송. 폼에서 국가 제거됐는데 primary state가 stale이면 무시.
    primaryCountryId:
      params.primaryCountryId &&
      params.relatedCountryIds.includes(params.primaryCountryId)
        ? params.primaryCountryId
        : undefined,
    primaryHistoricalCountryId:
      params.primaryHistoricalCountryId &&
      params.relatedHistoricalCountryIds.includes(
        params.primaryHistoricalCountryId,
      )
        ? params.primaryHistoricalCountryId
        : undefined,
    relatedPersons:
      [...params.relatedPersons, ...params.mentionedPersons].length > 0
        ? [...params.relatedPersons, ...params.mentionedPersons]
        : undefined,
    relatedEventIds:
      [...params.relatedEventIds, ...params.mentionedEvents].length > 0
        ? [...params.relatedEventIds, ...params.mentionedEvents]
        : undefined,
    // ✅ 새 구조: eventSections (배열로 직접 전송)
    eventSections:
      params.sections.length > 0 &&
      params.sections.some((section) => section.content.trim())
        ? params.sections.map((section, index) => ({
            title: section.title,
            content: section.content,
            order: index,
            sectionType: 'content',
          }))
        : undefined,
    // ✅ 새 구조: eventImages (썸네일 또는 다중 이미지)
    eventImages: resolvedEventImages,
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
    childEventIds:
      params.childEventIds && params.childEventIds.length > 0
        ? params.childEventIds
        : undefined, // 기존 사건을 하위 사건으로 연결
    keywords:
      params.keywords && params.keywords.length > 0
        ? params.keywords.filter((k) => k.trim())
        : undefined,
  }
}
