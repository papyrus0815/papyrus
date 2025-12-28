import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class ReligionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.religion.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string) {
    return this.prisma.religion.findUnique({
      where: { id },
    })
  }

  async create(data: {
    name: string
    description?: string
    foundationDate?: Date
  }) {
    return this.prisma.religion.create({
      data,
    })
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string
      foundationDate?: Date
    },
  ) {
    return this.prisma.religion.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return this.prisma.religion.delete({
      where: { id },
    })
  }
}
