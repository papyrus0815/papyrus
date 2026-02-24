import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EventMethod } from '@prisma/client'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'
import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'
import { NotificationService } from '../../notification/application/notification.service'
import {
  CreateMilitaryCareerDto,
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
  CreateGovernmentPositionTenureDto,
  CreateGovernmentPositionDefinitionDto,
  UpdateGovernmentPositionDefinitionDto,
  PersonResponseDto,
  MilitaryCareerResponseDto,
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
/** 인물 표시명 (한국/서양 순서) */
function personDisplayName(p: { name?: string | null; surname?: string | null; nameDisplayOrder?: string | null }): string {
  const name = p.name ?? ''
  const surname = p.surname ?? ''
  const order = (p.nameDisplayOrder as string) ?? 'korean'
  if (order === 'western') return [surname, name].filter(Boolean).join(' ').trim() || '이름 없음'
  return [name, surname].filter(Boolean).join(' ').trim() || '이름 없음'
}

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonPrismaRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 인물 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findAll(accountId?: string): Promise<PersonResponseDto[]> {
    return this.personRepository.findAll(accountId)
  }

  /**
   * 해당 국가(또는 연결된 역사적 국가)에 재임이 있는 인물만 조회
   */
  async findPersonsWithTenureInCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<PersonResponseDto[]> {
    return this.personRepository.findPersonsWithTenureInCountry(params)
  }

  /**
   * 인물 목록 조회 (정부 직책 포함, accountId 있으면 해당 계정 소유만)
   */
  async findAllWithGovernmentPositions(accountId?: string) {
    return this.personRepository.findAllWithGovernmentPositions(accountId)
  }

  /**
   * ID로 인물 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findById(id: string, accountId?: string): Promise<PersonResponseDto> {
    const person = await this.personRepository.findById(id, accountId)
    if (!person) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return person
  }

  /**
   * ID로 인물 상세 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findByIdWithRelations(id: string, accountId?: string) {
    const person = await this.personRepository.findByIdWithRelations(id, accountId)
    if (!person) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return person
  }

  /**
   * 인물 생성 (accountId 있으면 소유자로 저장)
   */
  async create(data: CreatePersonData, accountId?: string): Promise<PersonResponseDto> {
    const createData = accountId != null ? { ...data, accountId } : data
    const person = await this.personRepository.create(createData)
    await this.notificationService.notifyPerson(
      personDisplayName(person),
      EventMethod.CREATE,
      person.id,
    )
    return person
  }

  /**
   * 인물 수정 (accountId 있으면 소유자만 가능)
   */
  async update(id: string, data: UpdatePersonData, accountId?: string): Promise<PersonResponseDto> {
    const existing = await this.personRepository.findById(id, accountId)
    if (!existing) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 수정할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    const person = await this.personRepository.update(id, data)
    await this.notificationService.notifyPerson(
      personDisplayName(person),
      EventMethod.UPDATE,
      person.id,
    )
    return person
  }

  /**
   * 인물 삭제 (accountId 있으면 소유자만 가능)
   */
  async delete(id: string, accountId?: string): Promise<void> {
    const person = await this.personRepository.findById(id, accountId)
    if (!person) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 삭제할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    await this.personRepository.delete(id)
    await this.notificationService.notifyPerson(
      personDisplayName(person),
      EventMethod.DELETE,
    )
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
   * 국가원수/왕위 재임 기록 추가
   */
  async addGovernmentPositionTenure(dto: CreateGovernmentPositionTenureDto): Promise<any> {
    const tenure = await this.personRepository.addGovernmentPositionTenure(dto)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenure?.title ?? '재임'}` : (tenure?.title ?? '재임 기록')
    await this.notificationService.notifyTenure(label, EventMethod.CREATE, tenure?.personId ?? tenure?.id, tenure?.startDate ? String(tenure.startDate) : undefined)
    return tenure
  }

  /**
   * 국가원수/왕위 재임 기록 수정
   */
  async updateGovernmentPositionTenure(id: string, dto: Partial<CreateGovernmentPositionTenureDto>): Promise<any> {
    const tenure = await this.personRepository.updateGovernmentPositionTenure(id, dto)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenure?.title ?? '재임'}` : (tenure?.title ?? '재임 기록')
    await this.notificationService.notifyTenure(label, EventMethod.UPDATE, tenure?.personId ?? tenure?.id, tenure?.startDate ? String(tenure.startDate) : undefined)
    return tenure
  }

  /**
   * 국가원수/왕위 재임 기록 삭제
   */
  async deleteGovernmentPositionTenure(id: string): Promise<void> {
    const tenure = await this.personRepository.findTenureById(id)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenure?.title ?? '재임'}` : (tenure?.title ?? '재임 기록')
    await this.personRepository.deleteGovernmentPositionTenure(id)
    await this.notificationService.notifyTenure(label, EventMethod.DELETE, tenure?.personId)
  }

  /**
   * 인물의 재임 기록만 조회 (수정 페이지 경력 로딩용)
   */
  async findTenuresByPersonId(personId: string): Promise<any[]> {
    return this.personRepository.findTenuresByPersonId(personId)
  }

  /**
   * 국가 또는 역사적 국가별 재임 기록 조회 (연대표 국가 페이지 수장 목록용)
   */
  async findTenuresByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    return this.personRepository.findTenuresByCountry(params)
  }

  /**
   * 관직 정의 목록 조회
   */
  async findPositionDefinitions(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    return this.personRepository.findPositionDefinitions(params)
  }

  /**
   * 관직 정의 단건 조회
   */
  async findPositionDefinitionById(id: string): Promise<any> {
    const def = await this.personRepository.findPositionDefinitionById(id)
    if (!def) {
      throw new NotFoundException(`관직 정의를 찾을 수 없습니다 (ID: ${id})`)
    }
    return def
  }

  /**
   * 관직 정의 생성
   */
  async createPositionDefinition(
    dto: CreateGovernmentPositionDefinitionDto,
  ): Promise<any> {
    return this.personRepository.createPositionDefinition(dto)
  }

  /**
   * 관직 정의 수정
   */
  async updatePositionDefinition(
    id: string,
    dto: UpdateGovernmentPositionDefinitionDto,
  ): Promise<any> {
    await this.findPositionDefinitionById(id)
    return this.personRepository.updatePositionDefinition(id, dto)
  }

  /**
   * 관직 정의 삭제
   */
  async deletePositionDefinition(id: string): Promise<void> {
    await this.findPositionDefinitionById(id)
    return this.personRepository.deletePositionDefinition(id)
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
