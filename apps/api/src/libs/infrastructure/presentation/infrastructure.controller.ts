import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

function toJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value == null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue)
}

export type InfrastructureType = 'highway' | 'railway' | 'airport' | 'port'

export type InfrastructureResponseDto = {
  id: string
  countryId: string
  type: InfrastructureType
  name: string
  localName: string | null
  code: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  lengthKm: number | null
  capacity: string | null
  operatorName: string | null
  openedYear: number | null
  attributes: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type CreateInfrastructureDto = {
  countryId: string
  type: InfrastructureType
  name: string
  localName?: string | null
  code?: string | null
  region?: string | null
  latitude?: number | null
  longitude?: number | null
  lengthKm?: number | null
  capacity?: string | null
  operatorName?: string | null
  openedYear?: number | null
  attributes?: Record<string, unknown> | null
}

export type UpdateInfrastructureDto = Partial<
  Omit<CreateInfrastructureDto, 'countryId'>
>

function toResponse(row: {
  id: string
  countryId: string
  type: string
  name: string
  localName: string | null
  code: string | null
  region: string | null
  latitude: unknown
  longitude: unknown
  lengthKm: unknown
  capacity: string | null
  operatorName: string | null
  openedYear: number | null
  attributes: unknown
  createdAt: Date
  updatedAt: Date
}): InfrastructureResponseDto {
  return {
    id: row.id,
    countryId: row.countryId,
    type: row.type as InfrastructureType,
    name: row.name,
    localName: row.localName,
    code: row.code,
    region: row.region,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    lengthKm: row.lengthKm == null ? null : Number(row.lengthKm),
    capacity: row.capacity,
    operatorName: row.operatorName,
    openedYear: row.openedYear,
    attributes:
      row.attributes == null
        ? null
        : (row.attributes as Record<string, unknown>),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@ApiTags('infrastructures')
@Controller('infrastructures')
export class InfrastructureController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 인프라 항목 목록 조회
   * GET /infrastructures?countryId=xxx&type=highway
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('type') type?: InfrastructureType,
  ): Promise<InfrastructureResponseDto[]> {
    const rows = await this.prisma.infrastructure.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    return rows.map(toResponse)
  }

  /** ID 단건 조회 */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<InfrastructureResponseDto> {
    const row = await this.prisma.infrastructure.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('인프라 항목을 찾을 수 없습니다')
    return toResponse(row)
  }

  /** 등록 */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateInfrastructureDto,
  ): Promise<InfrastructureResponseDto> {
    const row = await this.prisma.infrastructure.create({
      data: {
        countryId: dto.countryId,
        type: dto.type,
        name: dto.name,
        localName: dto.localName ?? null,
        code: dto.code ?? null,
        region: dto.region ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        lengthKm: dto.lengthKm ?? null,
        capacity: dto.capacity ?? null,
        operatorName: dto.operatorName ?? null,
        openedYear: dto.openedYear ?? null,
        attributes: toJsonInput(dto.attributes),
      },
    })
    return toResponse(row)
  }

  /** 수정 */
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInfrastructureDto,
  ): Promise<InfrastructureResponseDto> {
    const exists = await this.prisma.infrastructure.findUnique({
      where: { id },
    })
    if (!exists) throw new NotFoundException('인프라 항목을 찾을 수 없습니다')

    const row = await this.prisma.infrastructure.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.localName !== undefined ? { localName: dto.localName } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.lengthKm !== undefined ? { lengthKm: dto.lengthKm } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.operatorName !== undefined
          ? { operatorName: dto.operatorName }
          : {}),
        ...(dto.openedYear !== undefined
          ? { openedYear: dto.openedYear }
          : {}),
        ...(dto.attributes !== undefined
          ? { attributes: toJsonInput(dto.attributes) }
          : {}),
      },
    })
    return toResponse(row)
  }

  /** 삭제 */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    const exists = await this.prisma.infrastructure.findUnique({
      where: { id },
    })
    if (!exists) throw new NotFoundException('인프라 항목을 찾을 수 없습니다')
    await this.prisma.infrastructure.delete({ where: { id } })
  }
}
