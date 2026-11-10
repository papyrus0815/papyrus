import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type { Prisma } from '@prisma/client'
import type {
  CreateMilitaryUnitDto,
  MilitaryUnitCommanderInput,
  UpdateMilitaryUnitDto,
} from '../presentation/dto'

function parseOptionalUnitDate(
  value: string | null | undefined,
  label: string,
): Date | null {
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`유효하지 않은 ${label} 날짜입니다.`)
  }
  return d
}

@Injectable()
export class MilitaryUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCountryAxis(
    countryId?: string | null,
    historicalCountryId?: string | null,
  ): Promise<{ countryId: string | null; historicalCountryId: string | null }> {
    let cid = countryId && countryId.trim() !== '' ? countryId.trim() : null
    const hid =
      historicalCountryId && historicalCountryId.trim() !== ''
        ? historicalCountryId.trim()
        : null

    if (cid && this.prisma.country?.findUnique) {
      const c = await this.prisma.country.findUnique({
        where: { id: cid },
        select: { id: true },
      })
      if (!c) {
        throw new NotFoundException('소속 국가(countryId)를 찾을 수 없습니다.')
      }
    }

    if (hid) {
      if (this.prisma.historicalCountry?.findUnique) {
        const hc = await this.prisma.historicalCountry.findUnique({
          where: { id: hid },
          select: { id: true },
        })
        if (!hc) {
          throw new NotFoundException(
            '소속 역사적 국가(historicalCountryId)를 찾을 수 없습니다.',
          )
        }
      }
      if (this.prisma.historicalCountryModernCountry?.findMany) {
        const links =
          await this.prisma.historicalCountryModernCountry.findMany({
            where: { historicalCountryId: hid },
            select: { modernCountryId: true },
          })
        const modernIds = [
          ...new Set(links.map((l) => l.modernCountryId).filter(Boolean)),
        ]
        if (cid && modernIds.length > 0 && !modernIds.includes(cid)) {
          throw new BadRequestException(
            '선택한 역사적 국가가 지정한 현대 국가와 연결되어 있지 않습니다.',
          )
        }
        if (!cid && modernIds.length === 1) {
          cid = modernIds[0]
        }
      }
    }

    return { countryId: cid, historicalCountryId: hid }
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
    if (firstAxis.historicalCountryId || secondAxis.historicalCountryId) {
      return (
        Boolean(
          firstAxis.historicalCountryId && secondAxis.historicalCountryId,
        ) && firstAxis.historicalCountryId === secondAxis.historicalCountryId
      )
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
    return commanders.map((c) => {
      const startDate = parseOptionalUnitDate(
        c.startDate ?? undefined,
        '지휘관 임기 시작일',
      )
      const endDate = parseOptionalUnitDate(
        c.endDate ?? undefined,
        '지휘관 임기 종료일',
      )
      if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        throw new BadRequestException(
          '지휘관 임기 종료일이 시작일보다 앞설 수 없습니다.',
        )
      }
      return {
        unitId,
        personId: c.personId,
        rank: c.rank ?? null,
        role: c.role ?? null,
        isCurrent: c.isCurrent ?? false,
        startDate,
        endDate,
        termNumber: c.termNumber ?? null,
      }
    })
  }

  async findAll() {
    return this.prisma.militaryUnit.findMany({
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
            unitType: true,
          },
        },
        subUnits: {
          select: {
            id: true,
            name: true,
            unitType: true,
            isActive: true,
          },
        },
        administrationDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
        commanders: {
          where: {
            isCurrent: true,
          },
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
        assignedNavalVessels: {
          select: {
            id: true,
            name: true,
            vesselType: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
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
            unitType: true,
          },
        },
        subUnits: {
          select: {
            id: true,
            name: true,
            unitType: true,
            isActive: true,
          },
        },
        administrationDepartment: {
          select: {
            id: true,
            name: true,
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
                groundVehicle: { select: { id: true, name: true, vehicleType: true } },
                aircraft: { select: { id: true, name: true, aircraftType: true } },
                navalVessel: { select: { id: true, name: true, vesselType: true } },
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

    const sideUnitIds = unitRecord.sideDeployedUnits.map((deployed) => deployed.id)
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

    return {
      ...unitRecord,
      sideDeployedUnits: unitRecord.sideDeployedUnits.map((deployed) => ({
        ...deployed,
        deployedWeapons: deployed.weaponsUsed,
        metrics: metricsBySideUnitId.get(deployed.id) ?? [],
      })),
    }
  }

  async create(data: CreateMilitaryUnitDto) {
    const establishedDate = parseOptionalUnitDate(
      data.establishedDate,
      '부대 창설일',
    )
    const disbandedDate = parseOptionalUnitDate(
      data.disbandedDate,
      '부대 해체일',
    )
    if (
      establishedDate &&
      disbandedDate &&
      establishedDate.getTime() > disbandedDate.getTime()
    ) {
      throw new BadRequestException(
        '부대 해체일이 창설일보다 앞설 수 없습니다.',
      )
    }

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
          name: data.name,
          unitType: data.unitType,
          branch: data.branch ?? null,
          countryId: axis.countryId,
          historicalCountryId: axis.historicalCountryId,
          isActive: data.isActive,
          establishedDate,
          disbandedDate,
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
        establishedDate: true,
        disbandedDate: true,
        parentUnitId: true,
        administrationDepartmentId: true,
      },
    })
    if (!existing) {
      throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)
    }

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.unitType !== undefined) updateData.unitType = data.unitType
    if (data.branch !== undefined) updateData.branch = data.branch
    if (data.countryId !== undefined || data.historicalCountryId !== undefined) {
      const nextCid =
        data.countryId !== undefined ? data.countryId : existing.countryId
      const nextHid =
        data.historicalCountryId !== undefined
          ? data.historicalCountryId
          : existing.historicalCountryId
      const axis = await this.resolveCountryAxis(nextCid, nextHid)
      updateData.countryId = axis.countryId
      updateData.historicalCountryId = axis.historicalCountryId
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.establishedDate !== undefined)
      updateData.establishedDate = parseOptionalUnitDate(
        data.establishedDate,
        '부대 창설일',
      )
    if (data.disbandedDate !== undefined)
      updateData.disbandedDate = parseOptionalUnitDate(
        data.disbandedDate,
        '부대 해체일',
      )

    const effectiveEstablished: Date | null =
      updateData.establishedDate !== undefined
        ? updateData.establishedDate
        : (existing.establishedDate ?? null)
    const effectiveDisbanded: Date | null =
      updateData.disbandedDate !== undefined
        ? updateData.disbandedDate
        : (existing.disbandedDate ?? null)
    if (
      effectiveEstablished &&
      effectiveDisbanded &&
      effectiveEstablished.getTime() > effectiveDisbanded.getTime()
    ) {
      throw new BadRequestException(
        '부대 해체일이 창설일보다 앞설 수 없습니다.',
      )
    }

    if (data.parentUnitId !== undefined)
      updateData.parentUnitId = data.parentUnitId
    if (data.administrationDepartmentId !== undefined)
      updateData.administrationDepartmentId = data.administrationDepartmentId

    const effectiveAxis = {
      countryId:
        updateData.countryId !== undefined
          ? updateData.countryId
          : (existing.countryId ?? null),
      historicalCountryId:
        updateData.historicalCountryId !== undefined
          ? updateData.historicalCountryId
          : (existing.historicalCountryId ?? null),
    }
    const effectiveParentUnitId =
      updateData.parentUnitId !== undefined
        ? updateData.parentUnitId
        : (existing.parentUnitId ?? null)
    const effectiveDeptId =
      updateData.administrationDepartmentId !== undefined
        ? updateData.administrationDepartmentId
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
        select: { id: true },
      })
      if (!existing) {
        throw new NotFoundException(`군부대를 찾을 수 없습니다 (ID: ${id})`)
      }
    }
    await this.prisma.militaryUnit.delete({
      where: { id },
    })
  }
}

