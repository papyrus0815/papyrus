import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'

import { AdministrationDepartmentService } from '../application/administration-department.service'
import {
  type AdministrationDepartmentCategoryDto,
  type AdministrationDepartmentResponseDto,
  CreateAdministrationDepartmentCategoryBody,
  CreateAdministrationDepartmentDto,
  CreateDepartmentTransitionDto,
  type DepartmentEventLinkDto,
  UpdateAdministrationDepartmentCategoryBody,
  UpdateAdministrationDepartmentDto,
  UpdateDepartmentTransitionDto,
} from './dto/administration-department.dto'

export type {
  AdministrationDepartmentCategoryDto,
  AdministrationDepartmentMilitaryUnitDto,
  AdministrationDepartmentResponseDto,
  DepartmentEventLinkDto,
  DepartmentLineageDto,
  DepartmentRefDto,
} from './dto/administration-department.dto'

/**
 * 국가 기관(부처·외청·군 최고사령부·총독부·궁내) API.
 * 로직은 AdministrationDepartmentService — 2026-11-08 재설계 때 컨트롤러가 DB를 직접 다루던 것을 분리했다.
 */
@ApiTags('administration-departments')
@Controller('administration-departments')
@UseGuards(AuthGuard('jwt'))
export class AdministrationDepartmentController {
  constructor(private readonly departments: AdministrationDepartmentService) {}

  // ─── 카테고리 ───────────────────────────────────────────────────────────

  /** 전세계 공통 기관 분류 목록 (국방·외교·재정 등) */
  @Get('categories')
  async getCategories(): Promise<AdministrationDepartmentCategoryDto[]> {
    return this.departments.listCategories()
  }

  @Post('categories')
  async createCategory(
    @Body() body: CreateAdministrationDepartmentCategoryBody,
  ): Promise<AdministrationDepartmentCategoryDto> {
    return this.departments.createCategory(body)
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateAdministrationDepartmentCategoryBody,
  ): Promise<AdministrationDepartmentCategoryDto> {
    return this.departments.updateCategory(id, body)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.departments.deleteCategory(id)
  }

  // ─── 계보 (':id' 라우트보다 먼저) ──────────────────────────────────────

  /** 계보 수정 — 이어진 방식·시점·메모 */
  @Patch('transitions/:transitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateTransition(
    @Param('transitionId') transitionId: string,
    @Body() body: UpdateDepartmentTransitionDto,
  ): Promise<void> {
    await this.departments.updateTransition(transitionId, body)
  }

  @Delete('transitions/:transitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTransition(@Param('transitionId') transitionId: string): Promise<void> {
    await this.departments.deleteTransition(transitionId)
  }

  // ─── 기관 ───────────────────────────────────────────────────────────────

  /**
   * 목록 — countryId·historicalCountryId(둘 다 주면 AND), search(이름·원어명·영문명·약칭), kind, take
   */
  @Get()
  async getAll(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('search') search?: string,
    @Query('kind') kind?: string,
    @Query('take') take?: string,
  ): Promise<AdministrationDepartmentResponseDto[]> {
    const parsedTake = take ? parseInt(take, 10) : undefined
    return this.departments.list({
      countryId,
      historicalCountryId,
      search,
      kind,
      take: Number.isFinite(parsedTake) ? parsedTake : undefined,
    })
  }

  /** 현대 국가의 기관 — 연결된 역사국가 소속 기관까지 */
  @Get('country/:countryId')
  async getByCountryId(@Param('countryId') countryId: string): Promise<AdministrationDepartmentResponseDto[]> {
    return this.departments.listByCountry(countryId)
  }

  /** 이 기관이 관여한 사건(발령·수령·주체·관여) */
  @Get(':id/events')
  async getDepartmentEvents(@Param('id') id: string): Promise<DepartmentEventLinkDto[]> {
    return this.departments.listEvents(id)
  }

  /** 기관별 역대 재임(장관·총장) */
  @Get(':id/tenures')
  async getTenuresByDepartmentId(@Param('id') id: string): Promise<any[]> {
    return this.departments.listTenures(id)
  }

  /** 계보 추가 — :id(앞 기관) → successorId(뒤 기관) */
  @Post(':id/transitions')
  async addTransition(
    @Param('id') id: string,
    @Body() body: CreateDepartmentTransitionDto,
  ): Promise<AdministrationDepartmentResponseDto> {
    return this.departments.addTransition(id, body)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<AdministrationDepartmentResponseDto | null> {
    return this.departments.getById(id)
  }

  @Post()
  async create(@Body() body: CreateAdministrationDepartmentDto): Promise<AdministrationDepartmentResponseDto> {
    return this.departments.create(body)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateAdministrationDepartmentDto,
  ): Promise<AdministrationDepartmentResponseDto> {
    return this.departments.update(id, body)
  }

  /** 삭제 — 하위 기관·재임·군 부대·사건 연결이 하나라도 있으면 409 */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.departments.delete(id)
  }
}
