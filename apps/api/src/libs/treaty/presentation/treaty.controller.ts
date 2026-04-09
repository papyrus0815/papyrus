import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import {
  AddTreatyImageBodyDto,
  CreateTreatyBodyDto,
  CreateTreatySignatoryBodyDto,
  CreateTreatyTermBodyDto,
  FindTreatiesQueryDto,
  UpdateTreatyBodyDto,
  UpdateTreatySignatoryBodyDto,
  UpdateTreatyTermBodyDto,
  type CreateTreatySignatoryNestedDto,
} from './dto/treaty.dto'

/** 서명국 단건 응답용 include (목록 TREATY_INCLUDE.signatories 와 동일) */
const TREATY_SIGNATORY_INCLUDE = {
  country: {
    select: { id: true, name: true, flagEmoji: true, thumbnailUrl: true },
  },
  historicalCountry: {
    select: { id: true, name: true, thumbnailUrl: true },
  },
  person: { select: { id: true, name: true, surname: true, profileImageUrl: true } },
  positionDefinition: {
    select: { id: true, title: true, positionType: true, titleEn: true },
  },
  cabinet: {
    select: {
      id: true,
      name: true,
      headTenure: {
        select: {
          termNumber: true,
          subTermNumber: true,
          regnalNumber: true,
          person: { select: { id: true, name: true, surname: true } },
        },
      },
    },
  },
} as const

const TREATY_INCLUDE = {
  signingAdministrativeDivision: {
    select: { id: true, name: true, localName: true },
  },
  signatories: {
    include: TREATY_SIGNATORY_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
  terms: {
    orderBy: { order: 'asc' as const },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
  },
}

function serializeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj.toISOString()
  if (typeof obj === 'bigint') return obj.toString()
  if (Array.isArray(obj)) return obj.map(serializeDates)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj as Record<string, unknown>) {
      result[key] = serializeDates((obj as Record<string, unknown>)[key])
    }
    return result
  }
  return obj
}

function utcDayRange(signDateIso: string): { gte: Date; lt: Date } {
  const sd = new Date(signDateIso)
  if (Number.isNaN(sd.getTime())) {
    throw new BadRequestException('서명일 형식이 올바르지 않습니다.')
  }
  const gte = new Date(
    Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate()),
  )
  const lt = new Date(gte)
  lt.setUTCDate(lt.getUTCDate() + 1)
  return { gte, lt }
}

