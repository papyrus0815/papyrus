import { ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { Country } from '../domain/country.entity'
import {
  CountryRepository,
  HistoricalCountrySimple,
} from '../domain/country.repository'
import { classifyLinkedHistorical } from '../domain/linked-historical-classify'

@Injectable()
export class CountryPrismaRepository implements CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId?: string): Promise<Country[]> {
    const countries = await this.prisma.country.findMany({
      where: accountId != null ? { accountId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        historicalConnections: {
          include: {
            historicalCountry: true,
          },
        },
      },
    })
    return countries.map((country) => this.toEntity(country))
  }

  async findById(id: string, accountId?: string): Promise<Country | null> {
    const country =
      accountId != null
        ? await this.prisma.country.findFirst({
            where: { id, accountId },
            include: {
              historicalConnections: {
                include: {
                  historicalCountry: true,
                },
              },
            },
          })
        : await this.prisma.country.findUnique({
            where: { id },
            include: {
              historicalConnections: {
                include: {
                  historicalCountry: true,
                },
              },
            },
          })
    const entity = country ? this.toEntity(country) : null
    if (entity?.historicalCountries) {
      await this.attachLinkKinds(entity.historicalCountries)
    }
    return entity
  }

  /**
   * 연결된 역사국가에 표시용 관계 분류(linkKind)를 파생·부착한다.
   * 상세 조회 및 연결 역사국가 목록 경로에서 호출 — 목록(findAll)은 무변경(추가 쿼리 회피).
   * ⚠️ 브리지 행 집합·스코프 합산과 무관한 표시 전용 파생이다.
   */
  private async attachLinkKinds(items: HistoricalCountrySimple[]): Promise<void> {
    if (!items || items.length === 0) return
    const ids = items.map((item) => item.id)
    const [transitions, memberships] = await Promise.all([
      this.prisma.historicalCountryTransition.findMany({
        where: { predecessorId: { in: ids }, successorId: { in: ids } },
        select: { predecessorId: true, successorId: true },
      }),
      this.prisma.historicalCountryMembership.findMany({
        where: { memberCountryId: { in: ids } },
        select: {
          historicalCountryId: true,
          memberCountryId: true,
          isLeadingMember: true,
        },
      }),
    ])
    const toSigned = (
      era: string | null,
      year: number | null,
    ): number | null => {
      if (year == null) return null
      return era === 'BC' ? -Math.abs(year) : Math.abs(year)
    }
    const { kindById } = classifyLinkedHistorical({
      nodes: items.map((item) => ({
        id: item.id,
        startYear: toSigned(item.startEra, item.startYear),
        endYear: toSigned(item.endEra, item.endYear),
      })),
      transitions,
      memberships,
    })
    for (const item of items) item.linkKind = kindById.get(item.id) ?? null
  }

  async findByName(name: string, accountId?: string): Promise<Country | null> {
    const country =
      accountId != null
        ? await this.prisma.country.findFirst({
            where: { name, accountId },
          })
        : await this.prisma.country.findUnique({
            where: { name },
          })
    return country ? this.toEntity(country) : null
  }

  async findHistoricalCountriesByModernCountryId(
    countryId: string,
  ): Promise<HistoricalCountrySimple[]> {
    const connections =
      await this.prisma.historicalCountryModernCountry.findMany({
        where: {
          modernCountryId: countryId,
        },
        include: {
          historicalCountry: true,
        },
      })

    const items: HistoricalCountrySimple[] = connections
      .map((conn) => ({
        id: conn.historicalCountry.id,
        name: conn.historicalCountry.name,
        enName: conn.historicalCountry.enName,
        thumbnailUrl: conn.historicalCountry.thumbnailUrl,
        stateType: conn.historicalCountry.stateType,
        startEra: conn.historicalCountry.startEra,
        startYear: conn.historicalCountry.startYear,
        startMonth: conn.historicalCountry.startMonth,
        startDay: conn.historicalCountry.startDay,
        endEra: conn.historicalCountry.endEra,
        endYear: conn.historicalCountry.endYear,
        endMonth: conn.historicalCountry.endMonth,
        endDay: conn.historicalCountry.endDay,
        latitude:
          conn.historicalCountry.latitude != null
            ? Number(conn.historicalCountry.latitude)
            : null,
        longitude:
          conn.historicalCountry.longitude != null
            ? Number(conn.historicalCountry.longitude)
            : null,
      }))
      .sort((a, b) => {
        // 시작일이 최근일수록 위로 (BC는 아래, AD는 최근 연도가 위).
        // BC는 음수, AD는 양수로 환산해 비교.
        const toNum = (era: string | null, year: number | null) => {
          if (year == null) return Number.NEGATIVE_INFINITY
          return era === 'BC' ? -year : year
        }
        const av = toNum(a.startEra, a.startYear)
        const bv = toNum(b.startEra, b.startYear)
        if (av !== bv) return bv - av
        // 동률이면 월·일도 내림차순
        return (
          (b.startMonth ?? 0) - (a.startMonth ?? 0) ||
          (b.startDay ?? 0) - (a.startDay ?? 0)
        )
      })
    await this.attachLinkKinds(items)
    return items
  }

  async create(data: Omit<Country, 'id'>): Promise<Country> {
    const country = await this.prisma.country.create({
      data: {
        name: data.name,
        fullName: data.fullName,
        localName: data.localName,
        flagEmoji: data.flagEmoji,
        isoCode: data.isoCode,
        population: data.population,
        areaSqKm: data.areaSqKm,
        thumbnailUrl: data.thumbnailUrl,
        capital: data.capital,
        latitude: data.latitude,
        longitude: data.longitude,
        currencyId: data.currencyId,
        languageId: data.languageId,
        continentId: data.continentId,
        defaultNameDisplayOrder: data.defaultNameDisplayOrder ?? undefined,
        accountId: (data as any).accountId ?? undefined,
      },
    })
    return this.toEntity(country)
  }

  async update(
    id: string,
    data: Partial<Omit<Country, 'id'>>,
  ): Promise<Country> {
    // Prisma는 undefined를 무시하지만, 명시적으로 넘기면 버전/직렬화에 따라 섞일 수 있어
    // PATCH 의미로 `전달된 필드만` 갱신한다.
    const country = await this.prisma.country.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.localName !== undefined && { localName: data.localName }),
        ...(data.flagEmoji !== undefined && { flagEmoji: data.flagEmoji }),
        ...(data.isoCode !== undefined && { isoCode: data.isoCode }),
        ...(data.population !== undefined && { population: data.population }),
        ...(data.areaSqKm !== undefined && { areaSqKm: data.areaSqKm }),
        ...(data.thumbnailUrl !== undefined && {
          thumbnailUrl: data.thumbnailUrl,
        }),
        ...(data.capital !== undefined && { capital: data.capital }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.currencyId !== undefined && { currencyId: data.currencyId }),
        ...(data.languageId !== undefined && { languageId: data.languageId }),
        ...(data.continentId !== undefined && {
          continentId: data.continentId,
        }),
        ...(data.defaultNameDisplayOrder !== undefined && {
          defaultNameDisplayOrder: data.defaultNameDisplayOrder,
        }),
      },
    })
    return this.toEntity(country)
  }

  async delete(id: string): Promise<void> {
    const directScopeWhere = { countryId: id, historicalCountryId: null }
    const [
      tenureCount,
      deptCount,
      psCount,
      scopeCount,
      electionCount,
      partyCount,
      districtCount,
      lawCount,
      militaryUnitCount,
      orgCount,
      personGroupCount,
      glossaryCount,
    ] = await Promise.all([
      this.prisma.governmentPositionTenure.count({
        where: directScopeWhere,
      }),
      this.prisma.administrationDepartment.count({
        where: directScopeWhere,
      }),
      this.prisma.politicalSystem.count({
        where: directScopeWhere,
      }),
      this.prisma.governmentPositionDefinitionScope.count({
        where: directScopeWhere,
      }),
      this.prisma.election?.count
        ? this.prisma.election.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.politicalParty?.count
        ? this.prisma.politicalParty.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.electoralDistrict?.count
        ? this.prisma.electoralDistrict.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.law?.count
        ? this.prisma.law.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.militaryUnit?.count
        ? this.prisma.militaryUnit.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.organization?.count
        ? this.prisma.organization.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.personGroup?.count
        ? this.prisma.personGroup.count({ where: directScopeWhere })
        : Promise.resolve(0),
      this.prisma.glossaryTerm?.count
        ? this.prisma.glossaryTerm.count({ where: directScopeWhere })
        : Promise.resolve(0),
    ])
    const refs: string[] = []
    if (tenureCount > 0) refs.push(`공직 재임 ${tenureCount}건`)
    if (deptCount > 0) refs.push(`행정부처 ${deptCount}건`)
    if (psCount > 0) refs.push(`정체(정치체제) ${psCount}건`)
    if (scopeCount > 0) refs.push(`직위 스코프 ${scopeCount}건`)
    if (electionCount > 0) refs.push(`선거 ${electionCount}건`)
    if (partyCount > 0) refs.push(`정당 ${partyCount}건`)
    if (districtCount > 0) refs.push(`선거구 ${districtCount}건`)
    if (lawCount > 0) refs.push(`법령 ${lawCount}건`)
    if (militaryUnitCount > 0) refs.push(`군부대 ${militaryUnitCount}건`)
    if (orgCount > 0) refs.push(`조직 ${orgCount}건`)
    if (personGroupCount > 0) refs.push(`인물 묶음 ${personGroupCount}건`)
    if (glossaryCount > 0) refs.push(`용어집 ${glossaryCount}건`)
    if (refs.length > 0) {
      throw new ConflictException(
        `해당 현대 국가에 직접 귀속된 기록(${refs.join(', ')})이 존재하여 삭제할 수 없습니다. 관련 기록을 먼저 정리하거나 다른 국가로 이전해 주세요.`,
      )
    }

    await this.prisma.$transaction(async (tx) => {
      const affectedLinks = await tx.historicalCountryModernCountry.findMany({
        where: { modernCountryId: id },
        select: { historicalCountryId: true },
      })
      const affectedHistIds = [
        ...new Set(affectedLinks.map((l) => l.historicalCountryId).filter(Boolean)),
      ]

      // 역사적 국가 소속으로 dual-fill되어 있던 행들의 countryId를 먼저 분리하여
      // Country 삭제 시 onDelete: Cascade(PoliticalSystem, GovernmentPositionDefinitionScope)로
      // 역사적 국가 데이터까지 연쇄 삭제되는 사고를 방지한다.
      const dualFilledWhere = { countryId: id, historicalCountryId: { not: null } }
      await Promise.all([
        tx.governmentPositionTenure.updateMany({
          where: dualFilledWhere,
          data: { countryId: null },
        }),
        tx.administrationDepartment.updateMany({
          where: dualFilledWhere,
          data: { countryId: null },
        }),
        tx.politicalSystem.updateMany({
          where: dualFilledWhere,
          data: { countryId: null },
        }),
        tx.election?.updateMany
          ? tx.election.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.politicalParty?.updateMany
          ? tx.politicalParty.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.electoralDistrict?.updateMany
          ? tx.electoralDistrict.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.law?.updateMany
          ? tx.law.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.militaryUnit?.updateMany
          ? tx.militaryUnit.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.organization?.updateMany
          ? tx.organization.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.personGroup?.updateMany
          ? tx.personGroup.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
        tx.glossaryTerm?.updateMany
          ? tx.glossaryTerm.updateMany({
              where: dualFilledWhere,
              data: { countryId: null },
            })
          : Promise.resolve(),
      ])

      if (tx.governmentPositionDefinitionScope.findMany) {
        const dualScopes = await tx.governmentPositionDefinitionScope.findMany({
          where: dualFilledWhere,
          select: { id: true, definitionId: true, historicalCountryId: true },
        })
        for (const s of dualScopes) {
          const collision = await tx.governmentPositionDefinitionScope.findFirst({
            where: {
              definitionId: s.definitionId,
              countryId: null,
              historicalCountryId: s.historicalCountryId,
              id: { not: s.id },
            },
            select: { id: true },
          })
          if (collision) {
            await tx.governmentPositionDefinitionScope.delete({
              where: { id: s.id },
            })
          } else {
            await tx.governmentPositionDefinitionScope.update({
              where: { id: s.id },
              data: { countryId: null },
            })
          }
        }
      } else {
        await tx.governmentPositionDefinitionScope.updateMany({
          where: dualFilledWhere,
          data: { countryId: null },
        })
      }

      await tx.country.delete({
        where: { id },
      })

      // 삭제된 현대 국가와 함께 다중 현대국으로 묶여 있던 역사적 국가가 이제 단일 현대국(1:1)이 된 경우 dual-fill 재동기화
      for (const hcId of affectedHistIds) {
        const remaining = await tx.historicalCountryModernCountry.findMany({
          where: { historicalCountryId: hcId },
          select: { modernCountryId: true },
          take: 2,
        })
        if (remaining.length === 1 && remaining[0].modernCountryId) {
          const nextCountryId = remaining[0].modernCountryId
          const nullCountryWhere = { historicalCountryId: hcId, countryId: null }
          await Promise.all([
            tx.governmentPositionTenure.updateMany({
              where: nullCountryWhere,
              data: { countryId: nextCountryId },
            }),
            tx.administrationDepartment.updateMany({
              where: nullCountryWhere,
              data: { countryId: nextCountryId },
            }),
            tx.politicalSystem.updateMany({
              where: nullCountryWhere,
              data: { countryId: nextCountryId },
            }),
            tx.electoralDistrict?.updateMany
              ? tx.electoralDistrict.updateMany({
                  where: nullCountryWhere,
                  data: { countryId: nextCountryId },
                })
              : Promise.resolve(),
            tx.law?.updateMany
              ? tx.law.updateMany({
                  where: nullCountryWhere,
                  data: { countryId: nextCountryId },
                })
              : Promise.resolve(),
            tx.militaryUnit?.updateMany
              ? tx.militaryUnit.updateMany({
                  where: nullCountryWhere,
                  data: { countryId: nextCountryId },
                })
              : Promise.resolve(),
            tx.organization?.updateMany
              ? tx.organization.updateMany({
                  where: nullCountryWhere,
                  data: { countryId: nextCountryId },
                })
              : Promise.resolve(),
            tx.personGroup?.updateMany
              ? tx.personGroup.updateMany({
                  where: nullCountryWhere,
                  data: { countryId: nextCountryId },
                })
              : Promise.resolve(),
            tx.glossaryTerm?.updateMany
              ? tx.glossaryTerm.updateMany({
                  where: nullCountryWhere,
                  data: { countryId: nextCountryId },
                })
              : Promise.resolve(),
          ])
          if (tx.governmentPositionDefinitionScope.findMany) {
            const scopes = await tx.governmentPositionDefinitionScope.findMany({
              where: nullCountryWhere,
              select: { id: true, definitionId: true },
            })
            for (const s of scopes) {
              const collision = await tx.governmentPositionDefinitionScope.findFirst({
                where: {
                  definitionId: s.definitionId,
                  countryId: nextCountryId,
                  historicalCountryId: hcId,
                  id: { not: s.id },
                },
                select: { id: true },
              })
              if (collision) {
                await tx.governmentPositionDefinitionScope.delete({
                  where: { id: s.id },
                })
              } else {
                await tx.governmentPositionDefinitionScope.update({
                  where: { id: s.id },
                  data: { countryId: nextCountryId },
                })
              }
            }
          } else {
            await tx.governmentPositionDefinitionScope.updateMany({
              where: nullCountryWhere,
              data: { countryId: nextCountryId },
            })
          }
        }
      }
    })
  }

  private toEntity(data: any): Country {
    const historicalCountries = data.historicalConnections
      ?.map((conn: any) => ({
        id: conn.historicalCountry.id,
        name: conn.historicalCountry.name,
        enName: conn.historicalCountry.enName,
        thumbnailUrl: conn.historicalCountry.thumbnailUrl,
        stateType: conn.historicalCountry.stateType,
        startEra: conn.historicalCountry.startEra,
        startYear: conn.historicalCountry.startYear,
        startMonth: conn.historicalCountry.startMonth,
        startDay: conn.historicalCountry.startDay,
        endEra: conn.historicalCountry.endEra,
        endYear: conn.historicalCountry.endYear,
        endMonth: conn.historicalCountry.endMonth,
        endDay: conn.historicalCountry.endDay,
        latitude:
          conn.historicalCountry.latitude != null
            ? Number(conn.historicalCountry.latitude)
            : null,
        longitude:
          conn.historicalCountry.longitude != null
            ? Number(conn.historicalCountry.longitude)
            : null,
      }))
      .sort((a: any, b: any) => {
        // 시작일이 최근일수록 위로 (BC는 음수, AD는 양수로 환산해 비교)
        const toNum = (era: string | null, year: number | null) => {
          if (year == null) return Number.NEGATIVE_INFINITY
          return era === 'BC' ? -year : year
        }
        const av = toNum(a.startEra, a.startYear)
        const bv = toNum(b.startEra, b.startYear)
        if (av !== bv) return bv - av
        return (
          (b.startMonth ?? 0) - (a.startMonth ?? 0) ||
          (b.startDay ?? 0) - (a.startDay ?? 0)
        )
      })

    return new Country({
      id: data.id,
      name: data.name,
      fullName: data.fullName,
      localName: data.localName,
      flagEmoji: data.flagEmoji,
      isoCode: data.isoCode,
      population: data.population,
      areaSqKm: data.areaSqKm != null ? Number(data.areaSqKm) : null,
      thumbnailUrl: data.thumbnailUrl,
      capital: data.capital,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      currencyId: data.currencyId,
      languageId: data.languageId,
      continentId: data.continentId,
      defaultNameDisplayOrder: data.defaultNameDisplayOrder ?? null,
      historicalCountries: historicalCountries || [],
      accountId: data.accountId ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
