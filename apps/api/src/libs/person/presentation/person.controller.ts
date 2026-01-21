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
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core'
import { PersonService } from '../application/person.service'
import { 
  CreatePersonDto, 
  UpdatePersonDto, 
  PersonResponseDto,
  CreateMilitaryCareerDto,
  CreateGovernmentCareerDto,
  CreateBusinessCareerDto,
  CreateAcademicCareerDto,
  CreateAthleteCareerDto,
  CreateEducationDto,
  CreatePersonAwardDto,
} from './dto'

/**
 * 인물 관리 컨트롤러
 */
@ApiTags('persons')
@Controller('persons')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  /**
   * 모든 인물 목록 조회
   */
  @Get()
  async getAll(): Promise<PersonResponseDto[]> {
    const persons = await this.personService.findAll()
    return persons.map((person) => ({
      id: person.id,
      name: person.name,
      surname: person.surname,
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
      dynastyId: person.dynastyId,
      religionId: person.religionId,
      denominationId: person.denominationId,
      fatherId: person.fatherId,
      motherId: person.motherId,
      jobId: person.jobId,
      countryId: person.countryId,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    }))
  }

  /**
   * 모든 인물 목록 조회 (정부 직책 포함)
   */
  @Get('with-government-positions')
  async getAllWithGovernmentPositions(): Promise<any[]> {
    const persons = await this.personService.findAllWithGovernmentPositions()

    // BigInt를 문자열로 변환하는 헬퍼 함수
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
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
      governmentPositions: serializeBigInt(person.GovernmentTenures || []),
    }))
  }

  /**
   * ID로 인물 조회
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<PersonResponseDto> {
    const person = await this.personService.findById(id)
    return {
      id: person.id,
      name: person.name,
      surname: person.surname,
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
      dynastyId: person.dynastyId,
      religionId: person.religionId,
      denominationId: person.denominationId,
      fatherId: person.fatherId,
      motherId: person.motherId,
      jobId: person.jobId,
      countryId: person.countryId,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    }
  }

  /**
   * ID로 인물 상세 조회 (관계 데이터 포함)
   */
  @Get(':id/detail')
  async getDetailById(@Param('id') id: string): Promise<{
    id: string
    name: string
    surname: string | null
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
    country: any
    dynasty: any
    religion: any
    denomination: any
    job: any
    father: any
    mother: any
    children: any[]
    foundedCompanies: any[]
    companies: any[]
    books: any[]
    organizationRoles: any[]
    partyLeaderships: any[]
    militaryCommands: any[]
    events: any[]
    governmentPositions: any[]
    createdAt: string
    updatedAt: string
  }> {
    const person: any = await this.personService.findByIdWithRelations(id)

    // 부모와 자녀 중복 제거
    const childrenMap = new Map()
    person.childrenFromFather?.forEach((child: any) =>
      childrenMap.set(child.id, child),
    )
    person.childrenFromMother?.forEach((child: any) =>
      childrenMap.set(child.id, child),
    )
    const children = Array.from(childrenMap.values())

    // BigInt를 문자열로 변환하는 헬퍼 함수
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
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
      father: person.father,
      mother: person.mother,
      children,
      foundedCompanies: person.foundedCompanies || [],
      companies: person.Company || [],
      books: person.Book || [],
      organizationRoles: person.OrganizationPersonRole || [],
      partyLeaderships: person.PoliticalPartyLeadership || [],
      militaryCommands: person.MilitaryUnitCommander || [],
      events: person.PersonEvent || [],
      governmentPositions: person.GovernmentTenures || [],
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    }
  }

  /**
   * 인물 생성
   */
  @Post()
  async create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    const person = await this.personService.create({
      name: dto.name,
      surname: dto.surname,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
      gender: dto.gender,
      biography: dto.biography,
      profileImageUrl: dto.profileImageUrl,
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      jobId: dto.jobId,
      countryId: dto.countryId,
    })

    return {
      id: person.id,
      name: person.name,
      surname: person.surname,
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
      dynastyId: person.dynastyId,
      religionId: person.religionId,
      denominationId: person.denominationId,
      fatherId: person.fatherId,
      motherId: person.motherId,
      jobId: person.jobId,
      countryId: person.countryId,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    }
  }

  /**
   * 인물 수정
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    const person = await this.personService.update(id, {
      name: dto.name,
      surname: dto.surname,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      deathDate: dto.deathDate ? new Date(dto.deathDate) : undefined,
      gender: dto.gender,
      biography: dto.biography,
      profileImageUrl: dto.profileImageUrl,
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      jobId: dto.jobId,
      countryId: dto.countryId,
    })

    return {
      id: person.id,
      name: person.name,
      surname: person.surname,
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
      dynastyId: person.dynastyId,
      religionId: person.religionId,
      denominationId: person.denominationId,
      fatherId: person.fatherId,
      motherId: person.motherId,
      jobId: person.jobId,
      countryId: person.countryId,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    }
  }

  /**
   * 인물 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.personService.delete(id)
  }

  // ========================
  // Career 관리 엔드포인트
  // ========================

  /**
   * 인물의 모든 경력 조회
   */
  @Get(':personId/careers')
  async getAllCareers(@Param('personId') personId: string) {
    return this.personService.findAllCareers(personId)
  }

  /**
   * 군인 경력 추가
   */
  @Post('careers/military')
  async addMilitaryCareer(@Body() dto: CreateMilitaryCareerDto) {
    return this.personService.addMilitaryCareer(dto)
  }

  /**
   * 정치인/공무원 경력 추가
   */
  @Post('careers/government')
  async addGovernmentCareer(@Body() dto: CreateGovernmentCareerDto) {
    return this.personService.addGovernmentCareer(dto)
  }

  /**
   * 기업인 경력 추가
   */
  @Post('careers/business')
  async addBusinessCareer(@Body() dto: CreateBusinessCareerDto) {
    return this.personService.addBusinessCareer(dto)
  }

  /**
   * 학자 경력 추가
   */
  @Post('careers/academic')
  async addAcademicCareer(@Body() dto: CreateAcademicCareerDto) {
    return this.personService.addAcademicCareer(dto)
  }

  /**
   * 운동선수 경력 추가
   */
  @Post('careers/athlete')
  async addAthleteCareer(@Body() dto: CreateAthleteCareerDto) {
    return this.personService.addAthleteCareer(dto)
  }

  /**
   * 학력 추가
   */
  @Post('educations')
  async addEducation(@Body() dto: CreateEducationDto) {
    return this.personService.addEducation(dto)
  }

  /**
   * 수상/훈장 추가
   */
  @Post('awards')
  async addAward(@Body() dto: CreatePersonAwardDto) {
    return this.personService.addAward(dto)
  }
}
