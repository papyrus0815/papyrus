import { BadRequestException, Injectable } from '@nestjs/common'
import {
  Person,
  MilitaryCareer,
  BusinessCareer,
  AcademicCareer,
  AthleteCareer,
  ReligiousCareer,
  ArtistCareer,
  MediaCareer,
  LegalCareer,
  MedicalCareer,
  PersonEducation,
  PersonAward,
  Prisma,
  TenureMandateSource,
} from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'
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
} from '../presentation/dto'

/** 재임·행정부 등 nested person에 이름 표시 순서용 국가 필드 포함 */
const PERSON_INCLUDE_COUNTRY_FOR_NAME: Prisma.PersonInclude = {
  country: {
    select: {
      id: true,
      name: true,
      flagEmoji: true,
      isoCode: true,
      defaultNameDisplayOrder: true,
    },
  },
}

/**
 * 출생이 역사적 국가(BIRTH_PLACE)만 있고 Person.countryId는 비어 있는 경우가 많음.
 * 이때도 연결된 현대 국가의 defaultNameDisplayOrder를 쓰려면 affiliation·historical→modern 조인 필요.
 */
const PERSON_INCLUDE_AFFILIATIONS_FOR_NAME: Prisma.PersonCountryAffiliationInclude =
  {
    country: {
      select: {
        id: true,
        name: true,
        flagEmoji: true,
        isoCode: true,
        defaultNameDisplayOrder: true,
      },
    },
    historicalCountry: {
      include: {
        modernConnections: {
          take: 1,
          include: {
            modernCountry: {
              select: {
                id: true,
                name: true,
                flagEmoji: true,
                isoCode: true,
                defaultNameDisplayOrder: true,
              },
            },
          },
        },
      },
    },
  }

function resolveMandateSourceForCreate(
  dto: CreateGovernmentPositionTenureDto,
): TenureMandateSource {
  if (dto.mandateSource != null) {
    return dto.mandateSource as TenureMandateSource
  }
  if (dto.electionCandidacyId) {
    return TenureMandateSource.ELECTION
  }
  return TenureMandateSource.UNKNOWN
}

function resolveMandateSourceForUpdate(
  dto: Partial<CreateGovernmentPositionTenureDto>,
): TenureMandateSource | undefined {
  if (dto.mandateSource != null) {
    return dto.mandateSource as TenureMandateSource
  }
  if (dto.electionCandidacyId !== undefined) {
    return dto.electionCandidacyId ? TenureMandateSource.ELECTION : TenureMandateSource.UNKNOWN
  }
  return undefined
}

/** 재임 업적 목록 — 사건(Event) 정본 포함 */
const TENURE_ACHIEVEMENTS_INCLUDE = {
  orderBy: [{ orderNum: 'asc' as const }, { startDate: 'asc' as const }],
  include: {
    event: {
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        deletedAt: true,
      },
    },
  },
}

/** 수반 재임의 연호·시대명 (일본 연호, 유럽식 재위 시대명 등) */
const REGNAL_ERAS_ORDER = {
  orderBy: { startYear: 'asc' as const },
}

/**
 * Prisma 기반 인물 Repository 구현체
 */
