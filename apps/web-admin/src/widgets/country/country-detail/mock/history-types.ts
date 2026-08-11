// ============================================
// 역사적 국가 및 사건 타입 정의
// ============================================

// 사건 타입
export type EventType =
  | 'war' // 전쟁
  | 'treaty' // 조약
  | 'reform' // 개혁
  | 'revolution' // 혁명
  | 'diplomatic' // 외교
  | 'economic' // 경제
  | 'cultural' // 문화
  | 'disaster' // 재난
  | 'establishment' // 건국/설립
  | 'collapse' // 멸망

// 계승 유형
export type SuccessionType = 'direct' | 'partial' | 'cultural'

// 사건 참여자
export interface EventParticipant {
  type: 'country' | 'person' | 'organization'
  id: string
  name: string
  role: string // '침략자', '방어자', '조약 체결국' 등
}

// 사건 규모
export type EventScale = 'major' | 'sub' // major: 거대 사건, sub: 하위 사건

// 역사적 사건
export interface HistoricalEvent {
  id: string
  name: string // '강화도 조약', '임진왜란' 등
  nameEn?: string
  date: {
    start: string
    end?: string // 기간이 있는 사건
  }
  countryId: string // 해당 국가 (조선, 고려 등)
  type: EventType
  scale: EventScale // 사건 규모
  // ⚠️ 표시 전용 mock 계약 — 실제 API는 주 상위 FK(parentEventId) 외에
  // EventParentLink 다중 상위(EventResponseDto.extraParents)를 함께 가진다.
  // 신규 UI가 이 단수 부모 형상을 복제하지 말 것.
  parentEventId?: string // 상위 사건 ID (하위 사건인 경우)
  subEvents?: string[] // 하위 사건 ID 목록 (거대 사건인 경우)
  participants: EventParticipant[]
  location: string
  locationCoords?: {
    latitude: number
    longitude: number
  }
  description: string
  significance: string // 역사적 의의
  impact?: string // 영향
  casualties?: string // 인명 피해
  relatedEvents: string[] // 관련 사건 ID
  relatedPersons?: string[] // 관련 인물 ID
  sources?: string[] // 출처
  images?: string[]
}

// 이전 국가 (역사적 국가)
export interface PredecessorCountry {
  id: string
  name: string // 조선, 고려, 고구려 등
  nameEn?: string
  period: {
    start: string // '918-01-01'
    end: string // '1392-07-17'
  }
  capital: string
  territory: string // 영토 설명
  population?: string
  significance: string // 역사적 의의
  government: string // 정부 형태
  dynasty?: string // 왕조
  majorRulers?: string[] // 주요 통치자
  majorEvents: string[] // 주요 사건 ID
  culturalAchievements?: string[] // 문화적 성취
  images?: string[]
}

// 국가 계승 관계
export interface CountrySuccession {
  id: string
  currentCountryId: string // 현재 국가 (예: 대한민국)
  predecessorCountries: PredecessorCountry[] // 이전 국가들
  successionType: SuccessionType // 계승 유형
  timeline: HistoricalPeriod[] // 시대 구분
}

// 역사적 시대
export interface HistoricalPeriod {
  id: string
  name: string // '삼국시대', '고려시대', '조선시대' 등
  nameEn?: string
  startYear: number
  endYear: number
  countries: string[] // 해당 시기 국가들
  majorEvents: string[] // 주요 사건 ID
  description: string
  characteristics: string[] // 시대적 특징
  color?: string // 타임라인 표시 색상
}

// 타임라인
export interface Timeline {
  id: string
  countryId: string
  title: string // '한반도 역사'
  description: string
  periods: HistoricalPeriod[]
}

// 역사 데이터 (전체)
export interface HistoryData {
  succession: CountrySuccession
  events: HistoricalEvent[]
  timeline: Timeline
  majorEvents: HistoricalEvent[] // 거대 사건만 필터링
  subEventsByParent: Record<string, HistoricalEvent[]> // 상위 사건 ID로 하위 사건 매핑
}

