import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

/**
 * 목록/요약 표시에 필요한 연결 엔티티 요약을 함께 로드.
 * 명칭·상태·국가맥락·날짜 등 공유필드의 정본은 organization(type=COMPANY)이 보유하므로
 * 국가/역사국가/본사도시 요약은 organization 경유로 로드한다(schema-1 통합, 방향 B).
 */
export const COMPANY_INCLUDE = {
  founder: { select: { id: true, name: true } },
  organization: {
    include: {
      country: { select: { id: true, name: true } },
      historicalCountry: { select: { id: true, name: true } },
      headquartersCity: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.CompanyInclude

/** 상세 화면용 — 요약 관계 + 시설·연혁·카테고리 연결까지 로드 */
export const COMPANY_DETAIL_INCLUDE = {
  ...COMPANY_INCLUDE,
  facilities: {
    include: {
      city: { select: { id: true, name: true } },
      administrativeDivision: { select: { id: true, name: true } },
    },
    orderBy: { openedAt: 'asc' },
  },
  CompanyHistory: {
    orderBy: [{ order: 'asc' }, { occurredAt: 'asc' }],
  },
  CompanyCategoryRelation: {
    include: { category: { select: { id: true, name: true } } },
    orderBy: { fromDate: 'asc' },
  },
  products: {
    orderBy: [{ order: 'asc' }, { announcedAt: 'asc' }],
  },
  stockPoints: {
    orderBy: { date: 'asc' },
  },
  analystRatings: {
    orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
  },
  outlooks: {
    include: {
      drivers: { orderBy: { order: 'asc' } },
      scenarios: { orderBy: { order: 'asc' } },
      catalysts: { orderBy: [{ order: 'asc' }, { expectedDate: 'asc' }] },
    },
    orderBy: [{ order: 'asc' }, { asOf: 'desc' }],
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
      // 명칭 정본은 organization(type=COMPANY) — 관계 경유로 정렬
      orderBy: { organization: { name: 'asc' } },
    })
  }

  findById(id: string): Promise<CompanyDetailWithRelations | null> {
    return this.prisma.company.findUnique({
      where: { id },
      include: COMPANY_DETAIL_INCLUDE,
    })
  }
}
