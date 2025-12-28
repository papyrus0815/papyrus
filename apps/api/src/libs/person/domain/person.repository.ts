import { Person } from '@prisma/client'

/**
 * 인물 생성 데이터
 */
export interface CreatePersonData {
  name: string
  surname?: string
  birthDate?: Date
  deathDate?: Date
  gender?: string
  biography?: string
  profileImageUrl?: string
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
  surname?: string
  birthDate?: Date
  deathDate?: Date
  gender?: string
  biography?: string
  profileImageUrl?: string
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
}
