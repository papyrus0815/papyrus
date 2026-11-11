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
import { requireActorId } from '../../shared/actor-context'
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
  LinkPersonFamilyDto,
  UpdatePersonSpouseRelationDto,
  UpdatePersonChildMetaDto,
  FamilyLinkKind,
  DateInfoDto,
} from '../presentation/dto'
import {
  applyDatePrecision,
  mapStructuredDateInput,
  structuredDateEndKey,
  structuredDateKey,
  toSignedDateString,
} from '../domain/structured-date.util'

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
        'isBirthDateUnknown', 'isBirthDateApproximate', 'birthNote', 'isDeathDateUnknown', 'isDeathDateApproximate', 'isAlive', 'deathType', 'deathCause', 'deathNote',
      ],
    },
    { label: '전기', keys: ['biography'] },
    { label: '성별', keys: ['gender'] },
    { label: '사진', keys: ['profileImageUrl'] },
    { label: '영향력', keys: ['influence'] },
    // illegitimate(사생아·서출)는 부모 관계 맥락이라 '관계' 그룹에 둔다(가족 섹션 체크박스에서 저작).
    {
      label: '관계',
      keys: [
        'dynastyId',
        'religionId',
        'denominationId',
        'fatherId',
        'motherId',
        'adoptiveFatherId',
        'adoptiveMotherId',
        'countryId',
        'illegitimate',
        'birthOrder',
        'genderBirthOrder',
      ],
    },
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
  const term = t?.ordinal ? `제${t.ordinal}대 · ` : ''
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

  /** 이름 검색(경량, 피커용) — 1~50건 */
  async searchByName(query: string, accountId?: string, limit = 20) {
    const capped = Math.min(Math.max(Math.trunc(limit) || 20, 1), 50)
    return this.personRepository.searchByName(query, accountId, capped)
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
   * 현대 국가별 인물 전체 조회 (해당 국가와 직접 연결된 인물만, accountId 무관)
   * - person.countryId = 해당 국가
   * - 해당 국가(또는 연결된 역사적 국가)에 재임 기록
   * - PersonCountryAffiliation으로 해당 국가 또는 연결된 역사적 국가 소속 (출생지·시민권·봉사국 등)
   */
  async findPersonsByCountry(countryId: string): Promise<PersonResponseDto[]> {
    return this.mergePersonSources([
      this.personRepository.findPersonsByCountryId(countryId),
      this.personRepository.findPersonsWithTenureInCountry({ countryId }),
      this.personRepository.findPersonsByAffiliationInCountry(countryId),
    ])
  }

  /**
   * 역사국가별 인물 전체 조회 — 현대판 findPersonsByCountry와 대칭인 3원 합집합.
   * 재임 없는 본체 FK 인물(조선 문인·학자 등)까지 역사국가 스코프에서 도달 가능 (검토서 F21).
   * - person.historicalCountryId = 해당 역사국가 (본체 FK)
   * - 해당 역사국가에 재임 기록 (findPersonsWithTenureInCountry 역사 축)
   * - PersonCountryAffiliation.historicalCountryId 소속 (브리지 확장 없음 — 역사국가가 최종 축)
   */
  async findPersonsByHistoricalCountry(
    historicalCountryId: string,
  ): Promise<PersonResponseDto[]> {
    return this.mergePersonSources([
      this.personRepository.findPersonsByHistoricalCountryId(historicalCountryId),
      this.personRepository.findPersonsWithTenureInCountry({ historicalCountryId }),
      this.personRepository.findPersonsByAffiliationInHistoricalCountry(
        historicalCountryId,
      ),
    ])
  }

  /**
   * 국가 상세 "인물" 탭 — 현대 국가와 그 국가에 연결된 **과거(역사) 국가**의 인물을
   * 한 번에, 출처가 보이도록 나눠서 돌려준다.
   *
   * 왜 나눠서 주나: 단순 합집합이면 "이 사람이 조선 사람인지 대한민국 사람인지"가 사라진다.
   * 사용자가 국가 지면에서 기대하는 것은 그 구분이다.
   *
   * 중복 규칙 — **역사 우선**(국가↔역사국가 연결 규약 F8과 동일 방향).
   * 한 인물이 역사 축과 현대 축에 모두 걸리면 역사 그룹에만 남긴다. 그래야 '현대' 묶음이
   * 실제로 현대 국가 소속인 사람만 담는다. 역사국가를 여러 곳 걸친 인물은 각 그룹에 나온다
   * (재임을 실제로 여러 곳에서 한 것이므로 사실 그대로).
   */
  async findPersonsByCountryGrouped(countryId: string): Promise<{
    modern: PersonResponseDto[]
    historical: Array<{
      historicalCountryId: string
      historicalCountryName: string
      persons: PersonResponseDto[]
    }>
  }> {
    const linked = await this.personRepository.findLinkedHistoricalCountries(
      countryId,
    )
    const [modernAll, historicalGroups] = await Promise.all([
      this.findPersonsByCountry(countryId),
      this.personRepository.findPersonsByHistoricalCountryIdsGrouped(
        linked.map((item) => item.id),
      ),
    ])

    const historical = linked
      .map((item) => ({
        historicalCountryId: item.id,
        historicalCountryName: item.name,
        persons: historicalGroups.get(item.id) ?? [],
      }))
      .filter((group) => group.persons.length > 0)

    const inHistorical = new Set<string>()
    for (const group of historical) {
      for (const person of group.persons) inHistorical.add(person.id)
    }

    return {
      modern: modernAll.filter((person) => !inHistorical.has(person.id)),
      historical,
    }
  }

  /**
   * 소속 축별 인물 소스(본체 FK·재임·소속)를 id 기준 합집합.
   * 앞선 소스가 우선(중복 시 먼저 담긴 DTO 유지) — 현대/역사 축 공통 병합 로직.
   */
  private async mergePersonSources(
    sources: Array<Promise<PersonResponseDto[]>>,
  ): Promise<PersonResponseDto[]> {
    const lists = await Promise.all(sources)
    const byId = new Map<string, PersonResponseDto>()
    for (const list of lists) {
      for (const p of list) if (!byId.has(p.id)) byId.set(p.id, p)
    }
    return Array.from(byId.values())
  }

  /**
   * 가문에 소속된 인물 목록 (person.dynastyId 일치, 출생년·활동연대 부호 오름차순·미상은 뒤)
   */
  async findPersonsByDynasty(dynastyId: string): Promise<PersonResponseDto[]> {
    const list = await this.personRepository.findPersonsByDynastyId(dynastyId)
    const signedYear = (
      year: number | null | undefined,
      era: string | null | undefined,
    ): number | null => {
      if (year == null || !Number.isFinite(year)) return null
      return era === 'BC' ? -year : year
    }
    const rank = (p: PersonResponseDto): number => {
      const birth = signedYear(p.birthYear, p.birthEra)
      if (birth != null) return birth
      const floruit = signedYear(
        p.floruitStartYear ?? p.floruitEndYear,
        p.floruitEra,
      )
      if (floruit != null) return floruit
      const death = signedYear(p.deathYear, p.deathEra)
      if (death != null) return death
      return Number.MAX_SAFE_INTEGER
    }
    return [...list].sort((a, b) => {
      const d = rank(a) - rank(b)
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
   * 생부모(fatherId/motherId) 및 양부모(adoptiveFatherId/adoptiveMotherId) 4개 슬롯을 모두 검사한다.
   */
  private async assertNoParentCycle(
    id: string | null,
    fatherId?: string | null,
    motherId?: string | null,
    adoptiveFatherId?: string | null,
    adoptiveMotherId?: string | null,
  ): Promise<void> {
    if (fatherId === '') fatherId = undefined
    if (motherId === '') motherId = undefined
    if (adoptiveFatherId === '') adoptiveFatherId = undefined
    if (adoptiveMotherId === '') adoptiveMotherId = undefined

    if (id) {
      if (fatherId && fatherId === id)
        throw new BadRequestException('자기 자신을 아버지로 지정할 수 없습니다.')
      if (motherId && motherId === id)
        throw new BadRequestException('자기 자신을 어머니로 지정할 수 없습니다.')
      if (adoptiveFatherId && adoptiveFatherId === id)
        throw new BadRequestException('자기 자신을 양부로 지정할 수 없습니다.')
      if (adoptiveMotherId && adoptiveMotherId === id)
        throw new BadRequestException('자기 자신을 양모로 지정할 수 없습니다.')
    }

    const start = [fatherId, motherId, adoptiveFatherId, adoptiveMotherId].filter(
      (value): value is string => !!value,
    )
    if (start.length === 0) return

    let effectiveFather = fatherId
    let effectiveMother = motherId
    let effectiveAdoptiveFather = adoptiveFatherId
    let effectiveAdoptiveMother = adoptiveMotherId

    if (
      id &&
      (fatherId === undefined ||
        motherId === undefined ||
        adoptiveFatherId === undefined ||
        adoptiveMotherId === undefined)
    ) {
      const existing = await this.prisma.person.findUnique({
        where: { id },
        select: {
          fatherId: true,
          motherId: true,
          adoptiveFatherId: true,
          adoptiveMotherId: true,
        },
      })
      if (effectiveFather === undefined) effectiveFather = existing?.fatherId
      if (effectiveMother === undefined) effectiveMother = existing?.motherId
      if (effectiveAdoptiveFather === undefined) effectiveAdoptiveFather = existing?.adoptiveFatherId
      if (effectiveAdoptiveMother === undefined) effectiveAdoptiveMother = existing?.adoptiveMotherId
    }

    if (effectiveFather && effectiveMother && effectiveFather === effectiveMother) {
      throw new BadRequestException('아버지와 어머니를 같은 인물로 지정할 수 없습니다.')
    }
    if (
      effectiveAdoptiveFather &&
      effectiveAdoptiveMother &&
      effectiveAdoptiveFather === effectiveAdoptiveMother
    ) {
      throw new BadRequestException('양부와 양모를 같은 인물로 지정할 수 없습니다.')
    }
    const bioSet = new Set([effectiveFather, effectiveMother].filter((v): v is string => !!v))
    for (const adoptiveId of [effectiveAdoptiveFather, effectiveAdoptiveMother]) {
      if (adoptiveId && bioSet.has(adoptiveId)) {
        throw new BadRequestException('생부모와 양부모를 같은 인물로 중복 지정할 수 없습니다.')
      }
    }

    if (!id) return

    // 지정된 부모들의 조상 체인(생부모 + 양부모)을 위로 순회 — 도중에 id가 나오면 순환.
    const visited = new Set<string>()
    let frontier = start
    let depth = 0
    while (frontier.length > 0 && depth < 64) {
      const parents = await this.prisma.person.findMany({
        where: { id: { in: frontier } },
        select: {
          id: true,
          fatherId: true,
          motherId: true,
          adoptiveFatherId: true,
          adoptiveMotherId: true,
        },
      })
      const next: string[] = []
      for (const parent of parents) {
        for (const ancestorId of [
          parent.fatherId,
          parent.motherId,
          parent.adoptiveFatherId,
          parent.adoptiveMotherId,
        ]) {
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
   * 부모 슬롯 성별 정합성 검증 — 아버지/양부에 FEMALE, 어머니/양모에 MALE이 지정되는 것을 차단한다.
   */
  private async assertParentGenderConsistency(slots: {
    fatherId?: string | null
    motherId?: string | null
    adoptiveFatherId?: string | null
    adoptiveMotherId?: string | null
  }): Promise<void> {
    const ids = [
      slots.fatherId,
      slots.motherId,
      slots.adoptiveFatherId,
      slots.adoptiveMotherId,
    ].filter((v): v is string => !!v && v !== '')
    if (ids.length === 0) return

    const rows = await this.prisma.person.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, gender: true },
    })
    const genderById = new Map(rows.map((r) => [r.id, r.gender]))

    if (slots.fatherId && genderById.get(slots.fatherId) === 'FEMALE') {
      throw new BadRequestException('여성 인물을 아버지(친부)로 지정할 수 없습니다.')
    }
    if (slots.motherId && genderById.get(slots.motherId) === 'MALE') {
      throw new BadRequestException('남성 인물을 어머니(친모)로 지정할 수 없습니다.')
    }
    if (slots.adoptiveFatherId && genderById.get(slots.adoptiveFatherId) === 'FEMALE') {
      throw new BadRequestException('여성 인물을 양부로 지정할 수 없습니다.')
    }
    if (slots.adoptiveMotherId && genderById.get(slots.adoptiveMotherId) === 'MALE') {
      throw new BadRequestException('남성 인물을 양모로 지정할 수 없습니다.')
    }
  }

  /**
   * 역방향(Parent → Children) 성별 정합성 검증:
   * 이미 누군가의 아버지(친부·양부)로 등록된 인물을 FEMALE로 변경하거나,
   * 이미 어머니(친모·양모)로 등록된 인물을 MALE로 변경하는 것을 차단한다.
   */
  private async assertReverseParentGenderConsistency(
    personId: string,
    nextGender: string | null | undefined,
  ): Promise<void> {
    if (!nextGender) return
    const g = nextGender.toUpperCase()
    if (g === 'FEMALE') {
      const childAsFather = await this.prisma.person.findFirst({
        where: { OR: [{ fatherId: personId }, { adoptiveFatherId: personId }] },
        select: { id: true },
      })
      if (childAsFather) {
        throw new BadRequestException(
          '이미 아버지(친부 또는 양부)로 등록된 자녀가 있어 성별을 여성으로 변경할 수 없습니다.',
        )
      }
    } else if (g === 'MALE') {
      const childAsMother = await this.prisma.person.findFirst({
        where: { OR: [{ motherId: personId }, { adoptiveMotherId: personId }] },
        select: { id: true },
      })
      if (childAsMother) {
        throw new BadRequestException(
          '이미 어머니(친모 또는 양모)로 등록된 자녀가 있어 성별을 남성으로 변경할 수 없습니다.',
        )
      }
    }
  }

  private extractSignedYearFromDate(
    date: Date | null | undefined,
    era: string | null | undefined,
  ): number | null {
    if (!date) return null
    const y = date.getUTCFullYear()
    if (Number.isNaN(y)) return null
    return era === 'BC' ? -y : y
  }

  /**
   * 친부모(및 다세대 친생 직계 존속)–자녀(및 다세대 친생 직계 비속) 생몰 연도 선후 검증:
   * 1) 모든 친생 직계 존속(부모·조부모·증조부모 등)의 출생 연도는 본인의 출생 연도보다 엄격히 앞서야 한다.
   * 2) 본인의 출생 연도가 미상(null)이더라도, 친생 직계 존속의 최대 출생 연도는 기존 친생 직계 비속의 최소 출생 연도보다 앞서야 한다.
   * 3) 직접 친모의 사망 연도는 친자녀 출생 연도 이상이어야 하며, 직접 친부의 사망 연도(+1년 유복자 범위)는 친자녀 출생 연도 이상이어야 한다.
   */
  private async assertParentChildLifespanOrder(
    childBirthSignedYear: number | null,
    biologicalParents: {
      fatherId?: string | null
      motherId?: string | null
    },
    personId?: string | null,
  ): Promise<void> {
    const fatherId =
      biologicalParents.fatherId && biologicalParents.fatherId !== ''
        ? biologicalParents.fatherId
        : null
    const motherId =
      biologicalParents.motherId && biologicalParents.motherId !== ''
        ? biologicalParents.motherId
        : null
    const initialIds = [...new Set([fatherId, motherId].filter((v): v is string => !!v))]
    if (initialIds.length === 0) return

    const visitedAncestors = new Set<string>()
    let frontier = initialIds.filter((id) => id !== personId)
    let depth = 0
    let maxAncestorBirth: number | null = null

    while (frontier.length > 0 && depth < 64) {
      for (const pid of frontier) visitedAncestors.add(pid)
      const rows = await this.prisma.person.findMany({
        where: { id: { in: frontier } },
        select: {
          id: true,
          birthDate: true,
          birthEra: true,
          deathDate: true,
          deathEra: true,
          fatherId: true,
          motherId: true,
        },
      })
      const next: string[] = []
      for (const row of rows) {
        const ancBirthSigned = this.extractSignedYearFromDate(row.birthDate, row.birthEra)
        if (ancBirthSigned != null) {
          if (maxAncestorBirth == null || ancBirthSigned > maxAncestorBirth) {
            maxAncestorBirth = ancBirthSigned
          }
          if (childBirthSignedYear != null && ancBirthSigned >= childBirthSignedYear) {
            throw new BadRequestException(
              depth === 0
                ? '친부모의 출생 연도는 자녀의 출생 연도보다 앞서야 합니다.'
                : '친생 부모(조부모 등 직계 존속 포함)의 출생 연도는 자녀(후손)의 출생 연도보다 앞서야 합니다.',
            )
          }
        }
        if (depth === 0 && childBirthSignedYear != null) {
          const parentDeathSigned = this.extractSignedYearFromDate(row.deathDate, row.deathEra)
          if (parentDeathSigned != null) {
            if (row.id === motherId && parentDeathSigned < childBirthSignedYear) {
              throw new BadRequestException(
                '친모의 사망 연도는 친자녀의 출생 연도보다 이전일 수 없습니다.',
              )
            }
            if (row.id === fatherId && parentDeathSigned + 1 < childBirthSignedYear) {
              throw new BadRequestException(
                '친부의 사망 연도(+1년 유복자 범위) 이후에 출생한 인물을 친자녀로 지정할 수 없습니다.',
              )
            }
          }
        }
        for (const p of [row.fatherId, row.motherId]) {
          if (p && p !== personId && !visitedAncestors.has(p)) {
            next.push(p)
          }
        }
      }
      frontier = [...new Set(next)]
      depth += 1
    }

    // 본인 출생 연도가 미상(null)이거나 기존 인물에 친부모를 새로 연결할 때,
    // 기존 친생 비속(자녀·손자녀 등)의 출생 연도와 조상의 출생 연도 역전 여부도 함께 검증
    if (personId && maxAncestorBirth != null) {
      const visitedDesc = new Set<string>([personId])
      let descFrontier = [personId]
      let descDepth = 0
      while (descFrontier.length > 0 && descDepth < 64) {
        const children = await this.prisma.person.findMany({
          where: {
            OR: descFrontier.flatMap((pid) => [{ fatherId: pid }, { motherId: pid }]),
          },
          select: { id: true, birthDate: true, birthEra: true },
        })
        const nextDesc: string[] = []
        for (const c of children) {
          if (!c.id || visitedDesc.has(c.id)) continue
          visitedDesc.add(c.id)
          const descBirthSigned = this.extractSignedYearFromDate(c.birthDate, c.birthEra)
          if (descBirthSigned != null && maxAncestorBirth >= descBirthSigned) {
            throw new BadRequestException(
              '친생 부모(조부모 등 직계 존속 포함)의 출생 연도는 자녀(후손)의 출생 연도보다 앞서야 합니다.',
            )
          }
          nextDesc.push(c.id)
        }
        descFrontier = [...new Set(nextDesc)]
        descDepth += 1
      }
    }
  }

  /**
   * 역방향(Parent → Children/Descendants) 생몰 연도 선후 검증:
   * 1) 이미 친자녀(또는 친손자녀 등 다세대 친생 비속)가 등록된 인물의 출생 연도를 친생 비속의 출생 연도 이후(같거나 늦음)로 수정하는 것을 차단한다.
   * 2) 직접 친자녀가 있는 인물의 사망 연도를 친자녀 출생 연도 이전(친부는 +1년 유복자 범위 이전)으로 수정하는 것을 차단한다.
   */
  private async assertReverseParentChildLifespanOrder(
    personId: string,
    parentBirthSignedYear: number | null,
    parentDeathSignedYear?: number | null,
  ): Promise<void> {
    if (parentBirthSignedYear == null && parentDeathSignedYear == null) return

    const visited = new Set<string>([personId])
    let frontier = [personId]
    let depth = 0

    while (frontier.length > 0 && depth < 64) {
      const children = await this.prisma.person.findMany({
        where: {
          OR: frontier.flatMap((pid) => [{ fatherId: pid }, { motherId: pid }]),
        },
        select: {
          id: true,
          birthDate: true,
          birthEra: true,
          fatherId: true,
          motherId: true,
        },
      })
      const next: string[] = []
      for (const child of children) {
        if (!child.id || visited.has(child.id)) continue
        visited.add(child.id)
        const childSigned = this.extractSignedYearFromDate(child.birthDate, child.birthEra)
        if (childSigned != null) {
          if (parentBirthSignedYear != null && parentBirthSignedYear >= childSigned) {
            throw new BadRequestException(
              depth === 0
                ? '친부모의 출생 연도는 기존 친자녀의 출생 연도보다 앞서야 합니다.'
                : '친부모(조부모 등 직계 존속)의 출생 연도는 기존 친자녀(손자녀 등 직계 비속 포함)의 출생 연도보다 앞서야 합니다.',
            )
          }
          if (depth === 0 && parentDeathSignedYear != null) {
            if (child.motherId === personId && parentDeathSignedYear < childSigned) {
              throw new BadRequestException(
                '친모의 사망 연도는 기존 친자녀의 출생 연도보다 이전일 수 없습니다.',
              )
            }
            if (child.fatherId === personId && parentDeathSignedYear + 1 < childSigned) {
              throw new BadRequestException(
                '친부의 사망 연도(+1년 유복자 범위)는 기존 친자녀의 출생 연도보다 이전일 수 없습니다.',
              )
            }
          }
        }
        next.push(child.id)
      }
      frontier = [...new Set(next)]
      depth += 1
    }
  }

  /**
   * 초기 부모 ID 집합으로부터 최대 64세대까지 모든 직계 존속(생부모·양부모) ID를 수집한다.
   */
  private async collectLinealAncestorIds(
    initialParentIds: Array<string | null | undefined>,
    excludeSelfId?: string | null,
  ): Promise<Set<string>> {
    const ancestors = new Set<string>()
    let frontier = [
      ...new Set(
        initialParentIds.filter(
          (v): v is string => !!v && v !== '' && v !== excludeSelfId,
        ),
      ),
    ]
    let depth = 0
    while (frontier.length > 0 && depth < 64) {
      for (const pid of frontier) ancestors.add(pid)
      const rows = await this.prisma.person.findMany({
        where: { id: { in: frontier } },
        select: {
          id: true,
          fatherId: true,
          motherId: true,
          adoptiveFatherId: true,
          adoptiveMotherId: true,
        },
      })
      const next: string[] = []
      for (const r of rows) {
        for (const p of [r.fatherId, r.motherId, r.adoptiveFatherId, r.adoptiveMotherId]) {
          if (p && p !== excludeSelfId && !ancestors.has(p)) {
            next.push(p)
          }
        }
      }
      frontier = [...new Set(next)]
      depth += 1
    }
    return ancestors
  }

  /**
   * 기준 인물로부터 최대 64세대까지 모든 직계 비속(친자녀·양자녀·손자녀 등) ID를 수집한다.
   */
  private async collectLinealDescendantIds(rootId: string): Promise<Set<string>> {
    const descendants = new Set<string>()
    let frontier = [rootId]
    let depth = 0
    while (frontier.length > 0 && depth < 64) {
      const children = await this.prisma.person.findMany({
        where: {
          OR: frontier.flatMap((pid) => [
            { fatherId: pid },
            { motherId: pid },
            { adoptiveFatherId: pid },
            { adoptiveMotherId: pid },
          ]),
        },
        select: { id: true },
      })
      const next: string[] = []
      for (const c of children) {
        if (c.id && c.id !== rootId && !descendants.has(c.id)) {
          descendants.add(c.id)
          next.push(c.id)
        }
      }
      frontier = [...new Set(next)]
      depth += 1
    }
    return descendants
  }

  /**
   * 배우자 불변식 검증:
   * 1) 혼인 시작 연도 <= 혼인 종료 연도 (BC 부호연도 기준)
   * 2) 혼인 시작·종료 연도는 부부 양측의 생존 기간(출생 연도 이상 ~ 사망 연도 이하) 내에 있어야 함
   * 3) 직계 존비속(부모·양부모·조부모·자녀·양자녀·손자녀 등 다세대 직계) 및 2촌 형제자매를 배우자로 지정 불가
   */
  private async assertSpouseInvariants(
    ownerId: string | null,
    spouseRelations:
      | Array<{
          spouseId: string
          marriageStartDate?: Date | null
          marriageStartEra?: string | null
          marriageStartYear?: number | null
          marriageEndDate?: Date | null
          marriageEndEra?: string | null
          marriageEndYear?: number | null
        }>
      | undefined,
    effectiveParentIds: Array<string | null | undefined>,
    ownerLifespan?: {
      birthSigned: number | null
      deathSigned: number | null
    },
  ): Promise<void> {
    if (!spouseRelations || spouseRelations.length === 0) return
    const parentSet = new Set(effectiveParentIds.filter((v): v is string => !!v && v !== ''))
    const allAncestorSet = await this.collectLinealAncestorIds(effectiveParentIds, ownerId)

    const signedYearOf = (
      year?: number | null,
      date?: Date | null,
      era?: string | null,
    ): number | null => {
      const mag = year ?? (date ? date.getUTCFullYear() : null)
      if (mag == null || Number.isNaN(mag)) return null
      return era === 'BC' ? -mag : mag
    }

    const ownBirthSigned = ownerLifespan?.birthSigned ?? null
    const ownDeathSigned = ownerLifespan?.deathSigned ?? null

    const spouseIds: string[] = []
    for (const rel of spouseRelations) {
      if (!rel.spouseId) continue
      if (ownerId && rel.spouseId === ownerId) {
        throw new BadRequestException('자기 자신을 배우자로 지정할 수 없습니다.')
      }
      if (parentSet.has(rel.spouseId)) {
        throw new BadRequestException('부모(양부모 포함)를 배우자로 지정할 수 없습니다.')
      }
      if (allAncestorSet.has(rel.spouseId)) {
        throw new BadRequestException('직계 존속(조부모·증조부모 등)을 배우자로 지정할 수 없습니다.')
      }
      const startSigned = signedYearOf(
        rel.marriageStartYear,
        rel.marriageStartDate,
        rel.marriageStartEra,
      )
      const endSigned = signedYearOf(
        rel.marriageEndYear,
        rel.marriageEndDate,
        rel.marriageEndEra,
      )
      if (startSigned != null && endSigned != null && startSigned > endSigned) {
        throw new BadRequestException('혼인 시작 연도는 종료 연도보다 이전이거나 같아야 합니다.')
      }
      if (
        ownBirthSigned != null &&
        ((startSigned != null && startSigned < ownBirthSigned) ||
          (endSigned != null && endSigned < ownBirthSigned))
      ) {
        throw new BadRequestException(
          '혼인 시작·종료 연도는 부부 당사자의 출생 연도보다 이전일 수 없습니다.',
        )
      }
      if (
        ownDeathSigned != null &&
        ((startSigned != null && startSigned > ownDeathSigned) ||
          (endSigned != null && endSigned > ownDeathSigned))
      ) {
        throw new BadRequestException(
          '혼인 시작·종료 연도는 부부 당사자의 사망 연도보다 이후일 수 없습니다.',
        )
      }
      spouseIds.push(rel.spouseId)
    }

    if (spouseIds.length > 0) {
      const uniqueSpouseIds = [...new Set(spouseIds)]
      if (ownerId) {
        const childConflict = await this.prisma.person.findFirst({
          where: {
            id: { in: uniqueSpouseIds },
            OR: [
              { fatherId: ownerId },
              { motherId: ownerId },
              { adoptiveFatherId: ownerId },
              { adoptiveMotherId: ownerId },
            ],
          },
          select: { id: true },
        })
        if (childConflict) {
          throw new BadRequestException('자녀(양자녀 포함)를 배우자로 지정할 수 없습니다.')
        }
      }

      // 배우자 후보들의 부모·양부모 및 생몰 연도 조회:
      // 1) 본인의 유효 부모(parentSet)와 하나라도 겹치면 2촌 형제자매(친형제·이복/이부형제·입양형제)이므로 차단
      // 2) 다세대 직계 비속(손자녀·증손자녀 등) 여부 검증 — 배우자 후보들의 조상 체인에 ownerId가 등장하면 직계 비속
      // 3) 혼인 시작·종료 연도가 배우자 후보의 출생 연도 이전이거나 사망 연도 이후인지 검증
      const spouseRows = await this.prisma.person.findMany({
        where: { id: { in: uniqueSpouseIds } },
        select: {
          id: true,
          fatherId: true,
          motherId: true,
          adoptiveFatherId: true,
          adoptiveMotherId: true,
          birthDate: true,
          birthEra: true,
          deathDate: true,
          deathEra: true,
        },
      })
      const spouseById = new Map(spouseRows.map((s) => [s.id, s]))
      const spouseParentFrontier: Array<string | null | undefined> = []
      for (const s of spouseRows) {
        if (
          ownerId &&
          (s.fatherId === ownerId ||
            s.motherId === ownerId ||
            s.adoptiveFatherId === ownerId ||
            s.adoptiveMotherId === ownerId)
        ) {
          throw new BadRequestException('자녀(양자녀 포함)를 배우자로 지정할 수 없습니다.')
        }
        const sParents = [
          s.fatherId,
          s.motherId,
          s.adoptiveFatherId,
          s.adoptiveMotherId,
        ].filter((v): v is string => !!v && v !== '')
        if (parentSet.size > 0 && sParents.some((pid) => parentSet.has(pid))) {
          throw new BadRequestException(
            '형제자매(이복·이부·입양형제 포함)를 배우자로 지정할 수 없습니다.',
          )
        }
        spouseParentFrontier.push(
          s.fatherId,
          s.motherId,
          s.adoptiveFatherId,
          s.adoptiveMotherId,
        )
      }
      for (const rel of spouseRelations) {
        if (!rel.spouseId) continue
        const sp = spouseById.get(rel.spouseId)
        if (!sp) continue
        const startSigned = signedYearOf(
          rel.marriageStartYear,
          rel.marriageStartDate,
          rel.marriageStartEra,
        )
        const endSigned = signedYearOf(
          rel.marriageEndYear,
          rel.marriageEndDate,
          rel.marriageEndEra,
        )
        if (startSigned == null && endSigned == null) continue
        const spBirthSigned = this.extractSignedYearFromDate(sp.birthDate, sp.birthEra)
        const spDeathSigned = this.extractSignedYearFromDate(sp.deathDate, sp.deathEra)
        if (
          spBirthSigned != null &&
          ((startSigned != null && startSigned < spBirthSigned) ||
            (endSigned != null && endSigned < spBirthSigned))
        ) {
          throw new BadRequestException(
            '혼인 시작·종료 연도는 부부 당사자의 출생 연도보다 이전일 수 없습니다.',
          )
        }
        if (
          spDeathSigned != null &&
          ((startSigned != null && startSigned > spDeathSigned) ||
            (endSigned != null && endSigned > spDeathSigned))
        ) {
          throw new BadRequestException(
            '혼인 시작·종료 연도는 부부 당사자의 사망 연도보다 이후일 수 없습니다.',
          )
        }
      }
      if (ownerId) {
        const spouseAncestors = await this.collectLinealAncestorIds(spouseParentFrontier)
        if (spouseAncestors.has(ownerId)) {
          throw new BadRequestException(
            '직계 비속(손자녀·증손자녀 등)을 배우자로 지정할 수 없습니다.',
          )
        }
      }
    }
  }

  /**
   * 역방향(Person Lifespan → Existing Marriages) 생몰 연도–혼인 기간 정합성 검증:
   * 이미 혼인 시작·종료 연도가 기록된 배우자 관계가 있을 때, 본인의 출생 연도를 혼인 연도 이후로 수정하거나
   * 사망 연도를 혼인 연도 이전으로 수정하는 것을 차단한다.
   */
  private async assertReverseSpouseMarriageLifespanOrder(
    personId: string,
    birthSigned: number | null,
    deathSigned: number | null,
  ): Promise<void> {
    if (birthSigned == null && deathSigned == null) return
    const rows = await this.prisma.personSpouse.findMany({
      where: {
        OR: [{ personId }, { spouseId: personId }],
      },
      select: {
        marriageStartYear: true,
        marriageStartDate: true,
        marriageStartEra: true,
        marriageEndYear: true,
        marriageEndDate: true,
        marriageEndEra: true,
      },
    })
    const signedYearOf = (
      year?: number | null,
      date?: Date | null,
      era?: string | null,
    ): number | null => {
      const mag = year ?? (date ? date.getUTCFullYear() : null)
      if (mag == null || Number.isNaN(mag)) return null
      return era === 'BC' ? -mag : mag
    }
    for (const r of rows) {
      const startSigned = signedYearOf(
        r.marriageStartYear,
        r.marriageStartDate,
        r.marriageStartEra,
      )
      const endSigned = signedYearOf(
        r.marriageEndYear,
        r.marriageEndDate,
        r.marriageEndEra,
      )
      if (
        birthSigned != null &&
        ((startSigned != null && startSigned < birthSigned) ||
          (endSigned != null && endSigned < birthSigned))
      ) {
        throw new BadRequestException(
          '출생 연도는 기존 혼인 관계의 시작·종료 연도보다 이후일 수 없습니다.',
        )
      }
      if (
        deathSigned != null &&
        ((startSigned != null && startSigned > deathSigned) ||
          (endSigned != null && endSigned > deathSigned))
      ) {
        throw new BadRequestException(
          '사망 연도는 기존 혼인 관계의 시작·종료 연도보다 이전일 수 없습니다.',
        )
      }
    }
  }

  /**
   * 양방향 배우자–직계 존비속 및 2촌 형제자매 충돌 방지:
   * 1) 이미 배우자로 등록된 인물을 부모(양부모·조부모 포함)로 지정하거나 자녀(손자녀 포함)로 지정하는 것을 차단한다.
   * 2) 부모(양부모 포함) 지정으로 인해 기존 배우자와 부모를 공유하는 2촌 형제자매가 되는 것을 차단한다.
   */
  private async assertParentsNotExistingSpouses(
    personId: string,
    parentIds: Array<string | null | undefined>,
    overrideSpouseIds?: string[],
  ): Promise<void> {
    const validParentIds = [...new Set(parentIds.filter((v): v is string => !!v && v !== ''))]
    if (validParentIds.length === 0) return
    const validParentSet = new Set(validParentIds)
    const allAncestorIds = await this.collectLinealAncestorIds(validParentIds, personId)
    if (allAncestorIds.size === 0) return
    const descendantIds = await this.collectLinealDescendantIds(personId)
    const ancestorList = [...allAncestorIds]

    // 본인의 기존(또는 동시에 수정되는) 배우자 집합 계산
    let existingSpouseIds: string[]
    if (overrideSpouseIds !== undefined) {
      existingSpouseIds = [
        ...new Set(overrideSpouseIds.filter((sid): sid is string => Boolean(sid) && sid !== personId)),
      ]
      if (existingSpouseIds.some((sid) => allAncestorIds.has(sid))) {
        throw new BadRequestException(
          '이미 배우자로 등록된 인물을 부모(양부모 포함) 또는 자녀로 지정할 수 없습니다.',
        )
      }
    } else {
      const directSpouseRows = await this.prisma.personSpouse.findMany({
        where: {
          OR: [{ personId }, { spouseId: personId }],
        },
        select: { personId: true, spouseId: true },
      })
      existingSpouseIds = [
        ...new Set(
          directSpouseRows
            .map((r) => (r.personId === personId ? r.spouseId : r.personId))
            .filter((sid): sid is string => Boolean(sid) && sid !== personId),
        ),
      ]
    }

    // overrideSpouseIds가 지정된 경우 본인(personId)의 배우자는 새 배열(existingSpouseIds)로 검증했으므로
    // DB 조회에서는 직계 비속(descendantIds)만 검사해, 삭제 예정인 구 배우자 행을 부모로 재지정할 때의 오탐을 방지한다.
    const dbCheckTargetIds =
      overrideSpouseIds !== undefined ? [...descendantIds] : [personId, ...descendantIds]
    if (dbCheckTargetIds.length > 0) {
      const spouseConflict = await this.prisma.personSpouse.findFirst({
        where: {
          OR: dbCheckTargetIds.flatMap((descId) => [
            { personId: descId, spouseId: { in: ancestorList } },
            { spouseId: descId, personId: { in: ancestorList } },
          ]),
        },
        select: { id: true },
      })
      if (spouseConflict) {
        throw new BadRequestException(
          '이미 배우자로 등록된 인물을 부모(양부모 포함) 또는 자녀로 지정할 수 없습니다.',
        )
      }
    }
    if (existingSpouseIds.length > 0) {
      const existingSpousePersons = await this.prisma.person.findMany({
        where: { id: { in: existingSpouseIds } },
        select: {
          id: true,
          fatherId: true,
          motherId: true,
          adoptiveFatherId: true,
          adoptiveMotherId: true,
        },
      })
      for (const sp of existingSpousePersons) {
        const spParents = [
          sp.fatherId,
          sp.motherId,
          sp.adoptiveFatherId,
          sp.adoptiveMotherId,
        ].filter((v): v is string => !!v && v !== '')
        if (spParents.some((pid) => validParentSet.has(pid))) {
          throw new BadRequestException(
            '이미 배우자로 등록된 인물과 동일한 부모(양부모 포함)를 지정하여 형제자매가 되게 할 수 없습니다.',
          )
        }
      }
    }
  }

  /**
   * 생몰 연도 역전 방지 — 출생이 사망보다 뒤면 거부. BC 부호연도(BC=음수)로 비교하며
   * 네이티브 Date 대소 비교는 쓰지 않는다(BC가 AD로 둔갑). 모달의 클라이언트 검증
   * (computeBirthDeathErrors)이 인라인 편집·가계도 저작 등 비모달 쓰기 경로에서는 우회되므로
   * 도메인 계층에 서버 가드를 둔다(자기부모 가드 assertNoParentCycle와 동일 위치·정책).
   * date: null=명시적 해제, undefined=변경 없음(기존 유지), Date=새 값.
   */
  private computeSignedLifespanYears(
    birthDate: Date | null | undefined,
    birthEra: 'BC' | 'AD' | null | undefined,
    deathDate: Date | null | undefined,
    deathEra: 'BC' | 'AD' | null | undefined,
    existing?: {
      birthEra?: string | null
      birthYear?: number | null
      deathEra?: string | null
      deathYear?: number | null
    },
  ): { birthSigned: number | null; deathSigned: number | null } {
    const signedYear = (
      date: Date | null | undefined,
      era: 'BC' | 'AD' | null | undefined,
      exEra?: string | null,
      exYear?: number | null,
    ): number | null => {
      if (date === null) return null
      if (date !== undefined) {
        const year = date.getUTCFullYear()
        const useEra = era ?? exEra
        return useEra === 'BC' ? -year : year
      }
      if (exYear == null) return null
      return exEra === 'BC' ? -exYear : exYear
    }
    return {
      birthSigned: signedYear(birthDate, birthEra, existing?.birthEra, existing?.birthYear),
      deathSigned: signedYear(deathDate, deathEra, existing?.deathEra, existing?.deathYear),
    }
  }

  private assertLifespanOrder(
    birthDate: Date | null | undefined,
    birthEra: 'BC' | 'AD' | null | undefined,
    deathDate: Date | null | undefined,
    deathEra: 'BC' | 'AD' | null | undefined,
    existing?: {
      birthEra?: string | null
      birthYear?: number | null
      deathEra?: string | null
      deathYear?: number | null
    },
  ): { birthSigned: number | null; deathSigned: number | null } {
    const { birthSigned, deathSigned } = this.computeSignedLifespanYears(
      birthDate,
      birthEra,
      deathDate,
      deathEra,
      existing,
    )
    if (birthSigned != null && deathSigned != null && birthSigned > deathSigned) {
      throw new BadRequestException('출생 연도는 사망 연도보다 이전이거나 같아야 합니다.')
    }
    return { birthSigned, deathSigned }
  }

  /**
   * 인물 생성 (accountId 있으면 소유자로 저장)
   */
  async create(data: CreatePersonData, accountId?: string): Promise<PersonResponseDto> {
    const { birthSigned, deathSigned } = this.assertLifespanOrder(
      data.birthDate,
      data.birthEra,
      data.deathDate,
      data.deathEra,
    )
    await this.assertNoParentCycle(
      null,
      data.fatherId,
      data.motherId,
      data.adoptiveFatherId,
      data.adoptiveMotherId,
    )
    await this.assertParentGenderConsistency({
      fatherId: data.fatherId,
      motherId: data.motherId,
      adoptiveFatherId: data.adoptiveFatherId,
      adoptiveMotherId: data.adoptiveMotherId,
    })
    await this.assertParentChildLifespanOrder(
      birthSigned,
      { fatherId: data.fatherId, motherId: data.motherId },
      null,
    )
    await this.assertSpouseInvariants(
      null,
      data.spouseRelations,
      [
        data.fatherId,
        data.motherId,
        data.adoptiveFatherId,
        data.adoptiveMotherId,
      ],
      { birthSigned, deathSigned },
    )
    const createData = accountId != null ? { ...data, accountId } : data
    const person = await this.personRepository.create(createData)
    // 커밋 이후 부수효과(알림)는 저장 성공과 독립 — 예외가 나도 저장 성공을 실패로
    // 오보하지 않게 격리(로깅만). 클라의 dirty 기준선·중복 저장 오염 방지.
    try {
      await this.notificationService.notifyPerson(
        personDisplayName(person),
        EventMethod.CREATE,
        person.id,
        yearRangePreview(person.birthEra, person.birthYear, person.deathEra, person.deathYear),
      )
    } catch (err) {
      console.error('[person.create] 알림 발행 실패(무시):', err)
    }
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
    // 부모 지정 시 자기부모·조상 순환·성별 정합성 방지
    if (
      data.fatherId != null ||
      data.motherId != null ||
      data.adoptiveFatherId != null ||
      data.adoptiveMotherId != null
    ) {
      await this.assertNoParentCycle(
        id,
        data.fatherId,
        data.motherId,
        data.adoptiveFatherId,
        data.adoptiveMotherId,
      )
      await this.assertParentGenderConsistency({
        fatherId: data.fatherId,
        motherId: data.motherId,
        adoptiveFatherId: data.adoptiveFatherId,
        adoptiveMotherId: data.adoptiveMotherId,
      })
    }
    // 수정 후 유효 생몰(변경분 ?? 기존)로 역전 검증 — 한쪽만 바꿔도 잔존값과 비교.
    const { birthSigned, deathSigned } = this.assertLifespanOrder(
      data.birthDate,
      data.birthEra,
      data.deathDate,
      data.deathEra,
      {
        birthEra: existing.birthEra,
        birthYear: existing.birthYear,
        deathEra: existing.deathEra,
        deathYear: existing.deathYear,
      },
    )
    const resolveEffectiveFk = (
      incoming: string | null | undefined,
      current: string | null | undefined,
    ): string | null | undefined => {
      if (incoming === undefined) return current
      return incoming === '' || incoming === null ? null : incoming
    }
    const effectiveFatherId = resolveEffectiveFk(data.fatherId, existing.fatherId)
    const effectiveMotherId = resolveEffectiveFk(data.motherId, existing.motherId)
    const effectiveAdoptiveFatherId = resolveEffectiveFk(
      data.adoptiveFatherId,
      existing.adoptiveFatherId,
    )
    const effectiveAdoptiveMotherId = resolveEffectiveFk(
      data.adoptiveMotherId,
      existing.adoptiveMotherId,
    )

    if (data.gender !== undefined) {
      await this.assertReverseParentGenderConsistency(id, data.gender)
    }

    if (
      data.fatherId !== undefined ||
      data.motherId !== undefined ||
      data.birthDate !== undefined ||
      data.birthEra !== undefined
    ) {
      await this.assertParentChildLifespanOrder(
        birthSigned,
        { fatherId: effectiveFatherId, motherId: effectiveMotherId },
        id,
      )
    }
    if (
      data.birthDate !== undefined ||
      data.birthEra !== undefined ||
      data.deathDate !== undefined ||
      data.deathEra !== undefined
    ) {
      await this.assertReverseParentChildLifespanOrder(id, birthSigned, deathSigned)
    }
    if (data.spouseRelations !== undefined) {
      await this.assertSpouseInvariants(
        id,
        data.spouseRelations,
        [
          effectiveFatherId,
          effectiveMotherId,
          effectiveAdoptiveFatherId,
          effectiveAdoptiveMotherId,
        ],
        { birthSigned, deathSigned },
      )
    } else if (
      data.birthDate !== undefined ||
      data.birthEra !== undefined ||
      data.deathDate !== undefined ||
      data.deathEra !== undefined
    ) {
      await this.assertReverseSpouseMarriageLifespanOrder(id, birthSigned, deathSigned)
    }
    if (
      data.fatherId !== undefined ||
      data.motherId !== undefined ||
      data.adoptiveFatherId !== undefined ||
      data.adoptiveMotherId !== undefined
    ) {
      await this.assertParentsNotExistingSpouses(
        id,
        [
          effectiveFatherId,
          effectiveMotherId,
          effectiveAdoptiveFatherId,
          effectiveAdoptiveMotherId,
        ],
        data.spouseRelations !== undefined
          ? data.spouseRelations.map((r) => r.spouseId)
          : undefined,
      )
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
    // 커밋 이후 알림은 저장 성공과 독립 — 예외를 격리해 저장 성공이 프론트에 실패로
    // 오보되지 않게(전기 자동저장 dirty 기준선 오염·중복 알림 방지). 로깅만.
    try {
      await this.notificationService.notifyPerson(
        personDisplayName(person),
        change.method,
        person.id,
        preview,
        change.subResourceType,
      )
    } catch (err) {
      console.error('[person.update] 알림 발행 실패(무시):', err)
    }
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
   * 전용 가족 관계 연결 Use-Case (`POST /persons/:id/family/links`).
   * `PUT /persons/:id` 전체 배열 재전송이나 클라이언트 측 타 인물 FK 우회 수정을 대체하는 원자적 도메인 명령.
   */
  async linkFamilyMember(
    personId: string,
    dto: LinkPersonFamilyDto,
    accountId?: string,
  ): Promise<PersonResponseDto> {
    if (!dto.targetId || dto.targetId === personId) {
      throw new BadRequestException('자기 자신을 가족으로 연결할 수 없습니다.')
    }
    const ego = await this.personRepository.findById(personId, accountId)
    if (!ego) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 수정할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${personId})`)
    }
    const target = await this.personRepository.findById(dto.targetId)
    if (!target) {
      throw new NotFoundException(`대상 인물을 찾을 수 없습니다 (ID: ${dto.targetId})`)
    }

    if (
      dto.kind === 'father' ||
      dto.kind === 'mother' ||
      dto.kind === 'adoptiveFather' ||
      dto.kind === 'adoptiveMother'
    ) {
      const slotMap = {
        father: 'fatherId',
        mother: 'motherId',
        adoptiveFather: 'adoptiveFatherId',
        adoptiveMother: 'adoptiveMotherId',
      } as const
      const slot = slotMap[dto.kind]
      await this.update(personId, { [slot]: dto.targetId }, accountId)
      return this.findById(personId, accountId)
    }

    if (dto.kind === 'spouse') {
      const startMapped =
        dto.marriageStart !== undefined && dto.marriageStart !== null
          ? mapStructuredDateInput(dto.marriageStart, undefined)
          : undefined
      const endMapped =
        dto.marriageEnd !== undefined && dto.marriageEnd !== null
          ? mapStructuredDateInput(dto.marriageEnd, undefined)
          : undefined
      const startSide =
        dto.marriageStart !== undefined
          ? dto.marriageStart === null || dto.marriageStart.year == null
            ? { date: null, era: null, year: null, month: null, day: null, precision: null }
            : {
                date: startMapped?.date ?? null,
                era: startMapped?.era ?? null,
                year: dto.marriageStart.year ?? null,
                month: dto.marriageStart.month ?? null,
                day: dto.marriageStart.day ?? null,
                precision: startMapped?.precision ?? null,
              }
          : undefined
      const endSide =
        dto.marriageEnd !== undefined
          ? dto.marriageEnd === null || dto.marriageEnd.year == null
            ? { date: null, era: null, year: null, month: null, day: null, precision: null }
            : {
                date: endMapped?.date ?? null,
                era: endMapped?.era ?? null,
                year: dto.marriageEnd.year ?? null,
                month: dto.marriageEnd.month ?? null,
                day: dto.marriageEnd.day ?? null,
                precision: endMapped?.precision ?? null,
              }
          : undefined
      const egoLifespan = this.computeSignedLifespanYears(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          birthEra: ego.birthEra,
          birthYear: ego.birthYear,
          deathEra: ego.deathEra,
          deathYear: ego.deathYear,
        },
      )
      await this.assertSpouseInvariants(
        personId,
        [
          {
            spouseId: dto.targetId,
            marriageStartDate: startSide?.date ?? startMapped?.date,
            marriageStartEra: startSide?.era ?? startMapped?.era,
            marriageStartYear: startSide?.year ?? startMapped?.year,
            marriageEndDate: endSide?.date ?? endMapped?.date,
            marriageEndEra: endSide?.era ?? endMapped?.era,
            marriageEndYear: endSide?.year ?? endMapped?.year,
          },
        ],
        [ego.fatherId, ego.motherId, ego.adoptiveFatherId, ego.adoptiveMotherId],
        egoLifespan,
      )
      const [pairPersonId, pairSpouseId] =
        personId < dto.targetId ? [personId, dto.targetId] : [dto.targetId, personId]
      const rank = dto.marriageRank ?? null
      const isAsymmetricRank =
        rank === 'PRIMARY' || rank === 'SECONDARY' || rank === 'CONCUBINE'
      const egoGender = (ego.gender ?? '').toUpperCase()
      const targetGender = (target.gender ?? '').toUpperCase()
      const defaultHolderId =
        (egoGender === 'FEMALE' && targetGender !== 'FEMALE') ||
        (targetGender === 'MALE' && egoGender !== 'MALE')
          ? personId
          : dto.targetId
      const isValidCoupleHolder =
        dto.rankHolderId === personId || dto.rankHolderId === dto.targetId
      const sanitizedDtoHolderId = isValidCoupleHolder
        ? dto.rankHolderId!
        : dto.rankHolderId === null
          ? null
          : undefined
      const resolvedRankHolderId =
        sanitizedDtoHolderId !== undefined
          ? sanitizedDtoHolderId
          : isAsymmetricRank
            ? defaultHolderId
            : null

      await this.prisma.$transaction(async (tx) => {
        const existingRows = await tx.personSpouse.findMany({
          where: {
            OR: [
              { personId: pairPersonId, spouseId: pairSpouseId },
              { personId: pairSpouseId, spouseId: pairPersonId },
            ],
          },
          select: { id: true, personId: true, spouseId: true, marriageRank: true, rankHolderId: true },
        })
        let marriageId: string
        if (existingRows.length > 0) {
          const primaryRow =
            existingRows.find(
              (r) => r.personId === pairPersonId && r.spouseId === pairSpouseId,
            ) ?? existingRows[0]
          marriageId = primaryRow.id
          const duplicateIds = existingRows
            .filter((r) => r.id !== primaryRow.id)
            .map((r) => r.id)
          if (duplicateIds.length > 0) {
            await tx.person.updateMany({
              where: { parentMarriageId: { in: duplicateIds } },
              data: { parentMarriageId: marriageId },
            })
            await tx.personSpouse.deleteMany({
              where: { id: { in: duplicateIds } },
            })
          }
          await tx.personSpouse.update({
            where: { id: primaryRow.id },
            data: {
              personId: pairPersonId,
              spouseId: pairSpouseId,
              ...(dto.marriageRank !== undefined ? { marriageRank: rank as any } : {}),
              ...(dto.marriageEndReason !== undefined
                ? { marriageEndReason: (dto.marriageEndReason ?? null) as any }
                : {}),
              ...(dto.rankHolderId !== undefined || dto.marriageRank !== undefined
                ? { rankHolderId: resolvedRankHolderId }
                : {}),
              ...(startSide !== undefined
                ? {
                    marriageStartDate: startSide.date,
                    marriageStartEra: startSide.era as any,
                    marriageStartYear: startSide.year,
                    marriageStartMonth: startSide.month,
                    marriageStartDay: startSide.day,
                    marriageStartPrecision: startSide.precision,
                  }
                : {}),
              ...(endSide !== undefined
                ? {
                    marriageEndDate: endSide.date,
                    marriageEndEra: endSide.era as any,
                    marriageEndYear: endSide.year,
                    marriageEndMonth: endSide.month,
                    marriageEndDay: endSide.day,
                    marriageEndPrecision: endSide.precision,
                  }
                : {}),
              ...(dto.note !== undefined ? { note: dto.note ?? null } : {}),
            },
          })
        } else {
          const created = await tx.personSpouse.create({
            data: {
              personId: pairPersonId,
              spouseId: pairSpouseId,
              marriageRank: rank as any,
              marriageEndReason: (dto.marriageEndReason ?? null) as any,
              rankHolderId: resolvedRankHolderId,
              marriageStartDate: startSide?.date ?? null,
              marriageStartEra: (startSide?.era ?? null) as any,
              marriageStartYear: startSide?.year ?? null,
              marriageStartMonth: startSide?.month ?? null,
              marriageStartDay: startSide?.day ?? null,
              marriageStartPrecision: startSide?.precision ?? null,
              marriageEndDate: endSide?.date ?? null,
              marriageEndEra: (endSide?.era ?? null) as any,
              marriageEndYear: endSide?.year ?? null,
              marriageEndMonth: endSide?.month ?? null,
              marriageEndDay: endSide?.day ?? null,
              marriageEndPrecision: endSide?.precision ?? null,
              note: dto.note ?? null,
            },
          })
          marriageId = created.id
        }
        await tx.person.updateMany({
          where: {
            OR: [
              { fatherId: pairPersonId, motherId: pairSpouseId },
              { fatherId: pairSpouseId, motherId: pairPersonId },
            ],
            NOT: { parentMarriageId: marriageId },
          },
          data: { parentMarriageId: marriageId },
        })
        await tx.person.updateMany({
          where: { id: { in: [personId, dto.targetId] } },
          data: { updatedAt: new Date() },
        })
      })
      const updated = await this.findById(personId, accountId)
      try {
        await this.notificationService.notifyPerson(
          personDisplayName(updated),
          EventMethod.UPDATE,
          updated.id,
          '배우자 관계 추가',
        )
      } catch (err) {
        console.error('[person.linkFamilyMember:spouse] 알림 발행 실패(무시):', err)
      }
      return updated
    }

    if (dto.kind === 'child') {
      let parentSlot: 'fatherId' | 'motherId' | 'adoptiveFatherId' | 'adoptiveMotherId'
      if (dto.explicitParentSlot) {
        parentSlot = dto.explicitParentSlot
      } else if (dto.parentSlot) {
        parentSlot = dto.isAdoptive
          ? dto.parentSlot === 'mother'
            ? 'adoptiveMotherId'
            : 'adoptiveFatherId'
          : dto.parentSlot === 'mother'
            ? 'motherId'
            : 'fatherId'
      } else if (dto.isAdoptive) {
        if (ego.gender === 'FEMALE') parentSlot = 'adoptiveMotherId'
        else if (ego.gender === 'MALE') parentSlot = 'adoptiveFatherId'
        else {
          throw new BadRequestException(
            '성별이 지정되지 않은 인물의 양자녀를 추가할 때는 부모 역할(양부/양모)을 명시해야 합니다.',
          )
        }
      } else {
        if (ego.gender === 'FEMALE') parentSlot = 'motherId'
        else if (ego.gender === 'MALE') parentSlot = 'fatherId'
        else {
          throw new BadRequestException(
            '성별이 지정되지 않은 인물의 자녀를 추가할 때는 부모 역할(친부/친모)을 명시해야 합니다.',
          )
        }
      }

      const childUpdate: UpdatePersonData = { [parentSlot]: personId }
      if (dto.otherParentId) {
        if (dto.isAdoptive) {
          const otherAdoptSlot =
            parentSlot === 'adoptiveFatherId' ? 'adoptiveMotherId' : 'adoptiveFatherId'
          childUpdate[otherAdoptSlot] = dto.otherParentId
        } else {
          const otherSlot = parentSlot === 'fatherId' ? 'motherId' : 'fatherId'
          childUpdate[otherSlot] = dto.otherParentId
        }
      }
      if (dto.birthOrder !== undefined) childUpdate.birthOrder = dto.birthOrder
      if (dto.genderBirthOrder !== undefined) childUpdate.genderBirthOrder = dto.genderBirthOrder

      await this.update(dto.targetId, childUpdate, accountId)
      return this.findById(personId, accountId)
    }

    if (dto.kind === 'sibling') {
      const existingMarriage = await this.prisma.personSpouse.findFirst({
        where: {
          OR: [
            { personId, spouseId: dto.targetId },
            { personId: dto.targetId, spouseId: personId },
          ],
        },
        select: { id: true },
      })
      if (existingMarriage) {
        throw new BadRequestException(
          '이미 배우자로 등록된 인물을 형제자매로 연결할 수 없습니다.',
        )
      }
      const lineage = dto.siblingLineage ?? 'FULL'
      const sharedFather = ego.fatherId ?? target.fatherId ?? null
      const sharedMother = ego.motherId ?? target.motherId ?? null

      if (lineage === 'ADOPTIVE') {
        const hasEgoAdopt = Boolean(ego.adoptiveFatherId || ego.adoptiveMotherId)
        const hasTargetAdopt = Boolean(target.adoptiveFatherId || target.adoptiveMotherId)
        const hasEgoBio = Boolean(ego.fatherId || ego.motherId)
        const hasTargetBio = Boolean(target.fatherId || target.motherId)
        if (!hasEgoAdopt && !hasTargetAdopt && !hasEgoBio && !hasTargetBio) {
          throw new BadRequestException(
            '입양형제로 연결하려면 두 인물 중 최소 한 명에게 부모(양부모 또는 친부모)가 등록되어 있어야 합니다.',
          )
        }
        const egoPatch: UpdatePersonData = {}
        const targetPatch: UpdatePersonData = {}
        if (hasEgoAdopt) {
          if (ego.adoptiveFatherId && target.adoptiveFatherId !== ego.adoptiveFatherId && target.fatherId !== ego.adoptiveFatherId) {
            targetPatch.adoptiveFatherId = ego.adoptiveFatherId
          }
          if (ego.adoptiveMotherId && target.adoptiveMotherId !== ego.adoptiveMotherId && target.motherId !== ego.adoptiveMotherId) {
            targetPatch.adoptiveMotherId = ego.adoptiveMotherId
          }
        } else if (hasTargetAdopt) {
          if (target.adoptiveFatherId && ego.adoptiveFatherId !== target.adoptiveFatherId && ego.fatherId !== target.adoptiveFatherId) {
            egoPatch.adoptiveFatherId = target.adoptiveFatherId
          }
          if (target.adoptiveMotherId && ego.adoptiveMotherId !== target.adoptiveMotherId && ego.motherId !== target.adoptiveMotherId) {
            egoPatch.adoptiveMotherId = target.adoptiveMotherId
          }
        } else if (hasEgoBio) {
          if (
            ego.fatherId &&
            target.adoptiveFatherId !== ego.fatherId &&
            target.fatherId !== ego.fatherId
          ) {
            targetPatch.adoptiveFatherId = ego.fatherId
          }
          if (
            ego.motherId &&
            target.adoptiveMotherId !== ego.motherId &&
            target.motherId !== ego.motherId
          ) {
            targetPatch.adoptiveMotherId = ego.motherId
          }
        } else if (hasTargetBio) {
          if (
            target.fatherId &&
            ego.adoptiveFatherId !== target.fatherId &&
            ego.fatherId !== target.fatherId
          ) {
            egoPatch.adoptiveFatherId = target.fatherId
          }
          if (
            target.motherId &&
            ego.adoptiveMotherId !== target.motherId &&
            ego.motherId !== target.motherId
          ) {
            egoPatch.adoptiveMotherId = target.motherId
          }
        }
        const nextEgoAdoptF =
          egoPatch.adoptiveFatherId !== undefined ? egoPatch.adoptiveFatherId : ego.adoptiveFatherId
        const nextEgoAdoptM =
          egoPatch.adoptiveMotherId !== undefined ? egoPatch.adoptiveMotherId : ego.adoptiveMotherId
        const nextTargetAdoptF =
          targetPatch.adoptiveFatherId !== undefined
            ? targetPatch.adoptiveFatherId
            : target.adoptiveFatherId
        const nextTargetAdoptM =
          targetPatch.adoptiveMotherId !== undefined
            ? targetPatch.adoptiveMotherId
            : target.adoptiveMotherId
        const sharesAdoptiveAxis = Boolean(
          (nextEgoAdoptF &&
            (nextEgoAdoptF === nextTargetAdoptF || nextEgoAdoptF === target.fatherId)) ||
            (nextEgoAdoptM &&
              (nextEgoAdoptM === nextTargetAdoptM || nextEgoAdoptM === target.motherId)) ||
            (nextTargetAdoptF && nextTargetAdoptF === ego.fatherId) ||
            (nextTargetAdoptM && nextTargetAdoptM === ego.motherId),
        )
        if (!sharesAdoptiveAxis) {
          throw new BadRequestException(
            '이미 동일한 친부모로만 연결된 인물은 생부모와 양부모 중복 금지 규칙에 따라 입양형제로 중복 지정할 수 없습니다.',
          )
        }
        if (Object.keys(egoPatch).length > 0) await this.update(personId, egoPatch, accountId)
        if (Object.keys(targetPatch).length > 0) await this.update(dto.targetId, targetPatch, accountId)
      } else if (lineage === 'PATERNAL_HALF') {
        if (!sharedFather) {
          throw new BadRequestException(
            '이복형제(동부이모)로 연결하려면 두 인물 중 최소 한 명에게 아버지가 등록되어 있어야 합니다.',
          )
        }
        if (ego.motherId && target.motherId && ego.motherId === target.motherId) {
          throw new BadRequestException(
            '이미 동일한 어머니(친모)를 공유하는 인물은 이복형제(동부이모)로 연결할 수 없습니다. 친형제(부모 공유)를 선택해 주세요.',
          )
        }
        if (ego.fatherId !== sharedFather) {
          await this.update(personId, { fatherId: sharedFather }, accountId)
        }
        if (target.fatherId !== sharedFather) {
          await this.update(dto.targetId, { fatherId: sharedFather }, accountId)
        }
      } else if (lineage === 'MATERNAL_HALF') {
        if (!sharedMother) {
          throw new BadRequestException(
            '이부형제(동모이부)로 연결하려면 두 인물 중 최소 한 명에게 어머니가 등록되어 있어야 합니다.',
          )
        }
        if (ego.fatherId && target.fatherId && ego.fatherId === target.fatherId) {
          throw new BadRequestException(
            '이미 동일한 아버지(친부)를 공유하는 인물은 이부형제(동모이부)로 연결할 수 없습니다. 친형제(부모 공유)를 선택해 주세요.',
          )
        }
        if (ego.motherId !== sharedMother) {
          await this.update(personId, { motherId: sharedMother }, accountId)
        }
        if (target.motherId !== sharedMother) {
          await this.update(dto.targetId, { motherId: sharedMother }, accountId)
        }
      } else {
        if (!sharedFather && !sharedMother) {
          throw new BadRequestException(
            '친형제자매로 연결하려면 두 인물 중 최소 한 명에게 부모(부 또는 모)가 등록되어 있어야 합니다.',
          )
        }
        const egoPatch: UpdatePersonData = {}
        const targetPatch: UpdatePersonData = {}
        if (sharedFather && ego.fatherId !== sharedFather) egoPatch.fatherId = sharedFather
        if (sharedMother && ego.motherId !== sharedMother) egoPatch.motherId = sharedMother
        if (sharedFather && target.fatherId !== sharedFather) targetPatch.fatherId = sharedFather
        if (sharedMother && target.motherId !== sharedMother) targetPatch.motherId = sharedMother
        if (Object.keys(egoPatch).length > 0) await this.update(personId, egoPatch, accountId)
        if (Object.keys(targetPatch).length > 0) await this.update(dto.targetId, targetPatch, accountId)
      }
      return this.findById(personId, accountId)
    }

    throw new BadRequestException(`지원하지 않는 가족 관계 유형입니다: ${dto.kind}`)
  }

  /**
   * 배우자 관계 단건 수정 (`PUT /persons/:id/family/spouses/:spouseId`).
   * 전체 배우자 배열을 덮어쓰지 않고 해당 커플 행만 원자적으로 부분 수정한다.
   */
  async updateSpouseRelation(
    personId: string,
    spouseId: string,
    dto: UpdatePersonSpouseRelationDto,
    accountId?: string,
  ): Promise<PersonResponseDto> {
    const ego = await this.personRepository.findById(personId, accountId)
    if (!ego) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 수정할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${personId})`)
    }
    const [pairPersonId, pairSpouseId] =
      personId < spouseId ? [personId, spouseId] : [spouseId, personId]

    const existingRows = await this.prisma.personSpouse.findMany({
      where: {
        OR: [
          { personId: pairPersonId, spouseId: pairSpouseId },
          { personId: pairSpouseId, spouseId: pairPersonId },
        ],
      },
    })
    if (existingRows.length === 0) {
      throw new NotFoundException('수정할 배우자 관계를 찾을 수 없습니다.')
    }
    const primaryRow =
      existingRows.find(
        (r) => r.personId === pairPersonId && r.spouseId === pairSpouseId,
      ) ?? existingRows[0]
    const duplicateIds = existingRows
      .filter((r) => r.id !== primaryRow.id)
      .map((r) => r.id)
    // 레거시 양방향 중복 행이 존재하는 경우 반대편 행에만 기록된 메타데이터가 유실되지 않도록 병합
    const existing = existingRows.reduce(
      (acc, row) => ({
        ...acc,
        marriageStartDate: acc.marriageStartDate ?? row.marriageStartDate,
        marriageStartEra: acc.marriageStartEra ?? row.marriageStartEra,
        marriageStartYear: acc.marriageStartYear ?? row.marriageStartYear,
        marriageStartMonth: acc.marriageStartMonth ?? row.marriageStartMonth,
        marriageStartDay: acc.marriageStartDay ?? row.marriageStartDay,
        marriageStartPrecision: acc.marriageStartPrecision ?? row.marriageStartPrecision,
        marriageEndDate: acc.marriageEndDate ?? row.marriageEndDate,
        marriageEndEra: acc.marriageEndEra ?? row.marriageEndEra,
        marriageEndYear: acc.marriageEndYear ?? row.marriageEndYear,
        marriageEndMonth: acc.marriageEndMonth ?? row.marriageEndMonth,
        marriageEndDay: acc.marriageEndDay ?? row.marriageEndDay,
        marriageEndPrecision: acc.marriageEndPrecision ?? row.marriageEndPrecision,
        marriageEndReason: acc.marriageEndReason ?? row.marriageEndReason,
        marriageRank: acc.marriageRank ?? row.marriageRank,
        rankHolderId: acc.rankHolderId ?? row.rankHolderId,
        note: acc.note ?? row.note,
      }),
      primaryRow,
    )

    const mapDateSide = (side: DateInfoDto | null | undefined, existingSide: {
      date: Date | null
      era: string | null
      year: number | null
      month: number | null
      day: number | null
      precision: string | null
    }) => {
      if (side === undefined) return existingSide
      if (side === null || side.year == null) {
        return { date: null, era: null, year: null, month: null, day: null, precision: null }
      }
      const mapped = mapStructuredDateInput(side, undefined)
      return {
        date: mapped.date ?? null,
        era: mapped.era ?? null,
        year: side.year ?? null,
        month: side.month ?? null,
        day: side.day ?? null,
        precision: mapped.precision ?? null,
      }
    }

    const startSide = mapDateSide(dto.marriageStart, {
      date: existing.marriageStartDate,
      era: existing.marriageStartEra,
      year: existing.marriageStartYear,
      month: existing.marriageStartMonth,
      day: existing.marriageStartDay,
      precision: existing.marriageStartPrecision,
    })
    const endSide = mapDateSide(dto.marriageEnd, {
      date: existing.marriageEndDate,
      era: existing.marriageEndEra,
      year: existing.marriageEndYear,
      month: existing.marriageEndMonth,
      day: existing.marriageEndDay,
      precision: existing.marriageEndPrecision,
    })

    const egoLifespan = this.computeSignedLifespanYears(
      undefined,
      undefined,
      undefined,
      undefined,
      {
        birthEra: ego.birthEra,
        birthYear: ego.birthYear,
        deathEra: ego.deathEra,
        deathYear: ego.deathYear,
      },
    )
    await this.assertSpouseInvariants(
      personId,
      [
        {
          spouseId,
          marriageStartDate: startSide.date,
          marriageStartEra: startSide.era,
          marriageStartYear: startSide.year,
          marriageEndDate: endSide.date,
          marriageEndEra: endSide.era,
          marriageEndYear: endSide.year,
        },
      ],
      [ego.fatherId, ego.motherId, ego.adoptiveFatherId, ego.adoptiveMotherId],
      egoLifespan,
    )

    const nextRank = dto.marriageRank !== undefined ? dto.marriageRank : existing.marriageRank
    const isAsymmetricRank =
      nextRank === 'PRIMARY' || nextRank === 'SECONDARY' || nextRank === 'CONCUBINE'
    const validExistingHolderId =
      existing.rankHolderId === personId || existing.rankHolderId === spouseId
        ? existing.rankHolderId
        : null
    const validDtoHolderId =
      dto.rankHolderId === personId || dto.rankHolderId === spouseId
        ? dto.rankHolderId
        : dto.rankHolderId === null
          ? null
          : undefined
    let nextRankHolderId = validExistingHolderId
    if (validDtoHolderId !== undefined) {
      nextRankHolderId = validDtoHolderId
    } else if (dto.marriageRank !== undefined || dto.rankHolderId !== undefined) {
      if (!isAsymmetricRank) {
        nextRankHolderId = null
      } else if (validExistingHolderId) {
        nextRankHolderId = validExistingHolderId
      } else if (isAsymmetricRank) {
        const spousePerson = await this.personRepository.findById(spouseId)
        const egoGender = (ego.gender ?? '').toUpperCase()
        const spouseGender = (spousePerson?.gender ?? '').toUpperCase()
        nextRankHolderId =
          egoGender === 'FEMALE' && spouseGender !== 'FEMALE' ? personId : spouseId
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (duplicateIds.length > 0) {
        await tx.person.updateMany({
          where: { parentMarriageId: { in: duplicateIds } },
          data: { parentMarriageId: existing.id },
        })
        await tx.personSpouse.deleteMany({
          where: { id: { in: duplicateIds } },
        })
      }
      await tx.personSpouse.update({
        where: { id: existing.id },
        data: {
          personId: pairPersonId,
          spouseId: pairSpouseId,
          marriageStartDate: startSide.date,
          marriageStartEra: startSide.era as any,
          marriageStartYear: startSide.year,
          marriageStartMonth: startSide.month,
          marriageStartDay: startSide.day,
          marriageStartPrecision: startSide.precision,
          marriageEndDate: endSide.date,
          marriageEndEra: endSide.era as any,
          marriageEndYear: endSide.year,
          marriageEndMonth: endSide.month,
          marriageEndDay: endSide.day,
          marriageEndPrecision: endSide.precision,
          marriageRank: (nextRank ?? null) as any,
          rankHolderId: nextRankHolderId,
          marriageEndReason: (dto.marriageEndReason !== undefined
            ? (dto.marriageEndReason ?? null)
            : (existing.marriageEndReason ?? null)) as any,
          note: dto.note !== undefined ? (dto.note ?? null) : (existing.note ?? null),
        },
      })
      await tx.person.updateMany({
        where: {
          OR: [
            { fatherId: pairPersonId, motherId: pairSpouseId },
            { fatherId: pairSpouseId, motherId: pairPersonId },
          ],
          NOT: { parentMarriageId: existing.id },
        },
        data: { parentMarriageId: existing.id },
      })
      await tx.person.updateMany({
        where: { id: { in: [personId, spouseId] } },
        data: { updatedAt: new Date() },
      })
    })

    const updated = await this.findById(personId, accountId)
    try {
      await this.notificationService.notifyPerson(
        personDisplayName(updated),
        EventMethod.UPDATE,
        updated.id,
        '배우자 관계 수정',
      )
    } catch (err) {
      console.error('[person.updateSpouseRelation] 알림 발행 실패(무시):', err)
    }
    return updated
  }

  /**
   * 자녀 가족 메타 단건 수정 (`PUT /persons/:id/family/children/:childId`).
   * 자녀의 출생 서열(birthOrder), 성별 서열(genderBirthOrder), 서출 여부(illegitimate), 소생 부모(otherParentId)를 원자적으로 수정한다.
   */
  async updateChildFamilyMeta(
    personId: string,
    childId: string,
    dto: UpdatePersonChildMetaDto,
    accountId?: string,
  ): Promise<PersonResponseDto> {
    const ego = await this.personRepository.findById(personId, accountId)
    if (!ego) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 수정할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${personId})`)
    }
    const child = await this.personRepository.findById(childId)
    if (!child) {
      throw new NotFoundException(`자녀 인물을 찾을 수 없습니다 (ID: ${childId})`)
    }
    const isParent =
      child.fatherId === personId ||
      child.motherId === personId ||
      child.adoptiveFatherId === personId ||
      child.adoptiveMotherId === personId
    if (!isParent) {
      throw new BadRequestException('해당 인물은 현재 인물의 자녀(또는 양자녀)가 아닙니다.')
    }

    const childUpdate: UpdatePersonData = {}
    if (dto.birthOrder !== undefined) childUpdate.birthOrder = dto.birthOrder
    if (dto.genderBirthOrder !== undefined) childUpdate.genderBirthOrder = dto.genderBirthOrder
    if (dto.illegitimate !== undefined) childUpdate.illegitimate = dto.illegitimate
    if (dto.otherParentId !== undefined) {
      if (child.fatherId === personId) {
        childUpdate.motherId = dto.otherParentId
      } else if (child.motherId === personId) {
        childUpdate.fatherId = dto.otherParentId
      } else if (child.adoptiveFatherId === personId) {
        childUpdate.adoptiveMotherId = dto.otherParentId
      } else if (child.adoptiveMotherId === personId) {
        childUpdate.adoptiveFatherId = dto.otherParentId
      } else if (ego.gender === 'MALE') {
        childUpdate.motherId = dto.otherParentId
      } else if (ego.gender === 'FEMALE') {
        childUpdate.fatherId = dto.otherParentId
      }
    }

    if (Object.keys(childUpdate).length > 0) {
      await this.update(childId, childUpdate, accountId)
    }
    return this.findById(personId, accountId)
  }

  /**
   * 가족 관계 단건 해제 (`DELETE /persons/:id/family/links/:kind/:targetId`).
   */
  async unlinkFamilyMember(
    personId: string,
    kind: FamilyLinkKind,
    targetId: string,
    accountId?: string,
  ): Promise<PersonResponseDto> {
    const ego = await this.personRepository.findById(personId, accountId)
    if (!ego) {
      throw accountId
        ? new ForbiddenException('본인이 등록한 인물만 수정할 수 있습니다.')
        : new NotFoundException(`인물을 찾을 수 없습니다 (ID: ${personId})`)
    }

    if (kind === 'father') {
      if (ego.fatherId === targetId) await this.update(personId, { fatherId: null }, accountId)
      return this.findById(personId, accountId)
    }
    if (kind === 'mother') {
      if (ego.motherId === targetId) await this.update(personId, { motherId: null }, accountId)
      return this.findById(personId, accountId)
    }
    if (kind === 'adoptiveFather') {
      if (ego.adoptiveFatherId === targetId) {
        await this.update(personId, { adoptiveFatherId: null }, accountId)
      }
      return this.findById(personId, accountId)
    }
    if (kind === 'adoptiveMother') {
      if (ego.adoptiveMotherId === targetId) {
        await this.update(personId, { adoptiveMotherId: null }, accountId)
      }
      return this.findById(personId, accountId)
    }
    if (kind === 'spouse') {
      await this.prisma.$transaction(async (tx) => {
        const existingRows = await tx.personSpouse.findMany({
          where: {
            OR: [
              { personId, spouseId: targetId },
              { personId: targetId, spouseId: personId },
            ],
          },
          select: { id: true },
        })
        const deletedIds = existingRows.map((r) => r.id)
        await tx.person.updateMany({
          where: {
            OR: [
              ...(deletedIds.length > 0 ? [{ parentMarriageId: { in: deletedIds } }] : []),
              { fatherId: personId, motherId: targetId },
              { fatherId: targetId, motherId: personId },
            ],
          },
          data: { parentMarriageId: null },
        })
        await tx.personSpouse.deleteMany({
          where: {
            OR: [
              { personId, spouseId: targetId },
              { personId: targetId, spouseId: personId },
            ],
          },
        })
        await tx.person.updateMany({
          where: { id: { in: [personId, targetId] } },
          data: { updatedAt: new Date() },
        })
      })
      const updated = await this.findById(personId, accountId)
      try {
        await this.notificationService.notifyPerson(
          personDisplayName(updated),
          EventMethod.UPDATE,
          updated.id,
          '배우자 관계 해제',
        )
      } catch (err) {
        console.error('[person.unlinkFamilyMember:spouse] 알림 발행 실패(무시):', err)
      }
      return updated
    }
    if (kind === 'child') {
      const child = await this.personRepository.findById(targetId)
      if (!child) return this.findById(personId, accountId)
      const patch: UpdatePersonData = {}
      if (child.fatherId === personId) patch.fatherId = null
      if (child.motherId === personId) patch.motherId = null
      if (child.adoptiveFatherId === personId) patch.adoptiveFatherId = null
      if (child.adoptiveMotherId === personId) patch.adoptiveMotherId = null
      if (Object.keys(patch).length > 0) {
        await this.update(targetId, patch, accountId)
      }
      return this.findById(personId, accountId)
    }
    if (kind === 'sibling') {
      const sib = await this.personRepository.findById(targetId)
      if (!sib) return this.findById(personId, accountId)
      const egoAllFathers = [ego.fatherId, ego.adoptiveFatherId].filter(Boolean) as string[]
      const egoAllMothers = [ego.motherId, ego.adoptiveMotherId].filter(Boolean) as string[]
      const sibPatch: UpdatePersonData = {}
      const egoPatch: UpdatePersonData = {}

      // 1) 상대 형제(sib)의 양부모 슬롯이 ego의 부모(친부모·양부모)와 일치하면 양부모 슬롯만 우선 해제
      if (sib.adoptiveFatherId && egoAllFathers.includes(sib.adoptiveFatherId)) {
        sibPatch.adoptiveFatherId = null
      }
      if (sib.adoptiveMotherId && egoAllMothers.includes(sib.adoptiveMotherId)) {
        sibPatch.adoptiveMotherId = null
      }

      // 2) 친부모 슬롯은 반드시 친부모끼리(ego.fatherId===sib.fatherId, ego.motherId===sib.motherId)만 비교.
      //    ego의 양부모(adoptiveFatherId/adoptiveMotherId)와 일치한다는 이유로 친자인 sib의 생부/생모를
      //    삭제하면 sib가 친부모 및 다른 모든 친형제들과 끊어지는 교차 계보 파괴가 발생한다.
      if (sib.fatherId && ego.fatherId && sib.fatherId === ego.fatherId) {
        sibPatch.fatherId = null
      }
      if (sib.motherId && ego.motherId && sib.motherId === ego.motherId) {
        sibPatch.motherId = null
      }

      // 3) ego가 입양자(ego.adoptiveFatherId === sib.fatherId 등)이고 sib가 양가의 친자인 경우,
      //    sib의 친부모는 보존하고 ego 본인의 양부모 연결을 해제한다.
      if (Object.keys(sibPatch).length === 0) {
        if (ego.adoptiveFatherId && sib.fatherId && ego.adoptiveFatherId === sib.fatherId) {
          egoPatch.adoptiveFatherId = null
        }
        if (ego.adoptiveMotherId && sib.motherId && ego.adoptiveMotherId === sib.motherId) {
          egoPatch.adoptiveMotherId = null
        }
      }

      if (Object.keys(sibPatch).length > 0) {
        await this.update(targetId, sibPatch, accountId)
      }
      if (Object.keys(egoPatch).length > 0) {
        await this.update(personId, egoPatch, accountId)
      }
      return this.findById(personId, accountId)
    }

    throw new BadRequestException(`지원하지 않는 가족 관계 유형입니다: ${kind}`)
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
   * 하위 리소스(경력·학력·수상) 추가 대상 인물의 소유권 검사 — 연보(addPersonLifeEvent)와 동일 정책.
   * 행위자가 없으면 401(requireActorId — 예전엔 통과). 대상 인물이 없으면 404, 타 계정이면 403.
   */
  private async assertPersonOwnership(
    personId: string | null | undefined,
    accountId?: string,
  ): Promise<void> {
    const actorId = requireActorId(accountId)
    if (!personId) return
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { accountId: true },
    })
    if (!person) {
      throw new NotFoundException('인물을 찾을 수 없습니다.')
    }
    if (person.accountId != null && person.accountId !== actorId) {
      throw new ForbiddenException('본인이 등록한 인물에만 추가할 수 있습니다.')
    }
  }

  /**
   * 하위 리소스 행(경력·학력·수상)의 소유권 검사 — id로 행→인물→계정을 조회해 검증.
   * delete 전에 호출(삭제 후엔 행이 사라져 검증 불가). model은 해당 prisma delegate.
   */
  private async assertSubResourceOwnershipById(
    model: { findUnique: (args: any) => Promise<any> },
    id: string,
    accountId?: string,
  ): Promise<void> {
    const actorId = requireActorId(accountId)
    const row = await model.findUnique({
      where: { id },
      select: { person: { select: { accountId: true } } },
    })
    if (!row) {
      throw new NotFoundException('항목을 찾을 수 없습니다.')
    }
    if (row.person?.accountId != null && row.person.accountId !== actorId) {
      throw new ForbiddenException('본인이 등록한 인물의 항목만 삭제할 수 있습니다.')
    }
  }

  /**
   * 재임 업적 행의 소유권 검사 — 업적은 person 직접 관계가 없어 부모(재임) 경유: 행→재임→인물→계정.
   * 정책은 assertSubResourceOwnershipById와 동일(행위자 없음 401·행 없음 404·타 계정 403).
   */
  private async assertTenureAchievementOwnershipById(
    achievementId: string,
    accountId?: string,
  ): Promise<void> {
    const actorId = requireActorId(accountId)
    const row = await this.prisma.tenureAchievement.findUnique({
      where: { id: achievementId },
      select: { tenure: { select: { person: { select: { accountId: true } } } } },
    })
    if (!row) {
      throw new NotFoundException('업적을 찾을 수 없습니다.')
    }
    const ownerAccountId = row.tenure?.person?.accountId
    if (ownerAccountId != null && ownerAccountId !== actorId) {
      throw new ForbiddenException('본인이 등록한 인물의 항목만 수정·삭제할 수 있습니다.')
    }
  }

  /**
   * 연호 행의 소유권 검사 — 연호는 재임(재위 포함) 행에 매달려 있어 그 인물의 소유 계정을 본다.
   */
  private async assertRegnalEraOwnershipById(regnalEraId: string, accountId?: string): Promise<void> {
    const actorId = requireActorId(accountId)
    const row = await this.prisma.regnalEra.findUnique({
      where: { id: regnalEraId },
      select: {
        tenure: { select: { person: { select: { accountId: true } } } },
      },
    })
    if (!row) {
      throw new NotFoundException('연호·시대 정보를 찾을 수 없습니다.')
    }
    const ownerAccountId = row.tenure?.person?.accountId
    if (ownerAccountId != null && ownerAccountId !== actorId) {
      throw new ForbiddenException('본인이 등록한 인물의 항목만 수정·삭제할 수 있습니다.')
    }
  }

  /**
   * 군인 경력 추가
   */
  async addMilitaryCareer(dto: CreateMilitaryCareerDto, accountId?: string): Promise<MilitaryCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addMilitaryCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 기업인 경력 추가
   */
  async addBusinessCareer(dto: CreateBusinessCareerDto, accountId?: string): Promise<BusinessCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addBusinessCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 학자 경력 추가
   */
  async addAcademicCareer(dto: CreateAcademicCareerDto, accountId?: string): Promise<AcademicCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addAcademicCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 운동선수 경력 추가
   */
  async addAthleteCareer(dto: CreateAthleteCareerDto, accountId?: string): Promise<AthleteCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addAthleteCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 종교인 경력 추가
   */
  async addReligiousCareer(dto: CreateReligiousCareerDto, accountId?: string): Promise<ReligiousCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addReligiousCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 예술가 경력 추가
   */
  async addArtistCareer(dto: CreateArtistCareerDto, accountId?: string): Promise<ArtistCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addArtistCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 언론인 경력 추가
   */
  async addMediaCareer(dto: CreateMediaCareerDto, accountId?: string): Promise<MediaCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addMediaCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 법조인 경력 추가
   */
  async addLegalCareer(dto: CreateLegalCareerDto, accountId?: string): Promise<LegalCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addLegalCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 의료인 경력 추가
   */
  async addMedicalCareer(dto: CreateMedicalCareerDto, accountId?: string): Promise<MedicalCareerResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addMedicalCareer(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.CAREER, careerItemLabel(created))
    return created
  }

  /**
   * 국가원수/왕위 재임 기록 추가.
   * 정부 수반·국가 원수 재임(HEAD_OF_STATE/HEAD_OF_GOVERNMENT)은 기본적으로 행정부(Cabinet)를 자동 생성.
   * 군주 재위도 같은 경로 — 직위 정의가 군주직이면 재위로 읽힌다(직위 보유 단일 모델).
   * @param accountId 로그인 계정 ID — 계정별 행정부·각료 구분용
   */
  async addGovernmentPositionTenure(dto: CreateGovernmentPositionTenureDto, accountId?: string): Promise<any> {
    await this.assertPersonOwnership(dto.personId, accountId)
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
    // 행정부는 DB 트리거(trg_tenure_cabinet_ins)가 비군주 수반 재임에 자동으로 만든다 — 시드·스크립트 경로도 같은 규칙
    return tenure
  }

  /**
   * 국가원수/왕위 재임 기록 수정
   */
  async updateGovernmentPositionTenure(
    id: string,
    dto: Partial<CreateGovernmentPositionTenureDto>,
    accountId?: string,
  ): Promise<any> {
    await this.assertSubResourceOwnershipById(this.prisma.governmentPositionTenure, id, accountId)
    // 가드: 행정부의 수반인 임기를 수반이 아닌 직위(또는 군주직)로 바꾸려 하면 차단 (Cabinet 무결성 보호).
    // 종류는 직위 정의가 정본 — 정의를 바꾸면 그 정의로, 종류만 오면 그 종류의 일반 정의로 판정한다
    const target = dto.positionDefinitionId
      ? await this.prisma.governmentPositionDefinition.findUnique({
          where: { id: dto.positionDefinitionId },
          select: { positionType: true, isMonarchical: true },
        })
      : dto.positionType
        ? { positionType: dto.positionType, isMonarchical: false }
        : null
    if (
      target &&
      (target.isMonarchical || (target.positionType !== 'HEAD_OF_STATE' && target.positionType !== 'HEAD_OF_GOVERNMENT'))
    ) {
      const cabinet = await this.personRepository.findCabinetByHeadTenureId(id)
      if (cabinet) {
        throw new BadRequestException(
          '이 임기는 행정부의 수반으로 사용 중입니다. 행정부를 먼저 삭제한 뒤 직위를 변경하세요.',
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
  async deleteGovernmentPositionTenure(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.governmentPositionTenure, id, accountId)
    const tenure = await this.personRepository.findTenureById(id)
    const person = tenure?.person
    const label = person ? `${personDisplayName(person)} - ${tenurePositionTitle(tenure, '재임')}` : tenurePositionTitle(tenure, '재임 기록')
    await this.personRepository.deleteGovernmentPositionTenure(id)
    await this.notificationService.notifyTenure(label, EventMethod.DELETE, tenure?.personId)
  }

  /** 재임 1건 + 업적 조회 (없으면 404) */
  async getTenureWithAchievements(id: string): Promise<any> {
    const tenure = await this.personRepository.findTenureById(id)
    if (!tenure) {
      throw new NotFoundException('재임 기록을 찾을 수 없습니다.')
    }
    return tenure
  }

  /**
   * 연보 start/end 날짜 범위 검증 — endDate < startDate 금지.
   * 두 값이 모두 있을 때만 검사(각각 null 허용).
   * 정밀도('year'·'month'·'day')를 반영하되 종료일은 해당 정밀도의 상한(연말 12-31 / 월말 31)으로 비교해,
   * 같은 해/같은 달 안의 구체적 시작일(예: 시작 1920-03-15 [day], 종료 1920년 [year])이 역전으로 오판되지 않게 한다.
   */
  private assertLifeEventDateRange(
    startDate?: string | null,
    endDate?: string | null,
    startDatePrecision?: string | null,
    endDatePrecision?: string | null,
  ): void {
    if (!startDate || !endDate) return
    // 부호 연-월-일로 비교 — new Date()는 기원전('-0044-…')을 서기로 읽거나 거부한다
    const startParsed = applyDatePrecision(
      mapStructuredDateInput(null, startDate),
      startDatePrecision ?? 'day',
    )
    const endParsed = applyDatePrecision(
      mapStructuredDateInput(null, endDate),
      endDatePrecision ?? 'day',
    )
    const startKey = structuredDateKey(
      startParsed.era,
      startParsed.year,
      startParsed.month,
      startParsed.day,
    )
    const endKey = structuredDateEndKey(
      endParsed.era,
      endParsed.year,
      endParsed.month,
      endParsed.day,
    )
    if (startKey != null && endKey != null && endKey < startKey) {
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
    if (person.accountId != null && person.accountId !== requireActorId(accountId)) {
      throw new ForbiddenException('본인이 등록한 인물에만 연보를 추가할 수 있습니다.')
    }
    this.assertLifeEventDateRange(
      dto.startDate,
      dto.endDate,
      dto.startDatePrecision,
      dto.endDatePrecision,
    )
    await this.assertLifeEventLinkableEvent(dto.eventId, accountId)
    return this.personRepository.addPersonLifeEvent(dto, requireActorId(accountId))
  }

  /**
   * 연보의 관련 사건 — 본인이 등록한, 지워지지 않은 사건만 잇는다(사건 쪽 참여 인물 연결과 같은 정책).
   * eventId가 없거나 null(연결 해제)이면 통과.
   */
  private async assertLifeEventLinkableEvent(
    eventId: string | null | undefined,
    accountId?: string,
  ): Promise<void> {
    if (!eventId) return
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true, deletedAt: true },
    })
    if (!event || event.deletedAt) {
      throw new NotFoundException('관련 사건을 찾을 수 없습니다.')
    }
    if (event.createdById !== requireActorId(accountId)) {
      throw new ForbiddenException('본인이 등록한 사건만 연결할 수 있습니다.')
    }
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
    if (existing.accountId != null && existing.accountId !== requireActorId(accountId)) {
      throw new ForbiddenException('본인이 등록한 연보만 수정할 수 있습니다.')
    }
    // update는 dto에 둘 중 하나만 올 수 있음 — 없는 값은 DB 값으로 대체해서 검사
    const toIsoOrNull = (v: unknown): string | null => {
      if (v == null) return null
      if (typeof v === 'string') return v
      if (v instanceof Date) return v.toISOString()
      return null
    }
    // 저장된 쪽은 구조화 날짜(기원전 포함)에서 — DATETIME은 기원전·서기 1000년 이전이 비어 있다
    const storedSigned = (prefix: 'start' | 'end') => {
      const row = existing as Record<string, unknown>
      return (
        toSignedDateString(
          row[`${prefix}Era`] as string | null,
          row[`${prefix}Year`] as number | null,
          row[`${prefix}Month`] as number | null,
          row[`${prefix}Day`] as number | null,
        ) ?? toIsoOrNull(row[`${prefix}Date`])
      )
    }
    const effectiveStart =
      dto.startDate !== undefined ? toIsoOrNull(dto.startDate) : storedSigned('start')
    const effectiveEnd =
      dto.endDate !== undefined ? toIsoOrNull(dto.endDate) : storedSigned('end')
    const existingRow = existing as Record<string, unknown>
    const effectiveStartPrecision =
      dto.startDatePrecision !== undefined
        ? dto.startDatePrecision
        : (existingRow.startDatePrecision as string | null) ?? 'day'
    const effectiveEndPrecision =
      dto.endDatePrecision !== undefined
        ? dto.endDatePrecision
        : (existingRow.endDatePrecision as string | null) ?? 'day'
    this.assertLifeEventDateRange(
      effectiveStart,
      effectiveEnd,
      effectiveStartPrecision,
      effectiveEndPrecision,
    )
    await this.assertLifeEventLinkableEvent(dto.eventId, accountId)
    return this.personRepository.updatePersonLifeEvent(id, dto)
  }

  async deletePersonLifeEvent(id: string, accountId?: string): Promise<void> {
    const existing = await this.personRepository.findPersonLifeEventById(id)
    if (!existing) {
      throw new NotFoundException('연보 기록을 찾을 수 없습니다.')
    }
    if (existing.accountId != null && existing.accountId !== requireActorId(accountId)) {
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
    // 레포지토리는 계정 없이 부르면 범위를 걸지 않는다(내부 하위 재임 조회용) — 요청 경로는 행위자 필수
    return this.personRepository.findTenuresByCabinetId(cabinetId, requireActorId(accountId))
  }

  async findCabinetOverview(cabinetId: string, accountId?: string): Promise<any | null> {
    return this.personRepository.findCabinetOverview(cabinetId, requireActorId(accountId))
  }

  async findCabinets(params: { countryId?: string; historicalCountryId?: string }): Promise<any[]> {
    return this.personRepository.findCabinets(params)
  }

  async createCabinet(
    dto: {
      headTenureId?: string | null
      name?: string | null
      description?: string | null
      countryId?: string | null
      historicalCountryId?: string | null
      startDateInfo?: any
      endDateInfo?: any
      allowReshuffle?: boolean
      memberTenureIds?: string[]
    },
    accountId?: string,
  ): Promise<any> {
    const trimmedHeadTenureId = dto.headTenureId?.trim() || null
    if (trimmedHeadTenureId) {
      const head = await this.personRepository.findTenureById(trimmedHeadTenureId)
      if (!head) {
        throw new NotFoundException('수반 재임을 찾을 수 없습니다.')
      }
      const headType =
        (head as any).positionDefinition?.positionType ?? (head as any).positionType
      if (headType !== 'HEAD_OF_STATE' && headType !== 'HEAD_OF_GOVERNMENT') {
        throw new BadRequestException(
          '행정부의 수반은 국가원수(군주·대통령 등) 또는 정부수반(총리·수상 등) 임기여야 합니다.',
        )
      }
    }
    return this.personRepository.createCabinet(dto, requireActorId(accountId))
  }

  async updateCabinet(
    cabinetId: string,
    dto: {
      name?: string | null
      description?: string | null
      headTenureId?: string | null
      countryId?: string | null
      historicalCountryId?: string | null
      startDateInfo?: any
      endDateInfo?: any
    },
    accountId?: string,
  ): Promise<any> {
    return this.personRepository.updateCabinet(cabinetId, dto, requireActorId(accountId))
  }

  async attachCabinetMembers(
    cabinetId: string,
    items: Array<{
      tenureId: string
      departmentId?: string | null
      roleTitle?: string | null
    }>,
    accountId?: string,
  ): Promise<any[]> {
    return this.personRepository.attachCabinetMembers(
      cabinetId,
      items,
      requireActorId(accountId),
    )
  }

  async detachCabinetMember(
    cabinetId: string,
    tenureId: string,
    accountId?: string,
  ): Promise<void> {
    return this.personRepository.detachCabinetMember(
      cabinetId,
      tenureId,
      requireActorId(accountId),
    )
  }

  async findSuggestedCabinetMembers(cabinetId: string): Promise<any[]> {
    return this.personRepository.findSuggestedCabinetMembers(cabinetId)
  }

  async deleteCabinet(cabinetId: string, accountId?: string): Promise<void> {
    return this.personRepository.deleteCabinet(cabinetId, requireActorId(accountId))
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
    accountId?: string,
  ): Promise<any> {
    await this.assertSubResourceOwnershipById(this.prisma.governmentPositionTenure, tenureId, accountId)
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
    accountId?: string,
  ): Promise<any> {
    await this.assertTenureAchievementOwnershipById(achievementId, accountId)
    return this.personRepository.updateTenureAchievement(tenureId, achievementId, dto)
  }

  /**
   * 재임 업적 삭제
   */
  async deleteTenureAchievement(
    tenureId: string,
    achievementId: string,
    accountId?: string,
  ): Promise<void> {
    await this.assertTenureAchievementOwnershipById(achievementId, accountId)
    return this.personRepository.deleteTenureAchievement(tenureId, achievementId)
  }

  async createRegnalEra(tenureId: string, dto: CreateRegnalEraDto, accountId?: string): Promise<any> {
    await this.assertSubResourceOwnershipById(this.prisma.governmentPositionTenure, tenureId, accountId)
    try {
      return await this.personRepository.createRegnalEra({ tenureId }, dto)
    } catch (e: any) {
      if (e?.message === 'GovernmentPositionTenure not found') {
        throw new NotFoundException('재임을 찾을 수 없습니다.')
      }
      throw e
    }
  }

  async updateRegnalEra(id: string, dto: UpdateRegnalEraDto, accountId?: string): Promise<any> {
    await this.assertRegnalEraOwnershipById(id, accountId)
    try {
      return await this.personRepository.updateRegnalEra(id, dto)
    } catch (e: any) {
      if (e?.message === 'RegnalEra not found') {
        throw new NotFoundException('연호·시대 정보를 찾을 수 없습니다.')
      }
      throw e
    }
  }

  async deleteRegnalEra(id: string, accountId?: string): Promise<void> {
    await this.assertRegnalEraOwnershipById(id, accountId)
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
    includeIds?: string[]
  }): Promise<any[]> {
    return this.personRepository.findPositionDefinitions(params)
  }

  /**
   * 직책 피커용 조회 — 스코프 하드컷 + 이 국가에서의 사용 실적 주석 + 자유입력 직책명.
   */
  async findPositionDefinitionsForPicker(params: {
    countryId?: string
    historicalCountryId?: string
    includeIds?: string[]
  }): Promise<{
    definitions: any[]
    recentTitles: Array<{ title: string; positionType: string; count: number }>
  }> {
    return this.personRepository.findPositionDefinitionsForPicker(params)
  }

  /** 관직 정의 적용 범위 추가 (없으면 전역) */
  async addPositionDefinitionScope(dto: {
    definitionId: string
    countryId?: string | null
    historicalCountryId?: string | null
    localTitle?: string | null
    note?: string | null
  }): Promise<any> {
    if (!dto.countryId && !dto.historicalCountryId) {
      throw new BadRequestException(
        '적용 범위에는 현대 국가 또는 역사적 국가 중 하나 이상이 필요합니다.',
      )
    }
    /**
     * 첫 스코프가 붙는 순간 그 정의는 **목록에 없는 모든 나라에서 사라진다**(스코프 0=전역 규칙).
     * '국왕'처럼 역사국가 18곳에 걸쳐 쓰이는 보편 칭호에 클릭 한 번으로 스코프가 붙으면
     * 나머지 17곳의 신규 등록 경로가 통째로 막힌다. 그래서 아직 전역인 정의가 이미 여러
     * 국가 컨텍스트에서 쓰이고 있으면 거부한다(재분류 스크립트가 가진 가드의 실시간 대칭).
     */
    const usage = await this.personRepository.countPositionDefinitionUsageContexts(
      dto.definitionId,
    )
    if (usage.scopeCount === 0 && usage.contextCount > 1) {
      throw new BadRequestException(
        `이 직책은 이미 ${usage.contextCount}개 국가에서 쓰이고 있어 특정 국가 전용으로 좁힐 수 없습니다. ` +
          '적용 범위를 지정하면 목록에 없는 나머지 국가에서는 이 직책을 새로 등록할 수 없게 됩니다. ' +
          '국가별로 구분이 필요하면 그 나라 고유 명칭의 직책을 따로 만들어 주세요.',
      )
    }
    return this.personRepository.addPositionDefinitionScope(dto)
  }

  /** 관직 정의 적용 범위 삭제 — 전부 지우면 다시 전역 */
  async removePositionDefinitionScope(scopeId: string): Promise<void> {
    return this.personRepository.removePositionDefinitionScope(scopeId)
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
  async addEducation(dto: CreateEducationDto, accountId?: string): Promise<PersonEducationResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addEducation(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.EDUCATION, educationItemLabel(created))
    return created
  }

  /**
   * 수상/훈장 추가
   */
  async addAward(dto: CreatePersonAwardDto, accountId?: string): Promise<PersonAwardResponseDto> {
    await this.assertPersonOwnership(dto.personId, accountId)
    const created = await this.personRepository.addAward(dto)
    await this.notifyPersonSection(created.personId, NotificationSubResource.AWARD, awardItemLabel(created))
    return created
  }

  async updateMilitaryCareer(id: string, dto: Partial<CreateMilitaryCareerDto>, accountId?: string): Promise<MilitaryCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.militaryCareer, id, accountId)
    const updated = await this.personRepository.updateMilitaryCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateBusinessCareer(id: string, dto: Partial<CreateBusinessCareerDto>, accountId?: string): Promise<BusinessCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.businessCareer, id, accountId)
    const updated = await this.personRepository.updateBusinessCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateAcademicCareer(id: string, dto: Partial<CreateAcademicCareerDto>, accountId?: string): Promise<AcademicCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.academicCareer, id, accountId)
    const updated = await this.personRepository.updateAcademicCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateAthleteCareer(id: string, dto: Partial<CreateAthleteCareerDto>, accountId?: string): Promise<AthleteCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.athleteCareer, id, accountId)
    const updated = await this.personRepository.updateAthleteCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateReligiousCareer(id: string, dto: Partial<CreateReligiousCareerDto>, accountId?: string): Promise<ReligiousCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.religiousCareer, id, accountId)
    const updated = await this.personRepository.updateReligiousCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateArtistCareer(id: string, dto: Partial<CreateArtistCareerDto>, accountId?: string): Promise<ArtistCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.artistCareer, id, accountId)
    const updated = await this.personRepository.updateArtistCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateMediaCareer(id: string, dto: Partial<CreateMediaCareerDto>, accountId?: string): Promise<MediaCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.mediaCareer, id, accountId)
    const updated = await this.personRepository.updateMediaCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateLegalCareer(id: string, dto: Partial<CreateLegalCareerDto>, accountId?: string): Promise<LegalCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.legalCareer, id, accountId)
    const updated = await this.personRepository.updateLegalCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateMedicalCareer(id: string, dto: Partial<CreateMedicalCareerDto>, accountId?: string): Promise<MedicalCareerResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.medicalCareer, id, accountId)
    const updated = await this.personRepository.updateMedicalCareer(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.CAREER, careerItemLabel(updated))
    return updated
  }

  async updateEducation(id: string, dto: Partial<CreateEducationDto>, accountId?: string): Promise<PersonEducationResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.personEducation, id, accountId)
    const updated = await this.personRepository.updateEducation(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.EDUCATION, educationItemLabel(updated))
    return updated
  }

  async updateAward(id: string, dto: Partial<CreatePersonAwardDto>, accountId?: string): Promise<PersonAwardResponseDto> {
    await this.assertSubResourceOwnershipById(this.prisma.personAward, id, accountId)
    const updated = await this.personRepository.updateAward(id, dto)
    await this.notifyPersonSection(updated.personId, NotificationSubResource.AWARD, awardItemLabel(updated))
    return updated
  }

  async deleteMilitaryCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.militaryCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteMilitaryCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteBusinessCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.businessCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteBusinessCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteAcademicCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.academicCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteAcademicCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteAthleteCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.athleteCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteAthleteCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteReligiousCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.religiousCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteReligiousCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteArtistCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.artistCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteArtistCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteMediaCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.mediaCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteMediaCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteLegalCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.legalCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteLegalCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteMedicalCareer(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.medicalCareer, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteMedicalCareer(id)
    await this.notifyPersonSection(personId, NotificationSubResource.CAREER, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteEducation(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.personEducation, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteEducation(id)
    await this.notifyPersonSection(personId, NotificationSubResource.EDUCATION, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  async deleteAward(id: string, accountId?: string): Promise<void> {
    await this.assertSubResourceOwnershipById(this.prisma.personAward, id, accountId)
    const { personId, itemLabel } = await this.personRepository.deleteAward(id)
    await this.notifyPersonSection(personId, NotificationSubResource.AWARD, itemLabel ? `${itemLabel} 삭제` : undefined)
  }

  /**
   * 인물의 모든 경력 조회 (accountId 있으면 소유자만 — 타 계정 경력 열람 차단)
   */
  async findAllCareers(personId: string, accountId?: string): Promise<AllCareersResponseDto> {
    await this.findById(personId, accountId) // 존재 + 소유권 확인
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
      fromPerson: {
        id: string
        name: string
        surname: string | null
        middleName: string | null
        nameDisplayOrder: string | null
        country: { defaultNameDisplayOrder: string | null } | null
        profileImageUrl: string | null
        birthDate: Date | null
        birthEra?: string | null
        deathDate: Date | null
        deathEra?: string | null
      }
      toPerson: {
        id: string
        name: string
        surname: string | null
        middleName: string | null
        nameDisplayOrder: string | null
        country: { defaultNameDisplayOrder: string | null } | null
        profileImageUrl: string | null
        birthDate: Date | null
        birthEra?: string | null
        deathDate: Date | null
        deathEra?: string | null
      }
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
          startEra?: string | null
          startYear?: number | null
          startMonth?: number | null
          startDay?: number | null
          startDatePrecision?: string | null
          endDate: Date | null
          endEra?: string | null
          endYear?: number | null
          endMonth?: number | null
          endDay?: number | null
          endDatePrecision?: string | null
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
          startDate:
            toSignedDateString(
              s.lifeEvent.startEra,
              s.lifeEvent.startYear,
              s.lifeEvent.startMonth,
              s.lifeEvent.startDay,
            ) ??
            s.lifeEvent.startDate?.toISOString() ??
            null,
          startDatePrecision: s.lifeEvent.startDatePrecision ?? null,
          endDate:
            toSignedDateString(
              s.lifeEvent.endEra,
              s.lifeEvent.endYear,
              s.lifeEvent.endMonth,
              s.lifeEvent.endDay,
            ) ??
            s.lifeEvent.endDate?.toISOString() ??
            null,
          endDatePrecision: s.lifeEvent.endDatePrecision ?? null,
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
    middleName: string | null
    nameDisplayOrder: string | null
    country: { defaultNameDisplayOrder: string | null } | null
    profileImageUrl: string | null
    birthDate: Date | null
    birthEra?: string | null
    deathDate: Date | null
    deathEra?: string | null
  }) {
    const toEraAwareIso = (d: Date | null, era?: string | null): string | null => {
      if (!d || Number.isNaN(d.getTime())) return null
      if (era === 'BC') {
        return toSignedDateString(
          'BC',
          d.getUTCFullYear(),
          d.getUTCMonth() + 1,
          d.getUTCDate(),
        )
      }
      return d.toISOString()
    }
    return {
      id: p.id,
      name: p.name,
      surname: p.surname,
      middleName: p.middleName,
      nameDisplayOrder: p.nameDisplayOrder,
      country: p.country,
      profileImageUrl: p.profileImageUrl,
      birthDate: toEraAwareIso(p.birthDate, p.birthEra),
      birthEra: p.birthEra ?? null,
      deathDate: toEraAwareIso(p.deathDate, p.deathEra),
      deathEra: p.deathEra ?? null,
    }
  }

  /** 관계 조회용 표준 include */
  private readonly HUMAN_RELATIONSHIP_INCLUDE = {
    fromPerson: {
      select: {
        id: true,
        name: true,
        surname: true,
        middleName: true,
        nameDisplayOrder: true,
        country: { select: { defaultNameDisplayOrder: true } },
        profileImageUrl: true,
        birthDate: true,
        birthEra: true,
        deathDate: true,
        deathEra: true,
      },
    },
    toPerson: {
      select: {
        id: true,
        name: true,
        surname: true,
        middleName: true,
        nameDisplayOrder: true,
        country: { select: { defaultNameDisplayOrder: true } },
        profileImageUrl: true,
        birthDate: true,
        birthEra: true,
        deathDate: true,
        deathEra: true,
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
            startEra: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            startDatePrecision: true,
            endDate: true,
            endEra: true,
            endYear: true,
            endMonth: true,
            endDay: true,
            endDatePrecision: true,
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
    return this.loadHumanRelationships(personId)
  }

  /**
   * 소유권 검사 없이 인간관계만 조회 — getDetailById에서 findByIdWithRelations와 병렬로
   * 호출할 때 사용(소유권은 병렬의 findByIdWithRelations가 같은 id·accountId로 이미 검증).
   * 상세 진입마다 소유권용 findById(전체 매핑 포함)를 중복 실행하던 낭비 제거.
   */
  async findHumanRelationshipsForDetail(personId: string) {
    return this.loadHumanRelationships(personId)
  }

  private async loadHumanRelationships(personId: string) {
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
      middleName: true,
      nameDisplayOrder: true,
      country: { select: { defaultNameDisplayOrder: true } },
      profileImageUrl: true,
      birthDate: true,
      birthEra: true,
      deathDate: true,
      deathEra: true,
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
    // `'k' in dto` 는 ES2023 useDefineForClassFields로 페이로드에 없던 축도 항상 true라
    // 미전송 축을 null로 wipe한다(일괄 평가 계약 파손). `!== undefined`로 '전송된 키'만 반영
    // — 명시적 null=초기화 시맨틱은 그대로 보존.
    if (dto.politics !== undefined) data.politics = dto.politics ?? null
    if (dto.military !== undefined) data.military = dto.military ?? null
    if (dto.diplomacy !== undefined) data.diplomacy = dto.diplomacy ?? null
    if (dto.intellect !== undefined) data.intellect = dto.intellect ?? null
    if (dto.charisma !== undefined) data.charisma = dto.charisma ?? null
    if (dto.administration !== undefined) data.administration = dto.administration ?? null
    if (dto.notes !== undefined) data.notes = dto.notes ?? null

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
        // `'k' in statsDto`는 ES2023 useDefineForClassFields로 항상 true → 미전송 축 wipe.
        // `!== undefined`로 전송된 키만 반영(명시적 null=초기화 보존).
        if (statsDto.politics !== undefined) data.politics = statsDto.politics ?? null
        if (statsDto.military !== undefined) data.military = statsDto.military ?? null
        if (statsDto.diplomacy !== undefined) data.diplomacy = statsDto.diplomacy ?? null
        if (statsDto.intellect !== undefined) data.intellect = statsDto.intellect ?? null
        if (statsDto.charisma !== undefined) data.charisma = statsDto.charisma ?? null
        if (statsDto.administration !== undefined)
          data.administration = statsDto.administration ?? null
        if (statsDto.notes !== undefined) data.notes = statsDto.notes ?? null
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
