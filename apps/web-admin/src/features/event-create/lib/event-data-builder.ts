/**
 * 이벤트 데이터 생성 로직
 * FSD: features/event-create/lib
 */
import type { MilitaryEvent } from '@/shared/types/military-event.types'
import type { CreateEventDto } from '@/shared/api/events'

import type { EventBelligerentsGraph } from '../../../pages/events/types/belligerents-graph.types'
import type { ConferenceEvent } from '../../../pages/events/types/conference-event.types'
import type { MentionEntityType } from '@/shared/lib/mention/mention-system'

import type { EventSection } from '../model/use-event-basic-info'

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
 *
 * 사건 멘션 추출(mentionedEvents)은 죽은 계약이던 relatedEventIds union의
 * 유일한 소비처였어서 함께 제거 — 본문 사건 멘션은 HTML 링크로만 남는다.
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

  return { mentionedPersons }
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
  /** 등록된 도시 참조 (PlaceSelect DB 선택) */
  cityId?: string | null
  /** 등록된 행정구역 참조 (PlaceSelect DB 선택) */
  administrativeDivisionId?: string | null
  thumbnail: string
  parentEventId: string
  tags: string[]
  relatedCountryIds: string[]
  relatedHistoricalCountryIds: string[]
  /** 메인(주도) 국가 — INITIATOR 마킹 대상. 없으면 모두 PARTICIPANT */
  primaryCountryId?: string | null
  primaryHistoricalCountryId?: string | null
  relatedPersons: Array<{ personId: string; role: string; note: string }>
  /** 추가 상위(EventParentLink) — 주 상위(parentEventId) 지정 시에만 유효(INV-2) */
  extraParentEventIds?: string[]
  sections: EventSection[]
  militaryEvent?: MilitaryEvent
  conferenceEvent?: ConferenceEvent
  belligerentsGraph: EventBelligerentsGraph
  warCost: string
  mentionedPersons: Array<{ personId: string; role: string; note: string }>
  childEventIds?: string[] // 기존 사건을 하위 사건으로 연결
  /** 키워드 (동일 사건 매핑용) */
  keywords?: string[]
  /** 다중 이미지(대시보드 등). 있으면 thumbnail 대신 사용 */
  eventImages?: Array<{
    imageUrl: string
    caption?: string
    source?: string
    order: number
    isPrimary: boolean
  }>
}) => {
  const resolvedEventImages =
    params.eventImages && params.eventImages.length > 0
      ? params.eventImages.map((img) => ({
          imageUrl: img.imageUrl,
          caption: img.caption,
          source: img.source,
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
    cityId: params.cityId || undefined,
    administrativeDivisionId: params.administrativeDivisionId || undefined,
    /**
     * ⚠️ 여기서 3상(빈 문자열 → null)으로 바꾸지 말 것 — 시도했다가 되돌렸다.
     *
     * 서버 계약은 이제 3상을 받는다(UpdateEventDto.parentEventId: string | null).
     * 하지만 이 빌더는 그걸 쓸 수 없다 — 폼이 **초기값으로도 빈 문자열**을 쓰기 때문에
     * '한 번도 안 고름'과 '명시 해제'가 여기서는 구분되지 않는다. null로 접으면
     * 상위를 건드린 적 없는 신규 등록까지 `parentEventId: null`을 실어 보내
     * '상위 미선택이면 전송하지 않는다' 계약(event-basic-form.spec)을 깬다.
     *
     * '— 없음' 무성 no-op(BUG-1)의 올바른 수정 지점은 **폼 레이어**다 — 거기서는
     * 초기값(undefined)과 사용자의 해제 선택(null)을 갈라 놓을 수 있다.
     */
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
    // INV-2: 추가 상위는 주 상위가 있을 때만 의미 — 주 상위 없으면 미전송
    extraParentEventIds:
      params.parentEventId && params.extraParentEventIds?.length
        ? params.extraParentEventIds
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
        ? // 레거시 이중모델: 프론트 MilitaryEvent와 MilitaryEventDto는 enum이 명목상만
          // 분리(값 동일). 은폐 캐스트를 이 필드 하나로 국소화 — 나머지 필드는
          // 콜사이트 satisfies가 DTO 표류를 잡는다.
          (params.militaryEvent as CreateEventDto['militaryEvent'])
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
