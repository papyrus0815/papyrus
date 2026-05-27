import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

/** 목록/요약 표시에 필요한 연결 엔티티 요약만 함께 로드 */
export const COMPANY_INCLUDE = {
  founder: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
  headquartersCity: { select: { id: true, name: true } },
  organization: { select: { id: true, name: true } },
} satisfies Prisma.CompanyInclude

/** 상세 화면용 — 요약 관계 + 시설·연혁·카테고리 연결까지 로드 */
export const COMPANY_DETAIL_INCLUDE = {
  ...COMPANY_INCLUDE,
  facilities: {
    include: { city: { select: { id: true, name: true } } },
    orderBy: { openedAt: 'asc' },
  },
  CompanyHistory: {
    orderBy: [{ order: 'asc' }, { occurredAt: 'asc' }],
  },
  CompanyCategoryRelation: {
    include: { category: { select: { id: true, name: true } } },
    orderBy: { fromDate: 'asc' },
  },
} satisfies Prisma.CompanyInclude

export type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: typeof COMPANY_INCLUDE
}>

export type CompanyDetailWithRelations = Prisma.CompanyGetPayload<{
  include: typeof COMPANY_DETAIL_INCLUDE
}>

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<CompanyWithRelations[]> {
    return this.prisma.company.findMany({
      include: COMPANY_INCLUDE,
      orderBy: { name: 'asc' },
    })
  }

  findById(id: string): Promise<CompanyDetailWithRelations | null> {
    return this.prisma.company.findUnique({
      where: { id },
      include: COMPANY_DETAIL_INCLUDE,
    })
  }

  create(data: Prisma.CompanyUncheckedCreateInput): Promise<CompanyWithRelations> {
    return this.prisma.company.create({ data, include: COMPANY_INCLUDE })
  }

  update(
    id: string,
    data: Prisma.CompanyUncheckedUpdateInput,
  ): Promise<CompanyWithRelations> {
    return this.prisma.company.update({
      where: { id },
      data,
      include: COMPANY_INCLUDE,
    })
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.company.delete({
      where: { id },
      select: { id: true },
    })
  }
}
