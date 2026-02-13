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
  religionId: string | null
  denominationId: string | null
  fatherId: string | null
  motherId: string | null
  jobId: string | null
  countryId: string | null
  birthCityId: string | null
  deathCityId: string | null
  // 이벤트 목록에 생몰년 표시 여부
  showLifespanOnEventList?: boolean
  // 정부 직위 재임 기록
  governmentTenures?: any[]
  createdAt: string
  updatedAt: string
}
