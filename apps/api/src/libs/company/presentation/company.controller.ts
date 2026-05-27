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
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
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
    return {
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      localName: c.localName,
      description: c.description,
      status: (c.status as CompanyStatusValue | null) ?? null,
      foundedAt: c.foundedAt ? c.foundedAt.toISOString() : null,
      dissolvedAt: c.dissolvedAt ? c.dissolvedAt.toISOString() : null,
      websiteUrl: c.websiteUrl,
      logoUrl: c.logoUrl,
      extra: c.extra ?? null,
      founderId: c.founderId,
      countryId: c.countryId,
      historicalCountryId: c.historicalCountryId,
      headquartersCityId: c.headquartersCityId,
      organizationId: c.organizationId,
      founder: this.toSummary(c.founder),
      country: this.toSummary(c.country),
      historicalCountry: this.toSummary(c.historicalCountry),
      headquartersCity: this.toSummary(c.headquartersCity),
      organization: this.toSummary(c.organization),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  private toDetailResponse(
    c: CompanyDetailWithRelations,
  ): CompanyDetailResponseDto {
    return {
      ...this.toResponse(c),
      facilities: c.facilities.map((f) => ({
        id: f.id,
        facilityType: (f.facilityType as FacilityTypeValue | null) ?? null,
        name: f.name,
        address: f.address,
        openedAt: f.openedAt ? f.openedAt.toISOString() : null,
        closedAt: f.closedAt ? f.closedAt.toISOString() : null,
        note: f.note,
        city: this.toSummary(f.city),
      })),
      histories: c.CompanyHistory.map((h) => ({
        id: h.id,
        title: h.title,
        occurredAt: h.occurredAt ? h.occurredAt.toISOString() : null,
        content: h.content,
        note: h.note,
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
    }
  }
}
