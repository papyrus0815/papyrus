import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AttachmentOwner, EventMethod, PersonHumanRelationshipType } from '@prisma/client'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'
import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'
import { NotificationService } from '../../notification/application/notification.service'
import { PrismaService } from '@prisma/prisma.service'
import { UploadService } from '../../shared/upload/upload.service'
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
  CreateSovereignReignDto,
  CreateGovernmentPositionDefinitionDto,
  CreateTenureAchievementDto,
  CreateRegnalEraDto,
  UpdateRegnalEraDto,
  UpdateTenureAchievementDto,
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
  CreatePersonHumanRelationshipDto,
  UpdatePersonHumanRelationshipDto,
} from '../presentation/dto'

/**
 * 인물 도메인 서비스
 */
/** 인물 표시명: 국가 `defaultNameDisplayOrder`, null·미설정은 DB 주석과 동일하게 동양식 (인물 nameDisplayOrder 미사용) */
function personDisplayName(p: {
  name?: string | null
  surname?: string | null
  country?: { defaultNameDisplayOrder?: string | null; isoCode?: string | null } | null
}): string {
  const name = p.name ?? ''
  const surname = p.surname ?? ''
  const d = p.country?.defaultNameDisplayOrder
  let order: 'western' | 'korean'
  if (d === 'western') order = 'western'
  else if (d === 'korean') order = 'korean'
  else order = 'korean'
  if (order === 'western') return [name, surname].filter(Boolean).join(' ').trim() || '이름 없음'
  return [surname, name].filter(Boolean).join(' ').trim() || '이름 없음'
}

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonPrismaRepository,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 인물 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findAll(accountId?: string): Promise<PersonResponseDto[]> {
    return this.personRepository.findAll(accountId)
  }

  /**
   * 국가별 인물 전체 조회 (해당 국가와 직접 연결된 인물만, accountId 무관)
   * - person.countryId = 해당 국가
   * - 해당 국가(또는 연결된 역사적 국가)에 재임 기록
   * - PersonCountryAffiliation으로 해당 국가 또는 연결된 역사적 국가 소속 (출생지·시민권·봉사국 등)
   */
  async findPersonsByCountry(countryId: string): Promise<PersonResponseDto[]> {
    const [byCountryId, byTenure, byAffiliation] = await Promise.all([
      this.personRepository.findPersonsByCountryId(countryId),
      this.personRepository.findPersonsWithTenureInCountry({ countryId }),
      this.personRepository.findPersonsByAffiliationInCountry(countryId),
    ])
    const byId = new Map<string, PersonResponseDto>()
    for (const p of byCountryId) byId.set(p.id, p)
    for (const p of byTenure) if (!byId.has(p.id)) byId.set(p.id, p)
    for (const p of byAffiliation) if (!byId.has(p.id)) byId.set(p.id, p)
    return Array.from(byId.values())
  }

  /**
   * 가문에 소속된 인물 목록 (person.dynastyId 일치, 출생년 오름차순·미상은 뒤)
   */
  async findPersonsByDynasty(dynastyId: string): Promise<PersonResponseDto[]> {
    const list = await this.personRepository.findPersonsByDynastyId(dynastyId)
    const rank = (y: number | null | undefined) =>
      y != null && Number.isFinite(y) ? y : Number.MAX_SAFE_INTEGER
    return [...list].sort((a, b) => {
      const d = rank(a.birthYear) - rank(b.birthYear)
      if (d !== 0) return d
      return (a.name || '').localeCompare(b.name || '', 'ko')
    })
  }

  /**
   * 대시보드용: 모든 현대 국가별 등록 인물 수 (국가 페이지 인물 합집합과 동일 기준)
   */
  async findModernCountryPersonCounts(): Promise<
    Array<{ countryId: string; count: number }>
  > {
    return this.personRepository.findModernCountryPersonCounts()
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
   * 인물 삭제 (accountId 있으면 소유자만 가능).
   * 첨부파일(Attachment) 및 프로필/경력/학력/수상 이미지 파일도 함께 삭제합니다.
   */
  async delete(id: string, accountId?: string): Promise<void> {
    const person = await this.personRepository.findById(id, accountId)
    if (!person) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 삭제할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }

    // 1) Attachment 테이블: PERSON 소유 첨부파일 조회 → 디스크 파일 삭제 → DB 레코드 삭제
    const attachments = await this.prisma.attachment.findMany({
      where: { ownerType: AttachmentOwner.PERSON, ownerId: id },
    })
    for (const att of attachments) {
      await this.uploadService.deleteFileByRelativePath(att.filePath)
    }
    if (attachments.length > 0) {
      await this.prisma.attachment.deleteMany({
        where: { ownerType: AttachmentOwner.PERSON, ownerId: id },
      })
    }

    // 2) 인물 관련 이미지 URL 수집 (프로필, 학력, 경력, 수상 등) 후 디스크 파일 삭제
    const personWithImages = await this.prisma.person.findUnique({
      where: { id },
      select: {
        profileImageUrl: true,
        profileImages: { select: { url: true } },
        educations: { select: { images: { select: { url: true } } } },
        militaryCareers: { select: { images: { select: { url: true } } } },
        businessCareers: { select: { images: { select: { url: true } } } },
        academicCareers: { select: { images: { select: { url: true } } } },
        religiousCareers: { select: { images: { select: { url: true } } } },
        artistCareers: { select: { images: { select: { url: true } } } },
        athleteCareers: { select: { images: { select: { url: true } } } },
        mediaCareers: { select: { images: { select: { url: true } } } },
        legalCareers: { select: { images: { select: { url: true } } } },
        medicalCareers: { select: { images: { select: { url: true } } } },
        awards: { select: { images: { select: { url: true } } } },
      },
    })
    if (personWithImages) {
      const urls: (string | null | undefined)[] = [
        personWithImages.profileImageUrl ?? undefined,
        ...(personWithImages.profileImages?.map((p) => p.url) ?? []),
        ...(personWithImages.educations?.flatMap((e) => e.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.militaryCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.businessCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.academicCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.religiousCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.artistCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.athleteCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.mediaCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.legalCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.medicalCareers?.flatMap((c) => c.images?.map((i) => i.url) ?? []) ?? []),
        ...(personWithImages.awards?.flatMap((a) => a.images?.map((i) => i.url) ?? []) ?? []),
      ]
      for (const url of urls) {
        await this.uploadService.deleteFileByUrl(url)
      }
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
   * 국가원수/왕위 재임 기록 추가.
   * 정부 수반·국가 원수 재임(HEAD_OF_STATE/HEAD_OF_GOVERNMENT)은 기본적으로 행정부(Cabinet)를 자동 생성.
   * 군주 재위만 기록할 때는 addSovereignReign을 사용합니다.
   * @param accountId 로그인 계정 ID — 계정별 행정부·각료 구분용
   */
  async addGovernmentPositionTenure(dto: CreateGovernmentPositionTenureDto, accountId?: string): Promise<any> {
    const tenure = await this.personRepository.addGovernmentPositionTenure(dto, accountId)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenure?.title ?? '재임'}` : (tenure?.title ?? '재임 기록')
    await this.notificationService.notifyTenure(label, EventMethod.CREATE, tenure?.personId ?? tenure?.id, tenure?.startDate ? String(tenure.startDate) : undefined)
    if (
      tenure &&
      (dto.positionType === 'HEAD_OF_STATE' || dto.positionType === 'HEAD_OF_GOVERNMENT')
    ) {
      const existing = await this.personRepository.findCabinetByHeadTenureId(tenure.id)
      if (!existing) {
        await this.personRepository.createCabinet({ headTenureId: tenure.id }, accountId)
      }
    }
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

  /** 군주·재위 전용 기록 추가 (SovereignReign — 행정부와 별도 테이블) */
  async addSovereignReign(dto: CreateSovereignReignDto, accountId?: string): Promise<any> {
    const row = await this.personRepository.addSovereignReign(dto, accountId)
    const person = row?.person
    const label = person ? `${personDisplayName(person)} - 재위` : '재위 기록'
    await this.notificationService.notifyTenure(
      label,
      EventMethod.CREATE,
      row?.personId ?? row?.id,
      row?.startDate ? String(row.startDate) : undefined,
    )
    return row
  }

  async updateSovereignReign(id: string, dto: Partial<CreateSovereignReignDto>): Promise<any> {
    const row = await this.personRepository.updateSovereignReign(id, dto)
    const person = row?.person
    const label = person ? `${personDisplayName(person)} - 재위` : '재위 기록'
    await this.notificationService.notifyTenure(
      label,
      EventMethod.UPDATE,
      row?.personId ?? row?.id,
      row?.startDate ? String(row.startDate) : undefined,
    )
    return row
  }

  async deleteSovereignReign(id: string): Promise<void> {
    const row = await this.personRepository.findSovereignReignById(id)
    if (!row) {
      throw new NotFoundException('재위 기록을 찾을 수 없습니다.')
    }
    const person = row?.person
    const label = person ? `${personDisplayName(person)} - 재위` : '재위 기록'
    await this.personRepository.deleteSovereignReign(id)
    await this.notificationService.notifyTenure(label, EventMethod.DELETE, row?.personId)
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
   * 인물이 후보로 등록된 선거 후보 목록 — 재임에 당선 선거 연결용
   */
  async findElectionCandidaciesForTenureLink(personId: string): Promise<any[]> {
    return this.personRepository.findElectionCandidaciesForTenureLink(personId)
  }

  /**
   * 전역 수반(교황 등) 재임 기록 조회 — 국가에 속하지 않는 직책
   */
  async findGlobalTenures(): Promise<any[]> {
    return this.personRepository.findGlobalTenures()
  }

  /**
   * 특정 수반 재임 하의 각료 목록 (행정부 한눈에 보기) — headTenureId로 Cabinet 조회 후 멤버 반환
   */
  async findSubordinateTenures(headTenureId: string): Promise<any[]> {
    return this.personRepository.findSubordinateTenures(headTenureId)
  }

  async findCabinetByHeadTenureId(headTenureId: string): Promise<any | null> {
    return this.personRepository.findCabinetByHeadTenureId(headTenureId)
  }

  async findTenuresByCabinetId(cabinetId: string, accountId?: string): Promise<any[]> {
    return this.personRepository.findTenuresByCabinetId(cabinetId, accountId)
  }

  async findCabinets(params: { countryId?: string; historicalCountryId?: string }): Promise<any[]> {
    return this.personRepository.findCabinets(params)
  }

  async createCabinet(dto: {
    headTenureId: string
    name?: string | null
  }, accountId?: string): Promise<any> {
    const head = await this.personRepository.findTenureById(dto.headTenureId)
    if (!head) {
      throw new NotFoundException('수반 재임을 찾을 수 없습니다.')
    }
    return this.personRepository.createCabinet(dto, accountId)
  }

  async updateCabinet(
    cabinetId: string,
    dto: { name?: string | null },
    accountId?: string,
  ): Promise<any> {
    return this.personRepository.updateCabinet(cabinetId, dto, accountId)
  }

  async deleteCabinet(cabinetId: string, accountId?: string): Promise<void> {
    return this.personRepository.deleteCabinet(cabinetId, accountId)
  }

  async linkCabinetWithOther(
    cabinetId: string,
    otherCabinetId: string,
    accountId: string,
    eventId?: string | null,
  ): Promise<any> {
    try {
      return await this.personRepository.linkCabinetWithOther(
        cabinetId,
        otherCabinetId,
        accountId,
        eventId,
      )
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? '행정부 묶기에 실패했습니다.')
    }
  }

  async findCabinetsByLinkageEventId(eventId: string): Promise<any[]> {
    return this.personRepository.findCabinetsByLinkageEventId(eventId)
  }

  async leaveCabinetLinkageGroup(cabinetId: string, accountId: string): Promise<void> {
    return this.personRepository.leaveCabinetLinkageGroup(cabinetId, accountId)
  }

  async findLinkedCabinets(cabinetId: string, accountId: string): Promise<any[]> {
    return this.personRepository.findLinkedCabinets(cabinetId, accountId)
  }

  async searchCabinetsForLinkage(
    accountId: string,
    q: string,
    excludeCabinetId: string,
    limit?: number,
    filter?: { countryId?: string; historicalCountryId?: string },
  ): Promise<any[]> {
    return this.personRepository.searchCabinetsForLinkage(
      accountId,
      q,
      excludeCabinetId,
      limit,
      filter,
    )
  }

  /**
   * 조직(만철, 관동군, 대만총독부 등) 역대 수장
   */
  async findTenuresByOrganizationId(organizationId: string): Promise<any[]> {
    return this.personRepository.findTenuresByOrganizationId(organizationId)
  }

  /**
   * 재임 업적·한일 추가 (사건과 별도)
   */
  async createTenureAchievement(
    tenureId: string,
    dto: CreateTenureAchievementDto,
  ): Promise<any> {
    return this.personRepository.createTenureAchievement(tenureId, dto)
  }

  /**
   * 사건 페이지에 표시할 업적 목록
   */
  async findTenureAchievementsByEventId(eventId: string): Promise<any[]> {
    return this.personRepository.findTenureAchievementsByEventId(eventId)
  }

  async findAchievementsForEventsPage(): Promise<any[]> {
    return this.personRepository.findAchievementsForEventsPage()
  }

  /**
   * 재임 업적 수정
   */
  async updateTenureAchievement(
    tenureId: string,
    achievementId: string,
    dto: UpdateTenureAchievementDto,
  ): Promise<any> {
    return this.personRepository.updateTenureAchievement(tenureId, achievementId, dto)
  }

  /**
   * 재임 업적 삭제
   */
  async deleteTenureAchievement(tenureId: string, achievementId: string): Promise<void> {
    return this.personRepository.deleteTenureAchievement(tenureId, achievementId)
  }

  async createSovereignReignAchievement(
    sovereignReignId: string,
    dto: CreateTenureAchievementDto,
  ): Promise<any> {
    return this.personRepository.createSovereignReignAchievement(sovereignReignId, dto)
  }

  async updateSovereignReignAchievement(
    sovereignReignId: string,
    achievementId: string,
    dto: UpdateTenureAchievementDto,
  ): Promise<any> {
    return this.personRepository.updateSovereignReignAchievement(
      sovereignReignId,
      achievementId,
      dto,
    )
  }

  async deleteSovereignReignAchievement(
    sovereignReignId: string,
    achievementId: string,
  ): Promise<void> {
    return this.personRepository.deleteSovereignReignAchievement(sovereignReignId, achievementId)
  }

  async createRegnalEra(tenureId: string, dto: CreateRegnalEraDto): Promise<any> {
    try {
      return await this.personRepository.createRegnalEra({ tenureId }, dto)
    } catch (e: any) {
      if (e?.message === 'GovernmentPositionTenure not found') {
        throw new NotFoundException('재임을 찾을 수 없습니다.')
      }
      throw e
    }
  }

  async createRegnalEraForSovereignReign(sovereignReignId: string, dto: CreateRegnalEraDto): Promise<any> {
    try {
      return await this.personRepository.createRegnalEra({ sovereignReignId }, dto)
    } catch (e: any) {
      if (e?.message === 'SovereignReign not found') {
        throw new NotFoundException('재위 기록을 찾을 수 없습니다.')
      }
      throw e
    }
  }

  async updateRegnalEra(id: string, dto: UpdateRegnalEraDto): Promise<any> {
    try {
      return await this.personRepository.updateRegnalEra(id, dto)
    } catch (e: any) {
      if (e?.message === 'RegnalEra not found') {
        throw new NotFoundException('연호·시대 정보를 찾을 수 없습니다.')
      }
      throw e
    }
  }

  async deleteRegnalEra(id: string): Promise<void> {
    try {
      await this.personRepository.deleteRegnalEra(id)
    } catch (e: any) {
      if (e?.code === 'P2025' || /not found/i.test(String(e?.message))) {
        throw new NotFoundException('연호·시대 정보를 찾을 수 없습니다.')
      }
      throw e
    }
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

  private mapHumanRelationshipRow(
    rel: {
      id: string
      relationshipType: PersonHumanRelationshipType
      affinityLevel: number
      startDate: Date | null
      endDate: Date | null
      note: string | null
      fromPersonId: string
      toPersonId: string
      fromPerson: { id: string; name: string; surname: string | null; nameDisplayOrder: string | null; birthDate: Date | null; deathDate: Date | null }
      toPerson: { id: string; name: string; surname: string | null; nameDisplayOrder: string | null; birthDate: Date | null; deathDate: Date | null }
    },
    subjectPersonId: string,
  ) {
    const other = rel.fromPersonId === subjectPersonId ? rel.toPerson : rel.fromPerson
    const mentorPerspective =
      rel.relationshipType === PersonHumanRelationshipType.MENTOR
        ? rel.fromPersonId === subjectPersonId
          ? ('MENTOR' as const)
          : ('STUDENT' as const)
        : null
    return {
      id: rel.id,
      relationshipType: rel.relationshipType,
      affinityLevel: rel.affinityLevel,
      startDate: rel.startDate?.toISOString() ?? null,
      endDate: rel.endDate?.toISOString() ?? null,
      note: rel.note,
      fromPersonId: rel.fromPersonId,
      toPersonId: rel.toPersonId,
      otherPerson: this.serializePersonBrief(other),
      mentorPerspective,
    }
  }

  private serializePersonBrief(p: {
    id: string
    name: string
    surname: string | null
    nameDisplayOrder: string | null
    birthDate: Date | null
    deathDate: Date | null
  }) {
    return {
      id: p.id,
      name: p.name,
      surname: p.surname,
      nameDisplayOrder: p.nameDisplayOrder,
      birthDate: p.birthDate?.toISOString() ?? null,
      deathDate: p.deathDate?.toISOString() ?? null,
    }
  }

  /**
   * 인물이 참여한 인간관계 목록 (from/to 모두 조회)
   */
  async findHumanRelationships(personId: string, accountId?: string) {
    await this.findById(personId, accountId)
    const rows = await this.prisma.personHumanRelationship.findMany({
      where: {
        OR: [{ fromPersonId: personId }, { toPersonId: personId }],
      },
      include: {
        fromPerson: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
          },
        },
        toPerson: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map((r) => this.mapHumanRelationshipRow(r, personId))
  }

  private async resolveHumanRelationshipEndpoints(
    subjectPersonId: string,
    relatedPersonId: string,
    relationshipType: PersonHumanRelationshipType,
    subjectIsMentor: boolean | undefined,
  ): Promise<{ fromPersonId: string; toPersonId: string }> {
    if (subjectPersonId === relatedPersonId) {
      throw new BadRequestException('같은 인물끼리는 관계를 설정할 수 없습니다.')
    }
    if (relationshipType === PersonHumanRelationshipType.MENTOR) {
      const mentorFirst = subjectIsMentor !== false
      return mentorFirst
        ? { fromPersonId: subjectPersonId, toPersonId: relatedPersonId }
        : { fromPersonId: relatedPersonId, toPersonId: subjectPersonId }
    }
    // GENERAL: 방향 없음 — UUID 문자열 오름차순으로 정규화
    const [a, b] =
      subjectPersonId < relatedPersonId
        ? [subjectPersonId, relatedPersonId]
        : [relatedPersonId, subjectPersonId]
    return { fromPersonId: a, toPersonId: b }
  }

  async createHumanRelationship(
    subjectPersonId: string,
    dto: CreatePersonHumanRelationshipDto,
    accountId?: string,
  ) {
    await this.findById(subjectPersonId, accountId)
    await this.findById(dto.relatedPersonId, accountId)
    const { fromPersonId, toPersonId } = await this.resolveHumanRelationshipEndpoints(
      subjectPersonId,
      dto.relatedPersonId,
      dto.relationshipType,
      dto.subjectIsMentor,
    )
    try {
      const created = await this.prisma.personHumanRelationship.create({
        data: {
          fromPersonId,
          toPersonId,
          relationshipType: dto.relationshipType,
          affinityLevel: dto.affinityLevel,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          note: dto.note ?? null,
        },
        include: {
          fromPerson: {
            select: {
              id: true,
              name: true,
              surname: true,
              nameDisplayOrder: true,
              birthDate: true,
              deathDate: true,
            },
          },
          toPerson: {
            select: {
              id: true,
              name: true,
              surname: true,
              nameDisplayOrder: true,
              birthDate: true,
              deathDate: true,
            },
          },
        },
      })
      return this.mapHumanRelationshipRow(created, subjectPersonId)
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined
      if (code === 'P2002') {
        throw new BadRequestException('이미 같은 유형의 관계가 있습니다.')
      }
      throw e
    }
  }

  async updateHumanRelationship(
    subjectPersonId: string,
    relationshipId: string,
    dto: UpdatePersonHumanRelationshipDto,
    accountId?: string,
  ) {
    await this.findById(subjectPersonId, accountId)
    const existing = await this.prisma.personHumanRelationship.findUnique({
      where: { id: relationshipId },
      include: {
        fromPerson: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
          },
        },
        toPerson: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
          },
        },
      },
    })
    if (!existing) {
      throw new NotFoundException(`인간관계를 찾을 수 없습니다 (ID: ${relationshipId})`)
    }
    if (existing.fromPersonId !== subjectPersonId && existing.toPersonId !== subjectPersonId) {
      throw new ForbiddenException('이 인물과 연결된 관계만 수정할 수 있습니다.')
    }
    const relatedId =
      existing.fromPersonId === subjectPersonId ? existing.toPersonId : existing.fromPersonId
    const nextType = dto.relationshipType ?? existing.relationshipType
    const { fromPersonId, toPersonId } = await this.resolveHumanRelationshipEndpoints(
      subjectPersonId,
      relatedId,
      nextType,
      dto.subjectIsMentor ?? (nextType === PersonHumanRelationshipType.MENTOR
        ? existing.fromPersonId === subjectPersonId
        : undefined),
    )
    try {
      const updated = await this.prisma.personHumanRelationship.update({
        where: { id: relationshipId },
        data: {
          fromPersonId,
          toPersonId,
          relationshipType: dto.relationshipType ?? undefined,
          affinityLevel: dto.affinityLevel ?? undefined,
          startDate:
            dto.startDate === undefined ? undefined : dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
          note: dto.note === undefined ? undefined : dto.note,
        },
        include: {
          fromPerson: {
            select: {
              id: true,
              name: true,
              surname: true,
              nameDisplayOrder: true,
              birthDate: true,
              deathDate: true,
            },
          },
          toPerson: {
            select: {
              id: true,
              name: true,
              surname: true,
              nameDisplayOrder: true,
              birthDate: true,
              deathDate: true,
            },
          },
        },
      })
      return this.mapHumanRelationshipRow(updated, subjectPersonId)
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined
      if (code === 'P2002') {
        throw new BadRequestException('같은 쌍·유형의 관계가 이미 있습니다.')
      }
      throw e
    }
  }

  async deleteHumanRelationship(subjectPersonId: string, relationshipId: string, accountId?: string) {
    await this.findById(subjectPersonId, accountId)
    const existing = await this.prisma.personHumanRelationship.findUnique({
      where: { id: relationshipId },
    })
    if (!existing) {
      throw new NotFoundException(`인간관계를 찾을 수 없습니다 (ID: ${relationshipId})`)
    }
    if (existing.fromPersonId !== subjectPersonId && existing.toPersonId !== subjectPersonId) {
      throw new ForbiddenException('이 인물과 연결된 관계만 삭제할 수 있습니다.')
    }
    await this.prisma.personHumanRelationship.delete({ where: { id: relationshipId } })
  }
}
