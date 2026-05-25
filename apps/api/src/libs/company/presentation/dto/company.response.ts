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
