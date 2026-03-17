import { Era } from './create-person.dto'

/**
 * 인물 응답 DTO
 */
export interface PersonResponseDto {
  id: string
  name: string
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  originalName: string | null
  surnameMeaning: string | null
  nameMeaning: string | null
  middleNameMeaning: string | null
  birthEra: Era | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
  deathEra: Era | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
  gender: string | null
  biography: string | null
  profileImageUrl: string | null
  // 왕/군주 관련 필드
  regnalName: string | null
  templeName: string | null
  posthumousName: string | null
  preEnthronementTitle: string | null
  // 관계
  dynastyId: string | null
  /** 가문 (목록/재임 응답에서 노출, id·name만) */
  dynasty?: { id: string; name: string } | null
  religionId: string | null
  denominationId: string | null
  fatherId: string | null
  motherId: string | null
  jobId: string | null
  /** 직업 (목록/상세 표시용, id·title) */
  job?: { id: string; title: string } | null
  countryId: string | null
  /** 소속 국가 (목록 표시용, id·name·flagEmoji) */
  country?: { id: string; name: string; flagEmoji?: string | null } | null
  birthCityId: string | null
  deathCityId: string | null
  /** 출생지 행정구역 ID */
  birthAdminDivisionId?: string | null
  /** 사망지 행정구역 ID */
  deathAdminDivisionId?: string | null
  /** 출생지 직접 입력 텍스트 */
  birthPlaceText?: string | null
  /** 사망지 직접 입력 텍스트 */
  deathPlaceText?: string | null
  /** 출생지 도시 정보 */
  birthCity?: { id: string; name: string } | null
  /** 사망지 도시 정보 */
  deathCity?: { id: string; name: string } | null
  /** 출생지 행정구역 정보 */
  birthAdminDivision?: { id: string; name: string } | null
  /** 사망지 행정구역 정보 */
  deathAdminDivision?: { id: string; name: string } | null
  // 이벤트 목록에 생몰년 표시 여부
  showLifespanOnEventList?: boolean
  /** 사망일 미상 여부 */
  isDeathDateUnknown?: boolean
  /** 생존 여부 */
  isAlive?: boolean
  // 정부 직위 재임 기록
  governmentTenures?: any[]
  createdAt: string
  updatedAt: string
  /** 등록 계정 ID (소유권 검사용, 선택 노출) */
  accountId?: string | null
}
