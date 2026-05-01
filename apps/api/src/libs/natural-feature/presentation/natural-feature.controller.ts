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

export type NaturalFeatureType = 'mountain' | 'river' | 'lake' | 'coast'

export type NaturalFeatureResponseDto = {
  id: string
  countryId: string
  type: NaturalFeatureType
  name: string
  localName: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  heightM: number | null
  lengthKm: number | null
  areaSqKm: number | null
  isProtected: boolean
  attributes: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type CreateNaturalFeatureDto = {
  countryId: string
  type: NaturalFeatureType
  name: string
  localName?: string | null
  region?: string | null
  latitude?: number | null
  longitude?: number | null
  heightM?: number | null
  lengthKm?: number | null
  areaSqKm?: number | null
  isProtected?: boolean
  attributes?: Record<string, unknown> | null
}

export type UpdateNaturalFeatureDto = Partial<
  Omit<CreateNaturalFeatureDto, 'countryId'>
>

function toResponse(row: {
  id: string
  countryId: string
  type: string
  name: string
  localName: string | null
  region: string | null
  latitude: unknown
  longitude: unknown
  heightM: number | null
  lengthKm: unknown
  areaSqKm: unknown
  isProtected: boolean
  attributes: unknown
  createdAt: Date
  updatedAt: Date
}): NaturalFeatureResponseDto {
  return {
    id: row.id,
    countryId: row.countryId,
    type: row.type as NaturalFeatureType,
    name: row.name,
    localName: row.localName,
    region: row.region,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    heightM: row.heightM,
    lengthKm: row.lengthKm == null ? null : Number(row.lengthKm),
    areaSqKm: row.areaSqKm == null ? null : Number(row.areaSqKm),
    isProtected: row.isProtected,
    attributes:
      row.attributes == null
        ? null
        : (row.attributes as Record<string, unknown>),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@ApiTags('natural-features')
@Controller('natural-features')
export class NaturalFeatureController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 자연 지리 항목 목록 조회
   * GET /natural-features?countryId=xxx&type=mountain
   */
  @Get()
  async list(
    @Query('countryId') countryId?: string,
    @Query('type') type?: NaturalFeatureType,
  ): Promise<NaturalFeatureResponseDto[]> {
    const rows = await this.prisma.naturalFeature.findMany({
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
  async getById(@Param('id') id: string): Promise<NaturalFeatureResponseDto> {
    const row = await this.prisma.naturalFeature.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('자연 지리 항목을 찾을 수 없습니다')
    return toResponse(row)
  }

  /** 등록 */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateNaturalFeatureDto,
  ): Promise<NaturalFeatureResponseDto> {
    const row = await this.prisma.naturalFeature.create({
      data: {
        countryId: dto.countryId,
        type: dto.type,
        name: dto.name,
        localName: dto.localName ?? null,
        region: dto.region ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        heightM: dto.heightM ?? null,
        lengthKm: dto.lengthKm ?? null,
        areaSqKm: dto.areaSqKm ?? null,
        isProtected: dto.isProtected ?? false,
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
    @Body() dto: UpdateNaturalFeatureDto,
  ): Promise<NaturalFeatureResponseDto> {
    const exists = await this.prisma.naturalFeature.findUnique({
      where: { id },
    })
    if (!exists) throw new NotFoundException('자연 지리 항목을 찾을 수 없습니다')

    const row = await this.prisma.naturalFeature.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.localName !== undefined ? { localName: dto.localName } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.heightM !== undefined ? { heightM: dto.heightM } : {}),
        ...(dto.lengthKm !== undefined ? { lengthKm: dto.lengthKm } : {}),
        ...(dto.areaSqKm !== undefined ? { areaSqKm: dto.areaSqKm } : {}),
        ...(dto.isProtected !== undefined
          ? { isProtected: dto.isProtected }
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
    const exists = await this.prisma.naturalFeature.findUnique({
      where: { id },
    })
    if (!exists) throw new NotFoundException('자연 지리 항목을 찾을 수 없습니다')
    await this.prisma.naturalFeature.delete({ where: { id } })
  }
}
