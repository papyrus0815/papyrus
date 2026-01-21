import { 
  Person,
  MilitaryCareer,
  GovernmentCareer,
  BusinessCareer,
  AcademicCareer,
  AthleteCareer,
  ReligiousCareer,
  ArtistCareer,
  MediaCareer,
  LegalCareer,
  MedicalCareer,
  PersonEducation,
  PersonAward,
} from '@prisma/client'
import {
  CreateMilitaryCareerDto,
  CreateGovernmentCareerDto,
  CreateBusinessCareerDto,
  CreateAcademicCareerDto,
  CreateAthleteCareerDto,
  CreateReligiousCareerDto,
  CreateArtistCareerDto,
  CreateMediaCareerDto,
  CreateLegalCareerDto,
  CreateMedicalCareerDto,
  CreateEducationDto,
  CreatePersonAwardDto,
} from '../presentation/dto'

/**
 * 인물 생성 데이터
 */
export interface CreatePersonData {
  name: string
  middleName?: string
  surname?: string
  originalName?: string
  birthDate?: Date
  deathDate?: Date
  isBirthDateUnknown?: boolean
  isDeathDateUnknown?: boolean
  isAlive?: boolean
  gender?: string
  biography?: string
  profileImageUrl?: string
  showLifespanOnEventList?: boolean
  dynastyId?: string
  religionId?: string
  denominationId?: string
  fatherId?: string
  motherId?: string
  jobId?: string
  countryId?: string
}

/**
 * 인물 수정 데이터
 */
export interface UpdatePersonData {
  name?: string
  middleName?: string
  surname?: string
  originalName?: string
  birthDate?: Date
  deathDate?: Date
  isBirthDateUnknown?: boolean
  isDeathDateUnknown?: boolean
  isAlive?: boolean
  gender?: string
  biography?: string
  profileImageUrl?: string
  showLifespanOnEventList?: boolean
  dynastyId?: string
  religionId?: string
  denominationId?: string
  fatherId?: string
  motherId?: string
  jobId?: string
  countryId?: string
}

/**
 * 모든 경력 조회 응답 타입
 */
export interface AllCareersResponse {
  military: MilitaryCareer[]
  government: GovernmentCareer[]
  business: BusinessCareer[]
  academic: AcademicCareer[]
  athlete: AthleteCareer[]
  religious: ReligiousCareer[]
  artist: ArtistCareer[]
  media: MediaCareer[]
  legal: LegalCareer[]
  medical: MedicalCareer[]
  education: PersonEducation[]
  awards: PersonAward[]
}

/**
 * 인물 Repository 인터페이스
 */
export interface IPersonRepository {
  /**
   * 모든 인물 목록 조회
   */
  findAll(): Promise<Person[]>

  /**
   * ID로 인물 조회
   */
  findById(id: string): Promise<Person | null>

  /**
   * 인물 생성
   */
  create(data: CreatePersonData): Promise<Person>

  /**
   * 인물 수정
   */
  update(id: string, data: UpdatePersonData): Promise<Person>

  /**
   * 인물 삭제
   */
  delete(id: string): Promise<void>

  // Career 관리
  addMilitaryCareer(dto: CreateMilitaryCareerDto): Promise<MilitaryCareer>
  addGovernmentCareer(dto: CreateGovernmentCareerDto): Promise<GovernmentCareer>
  addBusinessCareer(dto: CreateBusinessCareerDto): Promise<BusinessCareer>
  addAcademicCareer(dto: CreateAcademicCareerDto): Promise<AcademicCareer>
  addAthleteCareer(dto: CreateAthleteCareerDto): Promise<AthleteCareer>
  addReligiousCareer(dto: CreateReligiousCareerDto): Promise<ReligiousCareer>
  addArtistCareer(dto: CreateArtistCareerDto): Promise<ArtistCareer>
  addMediaCareer(dto: CreateMediaCareerDto): Promise<MediaCareer>
  addLegalCareer(dto: CreateLegalCareerDto): Promise<LegalCareer>
  addMedicalCareer(dto: CreateMedicalCareerDto): Promise<MedicalCareer>
  addEducation(dto: CreateEducationDto): Promise<PersonEducation>
  addAward(dto: CreatePersonAwardDto): Promise<PersonAward>
  findAllCareers(personId: string): Promise<AllCareersResponse>
}
