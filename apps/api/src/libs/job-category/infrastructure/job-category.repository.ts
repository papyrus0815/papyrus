import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class JobCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.jobCategory.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { jobs: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string) {
    return this.prisma.jobCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { jobs: true },
        },
      },
    })
  }

  async create(data: {
    name: string
    thumbnailUrl?: string
    parentId?: string
  }) {
    return this.prisma.jobCategory.create({
      data,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { jobs: true },
        },
      },
    })
  }

  async update(
    id: string,
    data: {
      name?: string
      thumbnailUrl?: string
      parentId?: string
    },
  ) {
    return this.prisma.jobCategory.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { jobs: true },
        },
      },
    })
  }

  async delete(id: string) {
    return this.prisma.jobCategory.delete({ where: { id } })
  }
}


