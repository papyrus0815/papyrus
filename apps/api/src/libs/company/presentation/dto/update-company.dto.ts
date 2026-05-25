import type { CompanyStatusValue } from './company.response'

export interface UpdateCompanyDto {
  /** 회사 이름 */
  name?: string
  /** 약칭/티커 (예: EIC, GE) */
  shortName?: string | null
  /** 현지어/원어 명칭 */
  localName?: string | null
  /** 회사 설명 */
  description?: string | null
  /** 상태 */
  status?: CompanyStatusValue | null
  /** 설립일 (ISO 8601) */
  foundedAt?: string | null
  /** 해산/폐업일 (ISO 8601) */
  dissolvedAt?: string | null
  /** 공식 웹사이트 */
  websiteUrl?: string | null
  /** 로고 URL */
  logoUrl?: string | null
  /** 자유 확장 필드 */
  extra?: unknown | null

  //--- 외래키 (null로 연결 해제)
  founderId?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  headquartersCityId?: string | null
  organizationId?: string | null
}
