import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PersonService } from '../application/person.service'
import { 
  CreatePersonDto,
  UpdatePersonDto,
  PersonResponseDto,
  FamilyTreeResponseDto,
  PersonInfographicItemDto,
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
  AllCareersResponseDto,
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
  CreatePersonHumanRelationshipDto,
  CreatePersonHumanRelationshipPhaseDto,
  UpdatePersonHumanRelationshipDto,
  UpdatePersonHumanRelationshipPhaseDto,
  UpsertPersonStatsDto,
  UpsertPersonTraitsDto,
  UpsertPersonEvaluationDto,
} from './dto'

export interface PersonCountByModernCountry {
  countryId: string
  count: number
}

/**
 * 생몰일 구조화 값(크기값 연도 + 월/일) → UTC 자정 Date.
 * 네이티브 Date 문자열 파싱은 BC 부호가 조용히 무시되고(`new Date('-500-01-01')` → AD 500),
 * 1000년 미만 연도는 로컬 TZ로 해석돼 일·연 경계가 밀리므로 사용 금지.
 * era(BC/AD)는 별도로 birthEra/deathEra 컬럼에 기록한다 — MySQL DATETIME에 음수 연도는 저장하지 않는다.
 */
function buildUtcDateFromParts(year: number, month?: number, day?: number): Date {
  const d = new Date(Date.UTC(2000, (month || 1) - 1, day || 1))
  d.setUTCFullYear(year)
  return d
}

/**
 * 'YYYY-MM-DD'(BC는 '-' 접두) 생몰일 문자열 → era + 크기값 UTC Date.
 * 문자열 직접 파싱(네이티브 Date 파싱 금지). 파싱 불가하면 undefined(필드 무시).
 */
