/**
 * Career 응답 DTO
 * ⚠️ Prisma 타입을 extends하지 않고 필요한 필드만 명시
 */

/**
 * 군인 경력 응답 DTO
 */
export interface MilitaryCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  rankId: string
  jobCategoryId: string | null
  organizationId: string
  branch: string | null
  position: string | null
  termNumber: number | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 정치인/공무원 경력 응답 DTO
 */
export interface GovernmentCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string | null
  countryId: string
  department: string | null
  roleTitle: string | null
  termNumber: number | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 기업인 경력 응답 DTO
 */
export interface BusinessCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string
  title: string | null
  level: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 학자 경력 응답 DTO
 */
export interface AcademicCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string
  department: string | null
  researchField: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 운동선수 경력 응답 DTO
 */
export interface AthleteCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string | null
  sport: string | null
  position: string | null
  jerseyNumber: number | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 종교인 경력 응답 DTO
 */
export interface ReligiousCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string | null
  religionId: string
  denominationId: string | null
  title: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 예술가 경력 응답 DTO
 */
export interface ArtistCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string | null
  genre: string | null
  artField: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 언론인 경력 응답 DTO
 */
export interface MediaCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string
  department: string | null
  beat: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 법조인 경력 응답 DTO
 */
export interface LegalCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string | null
  specialization: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 의료인 경력 응답 DTO
 */
export interface MedicalCareerResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  showPositionInfo: boolean
  positionId: string
  jobCategoryId: string | null
  organizationId: string | null
  specialization: string | null
  department: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 학력 응답 DTO
 */
export interface PersonEducationResponseDto {
  id: string
  personId: string
  timelineTitle: string | null
  organizationId: string
  educationType: string | null
  classNumber: number | null
  degree: string | null
  major: string | null
  department: string | null
  status: string | null
  studentNumber: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 수상/훈장 응답 DTO
 */
export interface PersonAwardResponseDto {
  id: string
  personId: string
  awardName: string
  category: string | null
  awardingBody: string | null
  awardDate: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 모든 경력 조회 응답 DTO
 */
export interface AllCareersResponseDto {
  military: MilitaryCareerResponseDto[]
  government: GovernmentCareerResponseDto[]
  business: BusinessCareerResponseDto[]
  academic: AcademicCareerResponseDto[]
  athlete: AthleteCareerResponseDto[]
  religious: ReligiousCareerResponseDto[]
  artist: ArtistCareerResponseDto[]
  media: MediaCareerResponseDto[]
  legal: LegalCareerResponseDto[]
  medical: MedicalCareerResponseDto[]
  education: PersonEducationResponseDto[]
  awards: PersonAwardResponseDto[]
}
