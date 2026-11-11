import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
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
  buildCountryScopeOr,
  resolveLinkedHistoricalCountryIds,
} from '../../country/domain/country-scope.util'

import {
  AddTreatyImageBodyDto,
  CreateTreatyBodyDto,
  CreateTreatySignatoryBodyDto,
  CreateTreatyTermBodyDto,
  FindTreatiesQueryDto,
  UpdateTreatyBodyDto,
  UpdateTreatySignatoryBodyDto,
  UpdateTreatyTermBodyDto,
  LinkTreatyEventBodyDto,
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
  person: {
    select: {
      id: true,
      name: true,
      surname: true,
      middleName: true,
      nameDisplayOrder: true,
      profileImageUrl: true,
      country: { select: { defaultNameDisplayOrder: true } },
    },
  },
  positionDefinition: {
    select: { id: true, title: true, positionType: true, titleEn: true },
  },
  tenure: {
    select: {
      id: true,
      title: true,
      rankTitle: true,
      positionType: true,
      startEra: true,
      startYear: true,
      startMonth: true,
      endEra: true,
      endYear: true,
      endMonth: true,
      positionDefinition: {
        select: { id: true, title: true, positionType: true },
      },
      administrationDepartment: {
        select: { id: true, name: true, abbreviation: true },
      },
      militaryUnit: {
        select: { id: true, name: true, abbreviation: true },
      },
    },
  },
  cabinet: {
    select: {
      id: true,
      name: true,
      headTenure: {
        select: {
          ordinal: true,
          subTermNumber: true,
          person: {
            select: {
              id: true,
              name: true,
              surname: true,
              middleName: true,
              nameDisplayOrder: true,
              country: { select: { defaultNameDisplayOrder: true } },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.TreatySignatoryInclude

/**
 * 조약에 걸린 사건 — 지면에 제목·시기를 바로 그릴 수 있을 만큼만.
 *
 * include/select 상수는 `satisfies`로 모델 타입에 묶는다. 상수로 빼면 객체 리터럴의 초과 속성
 * 검사가 꺼져, 사건 분야가 categoryId → domain(enum)으로 바뀐 뒤에도 여기 남은 categoryId를
 * tsc가 못 잡았고 GET /treaties가 런타임에 500으로 죽었다.
 */
const TREATY_EVENT_LINK_INCLUDE = {
  event: {
    select: {
      id: true,
      title: true,
      startDate: true,
      startEra: true,
      startYear: true,
      domain: true,
    },
  },
} as const satisfies Prisma.TreatyEventLinkInclude

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
  eventLinks: {
    where: { event: { deletedAt: null } },
    include: TREATY_EVENT_LINK_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.TreatyInclude

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

  private async areSignatoryAxesCompatible(
    a: { countryId?: string | null; historicalCountryId?: string | null },
    b: { countryId?: string | null; historicalCountryId?: string | null },
  ): Promise<boolean> {
    if (!a.countryId && !a.historicalCountryId) return true
    if (!b.countryId && !b.historicalCountryId) return true
    if (a.historicalCountryId && b.historicalCountryId) {
      return a.historicalCountryId === b.historicalCountryId
    }
    if (a.countryId && b.countryId && a.countryId === b.countryId) {
      return true
    }
    const histId = a.historicalCountryId ?? b.historicalCountryId
    const modId = a.countryId ?? b.countryId
    if (histId && modId && this.prisma.historicalCountryModernCountry?.findFirst) {
      const bridge = await this.prisma.historicalCountryModernCountry.findFirst({
        where: {
          historicalCountryId: histId,
          modernCountryId: modId,
        },
        select: { id: true },
      })
      if (bridge) return true
    }
    return false
  }

  private assertTreatyDateOrder(dates: {
    signDate: Date
    effectiveDate?: Date | null
    expiryDate?: Date | null
    violationDate?: Date | null
  }): void {
    const { signDate, effectiveDate, expiryDate, violationDate } = dates
    if (Number.isNaN(signDate.getTime())) {
      throw new BadRequestException('서명일 형식이 올바르지 않습니다.')
    }
    if (effectiveDate && Number.isNaN(effectiveDate.getTime())) {
      throw new BadRequestException('발효일 형식이 올바르지 않습니다.')
    }
    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      throw new BadRequestException('만료일 형식이 올바르지 않습니다.')
    }
    if (violationDate && Number.isNaN(violationDate.getTime())) {
      throw new BadRequestException('파기/위반일 형식이 올바르지 않습니다.')
    }
    const signTime = signDate.getTime()
    if (effectiveDate && effectiveDate.getTime() < signTime) {
      throw new BadRequestException('조약 발효일이 서명일보다 앞설 수 없습니다.')
    }
    if (expiryDate && expiryDate.getTime() < signTime) {
      throw new BadRequestException('조약 만료일이 서명일보다 앞설 수 없습니다.')
    }
    if (
      effectiveDate &&
      expiryDate &&
      expiryDate.getTime() < effectiveDate.getTime()
    ) {
      throw new BadRequestException('조약 만료일이 발효일보다 앞설 수 없습니다.')
    }
    if (violationDate && violationDate.getTime() < signTime) {
      throw new BadRequestException('조약 파기/위반일이 서명일보다 앞설 수 없습니다.')
    }
  }

  private async validateSignatoryTargetAndScope(sigTarget: {
    countryId?: string | null
    historicalCountryId?: string | null
    personId?: string | null
    tenureId?: string | null
    cabinetId?: string | null
    positionDefinitionId?: string | null
    signedAt?: string | null
  }): Promise<void> {
    this.validateSignatoryCountryXor(sigTarget)
    if (
      !sigTarget.countryId &&
      !sigTarget.historicalCountryId &&
      !sigTarget.personId &&
      !sigTarget.cabinetId
    ) {
      throw new BadRequestException(
        '서명국에는 국가(현대/역사), 인물, 행정부 중 최소 하나를 지정해야 합니다.',
      )
    }
    if (sigTarget.signedAt) {
      const parsedSignedAt = new Date(sigTarget.signedAt)
      if (Number.isNaN(parsedSignedAt.getTime())) {
        throw new BadRequestException('국가별 서명일 형식이 올바르지 않습니다.')
      }
    }
    if (sigTarget.countryId && this.prisma.country?.findUnique) {
      const country = await this.prisma.country.findUnique({
        where: { id: sigTarget.countryId },
        select: { id: true },
      })
      if (!country) {
        throw new NotFoundException('서명 현대 국가를 찾을 수 없습니다.')
      }
    }
    if (
      sigTarget.historicalCountryId &&
      this.prisma.historicalCountry?.findUnique
    ) {
      const hist = await this.prisma.historicalCountry.findUnique({
        where: { id: sigTarget.historicalCountryId },
        select: { id: true },
      })
      if (!hist) {
        throw new NotFoundException('서명 역사적 국가를 찾을 수 없습니다.')
      }
    }
    if (sigTarget.personId && this.prisma.person?.findUnique) {
      const person = await this.prisma.person.findUnique({
        where: { id: sigTarget.personId },
        select: { id: true },
      })
      if (!person) {
        throw new NotFoundException('서명 인물을 찾을 수 없습니다.')
      }
    }
    if (sigTarget.tenureId && this.prisma.governmentPositionTenure?.findUnique) {
      const tenureRow = await this.prisma.governmentPositionTenure.findUnique({
        where: { id: sigTarget.tenureId },
        select: { id: true, personId: true },
      })
      if (!tenureRow) {
        throw new NotFoundException('연결할 재임·보직 기록을 찾을 수 없습니다.')
      }
      if (sigTarget.personId && tenureRow.personId !== sigTarget.personId) {
        throw new BadRequestException(
          '선택한 재임·보직이 서명 인물의 보직이 아닙니다.',
        )
      }
    }
    if (sigTarget.cabinetId && this.prisma.cabinet?.findUnique) {
      const cabinet = await this.prisma.cabinet.findUnique({
        where: { id: sigTarget.cabinetId },
        select: {
          id: true,
          name: true,
          headTenure: {
            select: { countryId: true, historicalCountryId: true },
          },
        },
      })
      if (!cabinet) {
        throw new NotFoundException('소속 행정부를 찾을 수 없습니다.')
      }
      if (
        (sigTarget.countryId || sigTarget.historicalCountryId) &&
        cabinet.headTenure &&
        (cabinet.headTenure.countryId || cabinet.headTenure.historicalCountryId)
      ) {
        const compatible = await this.areSignatoryAxesCompatible(
          {
            countryId: sigTarget.countryId,
            historicalCountryId: sigTarget.historicalCountryId,
          },
          cabinet.headTenure,
        )
        if (!compatible) {
          throw new BadRequestException(
            `서명국의 국가·시대와 소속 행정부${cabinet.name ? `(${cabinet.name})` : ''}의 국가·시대가 일치하지 않습니다.`,
          )
        }
      }
    }
    if (sigTarget.positionDefinitionId) {
      const def = await this.prisma.governmentPositionDefinition.findUnique({
        where: { id: sigTarget.positionDefinitionId },
        select: {
          id: true,
          title: true,
          isGeneric: true,
          administrationDepartment: {
            select: { name: true, countryId: true, historicalCountryId: true },
          },
          scopes: {
            select: { countryId: true, historicalCountryId: true },
          },
        },
      })
      if (!def) {
        throw new BadRequestException('관직 정의를 찾을 수 없습니다.')
      }
      if (
        !def.isGeneric &&
        (sigTarget.countryId || sigTarget.historicalCountryId)
      ) {
        if (
          def.administrationDepartment &&
          (def.administrationDepartment.countryId ||
            def.administrationDepartment.historicalCountryId)
        ) {
          const deptOk = await this.areSignatoryAxesCompatible(
            {
              countryId: sigTarget.countryId,
              historicalCountryId: sigTarget.historicalCountryId,
            },
            def.administrationDepartment,
          )
          if (!deptOk) {
            throw new BadRequestException(
              `관직 정의(${def.title})가 귀속된 국가 기관(${def.administrationDepartment.name})의 국가·시대와 서명국 국가·시대가 일치하지 않습니다.`,
            )
          }
        }
        const activeScopes = (def.scopes ?? []).filter((sc) =>
          Boolean(sc.countryId || sc.historicalCountryId),
        )
        if (activeScopes.length > 0) {
          let matched = false
          for (const sc of activeScopes) {
            if (
              await this.areSignatoryAxesCompatible(
                {
                  countryId: sigTarget.countryId,
                  historicalCountryId: sigTarget.historicalCountryId,
                },
                sc,
              )
            ) {
              matched = true
              break
            }
          }
          if (!matched) {
            throw new BadRequestException(
              `관직 정의(${def.title})의 적용 국가 범위와 서명국 국가·시대가 일치하지 않습니다.`,
            )
          }
        }
      }
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

  private async resolveSignatoryTenureFields(params: {
    personId?: string | null
    tenureId?: string | null
    cabinetId?: string | null
    positionDefinitionId?: string | null
    role?: string | null
    countryId?: string | null
    historicalCountryId?: string | null
    targetDate?: Date | null
  }): Promise<{
    tenureId: string | null
    cabinetId: string | null
    positionDefinitionId: string | null
    role: string | null
  }> {
    const baseResult = {
      tenureId: params.tenureId ?? null,
      cabinetId: params.cabinetId ?? null,
      positionDefinitionId: params.positionDefinitionId ?? null,
      role: params.role ?? null,
    }
    if (!params.personId) {
      return { ...baseResult, tenureId: null }
    }
    if (params.tenureId === null) {
      return { ...baseResult, tenureId: null }
    }

    if (
      typeof params.tenureId === 'string' &&
      params.tenureId.trim() !== '' &&
      this.prisma.governmentPositionTenure?.findUnique
    ) {
      const explicitTenure =
        await this.prisma.governmentPositionTenure.findUnique({
          where: { id: params.tenureId },
          select: {
            id: true,
            title: true,
            positionDefinitionId: true,
            cabinetId: true,
            positionDefinition: { select: { title: true } },
            cabinetMemberships: { select: { cabinetId: true }, take: 1 },
          },
        })
      if (!explicitTenure) return baseResult
      return {
        tenureId: explicitTenure.id,
        cabinetId:
          params.cabinetId ??
          explicitTenure.cabinetId ??
          explicitTenure.cabinetMemberships[0]?.cabinetId ??
          null,
        positionDefinitionId:
          params.positionDefinitionId ??
          explicitTenure.positionDefinitionId ??
          null,
        role:
          params.role ??
          explicitTenure.title ??
          explicitTenure.positionDefinition?.title ??
          null,
      }
    }

    if (
      params.tenureId === undefined &&
      this.prisma.governmentPositionTenure?.findMany
    ) {
      const candidates = await this.prisma.governmentPositionTenure.findMany({
        where: { personId: params.personId },
        select: {
          id: true,
          title: true,
          positionType: true,
          countryId: true,
          historicalCountryId: true,
          positionDefinitionId: true,
          cabinetId: true,
          startEra: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          startDate: true,
          endEra: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          endDate: true,
          positionDefinition: { select: { title: true, rank: true } },
          cabinetMemberships: { select: { cabinetId: true }, take: 1 },
        },
      })
      if (candidates.length === 0) return baseResult

      const toSignedKey = (
        eraVal: string | null,
        yearVal: number | null,
        monthVal: number | null,
        dayVal: number | null,
        isoDate: Date | null,
        isEnd: boolean,
      ): number | null => {
        if (yearVal != null && yearVal > 0) {
          const signedYear = eraVal === 'BC' ? -yearVal : yearVal
          const resolvedMonth = monthVal ?? (isEnd ? 12 : 1)
          const resolvedDay = dayVal ?? (isEnd ? 31 : 1)
          return signedYear * 10000 + resolvedMonth * 100 + resolvedDay
        }
        if (isoDate && !Number.isNaN(isoDate.getTime())) {
          return (
            isoDate.getUTCFullYear() * 10000 +
            (isoDate.getUTCMonth() + 1) * 100 +
            isoDate.getUTCDate()
          )
        }
        return null
      }

      const targetKey =
        params.targetDate && !Number.isNaN(params.targetDate.getTime())
          ? params.targetDate.getUTCFullYear() * 10000 +
            (params.targetDate.getUTCMonth() + 1) * 100 +
            params.targetDate.getUTCDate()
          : null

      const overlapping = candidates.filter((cand) => {
        if (targetKey == null) return false
        const startKey = toSignedKey(
          cand.startEra,
          cand.startYear,
          cand.startMonth,
          cand.startDay,
          cand.startDate,
          false,
        )
        const endKey =
          toSignedKey(
            cand.endEra,
            cand.endYear,
            cand.endMonth,
            cand.endDay,
            cand.endDate,
            true,
          ) ?? Number.MAX_SAFE_INTEGER
        if (startKey == null) return false
        return startKey <= targetKey && targetKey <= endKey
      })

      if (overlapping.length === 0) return baseResult

      const scoreCandidate = (cand: (typeof overlapping)[number]): number => {
        let score = 0
        if (
          params.historicalCountryId &&
          cand.historicalCountryId === params.historicalCountryId
        ) {
          score += 50
        }
        if (params.countryId && cand.countryId === params.countryId) {
          score += 30
        }
        if (cand.positionType === 'DIPLOMATIC_POST') score += 18
        else if (cand.positionType === 'CABINET_MINISTER') score += 16
        else if (cand.positionType === 'HEAD_OF_GOVERNMENT') score += 14
        else if (cand.positionType === 'HEAD_OF_STATE') score += 12
        else if (cand.positionType === 'MILITARY_COMMANDER') score += 10
        const titleText = `${cand.title ?? ''} ${cand.positionDefinition?.title ?? ''}`
        if (titleText.includes('외무') || titleText.includes('외교')) {
          score += 12
        }
        return score
      }

      overlapping.sort(
        (left, right) => scoreCandidate(right) - scoreCandidate(left),
      )
      const matched = overlapping[0]!
      return {
        tenureId: matched.id,
        cabinetId:
          params.cabinetId ??
          matched.cabinetId ??
          matched.cabinetMemberships[0]?.cabinetId ??
          null,
        positionDefinitionId:
          params.positionDefinitionId ?? matched.positionDefinitionId ?? null,
        role:
          params.role ??
          matched.title ??
          matched.positionDefinition?.title ??
          null,
      }
    }

    return baseResult
  }

  private signatoryNestedToPrismaData(
    treatyId: string,
    sigInput: CreateTreatySignatoryNestedDto,
    resolvedTenure?: {
      tenureId: string | null
      cabinetId: string | null
      positionDefinitionId: string | null
      role: string | null
    },
  ): Prisma.TreatySignatoryUncheckedCreateInput {
    return {
      treatyId,
      countryId: sigInput.countryId ?? null,
      historicalCountryId: sigInput.historicalCountryId ?? null,
      personId: sigInput.personId ?? null,
      tenureId: resolvedTenure
        ? resolvedTenure.tenureId
        : (sigInput.tenureId ?? null),
      cabinetId: resolvedTenure
        ? resolvedTenure.cabinetId
        : (sigInput.cabinetId ?? null),
      role: resolvedTenure ? resolvedTenure.role : (sigInput.role ?? null),
      positionDefinitionId: resolvedTenure
        ? resolvedTenure.positionDefinitionId
        : (sigInput.positionDefinitionId ?? null),
      participationType: (sigInput.participationType ??
        'SIGNATORY') as Prisma.TreatySignatoryUncheckedCreateInput['participationType'],
      signedAt: sigInput.signedAt ? new Date(sigInput.signedAt) : null,
      note: sigInput.note ?? null,
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
    } else if (query.countryId) {
      /*
       * 현대 국가 스코프는 브리지로 연결된 역사국가를 합산한다 —
       * 대한민국 상세에서 조선이 맺은 강화도조약이 보여야 하고, 이는
       * 사건·법령·인물 등 다른 도메인이 이미 따르는 공인 규약이다.
       * (country-scope.util 참고: 표시용 3버킷 분류로 좁히지 말 것)
       */
      const linkedHistoricalIds = await resolveLinkedHistoricalCountryIds(
        this.prisma,
        query.countryId,
      )
      const scopeOr = buildCountryScopeOr(query.countryId, linkedHistoricalIds)
      parts.push({
        signatories: { some: scopeOr as Prisma.TreatySignatoryWhereInput },
      })
    }

    /*
     * countryId와 함께 오면 별도 `some` 절로 AND — "두 나라가 모두 서명한 조약"이
     * 된다. 예전처럼 한 `some` 안에 두 FK를 합치면 서명국 XOR 규약상 절대
     * 매칭되지 않는 조건이 만들어진다.
     */
    if (query.historicalCountryId) {
      parts.push({
        signatories: {
          some: { historicalCountryId: query.historicalCountryId },
        },
      })
    }

    if (query.eventId) {
      parts.push({
        eventLinks: { some: { eventId: query.eventId, event: { deletedAt: null } } },
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

    const signDate = new Date(dto.signDate)
    const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : undefined
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : undefined
    const violationDate = dto.violationDate ? new Date(dto.violationDate) : undefined
    this.assertTreatyDateOrder({
      signDate,
      effectiveDate,
      expiryDate,
      violationDate,
    })

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
        await this.validateSignatoryTargetAndScope(s)
      }
    }

    const baseData = {
      name,
      alias: dto.alias ?? undefined,
      type: dto.type as any,
      signDate,
      effectiveDate,
      expiryDate,
      violationDate,
      violationReason: dto.violationReason ?? undefined,
      location: dto.location ?? undefined,
      signingAdministrativeDivisionId: dto.signingAdministrativeDivisionId ?? undefined,
      summary: dto.summary ?? undefined,
      background: dto.background ?? undefined,
      aftermath: dto.aftermath ?? undefined,
      accountId: accountId ?? undefined,
    } as Prisma.TreatyUncheckedCreateInput

    if (dto.signatories?.length) {
      const resolvedNested = await Promise.all(
        dto.signatories.map((sigItem) =>
          this.resolveSignatoryTenureFields({
            personId: sigItem.personId,
            tenureId: sigItem.tenureId,
            cabinetId: sigItem.cabinetId,
            positionDefinitionId: sigItem.positionDefinitionId,
            role: sigItem.role,
            countryId: sigItem.countryId,
            historicalCountryId: sigItem.historicalCountryId,
            targetDate: sigItem.signedAt ? new Date(sigItem.signedAt) : signDate,
          }),
        ),
      )
      const treaty = await this.prisma.$transaction(async (tx) => {
        const created = await tx.treaty.create({
          data: baseData,
        })
        for (let idx = 0; idx < dto.signatories!.length; idx += 1) {
          await tx.treatySignatory.create({
            data: this.signatoryNestedToPrismaData(
              created.id,
              dto.signatories![idx]!,
              resolvedNested[idx],
            ),
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
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTreatyBodyDto,
    @Request() req?: any,
  ): Promise<any> {
    const exists = await this.prisma.treaty.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('조약을 찾을 수 없습니다.')
    const accountId = req?.user?.accountId ?? req?.user?.id ?? undefined
    if (exists.accountId && accountId && exists.accountId !== accountId) {
      throw new ForbiddenException('이 조약을 수정할 권한이 없습니다.')
    }

    const nextSignDate =
      dto.signDate !== undefined ? new Date(dto.signDate) : exists.signDate
    const nextEffectiveDate =
      dto.effectiveDate !== undefined
        ? dto.effectiveDate
          ? new Date(dto.effectiveDate)
          : null
        : exists.effectiveDate
    const nextExpiryDate =
      dto.expiryDate !== undefined
        ? dto.expiryDate
          ? new Date(dto.expiryDate)
          : null
        : exists.expiryDate
    const nextViolationDate =
      dto.violationDate !== undefined
        ? dto.violationDate
          ? new Date(dto.violationDate)
          : null
        : exists.violationDate
    this.assertTreatyDateOrder({
      signDate: nextSignDate,
      effectiveDate: nextEffectiveDate,
      expiryDate: nextExpiryDate,
      violationDate: nextViolationDate,
    })

    if (dto.signingAdministrativeDivisionId !== undefined) {
      await this.assertAdministrativeDivisionExists(dto.signingAdministrativeDivisionId)
    }

    const updated = await this.prisma.treaty.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.alias !== undefined && { alias: dto.alias }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.signDate !== undefined && { signDate: nextSignDate }),
        ...(dto.effectiveDate !== undefined && {
          effectiveDate: nextEffectiveDate,
        }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: nextExpiryDate,
        }),
        ...(dto.violationDate !== undefined && {
          violationDate: nextViolationDate,
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
  async remove(@Param('id') id: string, @Request() req?: any): Promise<any> {
    const exists = await this.prisma.treaty.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('조약을 찾을 수 없습니다.')
    const accountId = req?.user?.accountId ?? req?.user?.id ?? undefined
    if (exists.accountId && accountId && exists.accountId !== accountId) {
      throw new ForbiddenException('이 조약을 삭제할 권한이 없습니다.')
    }
    await this.prisma.treaty.delete({ where: { id } })
  }

  // ──────────────────────────────────────────────
  // 사건 연결
  //
  // 조약 본문·서명자는 Treaty가 정본이고 사건은 링크로만 참조한다. 체결·비준·파기는
  // 각각 다른 사건이므로 (조약, 사건, 자격) 세 값이 한 행의 자연키다.
  // ──────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post(':id/events')
  @ApiOperation({ summary: '조약을 사건에 연결 (체결/비준/파기/기타)' })
  async linkEvent(
    @Param('id') treatyId: string,
    @Body() dto: LinkTreatyEventBodyDto,
  ): Promise<any> {
    const [treaty, event] = await Promise.all([
      this.prisma.treaty.findUnique({ where: { id: treatyId } }),
      this.prisma.event?.findFirst
        ? this.prisma.event.findFirst({ where: { id: dto.eventId, deletedAt: null } })
        : this.prisma.event.findUnique({ where: { id: dto.eventId } }),
    ])
    if (!treaty) throw new NotFoundException('조약을 찾을 수 없습니다.')
    if (!event || (event as any).deletedAt != null) {
      throw new NotFoundException('사건을 찾을 수 없습니다.')
    }

    const linkType = dto.linkType ?? 'SIGNING'
    const existing = await this.prisma.treatyEventLink.findFirst({
      where: { treatyId, eventId: dto.eventId, linkType: linkType as any },
    })
    if (existing) {
      throw new BadRequestException('이미 같은 자격으로 연결된 사건입니다.')
    }

    const link = await this.prisma.treatyEventLink.create({
      data: {
        treatyId,
        eventId: dto.eventId,
        linkType: linkType as any,
        note: dto.note ?? undefined,
      },
      include: TREATY_EVENT_LINK_INCLUDE,
    })
    return serializeDates(link)
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('event-links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '조약-사건 연결 해제 (조약·사건 자체는 그대로)' })
  async unlinkEvent(@Param('linkId') linkId: string): Promise<void> {
    const exists = await this.prisma.treatyEventLink.findUnique({
      where: { id: linkId },
    })
    if (!exists) throw new NotFoundException('연결을 찾을 수 없습니다.')
    await this.prisma.treatyEventLink.delete({ where: { id: linkId } })
  }

  // ──────────────────────────────────────────────
  // 서명국/참여국
  // ──────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('signatories')
  @ApiOperation({ summary: '서명국 추가' })
  async addSignatory(@Body() dto: CreateTreatySignatoryBodyDto): Promise<any> {
    let treatySignDate: Date | null = null
    if (this.prisma.treaty?.findUnique) {
      const treaty = await this.prisma.treaty.findUnique({
        where: { id: dto.treatyId },
        select: { id: true, signDate: true },
      })
      if (!treaty) {
        throw new NotFoundException('조약을 찾을 수 없습니다.')
      }
      treatySignDate = treaty.signDate ?? null
    }
    await this.validateSignatoryTargetAndScope(dto)

    if (this.prisma.treatySignatory?.findFirst) {
      const duplicate = await this.prisma.treatySignatory.findFirst({
        where: {
          treatyId: dto.treatyId,
          countryId: dto.countryId ?? null,
          historicalCountryId: dto.historicalCountryId ?? null,
          personId: dto.personId ?? null,
          participationType: (dto.participationType ?? 'SIGNATORY') as any,
        },
        select: { id: true },
      })
      if (duplicate) {
        throw new ConflictException(
          '동일한 국가·인물·참여 유형의 서명국이 이미 등록되어 있습니다.',
        )
      }
    }

    const resolvedTenure = await this.resolveSignatoryTenureFields({
      personId: dto.personId,
      tenureId: dto.tenureId,
      cabinetId: dto.cabinetId,
      positionDefinitionId: dto.positionDefinitionId,
      role: dto.role,
      countryId: dto.countryId,
      historicalCountryId: dto.historicalCountryId,
      targetDate: dto.signedAt ? new Date(dto.signedAt) : treatySignDate,
    })

    const signatory = await this.prisma.treatySignatory.create({
      data: {
        treatyId: dto.treatyId,
        countryId: dto.countryId ?? undefined,
        historicalCountryId: dto.historicalCountryId ?? undefined,
        personId: dto.personId ?? undefined,
        tenureId: resolvedTenure.tenureId ?? undefined,
        cabinetId: resolvedTenure.cabinetId ?? undefined,
        role: resolvedTenure.role ?? undefined,
        positionDefinitionId: resolvedTenure.positionDefinitionId ?? undefined,
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
      personId: dto.personId !== undefined ? dto.personId : exists.personId,
      tenureId:
        dto.tenureId !== undefined
          ? dto.tenureId
          : dto.personId !== undefined && dto.personId !== exists.personId
            ? undefined
            : (exists as { tenureId?: string | null }).tenureId,
      cabinetId: dto.cabinetId !== undefined ? dto.cabinetId : exists.cabinetId,
      positionDefinitionId:
        dto.positionDefinitionId !== undefined
          ? dto.positionDefinitionId
          : exists.positionDefinitionId,
      signedAt: dto.signedAt !== undefined ? dto.signedAt : undefined,
    }
    await this.validateSignatoryTargetAndScope(merged)

    let nextTenureId: string | null | undefined = dto.tenureId
    let autoRole: string | null | undefined = undefined
    let autoCabinetId: string | null | undefined = undefined
    let autoPositionDefId: string | null | undefined = undefined

    if (
      dto.tenureId !== undefined ||
      (dto.personId !== undefined && dto.personId !== exists.personId)
    ) {
      let treatySignDate: Date | null = null
      if (exists.treatyId && this.prisma.treaty?.findUnique) {
        const parentTreaty = await this.prisma.treaty.findUnique({
          where: { id: exists.treatyId },
          select: { signDate: true },
        })
        treatySignDate = parentTreaty?.signDate ?? null
      }
      const effectiveSignedAt =
        dto.signedAt !== undefined
          ? dto.signedAt
            ? new Date(dto.signedAt)
            : null
          : exists.signedAt ?? null
      const resolvedTenure = await this.resolveSignatoryTenureFields({
        personId: merged.personId,
        tenureId: merged.tenureId,
        cabinetId: dto.cabinetId,
        positionDefinitionId: dto.positionDefinitionId,
        role: dto.role,
        countryId: merged.countryId,
        historicalCountryId: merged.historicalCountryId,
        targetDate: effectiveSignedAt ?? treatySignDate,
      })
      nextTenureId = resolvedTenure.tenureId
      if (dto.role === undefined && !exists.role && resolvedTenure.role) {
        autoRole = resolvedTenure.role
      }
      if (
        dto.cabinetId === undefined &&
        !exists.cabinetId &&
        resolvedTenure.cabinetId
      ) {
        autoCabinetId = resolvedTenure.cabinetId
      }
      if (
        dto.positionDefinitionId === undefined &&
        !exists.positionDefinitionId &&
        resolvedTenure.positionDefinitionId
      ) {
        autoPositionDefId = resolvedTenure.positionDefinitionId
      }
    }

    const updated = await this.prisma.treatySignatory.update({
      where: { id },
      data: {
        ...(dto.countryId !== undefined && { countryId: dto.countryId }),
        ...(dto.historicalCountryId !== undefined && { historicalCountryId: dto.historicalCountryId }),
        ...(dto.personId !== undefined && { personId: dto.personId }),
        ...(nextTenureId !== undefined && { tenureId: nextTenureId }),
        ...(dto.cabinetId !== undefined
          ? { cabinetId: dto.cabinetId }
          : autoCabinetId !== undefined
            ? { cabinetId: autoCabinetId }
            : {}),
        ...(dto.role !== undefined
          ? { role: dto.role }
          : autoRole !== undefined
            ? { role: autoRole }
            : {}),
        ...(dto.positionDefinitionId !== undefined
          ? { positionDefinitionId: dto.positionDefinitionId }
          : autoPositionDefId !== undefined
            ? { positionDefinitionId: autoPositionDefId }
            : {}),
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
