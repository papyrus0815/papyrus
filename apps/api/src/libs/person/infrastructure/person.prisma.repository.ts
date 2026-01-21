import { Injectable } from '@nestjs/common'
import { 
  Person,
  MilitaryCareer,
  GovernmentCareer,
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
  AllCareersResponse,
} from '../domain/person.repository'
import {
  CreateMilitaryCareerDto,
  CreateGovernmentCareerDto,
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
} from '../presentation/dto'

/**
 * Prisma 기반 인물 Repository 구현체
 */
@Injectable()
export class PersonPrismaRepository implements IPersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 모든 인물 목록 조회
   */
  async findAll(): Promise<Person[]> {
    return this.prisma.person.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * 모든 인물 목록 조회 (정부 직책 포함)
   */
  async findAllWithGovernmentPositions() {
    return this.prisma.person.findMany({
      include: {
        GovernmentTenures: {
          select: {
            id: true,
            termNumber: true,
            startDate: true,
            endDate: true,
            appointmentMethod: true,
            endReason: true,
            notes: true,
            priority: true,
            position: {
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
  async findById(id: string): Promise<Person | null> {
    return this.prisma.person.findUnique({
      where: { id },
    })
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
            birthDate: true,
            deathDate: true,
          },
        },
        mother: {
          select: {
            id: true,
            name: true,
            surname: true,
            birthDate: true,
            deathDate: true,
          },
        },
        childrenFromFather: {
          select: {
            id: true,
            name: true,
            surname: true,
            birthDate: true,
            deathDate: true,
          },
        },
        childrenFromMother: {
          select: {
            id: true,
            name: true,
            surname: true,
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
                timelines: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    occurredAt: true,
                    locationName: true,
                    latitude: true,
                    longitude: true,
                    sequenceNumber: true,
                    city: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    administrativeDivision: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    modernCountry: {
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
                    facility: {
                      select: {
                        id: true,
                        name: true,
                        facilityType: true,
                      },
                    },
                    EventTimelinePerson: {
                      select: {
                        id: true,
                        action: true,
                        note: true,
                        person: {
                          select: {
                            id: true,
                            name: true,
                            surname: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: {
                    sequenceNumber: 'asc',
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
            startDate: true,
            endDate: true,
            appointmentMethod: true,
            endReason: true,
            notes: true,
            priority: true,
            position: {
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
   */
  async create(data: CreatePersonData): Promise<Person> {
    return this.prisma.person.create({
      data,
    })
  }

  /**
   * 인물 수정
   */
  async update(id: string, data: UpdatePersonData): Promise<Person> {
    return this.prisma.person.update({
      where: { id },
      data,
    })
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
  async addMilitaryCareer(dto: CreateMilitaryCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.militaryCareer.create({
      data: {
        ...careerData,
        branch: careerData.branch || '육군', // default value if not provided
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
      include: {
        images: true,
        rank: true,
        organization: true
      }
    })
  }

  /**
   * 정치인/공무원 경력 추가
   */
  async addGovernmentCareer(dto: CreateGovernmentCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.governmentCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        position: true,
        organization: true,
        country: true
      }
    })
  }

  /**
   * 기업인 경력 추가
   */
  async addBusinessCareer(dto: CreateBusinessCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.businessCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 학자 경력 추가
   */
  async addAcademicCareer(dto: CreateAcademicCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.academicCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 운동선수 경력 추가
   */
  async addAthleteCareer(dto: CreateAthleteCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.athleteCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        job: true,
        organization: true
      }
    })
  }

  /**
   * 종교인 경력 추가
   */
  async addReligiousCareer(dto: CreateReligiousCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.religiousCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 예술가 경력 추가
   */
  async addArtistCareer(dto: CreateArtistCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.artistCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 언론인 경력 추가
   */
  async addMediaCareer(dto: CreateMediaCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.mediaCareer.create({
      data: {
        ...careerData,
        organizationId: careerData.organizationId || '', // default if not provided
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 법조인 경력 추가
   */
  async addLegalCareer(dto: CreateLegalCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.legalCareer.create({
      data: {
        ...careerData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 의료인 경력 추가
   */
  async addMedicalCareer(dto: CreateMedicalCareerDto) {
    const { images, ...careerData } = dto
    
    return this.prisma.medicalCareer.create({
      data: {
        ...careerData,
        organizationId: careerData.organizationId || '', // default if not provided
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      } as any,
      include: {
        images: true,
        position: true,
        organization: true
      }
    })
  }

  /**
   * 학력 추가
   */
  async addEducation(dto: CreateEducationDto) {
    const { images, ...educationData } = dto
    
    return this.prisma.personEducation.create({
      data: {
        ...educationData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true,
        organization: true
      }
    })
  }

  /**
   * 수상/훈장 추가
   */
  async addAward(dto: CreatePersonAwardDto) {
    const { images, ...awardData } = dto
    
    return this.prisma.personAward.create({
      data: {
        ...awardData,
        images: images && images.length > 0 ? {
          create: images
        } : undefined
      },
      include: {
        images: true
      }
    })
  }

  /**
   * 인물의 모든 경력 조회
   */
  /**
   * 인물의 모든 경력 조회
   */
  async findAllCareers(personId: string): Promise<AllCareersResponse> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        militaryCareers: {
          include: {
            images: true,
            rank: true,
            organization: true
          }
        },
        governmentCareers: {
          include: {
            images: true,
            position: true,
            organization: true,
            country: true
          }
        },
        businessCareers: {
          include: {
            images: true,
            position: true,
            organization: true
          }
        },
        academicCareers: {
          include: {
            images: true,
            position: true,
            organization: true
          }
        },
        religiousCareers: {
          include: {
            images: true,
            position: true,
            organization: true,
            religion: true,
            denomination: true
          }
        },
        artistCareers: {
          include: {
            images: true,
            position: true,
            organization: true
          }
        },
        athleteCareers: {
          include: {
            images: true,
            job: true,
            organization: true
          }
        },
        mediaCareers: {
          include: {
            images: true,
            position: true,
            organization: true
          }
        },
        legalCareers: {
          include: {
            images: true,
            position: true,
            organization: true
          }
        },
        medicalCareers: {
          include: {
            images: true,
            position: true,
            organization: true
          }
        },
        educations: {
          include: {
            images: true,
            organization: true
          }
        },
        awards: {
          include: {
            images: true
          }
        }
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
      military: person.militaryCareers,
      government: person.governmentCareers,
      business: person.businessCareers,
      academic: person.academicCareers,
      athlete: person.athleteCareers,
      religious: person.religiousCareers,
      artist: person.artistCareers,
      media: person.mediaCareers,
      legal: person.legalCareers,
      medical: person.medicalCareers,
      education: person.educations,
      awards: person.awards
    }
  }
}
