import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type {
  CreateMilitaryUnitDto,
  UpdateMilitaryUnitDto,
} from '../presentation/dto'

@Injectable()
export class MilitaryUnitRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
        commanders: {
          select: {
            id: true,
            personId: true,
            rank: true,
            role: true,
            isCurrent: true,
            startDate: true,
            endDate: true,
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
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

  async create(data: CreateMilitaryUnitDto) {
    return this.prisma.militaryUnit.create({
      data: {
        name: data.name,
        unitType: data.unitType,
        countryId: data.countryId,
        isActive: data.isActive,
        establishedDate: data.establishedDate
          ? new Date(data.establishedDate)
          : null,
        disbandedDate: data.disbandedDate
          ? new Date(data.disbandedDate)
          : null,
        parentUnitId: data.parentUnitId,
        description: data.description,
      },
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
      },
    })
  }

  async update(id: string, data: UpdateMilitaryUnitDto) {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.unitType !== undefined) updateData.unitType = data.unitType
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
    if (data.description !== undefined) updateData.description = data.description

    return this.prisma.militaryUnit.update({
      where: { id },
      data: updateData,
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
      },
    })
  }

  async delete(id: string) {
    await this.prisma.militaryUnit.delete({
      where: { id },
    })
  }
}

