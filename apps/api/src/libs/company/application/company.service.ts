import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, EventMethod, AggregateType } from '@prisma/client'
import type { OrganizationStatus } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { NotificationService } from '../../notification/application/notification.service'
import { PointService } from '../../gamification/application/point.service'
import { completenessBonus } from '../../gamification/domain/point.policy'
import { getActorAccountId } from '../../shared/actor-context'
import { dateYearRangePreview } from '../../shared/notification-preview.util'
import {
  CompanyRepository,
  COMPANY_INCLUDE,
  type CompanyWithRelations,
  type CompanyDetailWithRelations,
} from '../infrastructure/company.repository'
import type {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyCategoryInputDto,
  CompanyStockPointInputDto,
} from '../presentation/dto'

/** ISO 문자열 → Date. undefined는 미지정(skip), null은 해제. */
function toDateInput(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value)
}

/** 선택 스칼라 → undefined는 skip, null은 그대로 전달. */
function passthrough<T>(value: T | null | undefined): T | null | undefined {
  return value
}

/** Json 필드: null은 Prisma.JsonNull로, undefined는 skip. */
function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

/**
 * 기업 서비스.
 *
 * schema-1 통합(방향 B): 명칭·상태·국가맥락·날짜·웹사이트·로고·extra의 정본은
 * Organization(type=COMPANY)이 보유하고, Company는 founder·시설·연혁·업종만 갖는
 * 1:1 산업 확장이다. 따라서 쓰기는 항상 Organization+Company를 한 트랜잭션으로 다룬다.
 */
