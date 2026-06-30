import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CompanyService } from '../application/company.service'
import type {
  CompanyWithRelations,
  CompanyDetailWithRelations,
} from '../infrastructure/company.repository'
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CompanyDetailResponseDto,
  CompanyRelationSummary,
  CompanyStatusValue,
  FacilityTypeValue,
} from './dto'

/**
 * 기업 관리 컨트롤러 (admin CRUD)
 */
@ApiTags('companies')
@Controller('companies')
@UseGuards(AuthGuard('jwt'))
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /** 모든 기업 목록 조회 */
  @Get()
  async getAll(): Promise<CompanyResponseDto[]> {
    const companies = await this.companyService.findAll()
    return companies.map((c) => this.toResponse(c))
  }

  /** ID로 기업 조회 (시설·연혁·카테고리 포함) */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<CompanyDetailResponseDto> {
    const company = await this.companyService.findById(id)
    return this.toDetailResponse(company)
  }

  /** 기업 생성 */
  @Post()
  async create(@Body() dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    const company = await this.companyService.create(dto)
    return this.toResponse(company)
  }

  /** 기업 수정 */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const company = await this.companyService.update(id, dto)
    return this.toResponse(company)
  }

  /** 기업 삭제 */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.companyService.delete(id)
  }

  private toSummary(
    rel: { id: string; name: string } | null,
  ): CompanyRelationSummary | null {
    return rel ? { id: rel.id, name: rel.name } : null
  }

  private toResponse(c: CompanyWithRelations): CompanyResponseDto {
    // 명칭·상태·국가맥락·날짜 등 공유필드의 정본은 organization(type=COMPANY)이 보유.
    // 응답 DTO 형태는 그대로 유지해 프론트 변경 없이 organization 경유로 평탄화한다.
    const org = c.organization
    return {
      id: c.id,
      name: org.name,
      shortName: org.shortName,
      localName: org.localName,
      description: org.description,
      status: (org.status as CompanyStatusValue | null) ?? null,
      foundedAt: org.foundedDate ? org.foundedDate.toISOString() : null,
      dissolvedAt: org.dissolvedDate ? org.dissolvedDate.toISOString() : null,
      websiteUrl: org.websiteUrl,
      logoUrl: org.logoUrl,
      extra: org.extra ?? null,
      founderId: c.founderId,
      countryId: org.countryId,
      historicalCountryId: org.historicalCountryId,
      headquartersCityId: org.headquartersCityId,
      organizationId: c.organizationId,
      founder: this.toSummary(c.founder),
      country: this.toSummary(org.country),
      historicalCountry: this.toSummary(org.historicalCountry),
      headquartersCity: this.toSummary(org.headquartersCity),
      organization: { id: org.id, name: org.name },
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  private toDetailResponse(
    c: CompanyDetailWithRelations,
  ): CompanyDetailResponseDto {
    return {
      ...this.toResponse(c),
      financialCommentary: c.financialCommentary,
      facilities: c.facilities.map((f) => ({
        id: f.id,
        facilityType: (f.facilityType as FacilityTypeValue | null) ?? null,
        name: f.name,
        address: f.address,
        constructionStartDate: f.constructionStartDate
          ? f.constructionStartDate.toISOString()
          : null,
        constructionEndDate: f.constructionEndDate
          ? f.constructionEndDate.toISOString()
          : null,
        constructionBackground: f.constructionBackground,
        openedAt: f.openedAt ? f.openedAt.toISOString() : null,
        closedAt: f.closedAt ? f.closedAt.toISOString() : null,
        note: f.note,
        city: this.toSummary(f.city),
        administrativeDivision: this.toSummary(f.administrativeDivision),
      })),
      histories: c.CompanyHistory.map((h) => ({
        id: h.id,
        type: h.type,
        title: h.title,
        occurredAt: h.occurredAt ? h.occurredAt.toISOString() : null,
        content: h.content,
        note: h.note,
        stockPrice: h.stockPrice != null ? Number(h.stockPrice) : null,
        marketCap: h.marketCap != null ? Number(h.marketCap) : null,
        currency: h.currency,
        order: h.order,
      })),
      categories: c.CompanyCategoryRelation.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        categoryName: r.category.name,
        fromDate: r.fromDate ? r.fromDate.toISOString() : null,
        toDate: r.toDate ? r.toDate.toISOString() : null,
        note: r.note,
      })),
      products: c.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        productLine: p.productLine,
        description: p.description,
        announcedAt: p.announcedAt ? p.announcedAt.toISOString() : null,
        releasedAt: p.releasedAt ? p.releasedAt.toISOString() : null,
        discontinuedAt: p.discontinuedAt ? p.discontinuedAt.toISOString() : null,
        imageUrl: p.imageUrl,
        order: p.order,
      })),
      stockPoints: c.stockPoints.map((sp) => ({
        id: sp.id,
        date: sp.date.toISOString(),
        price: sp.price != null ? Number(sp.price) : null,
        marketCap: sp.marketCap != null ? Number(sp.marketCap) : null,
        revenue: sp.revenue != null ? Number(sp.revenue) : null,
        currency: sp.currency,
        source: sp.source,
        note: sp.note,
        marketNote: sp.marketNote,
      })),
      analystRatings: c.analystRatings.map((ar) => ({
        id: ar.id,
        firm: ar.firm,
        analyst: ar.analyst,
        targetPrice: ar.targetPrice != null ? Number(ar.targetPrice) : null,
        priorTargetPrice:
          ar.priorTargetPrice != null ? Number(ar.priorTargetPrice) : null,
        currency: ar.currency,
        rating: ar.rating,
        publishedAt: ar.publishedAt ? ar.publishedAt.toISOString() : null,
        reportTitle: ar.reportTitle,
        sourceUrl: ar.sourceUrl,
        note: ar.note,
        order: ar.order,
      })),
      outlooks: c.outlooks.map((ol) => ({
        id: ol.id,
        horizon: ol.horizon,
        asOf: ol.asOf ? ol.asOf.toISOString() : null,
        targetDate: ol.targetDate ? ol.targetDate.toISOString() : null,
        stance: ol.stance,
        confidence: ol.confidence,
        targetPrice: ol.targetPrice != null ? Number(ol.targetPrice) : null,
        expectedLow: ol.expectedLow != null ? Number(ol.expectedLow) : null,
        expectedHigh: ol.expectedHigh != null ? Number(ol.expectedHigh) : null,
        priorTargetPrice:
          ol.priorTargetPrice != null ? Number(ol.priorTargetPrice) : null,
        currency: ol.currency,
        rationale: ol.rationale,
        source: ol.source,
        valuationMethod: ol.valuationMethod,
        targetMultiple:
          ol.targetMultiple != null ? Number(ol.targetMultiple) : null,
        perShareBasis:
          ol.perShareBasis != null ? Number(ol.perShareBasis) : null,
        basisLabel: ol.basisLabel,
        actualPrice: ol.actualPrice != null ? Number(ol.actualPrice) : null,
        outcome: ol.outcome,
        resolvedAt: ol.resolvedAt ? ol.resolvedAt.toISOString() : null,
        order: ol.order,
        drivers: ol.drivers.map((drv) => ({
          id: drv.id,
          name: drv.name,
          role: drv.role,
          impact: drv.impact,
          importance: drv.importance,
          eventDate: drv.eventDate ? drv.eventDate.toISOString() : null,
          note: drv.note,
          order: drv.order,
        })),
        scenarios: ol.scenarios.map((sc) => ({
          id: sc.id,
          kind: sc.kind,
          targetPrice: sc.targetPrice != null ? Number(sc.targetPrice) : null,
          probability: sc.probability,
          summary: sc.summary,
          order: sc.order,
        })),
        catalysts: ol.catalysts.map((ct) => ({
          id: ct.id,
          title: ct.title,
          expectedDate: ct.expectedDate ? ct.expectedDate.toISOString() : null,
          dateConfidence: ct.dateConfidence,
          impact: ct.impact,
          note: ct.note,
          order: ct.order,
        })),
      })),
    }
  }
}
