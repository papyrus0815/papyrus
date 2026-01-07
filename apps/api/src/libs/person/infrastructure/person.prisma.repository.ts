import { Injectable } from '@nestjs/common'
import { Person } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import {
  IPersonRepository,
  CreatePersonData,
  UpdatePersonData,
} from '../domain/person.repository'

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
}
