import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PrismaService } from '@prisma/prisma.service'
import type { Era, Prisma } from '@prisma/client'
import {
  mapStructuredDateInput,
  structuredDateEndKey,
  structuredDateKey,
  toSignedDateString,
} from '../../../person/domain/structured-date.util'
import type {
  CreateMilitaryUnitDto,
  CreateMilitaryUnitTransitionDto,
  MilitaryUnitCommanderInput,
  MilitaryUnitDateInput,
  MilitaryUnitDatePartsDto,
  MilitaryUnitEventLinkDto,
  MilitaryUnitLineageDto,
  MilitaryUnitTransitionKind,
  MilitaryUnitType,
  UpdateMilitaryUnitDto,
  UpdateMilitaryUnitTransitionDto,
} from '../presentation/dto'

function parseOptionalUnitDate(
  value: string | null | undefined,
  label: string,
): Date | null {
  if (value == null || value === '') return null
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException(`유효하지 않은 ${label} 날짜입니다.`)
  }
  return parsedDate
}

function unitDateColumns(
  info: MilitaryUnitDateInput | null | undefined,
  legacyIso: string | null | undefined,
  label: string,
) {
  if (info && info.year != null) {
    const mapped = mapStructuredDateInput(
      {
        era: info.era ?? 'AD',
        year: info.year,
        month: info.month ?? undefined,
        day: info.day ?? undefined,
      },
      legacyIso ?? null,
    )
    return {
      era: mapped.era as Era | null,
      year: mapped.year,
      month: mapped.month,
      day: mapped.day,
      precision: mapped.precision,
      date: mapped.date,
    }
  }
  if (legacyIso != null && legacyIso !== '') {
    parseOptionalUnitDate(legacyIso, label)
  }
  const mapped = mapStructuredDateInput(null, legacyIso ?? null)
  return {
    era: mapped.era as Era | null,
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    precision: mapped.precision,
    date: mapped.date,
  }
}

function toUnitDateParts(
  era: Era | string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  precision: string | null | undefined,
): MilitaryUnitDatePartsDto | null {
  if (year == null) return null
  return {
    era: (era ?? 'AD') as 'BC' | 'AD',
    year,
    month: month ?? null,
    day: day ?? null,
    precision: precision ?? null,
  }
}

function transitionSortKey(transition: {
  era: Era | string | null
  year: number | null
  month: number | null
}): number {
  return (
    structuredDateKey(transition.era, transition.year, transition.month, 1) ??
    Number.POSITIVE_INFINITY
  )
}

const TENURE_PERSON_SELECT = {
  id: true,
  name: true,
  surname: true,
  middleName: true,
  nameDisplayOrder: true,
  birthEra: true,
  deathEra: true,
  birthDate: true,
  deathDate: true,
  country: {
    select: {
      id: true,
      name: true,
      flagEmoji: true,
      isoCode: true,
      defaultNameDisplayOrder: true,
    },
  },
} as const