@Injectable()
export class PersonPrismaRepository implements IPersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly LINKAGE_GROUP_EVENT_SELECT = {
    id: true,
    label: true,
    eventId: true,
    event: { select: { id: true, title: true } },
  } as const

  /**
   * 인물 create/update 시 FK 필드 정리.
   * 빈 문자열('')·null·undefined인 FK는 객체에서 제거해 Prisma에 전달하지 않음 → country_id 등 FK 위반 방지.
   */
  private sanitizePersonFkFields<T extends CreatePersonData | UpdatePersonData>(data: T): T {
    const fkKeys = [
      'countryId',
      'birthCityId',
      'deathCityId',
      'birthAdminDivisionId',
      'deathAdminDivisionId',
      'dynastyId',
      'religionId',
      'denominationId',
      'fatherId',
      'motherId',
      'jobId',
    ] as const
    const out = { ...data } as T & Record<string, unknown>
    for (const key of fkKeys) {
      const v = out[key]
      if (v === '' || v == null) delete out[key]
    }
    return out as T
  }

  /**
   * 응답용 출생 국가 ID: Person.countryId가 있으면 그대로, 없으면 BIRTH_PLACE 소속의 historicalCountryId 또는 countryId 반환
   */
  private getEffectiveBirthCountryId(person: any): string | null {
    if (person.countryId) return person.countryId
    const affiliations = person.countryAffiliations as Array<{ affiliationType: string; historicalCountryId?: string | null; countryId?: string | null }> | undefined
    const birth = affiliations?.find((a) => String(a.affiliationType) === 'BIRTH_PLACE')
    return birth?.historicalCountryId ?? birth?.countryId ?? null
  }

  /**
   * 이름 표시 순서용 country 블록: Person.country(FK) 우선, 없으면 출생 소속의 현대 국가 또는 역사→현대 연결.
   */
  private resolveCountryBlockForName(person: any): {
    id: string
    name: string
    flagEmoji: string | null
    isoCode: string | null
    defaultNameDisplayOrder: string | null
  } | null {
    if (person.country != null) {
      return {
        id: person.country.id,
        name: person.country.name,
        flagEmoji: person.country.flagEmoji ?? null,
        isoCode: person.country.isoCode ?? null,
        defaultNameDisplayOrder: person.country.defaultNameDisplayOrder ?? null,
      }
    }
    const affiliations = person.countryAffiliations as
      | Array<{
          affiliationType: string
          country?: {
            id: string
            name: string
            flagEmoji: string | null
            isoCode: string | null
            defaultNameDisplayOrder: string | null
          } | null
          historicalCountry?: {
            modernConnections?: Array<{
              modernCountry: {
                id: string
                name: string
                flagEmoji: string | null
                isoCode: string | null
                defaultNameDisplayOrder: string | null
              }
            }>
          } | null
        }>
      | undefined
    const birth = affiliations?.find(
      (a) => String(a.affiliationType) === 'BIRTH_PLACE',
    )
    if (birth?.country != null) {
      const c = birth.country
      return {
        id: c.id,
        name: c.name,
        flagEmoji: c.flagEmoji ?? null,
        isoCode: c.isoCode ?? null,
        defaultNameDisplayOrder: c.defaultNameDisplayOrder ?? null,
      }
    }
    const mc =
      birth?.historicalCountry?.modernConnections?.[0]?.modernCountry
    if (mc != null) {
      return {
        id: mc.id,
        name: mc.name,
        flagEmoji: mc.flagEmoji ?? null,
        isoCode: mc.isoCode ?? null,
        defaultNameDisplayOrder: mc.defaultNameDisplayOrder ?? null,
      }
    }
    return null
  }

  /**
   * Prisma Person을 PersonResponseDto로 변환
   */
  private mapToPersonResponse(person: any): PersonResponseDto {
    // BigInt와 Date를 안전하게 변환
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString() // Date 객체는 ISO 문자열로
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
      middleName: person.middleName ?? null,
      nameDisplayOrder: person.nameDisplayOrder ?? null,
      originalName: person.originalName ?? null,
      surnameMeaning: person.surnameMeaning ?? null,
      nameMeaning: person.nameMeaning ?? null,
      middleNameMeaning: person.middleNameMeaning ?? null,
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
      // 왕/군주 관련 필드
      regnalName: person.regnalName,
      templeName: person.templeName,
      posthumousName: person.posthumousName,
      preEnthronementTitle: person.preEnthronementTitle ?? null,
      // 관계
      dynastyId: person.dynastyId,
      dynasty:
        person.dynasty != null
          ? { id: person.dynasty.id, name: person.dynasty.name }
          : null,
      religionId: person.religionId,
      denominationId: person.denominationId,
      fatherId: person.fatherId,
      motherId: person.motherId,
      jobId: person.jobId,
      job:
        person.job != null
          ? { id: person.job.id, title: person.job.title }
          : null,
      countryId: this.getEffectiveBirthCountryId(person),
      country: this.resolveCountryBlockForName(person),
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
      showLifespanOnEventList: person.showLifespanOnEventList,
      isDeathDateUnknown: person.isDeathDateUnknown ?? false,
      isAlive: person.isAlive ?? false,
      // 정부 직위 재임 기록
      governmentTenures: person.GovernmentTenures ? serializeBigInt(person.GovernmentTenures) : undefined,
      sovereignReigns: person.sovereignReigns ? serializeBigInt(person.sovereignReigns) : undefined,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
      accountId: person.accountId ?? undefined,
    }
  }

  /**
   * Prisma Career를 DTO로 변환하는 헬퍼 함수들
   */
  private mapToMilitaryCareerResponse(career: MilitaryCareer): MilitaryCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      rankId: career.rankId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      branch: career.branch,
      position: career.position,
      termNumber: career.termNumber,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToBusinessCareerResponse(career: BusinessCareer): BusinessCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      title: career.title,
      level: career.level,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToAcademicCareerResponse(career: AcademicCareer): AcademicCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      department: career.department,
      researchField: career.researchField,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToAthleteCareerResponse(career: AthleteCareer): AthleteCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      sport: career.sport,
      position: career.position,
      jerseyNumber: career.jerseyNumber,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToReligiousCareerResponse(career: ReligiousCareer): ReligiousCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      religionId: career.religionId,
      denominationId: career.denominationId,
      title: career.title,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToArtistCareerResponse(career: ArtistCareer): ArtistCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      genre: career.genre,
      artField: career.artField,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToMediaCareerResponse(career: MediaCareer): MediaCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      department: career.department,
      beat: career.beat,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToLegalCareerResponse(career: LegalCareer): LegalCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      specialization: career.specialization,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToMedicalCareerResponse(career: MedicalCareer): MedicalCareerResponseDto {
    return {
      id: career.id,
      personId: career.personId,
      timelineTitle: career.timelineTitle,
      showPositionInfo: career.showPositionInfo,
      positionId: career.positionId,
      jobCategoryId: career.jobCategoryId,
      organizationId: career.organizationId,
      specialization: career.specialization,
      department: career.department,
      startDate: career.startDate?.toISOString() || null,
      endDate: career.endDate?.toISOString() || null,
      notes: career.notes,
      createdAt: career.createdAt.toISOString(),
      updatedAt: career.updatedAt.toISOString(),
    }
  }

  private mapToPersonEducationResponse(education: PersonEducation): PersonEducationResponseDto {
    return {
      id: education.id,
      personId: education.personId,
      timelineTitle: education.timelineTitle,
      organizationId: education.organizationId,
      educationType: education.educationType,
      classNumber: education.classNumber,
      degree: education.degree,
      major: education.major,
      department: education.department,
      status: education.status,
      studentNumber: education.studentNumber,
      startDate: education.startDate?.toISOString() || null,
      endDate: education.endDate?.toISOString() || null,
      notes: education.notes,
      createdAt: education.createdAt.toISOString(),
      updatedAt: education.updatedAt.toISOString(),
    }
  }

  private mapToPersonAwardResponse(award: PersonAward): PersonAwardResponseDto {
    return {
      id: award.id,
      personId: award.personId,
      awardName: award.awardName,
      category: award.category,
      awardingBody: award.awardingBody,
      awardDate: award.awardDate?.toISOString() || null,
      description: award.description,
      createdAt: award.createdAt.toISOString(),
      updatedAt: award.updatedAt.toISOString(),
    }
  }

  /**
   * 인물 목록 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findAll(accountId?: string): Promise<PersonResponseDto[]> {
    const persons = await this.prisma.person.findMany({
      where: accountId != null ? { accountId } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        countryAffiliations: {
          include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
        },
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
            isoCode: true,
            defaultNameDisplayOrder: true,
          },
        },
        dynasty: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
        birthCity: { select: { id: true, name: true } },
        deathCity: { select: { id: true, name: true } },
        birthAdminDivision: { select: { id: true, name: true } },
        deathAdminDivision: { select: { id: true, name: true } },
        GovernmentTenures: {
          select: {
            id: true,
            positionType: true,
            title: true,
            startDate: true,
            endDate: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                category: { select: { id: true, name: true, nameEn: true } }, organization: { select: { id: true, name: true } },
              },
            },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    })
    return persons.map((p) => this.mapToPersonResponse(p))
  }

  /**
   * 국가별 인물 목록 조회 (person.countryId = countryId, accountId 무관)
   * 국가 페이지 인물 리스트에서 "전체 인물" 표시용.
   */
  async findPersonsByCountryId(countryId: string): Promise<PersonResponseDto[]> {
    const persons = await this.prisma.person.findMany({
      where: { countryId },
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      include: {
        countryAffiliations: {
          include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
        },
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
            isoCode: true,
            defaultNameDisplayOrder: true,
          },
        },
        dynasty: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
        birthCity: { select: { id: true, name: true } },
        deathCity: { select: { id: true, name: true } },
        birthAdminDivision: { select: { id: true, name: true } },
        deathAdminDivision: { select: { id: true, name: true } },
        GovernmentTenures: {
          select: {
            id: true,
            positionType: true,
            title: true,
            startDate: true,
            endDate: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                category: { select: { id: true, name: true, nameEn: true } }, organization: { select: { id: true, name: true } },
              },
            },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    })
    return persons.map((p) => this.mapToPersonResponse(p))
  }

  /**
   * 해당 현대 국가 또는 연결된 역사적 국가에 소속(affiliation)이 있는 인물 조회
   * Person.countryId가 아닌 PersonCountryAffiliation 기준 (독일 → 신성로마제국 연결 인물 포함)
   */
  async findPersonsByAffiliationInCountry(countryId: string): Promise<PersonResponseDto[]> {
    const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
      .findMany({
        where: { modernCountryId: countryId },
        select: { historicalCountryId: true },
      })
      .then((rows) => rows.map((r) => r.historicalCountryId))

    const affiliationWhere =
      linkedHistoricalIds.length > 0
        ? {
            OR: [
              { countryId },
              { historicalCountryId: { in: linkedHistoricalIds } },
            ],
          }
        : { countryId }

    const affs = await this.prisma.personCountryAffiliation.findMany({
      where: affiliationWhere,
      select: { personId: true },
      distinct: ['personId'],
    })
    const personIds = affs.map((a) => a.personId)
    if (personIds.length === 0) return []

    const persons = await this.prisma.person.findMany({
      where: { id: { in: personIds } },
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      include: {
        countryAffiliations: {
          include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
        },
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
            isoCode: true,
            defaultNameDisplayOrder: true,
          },
        },
        dynasty: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
        birthCity: { select: { id: true, name: true } },
        deathCity: { select: { id: true, name: true } },
        birthAdminDivision: { select: { id: true, name: true } },
        deathAdminDivision: { select: { id: true, name: true } },
        GovernmentTenures: {
          select: {
            id: true,
            positionType: true,
            title: true,
            startDate: true,
            endDate: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                category: { select: { id: true, name: true, nameEn: true } }, organization: { select: { id: true, name: true } },
              },
            },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    })
    return persons.map((p) => this.mapToPersonResponse(p))
  }

  /**
   * 인물 목록 조회 (정부 직책 포함, accountId 있으면 해당 계정 소유만)
   */
  async findAllWithGovernmentPositions(accountId?: string) {
    return this.prisma.person.findMany({
      where: accountId != null ? { accountId } : undefined,
      include: {
        GovernmentTenures: {
          select: {
            id: true,
            termNumber: true,
            subTermNumber: true,
            regnalNumber: true,
            startDate: true,
            endDate: true,
            appointmentMethod: true,
            endReason: true,
            endReasonDetail: true,
            notes: true,
            priority: true,
            positionType: true,
            title: true,
            titleEn: true,
            showPositionInfo: true,
            countryId: true,
            historicalCountryId: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                titleEn: true,
                positionType: true,
                rank: true,
                description: true,
                categoryId: true,
                category: { select: { id: true, name: true, nameEn: true } },
                organization: { select: { id: true, name: true, shortName: true } },
              },
            },
            country: {
              select: {
                id: true,
                name: true,
              },
            },
            historicalCountry: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * ID로 인물 조회
   */
  async findById(id: string, accountId?: string): Promise<PersonResponseDto | null> {
    const person = accountId != null
      ? await this.prisma.person.findFirst({
          where: { id, accountId },
          include: {
            countryAffiliations: {
              include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
            },
            country: {
              select: {
                id: true,
                name: true,
                flagEmoji: true,
                isoCode: true,
                defaultNameDisplayOrder: true,
              },
            },
            dynasty: { select: { id: true, name: true } },
            job: { select: { id: true, title: true } },
            GovernmentTenures: {
              include: {
                positionDefinition: true,
                country: true,
                historicalCountry: true,
              },
              orderBy: { startDate: 'desc' },
            },
          },
        })
      : await this.prisma.person.findUnique({
          where: { id },
          include: {
            countryAffiliations: {
              include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
            },
            country: {
              select: {
                id: true,
                name: true,
                flagEmoji: true,
                isoCode: true,
                defaultNameDisplayOrder: true,
              },
            },
            dynasty: { select: { id: true, name: true } },
            job: { select: { id: true, title: true } },
            GovernmentTenures: {
              include: {
                positionDefinition: true,
                country: true,
                historicalCountry: true,
              },
              orderBy: { startDate: 'desc' },
            },
          },
        })
    return person ? this.mapToPersonResponse(person) : null
  }

  /**
   * ID로 인물 상세 조회 (accountId 있으면 해당 계정 소유만)
   */
  async findByIdWithRelations(id: string, accountId?: string) {
    const where = accountId != null ? { id, accountId } : { id }
    const include = {
        country: true,
        dynasty: true,
        religion: true,
        denomination: true,
        job: true,
        father: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
            profileImageUrl: true,
            profileImages: {
              select: { url: true, priority: true },
              orderBy: [{ priority: Prisma.SortOrder.asc }],
              take: 1,
            },
          },
        },
        mother: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
            profileImageUrl: true,
            profileImages: {
              select: { url: true, priority: true },
              orderBy: [{ priority: Prisma.SortOrder.asc }],
              take: 1,
            },
          },
        },
        childrenFromFather: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
            profileImageUrl: true,
            profileImages: {
              select: { url: true, priority: true },
              orderBy: [{ priority: Prisma.SortOrder.asc }],
              take: 1,
            },
          },
        },
        childrenFromMother: {
          select: {
            id: true,
            name: true,
            surname: true,
            nameDisplayOrder: true,
            birthDate: true,
            deathDate: true,
            profileImageUrl: true,
            profileImages: {
              select: { url: true, priority: true },
              orderBy: [{ priority: Prisma.SortOrder.asc }],
              take: 1,
            },
          },
        },
        spouseRelationsAsPerson: {
          select: {
            id: true,
            marriageStartDate: true,
            marriageEndDate: true,
            note: true,
            spouse: {
              select: {
                id: true,
                name: true,
                surname: true,
                nameDisplayOrder: true,
                birthDate: true,
                deathDate: true,
                profileImageUrl: true,
                profileImages: {
                  select: { url: true, priority: true },
                  orderBy: [{ priority: Prisma.SortOrder.asc }],
                  take: 1,
                },
              },
            },
          },
        },
        nicknames: true,
        profileImages: {
          select: { url: true, priority: true },
          orderBy: [{ priority: Prisma.SortOrder.asc }],
          take: 1,
        },
        birthCity: { select: { id: true, name: true } },
        deathCity: { select: { id: true, name: true } },
        birthAdminDivision: { select: { id: true, name: true } },
        deathAdminDivision: { select: { id: true, name: true } },
        foundedCompanies: {
          select: {
            id: true,
            name: true,
            foundedAt: true,
            description: true,
          },
        },
        Company: {
          select: {
            id: true,
            name: true,
            foundedAt: true,
            description: true,
          },
        },
        Book: {
          select: {
            id: true,
            title: true,
            publishedYear: true,
            summary: true,
          },
        },
        OrganizationPersonRole: {
          select: {
            id: true,
            roleTitle: true,
            startDate: true,
            endDate: true,
            organization: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
        },
        PoliticalPartyLeadership: {
          select: {
            id: true,
            roleTitle: true,
            startDate: true,
            endDate: true,
            party: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
        },
        politicalPartyMemberships: {
          select: {
            id: true,
            partyId: true,
            startDate: true,
            endDate: true,
            roleCategory: true,
            leadershipTier: true,
            roleTitle: true,
            notes: true,
            party: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
          orderBy: { startDate: Prisma.SortOrder.desc },
        },
        electionCandidacies: {
          select: {
            id: true,
            nominationType: true,
            ballotOrder: true,
            listRank: true,
            withdrawnDate: true,
            notes: true,
            party: { select: { id: true, name: true, shortName: true } },
            electoralDistrict: { select: { id: true, name: true, code: true } },
            election: {
              select: {
                id: true,
                name: true,
                shortName: true,
                pollDate: true,
                electionType: true,
              },
            },
            result: true,
          },
          orderBy: { id: Prisma.SortOrder.desc },
        },
        MilitaryUnitCommander: {
          select: {
            id: true,
            rank: true,
            role: true,
            startDate: true,
            endDate: true,
            unit: {
              select: {
                id: true,
                name: true,
                unitType: true,
              },
            },
          },
        },
        PersonEvent: {
          select: {
            id: true,
            role: true,
            note: true,
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                description: true,
                category: true,
                countryRelations: {
                  select: {
                    id: true,
                    role: true,
                    roleDescription: true,
                    note: true,
                    country: {
                      select: {
                        id: true,
                        name: true,
                        isoCode: true,
                      },
                    },
                    historicalCountry: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        GovernmentTenures: {
          select: {
            id: true,
            termNumber: true,
            subTermNumber: true,
            regnalNumber: true,
            positionType: true,
            title: true,
            titleEn: true,
            showPositionInfo: true,
            startDate: true,
            endDate: true,
            appointmentMethod: true,
            endReason: true,
            endReasonDetail: true,
            notes: true,
            priority: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                rank: true,
                description: true,
                category: { select: { id: true, name: true, nameEn: true } }, organization: { select: { id: true, name: true } },
              },
            },
            country: {
              select: {
                id: true,
                name: true,
              },
            },
            historicalCountry: {
              select: {
                id: true,
                name: true,
              },
            },
            electionCandidacy: {
              select: {
                id: true,
                election: { select: { id: true, name: true, pollDate: true } },
              },
            },
          },
          orderBy: {
            startDate: Prisma.SortOrder.desc,
          },
        }
    }
    return accountId != null
      ? this.prisma.person.findFirst({ where, include })
      : this.prisma.person.findUnique({ where, include })
  }

  /**
   * 인물 생성
   * FK 필드 정리 + countryId는 Country에 있을 때만 Person에 저장.
   * 역사적 국가 ID면 Person.countryId는 넣지 않고, PersonCountryAffiliation(BIRTH_PLACE)에만 저장.
   */
  async create(data: CreatePersonData): Promise<PersonResponseDto> {
    const sanitized = this.sanitizePersonFkFields(data) as CreatePersonData & Record<string, unknown>
    const birthId = sanitized.countryId
    let birthHistoricalCountryId: string | null = null

    if (birthId) {
      const inCountry = await this.prisma.country.findUnique({
        where: { id: birthId },
        select: { id: true },
      })
      if (inCountry) {
        // 현대 국가 → Person.countryId 유지
      } else {
        const inHistorical = await this.prisma.historicalCountry.findUnique({
          where: { id: birthId },
          select: { id: true },
        })
        if (inHistorical) {
          birthHistoricalCountryId = birthId
          delete sanitized.countryId
        } else {
          delete sanitized.countryId
        }
      }
    }

    const spouseRelations = (sanitized as CreatePersonData).spouseRelations
    delete (sanitized as Record<string, unknown>).spouseRelations

    const person = await this.prisma.person.create({
      data: sanitized as Parameters<PrismaService['person']['create']>[0]['data'],
    })

    if (spouseRelations?.length) {
      await this.prisma.personSpouse.createMany({
        data: spouseRelations.map((s) => ({
          personId: person.id,
          spouseId: s.spouseId,
          marriageStartDate: s.marriageStartDate ?? null,
          marriageEndDate: s.marriageEndDate ?? null,
          note: s.note ?? null,
        })),
      })
    }

    if (birthHistoricalCountryId) {
      await this.prisma.personCountryAffiliation.create({
        data: {
          personId: person.id,
          historicalCountryId: birthHistoricalCountryId,
          countryId: null,
          affiliationType: 'BIRTH_PLACE',
          priority: 0,
        },
      })
    }

    // 응답에 effective countryId(역사적 국가 포함)를 넣기 위해 countryAffiliations 포함해 재조회
    const created = await this.prisma.person.findUnique({
      where: { id: person.id },
      include: {
        countryAffiliations: {
          include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
        },
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
            isoCode: true,
            defaultNameDisplayOrder: true,
          },
        },
      },
    })
    return created ? this.mapToPersonResponse(created) : this.mapToPersonResponse(person)
  }

  /**
   * 인물 수정
   * FK 필드 정리 + countryId는 Country에 있을 때만 반영.
   * 역사적 국가면 Person.countryId는 비우고, BIRTH_PLACE만 PersonCountryAffiliation에 반영.
   */
  async update(id: string, data: UpdatePersonData): Promise<PersonResponseDto> {
    const sanitized = this.sanitizePersonFkFields(data) as UpdatePersonData & Record<string, unknown>
    const birthIdInput = data.countryId
    const birthId = sanitized.countryId
    let birthHistoricalCountryId: string | null = null

    if (birthId) {
      const inCountry = await this.prisma.country.findUnique({
        where: { id: birthId },
        select: { id: true },
      })
      if (inCountry) {
        // 현대 국가 → Person.countryId 유지
      } else {
        const inHistorical = await this.prisma.historicalCountry.findUnique({
          where: { id: birthId },
          select: { id: true },
        })
        if (inHistorical) {
          birthHistoricalCountryId = birthId
          delete sanitized.countryId
        } else {
          delete sanitized.countryId
        }
      }
    }

    const spouseRelations = (sanitized as UpdatePersonData).spouseRelations
    delete (sanitized as Record<string, unknown>).spouseRelations

    // 출생국가를 비웠을 때( null / '' ) Person.countryId를 null로 반영
    const updateData = { ...sanitized } as Parameters<PrismaService['person']['update']>[0]['data']
    if (birthIdInput !== undefined && (birthIdInput === null || birthIdInput === '')) {
      ;(updateData as Record<string, unknown>).countryId = null
    }

    const person = await this.prisma.person.update({
      where: { id },
      data: updateData,
    })

    if (birthIdInput !== undefined) {
      await this.prisma.personCountryAffiliation.deleteMany({
        where: { personId: id, affiliationType: 'BIRTH_PLACE' },
      })
      if (birthHistoricalCountryId) {
        await this.prisma.personCountryAffiliation.create({
          data: {
            personId: id,
            historicalCountryId: birthHistoricalCountryId,
            countryId: null,
            affiliationType: 'BIRTH_PLACE',
            priority: 0,
          },
        })
      }
    }

    if (spouseRelations !== undefined) {
      await this.prisma.personSpouse.deleteMany({ where: { personId: id } })
      if (spouseRelations.length) {
        await this.prisma.personSpouse.createMany({
          data: spouseRelations.map((s: { spouseId: string; marriageStartDate?: Date; marriageEndDate?: Date; note?: string }) => ({
            personId: id,
            spouseId: s.spouseId,
            marriageStartDate: s.marriageStartDate ?? null,
            marriageEndDate: s.marriageEndDate ?? null,
            note: s.note ?? null,
          })),
        })
      }
    }

    // 응답에 effective countryId(역사적 국가 포함)를 넣기 위해 countryAffiliations 포함해 재조회
    const updated = await this.prisma.person.findUnique({
      where: { id },
      include: {
        countryAffiliations: {
          include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
        },
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
            isoCode: true,
            defaultNameDisplayOrder: true,
          },
        },
      },
    })
    return updated ? this.mapToPersonResponse(updated) : this.mapToPersonResponse(person)
  }

  /**
   * 인물 삭제
   */
  async delete(id: string): Promise<void> {
    await this.prisma.person.delete({
      where: { id },
    })
  }

  // ========================
  // Career 관리 메서드
  // ========================

  /**
   * 군인 경력 추가
   */
  async addMilitaryCareer(dto: CreateMilitaryCareerDto): Promise<MilitaryCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.militaryCareer.create({
      data: {
        ...careerData,
        branch: careerData.branch || '육군', // default value if not provided
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
    })
    
    return this.mapToMilitaryCareerResponse(career)
  }

  /**
   * 기업인 경력 추가
   */
  async addBusinessCareer(dto: CreateBusinessCareerDto): Promise<BusinessCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.businessCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToBusinessCareerResponse(career)
  }

  /**
   * 학자 경력 추가
   */
  async addAcademicCareer(dto: CreateAcademicCareerDto): Promise<AcademicCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.academicCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToAcademicCareerResponse(career)
  }

  /**
   * 운동선수 경력 추가
   */
  async addAthleteCareer(dto: CreateAthleteCareerDto): Promise<AthleteCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.athleteCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToAthleteCareerResponse(career)
  }

  /**
   * 종교인 경력 추가
   */
  async addReligiousCareer(dto: CreateReligiousCareerDto): Promise<ReligiousCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.religiousCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
    })
    
    return this.mapToReligiousCareerResponse(career)
  }

  /**
   * 예술가 경력 추가
   */
  async addArtistCareer(dto: CreateArtistCareerDto): Promise<ArtistCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.artistCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToArtistCareerResponse(career)
  }

  /**
   * 언론인 경력 추가
   */
  async addMediaCareer(dto: CreateMediaCareerDto): Promise<MediaCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.mediaCareer.create({
      data: {
        ...careerData,
        organizationId: careerData.organizationId || '', // default if not provided
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
    })
    
    return this.mapToMediaCareerResponse(career)
  }

  /**
   * 법조인 경력 추가
   */
  async addLegalCareer(dto: CreateLegalCareerDto): Promise<LegalCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.legalCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToLegalCareerResponse(career)
  }

  /**
   * 의료인 경력 추가
   */
  async addMedicalCareer(dto: CreateMedicalCareerDto): Promise<MedicalCareerResponseDto> {
    const { images, ...careerData } = dto
    
    const career = await this.prisma.medicalCareer.create({
      data: {
        ...careerData,
        organizationId: careerData.organizationId || '', // default if not provided
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
    })
    
    return this.mapToMedicalCareerResponse(career)
  }

  /**
   * 재임 기록의 국가 FK 정리: 빈 문자열/무효 ID 제거, countryId가 역사적 국가 ID면 historicalCountryId로만 저장
   */
  private async resolveTenureCountryFields(dto: {
    countryId?: string | null
    historicalCountryId?: string | null
  }): Promise<{ countryId?: string | null; historicalCountryId?: string | null }> {
    const result: { countryId?: string | null; historicalCountryId?: string | null } = {}
    const cid = dto.countryId && dto.countryId.trim() !== '' ? dto.countryId.trim() : null
    const hid = dto.historicalCountryId && dto.historicalCountryId.trim() !== '' ? dto.historicalCountryId.trim() : null

    if (cid) {
      const inCountry = await this.prisma.country.findUnique({
        where: { id: cid },
        select: { id: true },
      })
      if (inCountry) {
        result.countryId = cid
      } else {
        const inHistorical = await this.prisma.historicalCountry.findUnique({
          where: { id: cid },
          select: { id: true },
        })
        if (inHistorical) result.historicalCountryId = cid
      }
    }
    if (hid && result.historicalCountryId === undefined) {
      const inHistorical = await this.prisma.historicalCountry.findUnique({
        where: { id: hid },
        select: { id: true },
      })
      if (inHistorical) result.historicalCountryId = hid
    }
    return result
  }

  /**
   * 국가원수/왕위 재임 기록 추가
   */
  async addGovernmentPositionTenure(dto: CreateGovernmentPositionTenureDto, accountId?: string): Promise<any> {
    const countryFields = await this.resolveTenureCountryFields({
      countryId: dto.countryId,
      historicalCountryId: dto.historicalCountryId,
    })
    const tenure = await this.prisma.governmentPositionTenure.create({
      data: {
        personId: dto.personId,
        positionType: dto.positionType as any,
        title: dto.title ?? undefined,
        titleEn: dto.titleEn ?? undefined,
        showPositionInfo: dto.showPositionInfo !== false, // 기본값 true
        ...(countryFields.countryId != null && { countryId: countryFields.countryId }),
        ...(countryFields.historicalCountryId != null && {
          historicalCountryId: countryFields.historicalCountryId,
        }),
        positionDefinitionId: dto.positionDefinitionId ?? undefined,
        termNumber: dto.termNumber,
        subTermNumber: dto.subTermNumber,
        regnalNumber: dto.regnalNumber,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        appointmentMethod: dto.appointmentMethod as any,
        endReason: dto.endReason as any,
        endReasonDetail: dto.endReasonDetail,
        notes: dto.notes,
        priority: dto.priority,
        cabinetId: dto.cabinetId ?? undefined,
        administrationDepartmentId: dto.administrationDepartmentId ?? undefined,
        electionCandidacyId: dto.electionCandidacyId ?? undefined,
        mandateSource: resolveMandateSourceForCreate(dto),
        ...(accountId != null && { accountId }),
      },
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        cabinet: {
          include: {
            headTenure: {
              include: { person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME } },
            },
          },
        },
        electionCandidacy: {
          select: {
            id: true,
            election: { select: { id: true, name: true, pollDate: true } },
            party: { select: { id: true, name: true } },
          },
        },
      },
    })
    
    // BigInt를 문자열로 변환
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
    
    return serializeBigInt(tenure)
  }

  /**
   * 국가원수/왕위 재임 기록 수정
   */
  async updateGovernmentPositionTenure(id: string, dto: Partial<CreateGovernmentPositionTenureDto>): Promise<any> {
    const updateData: any = {}

    if (dto.positionType) updateData.positionType = dto.positionType as any
    if (dto.title) updateData.title = dto.title
    if (dto.titleEn !== undefined) updateData.titleEn = dto.titleEn
    if (dto.showPositionInfo !== undefined) updateData.showPositionInfo = dto.showPositionInfo
    if (dto.countryId !== undefined || dto.historicalCountryId !== undefined) {
      const countryFields = await this.resolveTenureCountryFields({
        countryId: dto.countryId,
        historicalCountryId: dto.historicalCountryId,
      })
      updateData.countryId = countryFields.countryId ?? null
      updateData.historicalCountryId = countryFields.historicalCountryId ?? null
    }
    if (dto.positionDefinitionId !== undefined) updateData.positionDefinitionId = dto.positionDefinitionId
    if (dto.termNumber !== undefined) updateData.termNumber = dto.termNumber
    if (dto.subTermNumber !== undefined) updateData.subTermNumber = dto.subTermNumber
    if (dto.regnalNumber !== undefined) updateData.regnalNumber = dto.regnalNumber
    if (dto.startDate) updateData.startDate = new Date(dto.startDate)
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null
    if (dto.appointmentMethod !== undefined) updateData.appointmentMethod = dto.appointmentMethod as any
    if (dto.endReason !== undefined) updateData.endReason = dto.endReason as any
    if (dto.endReasonDetail !== undefined) updateData.endReasonDetail = dto.endReasonDetail
    if (dto.notes !== undefined) updateData.notes = dto.notes
    if (dto.priority !== undefined) updateData.priority = dto.priority
    if (dto.cabinetId !== undefined) updateData.cabinetId = dto.cabinetId || null
    if (dto.administrationDepartmentId !== undefined)
      updateData.administrationDepartmentId = dto.administrationDepartmentId || null
    if (dto.electionCandidacyId !== undefined)
      updateData.electionCandidacyId = dto.electionCandidacyId || null

    const mandateResolved = resolveMandateSourceForUpdate(dto)
    if (mandateResolved !== undefined) {
      updateData.mandateSource = mandateResolved
    }

    const tenure = await this.prisma.governmentPositionTenure.update({
      where: { id },
      data: updateData,
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        cabinet: {
          include: {
            headTenure: {
              include: { person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME } },
            },
          },
        },
        electionCandidacy: {
          select: {
            id: true,
            election: { select: { id: true, name: true, pollDate: true } },
            party: { select: { id: true, name: true } },
          },
        },
      },
    })

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

    return serializeBigInt(tenure)
  }

  /**
   * 특정 수반 재임(행정부 수반) 하의 각료 목록 — Cabinet 조회 후 memberTenures
   */
  async findSubordinateTenures(headTenureId: string): Promise<any[]> {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { headTenureId },
    })
    if (!cabinet) return []
    return this.findTenuresByCabinetId(cabinet.id)
  }

  /**
   * 같은 CabinetLinkageGroup의 다른 수반 재임에만 있는 업적(동일 사건 eventId)을
   * 각 수반의 achievements 목록에 합쳐서 내려준다(묶인 상대 행정부에서도 사건이 보이게).
   */
  private mergePeerHeadAchievementsIntoOneCabinet(
    cabinet: { headTenure: { id: string; achievements: any[] } },
    groupCabinets: Array<{
      linkageGroup?: { eventId?: string | null } | null
      headTenure: { id: string; achievements: any[] }
    }>,
  ): void {
    const ownId = cabinet.headTenure.id
    const groupEventId = groupCabinets[0]?.linkageGroup?.eventId ?? null
    const sharedEventIds = new Set<string>()
    if (groupEventId) sharedEventIds.add(groupEventId)
    for (const gc of groupCabinets) {
      for (const a of gc.headTenure.achievements ?? []) {
        if (a.eventId) sharedEventIds.add(a.eventId)
      }
    }
    const own = [...(cabinet.headTenure.achievements ?? [])]
    const ownIds = new Set(own.map((a) => a.id))
    const ownEventKeys = new Set(
      own.map((a) => a.eventId).filter((x): x is string => !!x),
    )

    for (const gc of groupCabinets) {
      if (gc.headTenure.id === ownId) continue
      for (const a of gc.headTenure.achievements ?? []) {
        if (ownIds.has(a.id)) continue
        if (!a.eventId) continue
        if (!sharedEventIds.has(a.eventId)) continue
        if (ownEventKeys.has(a.eventId)) continue
        own.push({ ...a })
        ownIds.add(a.id)
        ownEventKeys.add(a.eventId)
      }
    }
    own.sort((a, b) => {
      const oa = a.orderNum ?? 0
      const ob = b.orderNum ?? 0
      if (oa !== ob) return oa - ob
      const sa = a.startDate ? new Date(a.startDate).getTime() : 0
      const sb = b.startDate ? new Date(b.startDate).getTime() : 0
      return sa - sb
    })
    cabinet.headTenure.achievements = own
  }

  private async mergeLinkagePeerHeadAchievementsForCabinets(
    cabinets: Array<{
      id: string
      linkageGroupId: string | null
      linkageGroup?: { eventId?: string | null } | null
      headTenure: { id: string; achievements: any[] }
    }>,
  ): Promise<void> {
    const groupIds = [
      ...new Set(
        cabinets.map((c) => c.linkageGroupId).filter((g): g is string => !!g),
      ),
    ]
    if (groupIds.length === 0) return

    const groupCabinetsAll = await this.prisma.cabinet.findMany({
      where: { linkageGroupId: { in: groupIds } },
      include: {
        linkageGroup: { select: { eventId: true } },
        headTenure: {
          include: {
            achievements: TENURE_ACHIEVEMENTS_INCLUDE,
          },
        },
      },
    })
    const byGroup = new Map<string, typeof groupCabinetsAll>()
    for (const c of groupCabinetsAll) {
      if (!c.linkageGroupId) continue
      if (!byGroup.has(c.linkageGroupId)) byGroup.set(c.linkageGroupId, [])
      byGroup.get(c.linkageGroupId)!.push(c)
    }

    for (const c of cabinets) {
      if (!c.linkageGroupId) continue
      const group = byGroup.get(c.linkageGroupId)
      if (!group || group.length < 2) continue
      this.mergePeerHeadAchievementsIntoOneCabinet(c, group)
    }
  }

  async findCabinetByHeadTenureId(headTenureId: string): Promise<any | null> {
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { headTenureId },
      include: {
        linkageGroup: { select: this.LINKAGE_GROUP_EVENT_SELECT },
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            achievements: TENURE_ACHIEVEMENTS_INCLUDE,
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    if (!cabinet) return null
    await this.mergeLinkagePeerHeadAchievementsForCabinets([cabinet as any])
    return serializeBigInt(cabinet)
  }

  async findTenuresByCabinetId(cabinetId: string, accountId?: string): Promise<any[]> {
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    if (accountId != null) {
      const cabinet = await this.prisma.cabinet.findUnique({
        where: { id: cabinetId },
        select: { accountId: true },
      })
      if (!cabinet || (cabinet.accountId != null && cabinet.accountId !== accountId)) return []
    }
    const tenures = await this.prisma.governmentPositionTenure.findMany({
      where: { cabinetId },
      orderBy: [{ startDate: 'asc' }],
      include: {
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        achievements: TENURE_ACHIEVEMENTS_INCLUDE,
      },
    })
    return tenures.map((t) => serializeBigInt(t))
  }

  async findCabinets(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    // 현대국가 조회 시 연결된 하위 역사국가의 행정부도 함께 포함
    let linkedHistoricalIds: string[] = []
    if (params.countryId) {
      linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: params.countryId },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((r) => r.historicalCountryId))
    }

    const baseWhere: any =
      params.countryId || params.historicalCountryId
        ? {
            headTenure: params.countryId
              ? linkedHistoricalIds.length > 0
                ? {
                    OR: [
                      { countryId: params.countryId },
                      { historicalCountryId: { in: linkedHistoricalIds } },
                    ],
                  }
                : { countryId: params.countryId }
              : { historicalCountryId: params.historicalCountryId },
          }
        : {}
    /**
     * 국가(또는 역사국가) 소속 수반 재임 기준으로만 필터.
     * accountId로 목록을 좁히지 않음 — 다른 계정이 등록한 행정부도 동일 국가 페이지에서 보이게 함.
     */
    const list = await this.prisma.cabinet.findMany({
      where: Object.keys(baseWhere).length > 0 ? baseWhere : undefined,
      orderBy: [{ headTenure: { startDate: 'desc' } }],
      include: {
        linkageGroup: { select: this.LINKAGE_GROUP_EVENT_SELECT },
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
            achievements: TENURE_ACHIEVEMENTS_INCLUDE,
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    await this.mergeLinkagePeerHeadAchievementsForCabinets(list as any[])
    return list.map(serializeBigInt)
  }

  async createCabinet(dto: {
    headTenureId: string
    name?: string | null
  }, accountId?: string): Promise<any> {
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    const existing = await this.prisma.cabinet.findUnique({
      where: { headTenureId: dto.headTenureId },
      include: {
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            achievements: TENURE_ACHIEVEMENTS_INCLUDE,
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    if (existing) return serializeBigInt(existing)
    const cabinet = await this.prisma.cabinet.create({
      data: {
        headTenureId: dto.headTenureId,
        name: dto.name ?? null,
        ...(accountId != null && { accountId }),
      },
      include: {
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            achievements: TENURE_ACHIEVEMENTS_INCLUDE,
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    return serializeBigInt(cabinet)
  }

  async updateCabinet(
    cabinetId: string,
    dto: { name?: string | null },
    accountId?: string,
  ): Promise<any> {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { accountId: true },
    })
    if (!cabinet) return null
    if (accountId != null && cabinet.accountId != null && cabinet.accountId !== accountId)
      return null
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    const updated = await this.prisma.cabinet.update({
      where: { id: cabinetId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
      include: {
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            achievements: TENURE_ACHIEVEMENTS_INCLUDE,
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    return serializeBigInt(updated)
  }

  async deleteCabinet(cabinetId: string, accountId?: string): Promise<void> {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { headTenureId: true, accountId: true },
    })
    if (!cabinet) return
    if (accountId != null && cabinet.accountId != null && cabinet.accountId !== accountId) return
    await this.prisma.$transaction([
      this.prisma.governmentPositionTenure.deleteMany({ where: { cabinetId } }),
      this.prisma.governmentPositionTenure.delete({ where: { id: cabinet.headTenureId } }),
    ])
  }

  /** 서로 다른 사건(eventId)이 섞이면 묶기 불가 — 단일 값으로 합침 */
  private mergedLinkageEventId(
    ...parts: Array<string | null | undefined>
  ): string | null {
    const ids = parts
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter((x) => x !== '')
    const unique = [...new Set(ids)]
    if (unique.length > 1) {
      throw new Error(
        '서로 다른 사건에 속한 행정부 묶음은 합칠 수 없습니다. 같은 사건을 선택했는지 확인하세요.',
      )
    }
    return unique[0] ?? null
  }

  /**
   * 두 행정부를 같은 묶음으로 — 새 그룹 생성 또는 기존 그룹 병합.
   * `eventId`가 있으면 그 사건을 축으로 한 다국 행정부 연결로 기록한다.
   */
  async linkCabinetWithOther(
    cabinetId: string,
    otherCabinetId: string,
    accountId: string,
    eventId?: string | null,
  ): Promise<any> {
    const ser = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(ser)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = ser(obj[key])
        return result
      }
      return obj
    }
    if (cabinetId === otherCabinetId) {
      throw new Error('같은 행정부는 묶을 수 없습니다.')
    }
    const canLinkThisCabinet = (cab: { accountId: string | null }) =>
      cab.accountId == null || cab.accountId === accountId
    const reqEvent = eventId?.trim() || null

    return this.prisma.$transaction(async (tx) => {
      if (reqEvent) {
        const ev = await tx.event.findFirst({
          where: { id: reqEvent, deletedAt: null },
          select: { id: true },
        })
        if (!ev) {
          throw new Error('해당 사건을 찾을 수 없습니다.')
        }
      }

      const a = await tx.cabinet.findUnique({
        where: { id: cabinetId },
        select: { id: true, linkageGroupId: true, accountId: true },
      })
      const b = await tx.cabinet.findUnique({
        where: { id: otherCabinetId },
        select: { id: true, linkageGroupId: true, accountId: true },
      })
      if (!a || !b) {
        throw new Error('행정부를 찾을 수 없습니다.')
      }
      if (!canLinkThisCabinet(a) || !canLinkThisCabinet(b)) {
        throw new Error('행정부를 찾을 수 없거나 권한이 없습니다.')
      }
      if (
        a.accountId != null &&
        b.accountId != null &&
        a.accountId !== b.accountId
      ) {
        throw new Error(
          '서로 다른 계정이 등록한 행정부는 한 묶음으로 묶을 수 없습니다.',
        )
      }
      let gA = a.linkageGroupId
      let gB = b.linkageGroupId
      if (gA && gB && gA === gB) {
        // 이미 동일 묶음 — 사건 정보만 보정
        if (reqEvent) {
          const grp = await tx.cabinetLinkageGroup.findUnique({
            where: { id: gA },
            select: { id: true, eventId: true },
          })
          const merged = this.mergedLinkageEventId(grp?.eventId, reqEvent)
          if (merged !== grp?.eventId) {
            await tx.cabinetLinkageGroup.update({
              where: { id: gA },
              data: { eventId: merged },
            })
          }
        }
      } else if (!gA && !gB) {
        const merged = this.mergedLinkageEventId(null, null, reqEvent)
        const g = await tx.cabinetLinkageGroup.create({
          data: { accountId, eventId: merged ?? undefined },
        })
        await tx.cabinet.updateMany({
          where: { id: { in: [cabinetId, otherCabinetId] } },
          data: { linkageGroupId: g.id },
        })
      } else if (gA && !gB) {
        const grp = await tx.cabinetLinkageGroup.findUnique({
          where: { id: gA },
          select: { id: true, eventId: true },
        })
        const merged = this.mergedLinkageEventId(grp?.eventId, null, reqEvent)
        if (merged !== grp?.eventId) {
          await tx.cabinetLinkageGroup.update({
            where: { id: gA },
            data: { eventId: merged },
          })
        }
        await tx.cabinet.update({
          where: { id: otherCabinetId },
          data: { linkageGroupId: gA },
        })
      } else if (!gA && gB) {
        const grp = await tx.cabinetLinkageGroup.findUnique({
          where: { id: gB },
          select: { id: true, eventId: true },
        })
        const merged = this.mergedLinkageEventId(grp?.eventId, null, reqEvent)
        if (merged !== grp?.eventId) {
          await tx.cabinetLinkageGroup.update({
            where: { id: gB },
            data: { eventId: merged },
          })
        }
        await tx.cabinet.update({
          where: { id: cabinetId },
          data: { linkageGroupId: gB },
        })
      } else {
        const grpA = await tx.cabinetLinkageGroup.findUnique({
          where: { id: gA as string },
          select: { id: true, eventId: true },
        })
        const grpB = await tx.cabinetLinkageGroup.findUnique({
          where: { id: gB as string },
          select: { id: true, eventId: true },
        })
        const merged = this.mergedLinkageEventId(
          grpA?.eventId,
          grpB?.eventId,
          reqEvent,
        )
        const [keep, drop] =
          (gA as string) < (gB as string)
            ? [gA as string, gB as string]
            : [gB as string, gA as string]
        await tx.cabinetLinkageGroup.update({
          where: { id: keep },
          data: { eventId: merged },
        })
        await tx.cabinet.updateMany({
          where: { linkageGroupId: drop },
          data: { linkageGroupId: keep },
        })
        await tx.cabinetLinkageGroup.delete({ where: { id: drop } })
      }
      const updated = await tx.cabinet.findUnique({
        where: { id: cabinetId },
        include: {
          linkageGroup: { select: this.LINKAGE_GROUP_EVENT_SELECT },
          headTenure: {
            include: {
              person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
              positionDefinition: true,
              country: { select: { id: true, name: true } },
              historicalCountry: { select: { id: true, name: true } },
              achievements: TENURE_ACHIEVEMENTS_INCLUDE,
              regnalEras: REGNAL_ERAS_ORDER,
            },
          },
        },
      })
      return ser(updated)
    })
  }

  /**
   * 특정 사건(eventId)을 축으로 묶인 행정부 목록 (다국 행정부 연결 조회)
   */
  async findCabinetsByLinkageEventId(eventId: string): Promise<any[]> {
    const ser = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(ser)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = ser(obj[key])
        return result
      }
      return obj
    }
    const list = await this.prisma.cabinet.findMany({
      where: {
        linkageGroup: { eventId },
      },
      orderBy: [{ headTenure: { startDate: 'desc' } }],
      include: {
        linkageGroup: { select: this.LINKAGE_GROUP_EVENT_SELECT },
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    return list.map((c) => ser(c))
  }

  /** 이 행정부만 묶음에서 빠짐. 남은 행정부가 없으면 그룹 삭제 */
  async leaveCabinetLinkageGroup(cabinetId: string, accountId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cab = await tx.cabinet.findUnique({
        where: { id: cabinetId },
        select: { linkageGroupId: true, accountId: true },
      })
      if (!cab?.linkageGroupId) return
      if (cab.accountId != null && cab.accountId !== accountId) {
        throw new Error('행정부를 찾을 수 없거나 권한이 없습니다.')
      }
      const gid = cab.linkageGroupId
      await tx.cabinet.update({
        where: { id: cabinetId },
        data: { linkageGroupId: null },
      })
      const n = await tx.cabinet.count({ where: { linkageGroupId: gid } })
      if (n === 0) {
        await tx.cabinetLinkageGroup.delete({ where: { id: gid } })
      }
    })
  }

  /**
   * 같은 묶음의 다른 행정부 목록 (로그인한 사용자용; accountId는 API 시그니처 호환용).
   */
  async findLinkedCabinets(cabinetId: string, _accountId: string): Promise<any[]> {
    const ser = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(ser)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = ser(obj[key])
        return result
      }
      return obj
    }
    const cab = await this.prisma.cabinet.findFirst({
      where: { id: cabinetId },
      select: { linkageGroupId: true },
    })
    if (!cab?.linkageGroupId) return []
    const list = await this.prisma.cabinet.findMany({
      where: {
        linkageGroupId: cab.linkageGroupId,
        id: { not: cabinetId },
      },
      orderBy: [{ headTenure: { startDate: 'desc' } }],
      include: {
        linkageGroup: { select: this.LINKAGE_GROUP_EVENT_SELECT },
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            positionDefinition: true,
            country: {
              select: {
                id: true,
                name: true,
                flagEmoji: true,
                thumbnailUrl: true,
              },
            },
            historicalCountry: {
              select: { id: true, name: true, thumbnailUrl: true },
            },
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    return list.map((c) => ser(c))
  }

  /**
   * 묶기 대상 행정부 검색 — 로그인한 사용자가 DB 전체에서 고름(계정별 제한 없음).
   * `filter`에 countryId / historicalCountryId 가 있으면 해당 영토의 행정부만.
   */
  async searchCabinetsForLinkage(
    _accountId: string,
    q: string,
    excludeCabinetId: string,
    limit = 40,
    filter?: { countryId?: string; historicalCountryId?: string },
  ): Promise<any[]> {
    const ser = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(ser)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = ser(obj[key])
        return result
      }
      return obj
    }
    const term = q.trim()
    const fc = filter?.countryId?.trim()
    const fh = filter?.historicalCountryId?.trim()

    /**
     * 영토 필터 없이 검색어만 있으면 DB 전역 텍스트 검색이 되어 다른 나라 행정부가 섞임.
     * 묶기 UI는 항상 국가(현대/역사)를 고른 뒤 검색하므로, 필터 없는 전역 검색은 금지.
     */
    if (!fc && !fh && term.length > 0) {
      return []
    }

    let territoryWhere: Prisma.GovernmentPositionTenureWhereInput | null = null
    if (fc) {
      const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: fc },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((r) => r.historicalCountryId))
      territoryWhere =
        linkedHistoricalIds.length > 0
          ? {
              OR: [
                { countryId: fc },
                { historicalCountryId: { in: linkedHistoricalIds } },
              ],
            }
          : { countryId: fc }
    } else if (fh) {
      territoryWhere = { historicalCountryId: fh }
    }

    /** 국가 미지정·검색어 없을 때: 다른 영토 위주 후보 */
    let excludeSameTerritory: {
      NOT: { headTenure: { OR: Array<{ countryId?: string; historicalCountryId?: string }> } }
    } | null = null
    if (!territoryWhere && term.length === 0) {
      const self = await this.prisma.cabinet.findUnique({
        where: { id: excludeCabinetId },
        select: {
          headTenure: { select: { countryId: true, historicalCountryId: true } },
        },
      })
      const ht = self?.headTenure
      const or: Array<{ countryId?: string; historicalCountryId?: string }> = []
      if (ht?.countryId) or.push({ countryId: ht.countryId })
      if (ht?.historicalCountryId) or.push({ historicalCountryId: ht.historicalCountryId })
      if (or.length > 0) {
        excludeSameTerritory = {
          NOT: { headTenure: { OR: or } },
        }
      }
    }

    const textClause: Prisma.CabinetWhereInput | null =
      term.length > 0
        ? {
            OR: [
              { name: { contains: term } },
              { headTenure: { person: { name: { contains: term } } } },
              { headTenure: { country: { name: { contains: term } } } },
              { headTenure: { historicalCountry: { name: { contains: term } } } },
            ],
          }
        : null

    const headTenureClause: Prisma.CabinetWhereInput | null = territoryWhere
      ? { headTenure: territoryWhere }
      : null

    const list = await this.prisma.cabinet.findMany({
      where: {
        id: { not: excludeCabinetId },
        ...(excludeSameTerritory ?? {}),
        ...(headTenureClause && textClause
          ? { AND: [headTenureClause, textClause] }
          : headTenureClause
            ? headTenureClause
            : textClause
              ? textClause
              : {}),
      },
      take: limit,
      orderBy: [{ headTenure: { startDate: 'desc' } }],
      include: {
        linkageGroup: { select: this.LINKAGE_GROUP_EVENT_SELECT },
        headTenure: {
          include: {
            person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
            country: {
              select: {
                id: true,
                name: true,
                flagEmoji: true,
                thumbnailUrl: true,
              },
            },
            historicalCountry: {
              select: { id: true, name: true, thumbnailUrl: true },
            },
            positionDefinition: { select: { title: true } },
            regnalEras: REGNAL_ERAS_ORDER,
          },
        },
      },
    })
    return list.map((c) => ser(c))
  }

  /**
   * 조직(만철, 관동군, 대만총독부 등) 역대 수장 — positionDefinition.organizationId 기준
   */
  async findTenuresByOrganizationId(organizationId: string): Promise<any[]> {
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    const tenures = await this.prisma.governmentPositionTenure.findMany({
      where: {
        positionDefinition: { organizationId },
      },
      orderBy: [{ startDate: 'asc' }],
      include: {
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        achievements: TENURE_ACHIEVEMENTS_INCLUDE,
      },
    })
    return tenures.map((t) => serializeBigInt(t))
  }

  /**
   * 재임 기록 단건 조회 (삭제 전 알림용)
   */
  async findTenureById(id: string): Promise<any | null> {
    const tenure = await this.prisma.governmentPositionTenure.findUnique({
      where: { id },
      include: {
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        achievements: TENURE_ACHIEVEMENTS_INCLUDE,
      },
    })
    if (!tenure) return null
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(tenure)
  }

  /**
   * 국가원수/왕위 재임 기록 삭제
   */
  async deleteGovernmentPositionTenure(id: string): Promise<void> {
    await this.prisma.governmentPositionTenure.delete({
      where: { id },
    })
  }

  /**
   * 재임 업적·한일 추가 (사건과 별도)
   */
  async createTenureAchievement(
    tenureId: string,
    dto: CreateTenureAchievementDto,
  ): Promise<any> {
    const achievement = await this.prisma.tenureAchievement.create({
      data: {
        tenureId,
        title: dto.title,
        description: dto.description ?? undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        orderNum: dto.orderNum ?? 0,
        showOnEventsPage: dto.showOnEventsPage ?? true,
        eventId: dto.eventId ?? undefined,
      },
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(achievement)
  }

  /**
   * 동일 사건(eventId)에 연결된 재임 업적 전부 — 여러 국가 행정부와 같은 사건을 엮었을 때 목록
   */
  async findTenureAchievementsByEventId(eventId: string): Promise<any[]> {
    const tenureInclude = {
      person: {
        select: {
          id: true,
          name: true,
          surname: true,
          middleName: true,
          nameDisplayOrder: true,
        },
      },
      country: {
        select: {
          id: true,
          name: true,
          flagEmoji: true,
          defaultNameDisplayOrder: true,
        },
      },
      historicalCountry: { select: { id: true, name: true } },
      cabinet: { select: { id: true, name: true } },
      positionDefinition: {
        select: {
          title: true,
          category: { select: { id: true, name: true, nameEn: true } },
          organization: { select: { id: true, name: true } },
        },
      },
    } as const

    const sovereignReignInclude = {
      person: {
        select: {
          id: true,
          name: true,
          surname: true,
          middleName: true,
          nameDisplayOrder: true,
        },
      },
      country: {
        select: {
          id: true,
          name: true,
          flagEmoji: true,
          defaultNameDisplayOrder: true,
        },
      },
      historicalCountry: { select: { id: true, name: true } },
      positionDefinition: {
        select: {
          title: true,
          category: { select: { id: true, name: true, nameEn: true } },
          organization: { select: { id: true, name: true } },
        },
      },
    } as const

    const [tenureRows, sovereignRows] = await Promise.all([
      this.prisma.tenureAchievement.findMany({
        where: { eventId },
        include: {
          event: {
            select: { id: true, title: true },
          },
          tenure: {
            include: tenureInclude,
          },
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.prisma.sovereignReignAchievement.findMany({
        where: { eventId },
        include: {
          event: {
            select: { id: true, title: true },
          },
          sovereignReign: {
            include: sovereignReignInclude,
          },
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
    ])

    const mappedTenure = tenureRows.map((row) => ({
      ...row,
      recordKind: 'TENURE_ACHIEVEMENT',
    }))
    const mappedSovereign = sovereignRows.map((row) => this.mapSovereignReignAchievementRow(row))
    const merged = [...mappedTenure, ...mappedSovereign].sort((a, b) => {
      const ca = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
      const cb = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
      return ca - cb
    })

    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(merged)
  }

  /**
   * 사건 페이지에 표시할 업적 목록 (showOnEventsPage=true)
   */
  async findAchievementsForEventsPage(): Promise<any[]> {
    const tenureAchievementInclude = {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          deletedAt: true,
        },
      },
      tenure: {
        include: {
          person: {
            select: {
              id: true,
              name: true,
              surname: true,
              middleName: true,
              nameDisplayOrder: true,
            },
          },
          country: {
            select: {
              id: true,
              name: true,
              flagEmoji: true,
              defaultNameDisplayOrder: true,
            },
          },
          historicalCountry: { select: { id: true, name: true } },
          positionDefinition: {
            select: {
              title: true,
              category: { select: { id: true, name: true, nameEn: true } },
              organization: { select: { id: true, name: true } },
            },
          },
        },
      },
    } as const

    const sovereignAchievementInclude = {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          deletedAt: true,
        },
      },
      sovereignReign: {
        include: {
          person: {
            select: {
              id: true,
              name: true,
              surname: true,
              middleName: true,
              nameDisplayOrder: true,
            },
          },
          country: {
            select: {
              id: true,
              name: true,
              flagEmoji: true,
              defaultNameDisplayOrder: true,
            },
          },
          historicalCountry: { select: { id: true, name: true } },
          positionDefinition: {
            select: {
              title: true,
              category: { select: { id: true, name: true, nameEn: true } },
              organization: { select: { id: true, name: true } },
            },
          },
        },
      },
    } as const

    const [tenureList, sovereignList] = await Promise.all([
      this.prisma.tenureAchievement.findMany({
        where: { showOnEventsPage: true },
        include: tenureAchievementInclude,
        orderBy: [{ startDate: 'asc' }, { orderNum: 'asc' }],
      }),
      this.prisma.sovereignReignAchievement.findMany({
        where: { showOnEventsPage: true },
        include: sovereignAchievementInclude,
        orderBy: [{ startDate: 'asc' }, { orderNum: 'asc' }],
      }),
    ])

    const mappedTenure = tenureList.map((row) => ({
      ...row,
      recordKind: 'TENURE_ACHIEVEMENT',
    }))
    const mappedSovereign = sovereignList.map((row) => this.mapSovereignReignAchievementRow(row))
    const merged = [...mappedTenure, ...mappedSovereign].sort((a, b) =>
      this.sortAchievementsForEventsPageMerged(a, b),
    )

    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(merged)
  }

  /**
   * 재임 업적 수정
   */
  async updateTenureAchievement(
    tenureId: string,
    achievementId: string,
    dto: UpdateTenureAchievementDto,
  ): Promise<any> {
    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null
    if (dto.orderNum !== undefined) data.orderNum = dto.orderNum
    if (dto.showOnEventsPage !== undefined) data.showOnEventsPage = dto.showOnEventsPage
    if (dto.eventId !== undefined) data.eventId = dto.eventId
    const existing = await this.prisma.tenureAchievement.findFirst({
      where: { id: achievementId, tenureId },
    })
    if (!existing) {
      throw new Error('TenureAchievement not found')
    }
    const achievement = await this.prisma.tenureAchievement.update({
      where: { id: achievementId },
      data,
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(achievement)
  }

  /**
   * 재임 업적 삭제
   */
  async deleteTenureAchievement(tenureId: string, achievementId: string): Promise<void> {
    await this.prisma.tenureAchievement.deleteMany({
      where: { id: achievementId, tenureId },
    })
  }

  async createSovereignReignAchievement(
    sovereignReignId: string,
    dto: CreateTenureAchievementDto,
  ): Promise<any> {
    const achievement = await this.prisma.sovereignReignAchievement.create({
      data: {
        sovereignReignId,
        title: dto.title,
        description: dto.description ?? undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        orderNum: dto.orderNum ?? 0,
        showOnEventsPage: dto.showOnEventsPage ?? true,
        eventId: dto.eventId ?? undefined,
      },
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(achievement)
  }

  async updateSovereignReignAchievement(
    sovereignReignId: string,
    achievementId: string,
    dto: UpdateTenureAchievementDto,
  ): Promise<any> {
    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null
    if (dto.orderNum !== undefined) data.orderNum = dto.orderNum
    if (dto.showOnEventsPage !== undefined) data.showOnEventsPage = dto.showOnEventsPage
    if (dto.eventId !== undefined) data.eventId = dto.eventId
    const existing = await this.prisma.sovereignReignAchievement.findFirst({
      where: { id: achievementId, sovereignReignId },
    })
    if (!existing) {
      throw new Error('SovereignReignAchievement not found')
    }
    const achievement = await this.prisma.sovereignReignAchievement.update({
      where: { id: achievementId },
      data,
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(achievement)
  }

  async deleteSovereignReignAchievement(
    sovereignReignId: string,
    achievementId: string,
  ): Promise<void> {
    await this.prisma.sovereignReignAchievement.deleteMany({
      where: { id: achievementId, sovereignReignId },
    })
  }

  async createRegnalEra(
    parent: { tenureId: string } | { sovereignReignId: string },
    dto: CreateRegnalEraDto,
  ): Promise<any> {
    const tenureId = 'tenureId' in parent ? parent.tenureId : undefined
    const sovereignReignId = 'sovereignReignId' in parent ? parent.sovereignReignId : undefined
    if (tenureId) {
      const tenure = await this.prisma.governmentPositionTenure.findUnique({
        where: { id: tenureId },
        select: { id: true },
      })
      if (!tenure) {
        throw new Error('GovernmentPositionTenure not found')
      }
    } else if (sovereignReignId) {
      const sr = await this.prisma.sovereignReign.findUnique({
        where: { id: sovereignReignId },
        select: { id: true },
      })
      if (!sr) {
        throw new Error('SovereignReign not found')
      }
    }
    const row = await this.prisma.regnalEra.create({
      data: {
        tenureId: tenureId ?? null,
        sovereignReignId: sovereignReignId ?? null,
        eraName: dto.eraName.trim(),
        eraNameEn: dto.eraNameEn?.trim() || null,
        startYear: dto.startYear,
        startMonth: dto.startMonth ?? null,
        startDay: dto.startDay ?? null,
        endYear: dto.endYear ?? null,
        endMonth: dto.endMonth ?? null,
        endDay: dto.endDay ?? null,
        changeReason: dto.changeReason?.trim() || null,
      },
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(row)
  }

  async updateRegnalEra(id: string, dto: UpdateRegnalEraDto): Promise<any> {
    const existing = await this.prisma.regnalEra.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('RegnalEra not found')
    }
    const data: any = {}
    if (dto.eraName !== undefined) data.eraName = dto.eraName.trim()
    if (dto.eraNameEn !== undefined) data.eraNameEn = dto.eraNameEn?.trim() || null
    if (dto.startYear !== undefined) data.startYear = dto.startYear
    if (dto.startMonth !== undefined) data.startMonth = dto.startMonth
    if (dto.startDay !== undefined) data.startDay = dto.startDay
    if (dto.endYear !== undefined) data.endYear = dto.endYear
    if (dto.endMonth !== undefined) data.endMonth = dto.endMonth
    if (dto.endDay !== undefined) data.endDay = dto.endDay
    if (dto.changeReason !== undefined) data.changeReason = dto.changeReason?.trim() || null
    const row = await this.prisma.regnalEra.update({ where: { id }, data })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(row)
  }

  async deleteRegnalEra(id: string): Promise<void> {
    await this.prisma.regnalEra.delete({ where: { id } })
  }

  /**
   * 관직 정의 목록 조회 — 단일 레벨 전체 (재임 선택·관리 공통)
   */
  async findPositionDefinitions(_params?: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    const list = await this.prisma.governmentPositionDefinition.findMany({
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        organization: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: [{ rank: 'asc' }, { title: 'asc' }],
    })
    return list.map((row) => this.serializeDefinition(row))
  }

  /**
   * 관직 정의 단건 조회
   */
  async findPositionDefinitionById(id: string): Promise<any | null> {
    const row = await this.prisma.governmentPositionDefinition.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        organization: { select: { id: true, name: true, shortName: true } },
      },
    })
    return row ? this.serializeDefinition(row) : null
  }

  /**
   * 관직 정의 생성
   */
  async createPositionDefinition(
    dto: CreateGovernmentPositionDefinitionDto,
  ): Promise<any> {
    const row = await this.prisma.governmentPositionDefinition.create({
      data: {
        positionType: dto.positionType as any,
        title: dto.title,
        titleEn: dto.titleEn ?? undefined,
        titleLocal: dto.titleLocal ?? undefined,
        description: dto.description ?? undefined,
        rank: dto.rank ?? undefined,
        categoryId: dto.categoryId ?? undefined,
        organizationId: dto.organizationId ?? undefined,
        establishedDate: dto.establishedDate ? new Date(dto.establishedDate) : undefined,
        abolishedDate: dto.abolishedDate ? new Date(dto.abolishedDate) : undefined,
      },
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        organization: { select: { id: true, name: true, shortName: true } },
      },
    })
    return this.serializeDefinition(row)
  }

  /**
   * 관직 정의 수정
   */
  async updatePositionDefinition(
    id: string,
    dto: UpdateGovernmentPositionDefinitionDto,
  ): Promise<any> {
    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn
    if (dto.titleLocal !== undefined) data.titleLocal = dto.titleLocal
    if (dto.positionType !== undefined) data.positionType = dto.positionType as any
    if (dto.description !== undefined) data.description = dto.description
    if (dto.rank !== undefined) data.rank = dto.rank
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId
    if (dto.organizationId !== undefined) data.organizationId = dto.organizationId
    if (dto.establishedDate !== undefined)
      data.establishedDate = dto.establishedDate ? new Date(dto.establishedDate) : null
    if (dto.abolishedDate !== undefined)
      data.abolishedDate = dto.abolishedDate ? new Date(dto.abolishedDate) : null
    const row = await this.prisma.governmentPositionDefinition.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, nameEn: true } },
        organization: { select: { id: true, name: true, shortName: true } },
      },
    })
    return this.serializeDefinition(row)
  }

  /**
   * 관직 정의 삭제
   */
  async deletePositionDefinition(id: string): Promise<void> {
    await this.prisma.governmentPositionDefinition.delete({
      where: { id },
    })
  }

  private serializeDefinition(row: any): any {
    const serialize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serialize)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serialize(obj[key])
        return result
      }
      return obj
    }
    return serialize(row)
  }

  /**
   * 학력 추가
   */
  async addEducation(dto: CreateEducationDto): Promise<PersonEducationResponseDto> {
    const { images, ...educationData } = dto
    
    const education = await this.prisma.personEducation.create({
      data: {
        ...educationData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToPersonEducationResponse(education)
  }

  /**
   * 수상/훈장 추가
   */
  async addAward(dto: CreatePersonAwardDto): Promise<PersonAwardResponseDto> {
    const { images, ...awardData } = dto
    
    const award = await this.prisma.personAward.create({
      data: {
        ...awardData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
    })
    
    return this.mapToPersonAwardResponse(award)
  }

  /**
   * 인물의 재임 기록만 조회 (GovernmentPositionTenure)
   * 수정 페이지에서 경력을 확실히 불러오기 위해 전용 API로 사용
   */
  async findTenuresByPersonId(personId: string): Promise<any[]> {
    const tenureInclude = {
      positionDefinition: true,
      country: true,
      historicalCountry: true,
      achievements: TENURE_ACHIEVEMENTS_INCLUDE,
      electionCandidacy: {
        select: {
          id: true,
          election: { select: { id: true, name: true, pollDate: true } },
          party: { select: { id: true, name: true } },
        },
      },
    } as const

    const [tenures, reigns] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: { personId },
        include: tenureInclude,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.sovereignReign.findMany({
        where: { personId },
        include: {
          positionDefinition: true,
          country: true,
          historicalCountry: true,
          achievements: TENURE_ACHIEVEMENTS_INCLUDE,
        },
        orderBy: { startDate: 'desc' },
      }),
    ])

    const merged = [
      ...tenures.map((t) => ({ ...t, recordKind: 'TENURE' })),
      ...reigns.map((r) => this.mapSovereignReignToChronologyItem(r)),
    ]
    merged.sort((a, b) => {
      const da = a.startDate instanceof Date ? a.startDate.toISOString() : String(a.startDate)
      const db = b.startDate instanceof Date ? b.startDate.toISOString() : String(b.startDate)
      return db.localeCompare(da)
    })

    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(merged)
  }

  /**
   * 인물이 후보로 등록된 선거 후보 행 — 재임에 연결할 때 선택용
   */
  async findElectionCandidaciesForTenureLink(personId: string): Promise<any[]> {
    const rows = await this.prisma.electionCandidacy.findMany({
      where: { personId },
      include: {
        election: { select: { id: true, name: true, pollDate: true } },
        party: { select: { id: true, name: true } },
      },
      orderBy: [{ election: { pollDate: 'desc' } }, { id: 'desc' }],
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(rows)
  }

  private async buildCountryScopeWhere(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any | null> {
    const { countryId, historicalCountryId } = params
    if (!countryId && !historicalCountryId) return null
    let where: any = historicalCountryId
      ? { historicalCountryId }
      : { countryId: countryId! }
    if (countryId) {
      const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: countryId },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((r) => r.historicalCountryId))
      if (linkedHistoricalIds.length > 0) {
        where = {
          OR: [
            { countryId },
            { historicalCountryId: { in: linkedHistoricalIds } },
          ],
        }
      }
    }
    return where
  }

  /** SovereignReign → 역대 수반 목록 API와 동일한 형태(업적 tenureId 호환) */
  private mapSovereignReignToChronologyItem(sr: any): any {
    const achievements = (sr.achievements ?? []).map((a: any) => ({
      ...a,
      tenureId: sr.id,
    }))
    return {
      ...sr,
      recordKind: 'SOVEREIGN_REIGN',
      positionType: 'HEAD_OF_STATE',
      title: sr.positionDefinition?.title ?? null,
      titleEn: sr.positionDefinition?.titleEn ?? null,
      position: sr.positionDefinition ?? null,
      achievements,
      electionCandidacy: null,
      mandateSource: 'UNKNOWN',
    }
  }

  /** 업적 API 응답의 `tenure` 블록용 — 중첩 업적 순환 방지 */
  private mapSovereignReignAsAchievementParentTenure(sr: any): any {
    if (!sr) return sr
    return this.mapSovereignReignToChronologyItem({ ...sr, achievements: [] })
  }

  private mapSovereignReignAchievementRow(row: any): any {
    const { sovereignReign, ...rest } = row
    return {
      ...rest,
      tenureId: row.sovereignReignId,
      recordKind: 'SOVEREIGN_REIGN_ACHIEVEMENT',
      tenure: this.mapSovereignReignAsAchievementParentTenure(sovereignReign),
    }
  }

  private sortAchievementsForEventsPageMerged(a: any, b: any): number {
    const sa = a.startDate
      ? a.startDate instanceof Date
        ? a.startDate.toISOString()
        : String(a.startDate)
      : ''
    const sb = b.startDate
      ? b.startDate instanceof Date
        ? b.startDate.toISOString()
        : String(b.startDate)
      : ''
    if (sa !== sb) return sa.localeCompare(sb)
    const oa = a.orderNum ?? 0
    const ob = b.orderNum ?? 0
    return oa - ob
  }

  /**
   * 국가 또는 역사적 국가별 재임 기록 조회 (연대표 국가 페이지 수장 목록용)
   * GovernmentPositionTenure + SovereignReign(군주 재위) 병합. `recordKind`: TENURE | SOVEREIGN_REIGN
   */
  async findTenuresByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    const where = await this.buildCountryScopeWhere(params)
    if (!where) return []

    const headPersonSelect = {
      id: true,
      name: true,
      surname: true,
      middleName: true,
      nameDisplayOrder: true,
      profileImageUrl: true,
      templeName: true,
      regnalName: true,
      posthumousName: true,
      fatherId: true,
      motherId: true,
      dynastyId: true,
      dynasty: { select: { id: true, name: true } },
      countryId: true,
      country: {
        select: {
          id: true,
          name: true,
          defaultNameDisplayOrder: true,
        },
      },
      birthCityId: true,
      birthAdminDivisionId: true,
      birthPlaceText: true,
      birthCity: { select: { id: true, name: true } },
      birthAdminDivision: { select: { id: true, name: true } },
    } as const

    const tenureInclude = {
      positionDefinition: true,
      country: true,
      historicalCountry: true,
      cabinet: { select: { id: true, name: true } },
      person: { select: headPersonSelect },
      electionCandidacy: {
        select: {
          id: true,
          election: { select: { id: true, name: true, pollDate: true } },
          party: { select: { id: true, name: true } },
        },
      },
      achievements: TENURE_ACHIEVEMENTS_INCLUDE,
      regnalEras: REGNAL_ERAS_ORDER,
    } as const

    const [tenures, reigns] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where,
        include: tenureInclude,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.sovereignReign.findMany({
        where,
        include: {
          positionDefinition: true,
          country: true,
          historicalCountry: true,
          person: { select: headPersonSelect },
          achievements: TENURE_ACHIEVEMENTS_INCLUDE,
          regnalEras: REGNAL_ERAS_ORDER,
        },
        orderBy: { startDate: 'desc' },
      }),
    ])

    const merged = [
      ...tenures.map((t) => ({ ...t, recordKind: 'TENURE' })),
      ...reigns.map((r) => this.mapSovereignReignToChronologyItem(r)),
    ]
    merged.sort((a, b) => {
      const da = a.startDate instanceof Date ? a.startDate.toISOString() : String(a.startDate)
      const db = b.startDate instanceof Date ? b.startDate.toISOString() : String(b.startDate)
      return db.localeCompare(da)
    })

    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(merged)
  }

  async addSovereignReign(dto: CreateSovereignReignDto, accountId?: string): Promise<any> {
    const countryFields = await this.resolveTenureCountryFields({
      countryId: dto.countryId,
      historicalCountryId: dto.historicalCountryId,
    })
    const row = await this.prisma.sovereignReign.create({
      data: {
        personId: dto.personId,
        ...(countryFields.countryId != null && { countryId: countryFields.countryId }),
        ...(countryFields.historicalCountryId != null && {
          historicalCountryId: countryFields.historicalCountryId,
        }),
        positionDefinitionId: dto.positionDefinitionId ?? undefined,
        termNumber: dto.termNumber,
        subTermNumber: dto.subTermNumber,
        regnalNumber: dto.regnalNumber,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        appointmentMethod: dto.appointmentMethod as any,
        endReason: dto.endReason as any,
        endReasonDetail: dto.endReasonDetail,
        notes: dto.notes,
        showPositionInfo: dto.showPositionInfo !== false,
        ...(accountId != null && { accountId }),
      },
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        achievements: TENURE_ACHIEVEMENTS_INCLUDE,
        regnalEras: REGNAL_ERAS_ORDER,
      },
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(row)
  }

  async updateSovereignReign(id: string, dto: Partial<CreateSovereignReignDto>): Promise<any> {
    const updateData: any = {}
    if (dto.countryId !== undefined || dto.historicalCountryId !== undefined) {
      const countryFields = await this.resolveTenureCountryFields({
        countryId: dto.countryId,
        historicalCountryId: dto.historicalCountryId,
      })
      updateData.countryId = countryFields.countryId ?? null
      updateData.historicalCountryId = countryFields.historicalCountryId ?? null
    }
    if (dto.personId !== undefined) updateData.personId = dto.personId
    if (dto.positionDefinitionId !== undefined)
      updateData.positionDefinitionId = dto.positionDefinitionId || null
    if (dto.termNumber !== undefined) updateData.termNumber = dto.termNumber
    if (dto.subTermNumber !== undefined) updateData.subTermNumber = dto.subTermNumber
    if (dto.regnalNumber !== undefined) updateData.regnalNumber = dto.regnalNumber
    if (dto.startDate) updateData.startDate = new Date(dto.startDate)
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null
    if (dto.appointmentMethod !== undefined) updateData.appointmentMethod = dto.appointmentMethod as any
    if (dto.endReason !== undefined) updateData.endReason = dto.endReason as any
    if (dto.endReasonDetail !== undefined) updateData.endReasonDetail = dto.endReasonDetail
    if (dto.notes !== undefined) updateData.notes = dto.notes
    if (dto.showPositionInfo !== undefined) updateData.showPositionInfo = dto.showPositionInfo

    const row = await this.prisma.sovereignReign.update({
      where: { id },
      data: updateData,
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
        achievements: TENURE_ACHIEVEMENTS_INCLUDE,
        regnalEras: REGNAL_ERAS_ORDER,
      },
    })
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(row)
  }

  async deleteSovereignReign(id: string): Promise<void> {
    await this.prisma.sovereignReign.delete({ where: { id } })
  }

  async findSovereignReignById(id: string): Promise<any | null> {
    const row = await this.prisma.sovereignReign.findUnique({
      where: { id },
      include: {
        positionDefinition: true,
        person: { include: PERSON_INCLUDE_COUNTRY_FOR_NAME },
      },
    })
    if (!row) return null
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(row)
  }

  /**
   * 전역 수반(국가에 속하지 않는 직책: 교황 등) 재임 기록 조회
   * countryId, historicalCountryId가 모두 null인 tenure
   */
  async findGlobalTenures(): Promise<any[]> {
    const globalWhere = {
      countryId: null,
      historicalCountryId: null,
    }

    const personSelect = {
      id: true,
      name: true,
      surname: true,
      middleName: true,
      nameDisplayOrder: true,
      profileImageUrl: true,
      birthCityId: true,
      birthAdminDivisionId: true,
      birthPlaceText: true,
      birthCity: { select: { id: true, name: true } },
      birthAdminDivision: { select: { id: true, name: true } },
    } as const

    const [tenures, reigns] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: globalWhere,
        include: {
          positionDefinition: true,
          country: true,
          historicalCountry: true,
          person: {
            select: personSelect,
          },
          electionCandidacy: {
            select: {
              id: true,
              election: { select: { id: true, name: true, pollDate: true } },
              party: { select: { id: true, name: true } },
            },
          },
          achievements: TENURE_ACHIEVEMENTS_INCLUDE,
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.sovereignReign.findMany({
        where: globalWhere,
        include: {
          positionDefinition: true,
          country: true,
          historicalCountry: true,
          person: {
            select: personSelect,
          },
          achievements: TENURE_ACHIEVEMENTS_INCLUDE,
        },
        orderBy: { startDate: 'desc' },
      }),
    ])

    const merged = [
      ...tenures.map((t) => ({ ...t, recordKind: 'TENURE' })),
      ...reigns.map((r) => this.mapSovereignReignToChronologyItem(r)),
    ]
    merged.sort((a, b) => {
      const da = a.startDate instanceof Date ? a.startDate.toISOString() : String(a.startDate)
      const db = b.startDate instanceof Date ? b.startDate.toISOString() : String(b.startDate)
      return db.localeCompare(da)
    })

    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (obj instanceof Date) return obj.toISOString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) result[key] = serializeBigInt(obj[key])
        return result
      }
      return obj
    }
    return serializeBigInt(merged)
  }

  /**
   * 해당 국가(또는 연결된 역사적 국가)에 재임 기록이 있는 인물만 조회 (역대 수반 인물 선택용)
   */
  async findPersonsWithTenureInCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<PersonResponseDto[]> {
    const { countryId, historicalCountryId } = params
    if (!countryId && !historicalCountryId) return []

    let tenureWhere: any = historicalCountryId
      ? { historicalCountryId }
      : { countryId: countryId! }

    if (countryId) {
      const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: countryId },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((r) => r.historicalCountryId))
      if (linkedHistoricalIds.length > 0) {
        tenureWhere = {
          OR: [
            { countryId },
            { historicalCountryId: { in: linkedHistoricalIds } },
          ],
        }
      }
    }

    const [tenureRows, reignRows] = await Promise.all([
      this.prisma.governmentPositionTenure.findMany({
        where: tenureWhere,
        select: { personId: true },
        distinct: ['personId'],
      }),
      this.prisma.sovereignReign.findMany({
        where: tenureWhere,
        select: { personId: true },
        distinct: ['personId'],
      }),
    ])
    const personIdSet = new Set<string>()
    for (const t of tenureRows) personIdSet.add(t.personId)
    for (const r of reignRows) personIdSet.add(r.personId)
    const personIds = [...personIdSet]
    if (personIds.length === 0) return []

    const persons = await this.prisma.person.findMany({
      where: { id: { in: personIds } },
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      include: {
        countryAffiliations: {
          include: PERSON_INCLUDE_AFFILIATIONS_FOR_NAME,
        },
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
            isoCode: true,
            defaultNameDisplayOrder: true,
          },
        },
        dynasty: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
        birthCity: { select: { id: true, name: true } },
        deathCity: { select: { id: true, name: true } },
        birthAdminDivision: { select: { id: true, name: true } },
        deathAdminDivision: { select: { id: true, name: true } },
        GovernmentTenures: {
          select: {
            id: true,
            positionType: true,
            title: true,
            startDate: true,
            endDate: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                category: { select: { id: true, name: true, nameEn: true } }, organization: { select: { id: true, name: true } },
              },
            },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
        sovereignReigns: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            termNumber: true,
            regnalNumber: true,
            notes: true,
            showPositionInfo: true,
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                category: { select: { id: true, name: true, nameEn: true } }, organization: { select: { id: true, name: true } },
              },
            },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    })
    return persons.map((p) => this.mapToPersonResponse(p))
  }

  /**
   * 인물의 모든 경력 조회
   *
   * 경력 타입별로 테이블이 나뉘어 있어도, Prisma는 한 번의 findUnique + include로
   * Person과 연결된 모든 경력 테이블을 한 번에 조회한다.
   * (타입이 늘어나면 include에 키만 추가하면 되고, API 호출 횟수는 1회로 유지)
   */
  async findAllCareers(personId: string): Promise<AllCareersResponseDto> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        militaryCareers: true,
        businessCareers: true,
        academicCareers: true,
        religiousCareers: true,
        artistCareers: true,
        athleteCareers: true,
        mediaCareers: true,
        legalCareers: true,
        medicalCareers: true,
        educations: true,
        awards: true,
      }
    })

    if (!person) {
      return {
        military: [],
        government: [],
        business: [],
        academic: [],
        athlete: [],
        religious: [],
        artist: [],
        media: [],
        legal: [],
        medical: [],
        education: [],
        awards: []
      }
    }

    return {
      military: person.militaryCareers.map(c => this.mapToMilitaryCareerResponse(c)),
      government: [],
      business: person.businessCareers.map(c => this.mapToBusinessCareerResponse(c)),
      academic: person.academicCareers.map(c => this.mapToAcademicCareerResponse(c)),
      athlete: person.athleteCareers.map(c => this.mapToAthleteCareerResponse(c)),
      religious: person.religiousCareers.map(c => this.mapToReligiousCareerResponse(c)),
      artist: person.artistCareers.map(c => this.mapToArtistCareerResponse(c)),
      media: person.mediaCareers.map(c => this.mapToMediaCareerResponse(c)),
      legal: person.legalCareers.map(c => this.mapToLegalCareerResponse(c)),
      medical: person.medicalCareers.map(c => this.mapToMedicalCareerResponse(c)),
      education: person.educations.map(e => this.mapToPersonEducationResponse(e)),
      awards: person.awards.map(a => this.mapToPersonAwardResponse(a)),
    }
  }
}