@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly pointService: PointService,
  ) {}

  findAll(): Promise<CompanyWithRelations[]> {
    return this.companyRepository.findAll()
  }

  async findById(id: string): Promise<CompanyDetailWithRelations> {
    const company = await this.companyRepository.findById(id)
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`)
    }
    return company
  }

  async create(dto: CreateCompanyDto): Promise<CompanyWithRelations> {
    try {
      const company = await this.prisma.$transaction(async (tx) => {
        let organizationId = dto.organizationId
        if (organizationId) {
          // 기존 Organization을 기업으로 승격(부착). 공유필드는 조직의 것을 유지.
          const org = await tx.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, company: { select: { id: true } } },
          })
          if (!org) {
            throw new NotFoundException(
              `Organization with ID ${organizationId} not found`,
            )
          }
          if (org.company) {
            throw new ConflictException(
              '이미 해당 조직에 연결된 기업이 있습니다',
            )
          }
        } else {
          // Organization(정본) 자동 생성 후 링크.
          const org = await tx.organization.create({
            data: { ...this.orgCreateData(dto), type: 'COMPANY' },
            select: { id: true },
          })
          organizationId = org.id
        }
        return tx.company.create({
          data: {
            founderId: dto.founderId ?? null,
            organizationId,
            createdById: getActorAccountId() ?? null,
          },
          include: COMPANY_INCLUDE,
        })
      })
      await this.notificationService.notifyCompany(
        company.organization.name,
        EventMethod.CREATE,
        company.id,
        dateYearRangePreview(
          company.organization.foundedDate,
          company.organization.dissolvedDate,
        ),
      )
      await this.pointService.awardForCreate(
        getActorAccountId(),
        AggregateType.COMPANY,
        company.id,
        completenessBonus(this.companyCompletenessSignals(company)),
      )
      return company
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyWithRelations> {
    const existing = await this.findById(id) // 존재 확인 + organizationId 확보
    try {
      const company = await this.prisma.$transaction(async (tx) => {
        // 공유필드는 정본 Organization에 기록
        await tx.organization.update({
          where: { id: existing.organizationId },
          data: this.orgUpdateData(dto),
        })

        // 자식 엔티티(전부 Company-side FK, organization 무관) — 전체배열 delete-and-recreate.
        // 배열이 undefined면 해당 자식 미변경(skip). 같은 $transaction 안이라 중간 실패 시 전체 롤백.
        // 각 자식 배열은 delete 후 단일 createMany로 일괄 삽입(행마다 create 라운드트립·
        // 락 점유 시간을 줄임). 같은 delete-and-recreate 의미·정렬은 그대로 유지한다.
        if (dto.facilities !== undefined) {
          await tx.companyFacility.deleteMany({ where: { companyId: id } })
          if (dto.facilities.length > 0) {
            await tx.companyFacility.createMany({
              data: dto.facilities.map((facility) => ({
                companyId: id,
                facilityType: facility.facilityType ?? null,
                name: facility.name ?? null,
                address: facility.address ?? null,
                note: facility.note ?? null,
                constructionBackground: facility.constructionBackground ?? null,
                constructionStartDate: facility.constructionStartDate
                  ? new Date(facility.constructionStartDate)
                  : null,
                constructionEndDate: facility.constructionEndDate
                  ? new Date(facility.constructionEndDate)
                  : null,
                openedAt: facility.openedAt ? new Date(facility.openedAt) : null,
                closedAt: facility.closedAt ? new Date(facility.closedAt) : null,
                cityId: facility.cityId || null,
                administrativeDivisionId:
                  facility.administrativeDivisionId || null,
              })),
            })
          }
        }

        if (dto.histories !== undefined) {
          await tx.companyHistory.deleteMany({ where: { companyId: id } })
          if (dto.histories.length > 0) {
            await tx.companyHistory.createMany({
              data: dto.histories.map((history, index) => ({
                companyId: id,
                type: history.type ?? undefined,
                title: history.title,
                occurredAt: history.occurredAt
                  ? new Date(history.occurredAt)
                  : null,
                content: history.content ?? null,
                note: history.note ?? null,
                stockPrice: history.stockPrice ?? null,
                marketCap: history.marketCap ?? null,
                currency: history.currency ?? null,
                order: history.order ?? index,
              })),
            })
          }
        }

        if (dto.categories !== undefined) {
          // @@unique([companyId, categoryId, fromDate]) — MySQL은 fromDate=NULL 중복을 막지
          // 못하므로 (categoryId|fromDate) 키로 사전 dedup해 P2002·무한누적을 차단한다.
          const deduped = new Map<string, CompanyCategoryInputDto>()
          for (const category of dto.categories) {
            // fromDate를 DB unique와 동일한 instant로 정규화 — 'YYYY-MM-DD'와 full ISO가
            // 같은 자정으로 묶여야 Map이 중복의 단일 결정자가 된다(skipDuplicates는 안전망).
            const fromKey = category.fromDate
              ? new Date(category.fromDate).toISOString()
              : '__NULL__'
            const key = `${category.categoryId}|${fromKey}`
            if (!deduped.has(key)) deduped.set(key, category)
          }
          await tx.companyCategoryRelation.deleteMany({ where: { companyId: id } })
          const categoryData = Array.from(deduped.values()).map((category) => ({
            companyId: id,
            categoryId: category.categoryId,
            fromDate: category.fromDate ? new Date(category.fromDate) : null,
            toDate: category.toDate ? new Date(category.toDate) : null,
            note: category.note ?? null,
          }))
          if (categoryData.length > 0) {
            await tx.companyCategoryRelation.createMany({
              data: categoryData,
              skipDuplicates: true,
            })
          }
        }

        if (dto.products !== undefined) {
          await tx.companyProduct.deleteMany({ where: { companyId: id } })
          if (dto.products.length > 0) {
            await tx.companyProduct.createMany({
              data: dto.products.map((product, index) => ({
                companyId: id,
                name: product.name,
                category: product.category ?? null,
                productLine: product.productLine ?? null,
                description: product.description ?? null,
                announcedAt: product.announcedAt
                  ? new Date(product.announcedAt)
                  : null,
                releasedAt: product.releasedAt
                  ? new Date(product.releasedAt)
                  : null,
                discontinuedAt: product.discontinuedAt
                  ? new Date(product.discontinuedAt)
                  : null,
                imageUrl: product.imageUrl ?? null,
                order: product.order ?? index,
              })),
            })
          }
        }

        if (dto.stockPoints !== undefined) {
          // @@unique([companyId, date]) — 동일 시점 중복 시 P2002 방지 위해 dedup(나중 값 우선).
          // 키는 *DB unique와 동일한 instant*(new Date().toISOString())로 정규화한다 —
          // 프론트가 'YYYY-MM-DD'와 full ISO를 섞어 보내도 같은 자정으로 묶여 충돌을 막는다.
          const dedupedPoints = new Map<string, CompanyStockPointInputDto>()
          for (const point of dto.stockPoints) {
            dedupedPoints.set(new Date(point.date).toISOString(), point)
          }
          await tx.companyStockPoint.deleteMany({ where: { companyId: id } })
          const stockData = Array.from(dedupedPoints.values()).map((point) => ({
            companyId: id,
            date: new Date(point.date),
            price: point.price ?? null,
            marketCap: point.marketCap ?? null,
            revenue: point.revenue ?? null,
            currency: point.currency ?? null,
            source: point.source ?? null,
            note: point.note ?? null,
            marketNote: point.marketNote ?? null,
          }))
          if (stockData.length > 0) {
            await tx.companyStockPoint.createMany({
              data: stockData,
              skipDuplicates: true,
            })
          }
        }

        if (dto.analystRatings !== undefined) {
          await tx.companyAnalystRating.deleteMany({ where: { companyId: id } })
          if (dto.analystRatings.length > 0) {
            await tx.companyAnalystRating.createMany({
              data: dto.analystRatings.map((rating, index) => ({
                companyId: id,
                firm: rating.firm,
                analyst: rating.analyst ?? null,
                targetPrice: rating.targetPrice ?? null,
                priorTargetPrice: rating.priorTargetPrice ?? null,
                currency: rating.currency ?? null,
                rating: rating.rating ?? null,
                publishedAt: rating.publishedAt
                  ? new Date(rating.publishedAt)
                  : null,
                reportTitle: rating.reportTitle ?? null,
                sourceUrl: rating.sourceUrl ?? null,
                note: rating.note ?? null,
                order: rating.order ?? index,
              })),
            })
          }
        }

        if (dto.outlooks !== undefined) {
          // 드라이버 중첩이라 createMany 불가 — 전망별 create(+drivers nested create).
          // deleteMany는 드라이버를 cascade로 함께 지운다(driver→outlook onDelete:Cascade).
          await tx.companyOutlook.deleteMany({ where: { companyId: id } })
          for (const [index, outlook] of dto.outlooks.entries()) {
            await tx.companyOutlook.create({
              data: {
                companyId: id,
                horizon: outlook.horizon ?? null,
                asOf: outlook.asOf ? new Date(outlook.asOf) : null,
                targetDate: outlook.targetDate
                  ? new Date(outlook.targetDate)
                  : null,
                stance: outlook.stance ?? null,
                confidence: outlook.confidence ?? null,
                targetPrice: outlook.targetPrice ?? null,
                priorTargetPrice: outlook.priorTargetPrice ?? null,
                expectedLow: outlook.expectedLow ?? null,
                expectedHigh: outlook.expectedHigh ?? null,
                currency: outlook.currency ?? null,
                rationale: outlook.rationale ?? null,
                source: outlook.source ?? null,
                valuationMethod: outlook.valuationMethod ?? null,
                targetMultiple: outlook.targetMultiple ?? null,
                perShareBasis: outlook.perShareBasis ?? null,
                basisLabel: outlook.basisLabel ?? null,
                actualPrice: outlook.actualPrice ?? null,
                outcome: outlook.outcome ?? null,
                resolvedAt: outlook.resolvedAt
                  ? new Date(outlook.resolvedAt)
                  : null,
                order: outlook.order ?? index,
                drivers:
                  outlook.drivers && outlook.drivers.length > 0
                    ? {
                        create: outlook.drivers.map((driver, dIndex) => ({
                          name: driver.name,
                          role: driver.role ?? null,
                          impact: driver.impact ?? null,
                          importance: driver.importance ?? null,
                          eventDate: driver.eventDate
                            ? new Date(driver.eventDate)
                            : null,
                          note: driver.note ?? null,
                          order: driver.order ?? dIndex,
                        })),
                      }
                    : undefined,
                scenarios:
                  outlook.scenarios && outlook.scenarios.length > 0
                    ? {
                        create: outlook.scenarios.map((scenario, sIndex) => ({
                          kind: scenario.kind,
                          targetPrice: scenario.targetPrice ?? null,
                          probability: scenario.probability ?? null,
                          summary: scenario.summary ?? null,
                          order: scenario.order ?? sIndex,
                        })),
                      }
                    : undefined,
                catalysts:
                  outlook.catalysts && outlook.catalysts.length > 0
                    ? {
                        create: outlook.catalysts.map((catalyst, cIndex) => ({
                          title: catalyst.title,
                          expectedDate: catalyst.expectedDate
                            ? new Date(catalyst.expectedDate)
                            : null,
                          dateConfidence: catalyst.dateConfidence ?? null,
                          impact: catalyst.impact ?? null,
                          note: catalyst.note ?? null,
                          order: catalyst.order ?? cIndex,
                        })),
                      }
                    : undefined,
              },
            })
          }
        }

        // Company는 산업 고유필드(founder)·재무 코멘터리만. organizationId 재배선 불가.
        return tx.company.update({
          where: { id },
          data: {
            founderId: passthrough(dto.founderId),
            financialCommentary: passthrough(dto.financialCommentary),
          },
          include: COMPANY_INCLUDE,
        })
      })
      await this.notificationService.notifyCompany(
        company.organization.name,
        EventMethod.UPDATE,
        id,
        dateYearRangePreview(
          company.organization.foundedDate,
          company.organization.dissolvedDate,
        ),
      )
      await this.pointService.awardCompletenessBonus(
        getActorAccountId(),
        AggregateType.COMPANY,
        id,
        completenessBonus(this.companyCompletenessSignals(company)),
      )
      // 설립일(정본 날짜)이 바뀌었으면 record 전체 세기 스냅샷 재정합화.
      if (dto.foundedAt !== undefined) {
        await this.pointService.restampContentCentury(AggregateType.COMPANY, id)
      }
      return company
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id) // 존재 확인 + organizationId 확보
    try {
      await this.prisma.$transaction(async (tx) => {
        // Company(확장)를 먼저 지워 organization onDelete:Restrict 다리를 푼 뒤,
        // 정본 Organization도 함께 삭제(1:1 동일 실체).
        //  - 인물 경력(BusinessCareer 등)은 organization onDelete:Restrict → 경력이 남아 있으면
        //    org 삭제가 막혀 트랜잭션 전체가 롤백된다(P2003 → 409, 기업 보존).
        //  - 임원역할·연혁사건·별칭·멤버십·계층은 Cascade → org와 함께 정리된다.
        await tx.company.delete({ where: { id } })
        await tx.organization.delete({ where: { id: existing.organizationId } })
      })
      await this.notificationService.notifyCompany(
        existing.organization.name,
        EventMethod.DELETE,
        id,
      )
      // 적립 회수(net 상쇄 행). award와 동일하게 company.id 기준이어야 정합.
      await this.pointService.revokeForRecord(AggregateType.COMPANY, id)
    } catch (e) {
      throw this.mapWriteError(e)
    }
  }

  /**
   * 완성도 신호 개수(완성도 보너스 점수 환산용).
   * 1차는 정본 Organization 공유필드만 — 자식(시설/연혁/업종) 신호는 COMPANY_INCLUDE 미포함이라 backlog.
   */
  private companyCompletenessSignals(company: CompanyWithRelations): number {
    const org = company.organization
    return [
      !!org.description,
      !!org.logoUrl,
      !!org.websiteUrl,
      !!org.foundedDate,
      !!(org.countryId || org.historicalCountryId),
    ].filter(Boolean).length
  }

  /** 생성 시 Organization으로 흘려보낼 공유필드(컬럼명 매핑). */
  private orgCreateData(dto: CreateCompanyDto) {
    return {
      name: dto.name,
      shortName: dto.shortName,
      localName: dto.localName,
      description: dto.description,
      // CompanyStatusValue·OrganizationStatus 는 동형(ACTIVE/DISSOLVED/MERGED/SUSPENDED/OTHER)
      status: (dto.status ?? undefined) as OrganizationStatus | undefined,
      foundedDate: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
      dissolvedDate: dto.dissolvedAt ? new Date(dto.dissolvedAt) : undefined,
      websiteUrl: dto.websiteUrl,
      logoUrl: dto.logoUrl,
      extra: toJsonInput(dto.extra),
      countryId: dto.countryId,
      historicalCountryId: dto.historicalCountryId,
      headquartersCityId: dto.headquartersCityId,
    }
  }

  /** 수정 시 Organization으로 흘려보낼 공유필드(undefined=skip / null=해제). */
  private orgUpdateData(dto: UpdateCompanyDto) {
    return {
      name: dto.name, // string | undefined — null 불가(필수 명칭)
      shortName: passthrough(dto.shortName),
      localName: passthrough(dto.localName),
      description: passthrough(dto.description),
      status: passthrough(dto.status) as OrganizationStatus | null | undefined,
      foundedDate: toDateInput(dto.foundedAt),
      dissolvedDate: toDateInput(dto.dissolvedAt),
      websiteUrl: passthrough(dto.websiteUrl),
      logoUrl: passthrough(dto.logoUrl),
      extra: toJsonInput(dto.extra),
      countryId: passthrough(dto.countryId),
      historicalCountryId: passthrough(dto.historicalCountryId),
      headquartersCityId: passthrough(dto.headquartersCityId),
    }
  }

  /** 유니크 충돌·FK 제약을 사용자 메시지로 변환. */
  private mapWriteError(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2000') {
        // 값이 컬럼 범위 초과(예: 거대 시가총액/주가). createMany 배치 전체가 롤백되므로,
        // 일반 500 대신 어떤 값을 줄여야 하는지 친절히 안내한다.
        return new BadRequestException(
          '입력 값이 허용 범위를 초과했습니다 (금액·주가·시가총액 등이 너무 큽니다). 값을 확인해 주세요.',
        )
      }
      if (e.code === 'P2002') {
        // 조직 1:1 다리 또는 (companyId,categoryId,fromDate) 업종연결 중복 등
        return new ConflictException(
          '중복된 값이 있어 저장할 수 없습니다 (동일 조직 연결 또는 같은 업종·기간 조합)',
        )
      }
      if (e.code === 'P2003') {
        // 삭제 시: 연결된 인물 경력(Restrict). 수정 시: 존재하지 않는 도시·국가·업종 FK 참조.
        return new ConflictException(
          '참조 무결성 위반: 존재하지 않는 항목(도시·국가·업종 등)을 참조했거나, 연결된 인물 경력이 있어 처리할 수 없습니다',
        )
      }
    }
    return e
  }
}
