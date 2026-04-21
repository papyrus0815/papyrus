import { Era, DeathType } from './create-person.dto'

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
  // 관계
  dynastyId: string | null
  /** 가문 (목록/재임 응답에서 노출, id·name만) */
  dynasty?: { id: string; name: string } | null
  religionId: string | null
  religion?: { id: string; name: string } | null
  denominationId: string | null
  denomination?: { id: string; name: string } | null
  fatherId: string | null
  motherId: string | null
  countryId: string | null
  /** 소속 국가 (목록 표시용, id·name·flagEmoji·이름 표시 기본) */
  country?: {
    id: string
    name: string
    flagEmoji?: string | null
    isoCode?: string | null
    defaultNameDisplayOrder?: string | null
  } | null
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
  /** 사망 유형 */
  deathType?: DeathType | null
  /** 사망 원인 상세 */
  deathCause?: string | null
  /** 사망 관련 메모 */
  deathNote?: string | null
  /** 생존 여부 */
  isAlive?: boolean
  /** 역사적 영향력 (0–100) */
  influence?: number | null
  // 정부 직위 재임 기록
  governmentTenures?: any[]
  /** 군주·재위 전용 기록 (SovereignReign — 행정부 재임과 별도 테이블) */
  sovereignReigns?: any[]
  createdAt: string
  updatedAt: string
  /** 등록 계정 ID (소유권 검사용, 선택 노출) */
  accountId?: string | null
}
