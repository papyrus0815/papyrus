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
    return this.personService.findAll()
  }

  /**
   * 모든 인물 목록 조회 (정부 직책 포함)
   */
  @Get('with-government-positions')
  async getAllWithGovernmentPositions(): Promise<any[]> {
    const persons = await this.personService.findAllWithGovernmentPositions()

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
   * ID로 인물 조회
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<PersonResponseDto> {
    return this.personService.findById(id)
  }

  /**
   * 인물의 재임 기록만 조회 (GovernmentPositionTenure)
   * 수정 페이지에서 경력 불러오기 실패 시 이 API로 보완
   */
  @Get(':id/tenures')
  async getTenuresByPersonId(@Param('id') id: string): Promise<any[]> {
    return this.personService.findTenuresByPersonId(id)
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
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      jobId: dto.jobId,
      countryId: dto.countryId,
      birthCityId: dto.birthCityId,
      deathCityId: dto.deathCityId,
    })
  }

  /**
   * 인물 수정
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
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
      dynastyId: dto.dynastyId,
      religionId: dto.religionId,
      denominationId: dto.denominationId,
      fatherId: dto.fatherId,
      motherId: dto.motherId,
      jobId: dto.jobId,
      countryId: dto.countryId,
      birthCityId: dto.birthCityId,
      deathCityId: dto.deathCityId,
    })
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
