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
 * Prisma 기반 인물 Repository 구현체
 */
@Injectable()
export class PersonPrismaRepository implements IPersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 인물 create/update 시 FK 필드 정리.
   * 빈 문자열('')·null·undefined인 FK는 객체에서 제거해 Prisma에 전달하지 않음 → country_id 등 FK 위반 방지.
   */
  private sanitizePersonFkFields<T extends CreatePersonData | UpdatePersonData>(data: T): T {
    const fkKeys = [
      'countryId',
      'birthCityId',
      'deathCityId',
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
      // 관계
      dynastyId: person.dynastyId,
      religionId: person.religionId,
      denominationId: person.denominationId,
      fatherId: person.fatherId,
      motherId: person.motherId,
      jobId: person.jobId,
      countryId: this.getEffectiveBirthCountryId(person),
      birthCityId: person.birthCityId ?? null,
      deathCityId: person.deathCityId ?? null,
      showLifespanOnEventList: person.showLifespanOnEventList,
      // 정부 직위 재임 기록
      governmentTenures: person.GovernmentTenures ? serializeBigInt(person.GovernmentTenures) : undefined,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
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
   * 모든 인물 목록 조회 (출생국가에 역사적 국가 포함해 effective countryId 반환)
   */
  async findAll(): Promise<PersonResponseDto[]> {
    const persons = await this.prisma.person.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        countryAffiliations: true,
      },
    })
    return persons.map((p) => this.mapToPersonResponse(p))
  }

  /**
   * 모든 인물 목록 조회 (정부 직책 + 정부/공무원 경력 포함)
   * 사건 페이지에서 "직책 정보 표시" 체크된 재임·정부경력 모두 표시용
   */
  async findAllWithGovernmentPositions() {
    return this.prisma.person.findMany({
      include: {
        GovernmentTenures: {
          select: {
            id: true,
            termNumber: true,
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
                departmentName: true,
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
  async findById(id: string): Promise<PersonResponseDto | null> {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        countryAffiliations: true,
        GovernmentTenures: {
          include: {
            positionDefinition: true,
            country: true,
            historicalCountry: true,
          },
          orderBy: {
            startDate: 'desc',
          },
        },
      },
    })
    return person ? this.mapToPersonResponse(person) : null
  }

  /**
   * ID로 인물 상세 조회 (관계 데이터 포함)
   */
  async findByIdWithRelations(id: string) {
    return this.prisma.person.findUnique({
      where: { id },
      include: {
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
          },
        },
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
    })
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

    const person = await this.prisma.person.create({
      data: sanitized as Parameters<PrismaService['person']['create']>[0]['data'],
    })

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
      include: { countryAffiliations: true },
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

    // 응답에 effective countryId(역사적 국가 포함)를 넣기 위해 countryAffiliations 포함해 재조회
    const updated = await this.prisma.person.findUnique({
      where: { id },
      include: { countryAffiliations: true },
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
  async addGovernmentPositionTenure(dto: CreateGovernmentPositionTenureDto): Promise<any> {
    const countryFields = await this.resolveTenureCountryFields({
      countryId: dto.countryId,
      historicalCountryId: dto.historicalCountryId,
    })
    const tenure = await this.prisma.governmentPositionTenure.create({
      data: {
        personId: dto.personId,
        positionType: dto.positionType as any,
        title: dto.title,
        titleEn: dto.titleEn,
        showPositionInfo: dto.showPositionInfo !== false, // 기본값 true
        ...(countryFields.countryId != null && { countryId: countryFields.countryId }),
        ...(countryFields.historicalCountryId != null && {
          historicalCountryId: countryFields.historicalCountryId,
        }),
        positionDefinitionId: dto.positionDefinitionId ?? undefined,
        termNumber: dto.termNumber,
        regnalNumber: dto.regnalNumber,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        appointmentMethod: dto.appointmentMethod as any,
        endReason: dto.endReason as any,
        endReasonDetail: dto.endReasonDetail,
        notes: dto.notes,
        priority: dto.priority,
      },
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: true,
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
    if (dto.regnalNumber !== undefined) updateData.regnalNumber = dto.regnalNumber
    if (dto.startDate) updateData.startDate = new Date(dto.startDate)
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null
    if (dto.appointmentMethod !== undefined) updateData.appointmentMethod = dto.appointmentMethod as any
    if (dto.endReason !== undefined) updateData.endReason = dto.endReason as any
    if (dto.endReasonDetail !== undefined) updateData.endReasonDetail = dto.endReasonDetail
    if (dto.notes !== undefined) updateData.notes = dto.notes
    if (dto.priority !== undefined) updateData.priority = dto.priority

    const tenure = await this.prisma.governmentPositionTenure.update({
      where: { id },
      data: updateData,
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: true,
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
   * 재임 기록 단건 조회 (삭제 전 알림용)
   */
  async findTenureById(id: string): Promise<any | null> {
    const tenure = await this.prisma.governmentPositionTenure.findUnique({
      where: { id },
      include: { person: true },
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
   * 관직 정의 목록 조회 (국가/역사적 국가별)
   */
  async findPositionDefinitions(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    const where: any = {}
    if (params.countryId) where.countryId = params.countryId
    if (params.historicalCountryId)
      where.historicalCountryId = params.historicalCountryId
    const list = await this.prisma.governmentPositionDefinition.findMany({
      where,
      include: {
        organization: true,
        country: true,
        historicalCountry: true,
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
        organization: true,
        country: true,
        historicalCountry: true,
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
        title: dto.title,
        titleEn: dto.titleEn ?? undefined,
        titleLocal: dto.titleLocal ?? undefined,
        positionType: dto.positionType as any,
        description: dto.description ?? undefined,
        rank: dto.rank ?? undefined,
        departmentName: dto.departmentName ?? undefined,
        organizationId: dto.organizationId ?? undefined,
        countryId: dto.countryId ?? undefined,
        historicalCountryId: dto.historicalCountryId ?? undefined,
        establishedDate: dto.establishedDate
          ? new Date(dto.establishedDate)
          : undefined,
        abolishedDate: dto.abolishedDate
          ? new Date(dto.abolishedDate)
          : undefined,
      },
      include: {
        organization: true,
        country: true,
        historicalCountry: true,
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
    if (dto.positionType !== undefined) data.positionType = dto.positionType
    if (dto.description !== undefined) data.description = dto.description
    if (dto.rank !== undefined) data.rank = dto.rank
    if (dto.departmentName !== undefined) data.departmentName = dto.departmentName
    if (dto.organizationId !== undefined) data.organizationId = dto.organizationId
    if (dto.countryId !== undefined) data.countryId = dto.countryId
    if (dto.historicalCountryId !== undefined)
      data.historicalCountryId = dto.historicalCountryId
    if (dto.establishedDate !== undefined)
      data.establishedDate = dto.establishedDate
        ? new Date(dto.establishedDate)
        : null
    if (dto.abolishedDate !== undefined)
      data.abolishedDate = dto.abolishedDate
        ? new Date(dto.abolishedDate)
        : null
    const row = await this.prisma.governmentPositionDefinition.update({
      where: { id },
      data,
      include: {
        organization: true,
        country: true,
        historicalCountry: true,
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
    const tenures = await this.prisma.governmentPositionTenure.findMany({
      where: { personId },
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
      },
      orderBy: { startDate: 'desc' },
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
    return serializeBigInt(tenures)
  }

  /**
   * 국가 또는 역사적 국가별 재임 기록 조회 (연대표 국가 페이지 수장 목록용)
   * - 현대 국가(countryId)일 때: 해당 국가 + 이 현대 국가에 연결된 모든 역사적 국가의 재임 기록 포함 (하위 국가 인물 모두 표시)
   * - 역사적 국가(historicalCountryId)만 조회 시: 해당 역사적 국가만
   */
  async findTenuresByCountry(params: {
    countryId?: string
    historicalCountryId?: string
  }): Promise<any[]> {
    const { countryId, historicalCountryId } = params
    if (!countryId && !historicalCountryId) return []

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

    const tenures = await this.prisma.governmentPositionTenure.findMany({
      where,
      include: {
        positionDefinition: true,
        country: true,
        historicalCountry: true,
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            middleName: true,
            nameDisplayOrder: true,
            profileImageUrl: true,
            fatherId: true,
            motherId: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
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
    return serializeBigInt(tenures)
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

    const tenures = await this.prisma.governmentPositionTenure.findMany({
      where: tenureWhere,
      select: { personId: true },
      distinct: ['personId'],
    })
    const personIds = tenures.map((t) => t.personId)
    if (personIds.length === 0) return []

    const persons = await this.prisma.person.findMany({
      where: { id: { in: personIds } },
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      include: {
        countryAffiliations: true,
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
