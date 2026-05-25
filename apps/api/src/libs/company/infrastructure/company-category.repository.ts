import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

export const COMPANY_CATEGORY_INCLUDE = {
  parent: { select: { id: true, name: true } },
  _count: { select: { children: true, companies: true } },
} satisfies Prisma.CompanyCategoryInclude

export type CompanyCategoryWithRelations = Prisma.CompanyCategoryGetPayload<{
  include: typeof COMPANY_CATEGORY_INCLUDE
}>

@Injectable()
export class CompanyCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<CompanyCategoryWithRelations[]> {
    return this.prisma.companyCategory.findMany({
      include: COMPANY_CATEGORY_INCLUDE,
      orderBy: { name: 'asc' },
    })
  }

  findById(id: string): Promise<CompanyCategoryWithRelations | null> {
    return this.prisma.companyCategory.findUnique({
      where: { id },
      include: COMPANY_CATEGORY_INCLUDE,
    })
  }

  create(
    data: Prisma.CompanyCategoryUncheckedCreateInput,
  ): Promise<CompanyCategoryWithRelations> {
    return this.prisma.companyCategory.create({
      data,
      include: COMPANY_CATEGORY_INCLUDE,
    })
  }

  update(
    id: string,
    data: Prisma.CompanyCategoryUncheckedUpdateInput,
  ): Promise<CompanyCategoryWithRelations> {
    return this.prisma.companyCategory.update({
      where: { id },
      data,
      include: COMPANY_CATEGORY_INCLUDE,
    })
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.companyCategory.delete({
      where: { id },
      select: { id: true },
    })
  }
}
