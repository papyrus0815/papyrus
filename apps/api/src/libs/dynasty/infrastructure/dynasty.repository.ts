import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'

@Injectable()
export class DynastyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dynasty.findMany({ orderBy: { name: 'asc' } })
  }

  async findById(id: string) {
    return this.prisma.dynasty.findUnique({ where: { id } })
  }

  async create(data: {
    name: string
    description?: string
    startDate?: Date
    endDate?: Date
    thumbnailUrl?: string
  }) {
    return this.prisma.dynasty.create({ data })
  }

  async update(
    id: string,
    data: {
      name?: string
      description?: string
      startDate?: Date
      endDate?: Date
      thumbnailUrl?: string
    },
  ) {
    return this.prisma.dynasty.update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma.dynasty.delete({ where: { id } })
  }
}
