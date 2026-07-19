import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { EventMethod } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { NotificationService } from '../../notification/application/notification.service'

export type AdministrationDepartmentCategoryDto = {
  id: string
  name: string
  nameEn: string | null
}

/** 이 부처에 `administrationDepartmentId`로 연결된 군사 부대 요약 */
export type AdministrationDepartmentMilitaryUnitDto = {
  id: string
  name: string
  unitType: string | null
}

export type AdministrationDepartmentResponseDto = {
  id: string
  name: string
  thumbnailUrl: string | null
  countryId: string | null
  /** 역사적 국가 ID (조선 6조 등). 현대 국가와 동시 보유 가능 — 표시/그룹핑은 countryId, 정체성은 이쪽이 우선 */
  historicalCountryId: string | null
  parentId: string | null
  categoryId: string | null
  category: AdministrationDepartmentCategoryDto | null
  description: string | null
  establishedDate: string | null
  abolishedDate: string | null
  successorId: string | null
  successor: { id: string; name: string } | null
  /** 군부대(MilitaryUnit) FK 역방향 — 국방부 등과 부대 트리 매핑 */
  militaryUnits: AdministrationDepartmentMilitaryUnitDto[]
  createdAt: string
  updatedAt: string
}

export type CreateAdministrationDepartmentDto = {
  name: string
  /** 현대 국가 ID. historicalCountryId와 함께 채울 수 있음(표시/그룹핑용) */
  countryId?: string | null
  /** 역사적 국가 ID (조선 6조 등) */
  historicalCountryId?: string | null
  parentId?: string | null
  categoryId?: string | null
  thumbnailUrl?: string | null
  description?: string | null
  establishedDate?: string | null
  abolishedDate?: string | null
  successorId?: string | null
}

export type UpdateAdministrationDepartmentDto = {
  name?: string
  countryId?: string | null
  historicalCountryId?: string | null
  parentId?: string | null
  categoryId?: string | null
  thumbnailUrl?: string | null
  description?: string | null
  establishedDate?: string | null
  abolishedDate?: string | null
  successorId?: string | null
}

