/** 기업 상태 */
export type CompanyStatusValue =
  | 'ACTIVE'
  | 'DISSOLVED'
  | 'MERGED'
  | 'SUSPENDED'
  | 'OTHER'

/** 응답에 포함되는 연결 엔티티 요약 (관리 화면 표시용) */
export interface CompanyRelationSummary {
  id: string
  name: string
}

export interface CompanyResponseDto {
  id: string
  /** 회사 이름 */
  name: string
  /** 약칭/티커 (예: EIC, GE) */
  shortName: string | null
  /** 현지어/원어 명칭 */
  localName: string | null
  /** 회사 설명 */
  description: string | null
  /** 상태 */
  status: CompanyStatusValue | null
  /** 설립일 (ISO 8601) */
  foundedAt: string | null
  /** 해산/폐업일 (ISO 8601) */
  dissolvedAt: string | null
  /** 공식 웹사이트 */
  websiteUrl: string | null
  /** 로고 URL */
  logoUrl: string | null
  /** 자유 확장 필드 */
  extra: unknown | null

  //--- 외래키
  founderId: string | null
  countryId: string | null
  historicalCountryId: string | null
  headquartersCityId: string | null
  organizationId: string | null

  //--- 연결 엔티티 요약
  founder: CompanyRelationSummary | null
  country: CompanyRelationSummary | null
  historicalCountry: CompanyRelationSummary | null
  headquartersCity: CompanyRelationSummary | null
  organization: CompanyRelationSummary | null

  createdAt: string
  updatedAt: string
}

/** 시설 유형 */
export type FacilityTypeValue =
  | 'HEADQUARTERS'
  | 'FACTORY'
  | 'RND'
  | 'OFFICE'
  | 'OTHER'

/** 기업 시설 요약 (상세 화면용) */
export interface CompanyFacilitySummary {
  id: string
  facilityType: FacilityTypeValue | null
  name: string | null
  address: string | null
  openedAt: string | null
  closedAt: string | null
  note: string | null
  city: CompanyRelationSummary | null
}

/** 기업 연혁 항목 (상세 화면용) */
export interface CompanyHistoryItem {
  id: string
  title: string
  occurredAt: string | null
  content: string | null
  note: string | null
  order: number | null
}

/** 기업-카테고리 연결 (상세 화면용) */
export interface CompanyCategoryLink {
  id: string
  categoryId: string
  categoryName: string
  fromDate: string | null
  toDate: string | null
  note: string | null
}

/** 기업 상세 응답 — 요약 응답 + 시설·연혁·카테고리 연결 */
export interface CompanyDetailResponseDto extends CompanyResponseDto {
  facilities: CompanyFacilitySummary[]
  histories: CompanyHistoryItem[]
  categories: CompanyCategoryLink[]
}
