/**
 * Prisma `EventCountryRole` enum 값 (DB는 대문자, API는 그대로 통과).
 * Timeline의 대표 국가 선정 우선순위는 picker 헬퍼에서 정의.
 */
export type EventCountryRoleValue =
  | 'INITIATOR'
  | 'TARGET'
  | 'PARTICIPANT'
  | 'ALLY'
  | 'ADVERSARY'
  | 'MEDIATOR'
  | 'OBSERVER'
  | 'VICTIM'
  | 'BENEFICIARY'
  | 'OTHER'

export interface EventHierarchyNode {
  id: string
  title: string
  summary: string
  period: {
    start: string
    end?: string
    /**
     * 날짜 정밀도('year' | 'month' | 'day') — 노드만 받는 소비처(요약 모달 트리,
     * 트리 뷰)가 formatDateRange에 넘겨 없는 월·일을 지어내지 않게 한다.
     */
    startPrecision?: string | null
    endPrecision?: string | null
  }
  importance: 'critical' | 'major' | 'notable'
  children?: EventHierarchyNode[]
}

export interface EventTimelinePoint {
  id: string
  occurredAt: string
  title: string
  description: string
  locationName?: string
  coordinates?: {
    lat: number
    lng: number
  }
  involvedPersons?: {
    id: string
    name: string
    role?: string
    nation?: string
  }[]
  involvedCountries?: {
    id: string
    name: string
    role: 'allies' | 'axis' | 'neutral'
  }[]
}

export interface EventTheater {
  id: string
  name: string
  description: string
  strategicFocus: string
  operations: {
    id: string
    name: string
    summary: string
    outcome: string
    location: string
  }[]
}

export interface EventKeyFigure {
  /** PersonEvent 행 ID (목록 key) */
  id: string
  /** 인물 ID — 카드 클릭 시 인물 상세 이동 */
  personId?: string
  name: string
  role: string
  nation: string
  portraitUrl?: string
  /** 인물 시점의 사건 서술 (PersonEvent.note, 장문 가능) */
  contribution: string
}

export interface EventCountryRelation {
  id: string
  name: string
  role: 'offensive' | 'defensive' | 'support' | 'occupied'
  classification: 'Axis' | 'Allies' | 'Neutral' | 'Colony'
  note?: string
}

export interface EventInfluenceMetric {
  label: string
  value: number
  description: string
}

export interface EventMapMarker {
  id: string
  label: string
  coordinates: {
    lat: number
    lng: number
  }
  category: 'battle' | 'occupation' | 'turning-point'
  detail: string
}

/**
 * 카테고리 타입은 서버에서 동적으로 관리됩니다.
 * EventCategoryDto.name을 기반으로 합니다.
 */
export type HistoricalEventCategory = string

export interface EventVisualAsset {
  id: string
  title: string
  url: string
  caption?: string
  source?: string
}

export interface EventSection {
  id: string
  title: string
  content: string
  order: number
  sectionType: string
}

export interface EventImage {
  id: string
  imageUrl: string
  caption?: string
  source?: string
  order: number
  isPrimary: boolean
}

export interface EventVisuals {
  heroImageUrl: string
  thumbnailUrl: string
  gallery: EventVisualAsset[]
}

export interface HistoricalEvent {
  id: string
  title: string
  /** 등록 시각(ISO) — '등록순' 정렬(SORT_OPTIONS.CREATED)의 유일한 근거. transformer가 매핑한다. */
  createdAt?: string | null
  type:
    | 'total-war'
    | 'campaign'
    | 'battle'
    | 'political-shift'
    | 'economic-crisis'
    | 'diplomatic-conflict'
  category: HistoricalEventCategory
  /** DB 카테고리 ID — 필터·칩의 안정 매칭용(category는 표시 이름). transformer가 항상 채움. */
  categoryId?: string
  description: string
  startDate: string
  /** year | month | day. 표시 시 년만/년·월/년·월·일 구분 */
  startDatePrecision?: string | null
  endDate?: string
  endDatePrecision?: string | null
  location?: string
  tags: string[]
  background: string
  aftermath: string
  stats: {
    casualties: {
      total: number
      civilians: number
      military: number
    }
    participatingNations: number
    theaters: number
    durationInYears: number
  }
  hierarchy: EventHierarchyNode
  timeline: EventTimelinePoint[]
  theaters: EventTheater[]
  keyFigures: EventKeyFigure[]
  countries: EventCountryRelation[]
  influence: EventInfluenceMetric[]
  visuals: EventVisuals
  sources?: {
    label: string
    url: string
  }[]
  map: {
    summary: string
    markers: EventMapMarker[]
  }
  quickFacts: {
    commandStructure: string
    decisiveTechnology: string
    intelligenceNotes: string
    logisticalScale: string
  }
  parentEventId?: string
  sectionTitles?: string[] // 작성된 섹션 제목 리스트 (deprecated)
  eventSections?: EventSection[] // 사건 섹션 목록 (새 구조)
  eventImages?: EventImage[] // 사건 이미지 목록 (새 구조)
  // 관련 현대 국가 (role: 사건 내 역할 — Timeline 등에서 대표 국가 선정에 사용)
  relatedCountries?: Array<{
    id: string
    name: string
    flagEmoji?: string
    role?: EventCountryRoleValue | null
  }>
  // 관련 역사적 국가
  relatedHistoricalCountries?: Array<{
    id: string
    name: string
    role?: EventCountryRoleValue | null
  }>
  /** 키워드 (동일 사건 매핑/검색용) */
  keywords?: string[] | null
}
