import { Era } from './create-person.dto'

/**
 * 인물 응답 DTO
 */
export interface PersonResponseDto {
  id: string
  name: string
  surname: string | null
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
  dynastyId: string | null
  religionId: string | null
  denominationId: string | null
  fatherId: string | null
  motherId: string | null
  jobId: string | null
  countryId: string | null
  createdAt: string
  updatedAt: string
}
