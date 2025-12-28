import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.job.findMany({
      include: { category: true },
      orderBy: { title: 'asc' },
    })
  }

  async findById(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
      include: { category: true },
    })
  }

  async create(data: {
    title: string
    description?: string
    thumbnailUrl?: string
    categoryId: string
  }) {
    return this.prisma.job.create({
      data,
      include: { category: true },
    })
  }

  async update(
    id: string,
    data: {
      title?: string
      description?: string
      thumbnailUrl?: string
      categoryId?: string
    },
  ) {
    return this.prisma.job.update({
      where: { id },
      data,
      include: { category: true },
    })
  }

  async delete(id: string) {
    return this.prisma.job.delete({ where: { id } })
  }
}
