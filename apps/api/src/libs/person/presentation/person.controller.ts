import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  UpdatePersonHumanRelationshipDto,
} from './dto'

export interface PersonCountByModernCountry {
  countryId: string
  count: number
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

  /**
   * ID로 인물 상세 조회 (본인 등록분만)
   */
  @Get(':id/detail')
  async getDetailById(@Param('id') id: string, @Request() req: any): Promise<{
    id: string
    name: string
    surname: string | null
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
    profileImageUrl: string | null
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
    foundedCompanies: any[]
    companies: any[]
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
    isAlive: boolean
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
    const children = Array.from(childrenMap.values())

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

    return {
      id: person.id,
      name: person.name,
      surname: person.surname,
      nicknames: (person.nicknames || []).map((n: any) => ({
        id: n.id,
        nickname: n.nickname,
        type: n.type ?? null,
        priority: n.priority ?? null,
      })),
      birthEra: person.birthEra as any,
      birthYear: person.birthDate ? person.birthDate.getFullYear() : null,
      birthMonth: person.birthDate ? person.birthDate.getMonth() + 1 : null,
      birthDay: person.birthDate ? person.birthDate.getDate() : null,
      deathEra: person.deathEra as any,
      deathYear: person.deathDate ? person.deathDate.getFullYear() : null,
      deathMonth: person.deathDate ? person.deathDate.getMonth() + 1 : null,
      deathDay: person.deathDate ? person.deathDate.getDate() : null,
      gender: person.gender,
      biography: person.biography,
      profileImageUrl: person.profileImageUrl,
      country: serializeBigInt(person.country),
      dynasty: serializeBigInt(person.dynasty),
      religion: serializeBigInt(person.religion),
      denomination: serializeBigInt(person.denomination),
      job: serializeBigInt(person.job),
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
      countryId: person.countryId ?? null,
      fatherId: person.fatherId ?? null,
      motherId: person.motherId ?? null,
      father: person.father != null ? serializeBigInt(person.father) : null,
      mother: person.mother != null ? serializeBigInt(person.mother) : null,
      children,
      foundedCompanies: person.foundedCompanies || [],
      companies: person.Company || [],
      books: person.Book || [],
      organizationRoles: person.OrganizationPersonRole || [],
      partyLeaderships: person.PoliticalPartyLeadership || [],
      partyMemberships: serializeBigInt(person.politicalPartyMemberships || []),
      electionCandidacies: serializeBigInt(person.electionCandidacies || []),
      militaryCommands: person.MilitaryUnitCommander || [],
      events: person.PersonEvent || [],
      governmentPositions: person.GovernmentTenures || [],
      spouseRelations: (person.spouseRelationsAsPerson || []).map((rel: any) => ({
        id: rel.id,
        marriageStartDate: rel.marriageStartDate?.toISOString?.() ?? null,
        marriageEndDate: rel.marriageEndDate?.toISOString?.() ?? null,
        note: rel.note,
        spouse: rel.spouse,
      })),
      spouse: person.spouseRelationsAsPerson?.[0]?.spouse ?? null,
      humanRelationships,
      isBirthDateUnknown: person.isBirthDateUnknown ?? false,
      isDeathDateUnknown: person.isDeathDateUnknown ?? false,
      isAlive: person.isAlive ?? false,
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
    // birth/death 객체에서 날짜 문자열로 변환
    let birthDate: Date | undefined
    let deathDate: Date | undefined

    if (dto.birth) {
      // birth 객체가 있으면 이를 사용
      const { era, year, month, day } = dto.birth
      const yearStr = era === 'BC' ? `-${year}` : `${year}`
      const monthStr = (month || 1).toString().padStart(2, '0')
      const dayStr = (day || 1).toString().padStart(2, '0')
      birthDate = new Date(`${yearStr}-${monthStr}-${dayStr}`)
    } else if (dto.birthDate) {
      // birthDate 문자열이 있으면 사용
      birthDate = new Date(dto.birthDate)
    }

    if (dto.death) {
      // death 객체가 있으면 이를 사용
      const { era, year, month, day } = dto.death
      const yearStr = era === 'BC' ? `-${year}` : `${year}`
      const monthStr = (month || 1).toString().padStart(2, '0')
      const dayStr = (day || 1).toString().padStart(2, '0')
      deathDate = new Date(`${yearStr}-${monthStr}-${dayStr}`)
    } else if (dto.deathDate) {
      // deathDate 문자열이 있으면 사용
      deathDate = new Date(dto.deathDate)
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
      isBirthDateUnknown: dto.isBirthDateUnknown,
      isDeathDateUnknown: dto.isDeathDateUnknown,
      isAlive: dto.isAlive,
      gender: dto.gender,
      biography: dto.biography,
      profileImageUrl: dto.profileImageUrl,
      showLifespanOnEventList: dto.showLifespanOnEventList,
      regnalName: dto.regnalName,
      templeName: dto.templeName,
      posthumousName: dto.posthumousName,
      preEnthronementTitle: dto.preEnthronementTitle,
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      jobId: dto.jobId,
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
    }, accountId)
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
    // birth/death 객체에서 날짜 문자열로 변환
    let birthDate: Date | undefined
    let deathDate: Date | undefined

    if (dto.birth) {
      const { era, year, month, day } = dto.birth
      const yearStr = era === 'BC' ? `-${year}` : `${year}`
      const monthStr = (month || 1).toString().padStart(2, '0')
      const dayStr = (day || 1).toString().padStart(2, '0')
      birthDate = new Date(`${yearStr}-${monthStr}-${dayStr}`)
    } else if (dto.birthDate) {
      birthDate = new Date(dto.birthDate)
    }

    if (dto.death) {
      const { era, year, month, day } = dto.death
      const yearStr = era === 'BC' ? `-${year}` : `${year}`
      const monthStr = (month || 1).toString().padStart(2, '0')
      const dayStr = (day || 1).toString().padStart(2, '0')
      deathDate = new Date(`${yearStr}-${monthStr}-${dayStr}`)
    } else if (dto.deathDate) {
      deathDate = new Date(dto.deathDate)
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
      isBirthDateUnknown: dto.isBirthDateUnknown,
      isDeathDateUnknown: dto.isDeathDateUnknown,
      isAlive: dto.isAlive,
      gender: dto.gender,
      biography: dto.biography,
      profileImageUrl: dto.profileImageUrl,
      showLifespanOnEventList: dto.showLifespanOnEventList,
      regnalName: dto.regnalName,
      templeName: dto.templeName,
      posthumousName: dto.posthumousName,
      preEnthronementTitle: dto.preEnthronementTitle,
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      jobId: dto.jobId,
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
}
