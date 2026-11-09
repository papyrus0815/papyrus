import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { TransitionEventType, TransitionScope } from '@prisma/client'
import {
  IHistoricalCountryRepository,
  CreateHistoricalCountryData,
  UpdateHistoricalCountryData,
  HistoricalCountryListFilter,
} from '../domain/historical-country.repository'
import { HistoricalCountry } from '../domain/historical-country.entity'
import { computeTransitionSuccessorDiff } from '../domain/transition-diff.util'
import {
  structuredDateEndKey,
  structuredDateKey,
} from '../../person/domain/structured-date.util'

@Injectable()
export class HistoricalCountryPrismaRepository
  implements IHistoricalCountryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private assertValidPeriod(
    start: {
      era?: string | null
      year?: number | null
      month?: number | null
      day?: number | null
    },
    end: {
      era?: string | null
      year?: number | null
      month?: number | null
      day?: number | null
    },
  ): void {
    const startKey = structuredDateKey(
      start.era,
      start.year,
      start.month,
      start.day,
    )
    const endKey = structuredDateEndKey(
      end.era ?? start.era,
      end.year,
      end.month,
      end.day,
    )
    if (startKey != null && endKey != null && startKey > endKey) {
      throw new BadRequestException(
        '소멸(종료) 시점이 건국(시작) 시점보다 앞설 수 없습니다.',
      )
    }
  }

  private async assertNoTransitionCycle(
    predecessorId: string,
    successorIds: ReadonlyArray<string>,
  ): Promise<void> {
    const uniqueTargets = [...new Set(successorIds.filter(Boolean))]
    if (uniqueTargets.length === 0) return
    if (uniqueTargets.includes(predecessorId)) {
      throw new BadRequestException(
        '자기 자신을 상위(후임) 역사적 국가로 지정할 수 없습니다.',
      )
    }
    const queue = [...uniqueTargets]
    const visited = new Set<string>()
    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === predecessorId) {
        throw new BadRequestException(
          '계승(전임·후임) 관계가 순환(Cycle)합니다. 계승 방향을 확인해 주세요.',
        )
      }
      if (visited.has(current)) continue
      visited.add(current)
      const nextRows = await this.prisma.historicalCountryTransition.findMany({
        where: { predecessorId: current },
        select: { successorId: true },
      })
      for (const row of nextRows) {
        if (!visited.has(row.successorId)) {
          queue.push(row.successorId)
        }
      }
    }
  }

  async findAll(
    accountId?: string,
    filter?: HistoricalCountryListFilter,
  ): Promise<HistoricalCountry[]> {
    const where: any = accountId != null ? { accountId } : {}
    if (filter?.entityKind !== undefined && filter?.entityKind !== null) {
      where.entityKind = filter.entityKind
    } else if (filter?.entityKind === null) {
      where.entityKind = null
    }
    if (filter?.stateType !== undefined && filter?.stateType !== null) {
      where.stateType = filter.stateType
    }
    const countries = await this.prisma.historicalCountry.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        modernConnections: { select: { modernCountryId: true } },
      },
    })

    // 기원전(BC) 연도는 양수 크기값으로 저장되므로 DB 단순 startYear DESC 정렬 시
    // BC 2333(고조선)이 AD 1948보다 앞에 오고 기원전 내부 순서도 역전된다.
    // 부호 있는 연대 키(startEra 반영) 기준으로 최신 시작 시점이 먼저 오도록 정렬한다.
    countries.sort((a, b) => {
      const keyA = structuredDateKey(a.startEra, a.startYear, a.startMonth, a.startDay)
      const keyB = structuredDateKey(b.startEra, b.startYear, b.startMonth, b.startDay)
      if (keyA == null && keyB == null) {
        return (a.name ?? '').localeCompare(b.name ?? '', 'ko')
      }
      if (keyA == null) return 1
      if (keyB == null) return -1
      if (keyA !== keyB) return keyB - keyA
      return (a.name ?? '').localeCompare(b.name ?? '', 'ko')
    })

    return countries.map((country) => this.toEntity(country as any))
  }

  async findById(id: string, accountId?: string): Promise<HistoricalCountry | null> {
    const country =
      accountId != null
        ? await this.prisma.historicalCountry.findFirst({
            where: { id, accountId },
          })
        : await this.prisma.historicalCountry.findUnique({
            where: { id },
          })

    return country ? this.toEntity(country as any) : null
  }

  async findManyByIdsWithAccount(
    ids: string[],
    accountId: string,
  ): Promise<HistoricalCountry[]> {
    if (ids.length === 0) return []
    const countries = await this.prisma.historicalCountry.findMany({
      where: { id: { in: ids }, accountId },
    })
    return countries.map((c) => this.toEntity(c as any))
  }

  async findModernCountryIdsByHistoricalCountryId(
    id: string,
  ): Promise<string[]> {
    const rows =
      await this.prisma.historicalCountryModernCountry.findMany({
        where: { historicalCountryId: id },
        select: { modernCountryId: true },
      })
    return rows.map((r) => r.modernCountryId)
  }

  /** 이 국가(전임)의 후임 국가 ID 목록. Transition에서만 조회 (Membership은 소속·구성 전용) */
  async findParentHistoricalCountryIdsByMemberId(
    memberCountryId: string,
  ): Promise<string[]> {
    const rows =
      await this.prisma.historicalCountryTransition.findMany({
        where: { predecessorId: memberCountryId },
        select: { successorId: true },
      })
    return rows.map((r) => r.successorId)
  }

  async findTransitionEventTypeByPredecessorId(
    predecessorId: string,
  ): Promise<TransitionEventType | null> {
    const row =
      await this.prisma.historicalCountryTransition.findFirst({
        where: { predecessorId },
        select: { eventType: true },
      })
    return row?.eventType ?? null
  }

  async findTransitionMetaByPredecessorId(
    predecessorId: string,
  ): Promise<{ eventType: TransitionEventType; transitionScope: TransitionScope | null } | null> {
    const row =
      await this.prisma.historicalCountryTransition.findFirst({
        where: { predecessorId },
        select: { eventType: true, transitionScope: true },
      })
    if (!row) return null
    return {
      eventType: row.eventType,
      transitionScope: row.transitionScope ?? null,
    }
  }

  async create(data: CreateHistoricalCountryData): Promise<HistoricalCountry> {
    this.assertValidPeriod(
      {
        era: data.startEra,
        year: data.startYear,
        month: data.startMonth,
        day: data.startDay,
      },
      {
        era: data.endEra,
        year: data.endYear,
        month: data.endMonth,
        day: data.endDay,
      },
    )

    const country = await this.prisma.historicalCountry.create({
      data: {
        name: data.name,
        enName: data.enName,
        nameOrigin: data.nameOrigin,
        description: data.description,
        history: data.history,
        foundingNote: data.foundingNote,
        dissolutionNote: data.dissolutionNote,
        thumbnailUrl: data.thumbnailUrl,
        startEra: data.startEra,
        startYear: data.startYear,
        startMonth: data.startMonth,
        startDay: data.startDay,
        endEra: data.endEra,
        endYear: data.endYear,
        endMonth: data.endMonth,
        endDay: data.endDay,
        stateType: data.stateType,
        entityKind: data.entityKind ?? undefined,
        accountId: data.accountId ?? undefined,
        // 현대 국가 연결 생성 (다대다)
        modernConnections: data.parentModernCountryIds
          ? {
              create: [...new Set(data.parentModernCountryIds.filter(Boolean))].map(
                (modernCountryId) => ({
                  modernCountryId,
                }),
              ),
            }
          : undefined,
      },
    })

    // 상위 역사적 국가 = 후임. Transition만 생성 (Membership은 소속·구성 탭 전용)
    if (
      data.parentHistoricalCountryIds &&
      data.parentHistoricalCountryIds.length > 0 &&
      data.transitionEventType
    ) {
      await this.assertNoTransitionCycle(country.id, data.parentHistoricalCountryIds)
      await this.prisma.historicalCountryTransition.createMany({
        data: [...new Set(data.parentHistoricalCountryIds.filter(Boolean))].map(
          (successorId) => ({
            predecessorId: country.id,
            successorId,
            eventType: data.transitionEventType!,
            transitionScope: data.transitionScope ?? undefined,
          }),
        ),
      })
    }

    return this.toEntity(country as any)
  }

  async update(
    id: string,
    data: UpdateHistoricalCountryData,
  ): Promise<HistoricalCountry> {
    const existing = await this.prisma.historicalCountry.findUnique({
      where: { id },
      select: {
        startEra: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endEra: true,
        endYear: true,
        endMonth: true,
        endDay: true,
      },
    })
    if (existing) {
      this.assertValidPeriod(
        {
          era: data.startEra !== undefined ? data.startEra : existing.startEra,
          year: data.startYear !== undefined ? data.startYear : existing.startYear,
          month: data.startMonth !== undefined ? data.startMonth : existing.startMonth,
          day: data.startDay !== undefined ? data.startDay : existing.startDay,
        },
        {
          era: data.endEra !== undefined ? data.endEra : existing.endEra,
          year: data.endYear !== undefined ? data.endYear : existing.endYear,
          month: data.endMonth !== undefined ? data.endMonth : existing.endMonth,
          day: data.endDay !== undefined ? data.endDay : existing.endDay,
        },
      )
    }

    if (data.parentHistoricalCountryIds !== undefined) {
      await this.assertNoTransitionCycle(id, data.parentHistoricalCountryIds)
    }

    // 현대 국가 연결 업데이트가 필요한 경우 기존 연결 삭제 후 새로 생성 + 하위 엔티티 dual-fill countryId 동기화
    if (data.parentModernCountryIds !== undefined) {
      const nextModernIds = [
        ...new Set((data.parentModernCountryIds ?? []).filter(Boolean)),
      ]
      await this.prisma.$transaction(async (tx) => {
        const prevLinks = await tx.historicalCountryModernCountry.findMany({
          where: { historicalCountryId: id },
          select: { modernCountryId: true },
        })
        const prevModernIds = prevLinks.map((r) => r.modernCountryId)

        // 1. 기존 연결 모두 삭제
        await tx.historicalCountryModernCountry.deleteMany({
          where: { historicalCountryId: id },
        })

        // 2. 새 연결 생성
        if (nextModernIds.length > 0) {
          await tx.historicalCountryModernCountry.createMany({
            data: nextModernIds.map((modernCountryId) => ({
              historicalCountryId: id,
              modernCountryId,
            })),
          })
        }

        // 3. 하위 엔티티(부처, 재임, 정치체제, 직위 정의 스코프)의 dual-fill countryId 동기화
        if (nextModernIds.length === 1) {
          const targetCountryId = nextModernIds[0]
          const countryFilter =
            prevModernIds.length > 0
              ? { OR: [{ countryId: null }, { countryId: { in: prevModernIds } }] }
              : { countryId: null }

          await Promise.all([
            tx.administrationDepartment.updateMany({
              where: { historicalCountryId: id, ...countryFilter },
              data: { countryId: targetCountryId },
            }),
            tx.governmentPositionTenure.updateMany({
              where: { historicalCountryId: id, ...countryFilter },
              data: { countryId: targetCountryId },
            }),
            tx.politicalSystem.updateMany({
              where: { historicalCountryId: id, ...countryFilter },
              data: { countryId: targetCountryId },
            }),
          ])

          // GovernmentPositionDefinitionScope는 (definitionId, countryId, historicalCountryId) unique 제약이 있으므로 안전하게 동기화
          const scopes = await tx.governmentPositionDefinitionScope.findMany({
            where: { historicalCountryId: id, ...countryFilter },
            select: { id: true, definitionId: true, countryId: true },
          })
          for (const s of scopes) {
            if (s.countryId === targetCountryId) continue
            const collision = await tx.governmentPositionDefinitionScope.findFirst({
              where: {
                definitionId: s.definitionId,
                countryId: targetCountryId,
                historicalCountryId: id,
                id: { not: s.id },
              },
              select: { id: true },
            })
            if (collision) {
              await tx.governmentPositionDefinitionScope.delete({ where: { id: s.id } })
            } else {
              await tx.governmentPositionDefinitionScope.update({
                where: { id: s.id },
                data: { countryId: targetCountryId },
              })
            }
          }
        } else {
          // 현대 국가 연결이 0개이거나 2개 이상(다중 계승)이 된 경우:
          // 더 이상 브리지에 없는 countryId 또는 단일 브리지 시절 자동 채워졌던 countryId를 null로 정리
          const staleCountryWhere =
            nextModernIds.length === 0
              ? { countryId: { not: null } }
              : prevModernIds.length === 1
                ? {
                    OR: [
                      { countryId: prevModernIds[0] },
                      {
                        countryId: {
                          not: null,
                          notIn: nextModernIds,
                        },
                      },
                    ],
                  }
                : {
                    countryId: {
                      not: null,
                      notIn: nextModernIds,
                    },
                  }

          await Promise.all([
            tx.administrationDepartment.updateMany({
              where: { historicalCountryId: id, ...staleCountryWhere },
              data: { countryId: null },
            }),
            tx.governmentPositionTenure.updateMany({
              where: { historicalCountryId: id, ...staleCountryWhere },
              data: { countryId: null },
            }),
            tx.politicalSystem.updateMany({
              where: { historicalCountryId: id, ...staleCountryWhere },
              data: { countryId: null },
            }),
          ])

          const staleScopes = await tx.governmentPositionDefinitionScope.findMany({
            where: { historicalCountryId: id, ...staleCountryWhere },
            select: { id: true, definitionId: true },
          })
          for (const s of staleScopes) {
            const collision = await tx.governmentPositionDefinitionScope.findFirst({
              where: {
                definitionId: s.definitionId,
                countryId: null,
                historicalCountryId: id,
                id: { not: s.id },
              },
              select: { id: true },
            })
            if (collision) {
              await tx.governmentPositionDefinitionScope.delete({ where: { id: s.id } })
            } else {
              await tx.governmentPositionDefinitionScope.update({
                where: { id: s.id },
                data: { countryId: null },
              })
            }
          }
        }
      })
    }

    // 상위(후임) Transition을 diff 기반으로 반영 (F11) — Membership은 소속·구성 탭 전용.
    // 과거에는 predecessor=자신인 transition을 전량 deleteMany 후 폼의 단일 대표값으로
    // 재생성했다. 그러면 계승 탭에서 후임별로 개별 저작한 eventType·transitionScope가
    // 이름 하나 고쳐 저장하는 것만으로 대표값으로 평탄화되고 id도 재발급됐다.
    // 후임 집합의 추가/삭제분만 반영해 남는 행은 그대로 보존한다.
    if (data.parentHistoricalCountryIds !== undefined) {
      const existingTransitions =
        await this.prisma.historicalCountryTransition.findMany({
          where: { predecessorId: id },
          select: { id: true, successorId: true },
        })
      const { transitionIdsToDelete, successorIdsToAdd } =
        computeTransitionSuccessorDiff(
          existingTransitions,
          data.parentHistoricalCountryIds,
        )

      // 더 이상 후임이 아닌 행만 삭제 (남는 행의 eventType/scope는 건드리지 않음)
      if (transitionIdsToDelete.length > 0) {
        await this.prisma.historicalCountryTransition.deleteMany({
          where: { id: { in: transitionIdsToDelete } },
        })
      }

      // 새로 추가된 후임만 생성 (eventType/scope는 폼이 보낸 대표값 사용)
      if (successorIdsToAdd.length > 0 && data.transitionEventType) {
        await this.prisma.historicalCountryTransition.createMany({
          data: successorIdsToAdd.map((successorId) => ({
            predecessorId: id,
            successorId,
            eventType: data.transitionEventType!,
            transitionScope: data.transitionScope ?? undefined,
          })),
        })
      }
    }

    // 국가 정보 업데이트
    const country = await this.prisma.historicalCountry.update({
      where: { id },
      data: {
        name: data.name,
        enName: data.enName,
        nameOrigin: data.nameOrigin,
        description: data.description,
        history: data.history,
        foundingNote: data.foundingNote,
        dissolutionNote: data.dissolutionNote,
        thumbnailUrl: data.thumbnailUrl,
        startEra: data.startEra,
        startYear: data.startYear,
        startMonth: data.startMonth,
        startDay: data.startDay,
        endEra: data.endEra,
        endYear: data.endYear,
        endMonth: data.endMonth,
        endDay: data.endDay,
        stateType: data.stateType,
        ...(data.entityKind !== undefined && { entityKind: data.entityKind }),
      },
    })

    return this.toEntity(country as any)
  }

  async delete(id: string): Promise<void> {
    const [tenureCount, deptCount, psCount, scopeCount] = await Promise.all([
      this.prisma.governmentPositionTenure.count({
        where: { historicalCountryId: id },
      }),
      this.prisma.administrationDepartment.count({
        where: { historicalCountryId: id },
      }),
      this.prisma.politicalSystem.count({
        where: { historicalCountryId: id },
      }),
      this.prisma.governmentPositionDefinitionScope.count({
        where: { historicalCountryId: id },
      }),
    ])
    const refs: string[] = []
    if (tenureCount > 0) refs.push(`공직 재임 ${tenureCount}건`)
    if (deptCount > 0) refs.push(`행정부처 ${deptCount}건`)
    if (psCount > 0) refs.push(`정체(정치체제) ${psCount}건`)
    if (scopeCount > 0) refs.push(`직위 스코프 ${scopeCount}건`)
    if (refs.length > 0) {
      throw new ConflictException(
        `해당 역사적 국가에 귀속된 기록(${refs.join(', ')})이 존재하여 삭제할 수 없습니다. 관련 기록을 먼저 정리하거나 다른 국가로 이전해 주세요.`,
      )
    }

    await this.prisma.historicalCountry.delete({
      where: { id },
    })
  }

  private toEntity(data: any): HistoricalCountry {
    return new HistoricalCountry({
      id: data.id,
      name: data.name,
      enName: data.enName,
      nameOrigin: data.nameOrigin,
      description: data.description,
      history: data.history,
      foundingNote: data.foundingNote,
      dissolutionNote: data.dissolutionNote,
      thumbnailUrl: data.thumbnailUrl,
      startEra: data.startEra,
      startYear: data.startYear,
      startMonth: data.startMonth,
      startDay: data.startDay,
      endEra: data.endEra,
      endYear: data.endYear,
      endMonth: data.endMonth,
      endDay: data.endDay,
      stateType: data.stateType,
      entityKind: data.entityKind ?? null,
      // Prisma Decimal → number (지도 핀 좌표라 소수 7자리 정밀도 손실은 무의미)
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      parentModernCountryIds: data.modernConnections
        ? (data.modernConnections as Array<{ modernCountryId: string }>).map((c) => c.modernCountryId)
        : undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
