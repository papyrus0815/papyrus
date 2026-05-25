import type { CompanyStatusValue } from './company.response'

export interface CreateCompanyDto {
  /** 회사 이름 */
  name: string
  /** 약칭/티커 (예: EIC, GE) */
  shortName?: string
  /** 현지어/원어 명칭 */
  localName?: string
  /** 회사 설명 */
  description?: string
  /** 상태 (미지정 시 ACTIVE) */
  status?: CompanyStatusValue
  /** 설립일 (ISO 8601) */
  foundedAt?: string
  /** 해산/폐업일 (ISO 8601) */
  dissolvedAt?: string
  /** 공식 웹사이트 */
  websiteUrl?: string
  /** 로고 URL */
  logoUrl?: string
  /** 자유 확장 필드 */
  extra?: unknown

  //--- 외래키 (선택)
  /** 창립자 인물 ID */
  founderId?: string
  /** 현대 국가 소속 ID */
  countryId?: string
  /** 역사적 국가 소속 ID */
  historicalCountryId?: string
  /** 본사 위치 도시 ID */
  headquartersCityId?: string
  /** 동일 실체의 조직 ID (1:1) */
  organizationId?: string
}
