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

export type AdministrationDepartmentResponseDto = {
  id: string
  name: string
  thumbnailUrl: string | null
  countryId: string
  parentId: string | null
  categoryId: string | null
  category: AdministrationDepartmentCategoryDto | null
  description: string | null
  establishedDate: string | null
  abolishedDate: string | null
  successorId: string | null
  successor: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type CreateAdministrationDepartmentDto = {
  name: string
  countryId: string
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

@ApiTags('administration-departments')
@Controller('administration-departments')
@UseGuards(AuthGuard('jwt'))
export class AdministrationDepartmentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private toResponse(row: {
    id: string
    name: string
    thumbnailUrl: string | null
    countryId: string
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
  }): AdministrationDepartmentResponseDto {
    return {
      id: row.id,
      name: row.name,
      thumbnailUrl: row.thumbnailUrl ?? null,
      countryId: row.countryId,
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
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
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
    @Body() body: { name: string; nameEn?: string | null },
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
    @Body() body: { name?: string; nameEn?: string | null },
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
   * 전체 행정부처 목록 조회 (선택: countryId로 필터)
   */
  @Get()
  async getAll(
    @Query('countryId') countryId?: string,
  ): Promise<AdministrationDepartmentResponseDto[]> {
    const list = await this.prisma.administrationDepartment.findMany({
      where: countryId ? { countryId } : undefined,
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
      include: { category: true, successor: { select: { id: true, name: true } } },
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
      include: { category: true, successor: { select: { id: true, name: true } } },
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
   * 단건 조회
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
  ): Promise<AdministrationDepartmentResponseDto | null> {
    const row = await this.prisma.administrationDepartment.findUnique({
      where: { id },
      include: { category: true, successor: { select: { id: true, name: true } } },
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
   * 행정부처 생성 (동일 국가·동일 카테고리 중복 불가)
   */
  @Post()
  async create(
    @Body() body: CreateAdministrationDepartmentDto,
  ): Promise<AdministrationDepartmentResponseDto> {
    if (body.categoryId) {
      const existing = await this.prisma.administrationDepartment.findFirst({
        where: { countryId: body.countryId, categoryId: body.categoryId },
      })
      if (existing) {
        throw new ConflictException('이미 해당 카테고리에 부처가 등록되어 있습니다. 카테고리당 한 부처만 등록할 수 있습니다.')
      }
    }
    const row = await this.prisma.administrationDepartment.create({
      data: {
        name: body.name,
        countryId: body.countryId,
        parentId: body.parentId ?? undefined,
        categoryId: body.categoryId ?? undefined,
        thumbnailUrl: body.thumbnailUrl ?? undefined,
        description: body.description ?? undefined,
        establishedDate: body.establishedDate ? new Date(body.establishedDate) : undefined,
        abolishedDate: body.abolishedDate ? new Date(body.abolishedDate) : undefined,
        successorId: body.successorId ?? undefined,
      },
      include: { category: true, successor: { select: { id: true, name: true } } },
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
   * 행정부처 수정 (동일 국가·동일 카테고리 중복 불가)
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
    if (body.categoryId !== undefined && body.categoryId !== current.categoryId) {
      const existing = await this.prisma.administrationDepartment.findFirst({
        where: { countryId: current.countryId, categoryId: body.categoryId },
      })
      if (existing) {
        throw new ConflictException('이미 해당 카테고리에 부처가 등록되어 있습니다. 카테고리당 한 부처만 등록할 수 있습니다.')
      }
    }
    const row = await this.prisma.administrationDepartment.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.establishedDate !== undefined && { establishedDate: body.establishedDate ? new Date(body.establishedDate) : null }),
        ...(body.abolishedDate !== undefined && { abolishedDate: body.abolishedDate ? new Date(body.abolishedDate) : null }),
        ...(body.successorId !== undefined && { successorId: body.successorId }),
      },
      include: { category: true, successor: { select: { id: true, name: true } } },
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
