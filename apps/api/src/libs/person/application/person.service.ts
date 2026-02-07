import { Injectable, NotFoundException } from '@nestjs/common'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'
import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'
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
  PersonResponseDto,
  MilitaryCareerResponseDto,
  GovernmentCareerResponseDto,
  BusinessCareerResponseDto,
  AcademicCareerResponseDto,
  AthleteCareerResponseDto,
  ReligiousCareerResponseDto,
  ArtistCareerResponseDto,
  MediaCareerResponseDto,
  LegalCareerResponseDto,
  MedicalCareerResponseDto,
  PersonEducationResponseDto,
  PersonAwardResponseDto,
  AllCareersResponseDto,
} from '../presentation/dto'

/**
 * 인물 도메인 서비스
 */
@Injectable()
export class PersonService {
  constructor(private readonly personRepository: PersonPrismaRepository) {}

  /**
   * 모든 인물 목록 조회
   */
  async findAll(): Promise<PersonResponseDto[]> {
    return this.personRepository.findAll()
  }

  /**
   * 모든 인물 목록 조회 (정부 직책 포함)
   */
  async findAllWithGovernmentPositions() {
    return this.personRepository.findAllWithGovernmentPositions()
  }

  /**
   * ID로 인물 조회
   */
  async findById(id: string): Promise<PersonResponseDto> {
    const person = await this.personRepository.findById(id)
    if (!person) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return person
  }

  /**
   * ID로 인물 상세 조회 (관계 데이터 포함)
   */
  async findByIdWithRelations(id: string) {
    const person = await this.personRepository.findByIdWithRelations(id)
    if (!person) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return person
  }

  /**
   * 인물 생성
   */
  async create(data: CreatePersonData): Promise<PersonResponseDto> {
    return this.personRepository.create(data)
  }

  /**
   * 인물 수정
   */
  async update(id: string, data: UpdatePersonData): Promise<PersonResponseDto> {
    await this.findById(id) // 존재 여부 확인
    return this.personRepository.update(id, data)
  }

  /**
   * 인물 삭제
   */
  async delete(id: string): Promise<void> {
    await this.findById(id) // 존재 여부 확인
    await this.personRepository.delete(id)
  }

  // ========================
  // Career 관리 메서드
  // ========================

  /**
   * 군인 경력 추가
   */
  async addMilitaryCareer(dto: CreateMilitaryCareerDto): Promise<MilitaryCareerResponseDto> {
    return this.personRepository.addMilitaryCareer(dto)
  }

  /**
   * 정치인/공무원 경력 추가
   */
  async addGovernmentCareer(dto: CreateGovernmentCareerDto): Promise<GovernmentCareerResponseDto> {
    return this.personRepository.addGovernmentCareer(dto)
  }

  /**
   * 기업인 경력 추가
   */
  async addBusinessCareer(dto: CreateBusinessCareerDto): Promise<BusinessCareerResponseDto> {
    return this.personRepository.addBusinessCareer(dto)
  }

  /**
   * 학자 경력 추가
   */
  async addAcademicCareer(dto: CreateAcademicCareerDto): Promise<AcademicCareerResponseDto> {
    return this.personRepository.addAcademicCareer(dto)
  }

  /**
   * 운동선수 경력 추가
   */
  async addAthleteCareer(dto: CreateAthleteCareerDto): Promise<AthleteCareerResponseDto> {
    return this.personRepository.addAthleteCareer(dto)
  }

  /**
   * 종교인 경력 추가
   */
  async addReligiousCareer(dto: CreateReligiousCareerDto): Promise<ReligiousCareerResponseDto> {
    return this.personRepository.addReligiousCareer(dto)
  }

  /**
   * 예술가 경력 추가
   */
  async addArtistCareer(dto: CreateArtistCareerDto): Promise<ArtistCareerResponseDto> {
    return this.personRepository.addArtistCareer(dto)
  }

  /**
   * 언론인 경력 추가
   */
  async addMediaCareer(dto: CreateMediaCareerDto): Promise<MediaCareerResponseDto> {
    return this.personRepository.addMediaCareer(dto)
  }

  /**
   * 법조인 경력 추가
   */
  async addLegalCareer(dto: CreateLegalCareerDto): Promise<LegalCareerResponseDto> {
    return this.personRepository.addLegalCareer(dto)
  }

  /**
   * 의료인 경력 추가
   */
  async addMedicalCareer(dto: CreateMedicalCareerDto): Promise<MedicalCareerResponseDto> {
    return this.personRepository.addMedicalCareer(dto)
  }

  /**
   * 학력 추가
   */
  async addEducation(dto: CreateEducationDto): Promise<PersonEducationResponseDto> {
    return this.personRepository.addEducation(dto)
  }

  /**
   * 수상/훈장 추가
   */
  async addAward(dto: CreatePersonAwardDto): Promise<PersonAwardResponseDto> {
    return this.personRepository.addAward(dto)
  }

  /**
   * 인물의 모든 경력 조회
   */
  async findAllCareers(personId: string): Promise<AllCareersResponseDto> {
    await this.findById(personId) // 존재 여부 확인
    return this.personRepository.findAllCareers(personId)
  }
}