@ApiTags('treaties')
@Controller('treaties')
export class TreatyController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAdministrativeDivisionExists(id: string | null | undefined): Promise<void> {
    if (!id) return
    const row = await this.prisma.administrativeDivision.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!row) {
      throw new BadRequestException('서명 장소 행정구역을 찾을 수 없습니다.')
    }
  }

  private async assertPositionDefinitionExists(id: string | null | undefined): Promise<void> {
    if (!id) return
    const row = await this.prisma.governmentPositionDefinition.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!row) {
      throw new BadRequestException('관직 정의를 찾을 수 없습니다.')
    }
  }

  private validateSignatoryCountryXor(
    s: Pick<
      CreateTreatySignatoryNestedDto | CreateTreatySignatoryBodyDto,
      'countryId' | 'historicalCountryId'
    >,
  ): void {
    if (s.countryId && s.historicalCountryId) {
      throw new BadRequestException(
        '서명국에는 현대 국가와 역사적 국가를 동시에 지정할 수 없습니다.',
      )
    }
  }

  private signatoryNestedToPrismaData(
    treatyId: string,
    s: CreateTreatySignatoryNestedDto,
  ): Prisma.TreatySignatoryUncheckedCreateInput {
    return {
      treatyId,
      countryId: s.countryId ?? null,
      historicalCountryId: s.historicalCountryId ?? null,
      personId: s.personId ?? null,
      cabinetId: s.cabinetId ?? null,
      role: s.role ?? null,
      positionDefinitionId: s.positionDefinitionId ?? null,
      participationType: (s.participationType ?? 'SIGNATORY') as any,
      signedAt: s.signedAt ? new Date(s.signedAt) : null,
      note: s.note ?? null,
    } as Prisma.TreatySignatoryUncheckedCreateInput
  }

  // ────────── 조약 목록 조회 ──────────

  @Get()
  @ApiOperation({ summary: '조약 목록 (필터·검색·페이지네이션)' })
  async findAll(@Query() query: FindTreatiesQueryDto): Promise<any> {
    const parts: Prisma.TreatyWhereInput[] = []

    if (query.cabinetId) {
      parts.push({
        signatories: { some: { cabinetId: query.cabinetId } },
      })
    } else if (query.countryId || query.historicalCountryId) {
      parts.push({
        signatories: {
          some: {
            ...(query.countryId ? { countryId: query.countryId } : {}),
            ...(query.historicalCountryId
              ? { historicalCountryId: query.historicalCountryId }
              : {}),
          },
        },
      })
    }

    if (query.type) parts.push({ type: query.type })

    if (query.search?.trim()) {
      const q = query.search.trim()
      parts.push({
        OR: [{ name: { contains: q } }, { alias: { contains: q } }],
      })
    }

    const where: Prisma.TreatyWhereInput =
      parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts }

    const skip = query.skip ?? 0
    const take = query.take ?? undefined

    const [items, total] = await this.prisma.$transaction([
      this.prisma.treaty.findMany({
        where,
        include: TREATY_INCLUDE,
        orderBy: { signDate: 'desc' },
        skip,
        ...(take !== undefined ? { take } : {}),
      }),
      this.prisma.treaty.count({ where }),
    ])

    return serializeDates({ items, total })
  }

  // ────────── 조약 단건 조회 ──────────

  @Get(':id')
  @ApiOperation({ summary: '조약 단건' })
  async findOne(@Param('id') id: string): Promise<any> {
    const treaty = await this.prisma.treaty.findUnique({
      where: { id },
      include: TREATY_INCLUDE,
    })
    if (!treaty) throw new NotFoundException('조약을 찾을 수 없습니다.')
    return serializeDates(treaty)
  }

  // ────────── 조약 생성 ──────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '조약 생성 (선택: signatories 로 일괄 트랜잭션)' })
  async create(@Body() dto: CreateTreatyBodyDto, @Request() req: any): Promise<any> {
    const accountId = req.user?.accountId ?? req.user?.id ?? undefined
    const name = dto.name.trim()

    await this.assertAdministrativeDivisionExists(dto.signingAdministrativeDivisionId ?? null)

    if (!dto.allowDuplicateSignDate) {
      const { gte, lt } = utcDayRange(dto.signDate)
      const dup = await this.prisma.treaty.findFirst({
        where: {
          name,
          signDate: { gte, lt },
        },
        select: { id: true },
      })
      if (dup) {
        throw new BadRequestException(
          '동일한 조약명과 서명일(같은 날짜)의 조약이 이미 있습니다. 중복 등록이 맞다면 allowDuplicateSignDate: true 을 보내세요.',
        )
      }
    }

    if (dto.signatories?.length) {
      for (const s of dto.signatories) {
        this.validateSignatoryCountryXor(s)
        await this.assertPositionDefinitionExists(s.positionDefinitionId ?? null)
      }
    }

    const baseData = {
      name,
      alias: dto.alias ?? undefined,
      type: dto.type as any,
      signDate: new Date(dto.signDate),
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      violationDate: dto.violationDate ? new Date(dto.violationDate) : undefined,
      violationReason: dto.violationReason ?? undefined,
      location: dto.location ?? undefined,
      signingAdministrativeDivisionId: dto.signingAdministrativeDivisionId ?? undefined,
      summary: dto.summary ?? undefined,
      background: dto.background ?? undefined,
      aftermath: dto.aftermath ?? undefined,
      accountId: accountId ?? undefined,
    } as Prisma.TreatyUncheckedCreateInput

    if (dto.signatories?.length) {
      const treaty = await this.prisma.$transaction(async (tx) => {
        const created = await tx.treaty.create({
          data: baseData,
        })
        for (const s of dto.signatories!) {
          await tx.treatySignatory.create({
            data: this.signatoryNestedToPrismaData(created.id, s),
          })
        }
        return tx.treaty.findUniqueOrThrow({
          where: { id: created.id },
          include: TREATY_INCLUDE,
        })
      })
      return serializeDates(treaty)
    }

    const treaty = await this.prisma.treaty.create({
      data: baseData,
      include: TREATY_INCLUDE,
    })
    return serializeDates(treaty)
  }

  // ────────── 조약 수정 ──────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: '조약 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateTreatyBodyDto): Promise<any> {
    const exists = await this.prisma.treaty.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('조약을 찾을 수 없습니다.')

    if (dto.signingAdministrativeDivisionId !== undefined) {
      await this.assertAdministrativeDivisionExists(dto.signingAdministrativeDivisionId)
    }

    const updated = await this.prisma.treaty.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.alias !== undefined && { alias: dto.alias }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.signDate !== undefined && { signDate: new Date(dto.signDate) }),
        ...(dto.effectiveDate !== undefined && {
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.violationDate !== undefined && {
          violationDate: dto.violationDate ? new Date(dto.violationDate) : null,
        }),
        ...(dto.violationReason !== undefined && { violationReason: dto.violationReason }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.signingAdministrativeDivisionId !== undefined && {
          signingAdministrativeDivisionId: dto.signingAdministrativeDivisionId,
        }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.background !== undefined && { background: dto.background }),
        ...(dto.aftermath !== undefined && { aftermath: dto.aftermath }),
      },
      include: TREATY_INCLUDE,
    })
    return serializeDates(updated)
  }

  // ────────── 조약 삭제 ──────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '조약 삭제 (서명·조항·이미지 CASCADE)' })
  async remove(@Param('id') id: string): Promise<any> {
    const exists = await this.prisma.treaty.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('조약을 찾을 수 없습니다.')
    await this.prisma.treaty.delete({ where: { id } })
  }

  // ──────────────────────────────────────────────
  // 서명국/참여국
  // ──────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('signatories')
  @ApiOperation({ summary: '서명국 추가' })
  async addSignatory(@Body() dto: CreateTreatySignatoryBodyDto): Promise<any> {
    this.validateSignatoryCountryXor(dto)
    await this.assertPositionDefinitionExists(dto.positionDefinitionId ?? null)

    const signatory = await this.prisma.treatySignatory.create({
      data: {
        treatyId: dto.treatyId,
        countryId: dto.countryId ?? undefined,
        historicalCountryId: dto.historicalCountryId ?? undefined,
        personId: dto.personId ?? undefined,
        cabinetId: dto.cabinetId ?? undefined,
        role: dto.role ?? undefined,
        positionDefinitionId: dto.positionDefinitionId ?? undefined,
        participationType: (dto.participationType ?? 'SIGNATORY') as any,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
        note: dto.note ?? undefined,
      } as Prisma.TreatySignatoryUncheckedCreateInput,
      include: TREATY_SIGNATORY_INCLUDE,
    })
    return serializeDates(signatory)
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Put('signatories/:id')
  @ApiOperation({ summary: '서명국 수정' })
  async updateSignatory(@Param('id') id: string, @Body() dto: UpdateTreatySignatoryBodyDto): Promise<any> {
    const exists = await this.prisma.treatySignatory.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('서명국 정보를 찾을 수 없습니다.')

    const merged = {
      countryId: dto.countryId !== undefined ? dto.countryId : exists.countryId,
      historicalCountryId:
        dto.historicalCountryId !== undefined
          ? dto.historicalCountryId
          : exists.historicalCountryId,
    }
    this.validateSignatoryCountryXor(merged)

    if (dto.positionDefinitionId !== undefined) {
      await this.assertPositionDefinitionExists(dto.positionDefinitionId)
    }

    const updated = await this.prisma.treatySignatory.update({
      where: { id },
      data: {
        ...(dto.countryId !== undefined && { countryId: dto.countryId }),
        ...(dto.historicalCountryId !== undefined && { historicalCountryId: dto.historicalCountryId }),
        ...(dto.personId !== undefined && { personId: dto.personId }),
        ...(dto.cabinetId !== undefined && { cabinetId: dto.cabinetId }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.positionDefinitionId !== undefined && {
          positionDefinitionId: dto.positionDefinitionId,
        }),
        ...(dto.participationType !== undefined && { participationType: dto.participationType as any }),
        ...(dto.signedAt !== undefined && { signedAt: dto.signedAt ? new Date(dto.signedAt) : null }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
      include: TREATY_SIGNATORY_INCLUDE,
    })
    return serializeDates(updated)
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('signatories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '서명국 삭제' })
  async removeSignatory(@Param('id') id: string): Promise<any> {
    const exists = await this.prisma.treatySignatory.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('서명국 정보를 찾을 수 없습니다.')
    await this.prisma.treatySignatory.delete({ where: { id } })
  }

  // ──────────────────────────────────────────────
  // 조약 조항
  // ──────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('terms')
  @ApiOperation({ summary: '조항 추가' })
  async addTerm(@Body() dto: CreateTreatyTermBodyDto): Promise<any> {
    const term = await this.prisma.treatyTerm.create({
      data: {
        treatyId: dto.treatyId,
        order: dto.order ?? 0,
        title: dto.title ?? undefined,
        content: dto.content,
        isSecret: dto.isSecret ?? false,
      },
    })
    return serializeDates(term)
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Put('terms/:id')
  @ApiOperation({ summary: '조항 수정' })
  async updateTerm(@Param('id') id: string, @Body() dto: UpdateTreatyTermBodyDto): Promise<any> {
    const exists = await this.prisma.treatyTerm.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('조항을 찾을 수 없습니다.')

    const updated = await this.prisma.treatyTerm.update({
      where: { id },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isSecret !== undefined && { isSecret: dto.isSecret }),
      },
    })
    return serializeDates(updated)
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('terms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '조항 삭제' })
  async removeTerm(@Param('id') id: string): Promise<any> {
    const exists = await this.prisma.treatyTerm.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('조항을 찾을 수 없습니다.')
    await this.prisma.treatyTerm.delete({ where: { id } })
  }

  // ──────────────────────────────────────────────
  // 이미지
  // ──────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('images')
  @ApiOperation({ summary: '조약 이미지 추가' })
  async addImage(@Body() dto: AddTreatyImageBodyDto): Promise<any> {
    if (dto.isPrimary) {
      await this.prisma.treatyImage.updateMany({
        where: { treatyId: dto.treatyId, isPrimary: true },
        data: { isPrimary: false },
      })
    }
    const image = await this.prisma.treatyImage.create({
      data: {
        treatyId: dto.treatyId,
        imageUrl: dto.imageUrl,
        caption: dto.caption ?? undefined,
        source: dto.source ?? undefined,
        order: dto.order ?? 0,
        isPrimary: dto.isPrimary ?? false,
      },
    })
    return serializeDates(image)
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('images/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '조약 이미지 삭제' })
  async removeImage(@Param('id') id: string): Promise<any> {
    const exists = await this.prisma.treatyImage.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('이미지를 찾을 수 없습니다.')
    await this.prisma.treatyImage.delete({ where: { id } })
  }
}
