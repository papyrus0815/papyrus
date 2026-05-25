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
import { CompanyCategoryService } from '../application/company-category.service'
import type { CompanyCategoryWithRelations } from '../infrastructure/company-category.repository'
import {
  CreateCompanyCategoryDto,
  UpdateCompanyCategoryDto,
  CompanyCategoryResponseDto,
} from './dto'

/**
 * 기업 카테고리 관리 컨트롤러 (admin CRUD)
 */
@ApiTags('company-categories')
@Controller('company-categories')
export class CompanyCategoryController {
  constructor(
    private readonly companyCategoryService: CompanyCategoryService,
  ) {}

  /** 모든 카테고리 목록 조회 */
  @Get()
  async getAll(): Promise<CompanyCategoryResponseDto[]> {
    const categories = await this.companyCategoryService.findAll()
    return categories.map((c) => this.toResponse(c))
  }

  /** ID로 카테고리 조회 */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<CompanyCategoryResponseDto> {
    const category = await this.companyCategoryService.findById(id)
    return this.toResponse(category)
  }

  /** 카테고리 생성 */
  @Post()
  async create(
    @Body() dto: CreateCompanyCategoryDto,
  ): Promise<CompanyCategoryResponseDto> {
    const category = await this.companyCategoryService.create(dto)
    return this.toResponse(category)
  }

  /** 카테고리 수정 */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyCategoryDto,
  ): Promise<CompanyCategoryResponseDto> {
    const category = await this.companyCategoryService.update(id, dto)
    return this.toResponse(category)
  }

  /** 카테고리 삭제 */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.companyCategoryService.delete(id)
  }

  private toResponse(
    c: CompanyCategoryWithRelations,
  ): CompanyCategoryResponseDto {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentId: c.parentId,
      parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
      childrenCount: c._count.children,
      companyCount: c._count.companies,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }
}
