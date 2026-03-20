import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import type { Prisma } from '@prisma/client'
import type {
  CreateMilitaryUnitDto,
  MilitaryUnitCommanderInput,
  UpdateMilitaryUnitDto,
} from '../presentation/dto'

function parseOptionalCommanderDate(
  value: string | null | undefined,
): Date | null {
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

@Injectable()
export class MilitaryUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  private commanderRowsForUnit(
    unitId: string,
    commanders: MilitaryUnitCommanderInput[],
  ): Prisma.MilitaryUnitCommanderCreateManyInput[] {
    return commanders.map((c) => ({
      unitId,
      personId: c.personId,
      rank: c.rank ?? null,
      role: c.role ?? null,
      isCurrent: c.isCurrent ?? false,
      startDate: parseOptionalCommanderDate(c.startDate ?? undefined),
      endDate: parseOptionalCommanderDate(c.endDate ?? undefined),
      termNumber: c.termNumber ?? null,
    }))
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
    return this.prisma.militaryUnit.findUnique({
      where: { id },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            flagEmoji: true,
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
      },
    })
  }

  async create(data: CreateMilitaryUnitDto) {
    const unitId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.militaryUnit.create({
        data: {
          name: data.name,
          unitType: data.unitType,
          branch: data.branch ?? null,
          countryId: data.countryId,
          isActive: data.isActive,
          establishedDate: data.establishedDate
            ? new Date(data.establishedDate)
            : null,
          disbandedDate: data.disbandedDate
            ? new Date(data.disbandedDate)
            : null,
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
    if (!created) throw new Error(`MilitaryUnit not found after create: ${unitId}`)
    return created
  }

  async update(id: string, data: UpdateMilitaryUnitDto) {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.unitType !== undefined) updateData.unitType = data.unitType
    if (data.branch !== undefined) updateData.branch = data.branch
    if (data.countryId !== undefined) updateData.countryId = data.countryId
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.establishedDate !== undefined)
      updateData.establishedDate = data.establishedDate
        ? new Date(data.establishedDate)
        : null
    if (data.disbandedDate !== undefined)
      updateData.disbandedDate = data.disbandedDate
        ? new Date(data.disbandedDate)
        : null
    if (data.parentUnitId !== undefined)
      updateData.parentUnitId = data.parentUnitId
    if (data.administrationDepartmentId !== undefined)
      updateData.administrationDepartmentId = data.administrationDepartmentId
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
      if (!unchanged) throw new Error(`MilitaryUnit not found: ${id}`)
      return unchanged
    }

    if (data.commanders !== undefined) {
      const commandersList = data.commanders ?? []
      await this.prisma.$transaction(async (tx) => {
        await tx.militaryUnitCommander.deleteMany({ where: { unitId: id } })
        if (commandersList.length > 0) {
          await tx.militaryUnitCommander.createMany({
            data: this.commanderRowsForUnit(id, commandersList),
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
      if (!updated) throw new Error(`MilitaryUnit not found after update: ${id}`)
      return updated
    }

    await this.prisma.militaryUnit.update({
      where: { id },
      data: updateData,
    })
    const refreshed = await this.findById(id)
    if (!refreshed) throw new Error(`MilitaryUnit not found after update: ${id}`)
    return refreshed
  }

  async delete(id: string) {
    await this.prisma.militaryUnit.delete({
      where: { id },
    })
  }
}

