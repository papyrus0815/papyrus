/**
 * 인포그래픽 뷰 전용 데이터 타입.
 *
 * Person 응답 DTO의 governmentTenures/sovereignReigns가 SDK 상 any[]로 노출되어,
 * 어댑터가 안전하게 읽을 수 있도록 최소 필드만 선언한 보조 타입을 둠.
 */

/** 어댑터가 인포그래픽 뷰들에 넘기는 가공된 인물 데이터. */
export interface AdaptedPerson {
  id: string
  name: string
  born: number
  died: number
  activityYear: number
  age: number | null
  region: string
  country: string
  field: string
  faction: string
  influence: number
  profileImageUrl: string | null
  isMonarch: boolean
  isHeadOfState: boolean
  primaryTitle: string | null
  biography: string | null
  isAlive: boolean
  /** 검색 매칭용 사전 결합 텍스트 (표시명·원본명·성·국가·소속·직함 lowercase). 매 키 입력 재계산 방지. */
  searchText: string
}

/** GovernmentTenureResponse 중 어댑터가 참조하는 최소 필드. */
export interface TenureLite {
  startDate?: string | null
  positionType?: string | null
  title?: string | null
  positionDefinition?: {
    title?: string | null
    positionType?: string | null
  } | null
}

/** SovereignReignResponse 중 어댑터가 참조하는 최소 필드. */
export interface ReignLite {
  startYear?: number | null
}
