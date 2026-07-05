import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AggregateType, AttachmentOwner, EventMethod, NotificationSubResource, PersonHumanRelationshipType, PersonRelationshipTag, PersonTrait } from '@prisma/client'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'
import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'
import { NotificationService } from '../../notification/application/notification.service'
import { PointService } from '../../gamification/application/point.service'
import { completenessBonus } from '../../gamification/domain/point.policy'
import { PrismaService } from '@prisma/prisma.service'
import { UploadService } from '../../shared/upload/upload.service'
import { yearRangePreview } from '../../shared/notification-preview.util'
import { careerItemLabel, educationItemLabel, awardItemLabel } from '../domain/subresource-label.util'
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
  CreatePersonLifeEventDto,
  UpdatePersonLifeEventDto,
  UpdateRegnalEraDto,
  UpdateTenureAchievementDto,
  UpdateGovernmentPositionDefinitionDto,
  PersonResponseDto,
  FamilyTreeResponseDto,
  PersonInfographicItemDto,
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
  PersonStatsResponseDto,
  PersonTraitAssignmentDto,
  UpsertPersonStatsDto,
  UpsertPersonTraitsDto,
  UpsertPersonEvaluationDto,
  PersonEvaluationResponseDto,
} from '../presentation/dto'

/**
 * 인물 도메인 서비스
 */
/** 인물 표시명: 개인 nameDisplayOrder → 국가 defaultNameDisplayOrder → 동양식(기본). 프론트 getPersonDisplayName과 우선순위 일치 */
function personDisplayName(p: {
  name?: string | null
  surname?: string | null
  nameDisplayOrder?: string | null
  country?: { defaultNameDisplayOrder?: string | null; isoCode?: string | null } | null
}): string {
  const name = p.name ?? ''
  const surname = p.surname ?? ''
  const personOrder = p.nameDisplayOrder
  const countryOrder = p.country?.defaultNameDisplayOrder
  let order: 'western' | 'korean'
  if (personOrder === 'western' || personOrder === 'korean') order = personOrder
  else if (countryOrder === 'western') order = 'western'
  else if (countryOrder === 'korean') order = 'korean'
  else order = 'korean'
  if (order === 'western') return [name, surname].filter(Boolean).join(' ').trim() || '이름 없음'
  return [surname, name].filter(Boolean).join(' ').trim() || '이름 없음'
}

/** 인물 완성도 신호: 프로필 사진 / 약력 / 출생연도 (각 1신호) */
function personCompletenessBonus(p: {
  profileImageUrl?: string | null
  biography?: string | null
  birthYear?: number | null
}): number {
  const signals =
    (p.profileImageUrl ? 1 : 0) + (p.biography ? 1 : 0) + (p.birthYear != null ? 1 : 0)
  return completenessBonus(signals)
}

/**
 * 인물 수정 알림의 동작·하위 리소스 판정.
 * - 전기(biography)가 비어있다가 채워짐 → "전기 추가"(CREATE + BIOGRAPHY)
 * - 기존 전기 내용이 바뀜          → "전기 수정"(UPDATE + BIOGRAPHY)
 * - 전기 외 필드만 변경(또는 전기 미전달) → 인물 자체 수정(UPDATE, 하위 리소스 없음)
 * data.biography가 undefined면 부분 수정에서 전기를 손대지 않은 것으로 본다.
 */
function describePersonUpdate(
  existing: { biography?: string | null },
  data: UpdatePersonData,
): { method: EventMethod; subResourceType?: NotificationSubResource } {
  if (data.biography !== undefined) {
    const before = (existing.biography ?? '').trim()
    const after = (data.biography ?? '').trim()
    if (before !== after) {
      // 비어있다 채움=추가, 채워져있다 바뀜=수정, 채워져있다 비움=삭제
      if (after === '') {
        if (before !== '') {
          return { method: EventMethod.DELETE, subResourceType: NotificationSubResource.BIOGRAPHY }
        }
      } else {
        return {
          method: before === '' ? EventMethod.CREATE : EventMethod.UPDATE,
          subResourceType: NotificationSubResource.BIOGRAPHY,
        }
      }
    }
  }
  return { method: EventMethod.UPDATE }
}

/** 비교용 정규화: null/undefined→'', 그 외 trim한 문자열 */
function normField(v: any): string {
  return v == null ? '' : String(v).trim()
}

/**
 * 인물 수정 시 바뀐 필드 그룹을 한국어로 요약. "이름·생몰년 수정".
 * data(부분 수정)에 실제로 전달되었고 기존값과 다른 키만 집계. 변경 없으면 undefined.
 * names(표시명 전/후)가 주어지고 이름이 바뀌었으면 "이름: 옛→새"로 전후 값을 노출한다.
 * (생몰년·관계·사진 등 다필드/ID 그룹은 가독성을 위해 라벨만 표기)
 */
function summarizePersonChanges(
  existing: any,
  data: any,
  names?: { before: string; after: string },
): string | undefined {
  const groups: Array<{ label: string; keys: string[] }> = [
    { label: '이름', keys: ['name', 'surname', 'middleName', 'originalName', 'nameDisplayOrder'] },
    {
      label: '생몰년',
      keys: [
        'birthEra', 'birthYear', 'birthMonth', 'birthDay',
        'deathEra', 'deathYear', 'deathMonth', 'deathDay',
        'isBirthDateUnknown', 'isDeathDateUnknown', 'isAlive', 'deathType', 'deathCause', 'deathNote',
      ],
    },
    { label: '전기', keys: ['biography'] },
    { label: '성별', keys: ['gender'] },
    { label: '사진', keys: ['profileImageUrl'] },
    { label: '영향력', keys: ['influence'] },
    // illegitimate(사생아·서출)는 부모 관계 맥락이라 '관계' 그룹에 둔다(가족 섹션 체크박스에서 저작).
    { label: '관계', keys: ['dynastyId', 'religionId', 'denominationId', 'fatherId', 'motherId', 'countryId', 'illegitimate'] },
  ]
  const changed = groups
    .filter((g) => g.keys.some((k) => data[k] !== undefined && normField(data[k]) !== normField(existing[k])))
    .map((g) => {
      if (g.label === '이름' && names && names.before !== names.after) {
        return `이름: ${names.before} → ${names.after}`
      }
      return g.label
    })
  return changed.length ? `${changed.join('·')} 수정` : undefined
}