// 기관 계획·조율·변경 (사건처럼 시간순 기록). 첨부는 Attachment(ownerType=ADMINISTRATION_DEPARTMENT_EVENT)로.
export type AdministrationDepartmentEventDto = {
  id: string
  departmentId: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  eventType: string
  background: string | null
  aftermath: string | null
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAdministrationDepartmentEventDto = {
  departmentId: string
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  eventType?: string
  background?: string | null
  aftermath?: string | null
  thumbnailUrl?: string | null
}

export type UpdateAdministrationDepartmentEventDto = {
  title?: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  eventType?: string
  background?: string | null
  aftermath?: string | null
  thumbnailUrl?: string | null
}

export interface CreateAdministrationDepartmentCategoryBody {
  name: string
  nameEn?: string | null
}

export interface UpdateAdministrationDepartmentCategoryBody {
  name?: string
  nameEn?: string | null
}

@ApiTags('administration-departments')
@Controller('administration-departments')
@UseGuards(AuthGuard('jwt'))
export class AdministrationDepartmentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private readonly departmentInclude = {
    category: true,
    successor: { select: { id: true, name: true } },
    militaryUnits: {
      select: { id: true, name: true, unitType: true },
      orderBy: { name: 'asc' as const },
    },
  } as const

  private toResponse(row: {
    id: string
    name: string
    thumbnailUrl: string | null
    countryId: string | null
    historicalCountryId: string | null
    parentId: string | null
    categoryId: string | null
    description: string | null
    establishedDate: Date | null
    abolishedDate: Date | null
    successorId: string | null
    createdAt: Date
    updatedAt: Date
    category?: { id: string; name: string; nameEn: string | null } | null
    successor?: { id: string; name: string } | null
    militaryUnits?: Array<{ id: string; name: string; unitType: string | null }>
  }): AdministrationDepartmentResponseDto {
    return {
      id: row.id,
      name: row.name,
      thumbnailUrl: row.thumbnailUrl ?? null,
      countryId: row.countryId ?? null,
      historicalCountryId: row.historicalCountryId ?? null,
      parentId: row.parentId ?? null,
      categoryId: row.categoryId ?? null,
      category: row.category
        ? { id: row.category.id, name: row.category.name, nameEn: row.category.nameEn ?? null }
        : null,
      description: row.description ?? null,
      establishedDate: row.establishedDate ? row.establishedDate.toISOString() : null,
      abolishedDate: row.abolishedDate ? row.abolishedDate.toISOString() : null,
      successorId: row.successorId ?? null,
      successor: row.successor ? { id: row.successor.id, name: row.successor.name } : null,
      militaryUnits: (row.militaryUnits ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        unitType: u.unitType ?? null,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  /**
   * 국가 축 검증 — 정책: **엄격 XOR이 아니라 "적어도 하나 필수 + 역사 우선"**.
   *
   * 조약 서명국(TreatySignatory)은 현대/역사 동시 지정을 금지하지만, 부처는 스키마 주석
   * (country.prisma `countryId`)이 "역사적 국가 부처도 연결된 현대 국가를 넣을 수 있음"이라며
   * dual-fill을 명시적으로 허용한다(조선 6조를 대한민국 그룹 아래 묶어 보여주는 용도).
   * 따라서 동시 지정은 허용하고, 둘 다 비면 어느 국가 그룹에도 속하지 못하는 고아 부처가
   * 되므로 400으로 막는다. 둘 다 있을 때 부처의 정체성 축은 historicalCountryId(역사 우선)이며
   * countryId는 표시/그룹핑 보조 축으로 해석한다.
   */
  private validateCountryAxis(input: {
    countryId?: string | null
    historicalCountryId?: string | null
  }): void {
    if (!input.countryId && !input.historicalCountryId) {
      throw new BadRequestException(
        '소속 국가(현대 또는 역사적 국가) 중 하나는 반드시 지정해야 합니다.',
      )
    }
  }

  /**
   * 전세계 공통 부처 카테고리 목록 (국방·외교·재정 등)
   */
  @Get('categories')
  async getCategories(): Promise<AdministrationDepartmentCategoryDto[]> {
    const list = await this.prisma.administrationDepartmentCategory.findMany({
      orderBy: { name: 'asc' },
    })
    return list.map((c) => ({ id: c.id, name: c.name, nameEn: c.nameEn ?? null }))
  }

  /**
   * 부처 카테고리 생성
   */
  @Post('categories')
  async createCategory(
    @Body() body: CreateAdministrationDepartmentCategoryBody,
  ): Promise<AdministrationDepartmentCategoryDto> {
    const row = await this.prisma.administrationDepartmentCategory.create({
      data: { name: body.name, nameEn: body.nameEn ?? undefined },
    })
    return { id: row.id, name: row.name, nameEn: row.nameEn ?? null }
  }

  /**
   * 부처 카테고리 수정
   */
  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateAdministrationDepartmentCategoryBody,
  ): Promise<AdministrationDepartmentCategoryDto> {
    const row = await this.prisma.administrationDepartmentCategory.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
      },
    })
    return { id: row.id, name: row.name, nameEn: row.nameEn ?? null }
  }

  /**
   * 부처 카테고리 삭제
   */
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.prisma.administrationDepartmentCategory.delete({ where: { id } })
  }

  /**
   * 전체 행정부처 목록 조회 (선택: countryId / historicalCountryId로 필터)
   */
  @Get()
  async getAll(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<AdministrationDepartmentResponseDto[]> {
    // 두 축을 동시에 주면 AND(둘 다 만족하는 dual-fill 부처만)
    const where = {
      ...(countryId ? { countryId } : {}),
      ...(historicalCountryId ? { historicalCountryId } : {}),
    }
    const list = await this.prisma.administrationDepartment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
      include: this.departmentInclude,
    })
    return list.map((row) => this.toResponse(row))
  }

  /**
   * 국가별 행정부처 목록 조회
   */
  @Get('country/:countryId')
  async getByCountryId(
    @Param('countryId') countryId: string,
  ): Promise<AdministrationDepartmentResponseDto[]> {
    const list = await this.prisma.administrationDepartment.findMany({
      where: { countryId },
      orderBy: { name: 'asc' },
      include: this.departmentInclude,
    })
    return list.map((row) => this.toResponse(row))
  }

  /**
   * 기관별 계획·조율·변경 목록 (사건처럼 시간순)
   */
  @Get(':departmentId/events')
  async getDepartmentEvents(
    @Param('departmentId') departmentId: string,
  ): Promise<AdministrationDepartmentEventDto[]> {
    const list = await this.prisma.administrationDepartmentEvent.findMany({
      where: { departmentId },
      orderBy: { startDate: 'asc' },
    })
    return list.map((row) => this.toEventResponse(row))
  }

  /**
   * 부처별 역대 장관(재임) — 이 부처에 직접 연결된 재임 목록
   */
  @Get(':id/tenures')
  async getTenuresByDepartmentId(
    @Param('id') id: string,
  ): Promise<any[]> {
    const list = await this.prisma.governmentPositionTenure.findMany({
      where: {
        administrationDepartmentId: id,
      },
      orderBy: { startDate: 'desc' },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            middleName: true,
            nameDisplayOrder: true,
            birthEra: true,
            deathEra: true,
            birthDate: true,
            deathDate: true,
            birthCityId: true,
            birthAdminDivisionId: true,
            birthPlaceText: true,
            birthCity: { select: { id: true, name: true } },
            birthAdminDivision: { select: { id: true, name: true } },
            country: {
              select: {
                id: true,
                name: true,
                flagEmoji: true,
                isoCode: true,
                defaultNameDisplayOrder: true,
              },
            },
          },
        },
        positionDefinition: { select: { id: true, title: true, positionType: true } },
        country: { select: { id: true, name: true } },
        historicalCountry: { select: { id: true, name: true } },
      },
    })
    return list.map((row) => ({
      id: row.id,
      termNumber: row.termNumber,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      title: row.title,
      positionDefinition: (row as any).positionDefinition,
      person: (row as any).person,
      country: (row as any).country,
      historicalCountry: (row as any).historicalCountry,
    }))
  }

  /**
   * 단건 조회
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
  ): Promise<AdministrationDepartmentResponseDto | null> {
    const row = await this.prisma.administrationDepartment.findUnique({
      where: { id },
      include: this.departmentInclude,
    })
    return row ? this.toResponse(row) : null
  }

  private toEventResponse(row: {
    id: string
    departmentId: string
    title: string
    description: string | null
    startDate: Date | null
    endDate: Date | null
    eventType: string
    background: string | null
    aftermath: string | null
    thumbnailUrl: string | null
    createdAt: Date
    updatedAt: Date
  }): AdministrationDepartmentEventDto {
    return {
      id: row.id,
      departmentId: row.departmentId,
      title: row.title,
      description: row.description ?? null,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      eventType: row.eventType,
      background: row.background ?? null,
      aftermath: row.aftermath ?? null,
      thumbnailUrl: row.thumbnailUrl ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  /**
   * 기관 계획·조율 이벤트 생성
   */
  @Post('events')
  async createEvent(
    @Body() body: CreateAdministrationDepartmentEventDto,
  ): Promise<AdministrationDepartmentEventDto> {
    const row = await this.prisma.administrationDepartmentEvent.create({
      data: {
        departmentId: body.departmentId,
        title: body.title,
        description: body.description ?? undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        eventType: (body.eventType as any) ?? 'OTHER',
        background: body.background ?? undefined,
        aftermath: body.aftermath ?? undefined,
        thumbnailUrl: body.thumbnailUrl ?? undefined,
      },
    })
    return this.toEventResponse(row)
  }

  /**
   * 기관 이벤트 수정
   */
  @Patch('events/:eventId')
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() body: UpdateAdministrationDepartmentEventDto,
  ): Promise<AdministrationDepartmentEventDto> {
    const row = await this.prisma.administrationDepartmentEvent.update({
      where: { id: eventId },
      data: {
        ...(body.title != null && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.eventType !== undefined && { eventType: body.eventType as any }),
        ...(body.background !== undefined && { background: body.background }),
        ...(body.aftermath !== undefined && { aftermath: body.aftermath }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
      },
    })
    return this.toEventResponse(row)
  }

  /**
   * 기관 이벤트 삭제
   */
  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('eventId') eventId: string): Promise<void> {
    await this.prisma.administrationDepartmentEvent.delete({ where: { id: eventId } })
  }

  /**
   * 행정부처 생성 (동일 카테고리에 여러 부처 허용)
   */
  @Post()
  async create(
    @Body() body: CreateAdministrationDepartmentDto,
  ): Promise<AdministrationDepartmentResponseDto> {
    this.validateCountryAxis(body)
    const row = await this.prisma.administrationDepartment.create({
      data: {
        name: body.name,
        countryId: body.countryId ?? undefined,
        historicalCountryId: body.historicalCountryId ?? undefined,
        parentId: body.parentId ?? undefined,
        categoryId: body.categoryId ?? undefined,
        thumbnailUrl: body.thumbnailUrl ?? undefined,
        description: body.description ?? undefined,
        establishedDate: body.establishedDate ? new Date(body.establishedDate) : undefined,
        abolishedDate: body.abolishedDate ? new Date(body.abolishedDate) : undefined,
        successorId: body.successorId ?? undefined,
      },
      include: this.departmentInclude,
    })
    await this.notificationService.notifyAdministrationDepartment(
      row.name,
      EventMethod.CREATE,
      row.id,
      row.category?.name ?? undefined,
    )
    return this.toResponse(row)
  }

  /**
   * 행정부처 수정 (동일 카테고리에 여러 부처 허용)
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateAdministrationDepartmentDto,
  ): Promise<AdministrationDepartmentResponseDto> {
    const current = await this.prisma.administrationDepartment.findUnique({ where: { id } })
    if (!current) {
      throw new NotFoundException('부처를 찾을 수 없습니다.')
    }
    // 부분 수정이므로 병합 결과로 검증 (한 축만 비우는 요청이 고아를 만들지 않도록)
    this.validateCountryAxis({
      countryId:
        body.countryId !== undefined ? body.countryId : current.countryId,
      historicalCountryId:
        body.historicalCountryId !== undefined
          ? body.historicalCountryId
          : current.historicalCountryId,
    })
    const row = await this.prisma.administrationDepartment.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.historicalCountryId !== undefined && {
          historicalCountryId: body.historicalCountryId,
        }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.establishedDate !== undefined && { establishedDate: body.establishedDate ? new Date(body.establishedDate) : null }),
        ...(body.abolishedDate !== undefined && { abolishedDate: body.abolishedDate ? new Date(body.abolishedDate) : null }),
        ...(body.successorId !== undefined && { successorId: body.successorId }),
      },
      include: this.departmentInclude,
    })
    await this.notificationService.notifyAdministrationDepartment(
      row.name,
      EventMethod.UPDATE,
      row.id,
      row.category?.name ?? undefined,
    )
    return this.toResponse(row)
  }

  /**
   * 행정부처 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    const row = await this.prisma.administrationDepartment.findUnique({
      where: { id },
      include: { category: true },
    })
    if (row) {
      await this.notificationService.notifyAdministrationDepartment(
        row.name,
        EventMethod.DELETE,
        row.id,
        row.category?.name ?? undefined,
      )
    }
    await this.prisma.administrationDepartment.delete({
      where: { id },
    })
  }
}