function parsePersonDateString(iso: string): { era: 'BC' | 'AD'; date: Date } | undefined {
  const neg = iso.startsWith('-')
  const m = (neg ? iso.slice(1) : iso).match(/^(\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!m) return undefined
  const year = parseInt(m[1], 10)
  if (!year) return undefined
  return {
    era: neg ? 'BC' : 'AD',
    date: buildUtcDateFromParts(
      year,
      m[2] ? parseInt(m[2], 10) : undefined,
      m[3] ? parseInt(m[3], 10) : undefined,
    ),
  }
}

/**
 * 인물 관리 컨트롤러 (개인 정보 플랫폼: 로그인한 계정 소유 데이터만)
 */
@ApiTags('persons')
@Controller('persons')
@UseGuards(AuthGuard('jwt'))
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  /**
   * 인물 목록 조회 (본인 등록분만)
   */
  @Get()
  async getAll(@Request() req: any): Promise<PersonResponseDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findAll(accountId)
  }

  /**
   * 인물 인포그래픽 목록(경량) 조회 — 대시보드 인포그래픽 전용.
   * adapt()가 쓰는 최소 필드만 내려 전체 목록 payload를 축소한다 (본인 등록분만).
   * 주의: `:id` 라우트보다 위에 위치해야 함.
   */
  @Get('infographic')
  async getAllForInfographic(
    @Request() req: any,
  ): Promise<PersonInfographicItemDto[]> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findAllForInfographic(accountId)
  }

  /**
   * 인물 목록 조회 (정부 직책 포함, 본인 등록분만)
   */
  @Get('with-government-positions')
  async getAllWithGovernmentPositions(@Request() req: any): Promise<any[]> {
    const accountId = req.user?.id ?? req.user?.sub
    const persons = await this.personService.findAllWithGovernmentPositions(accountId)

    // BigInt와 Date를 문자열로 변환하는 헬퍼 함수
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key])
        }
        return result
      }
      return obj
    }

    return persons.map((person: any) => ({
      id: person.id,
      name: person.name,
      surname: person.surname,
      profileImageUrl: person.profileImageUrl,
      birthEra: person.birthEra,
      birthDate: person.birthDate ? person.birthDate.toISOString() : null,
      deathEra: person.deathEra,
      deathDate: person.deathDate ? person.deathDate.toISOString() : null,
      governmentPositions: serializeBigInt(person.GovernmentTenures || []),
      governmentCareers: [],
    }))
  }

  /**
   * 대시보드용: 현대 국가별 실제 등록 인물 수 (주 국적·재임·소속 합집합, 국가 상세 인물 목록과 동일)
   */
  @Get('dashboard/person-counts-by-modern-country')
  async getPersonCountsByModernCountry(): Promise<PersonCountByModernCountry[]> {
    return this.personService.findModernCountryPersonCounts()
  }

  /**
   * 사용자의 모든 인물 평가(stats + traits) 일괄 조회.
   * 인물 리스트의 평가 indicator·정렬·필터에 사용 — 한 번 호출로 N+1 방지.
   * 주의: 이 라우트는 `:id` 보다 위에 위치해야 함 (NestJS 라우트 매칭 순서).
   */
  @Get('my-evaluations')
  async getAllMyEvaluations(@Request() req: any): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findAllMyEvaluations(accountId)
  }

  /**
   * 방문(놀러가기): 타 계정이 등록한 인물 목록(카드, 읽기전용).
   * 보수 노출 — 카드 레벨만(상세 미개방). 편집·평가 액션은 프론트에서 viewerIsOwner로 숨김.
   * 개별 인물 숨김(Person.isPublic)은 Phase B. 더 엄격히 "대표인물만"을 원하면 여기서 필터.
   * 주의: `:id` 라우트보다 위에 위치해야 함 (NestJS 라우트 매칭 순서).
   */
  @Get('by-account/:accountId')
  async getByAccount(@Param('accountId') accountId: string): Promise<PersonResponseDto[]> {
    return this.personService.findAll(accountId)
  }

  /**
   * ID로 인물 조회 (본인 등록분만)
   */
  @Get(':id')
  async getById(@Param('id') id: string, @Request() req: any): Promise<PersonResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findById(id, accountId)
  }

  /**
   * 인물의 재임 기록만 조회 (본인 등록 인물만)
   */
  @Get(':id/tenures')
  async getTenuresByPersonId(@Param('id') id: string, @Request() req: any): Promise<any[]> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personService.findById(id, accountId) // 소유자만 접근
    return this.personService.findTenuresByPersonId(id)
  }

  /**
   * 인물 간 인간관계 목록 (멘토·친밀도 등)
   */
  @Get(':id/human-relationships')
  async getHumanRelationships(@Param('id') id: string, @Request() req: any): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findHumanRelationships(id, accountId)
  }

  /**
   * 인간관계 추가 (MENTOR: body.subjectIsMentor=false면 경로 인물이 제자)
   */
  @Post(':id/human-relationships')
  async createHumanRelationship(
    @Param('id') id: string,
    @Body() dto: CreatePersonHumanRelationshipDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.createHumanRelationship(id, dto, accountId)
  }

  @Put(':personId/human-relationships/:relationshipId')
  async updateHumanRelationship(
    @Param('personId') personId: string,
    @Param('relationshipId') relationshipId: string,
    @Body() dto: UpdatePersonHumanRelationshipDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.updateHumanRelationship(personId, relationshipId, dto, accountId)
  }

  @Delete(':personId/human-relationships/:relationshipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHumanRelationship(
    @Param('personId') personId: string,
    @Param('relationshipId') relationshipId: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personService.deleteHumanRelationship(personId, relationshipId, accountId)
  }

  // ── 관계 시기 스냅샷(phase) CRUD ────────────────────────────────────
  /** 시기별 스냅샷 추가 — 한 관계에 N개의 phase로 변화 기록 */
  @Post(':personId/human-relationships/:relationshipId/phases')
  async createRelationshipPhase(
    @Param('personId') personId: string,
    @Param('relationshipId') relationshipId: string,
    @Body() dto: CreatePersonHumanRelationshipPhaseDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.createRelationshipPhase(
      personId,
      relationshipId,
      dto,
      accountId,
    )
  }

  @Put(':personId/human-relationships/:relationshipId/phases/:phaseId')
  async updateRelationshipPhase(
    @Param('personId') personId: string,
    @Param('relationshipId') relationshipId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePersonHumanRelationshipPhaseDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.updateRelationshipPhase(
      personId,
      relationshipId,
      phaseId,
      dto,
      accountId,
    )
  }

  @Delete(':personId/human-relationships/:relationshipId/phases/:phaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRelationshipPhase(
    @Param('personId') personId: string,
    @Param('relationshipId') relationshipId: string,
    @Param('phaseId') phaseId: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personService.deleteRelationshipPhase(
      personId,
      relationshipId,
      phaseId,
      accountId,
    )
  }

  /**
   * 멘토 계보 — 인물 중심으로 위쪽 스승 체인과 아래쪽 제자 체인을 깊이 우선 수집
   */
  @Get(':id/mentor-lineage')
  async getMentorLineage(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findMentorLineage(id, accountId)
  }

  // ── 인물 능력치 (사용자별 평가) ───────────────────────────────────
  /** 본인의 능력치 평가 조회 (없으면 null) */
  @Get(':id/my-stats')
  async getMyStats(@Param('id') id: string, @Request() req: any): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findMyStats(id, accountId)
  }

  /** 본인의 능력치 평가 upsert */
  @Put(':id/my-stats')
  async upsertMyStats(
    @Param('id') id: string,
    @Body() dto: UpsertPersonStatsDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.upsertMyStats(id, accountId, dto)
  }

  /** 본인의 능력치 평가 삭제 */
  @Delete(':id/my-stats')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyStats(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personService.deleteMyStats(id, accountId)
  }

  // ── 인물 성격 태그 (사용자별 다중) ──────────────────────────────
  /** 본인이 부착한 성격 태그 목록 */
  @Get(':id/my-traits')
  async getMyTraits(@Param('id') id: string, @Request() req: any): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.findMyTraits(id, accountId)
  }

  /** 본인의 성격 태그 전체 교체 */
  @Put(':id/my-traits')
  async upsertMyTraits(
    @Param('id') id: string,
    @Body() dto: UpsertPersonTraitsDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.upsertMyTraits(id, accountId, dto)
  }

  // ── 능력치 + 성격 태그 합본 (단일 트랜잭션) ──────────────────
  /**
   * 능력치 + 성격 태그를 한 트랜잭션으로 upsert.
   * stats/traits 중 한쪽만 보내면 그쪽만 업데이트.
   */
  @Put(':id/my-evaluation')
  async upsertMyEvaluation(
    @Param('id') id: string,
    @Body() dto: UpsertPersonEvaluationDto,
    @Request() req: any,
  ): Promise<any> {
    const accountId = req.user?.id ?? req.user?.sub
    return this.personService.upsertMyEvaluation(id, accountId, dto)
  }

  /** 능력치 + 성격 태그 일괄 삭제 */
  @Delete(':id/my-evaluation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyEvaluation(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personService.deleteMyEvaluation(id, accountId)
  }

  /**
   * 전체 가계도 그래프 (BFS, ego 기준 4세대 위·3세대 아래).
   *
   * @param includeCollaterals 'false' 또는 '0'이면 방계 친척(삼촌·이모·고모, 조카,
   *   종조부, 고종조부 등)을 BFS에서 제외해 응답 크기와 쿼리 비용을 줄인다.
   *   기본 true — 인포그래픽의 "형제 N" 칩이 모든 조상 카드에 표시되려면 필요하다.
   */
  @Get(':id/family-tree')
  async getFamilyTree(
    @Param('id') id: string,
    @Request() req: any,
    @Query('includeCollaterals') includeCollaterals?: string,
  ): Promise<FamilyTreeResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub ?? undefined
    const flag = includeCollaterals === 'false' || includeCollaterals === '0' ? false : true
    return this.personService.getFamilyTree(id, accountId, { includeCollaterals: flag })
  }

  /**
   * ID로 인물 상세 조회 (본인 등록분만)
   */
  @Get(':id/detail')
  async getDetailById(@Param('id') id: string, @Request() req: any): Promise<{
    id: string
    name: string
    surname: string | null
    middleName: string | null
    nameDisplayOrder: string | null
    originalName: string | null
    surnameMeaning: string | null
    nameMeaning: string | null
    middleNameMeaning: string | null
    nicknames: Array<{ id: string; nickname: string; type: string | null; priority: number | null }>
    birthEra: any
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    deathEra: any
    deathYear: number | null
    deathMonth: number | null
    deathDay: number | null
    gender: string | null
    biography: string | null
    biographySections: Array<{
      id: string
      title: string
      content: string
      order: number
      sectionType: string | null
    }>
    profileImageUrl: string | null
    regnalName: string | null
    templeName: string | null
    posthumousName: string | null
    sovereignReigns: any[]
    dynastyId: string | null
    countryId: string | null
    fatherId: string | null
    motherId: string | null
    country: any
    dynasty: any
    religion: any
    denomination: any
    job: any
    birthCityId: string | null
    deathCityId: string | null
    birthAdminDivisionId: string | null
    deathAdminDivisionId: string | null
    birthPlaceText: string | null
    deathPlaceText: string | null
    birthCity: { id: string; name: string } | null
    deathCity: { id: string; name: string } | null
    birthAdminDivision: { id: string; name: string } | null
    deathAdminDivision: { id: string; name: string } | null
    father: any
    mother: any
    children: any[]
    siblings: any[]
    foundedCompanies: any[]
    books: any[]
    organizationRoles: any[]
    partyLeaderships: any[]
    partyMemberships: any[]
    electionCandidacies: any[]
    militaryCommands: any[]
    events: any[]
    governmentPositions: any[]
    spouseRelations: any[]
    spouse: any
    humanRelationships: any[]
    isBirthDateUnknown: boolean
    isDeathDateUnknown: boolean
    birthNote: string | null
    deathType: string | null
    deathCause: string | null
    deathNote: string | null
    isAlive: boolean
    influence: number | null
    preEnthronementTitle: string | null
    educations: any[]
    awards: any[]
    careers: any[]
    foundedDynasties: any[]
    countryAffiliations: any[]
    createdAt: string
    updatedAt: string
  }> {
    const accountId = req.user?.id ?? req.user?.sub
    const person: any = await this.personService.findByIdWithRelations(id, accountId)
    const humanRelationships = await this.personService.findHumanRelationships(id, accountId)

    // 부모와 자녀 중복 제거
    const childrenMap = new Map()
    person.childrenFromFather?.forEach((child: any) =>
      childrenMap.set(child.id, child),
    )
    person.childrenFromMother?.forEach((child: any) =>
      childrenMap.set(child.id, child),
    )
    // 각 자녀에 첫 배우자(spouse) 평탄화 — 가계도 렌더용
    const children = Array.from(childrenMap.values()).map((child: any) => ({
      ...child,
      spouse: child.spouseRelationsAsPerson?.[0]?.spouse ?? null,
    }))

    // BigInt → 문자열, Date → ISO (그대로 두면 Date가 `{}`로 직렬화되어 클라이언트에서 날짜가 사라짐)
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) {
        return Number.isNaN(obj.getTime()) ? null : obj.toISOString()
      }
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key])
        }

        return result
      }

      return obj
    }

    // 형제자매 계산 (부·모의 자녀 중 본인 제외)
    const siblingMap = new Map<string, any>()
    person.father?.childrenFromFather?.forEach((s: any) => { if (s.id !== person.id) siblingMap.set(s.id, s) })
    person.mother?.childrenFromMother?.forEach((s: any) => { if (s.id !== person.id) siblingMap.set(s.id, s) })
    const siblings = serializeBigInt(Array.from(siblingMap.values()).map((s: any) => ({
      id: s.id, name: s.name, surname: s.surname, nameDisplayOrder: s.nameDisplayOrder,
      regnalName: s.regnalName ?? null,
      gender: s.gender, dynasty: s.dynasty, birthDate: s.birthDate instanceof Date ? s.birthDate.toISOString() : s.birthDate ?? null,
      deathDate: s.deathDate instanceof Date ? s.deathDate.toISOString() : s.deathDate ?? null,
      profileImageUrl: s.profileImageUrl ?? null, profileImages: s.profileImages ?? [],
    })))

    return {
      id: person.id,
      name: person.name,
      surname: person.surname,
      middleName: person.middleName ?? null,
      nameDisplayOrder: (person.nameDisplayOrder as string | null) ?? null,
      originalName: person.originalName ?? null,
      surnameMeaning: person.surnameMeaning ?? null,
      nameMeaning: person.nameMeaning ?? null,
      middleNameMeaning: person.middleNameMeaning ?? null,
      nicknames: (person.nicknames || []).map((n: any) => ({
        id: n.id,
        nickname: n.nickname,
        type: n.type ?? null,
        priority: n.priority ?? null,
      })),
      birthEra: person.birthEra as any,
      // birthDate는 UTC 자정 저장 — UTC getter로 읽어야 입력일이 그대로 복원된다(-1일 방지).
      birthYear: person.birthDate ? person.birthDate.getUTCFullYear() : null,
      birthMonth: person.birthDate ? person.birthDate.getUTCMonth() + 1 : null,
      birthDay: person.birthDate ? person.birthDate.getUTCDate() : null,
      deathEra: person.deathEra as any,
      deathYear: person.deathDate ? person.deathDate.getUTCFullYear() : null,
      deathMonth: person.deathDate ? person.deathDate.getUTCMonth() + 1 : null,
      deathDay: person.deathDate ? person.deathDate.getUTCDate() : null,
      gender: person.gender,
      biography: person.biography,
      biographySections: (person.biographySections ?? []).map((s: any) => ({
        id: s.id,
        title: s.title ?? '',
        content: s.content ?? '',
        order: s.order ?? 0,
        sectionType: s.sectionType ?? null,
      })),
      profileImageUrl: person.profileImageUrl,
      regnalName: person.regnalName ?? null,
      templeName: person.templeName ?? null,
      posthumousName: person.posthumousName ?? null,
      sovereignReigns: serializeBigInt(person.sovereignReigns ?? []),
      dynasty: serializeBigInt(person.dynasty),
      religion: serializeBigInt(person.religion),
      denomination: serializeBigInt(person.denomination),
      birthCityId: person.birthCityId ?? null,
      deathCityId: person.deathCityId ?? null,
      birthAdminDivisionId: person.birthAdminDivisionId ?? null,
      deathAdminDivisionId: person.deathAdminDivisionId ?? null,
      birthPlaceText: person.birthPlaceText ?? null,
      deathPlaceText: person.deathPlaceText ?? null,
      birthCity: person.birthCity ? { id: person.birthCity.id, name: person.birthCity.name } : null,
      deathCity: person.deathCity ? { id: person.deathCity.id, name: person.deathCity.name } : null,
      birthAdminDivision: person.birthAdminDivision ? { id: person.birthAdminDivision.id, name: person.birthAdminDivision.name } : null,
      deathAdminDivision: person.deathAdminDivision ? { id: person.deathAdminDivision.id, name: person.deathAdminDivision.name } : null,
      dynastyId: person.dynastyId ?? null,
      job: person.job ?? null,
      ...(() => {
        // CITIZENSHIP priority=0 소속을 effective 국가로 도출.
        // countryId·country 객체가 일치하도록 함께 반환 (Person.countryId 기반 객체와 affiliation이 다른 record일 수 있음).
        const affiliations: any[] = person.countryAffiliations ?? []
        const main = affiliations
          .filter((a: any) => String(a.affiliationType) === 'CITIZENSHIP')
          .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))[0]
        if (main) {
          const effectiveCountryId =
            main.historicalCountryId ?? main.countryId ?? null
          const effectiveCountryObj =
            main.historicalCountry ?? main.country ?? person.country ?? null
          return {
            countryId: effectiveCountryId,
            country: serializeBigInt(effectiveCountryObj),
          }
        }
        return {
          countryId: person.countryId ?? null,
          country: serializeBigInt(person.country),
        }
      })(),
      fatherId: person.fatherId ?? null,
      motherId: person.motherId ?? null,
      father: person.father != null ? serializeBigInt(person.father) : null,
      mother: person.mother != null ? serializeBigInt(person.mother) : null,
      children: serializeBigInt(children),
      siblings: siblings,
      foundedCompanies: person.foundedCompanies || [],
      books: person.Book || [],
      organizationRoles: person.OrganizationPersonRole || [],
      partyLeaderships: person.PoliticalPartyLeadership || [],
      partyMemberships: serializeBigInt(person.politicalPartyMemberships || []),
      electionCandidacies: serializeBigInt(person.electionCandidacies || []),
      militaryCommands: person.MilitaryUnitCommander || [],
      events: person.PersonEvent || [],
      governmentPositions: person.GovernmentTenures || [],
      spouseRelations: (() => {
        const seen = new Set<string>()
        return [
          ...(person.spouseRelationsAsPerson || []).map((rel: any) => ({
            id: rel.id,
            marriageStartDate: rel.marriageStartDate?.toISOString?.() ?? null,
            marriageEndDate: rel.marriageEndDate?.toISOString?.() ?? null,
            note: rel.note ?? null,
            spouse: rel.spouse ? serializeBigInt(rel.spouse) : null,
          })),
          // 역방향: 현재 인물이 spouseId 쪽에 등록된 경우 — rel.person이 실제 배우자
          ...(person.spouseRelationsAsSpouse || []).map((rel: any) => ({
            id: rel.id,
            marriageStartDate: rel.marriageStartDate?.toISOString?.() ?? null,
            marriageEndDate: rel.marriageEndDate?.toISOString?.() ?? null,
            note: rel.note ?? null,
            spouse: rel.person ? serializeBigInt(rel.person) : null,
          })),
        ].filter((rel) => {
          const spouseId = rel.spouse?.id
          if (!spouseId) return true
          if (seen.has(String(spouseId))) return false
          seen.add(String(spouseId))
          return true
        })
      })(),
      spouse:
        person.spouseRelationsAsPerson?.[0]?.spouse ??
        person.spouseRelationsAsSpouse?.[0]?.person ??
        null,
      humanRelationships,
      isBirthDateUnknown: person.isBirthDateUnknown ?? false,
      isDeathDateUnknown: person.isDeathDateUnknown ?? false,
      deathType: (person as any).deathType ?? null,
      deathCause: (person as any).deathCause ?? null,
      deathNote: (person as any).deathNote ?? null,
      isAlive: person.isAlive ?? false,
      influence: (person as any).influence ?? null,
      preEnthronementTitle: (person as any).preEnthronementTitle ?? null,
      educations: serializeBigInt(person.educations ?? []),
      awards: serializeBigInt(person.awards ?? []),
      foundedDynasties: serializeBigInt(person.foundedDynasties ?? []),
      countryAffiliations: serializeBigInt(person.countryAffiliations ?? []),
      careers: (() => {
        const out: any[] = []
        const push = (kind: string, list: any[] | undefined) => {
          for (const raw of list ?? []) {
            const c = serializeBigInt(raw) as any
            // 직급/계급 — military는 rank, athlete는 job, 나머지는 position(Job 관계)
            // Job 모델은 title 필드를 쓰므로 UI 호환을 위해 name으로도 노출.
            const rawRank =
              kind === 'military'
                ? c.rank ?? null
                : kind === 'athlete'
                  ? c.job ?? null
                  : c.position ?? null
            const rank = rawRank
              ? { id: rawRank.id, name: rawRank.title ?? rawRank.name ?? null }
              : null
            // 추가 식별 라벨 (군: branch, 학계/언론: department, 운동: sport, 비즈니스: title 등)
            const title =
              c.title ??
              c.position /* athlete의 string 포지션 */ ??
              c.branch ??
              c.department ??
              c.sport ??
      birthNote: (person as any).birthNote ?? null,
              c.specialization ??
              null
            out.push({
              id: c.id,
              kind,
              rank,
              organization: c.organization ?? null,
              title,
              branch: c.branch ?? null,
              department: c.department ?? null,
              termNumber: c.termNumber ?? null,
              startDate: c.startDate ?? null,
              endDate: c.endDate ?? null,
              notes: c.notes ?? null,
            })
          }
        }
        push('military', (person as any).militaryCareers)
        push('business', (person as any).businessCareers)
        push('academic', (person as any).academicCareers)
        push('religious', (person as any).religiousCareers)
        push('artist', (person as any).artistCareers)
        push('athlete', (person as any).athleteCareers)
        push('media', (person as any).mediaCareers)
        push('legal', (person as any).legalCareers)
        push('medical', (person as any).medicalCareers)
        return out
      })(),
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    }
  }

  /**
   * 인물 생성 (현재 계정 소유로 등록)
   */
  @Post()
  async create(@Body() dto: CreatePersonDto, @Request() req: any): Promise<PersonResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    // birth/death 구조화 값 → era 컬럼 + 크기값 UTC 날짜 (네이티브 문자열 파싱 금지 — BC가 AD로 둔갑)
    let birthDate: Date | undefined
    let deathDate: Date | undefined
    let birthEra: 'BC' | 'AD' | undefined
    let deathEra: 'BC' | 'AD' | undefined

    if (dto.birth) {
      // birth 객체가 있으면 이를 사용 — era는 birthEra 컬럼에, 날짜는 양수 크기값 연도로 저장
      const { era, year, month, day } = dto.birth
      birthDate = buildUtcDateFromParts(year, month, day)
      birthEra = era
    } else if (dto.birthDate) {
      // birthDate 문자열이 있으면 사용 ('-' 접두면 BC)
      const parsed = parsePersonDateString(dto.birthDate)
      if (parsed) {
        birthDate = parsed.date
        birthEra = parsed.era === 'BC' ? 'BC' : ((dto.birthEra as 'BC' | 'AD' | undefined) ?? parsed.era)
      }
    }

    if (dto.death) {
      // death 객체가 있으면 이를 사용
      const { era, year, month, day } = dto.death
      deathDate = buildUtcDateFromParts(year, month, day)
      deathEra = era
    } else if (dto.deathDate) {
      // deathDate 문자열이 있으면 사용 ('-' 접두면 BC)
      const parsed = parsePersonDateString(dto.deathDate)
      if (parsed) {
        deathDate = parsed.date
        deathEra = parsed.era === 'BC' ? 'BC' : ((dto.deathEra as 'BC' | 'AD' | undefined) ?? parsed.era)
      }
    }

    return this.personService.create({
      name: dto.name,
      middleName: dto.middleName,
      surname: dto.surname,
      nameDisplayOrder: dto.nameDisplayOrder,
      originalName: dto.originalName,
      surnameMeaning: dto.surnameMeaning,
      nameMeaning: dto.nameMeaning,
      middleNameMeaning: dto.middleNameMeaning,
      birthDate,
      deathDate,
      birthEra,
      deathEra,
      isBirthDateUnknown: dto.isBirthDateUnknown,
      isDeathDateUnknown: dto.isDeathDateUnknown,
      deathType: dto.deathType ?? null,
      deathCause: dto.deathCause ?? null,
      deathNote: dto.deathNote ?? null,
      isAlive: dto.isAlive,
      influence: dto.influence,
      gender: dto.gender,
      biography: dto.biography,
      profileImageUrl: dto.profileImageUrl,
      showLifespanOnEventList: dto.showLifespanOnEventList,
      regnalName: dto.regnalName,
      templeName: dto.templeName,
      posthumousName: dto.posthumousName,
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      countryId: dto.countryId,
      birthCityId: dto.birthCityId,
      deathCityId: dto.deathCityId,
      birthAdminDivisionId: dto.birthAdminDivisionId,
      deathAdminDivisionId: dto.deathAdminDivisionId,
      birthPlaceText: dto.birthPlaceText,
      deathPlaceText: dto.deathPlaceText,
      spouseRelations: dto.spouseRelations?.map((s) => ({
        spouseId: s.spouseId,
        marriageStartDate: s.marriageStartDate ? new Date(s.marriageStartDate) : undefined,
        marriageEndDate: s.marriageEndDate ? new Date(s.marriageEndDate) : undefined,
        note: s.note,
      })),
      countryAffiliations: dto.countryAffiliations,
      nicknames: dto.nicknames,
    }, accountId)
      birthNote: dto.birthNote,
  }

  /**
   * 인물 수정 (본인 등록분만)
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
    @Request() req: any,
  ): Promise<PersonResponseDto> {
    const accountId = req.user?.id ?? req.user?.sub
    // birth/death 처리 — undefined = 변경 없음, null = 명시적 해제(birthDate·birthEra 동시 클리어).
    // 구조화 값 → era 컬럼 + 크기값 UTC 날짜 (네이티브 문자열 파싱 금지 — BC가 AD로 둔갑)
    let birthDate: Date | null | undefined
    let deathDate: Date | null | undefined
    let birthEra: 'BC' | 'AD' | null | undefined
    let deathEra: 'BC' | 'AD' | null | undefined

    if (dto.birth === null) {
      birthDate = null
      birthEra = null
    } else if (dto.birth) {
      const { era, year, month, day } = dto.birth
      birthDate = buildUtcDateFromParts(year, month, day)
      birthEra = era
    } else if (dto.birthDate) {
      const parsed = parsePersonDateString(dto.birthDate)
      if (parsed) {
        birthDate = parsed.date
        birthEra = parsed.era === 'BC' ? 'BC' : ((dto.birthEra as 'BC' | 'AD' | undefined) ?? parsed.era)
      }
    }

    if (dto.death === null) {
      deathDate = null
      deathEra = null
    } else if (dto.death) {
      const { era, year, month, day } = dto.death
      deathDate = buildUtcDateFromParts(year, month, day)
      deathEra = era
    } else if (dto.deathDate) {
      const parsed = parsePersonDateString(dto.deathDate)
      if (parsed) {
        deathDate = parsed.date
        deathEra = parsed.era === 'BC' ? 'BC' : ((dto.deathEra as 'BC' | 'AD' | undefined) ?? parsed.era)
      }
    }

    // 이중 안전장치 — '출생일 미상'/'생존 중'/'사망일 미상' 전환 시 날짜·era를 함께 클리어해
    // isAlive=true인데 deathDate가 남는 모순 상태를 방지한다.
    if (dto.isBirthDateUnknown === true) {
      birthDate = null
      birthEra = null
    }
    if (dto.isAlive === true || dto.isDeathDateUnknown === true) {
      deathDate = null
      deathEra = null
    }

    return this.personService.update(id, {
      name: dto.name,
      middleName: dto.middleName,
      surname: dto.surname,
      nameDisplayOrder: dto.nameDisplayOrder,
      originalName: dto.originalName,
      surnameMeaning: dto.surnameMeaning,
      nameMeaning: dto.nameMeaning,
      middleNameMeaning: dto.middleNameMeaning,
      birthDate,
      deathDate,
      birthEra,
      deathEra,
      isBirthDateUnknown: dto.isBirthDateUnknown,
      isDeathDateUnknown: dto.isDeathDateUnknown,
      // PATCH 의미 — 보내지 않은 필드(undefined)는 변경 없음으로 둔다.
      // `?? null`로 강제하면 전기·프로필 등 부분 업데이트 시 사망 상세가 지워진다.
      // (등록 폼은 생존중 전환 시 명시적 null을 보내므로 "비우기"는 그대로 동작)
      deathType: dto.deathType,
      deathCause: dto.deathCause,
      deathNote: dto.deathNote,
      isAlive: dto.isAlive,
      influence: dto.influence,
      gender: dto.gender,
      biography: dto.biography,
      profileImageUrl: dto.profileImageUrl,
      showLifespanOnEventList: dto.showLifespanOnEventList,
      regnalName: dto.regnalName,
      templeName: dto.templeName,
      posthumousName: dto.posthumousName,
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      countryId: dto.countryId,
      birthCityId: dto.birthCityId,
      deathCityId: dto.deathCityId,
      birthAdminDivisionId: dto.birthAdminDivisionId,
      deathAdminDivisionId: dto.deathAdminDivisionId,
      birthPlaceText: dto.birthPlaceText,
      deathPlaceText: dto.deathPlaceText,
      spouseRelations: dto.spouseRelations?.map((s) => ({
        spouseId: s.spouseId,
        marriageStartDate: s.marriageStartDate ? new Date(s.marriageStartDate) : undefined,
        marriageEndDate: s.marriageEndDate ? new Date(s.marriageEndDate) : undefined,
        note: s.note,
      })),
      countryAffiliations: dto.countryAffiliations,
      sections: dto.sections,
      nicknames: dto.nicknames,
      birthNote: dto.birthNote,
    }, accountId)
  }

  /**
   * 인물 삭제 (본인 등록분만)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req: any): Promise<void> {
    const accountId = req.user?.id ?? req.user?.sub
    await this.personService.delete(id, accountId)
  }

  // ========================
  // Career 관리 엔드포인트
  // ========================

  /**
   * 인물의 모든 경력 조회
   */
  @Get(':personId/careers')
  async getAllCareers(@Param('personId') personId: string): Promise<AllCareersResponseDto> {
    return this.personService.findAllCareers(personId)
  }

  /**
   * 군인 경력 추가
   */
  @Post('careers/military')
  async addMilitaryCareer(@Body() dto: CreateMilitaryCareerDto): Promise<MilitaryCareerResponseDto> {
    return this.personService.addMilitaryCareer(dto)
  }

  /**
   * 기업인 경력 추가
   */
  @Post('careers/business')
  async addBusinessCareer(@Body() dto: CreateBusinessCareerDto): Promise<BusinessCareerResponseDto> {
    return this.personService.addBusinessCareer(dto)
  }

  /**
   * 학자 경력 추가
   */
  @Post('careers/academic')
  async addAcademicCareer(@Body() dto: CreateAcademicCareerDto): Promise<AcademicCareerResponseDto> {
    return this.personService.addAcademicCareer(dto)
  }

  /**
   * 운동선수 경력 추가
   */
  @Post('careers/athlete')
  async addAthleteCareer(@Body() dto: CreateAthleteCareerDto): Promise<AthleteCareerResponseDto> {
    return this.personService.addAthleteCareer(dto)
  }

  /**
   * 종교인 경력 추가
   */
  @Post('careers/religious')
  async addReligiousCareer(@Body() dto: CreateReligiousCareerDto): Promise<ReligiousCareerResponseDto> {
    return this.personService.addReligiousCareer(dto)
  }

  /**
   * 예술가 경력 추가
   */
  @Post('careers/artist')
  async addArtistCareer(@Body() dto: CreateArtistCareerDto): Promise<ArtistCareerResponseDto> {
    return this.personService.addArtistCareer(dto)
  }

  /**
   * 언론인 경력 추가
   */
  @Post('careers/media')
  async addMediaCareer(@Body() dto: CreateMediaCareerDto): Promise<MediaCareerResponseDto> {
    return this.personService.addMediaCareer(dto)
  }

  /**
   * 법조인 경력 추가
   */
  @Post('careers/legal')
  async addLegalCareer(@Body() dto: CreateLegalCareerDto): Promise<LegalCareerResponseDto> {
    return this.personService.addLegalCareer(dto)
  }

  /**
   * 의료인 경력 추가
   */
  @Post('careers/medical')
  async addMedicalCareer(@Body() dto: CreateMedicalCareerDto): Promise<MedicalCareerResponseDto> {
    return this.personService.addMedicalCareer(dto)
  }

  /**
   * 학력 추가
   */
  @Post('educations')
  async addEducation(@Body() dto: CreateEducationDto): Promise<PersonEducationResponseDto> {
    return this.personService.addEducation(dto)
  }

  /**
   * 수상/훈장 추가
   */
  @Post('awards')
  async addAward(@Body() dto: CreatePersonAwardDto): Promise<PersonAwardResponseDto> {
    return this.personService.addAward(dto)
  }

  // ========================
  // Career·학력·수상 삭제 엔드포인트
  // ========================

  /**
   * 군인 경력 삭제
   */
  @Delete('careers/military/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMilitaryCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteMilitaryCareer(id)
  }

  /**
   * 기업인 경력 삭제
   */
  @Delete('careers/business/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBusinessCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteBusinessCareer(id)
  }

  /**
   * 학자 경력 삭제
   */
  @Delete('careers/academic/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAcademicCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteAcademicCareer(id)
  }

  /**
   * 운동선수 경력 삭제
   */
  @Delete('careers/athlete/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAthleteCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteAthleteCareer(id)
  }

  /**
   * 종교인 경력 삭제
   */
  @Delete('careers/religious/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReligiousCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteReligiousCareer(id)
  }

  /**
   * 예술가 경력 삭제
   */
  @Delete('careers/artist/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArtistCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteArtistCareer(id)
  }

  /**
   * 언론인 경력 삭제
   */
  @Delete('careers/media/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMediaCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteMediaCareer(id)
  }

  /**
   * 법조인 경력 삭제
   */
  @Delete('careers/legal/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLegalCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteLegalCareer(id)
  }

  /**
   * 의료인 경력 삭제
   */
  @Delete('careers/medical/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedicalCareer(@Param('id') id: string): Promise<void> {
    await this.personService.deleteMedicalCareer(id)
  }

  /**
   * 학력 삭제
   */
  @Delete('educations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEducation(@Param('id') id: string): Promise<void> {
    await this.personService.deleteEducation(id)
  }

  /**
   * 수상/훈장 삭제
   */
  @Delete('awards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAward(@Param('id') id: string): Promise<void> {
    await this.personService.deleteAward(id)
  }
}