/** 재임/재위 직위명 — 직접 입력(title) 우선, 없으면 직위 정의(positionDefinition.title) 사용 */
function tenurePositionTitle(t: any, fallback: string): string {
  return t?.title || t?.positionDefinition?.title || fallback
}

/**
 * 재임/재위 알림 프리뷰 — "제N대 · YYYY. M. D. ~ YYYY. M. D." (종료일 없으면 "~ 재직 중").
 * startDate는 Date 또는 ISO 문자열일 수 있고, BC/고대 안전을 위해 네이티브 Date 파싱 대신 문자열을 직접 자른다.
 */
function tenurePreview(t: any): string | undefined {
  const fmt = (v: any): string | null => {
    if (!v) return null
    const s = v instanceof Date ? v.toISOString() : String(v)
    const m = s.match(/^(-?\d{1,6})-(\d{1,2})-(\d{1,2})/)
    if (!m) return null
    return `${Number(m[1])}. ${Number(m[2])}. ${Number(m[3])}.`
  }
  const start = fmt(t?.startDate)
  if (!start) return undefined
  const end = fmt(t?.endDate)
  const period = end ? `${start} ~ ${end}` : `${start} ~ 재직 중`
  const term = t?.termNumber ? `제${t.termNumber}대 · ` : ''
  return `${term}${period}`
}

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonPrismaRepository,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly pointService: PointService,
  ) {}

  /**
   * 인물 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findAll(accountId?: string): Promise<PersonResponseDto[]> {
    return this.personRepository.findAll(accountId)
  }

  /**
   * 인물 인포그래픽 목록(경량) 조회 — 대시보드 인포그래픽 전용 축소 payload.
   */
  async findAllForInfographic(
    accountId?: string,
  ): Promise<PersonInfographicItemDto[]> {
    return this.personRepository.findAllForInfographic(accountId)
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

  async getFamilyTree(
    id: string,
    accountId?: string,
    opts?: { includeCollaterals?: boolean },
  ): Promise<FamilyTreeResponseDto> {
    const result = await this.personRepository.findFamilyTree(id, accountId, opts)
    if (!result || result.nodes.length === 0) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${id})`)
    }
    return result
  }

  /**
   * 부모/조상 그래프 무결성 검증 — 자기 자신을 부모로 지정(자기부모)하거나
   * 조상 체인에 자기 자신이 등장(순환)하는 손상 그래프 생성을 막는다.
   * 새로 지정되는 fatherId/motherId만 검사(기존 엣지는 저장 시점에 이미 검증됨).
   */
  private async assertNoParentCycle(
    id: string,
    fatherId?: string | null,
    motherId?: string | null,
  ): Promise<void> {
    if (fatherId && fatherId === id)
      throw new BadRequestException('자기 자신을 아버지로 지정할 수 없습니다.')
    if (motherId && motherId === id)
      throw new BadRequestException('자기 자신을 어머니로 지정할 수 없습니다.')

    const start = [fatherId, motherId].filter((value): value is string => !!value)
    if (start.length === 0) return

    // 지정된 부모들의 조상 체인을 위로 순회 — 도중에 id가 나오면 순환(자기 자신이 조상).
    const visited = new Set<string>()
    let frontier = start
    let depth = 0
    while (frontier.length > 0 && depth < 64) {
      const parents = await this.prisma.person.findMany({
        where: { id: { in: frontier } },
        select: { id: true, fatherId: true, motherId: true },
      })
      const next: string[] = []
      for (const parent of parents) {
        for (const ancestorId of [parent.fatherId, parent.motherId]) {
          if (!ancestorId) continue
          if (ancestorId === id)
            throw new BadRequestException(
              '부모/조상 관계에 순환이 생깁니다 — 자기 자신을 조상으로 지정할 수 없습니다.',
            )
          if (!visited.has(ancestorId)) {
            visited.add(ancestorId)
            next.push(ancestorId)
          }
        }
      }
      frontier = next
      depth++
    }
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
      yearRangePreview(person.birthEra, person.birthYear, person.deathEra, person.deathYear),
    )
    await this.pointService.awardForCreate(
      accountId,
      AggregateType.PERSON,
      person.id,
      personCompletenessBonus(person),
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
    // 부모 지정 시 자기부모·조상 순환 방지 (지정된 부모만 검사)
    if (data.fatherId != null || data.motherId != null) {
      await this.assertNoParentCycle(id, data.fatherId, data.motherId)
    }
    const person = await this.personRepository.update(id, data)
    const change = describePersonUpdate(existing, data)
    // 전기 등 하위 리소스 변경이면 제목이 이미 구체적이므로 preview 생략,
    // 일반 인물 수정이면 바뀐 필드 요약("이름·생몰년 수정"), 그것도 없으면 생몰년 범위.
    const preview = change.subResourceType
      ? undefined
      : summarizePersonChanges(existing, data, {
          before: personDisplayName(existing),
          after: personDisplayName(person),
        }) ?? yearRangePreview(person.birthEra, person.birthYear, person.deathEra, person.deathYear)
    await this.notificationService.notifyPerson(
      personDisplayName(person),
      change.method,
      person.id,
      preview,
      change.subResourceType,
    )
    // 수정으로 내용을 채운 경우에도 완성도 보너스 적립(콘텐츠당 1회, 멱등)
    await this.pointService.awardCompletenessBonus(
      accountId,
      AggregateType.PERSON,
      person.id,
      personCompletenessBonus(person),
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
      id,
      yearRangePreview(person.birthEra, person.birthYear, person.deathEra, person.deathYear),
    )
    await this.pointService.revokeForRecord(AggregateType.PERSON, id)
  }

  /**
   * 인물 하위 섹션(경력/학력/수상) 변경 알림.
   * 컬렉션 항목은 추가·삭제가 잦아 항목마다 CREATE를 쏘면 알림이 도배되므로,
   * UPDATE + subResourceType으로 발행해 같은 인물·같은 섹션의 미확인 알림을 하나로 병합한다.
   * → 표시: "{인물}의 경력이 수정되었습니다"
   */
  private async notifyPersonSection(
    personId: string | null | undefined,
    subResourceType: NotificationSubResource,
    detail?: string,
  ): Promise<void> {
    if (!personId) return
    const person = await this.personRepository.findById(personId)
    if (!person) return
    await this.notificationService.notifyPerson(
      personDisplayName(person),
      EventMethod.UPDATE,
      person.id,
      detail, // 하위 항목 상세("미국 대통령 · 1789 ~ 1797"). 행위자는 ALS로 자동 기록.
      subResourceType,
    )
  }

  // ========================
  // Career 관리 메서드
  // ========================

  /**
   * 군인 경력 추가
   */
  async addMilitaryCareer(dto: CreateMilitaryCareerDto): Promise<MilitaryCareerResponseDto> {
    const created = await this.personRepository.addMilitaryCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 기업인 경력 추가
   */
  async addBusinessCareer(dto: CreateBusinessCareerDto): Promise<BusinessCareerResponseDto> {
    const created = await this.personRepository.addBusinessCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 학자 경력 추가
   */
  async addAcademicCareer(dto: CreateAcademicCareerDto): Promise<AcademicCareerResponseDto> {
    const created = await this.personRepository.addAcademicCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 운동선수 경력 추가
   */
  async addAthleteCareer(dto: CreateAthleteCareerDto): Promise<AthleteCareerResponseDto> {
    const created = await this.personRepository.addAthleteCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 종교인 경력 추가
   */
  async addReligiousCareer(dto: CreateReligiousCareerDto): Promise<ReligiousCareerResponseDto> {
    const created = await this.personRepository.addReligiousCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 예술가 경력 추가
   */
  async addArtistCareer(dto: CreateArtistCareerDto): Promise<ArtistCareerResponseDto> {
    const created = await this.personRepository.addArtistCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 언론인 경력 추가
   */
  async addMediaCareer(dto: CreateMediaCareerDto): Promise<MediaCareerResponseDto> {
    const created = await this.personRepository.addMediaCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 법조인 경력 추가
   */
  async addLegalCareer(dto: CreateLegalCareerDto): Promise<LegalCareerResponseDto> {
    const created = await this.personRepository.addLegalCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 의료인 경력 추가
   */
  async addMedicalCareer(dto: CreateMedicalCareerDto): Promise<MedicalCareerResponseDto> {
    const created = await this.personRepository.addMedicalCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 국가원수/왕위 재임 기록 추가.
   * 정부 수반·국가 원수 재임(HEAD_OF_STATE/HEAD_OF_GOVERNMENT)은 기본적으로 행정부(Cabinet)를 자동 생성.
   * 군주 재위만 기록할 때는 addSovereignReign을 사용합니다.
   * @param accountId 로그인 계정 ID — 계정별 행정부·각료 구분용
   */
  async addGovernmentPositionTenure(dto: CreateGovernmentPositionTenureDto, accountId?: string): Promise<any> {
    // 가드: 수반 임기는 동시에 다른 행정부의 각료(cabinetId)일 수 없음
    if (
      dto.cabinetId &&
      (dto.positionType === 'HEAD_OF_STATE' || dto.positionType === 'HEAD_OF_GOVERNMENT')
    ) {
      throw new BadRequestException('수반 임기는 다른 행정부의 각료(cabinetId)로 동시에 설정할 수 없습니다.')
    }
    const tenure = await this.personRepository.addGovernmentPositionTenure(dto, accountId)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenurePositionTitle(tenure, '재임')}` : tenurePositionTitle(tenure, '재임 기록')
    await this.notificationService.notifyTenure(label, EventMethod.CREATE, tenure?.personId ?? tenure?.id, tenurePreview(tenure))
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
    // 가드: 행정부의 수반인 임기를 head 계열이 아닌 타입으로 바꾸려 하면 차단 (Cabinet 무결성 보호)
    if (dto.positionType && dto.positionType !== 'HEAD_OF_STATE' && dto.positionType !== 'HEAD_OF_GOVERNMENT') {
      const cabinet = await this.personRepository.findCabinetByHeadTenureId(id)
      if (cabinet) {
        throw new BadRequestException(
          '이 임기는 행정부의 수반으로 사용 중입니다. 행정부를 먼저 삭제한 뒤 직위 유형을 변경하세요.',
        )
      }
    }
    // 가드: 수반 임기는 동시에 다른 행정부의 각료(cabinetId)일 수 없음
    if (
      dto.cabinetId &&
      (dto.positionType === 'HEAD_OF_STATE' || dto.positionType === 'HEAD_OF_GOVERNMENT')
    ) {
      throw new BadRequestException('수반 임기는 다른 행정부의 각료(cabinetId)로 동시에 설정할 수 없습니다.')
    }
    const tenure = await this.personRepository.updateGovernmentPositionTenure(id, dto)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenurePositionTitle(tenure, '재임')}` : tenurePositionTitle(tenure, '재임 기록')
    await this.notificationService.notifyTenure(label, EventMethod.UPDATE, tenure?.personId ?? tenure?.id, tenurePreview(tenure))
    return tenure
  }

  /**
   * 국가원수/왕위 재임 기록 삭제
   */
  async deleteGovernmentPositionTenure(id: string): Promise<void> {
    const tenure = await this.personRepository.findTenureById(id)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenurePositionTitle(tenure, '재임')}` : tenurePositionTitle(tenure, '재임 기록')
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
      tenurePreview(row),
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
      tenurePreview(row),
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

  /** 재임 1건 + 업적 조회 (없으면 404) */
  async getTenureWithAchievements(id: string): Promise<any> {
    const tenure = await this.personRepository.findTenureById(id)
    if (!tenure) {
      throw new NotFoundException('재임 기록을 찾을 수 없습니다.')
    }
    return tenure
  }

  /** 재위 1건 + 업적 조회 (없으면 404) */
  async getSovereignReignWithAchievements(id: string): Promise<any> {
    const row = await this.personRepository.findSovereignReignById(id)
    if (!row) {
      throw new NotFoundException('재위 기록을 찾을 수 없습니다.')
    }
    return row
  }

  /**
   * 연보 start/end 날짜 범위 검증 — endDate < startDate 금지.
   * 두 값이 모두 있을 때만 검사(각각 null 허용).
   */
  private assertLifeEventDateRange(
    startDate?: string | null,
    endDate?: string | null,
  ): void {
    if (!startDate || !endDate) return
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('종료일은 시작일 이후여야 합니다.')
    }
  }

  /** 인물 연보(PersonLifeEvent) 생성 — 자유 서술형 시간축 */
  async addPersonLifeEvent(
    dto: CreatePersonLifeEventDto,
    accountId?: string,
  ): Promise<any> {
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
      select: { accountId: true },
    })
    if (!person) {
      throw new NotFoundException('인물을 찾을 수 없습니다.')
    }
    if (
      accountId != null &&
      person.accountId != null &&
      person.accountId !== accountId
    ) {
      throw new ForbiddenException('본인이 등록한 인물에만 연보를 추가할 수 있습니다.')
    }
    this.assertLifeEventDateRange(dto.startDate, dto.endDate)
    return this.personRepository.addPersonLifeEvent(dto, accountId)
  }

  async updatePersonLifeEvent(
    id: string,
    dto: UpdatePersonLifeEventDto,
    accountId?: string,
  ): Promise<any> {
    const existing = await this.personRepository.findPersonLifeEventById(id)
    if (!existing) {
      throw new NotFoundException('연보 기록을 찾을 수 없습니다.')
    }
    if (
      accountId != null &&
      existing.accountId != null &&
      existing.accountId !== accountId
    ) {
      throw new ForbiddenException('본인이 등록한 연보만 수정할 수 있습니다.')
    }
    // update는 dto에 둘 중 하나만 올 수 있음 — 없는 값은 DB 값으로 대체해서 검사
    const toIsoOrNull = (v: unknown): string | null => {
      if (v == null) return null
      if (typeof v === 'string') return v
      if (v instanceof Date) return v.toISOString()
      return null
    }
    const effectiveStart =
      dto.startDate !== undefined
        ? toIsoOrNull(dto.startDate)
        : toIsoOrNull((existing as { startDate?: unknown }).startDate)
    const effectiveEnd =
      dto.endDate !== undefined
        ? toIsoOrNull(dto.endDate)
        : toIsoOrNull((existing as { endDate?: unknown }).endDate)
    this.assertLifeEventDateRange(effectiveStart, effectiveEnd)
    return this.personRepository.updatePersonLifeEvent(id, dto)
  }

  async deletePersonLifeEvent(id: string, accountId?: string): Promise<void> {
    const existing = await this.personRepository.findPersonLifeEventById(id)
    if (!existing) {
      throw new NotFoundException('연보 기록을 찾을 수 없습니다.')
    }
    if (
      accountId != null &&
      existing.accountId != null &&
      existing.accountId !== accountId
    ) {
      throw new ForbiddenException('본인이 등록한 연보만 삭제할 수 있습니다.')
    }
    await this.personRepository.deletePersonLifeEvent(id)
  }

  async findPersonLifeEventsByPersonId(personId: string): Promise<any[]> {
    return this.personRepository.findPersonLifeEventsByPersonId(personId)
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

  async findCabinetOverview(cabinetId: string, accountId?: string): Promise<any | null> {
    return this.personRepository.findCabinetOverview(cabinetId, accountId)
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
    // 가드: head는 국가원수(HEAD_OF_STATE) 또는 정부수반(HEAD_OF_GOVERNMENT)이어야 함
    const headType = (head as any).positionType
    if (headType !== 'HEAD_OF_STATE' && headType !== 'HEAD_OF_GOVERNMENT') {
      throw new BadRequestException('행정부의 수반은 국가원수 또는 정부수반 임기여야 합니다.')
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
    const created = await this.personRepository.addEducation(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.EDUCATION, educationItemLabel(created))
    return created
  }

  /**
   * 수상/훈장 추가
   */
  async addAward(dto: CreatePersonAwardDto): Promise<PersonAwardResponseDto> {
    const created = await this.personRepository.addAward(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.AWARD, awardItemLabel(created))
    return created
  }

  async deleteMilitaryCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteMilitaryCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteBusinessCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteBusinessCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteAcademicCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteAcademicCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteAthleteCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteAthleteCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteReligiousCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteReligiousCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteArtistCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteArtistCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteMediaCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteMediaCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteLegalCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteLegalCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteMedicalCareer(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteMedicalCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteEducation(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteEducation(id)
    await this.notifyPersonSection(personId, NotificationSubResource.EDUCATION, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteAward(id: string): Promise<void> {
    const { personId, itemLabel } = await this.personRepository.deleteAward(id)
    await this.notifyPersonSection(personId, NotificationSubResource.AWARD, itemLabel ? `${itemLabel} 삭제` : undefined)
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
      affinityLevel: number | null
      trustLevel?: number | null
      powerDynamic?: number | null
      formality?: number | null
      isMutual: boolean
      startDate: Date | null
      endDate: Date | null
      note: string | null
      fromPersonId: string
      toPersonId: string
      fromPerson: { id: string; name: string; surname: string | null; nameDisplayOrder: string | null; birthDate: Date | null; deathDate: Date | null }
      toPerson: { id: string; name: string; surname: string | null; nameDisplayOrder: string | null; birthDate: Date | null; deathDate: Date | null }
      tags?: { tag: PersonRelationshipTag }[]
      sources?: {
        id: string
        lifeEventId: string
        note: string | null
        lifeEvent: {
          id: string
          personId: string
          title: string
          startDate: Date | null
          endDate: Date | null
        }
      }[]
      phases?: {
        id: string
        startDate: Date | null
        endDate: Date | null
        affinityLevel: number | null
        trustLevel: number | null
        powerDynamic: number | null
        formality: number | null
        label: string | null
        note: string | null
      }[]
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
    /**
     * 시점:
     *  - MUTUAL: 양쪽 합의된 대칭 관계 (방향 없음)
     *  - SUBJECT: from = subjectPersonId — 이 인물 페이지에서 본인이 등록한 시점
     *  - OTHER: to = subjectPersonId — 상대 인물이 본인 시점에서 등록한 관계
     */
    const subjectivePerspective: 'MUTUAL' | 'SUBJECT' | 'OTHER' =
      rel.relationshipType === PersonHumanRelationshipType.GENERAL && rel.isMutual
        ? 'MUTUAL'
        : rel.fromPersonId === subjectPersonId
          ? 'SUBJECT'
          : 'OTHER'
    return {
      id: rel.id,
      relationshipType: rel.relationshipType,
      affinityLevel: rel.affinityLevel,
      trustLevel: rel.trustLevel ?? null,
      powerDynamic: rel.powerDynamic ?? null,
      formality: rel.formality ?? null,
      isMutual: rel.isMutual,
      startDate: rel.startDate?.toISOString() ?? null,
      endDate: rel.endDate?.toISOString() ?? null,
      note: rel.note,
      fromPersonId: rel.fromPersonId,
      toPersonId: rel.toPersonId,
      otherPerson: this.serializePersonBrief(other),
      mentorPerspective,
      subjectivePerspective,
      tags: (rel.tags ?? []).map((t) => t.tag),
      sources: (rel.sources ?? []).map((s) => ({
        id: s.id,
        lifeEventId: s.lifeEventId,
        note: s.note,
        lifeEvent: {
          id: s.lifeEvent.id,
          personId: s.lifeEvent.personId,
          title: s.lifeEvent.title,
          startDate: s.lifeEvent.startDate?.toISOString() ?? null,
          endDate: s.lifeEvent.endDate?.toISOString() ?? null,
        },
      })),
      phases: (rel.phases ?? []).map((p) => ({
        id: p.id,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
        affinityLevel: p.affinityLevel,
        trustLevel: p.trustLevel,
        powerDynamic: p.powerDynamic,
        formality: p.formality,
        label: p.label,
        note: p.note,
      })),
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

  /** 관계 조회용 표준 include */
  private readonly HUMAN_RELATIONSHIP_INCLUDE = {
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
    tags: { select: { tag: true } },
    sources: {
      include: {
        lifeEvent: {
          select: {
            id: true,
            personId: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    },
    phases: true,
  } as const

  /**
   * 인물이 참여한 인간관계 목록 (from/to 모두 조회)
   */
  async findHumanRelationships(personId: string, accountId?: string) {
    await this.findById(personId, accountId)
    const rows = await this.prisma.personHumanRelationship.findMany({
      where: {
        OR: [{ fromPersonId: personId }, { toPersonId: personId }],
      },
      include: this.HUMAN_RELATIONSHIP_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map((r) => this.mapHumanRelationshipRow(r, personId))
  }

  private async resolveHumanRelationshipEndpoints(
    subjectPersonId: string,
    relatedPersonId: string,
    relationshipType: PersonHumanRelationshipType,
    subjectIsMentor: boolean | undefined,
    isMutual: boolean,
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
    if (isMutual) {
      // GENERAL · 대칭: UUID 오름차순으로 정규화 (중복 방지 + 양쪽 동일 표시)
      const [a, b] =
        subjectPersonId < relatedPersonId
          ? [subjectPersonId, relatedPersonId]
          : [relatedPersonId, subjectPersonId]
      return { fromPersonId: a, toPersonId: b }
    }
    // GENERAL · 비대칭: 주체 시점 — from=주체, to=상대
    return { fromPersonId: subjectPersonId, toPersonId: relatedPersonId }
  }

  /** 근거 사건이 두 당사자(주체/상대) 중 한쪽의 연보에 속하는지 검증 */
  private async assertSourcesBelongToParties(
    lifeEventIds: string[],
    partyIds: string[],
  ): Promise<void> {
    if (lifeEventIds.length === 0) return
    const events = await this.prisma.personLifeEvent.findMany({
      where: { id: { in: lifeEventIds } },
      select: { id: true, personId: true },
    })
    if (events.length !== lifeEventIds.length) {
      throw new BadRequestException('존재하지 않는 근거 사건이 포함되어 있습니다.')
    }
    const partySet = new Set(partyIds)
    const stranger = events.find((e) => !partySet.has(e.personId))
    if (stranger) {
      throw new BadRequestException(
        '근거 사건은 두 당사자 중 한 쪽의 연보에 속한 항목만 연결할 수 있습니다.',
      )
    }
  }

  async createHumanRelationship(
    subjectPersonId: string,
    dto: CreatePersonHumanRelationshipDto,
    accountId?: string,
  ) {
    await this.findById(subjectPersonId, accountId)
    await this.findById(dto.relatedPersonId, accountId)
    const isMutual =
      dto.relationshipType === PersonHumanRelationshipType.GENERAL
        ? dto.isMutual ?? false
        : false
    const { fromPersonId, toPersonId } = await this.resolveHumanRelationshipEndpoints(
      subjectPersonId,
      dto.relatedPersonId,
      dto.relationshipType,
      dto.subjectIsMentor,
      isMutual,
    )
    if (dto.sourceLifeEventIds && dto.sourceLifeEventIds.length > 0) {
      await this.assertSourcesBelongToParties(dto.sourceLifeEventIds, [
        subjectPersonId,
        dto.relatedPersonId,
      ])
    }
    try {
      const created = await this.prisma.personHumanRelationship.create({
        data: {
          fromPersonId,
          toPersonId,
          relationshipType: dto.relationshipType,
          isMutual,
          affinityLevel: dto.affinityLevel ?? null,
          trustLevel: dto.trustLevel ?? null,
          powerDynamic: dto.powerDynamic ?? null,
          formality: dto.formality ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          note: dto.note ?? null,
          tags:
            dto.tags && dto.tags.length > 0
              ? { create: dto.tags.map((tag) => ({ tag })) }
              : undefined,
          sources:
            dto.sourceLifeEventIds && dto.sourceLifeEventIds.length > 0
              ? {
                  create: dto.sourceLifeEventIds.map((lifeEventId) => ({
                    lifeEventId,
                  })),
                }
              : undefined,
        },
        include: this.HUMAN_RELATIONSHIP_INCLUDE,
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
    const nextIsMutual =
      nextType === PersonHumanRelationshipType.GENERAL
        ? dto.isMutual ?? existing.isMutual
        : false
    const { fromPersonId, toPersonId } = await this.resolveHumanRelationshipEndpoints(
      subjectPersonId,
      relatedId,
      nextType,
      dto.subjectIsMentor ?? (nextType === PersonHumanRelationshipType.MENTOR
        ? existing.fromPersonId === subjectPersonId
        : undefined),
      nextIsMutual,
    )
    if (dto.sourceLifeEventIds !== undefined && dto.sourceLifeEventIds.length > 0) {
      await this.assertSourcesBelongToParties(dto.sourceLifeEventIds, [
        subjectPersonId,
        relatedId,
      ])
    }
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // 1. 기본 필드 업데이트
        const row = await tx.personHumanRelationship.update({
          where: { id: relationshipId },
          data: {
            fromPersonId,
            toPersonId,
            relationshipType: dto.relationshipType ?? undefined,
            isMutual: nextIsMutual,
            // affinityLevel은 null로 명시적 초기화 가능 — undefined만 "미변경"
            affinityLevel:
              dto.affinityLevel === undefined ? undefined : dto.affinityLevel,
            trustLevel:
              dto.trustLevel === undefined ? undefined : dto.trustLevel,
            powerDynamic:
              dto.powerDynamic === undefined ? undefined : dto.powerDynamic,
            formality: dto.formality === undefined ? undefined : dto.formality,
            startDate:
              dto.startDate === undefined ? undefined : dto.startDate ? new Date(dto.startDate) : null,
            endDate: dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
            note: dto.note === undefined ? undefined : dto.note,
          },
        })

        // 2. tags가 명시 전달되면 전체 교체
        if (dto.tags !== undefined) {
          await tx.personHumanRelationshipTagAssignment.deleteMany({
            where: { relationshipId },
          })
          if (dto.tags.length > 0) {
            await tx.personHumanRelationshipTagAssignment.createMany({
              data: dto.tags.map((tag) => ({ relationshipId, tag })),
            })
          }
        }

        // 3. sources가 명시 전달되면 전체 교체
        if (dto.sourceLifeEventIds !== undefined) {
          await tx.personHumanRelationshipSource.deleteMany({
            where: { relationshipId },
          })
          if (dto.sourceLifeEventIds.length > 0) {
            await tx.personHumanRelationshipSource.createMany({
              data: dto.sourceLifeEventIds.map((lifeEventId) => ({
                relationshipId,
                lifeEventId,
              })),
            })
          }
        }

        return tx.personHumanRelationship.findUniqueOrThrow({
          where: { id: row.id },
          include: this.HUMAN_RELATIONSHIP_INCLUDE,
        })
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

  // ─────────────────────────────────────────────────────────────────────────
  // Phase (시기별 스냅샷) CRUD
  // ─────────────────────────────────────────────────────────────────────────

  private async assertOwnsRelationship(
    subjectPersonId: string,
    relationshipId: string,
    accountId?: string,
  ) {
    await this.findById(subjectPersonId, accountId)
    const rel = await this.prisma.personHumanRelationship.findUnique({
      where: { id: relationshipId },
    })
    if (!rel) {
      throw new NotFoundException(
        `인간관계를 찾을 수 없습니다 (ID: ${relationshipId})`,
      )
    }
    if (
      rel.fromPersonId !== subjectPersonId &&
      rel.toPersonId !== subjectPersonId
    ) {
      throw new ForbiddenException(
        '이 인물과 연결된 관계만 수정할 수 있습니다.',
      )
    }
    return rel
  }

  private mapPhase(p: {
    id: string
    startDate: Date | null
    endDate: Date | null
    affinityLevel: number | null
    trustLevel: number | null
    powerDynamic: number | null
    formality: number | null
    label: string | null
    note: string | null
  }) {
    return {
      id: p.id,
      startDate: p.startDate?.toISOString() ?? null,
      endDate: p.endDate?.toISOString() ?? null,
      affinityLevel: p.affinityLevel,
      trustLevel: p.trustLevel,
      powerDynamic: p.powerDynamic,
      formality: p.formality,
      label: p.label,
      note: p.note,
    }
  }

  async createRelationshipPhase(
    subjectPersonId: string,
    relationshipId: string,
    dto: {
      startDate?: string | null
      endDate?: string | null
      affinityLevel?: number | null
      trustLevel?: number | null
      powerDynamic?: number | null
      formality?: number | null
      label?: string | null
      note?: string | null
    },
    accountId?: string,
  ) {
    await this.assertOwnsRelationship(subjectPersonId, relationshipId, accountId)
    const created = await this.prisma.personHumanRelationshipPhase.create({
      data: {
        relationshipId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        affinityLevel: dto.affinityLevel ?? null,
        trustLevel: dto.trustLevel ?? null,
        powerDynamic: dto.powerDynamic ?? null,
        formality: dto.formality ?? null,
        label: dto.label ?? null,
        note: dto.note ?? null,
      },
    })
    return this.mapPhase(created)
  }

  async updateRelationshipPhase(
    subjectPersonId: string,
    relationshipId: string,
    phaseId: string,
    dto: {
      startDate?: string | null
      endDate?: string | null
      affinityLevel?: number | null
      trustLevel?: number | null
      powerDynamic?: number | null
      formality?: number | null
      label?: string | null
      note?: string | null
    },
    accountId?: string,
  ) {
    await this.assertOwnsRelationship(subjectPersonId, relationshipId, accountId)
    const existing = await this.prisma.personHumanRelationshipPhase.findUnique({
      where: { id: phaseId },
    })
    if (!existing || existing.relationshipId !== relationshipId) {
      throw new NotFoundException(
        `관계 시기 스냅샷을 찾을 수 없습니다 (ID: ${phaseId})`,
      )
    }
    const updated = await this.prisma.personHumanRelationshipPhase.update({
      where: { id: phaseId },
      data: {
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate
              ? new Date(dto.startDate)
              : null,
        endDate:
          dto.endDate === undefined
            ? undefined
            : dto.endDate
              ? new Date(dto.endDate)
              : null,
        affinityLevel:
          dto.affinityLevel === undefined ? undefined : dto.affinityLevel,
        trustLevel: dto.trustLevel === undefined ? undefined : dto.trustLevel,
        powerDynamic:
          dto.powerDynamic === undefined ? undefined : dto.powerDynamic,
        formality: dto.formality === undefined ? undefined : dto.formality,
        label: dto.label === undefined ? undefined : dto.label,
        note: dto.note === undefined ? undefined : dto.note,
      },
    })
    return this.mapPhase(updated)
  }

  async deleteRelationshipPhase(
    subjectPersonId: string,
    relationshipId: string,
    phaseId: string,
    accountId?: string,
  ) {
    await this.assertOwnsRelationship(subjectPersonId, relationshipId, accountId)
    const existing = await this.prisma.personHumanRelationshipPhase.findUnique({
      where: { id: phaseId },
    })
    if (!existing || existing.relationshipId !== relationshipId) {
      throw new NotFoundException(
        `관계 시기 스냅샷을 찾을 수 없습니다 (ID: ${phaseId})`,
      )
    }
    await this.prisma.personHumanRelationshipPhase.delete({
      where: { id: phaseId },
    })
  }

  /**
   * 인물 중심 멘토 계보 — 위로 스승 체인, 아래로 제자 체인을 깊이 우선으로 수집.
   * 사이클 방지: 방문한 인물 ID 셋. 깊이 제한 6단계.
   */
  async findMentorLineage(personId: string, accountId?: string) {
    await this.findById(personId, accountId)
    const MAX_DEPTH = 6

    type LineageNode = {
      person: ReturnType<PersonService['serializePersonBrief']>
      direction: 'ANCESTOR' | 'SELF' | 'DESCENDANT'
      depth: number
    }
    type LineageEdge = {
      mentorId: string
      studentId: string
    }

    const personSelect = {
      id: true,
      name: true,
      surname: true,
      nameDisplayOrder: true,
      birthDate: true,
      deathDate: true,
    } as const

    const rootBrief = await this.prisma.person.findUniqueOrThrow({
      where: { id: personId },
      select: personSelect,
    })

    const visitedNodes = new Set<string>([personId])
    const nodes: LineageNode[] = [
      {
        person: this.serializePersonBrief(rootBrief),
        direction: 'SELF',
        depth: 0,
      },
    ]
    const edges: LineageEdge[] = []

    // 위쪽: 스승의 스승 체인
    const collectAncestors = async (currentIds: string[], depth: number) => {
      if (depth > MAX_DEPTH || currentIds.length === 0) return
      const rows = await this.prisma.personHumanRelationship.findMany({
        where: {
          relationshipType: PersonHumanRelationshipType.MENTOR,
          toPersonId: { in: currentIds },
        },
        include: { fromPerson: { select: personSelect } },
      })
      const nextIds: string[] = []
      for (const row of rows) {
        edges.push({ mentorId: row.fromPersonId, studentId: row.toPersonId })
        if (!visitedNodes.has(row.fromPersonId)) {
          visitedNodes.add(row.fromPersonId)
          nodes.push({
            person: this.serializePersonBrief(row.fromPerson),
            direction: 'ANCESTOR',
            depth: -depth,
          })
          nextIds.push(row.fromPersonId)
        }
      }
      await collectAncestors(nextIds, depth + 1)
    }

    // 아래쪽: 제자의 제자 체인
    const collectDescendants = async (currentIds: string[], depth: number) => {
      if (depth > MAX_DEPTH || currentIds.length === 0) return
      const rows = await this.prisma.personHumanRelationship.findMany({
        where: {
          relationshipType: PersonHumanRelationshipType.MENTOR,
          fromPersonId: { in: currentIds },
        },
        include: { toPerson: { select: personSelect } },
      })
      const nextIds: string[] = []
      for (const row of rows) {
        edges.push({ mentorId: row.fromPersonId, studentId: row.toPersonId })
        if (!visitedNodes.has(row.toPersonId)) {
          visitedNodes.add(row.toPersonId)
          nodes.push({
            person: this.serializePersonBrief(row.toPerson),
            direction: 'DESCENDANT',
            depth,
          })
          nextIds.push(row.toPersonId)
        }
      }
      await collectDescendants(nextIds, depth + 1)
    }

    await Promise.all([
      collectAncestors([personId], 1),
      collectDescendants([personId], 1),
    ])

    return {
      rootPersonId: personId,
      nodes,
      edges,
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // 인물 능력치(6축) — 사용자별 평가
  // ────────────────────────────────────────────────────────────────────

  /** 인물 존재만 검증. 인물 소유와 평가는 분리 — 다른 사용자가 등록한 인물에도 내 평가 가능. */
  private async assertPersonExistsForRating(personId: string) {
    const exists = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { id: true },
    })
    if (!exists) {
      throw new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${personId})`)
    }
  }

  private static toStatsResponse(row: {
    id: string
    personId: string
    accountId: string
    politics: number | null
    military: number | null
    diplomacy: number | null
    intellect: number | null
    charisma: number | null
    administration: number | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
  }): PersonStatsResponseDto {
    return {
      id: row.id,
      personId: row.personId,
      accountId: row.accountId,
      politics: row.politics,
      military: row.military,
      diplomacy: row.diplomacy,
      intellect: row.intellect,
      charisma: row.charisma,
      administration: row.administration,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  /** 본인 능력치 평가 조회 (없으면 null) */
  async findMyStats(
    personId: string,
    accountId: string,
  ): Promise<PersonStatsResponseDto | null> {
    await this.assertPersonExistsForRating(personId)
    const row = await this.prisma.personStats.findUnique({
      where: { person_stats_person_account_key: { personId, accountId } },
    })
    return row ? PersonService.toStatsResponse(row) : null
  }

  /**
   * 본인 능력치 평가 upsert.
   * 필드 키가 dto에 명시되어 있으면 그 값으로 (null도 명시적 초기화), 생략된 키는 기존값 유지.
   */
  async upsertMyStats(
    personId: string,
    accountId: string,
    dto: UpsertPersonStatsDto,
  ): Promise<PersonStatsResponseDto> {
    await this.assertPersonExistsForRating(personId)
    const data: {
      politics?: number | null
      military?: number | null
      diplomacy?: number | null
      intellect?: number | null
      charisma?: number | null
      administration?: number | null
      notes?: string | null
    } = {}
    if ('politics' in dto) data.politics = dto.politics ?? null
    if ('military' in dto) data.military = dto.military ?? null
    if ('diplomacy' in dto) data.diplomacy = dto.diplomacy ?? null
    if ('intellect' in dto) data.intellect = dto.intellect ?? null
    if ('charisma' in dto) data.charisma = dto.charisma ?? null
    if ('administration' in dto) data.administration = dto.administration ?? null
    if ('notes' in dto) data.notes = dto.notes ?? null

    const row = await this.prisma.personStats.upsert({
      where: { person_stats_person_account_key: { personId, accountId } },
      create: {
        personId,
        accountId,
        ...data,
      },
      update: data,
    })
    return PersonService.toStatsResponse(row)
  }

  /** 본인 능력치 삭제 (평가 자체 제거) */
  async deleteMyStats(personId: string, accountId: string): Promise<void> {
    await this.prisma.personStats.deleteMany({
      where: { personId, accountId },
    })
  }

  // ────────────────────────────────────────────────────────────────────
  // 인물 성격 태그 — 사용자별 다중 부착
  // ────────────────────────────────────────────────────────────────────

  /** 본인이 부착한 성격 태그 목록 */
  async findMyTraits(
    personId: string,
    accountId: string,
  ): Promise<PersonTraitAssignmentDto[]> {
    await this.assertPersonExistsForRating(personId)
    const rows = await this.prisma.personTraitAssignment.findMany({
      where: { personId, accountId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((r) => ({
      id: r.id,
      trait: r.trait,
      intensity: r.intensity,
      note: r.note,
    }))
  }

  /**
   * 성격 태그 전체 교체 — 트랜잭션으로 deleteMany + createMany.
   * 빈 배열 = 모두 제거.
   */
  async upsertMyTraits(
    personId: string,
    accountId: string,
    dto: UpsertPersonTraitsDto,
  ): Promise<PersonTraitAssignmentDto[]> {
    await this.assertPersonExistsForRating(personId)
    return this.prisma.$transaction(async (tx) => {
      await tx.personTraitAssignment.deleteMany({
        where: { personId, accountId },
      })
      if (dto.items.length > 0) {
        await tx.personTraitAssignment.createMany({
          data: dto.items.map((it) => ({
            personId,
            accountId,
            trait: it.trait as PersonTrait,
            intensity: it.intensity ?? null,
            note: it.note ?? null,
          })),
        })
      }
      const rows = await tx.personTraitAssignment.findMany({
        where: { personId, accountId },
        orderBy: { createdAt: 'asc' },
      })
      return rows.map((r) => ({
        id: r.id,
        trait: r.trait,
        intensity: r.intensity,
        note: r.note,
      }))
    })
  }

  /**
   * 능력치 + 성격 태그 합본 upsert (단일 트랜잭션).
   * stats / traits 둘 다 옵셔널 — 한쪽만 보내면 그쪽만 변경.
   * 부분 실패 없음: 두 작업이 모두 성공하거나 모두 롤백.
   */
  async upsertMyEvaluation(
    personId: string,
    accountId: string,
    dto: UpsertPersonEvaluationDto,
  ): Promise<PersonEvaluationResponseDto> {
    await this.assertPersonExistsForRating(personId)

    const statsDto = dto.stats
    const traitsDto = dto.traits

    return this.prisma.$transaction(async (tx) => {
      // 능력치
      let statsRow = null
      if (statsDto) {
        const data: {
          politics?: number | null
          military?: number | null
          diplomacy?: number | null
          intellect?: number | null
          charisma?: number | null
          administration?: number | null
          notes?: string | null
        } = {}
        if ('politics' in statsDto) data.politics = statsDto.politics ?? null
        if ('military' in statsDto) data.military = statsDto.military ?? null
        if ('diplomacy' in statsDto) data.diplomacy = statsDto.diplomacy ?? null
        if ('intellect' in statsDto) data.intellect = statsDto.intellect ?? null
        if ('charisma' in statsDto) data.charisma = statsDto.charisma ?? null
        if ('administration' in statsDto)
          data.administration = statsDto.administration ?? null
        if ('notes' in statsDto) data.notes = statsDto.notes ?? null
        statsRow = await tx.personStats.upsert({
          where: { person_stats_person_account_key: { personId, accountId } },
          create: { personId, accountId, ...data },
          update: data,
        })
      } else {
        statsRow = await tx.personStats.findUnique({
          where: { person_stats_person_account_key: { personId, accountId } },
        })
      }

      // 태그
      if (traitsDto) {
        await tx.personTraitAssignment.deleteMany({
          where: { personId, accountId },
        })
        if (traitsDto.items.length > 0) {
          await tx.personTraitAssignment.createMany({
            data: traitsDto.items.map((it) => ({
              personId,
              accountId,
              trait: it.trait as PersonTrait,
              intensity: it.intensity ?? null,
              note: it.note ?? null,
            })),
          })
        }
      }

      const traitRows = await tx.personTraitAssignment.findMany({
        where: { personId, accountId },
        orderBy: { createdAt: 'asc' },
      })

      return {
        stats: statsRow ? PersonService.toStatsResponse(statsRow) : null,
        traits: traitRows.map((r) => ({
          id: r.id,
          trait: r.trait,
          intensity: r.intensity,
          note: r.note,
        })),
      }
    })
  }

  /** 능력치 + 성격 태그 일괄 삭제 (단일 트랜잭션). */
  async deleteMyEvaluation(
    personId: string,
    accountId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.personStats.deleteMany({ where: { personId, accountId } })
      await tx.personTraitAssignment.deleteMany({
        where: { personId, accountId },
      })
    })
  }

  /**
   * 사용자의 모든 인물 평가(stats + traits)를 한 번에 조회.
   * 인물 리스트에서 평가 indicator·정렬·필터에 사용.
   */
  async findAllMyEvaluations(accountId: string): Promise<{
    stats: PersonStatsResponseDto[]
    traits: Array<PersonTraitAssignmentDto & { personId: string }>
  }> {
    const [statsRows, traitRows] = await Promise.all([
      this.prisma.personStats.findMany({ where: { accountId } }),
      this.prisma.personTraitAssignment.findMany({
        where: { accountId },
        orderBy: { createdAt: 'asc' },
      }),
    ])
    return {
      stats: statsRows.map((r) => PersonService.toStatsResponse(r)),
      traits: traitRows.map((r) => ({
        id: r.id,
        personId: r.personId,
        trait: r.trait,
        intensity: r.intensity,
        note: r.note,
      })),
    }
  }
}
