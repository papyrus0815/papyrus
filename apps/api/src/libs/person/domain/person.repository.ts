import {
  AcademicCareerResponseDto,
  AllCareersResponseDto,
  ArtistCareerResponseDto,
  AthleteCareerResponseDto,
  BusinessCareerResponseDto,
  CreateAcademicCareerDto,
  CreateArtistCareerDto,
  CreateAthleteCareerDto,
  CreateBusinessCareerDto,
  CreateEducationDto,
  CreateGovernmentPositionTenureDto,
  CreateGovernmentPositionDefinitionDto,
  UpdateGovernmentPositionDefinitionDto,
  CreateLegalCareerDto,
  CreateMediaCareerDto,
  CreateMedicalCareerDto,
  CreateMilitaryCareerDto,
  CreatePersonAwardDto,
  CreateReligiousCareerDto,
  LegalCareerResponseDto,
  MediaCareerResponseDto,
  MedicalCareerResponseDto,
  MilitaryCareerResponseDto,
  PersonAwardResponseDto,
  PersonEducationResponseDto,
  PersonResponseDto,
  ReligiousCareerResponseDto,
} from '../presentation/dto'

/**
 * 인물 생성 데이터
 */
export interface CreatePersonData {
  name: string
  middleName?: string
  surname?: string
  nameDisplayOrder?: 'korean' | 'western'
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  birthDate?: Date
  deathDate?: Date
  isBirthDateUnknown?: boolean
  isDeathDateUnknown?: boolean
  isAlive?: boolean
  gender?: string
  biography?: string
  profileImageUrl?: string
  showLifespanOnEventList?: boolean
  // 왕/군주 관련 필드
  regnalName?: string
  templeName?: string
  posthumousName?: string
  // 관계
  dynastyId?: string
  religionId?: string
  denominationId?: string
  fatherId?: string
  motherId?: string
  jobId?: string
  countryId?: string
  birthCityId?: string
  deathCityId?: string
  /** 등록 계정 ID (개인 정보 플랫폼) */
  accountId?: string
}

/**
 * 인물 수정 데이터
 */
export interface UpdatePersonData {
  name?: string
  middleName?: string
  surname?: string
  nameDisplayOrder?: 'korean' | 'western'
  originalName?: string | null
  surnameMeaning?: string | null
  nameMeaning?: string | null
  middleNameMeaning?: string | null
  birthDate?: Date
  deathDate?: Date
  isBirthDateUnknown?: boolean
  isDeathDateUnknown?: boolean
  isAlive?: boolean
  gender?: string
  biography?: string
  profileImageUrl?: string
  showLifespanOnEventList?: boolean
  // 왕/군주 관련 필드
  regnalName?: string
  templeName?: string
  posthumousName?: string
  // 관계
  dynastyId?: string
  religionId?: string
  denominationId?: string
  fatherId?: string
  motherId?: string
  jobId?: string
  countryId?: string
  birthCityId?: string
  deathCityId?: string
}

/**
 * 인물 Repository 인터페이스
 */
export interface IPersonRepository {
  /**
   * 인물 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  findAll(accountId?: string): Promise<PersonResponseDto[]>

  /**
   * ID로 인물 조회 (accountId 있으면 해당 계정 소유만 반환)
   */
  findById(id: string, accountId?: string): Promise<PersonResponseDto | null>

  /**
   * 인물 생성
   */
  create(data: CreatePersonData): Promise<PersonResponseDto>

  /**
   * 인물 수정
   */
  update(id: string, data: UpdatePersonData): Promise<PersonResponseDto>

  /**
   * 인물 삭제
   */
  delete(id: string): Promise<void>

  // Career 관리
  addMilitaryCareer(
    dto: CreateMilitaryCareerDto,
  ): Promise<MilitaryCareerResponseDto>
  addBusinessCareer(
    dto: CreateBusinessCareerDto,
  ): Promise<BusinessCareerResponseDto>
  addAcademicCareer(
    dto: CreateAcademicCareerDto,
  ): Promise<AcademicCareerResponseDto>
  addAthleteCareer(
    dto: CreateAthleteCareerDto,
  ): Promise<AthleteCareerResponseDto>
  addReligiousCareer(
    dto: CreateReligiousCareerDto,
  ): Promise<ReligiousCareerResponseDto>
  addArtistCareer(dto: CreateArtistCareerDto): Promise<ArtistCareerResponseDto>
  addMediaCareer(dto: CreateMediaCareerDto): Promise<MediaCareerResponseDto>
  addLegalCareer(dto: CreateLegalCareerDto): Promise<LegalCareerResponseDto>
  addMedicalCareer(
    dto: CreateMedicalCareerDto,
  ): Promise<MedicalCareerResponseDto>
  addGovernmentPositionTenure(
    dto: CreateGovernmentPositionTenureDto,
  ): Promise<any>
  updateGovernmentPositionTenure(
    id: string,
    dto: Partial<CreateGovernmentPositionTenureDto>,
  ): Promise<any>
  deleteGovernmentPositionTenure(id: string): Promise<void>
  findTenureById(id: string): Promise<any | null>
  findTenuresByPersonId(personId: string): Promise<any[]>
  findTenuresByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]>
  /**
   * 해당 국가(또는 연결된 역사적 국가)에 재임 기록이 있는 인물만 조회 (역대 수반 인물 선택용)
   */
  findPersonsWithTenureInCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<PersonResponseDto[]>
  findByIdWithRelations(id: string, accountId?: string): Promise<any>
  findPositionDefinitions(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]>
  findPositionDefinitionById(id: string): Promise<any | null>
  createPositionDefinition(dto: CreateGovernmentPositionDefinitionDto): Promise<any>
  updatePositionDefinition(id: string, dto: UpdateGovernmentPositionDefinitionDto): Promise<any>
  deletePositionDefinition(id: string): Promise<void>
  addEducation(dto: CreateEducationDto): Promise<PersonEducationResponseDto>
  addAward(dto: CreatePersonAwardDto): Promise<PersonAwardResponseDto>
  findAllCareers(personId: string): Promise<AllCareersResponseDto>
}