@Injectable()
export class MilitaryUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCountryAxis(
    countryId?: string | null,
    historicalCountryId?: string | null,
  ): Promise<{ countryId: string | null; historicalCountryId: string | null }> {
    let resolvedCountryId =
      countryId && countryId.trim() !== '' ? countryId.trim() : null
    const resolvedHistoricalId =
      historicalCountryId && historicalCountryId.trim() !== ''
        ? historicalCountryId.trim()
        : null

    if (resolvedCountryId && this.prisma.country?.findUnique) {
      const countryRow = await this.prisma.country.findUnique({
        where: { id: resolvedCountryId },
        select: { id: true },
      })
      if (!countryRow) {
        throw new NotFoundException('소속 국가(countryId)를 찾을 수 없습니다.')
      }
    }

    if (resolvedHistoricalId) {
      if (this.prisma.historicalCountry?.findUnique) {
        const historicalRow = await this.prisma.historicalCountry.findUnique({
          where: { id: resolvedHistoricalId },
          select: { id: true },
        })
        if (!historicalRow) {
          throw new NotFoundException(
            '소속 역사적 국가(historicalCountryId)를 찾을 수 없습니다.',
          )
        }
      }
      if (this.prisma.historicalCountryModernCountry?.findMany) {
        const links =
          await this.prisma.historicalCountryModernCountry.findMany({
            where: { historicalCountryId: resolvedHistoricalId },
            select: { modernCountryId: true },
          })
        const modernIds = [
          ...new Set(
            links
              .map((linkItem) => linkItem.modernCountryId)
              .filter(Boolean),
          ),
        ]
        if (
          resolvedCountryId &&
          modernIds.length > 0 &&
          !modernIds.includes(resolvedCountryId)
        ) {
          throw new BadRequestException(
            '선택한 역사적 국가가 지정한 현대 국가와 연결되어 있지 않습니다.',
          )
        }
        if (!resolvedCountryId && modernIds.length === 1) {
          resolvedCountryId = modernIds[0]
        }
      }
    }

    return {
      countryId: resolvedCountryId,
      historicalCountryId: resolvedHistoricalId,
    }
  }

  private async areAxesCompatible(
    firstAxis: { countryId: string | null; historicalCountryId: string | null },
    secondAxis: { countryId: string | null; historicalCountryId: string | null },
  ): Promise<boolean> {
    if (
      (!firstAxis.countryId && !firstAxis.historicalCountryId) ||
      (!secondAxis.countryId && !secondAxis.historicalCountryId)
    ) {
      return true
    }
    if (firstAxis.historicalCountryId && secondAxis.historicalCountryId) {
      return firstAxis.historicalCountryId === secondAxis.historicalCountryId
    }
    if (firstAxis.historicalCountryId || secondAxis.historicalCountryId) {
      const historicalId =
        firstAxis.historicalCountryId ?? secondAxis.historicalCountryId
      const modernId = firstAxis.historicalCountryId
        ? secondAxis.countryId
        : firstAxis.countryId
      if (!historicalId || !modernId) return false
      if (!this.prisma.historicalCountryModernCountry?.findFirst) {
        return firstAxis.countryId === secondAxis.countryId
      }
      const bridge =
        await this.prisma.historicalCountryModernCountry.findFirst({
          where: {
            historicalCountryId: historicalId,
            modernCountryId: modernId,
          },
          select: { historicalCountryId: true },
        })
      return Boolean(bridge)
    }
    if (
      firstAxis.countryId &&
      secondAxis.countryId &&
      firstAxis.countryId === secondAxis.countryId
    ) {
      return true
    }
    return false
  }

  private assertDateOrder(
    established: {
      era: Era | string | null
      year: number | null
      month: number | null
      day: number | null
      date: Date | null
    },
    disbanded: {
      era: Era | string | null
      year: number | null
      month: number | null
      day: number | null
      date: Date | null
    },
  ): void {
    const startKey = structuredDateKey(
      established.era,
      established.year,
      established.month,
      established.day,
    )
    const endKey = structuredDateEndKey(
      disbanded.era,
      disbanded.year,
      disbanded.month,
      disbanded.day,
    )
    if (startKey != null && endKey != null && startKey > endKey) {
      throw new BadRequestException(
        '부대 해체일이 창설일보다 앞설 수 없습니다.',
      )
    }
    if (
      startKey == null &&
      endKey == null &&
      established.date &&
      disbanded.date &&
      established.date.getTime() > disbanded.date.getTime()
    ) {
      throw new BadRequestException(
        '부대 해체일이 창설일보다 앞설 수 없습니다.',
      )
    }
  }

  private async validateUnitRelations(
    id: string | null,
    axis: { countryId: string | null; historicalCountryId: string | null },
    parentUnitId: string | null | undefined,
    administrationDepartmentId: string | null | undefined,
  ): Promise<void> {
    if (parentUnitId) {
      if (id && parentUnitId === id) {
        throw new BadRequestException(
          '자기 자신을 상위 부대로 지정할 수 없습니다.',
        )
      }
      if (this.prisma.militaryUnit?.findUnique) {
        const parentUnit = await this.prisma.militaryUnit.findUnique({
          where: { id: parentUnitId },
          select: {
            id: true,
            parentUnitId: true,
            countryId: true,
            historicalCountryId: true,
          },
        })
        if (!parentUnit) {
          throw new NotFoundException(
            '상위 부대(parentUnitId)를 찾을 수 없습니다.',
          )
        }
        const compat = await this.areAxesCompatible(axis, {
          countryId: parentUnit.countryId ?? null,
          historicalCountryId: parentUnit.historicalCountryId ?? null,
        })
        if (!compat) {
          throw new BadRequestException(
            '상위 부대의 소속 국가·시대와 부대의 소속 국가·시대가 일치하지 않습니다.',
          )
        }
        if (id) {
          let cursor = parentUnit.parentUnitId
          const seen = new Set<string>([parentUnitId])
          while (cursor) {
            if (cursor === id) {
              throw new BadRequestException('상위 부대 관계가 순환됩니다.')
            }
            if (seen.has(cursor)) break
            seen.add(cursor)
            const ancestor = await this.prisma.militaryUnit.findUnique({
              where: { id: cursor },
              select: { parentUnitId: true },
            })
            if (!ancestor) break
            cursor = ancestor.parentUnitId
          }
        }
      }
    }

    if (
      administrationDepartmentId &&
      this.prisma.administrationDepartment?.findUnique
    ) {
      const dept = await this.prisma.administrationDepartment.findUnique({
        where: { id: administrationDepartmentId },
        select: { id: true, countryId: true, historicalCountryId: true },
      })
      if (!dept) {
        throw new NotFoundException(
          '연결할 행정부처(administrationDepartmentId)를 찾을 수 없습니다.',
        )
      }
      const compat = await this.areAxesCompatible(axis, {
        countryId: dept.countryId ?? null,
        historicalCountryId: dept.historicalCountryId ?? null,
      })
      if (!compat) {
        throw new BadRequestException(
          '연결할 행정부처의 소속 국가·시대와 부대의 소속 국가·시대가 일치하지 않습니다.',
        )
      }
    }
  }

  private commanderRowsForUnit(
    unitId: string,
    commanders: MilitaryUnitCommanderInput[],
  ): Prisma.MilitaryUnitCommanderCreateManyInput[] {
    return commanders.map((commanderInput) => {
      const startDate = parseOptionalUnitDate(
        commanderInput.startDate ?? undefined,
        '지휘관 임기 시작일',
      )
      const endDate = parseOptionalUnitDate(
        commanderInput.endDate ?? undefined,
        '지휘관 임기 종료일',
      )
      if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        throw new BadRequestException(
          '지휘관 임기 종료일이 시작일보다 앞설 수 없습니다.',
        )
      }
      return {
        unitId,
        personId: commanderInput.personId,
        rank: commanderInput.rank ?? null,
        role: commanderInput.role ?? null,
        isCurrent: commanderInput.isCurrent ?? false,
        startDate,
        endDate,
        termNumber: commanderInput.termNumber ?? null,
      }
    })
  }

  private enrichUnitRecord(unitRecord: any) {
    const established = toUnitDateParts(
      unitRecord.establishedEra,
      unitRecord.establishedYear,
      unitRecord.establishedMonth,
      unitRecord.establishedDay,
      unitRecord.establishedPrecision,
    )
    const disbanded = toUnitDateParts(
      unitRecord.disbandedEra,
      unitRecord.disbandedYear,
      unitRecord.disbandedMonth,
      unitRecord.disbandedDay,
      unitRecord.disbandedPrecision,
    )
    const signedEstablished = toSignedDateString(
      unitRecord.establishedEra,
      unitRecord.establishedYear,
      unitRecord.establishedMonth,
      unitRecord.establishedDay,
    )
    const signedDisbanded = toSignedDateString(
      unitRecord.disbandedEra,
      unitRecord.disbandedYear,
      unitRecord.disbandedMonth,
      unitRecord.disbandedDay,
    )

    const predecessors: MilitaryUnitLineageDto[] = [
      ...(unitRecord.predecessorTransitions ?? []),
    ]
      .sort((left, right) => transitionSortKey(left) - transitionSortKey(right))
      .map((transition) => ({
        transitionId: transition.id,
        kind: transition.kind as MilitaryUnitTransitionKind,
        era: (transition.era as 'BC' | 'AD' | null) ?? null,
        year: transition.year ?? null,
        month: transition.month ?? null,
        note: transition.note ?? null,
        targetType: transition.predecessorDepartment
          ? ('DEPARTMENT' as const)
          : ('MILITARY_UNIT' as const),
        unit: transition.predecessorUnit
          ? {
              id: transition.predecessorUnit.id,
              name: transition.predecessorUnit.name,
              abbreviation: transition.predecessorUnit.abbreviation ?? null,
              unitType:
                (transition.predecessorUnit.unitType as MilitaryUnitType | null) ??
                null,
            }
          : null,
        department: transition.predecessorDepartment
          ? {
              id: transition.predecessorDepartment.id,
              name: transition.predecessorDepartment.name,
              abbreviation:
                transition.predecessorDepartment.abbreviation ?? null,
              kind: transition.predecessorDepartment.kind,
            }
          : null,
      }))

    const successors: MilitaryUnitLineageDto[] = [
      ...(unitRecord.successorTransitions ?? []),
    ]
      .sort((left, right) => transitionSortKey(left) - transitionSortKey(right))
      .map((transition) => ({
        transitionId: transition.id,
        kind: transition.kind as MilitaryUnitTransitionKind,
        era: (transition.era as 'BC' | 'AD' | null) ?? null,
        year: transition.year ?? null,
        month: transition.month ?? null,
        note: transition.note ?? null,
        targetType: 'MILITARY_UNIT' as const,
        unit: transition.successorUnit
          ? {
              id: transition.successorUnit.id,
              name: transition.successorUnit.name,
              abbreviation: transition.successorUnit.abbreviation ?? null,
              unitType:
                (transition.successorUnit.unitType as MilitaryUnitType | null) ??
                null,
            }
          : null,
        department: null,
      }))

    const mappedTenures = (unitRecord.tenures ?? []).map((tenureRow: any) => ({
      id: tenureRow.id,
      personId: tenureRow.personId,
      ordinal: tenureRow.ordinal ?? null,
      subTermNumber: tenureRow.subTermNumber ?? null,
      isMonarchical: Boolean(tenureRow.positionDefinition?.isMonarchical),
      startDate:
        toSignedDateString(
          tenureRow.startEra,
          tenureRow.startYear,
          tenureRow.startMonth,
          tenureRow.startDay,
        ) ??
        tenureRow.startDate?.toISOString() ??
        null,
      endDate:
        toSignedDateString(
          tenureRow.endEra,
          tenureRow.endYear,
          tenureRow.endMonth,
          tenureRow.endDay,
        ) ??
        tenureRow.endDate?.toISOString() ??
        null,
      startDatePrecision: tenureRow.startDatePrecision ?? null,
      startEra: tenureRow.startEra ?? null,
      startYear: tenureRow.startYear ?? null,
      startMonth: tenureRow.startMonth ?? null,
      startDay: tenureRow.startDay ?? null,
      endEra: tenureRow.endEra ?? null,
      endYear: tenureRow.endYear ?? null,
      endMonth: tenureRow.endMonth ?? null,
      endDay: tenureRow.endDay ?? null,
      title: tenureRow.title ?? tenureRow.positionDefinition?.title ?? null,
      rankTitle: tenureRow.rankTitle ?? null,
      partyId: tenureRow.partyId ?? null,
      party: tenureRow.party ?? null,
      militaryUnitId: tenureRow.militaryUnitId ?? unitRecord.id,
      positionDefinition: tenureRow.positionDefinition ?? null,
      person: tenureRow.person ?? null,
      country: tenureRow.country ?? null,
      historicalCountry: tenureRow.historicalCountry ?? null,
    }))

    /* 통합 재임(tenures)을 commanders 배열에도 병합해 기존 화면이 즉시 읽을 수 있게 보장 */
    const legacyCommanders = unitRecord.commanders ?? []
    const seenPersonKeys = new Set<string>()
    const mergedCommanders: any[] = []
    for (const tenureItem of mappedTenures) {
      const datePrefix = tenureItem.startDate
        ? String(tenureItem.startDate).slice(0, 10)
        : ''
      seenPersonKeys.add(`${tenureItem.personId}:${datePrefix}`)
      mergedCommanders.push({
        id: tenureItem.id,
        tenureId: tenureItem.id,
        personId: tenureItem.personId,
        rank: tenureItem.rankTitle ?? null,
        role: tenureItem.title ?? tenureItem.positionDefinition?.title ?? '지휘관',
        isCurrent: !tenureItem.endDate && !tenureItem.endYear,
        startDate: tenureItem.startDate,
        endDate: tenureItem.endDate,
        termNumber: tenureItem.ordinal ?? null,
        person: tenureItem.person
          ? {
              id: tenureItem.person.id,
              name: tenureItem.person.name,
              surname: tenureItem.person.surname ?? null,
            }
          : undefined,
      })
    }
    for (const legacyItem of legacyCommanders) {
      const legacyDateStr =
        legacyItem.startDate instanceof Date
          ? legacyItem.startDate.toISOString().slice(0, 10)
          : legacyItem.startDate
            ? String(legacyItem.startDate).slice(0, 10)
            : ''
      if (seenPersonKeys.has(`${legacyItem.personId}:${legacyDateStr}`)) {
        continue
      }
      mergedCommanders.push(legacyItem)
    }

    const eventRelations: MilitaryUnitEventLinkDto[] = [
      ...(unitRecord.eventRelations ?? []),
    ]
      .sort((left, right) => {
        const leftKey =
          structuredDateKey(
            left.event.startEra,
            left.event.startYear,
            left.event.startMonth,
            left.event.startDay,
          ) ?? Number.POSITIVE_INFINITY
        const rightKey =
          structuredDateKey(
            right.event.startEra,
            right.event.startYear,
            right.event.startMonth,
            right.event.startDay,
          ) ?? Number.POSITIVE_INFINITY
        return leftKey - rightKey
      })
      .map((relation) => ({
        relationId: relation.id,
        role: relation.role,
        roleDescription: relation.roleDescription ?? null,
        event: {
          id: relation.event.id,
          title: relation.event.title,
          startEra: relation.event.startEra ?? null,
          startYear: relation.event.startYear ?? null,
          startMonth: relation.event.startMonth ?? null,
          startDay: relation.event.startDay ?? null,
        },
      }))

    return {
      ...unitRecord,
      established,
      disbanded,
      establishedDate: signedEstablished ?? unitRecord.establishedDate ?? null,
      disbandedDate: signedDisbanded ?? unitRecord.disbandedDate ?? null,
      predecessors,
      successors,
      tenures: mappedTenures,
      commanders: mergedCommanders,
      eventRelations,
    }
  }

  async findAll(filters?: {
    countryId?: string
    historicalCountryId?: string
    search?: string
    unitType?: string
    branch?: string
  }) {
    const search = filters?.search?.trim()
    let linkedHistoricalIds: string[] = []
    if (
      !filters?.historicalCountryId &&
      filters?.countryId &&
      this.prisma.historicalCountryModernCountry?.findMany
    ) {
      const bridgeRows =
        await this.prisma.historicalCountryModernCountry.findMany({
          where: { modernCountryId: filters.countryId },
          select: { historicalCountryId: true },
        })
      linkedHistoricalIds = bridgeRows.map((row) => row.historicalCountryId)
    }

    const countryOrClause: Prisma.MilitaryUnitWhereInput | null =
      !filters?.historicalCountryId &&
      filters?.countryId &&
      linkedHistoricalIds.length > 0
        ? {
            OR: [
              { countryId: filters.countryId },
              { historicalCountryId: { in: linkedHistoricalIds } },
            ],
          }
        : null

    const searchOrClause: Prisma.MilitaryUnitWhereInput | null = search
      ? {
          OR: [
            { name: { contains: search } },
            { nameLocal: { contains: search } },
            { nameEn: { contains: search } },
            { abbreviation: { contains: search } },
            { nickname: { contains: search } },
          ],
        }
      : null

    const where: Prisma.MilitaryUnitWhereInput = {
      ...(filters?.historicalCountryId
        ? { historicalCountryId: filters.historicalCountryId }
        : filters?.countryId && !countryOrClause
          ? { countryId: filters.countryId }
          : {}),
      ...(filters?.unitType ? { unitType: filters.unitType as any } : {}),
      ...(filters?.branch ? { branch: filters.branch as any } : {}),
      ...(countryOrClause && searchOrClause
        ? { AND: [countryOrClause, searchOrClause] }
        : countryOrClause
          ? countryOrClause
          : searchOrClause
            ? searchOrClause
            : {}),
    }

    const rows = await this.prisma.militaryUnit.findMany({
      ...(Object.keys(where).length > 0 ? { where } : {}),
      include: {
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
          },
        },
        historicalCountry: {
          select: {
            id: true,
            name: true,
            enName: true,
            startEra: true,
            startYear: true,
            endEra: true,
            endYear: true,
          },
        },
        parentUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            unitType: true,
          },
        },
        subUnits: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            unitType: true,
            isActive: true,
          },
        },
        administrationDepartment: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            kind: true,
          },
        },
        predecessorTransitions: {
          include: {
            predecessorUnit: {
              select: { id: true, name: true, abbreviation: true, unitType: true },
            },
            predecessorDepartment: {
              select: { id: true, name: true, abbreviation: true, kind: true },
            },
          },
        },
        successorTransitions: {
          include: {
            successorUnit: {
              select: { id: true, name: true, abbreviation: true, unitType: true },
            },
          },
        },
        tenures: {
          orderBy: [{ startKey: 'desc' }, { startDate: 'desc' }],
          include: {
            person: { select: TENURE_PERSON_SELECT },
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                isMonarchical: true,
              },
            },
            party: { select: { id: true, name: true, shortName: true, brandColor: true } },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
        },
        commanders: {
          orderBy: [
            { isCurrent: 'desc' },
            { termNumber: 'desc' },
            { startDate: 'desc' },
          ],
          select: {
            id: true,
            personId: true,
            rank: true,
            role: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            termNumber: true,
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
        },
        eventRelations: {
          where: { event: { deletedAt: null } },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startEra: true,
                startYear: true,
                startMonth: true,
                startDay: true,
              },
            },
          },
        },
        assignedNavalVessels: {
          select: {
            id: true,
            name: true,
            vesselType: true,
          },
        },
        sideDeployedUnits: {
          where: {
            side: {
              event: {
                deletedAt: null,
              },
            },
          },
          select: {
            id: true,
            role: true,
            side: {
              select: {
                id: true,
                name: true,
                color: true,
                outcome: true,
                event: {
                  select: {
                    id: true,
                    title: true,
                    startDate: true,
                    endDate: true,
                    kind: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
    return rows.map((row) => this.enrichUnitRecord(row))
  }

  async findById(id: string) {
    const unitRecord = await this.prisma.militaryUnit.findUnique({
      where: { id },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
          },
        },
        historicalCountry: {
          select: {
            id: true,
            name: true,
            enName: true,
            startEra: true,
            startYear: true,
            endEra: true,
            endYear: true,
          },
        },
        parentUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            unitType: true,
          },
        },
        subUnits: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            unitType: true,
            isActive: true,
          },
        },
        administrationDepartment: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            kind: true,
          },
        },
        predecessorTransitions: {
          include: {
            predecessorUnit: {
              select: { id: true, name: true, abbreviation: true, unitType: true },
            },
            predecessorDepartment: {
              select: { id: true, name: true, abbreviation: true, kind: true },
            },
          },
        },
        successorTransitions: {
          include: {
            successorUnit: {
              select: { id: true, name: true, abbreviation: true, unitType: true },
            },
          },
        },
        tenures: {
          orderBy: [{ startKey: 'desc' }, { startDate: 'desc' }],
          include: {
            person: { select: TENURE_PERSON_SELECT },
            positionDefinition: {
              select: {
                id: true,
                title: true,
                positionType: true,
                isMonarchical: true,
              },
            },
            party: { select: { id: true, name: true, shortName: true, brandColor: true } },
            country: { select: { id: true, name: true } },
            historicalCountry: { select: { id: true, name: true } },
          },
        },
        commanders: {
          select: {
            id: true,
            personId: true,
            rank: true,
            role: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            termNumber: true,
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
          orderBy: [{ termNumber: 'desc' }, { startDate: 'desc' }],
        },
        eventRelations: {
          where: { event: { deletedAt: null } },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startEra: true,
                startYear: true,
                startMonth: true,
                startDay: true,
              },
            },
          },
        },
        assignedNavalVessels: {
          select: {
            id: true,
            name: true,
            vesselType: true,
          },
          orderBy: { name: 'asc' },
        },
        sideDeployedUnits: {
          where: {
            side: {
              event: {
                deletedAt: null,
              },
            },
          },
          select: {
            id: true,
            role: true,
            note: true,
            parentUnitId: true,
            commanderId: true,
            parentUnit: {
              select: {
                id: true,
                name: true,
                unitType: true,
              },
            },
            commander: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
            weaponsUsed: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                quantity: true,
                note: true,
                weapon: { select: { id: true, name: true, weaponType: true } },
                groundVehicle: {
                  select: { id: true, name: true, vehicleType: true },
                },
                aircraft: {
                  select: { id: true, name: true, aircraftType: true },
                },
                navalVessel: {
                  select: { id: true, name: true, vesselType: true },
                },
              },
            },
            mapFeatures: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                eventId: true,
                geometryType: true,
                title: true,
                description: true,
                color: true,
              },
            },
            side: {
              select: {
                id: true,
                name: true,
                color: true,
                outcome: true,
                event: {
                  select: {
                    id: true,
                    title: true,
                    startDate: true,
                    endDate: true,
                    kind: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!unitRecord) return null

    const sideUnitIds = unitRecord.sideDeployedUnits.map(
      (deployed) => deployed.id,
    )
    const observations =
      sideUnitIds.length > 0 && this.prisma.observation?.findMany
        ? await this.prisma.observation.findMany({
            where: {
              subjectType: 'EVENT_SIDE_UNIT',
              subjectId: { in: sideUnitIds },
            },
            include: {
              metric: {
                select: {
                  key: true,
                  name: true,
                  unit: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          })
        : []

    const metricsBySideUnitId = new Map<
      string,
      Array<{
        id: string
        metricKey: string
        metricName: string
        unit: string | null
        value: string | null
        low: string | null
        high: string | null
        approx: boolean
        atLeast: boolean
      }>
    >()

    for (const obsRow of observations) {
      const list = metricsBySideUnitId.get(obsRow.subjectId) ?? []
      list.push({
        id: obsRow.id,
        metricKey: obsRow.metric.key,
        metricName: obsRow.metric.name,
        unit: obsRow.metric.unit,
        value: obsRow.value != null ? String(obsRow.value) : null,
        low: obsRow.low != null ? String(obsRow.low) : null,
        high: obsRow.high != null ? String(obsRow.high) : null,
        approx: obsRow.approx,
        atLeast: obsRow.atLeast,
      })
      metricsBySideUnitId.set(obsRow.subjectId, list)
    }

    const enriched = this.enrichUnitRecord(unitRecord)
    return {
      ...enriched,
      sideDeployedUnits: unitRecord.sideDeployedUnits.map((deployed) => ({
        ...deployed,
        deployedWeapons: deployed.weaponsUsed,
        metrics: metricsBySideUnitId.get(deployed.id) ?? [],
      })),
    }
  }

  async listTenures(id: string) {
    const unit = await this.findById(id)
    if (!unit) throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)
    return unit.tenures ?? []
  }

  async listEvents(id: string): Promise<MilitaryUnitEventLinkDto[]> {
    const unit = await this.findById(id)
    if (!unit) throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)
    return unit.eventRelations ?? []
  }

  async create(data: CreateMilitaryUnitDto) {
    const established = unitDateColumns(
      data.establishedInfo,
      data.establishedDate,
      '부대 창설일',
    )
    const disbanded = unitDateColumns(
      data.disbandedInfo,
      data.disbandedDate,
      '부대 해체일',
    )
    this.assertDateOrder(established, disbanded)

    const axis = await this.resolveCountryAxis(
      data.countryId,
      data.historicalCountryId,
    )
    await this.validateUnitRelations(
      null,
      axis,
      data.parentUnitId,
      data.administrationDepartmentId,
    )

    const unitId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.militaryUnit.create({
        data: {
          name: data.name.trim(),
          nameLocal: data.nameLocal?.trim() || null,
          nameEn: data.nameEn?.trim() || null,
          abbreviation: data.abbreviation?.trim() || null,
          unitType: data.unitType,
          branch: data.branch ?? null,
          countryId: axis.countryId,
          historicalCountryId: axis.historicalCountryId,
          isActive: data.isActive ?? (disbanded.year == null && !disbanded.date),
          establishedEra: established.era,
          establishedYear: established.year,
          establishedMonth: established.month,
          establishedDay: established.day,
          establishedPrecision: established.precision,
          establishedDate: established.date,
          disbandedEra: disbanded.era,
          disbandedYear: disbanded.year,
          disbandedMonth: disbanded.month,
          disbandedDay: disbanded.day,
          disbandedPrecision: disbanded.precision,
          disbandedDate: disbanded.date,
          parentUnitId: data.parentUnitId,
          ...(data.administrationDepartmentId !== undefined
            ? { administrationDepartmentId: data.administrationDepartmentId }
            : {}),
          nickname: data.nickname ?? null,
          motto: data.motto ?? null,
          garrison: data.garrison ?? null,
          strength: data.strength ?? null,
          insigniaUrl: data.insigniaUrl ?? null,
          primaryMission: data.primaryMission ?? null,
          jurisdiction: data.jurisdiction ?? null,
          notableBattles: data.notableBattles ?? null,
          honors: data.honors ?? null,
          description: data.description,
        },
      })
      if (data.commanders?.length) {
        await tx.militaryUnitCommander.createMany({
          data: this.commanderRowsForUnit(created.id, data.commanders),
        })
      }
      return created.id
    })
    const created = await this.findById(unitId)
    if (!created)
      throw new NotFoundException(`MilitaryUnit not found after create: ${unitId}`)
    return created
  }

  async update(id: string, data: UpdateMilitaryUnitDto) {
    const existing = await this.prisma.militaryUnit.findUnique({
      where: { id },
      select: {
        id: true,
        countryId: true,
        historicalCountryId: true,
        establishedEra: true,
        establishedYear: true,
        establishedMonth: true,
        establishedDay: true,
        establishedPrecision: true,
        establishedDate: true,
        disbandedEra: true,
        disbandedYear: true,
        disbandedMonth: true,
        disbandedDay: true,
        disbandedPrecision: true,
        disbandedDate: true,
        parentUnitId: true,
        administrationDepartmentId: true,
      },
    })
    if (!existing) {
      throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)
    }

    const updateData: Prisma.MilitaryUnitUncheckedUpdateInput = {}
    let resolvedAxis: {
      countryId: string | null
      historicalCountryId: string | null
    } | null = null

    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.nameLocal !== undefined)
      updateData.nameLocal = data.nameLocal?.trim() || null
    if (data.nameEn !== undefined)
      updateData.nameEn = data.nameEn?.trim() || null
    if (data.abbreviation !== undefined)
      updateData.abbreviation = data.abbreviation?.trim() || null
    if (data.unitType !== undefined) updateData.unitType = data.unitType
    if (data.branch !== undefined) updateData.branch = data.branch
    if (data.countryId !== undefined || data.historicalCountryId !== undefined) {
      const nextCid =
        data.countryId !== undefined ? data.countryId : existing.countryId
      const nextHid =
        data.historicalCountryId !== undefined
          ? data.historicalCountryId
          : existing.historicalCountryId
      resolvedAxis = await this.resolveCountryAxis(nextCid, nextHid)
      updateData.countryId = resolvedAxis.countryId
      updateData.historicalCountryId = resolvedAxis.historicalCountryId
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const establishedTouched =
      data.establishedInfo !== undefined || data.establishedDate !== undefined
    const disbandedTouched =
      data.disbandedInfo !== undefined || data.disbandedDate !== undefined

    const effectiveEstablished = establishedTouched
      ? unitDateColumns(data.establishedInfo, data.establishedDate, '부대 창설일')
      : {
          era: existing.establishedEra,
          year: existing.establishedYear,
          month: existing.establishedMonth,
          day: existing.establishedDay,
          precision: existing.establishedPrecision,
          date: existing.establishedDate,
        }

    const effectiveDisbanded = disbandedTouched
      ? unitDateColumns(data.disbandedInfo, data.disbandedDate, '부대 해체일')
      : {
          era: existing.disbandedEra,
          year: existing.disbandedYear,
          month: existing.disbandedMonth,
          day: existing.disbandedDay,
          precision: existing.disbandedPrecision,
          date: existing.disbandedDate,
        }

    this.assertDateOrder(effectiveEstablished, effectiveDisbanded)

    if (establishedTouched) {
      updateData.establishedEra = effectiveEstablished.era
      updateData.establishedYear = effectiveEstablished.year
      updateData.establishedMonth = effectiveEstablished.month
      updateData.establishedDay = effectiveEstablished.day
      updateData.establishedPrecision = effectiveEstablished.precision
      updateData.establishedDate = effectiveEstablished.date
    }
    if (disbandedTouched) {
      updateData.disbandedEra = effectiveDisbanded.era
      updateData.disbandedYear = effectiveDisbanded.year
      updateData.disbandedMonth = effectiveDisbanded.month
      updateData.disbandedDay = effectiveDisbanded.day
      updateData.disbandedPrecision = effectiveDisbanded.precision
      updateData.disbandedDate = effectiveDisbanded.date
    }

    if (data.parentUnitId !== undefined)
      updateData.parentUnitId = data.parentUnitId
    if (data.administrationDepartmentId !== undefined)
      updateData.administrationDepartmentId = data.administrationDepartmentId

    const effectiveAxis = resolvedAxis ?? {
      countryId: existing.countryId ?? null,
      historicalCountryId: existing.historicalCountryId ?? null,
    }
    const effectiveParentUnitId: string | null =
      data.parentUnitId !== undefined
        ? (data.parentUnitId ?? null)
        : (existing.parentUnitId ?? null)
    const effectiveDeptId: string | null =
      data.administrationDepartmentId !== undefined
        ? (data.administrationDepartmentId ?? null)
        : (existing.administrationDepartmentId ?? null)

    if (
      data.countryId !== undefined ||
      data.historicalCountryId !== undefined ||
      data.parentUnitId !== undefined ||
      data.administrationDepartmentId !== undefined
    ) {
      await this.validateUnitRelations(
        id,
        effectiveAxis,
        effectiveParentUnitId,
        effectiveDeptId,
      )
    }

    if (data.nickname !== undefined) updateData.nickname = data.nickname
    if (data.motto !== undefined) updateData.motto = data.motto
    if (data.garrison !== undefined) updateData.garrison = data.garrison
    if (data.strength !== undefined) updateData.strength = data.strength
    if (data.insigniaUrl !== undefined) updateData.insigniaUrl = data.insigniaUrl
    if (data.primaryMission !== undefined)
      updateData.primaryMission = data.primaryMission
    if (data.jurisdiction !== undefined) updateData.jurisdiction = data.jurisdiction
    if (data.notableBattles !== undefined)
      updateData.notableBattles = data.notableBattles
    if (data.honors !== undefined) updateData.honors = data.honors
    if (data.description !== undefined) updateData.description = data.description

    if (data.commanders === undefined && Object.keys(updateData).length === 0) {
      const unchanged = await this.findById(id)
      if (!unchanged) throw new NotFoundException(`MilitaryUnit not found: ${id}`)
      return unchanged
    }

    if (data.commanders !== undefined) {
      const commandersList = data.commanders ?? []
      const commanderRows =
        commandersList.length > 0
          ? this.commanderRowsForUnit(id, commandersList)
          : []
      await this.prisma.$transaction(async (tx) => {
        await tx.militaryUnitCommander.deleteMany({ where: { unitId: id } })
        if (commanderRows.length > 0) {
          await tx.militaryUnitCommander.createMany({
            data: commanderRows,
          })
        }
        if (Object.keys(updateData).length > 0) {
          await tx.militaryUnit.update({
            where: { id },
            data: updateData,
          })
        }
      })
      const updated = await this.findById(id)
      if (!updated)
        throw new NotFoundException(`MilitaryUnit not found after update: ${id}`)
      return updated
    }

    await this.prisma.militaryUnit.update({
      where: { id },
      data: updateData,
    })
    const refreshed = await this.findById(id)
    if (!refreshed)
      throw new NotFoundException(`MilitaryUnit not found after update: ${id}`)
    return refreshed
  }

  async delete(id: string) {
    if (this.prisma.militaryUnit?.findUnique) {
      const existing = await this.prisma.militaryUnit.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              subUnits: true,
              tenures: true,
              sideDeployedUnits: true,
              eventRelations: true,
            },
          },
        },
      })
      if (!existing) {
        throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)
      }
      const counts = existing._count
      const blockers = [
        counts.subUnits > 0 && `예하 부대 ${counts.subUnits}개`,
        counts.tenures > 0 && `지휘관·참모 재임 ${counts.tenures}건`,
        counts.sideDeployedUnits > 0 && `작전 투입 기록 ${counts.sideDeployedUnits}건`,
        counts.eventRelations > 0 && `사건 연결 ${counts.eventRelations}건`,
      ].filter(Boolean)
      if (blockers.length > 0) {
        throw new ConflictException(
          `「${existing.name}」에 걸린 기록이 있어 지울 수 없습니다 — ${blockers.join(' · ')}. 먼저 옮기거나 끊어 주세요.`,
        )
      }
    }
    await this.prisma.militaryUnit.delete({
      where: { id },
    })
  }

  // ─── 개편 계보 (MilitaryUnitTransition) ─────────────────────────────────

  async addTransition(id: string, body: CreateMilitaryUnitTransitionDto) {
    const unit = await this.prisma.militaryUnit.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!unit) throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)

    if (body.year != null && (!Number.isInteger(body.year) || body.year < 1)) {
      throw new BadRequestException('계보 전환 연도는 1 이상의 정수여야 합니다.')
    }
    if (
      body.month != null &&
      (!Number.isInteger(body.month) || body.month < 1 || body.month > 12)
    ) {
      throw new BadRequestException('계보 전환 월은 1~12 사이여야 합니다.')
    }
    if (body.year == null && body.month != null) {
      throw new BadRequestException('계보 전환 연도 없이 월만 입력할 수 없습니다.')
    }

    const successorUnitId = body.successorUnitId?.trim() || null
    const predecessorUnitId = body.predecessorUnitId?.trim() || null
    const predecessorDepartmentId = body.predecessorDepartmentId?.trim() || null

    const providedCount = [
      successorUnitId,
      predecessorUnitId,
      predecessorDepartmentId,
    ].filter(Boolean).length
    if (providedCount !== 1) {
      throw new BadRequestException(
        '후신 부대(successorUnitId), 전신 부대(predecessorUnitId), 전신 행정부처(predecessorDepartmentId) 중 정확히 하나를 지정해야 합니다.',
      )
    }

    const eraValue = (
      body.year == null ? null : (body.era ?? 'AD')
    ) as Era | null

    if (successorUnitId) {
      if (successorUnitId === id) {
        throw new BadRequestException('같은 부대를 자기 후신으로 둘 수 없습니다.')
      }
      const target = await this.prisma.militaryUnit.findUnique({
        where: { id: successorUnitId },
        select: { id: true },
      })
      if (!target) throw new NotFoundException('후신 부대를 찾을 수 없습니다.')
      const exists = await this.prisma.militaryUnitTransition.findFirst({
        where: { predecessorUnitId: id, successorUnitId },
      })
      if (exists) throw new ConflictException('이미 이어져 있는 두 부대입니다.')
      await this.prisma.militaryUnitTransition.create({
        data: {
          predecessorUnitId: id,
          successorUnitId,
          kind: body.kind,
          era: eraValue,
          year: body.year ?? null,
          month: body.month ?? null,
          note: body.note?.trim() || null,
        },
      })
    } else if (predecessorUnitId) {
      if (predecessorUnitId === id) {
        throw new BadRequestException('같은 부대를 자기 전신으로 둘 수 없습니다.')
      }
      const target = await this.prisma.militaryUnit.findUnique({
        where: { id: predecessorUnitId },
        select: { id: true },
      })
      if (!target) throw new NotFoundException('전신 부대를 찾을 수 없습니다.')
      const exists = await this.prisma.militaryUnitTransition.findFirst({
        where: { predecessorUnitId, successorUnitId: id },
      })
      if (exists) throw new ConflictException('이미 이어져 있는 두 부대입니다.')
      await this.prisma.militaryUnitTransition.create({
        data: {
          predecessorUnitId,
          successorUnitId: id,
          kind: body.kind,
          era: eraValue,
          year: body.year ?? null,
          month: body.month ?? null,
          note: body.note?.trim() || null,
        },
      })
    } else if (predecessorDepartmentId) {
      const department = await this.prisma.administrationDepartment.findUnique({
        where: { id: predecessorDepartmentId },
        select: { id: true },
      })
      if (!department)
        throw new NotFoundException('전신 행정부처를 찾을 수 없습니다.')
      const exists = await this.prisma.militaryUnitTransition.findFirst({
        where: { predecessorDepartmentId, successorUnitId: id },
      })
      if (exists)
        throw new ConflictException('이미 이어져 있는 전신 부처와 부대입니다.')
      await this.prisma.militaryUnitTransition.create({
        data: {
          predecessorDepartmentId,
          successorUnitId: id,
          kind: body.kind,
          era: eraValue,
          year: body.year ?? null,
          month: body.month ?? null,
          note: body.note?.trim() || null,
        },
      })
    }

    return (await this.findById(id))!
  }

  async updateTransition(
    transitionId: string,
    body: UpdateMilitaryUnitTransitionDto,
  ): Promise<void> {
    const current = await this.prisma.militaryUnitTransition.findUnique({
      where: { id: transitionId },
    })
    if (!current) throw new NotFoundException('계보 연결을 찾을 수 없습니다.')
    const nextYear = body.year !== undefined ? body.year : current.year
    const nextMonth =
      body.year === null
        ? null
        : body.month !== undefined
          ? body.month
          : current.month
    const nextEra =
      nextYear == null
        ? null
        : ((body.era !== undefined ? body.era : current.era) ?? 'AD')

    if (nextYear != null && (!Number.isInteger(nextYear) || nextYear < 1)) {
      throw new BadRequestException('계보 전환 연도는 1 이상의 정수여야 합니다.')
    }
    if (
      nextMonth != null &&
      (!Number.isInteger(nextMonth) || nextMonth < 1 || nextMonth > 12)
    ) {
      throw new BadRequestException('계보 전환 월은 1~12 사이여야 합니다.')
    }
    if (nextYear == null && nextMonth != null) {
      throw new BadRequestException('계보 전환 연도 없이 월만 입력할 수 없습니다.')
    }

    await this.prisma.militaryUnitTransition.update({
      where: { id: transitionId },
      data: {
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(body.era !== undefined || body.year !== undefined
          ? { era: nextEra as Era | null }
          : {}),
        ...(body.year !== undefined && { year: nextYear }),
        ...(body.month !== undefined || body.year === null
          ? { month: nextMonth }
          : {}),
        ...(body.note !== undefined && { note: body.note?.trim() || null }),
      },
    })
  }

  async deleteTransition(transitionId: string): Promise<void> {
    const current = await this.prisma.militaryUnitTransition.findUnique({
      where: { id: transitionId },
    })
    if (!current) throw new NotFoundException('계보 연결을 찾을 수 없습니다.')
    await this.prisma.militaryUnitTransition.delete({
      where: { id: transitionId },
    })
  }
}
