import { Person } from '@prisma/client'
import {
  CreateMilitaryCareerDto,
  CreateGovernmentCareerDto,
  CreateBusinessCareerDto,
  CreateAcademicCareerDto,
  CreateAthleteCareerDto,
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
  addMilitaryCareer(dto: CreateMilitaryCareerDto): Promise<any>
  addGovernmentCareer(dto: CreateGovernmentCareerDto): Promise<any>
  addBusinessCareer(dto: CreateBusinessCareerDto): Promise<any>
  addAcademicCareer(dto: CreateAcademicCareerDto): Promise<any>
  addAthleteCareer(dto: CreateAthleteCareerDto): Promise<any>
  addReligiousCareer(dto: any): Promise<any>
  addArtistCareer(dto: any): Promise<any>
  addMediaCareer(dto: any): Promise<any>
  addLegalCareer(dto: any): Promise<any>
  addMedicalCareer(dto: any): Promise<any>
  addEducation(dto: CreateEducationDto): Promise<any>
  addAward(dto: CreatePersonAwardDto): Promise<any>
  findAllCareers(personId: string): Promise<any>
}
