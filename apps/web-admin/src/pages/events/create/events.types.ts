export interface EventHierarchyNode {
  id: string
  title: string
  summary: string
  period: {
    start: string
    end?: string
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
  id: string
  name: string
  role: string
  nation: string
  portraitUrl?: string
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
  type:
    | 'total-war'
    | 'campaign'
    | 'battle'
    | 'political-shift'
    | 'economic-crisis'
    | 'diplomatic-conflict'
  category: HistoricalEventCategory
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
  relatedCountries?: Array<{ id: string; name: string; flagEmoji?: string }> // 관련 현대 국가
  relatedHistoricalCountries?: Array<{ id: string; name: string }> // 관련 역사적 국가
  /** 키워드 (동일 사건 매핑/검색용) */
  keywords?: string[] | null
}
