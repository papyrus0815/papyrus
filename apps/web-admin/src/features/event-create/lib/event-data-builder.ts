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
import type {
  BelligerentCountry,
  CountryRelation,
  EventBelligerentsGraph,
} from '../../../pages/events/types/belligerents-graph.types'
import type { ConferenceEvent } from '../../../pages/events/types/conference-event.types'
import type { MentionEntityType } from '@/shared/lib/mention/mention-system'

import type { EventSection } from '../model/use-event-basic-info'
import {
  categoryNameMap,
  fromCombatTypeDto,
  fromConflictTypeDto,
  fromParticipationTypeDto,
  fromRelationTypeDto,
  fromSideLevelDto,
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
          color: side.color,
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
 * 편집 로드 시 응답에 (런타임 전용으로) 실려오는 정규화 militaryEvent 형태.
 * 백엔드 getMilitaryData()가 돌려주는 DTO를 느슨하게 표현한다. (SDK 타입엔 없음)
 */
export interface NormalizedMilitaryEventResponse {
  belligerentSides?: Array<{
    name?: string
    level?: string
    commander?: string
    commanderPersonId?: string
    forces?: string
    description?: string
    color?: string
    countries?: Array<{
      countryId?: string
      historicalCountryId?: string
      commander?: string
      commanderPersonId?: string
      forces?: string
      participationType?: string
      joinDate?: string
      withdrawDate?: string
      description?: string
    }>
  }>
  relations?: Array<{
    fromCountryId?: string
    fromHistoricalCountryId?: string
    toCountryId?: string
    toHistoricalCountryId?: string
    relationType?: string
    startDate?: string
    endDate?: string
    strength?: number
    description?: string
  }>
  militaryDetails?: {
    conflictType?: string
    combatTypes?: string[]
    objective?: string
    tactics?: string
    strategy?: string
    outcome?: string
    territoryChanges?: string
    treaty?: string
    strategicImpact?: string
  }
  casualties?: Array<{
    sideName?: string
    totalKilled?: string
    totalWounded?: string
  }>
}

export interface HydratedMilitaryState {
  belligerents: BelligerentSide[]
  belligerentsGraph: EventBelligerentsGraph
  militaryDetails?: MilitaryConflictDetails
  casualties: { [sideId: string]: CasualtyData }
}

/**
 * 정규화 militaryEvent(응답) → 레거시 폼 상태로 역매핑.
 *
 * 군사 폼(MilitaryEventForm)은 레거시 상태(belligerents/belligerentsGraph/
 * militaryDetails/casualties)를 읽어 렌더링하고, 저장 시에도 buildMilitaryEventData가
 * 레거시 상태에서 재빌드한다. 따라서 편집 로드 시 이 하이드레이션이 없으면 폼이 비고
 * 저장에서 빈 값으로 덮어써 군사 데이터가 통째로 소실된다. 이 함수는 buildMilitaryEventData의
 * 역변환으로, 기존 from*Dto 컨버터를 사용해 enum을 되돌린다.
 *
 * @param resolveCountryName countryId→표시명 해석기(라이브 국가 목록 기반). 미전달 시 빈 문자열.
 */
export const hydrateMilitaryStateFromEvent = (
  militaryEvent: NormalizedMilitaryEventResponse,
  resolveCountryName: (
    countryId: string,
    isHistorical: boolean,
  ) => string = () => '',
): HydratedMilitaryState => {
  const sides = militaryEvent.belligerentSides ?? []

  // 1. belligerents (레거시 진영 구조)
  const belligerents: BelligerentSide[] = sides.map((side, sideIndex) => ({
    id: `loaded-side-${sideIndex}`,
    name: side.name ?? '',
    level: fromSideLevelDto(side.level),
    commander: side.commander ?? '',
    commanderPersonId: side.commanderPersonId,
    forces: side.forces ?? '',
    description: side.description,
    color: side.color,
    countries: (side.countries ?? []).map((country) => {
      const isHistorical = Boolean(country.historicalCountryId)
      const countryId =
        (isHistorical ? country.historicalCountryId : country.countryId) ?? ''
      return {
        countryId,
        countryName: resolveCountryName(countryId, isHistorical),
        isHistorical,
        participation: fromParticipationTypeDto(
          country.participationType ?? 'MAIN',
        ),
        commander: country.commander,
        commanderPersonId: country.commanderPersonId,
        forces: country.forces,
        joinDate: country.joinDate,
        withdrawDate: country.withdrawDate,
        description: country.description,
      }
    }),
  }))

  // 2. belligerentsGraph (노드=국가, 엣지=관계). 노드는 countryId로 dedup.
  const graphCountries: BelligerentCountry[] = []
  const seenCountryIds = new Set<string>()
  sides.forEach((side) => {
    ;(side.countries ?? []).forEach((country) => {
      const isHistorical = Boolean(country.historicalCountryId)
      const countryId =
        (isHistorical ? country.historicalCountryId : country.countryId) ?? ''
      if (!countryId || seenCountryIds.has(countryId)) return
      seenCountryIds.add(countryId)
      graphCountries.push({
        countryId,
        countryName: resolveCountryName(countryId, isHistorical),
        isHistorical,
        commander: country.commander,
        commanderPersonId: country.commanderPersonId,
        forces: country.forces,
        role: side.name,
        participation: fromParticipationTypeDto(
          country.participationType ?? 'MAIN',
        ),
        description: country.description,
      })
    })
  })
  const graphRelations: CountryRelation[] = (militaryEvent.relations ?? []).map(
    (relation, relIndex) => ({
      id: `loaded-rel-${relIndex}`,
      fromCountry:
        relation.fromCountryId ?? relation.fromHistoricalCountryId ?? '',
      toCountry: relation.toCountryId ?? relation.toHistoricalCountryId ?? '',
      relationType: fromRelationTypeDto(relation.relationType),
      startDate: relation.startDate ?? '',
      endDate: relation.endDate,
      strength: relation.strength ?? 0,
      description: relation.description,
    }),
  )
  const belligerentsGraph: EventBelligerentsGraph = {
    countries: graphCountries,
    relations: graphRelations,
  }

  // 3. militaryDetails (없으면 undefined — 호출부에서 기본값 유지)
  const md = militaryEvent.militaryDetails
  const militaryDetails: MilitaryConflictDetails | undefined = md
    ? {
        type: fromConflictTypeDto(md.conflictType ?? 'BATTLE'),
        combatType: (md.combatTypes ?? []).map(fromCombatTypeDto),
        outcome: md.outcome ?? '',
        objective: md.objective,
        tactics: md.tactics,
        strategy: md.strategy,
        territoryChanges: md.territoryChanges,
        treaty: md.treaty,
        strategicImpact: md.strategicImpact,
      }
    : undefined

  // 4. casualties.
  //
  // 폼은 casualties[side.id]로 조회하므로, 응답 casualty의 sideName이 진영 이름과
  // 일치하면 그 진영의 (재생성된) id로 키를 바꿔 표시까지 복구한다. side id는
  // `loaded-side-${index}`로 결정적이고 getMilitaryData가 createdAt asc로 정렬을
  // 보장하므로 라운드트립 간 안정적이다.
  //
  // ⚠️ 한계: sideName이 어떤 진영 이름과도 매칭되지 않는 경우(과거 임시 로컬 id로
  // 저장된 데이터)는 진영 재연결이 불가능해 화면엔 안 뜨지만, 키를 그대로 보존해
  // 수치가 다음 저장에서 소실되지 않게 한다. 또 killed/missing/captured 세분값은
  // 저장 단계에서 이미 버려져 복원 불가('0'으로 둠).
  const sideIdByName = new Map<string, string>()
  sides.forEach((side, sideIndex) => {
    if (side.name) sideIdByName.set(side.name, `loaded-side-${sideIndex}`)
  })
  const casualties: { [sideId: string]: CasualtyData } = {}
  ;(militaryEvent.casualties ?? []).forEach((casualty) => {
    const key = casualty.sideName
    if (!key) return
    const mappedKey = sideIdByName.get(key) ?? key
    casualties[mappedKey] = {
      military: {
        killed: '0',
        wounded: casualty.totalWounded ?? '0',
        missing: '0',
        captured: '0',
      },
      total: casualty.totalKilled ?? '0',
    }
  })

  return { belligerents, belligerentsGraph, militaryDetails, casualties }
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
