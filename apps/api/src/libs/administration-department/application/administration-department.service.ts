import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { EventMethod, Prisma, type Era } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

import { NotificationService } from '../../notification/application/notification.service'
import {
  mapStructuredDateInput,
  structuredDateEndKey,
  structuredDateKey,
  toSignedDateString,
} from '../../person/domain/structured-date.util'
import type {
  AdministrationDepartmentCategoryDto,
  AdministrationDepartmentKindValue,
  AdministrationDepartmentResponseDto,
  CreateAdministrationDepartmentCategoryBody,
  CreateAdministrationDepartmentDto,
  CreateDepartmentTransitionDto,
  DepartmentDatePartsDto,
  DepartmentEventLinkDto,
  DepartmentLineageDto,
  DepartmentRefDto,
  DepartmentTransitionKindValue,
  UpdateAdministrationDepartmentCategoryBody,
  UpdateAdministrationDepartmentDto,
  UpdateDepartmentTransitionDto,
} from '../presentation/dto/administration-department.dto'

const REF_SELECT = { id: true, name: true, abbreviation: true, kind: true } as const

const DEPARTMENT_INCLUDE = {
  category: true,
  country: { select: { id: true, name: true } },
  historicalCountry: { select: { id: true, name: true } },
  parent: { select: REF_SELECT },
  children: { select: REF_SELECT, orderBy: { name: 'asc' as const } },
  successorTransitions: {
    include: { successor: { select: REF_SELECT } },
    orderBy: [{ year: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  predecessorTransitions: {
    include: { predecessor: { select: REF_SELECT } },
    orderBy: [{ year: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  militaryUnits: {
    select: { id: true, name: true, unitType: true },
    orderBy: { name: 'asc' as const },
  },
} satisfies Prisma.AdministrationDepartmentInclude

type DepartmentRow = Prisma.AdministrationDepartmentGetPayload<{ include: typeof DEPARTMENT_INCLUDE }>

/** 구조화 입력(우선)·레거시 ISO → 저장 칸 6개. 입력이 아예 없으면(undefined) null 반환해 '건드리지 않음' */
function dateColumns(
  info: CreateAdministrationDepartmentDto['establishedInfo'],
  legacyIso: string | null | undefined,
) {
  const result = mapStructuredDateInput(info ?? null, legacyIso ?? null)
  return {
    era: result.era as Era | null,
    year: result.year,
    month: result.month,
    day: result.day,
    precision: result.precision,
    date: result.date,
  }
}

function toDateParts(
  era: Era | null,
  year: number | null,
  month: number | null,
  day: number | null,
  precision: string | null,
): DepartmentDatePartsDto | null {
  if (year == null) return null
  return { era: (era ?? 'AD') as 'BC' | 'AD', year, month, day, precision }
}

function toRef(row: { id: string; name: string; abbreviation: string | null; kind: string }): DepartmentRefDto {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation ?? null,
    kind: row.kind as AdministrationDepartmentKindValue,
  }
}

function toResponse(row: DepartmentRow): AdministrationDepartmentResponseDto {
  const lineage = (
    transition: { id: string; kind: string; era: Era | null; year: number | null; month: number | null; note: string | null },
    other: { id: string; name: string; abbreviation: string | null; kind: string },
  ): DepartmentLineageDto => ({
    transitionId: transition.id,
    kind: transition.kind as DepartmentTransitionKindValue,
    era: (transition.era as 'BC' | 'AD' | null) ?? null,
    year: transition.year,
    month: transition.month,
    note: transition.note ?? null,
    department: toRef(other),
  })
  return {
    id: row.id,
    name: row.name,
    nameLocal: row.nameLocal ?? null,
    nameEn: row.nameEn ?? null,
    abbreviation: row.abbreviation ?? null,
    kind: row.kind as AdministrationDepartmentKindValue,
    thumbnailUrl: row.thumbnailUrl ?? null,
    countryId: row.countryId ?? null,
    country: row.country ?? null,
    historicalCountryId: row.historicalCountryId ?? null,
    historicalCountry: row.historicalCountry ?? null,
    parentId: row.parentId ?? null,
    parent: row.parent ? toRef(row.parent) : null,
    children: row.children.map(toRef),
    categoryId: row.categoryId ?? null,
    category: row.category
      ? { id: row.category.id, name: row.category.name, nameEn: row.category.nameEn ?? null }
      : null,
    description: row.description ?? null,
    established: toDateParts(
      row.establishedEra,
      row.establishedYear,
      row.establishedMonth,
      row.establishedDay,
      row.establishedPrecision,
    ),
    abolished: toDateParts(
      row.abolishedEra,
      row.abolishedYear,
      row.abolishedMonth,
      row.abolishedDay,
      row.abolishedPrecision,
    ),
    establishedDate: toSignedDateString(
      row.establishedEra,
      row.establishedYear,
      row.establishedMonth,
      row.establishedDay,
    ),
    abolishedDate: toSignedDateString(row.abolishedEra, row.abolishedYear, row.abolishedMonth, row.abolishedDay),
    predecessors: row.predecessorTransitions.map((transition) => lineage(transition, transition.predecessor)),
    successors: row.successorTransitions.map((transition) => lineage(transition, transition.successor)),
    militaryUnits: row.militaryUnits.map((unit) => ({
      id: unit.id,
      name: unit.name,
      unitType: unit.unitType ?? null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * 국가 기관 — 2026-11-08 재설계로 컨트롤러에서 분리.
 *
 * 규칙:
 * - 소속 국가(현대·역사) 중 하나는 필수
 * - 상위 기관 순환 금지(자기 자신·자기 하위를 상위로 둘 수 없음)
 * - 폐지일이 설립일보다 앞설 수 없음(구조화 키 비교 — 기원전 안전)
 * - 삭제는 하위 기관·재임·군 부대·사건 연결이 하나라도 있으면 409(예전엔 하위 기관이 함께 지워졌다)
 * - 계보는 순환 금지(A→B→…→A)
 */
@Injectable()
export class AdministrationDepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── 카테고리 ───────────────────────────────────────────────────────────

  async listCategories(): Promise<AdministrationDepartmentCategoryDto[]> {
    const list = await this.prisma.administrationDepartmentCategory.findMany({ orderBy: { name: 'asc' } })
    return list.map((row) => ({ id: row.id, name: row.name, nameEn: row.nameEn ?? null }))
  }

  async createCategory(body: CreateAdministrationDepartmentCategoryBody): Promise<AdministrationDepartmentCategoryDto> {
    const name = body.name.trim()
    const exists = await this.prisma.administrationDepartmentCategory.findFirst({ where: { name } })
    if (exists) throw new ConflictException(`이미 있는 분류입니다: ${name}`)
    const row = await this.prisma.administrationDepartmentCategory.create({
      data: { name, nameEn: body.nameEn?.trim() || null },
    })
    return { id: row.id, name: row.name, nameEn: row.nameEn ?? null }
  }

  async updateCategory(
    id: string,
    body: UpdateAdministrationDepartmentCategoryBody,
  ): Promise<AdministrationDepartmentCategoryDto> {
    const row = await this.prisma.administrationDepartmentCategory.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name.trim() }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn?.trim() || null }),
      },
    })
    return { id: row.id, name: row.name, nameEn: row.nameEn ?? null }
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.administrationDepartmentCategory.delete({ where: { id } })
  }

  // ─── 조회 ───────────────────────────────────────────────────────────────

  /**
   * 목록 — 국가 축은 AND(둘 다 주면 dual-fill 기관만). search는 이름·원어명·영문명·약칭.
   */
  async list(params: {
    countryId?: string
    historicalCountryId?: string
    search?: string
    kind?: string
    take?: number
  }): Promise<AdministrationDepartmentResponseDto[]> {
    const search = params.search?.trim()
    const where: Prisma.AdministrationDepartmentWhereInput = {
      ...(params.countryId ? { countryId: params.countryId } : {}),
      ...(params.historicalCountryId ? { historicalCountryId: params.historicalCountryId } : {}),
      ...(params.kind ? { kind: params.kind as AdministrationDepartmentKindValue } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { nameLocal: { contains: search } },
              { nameEn: { contains: search } },
              { abbreviation: { contains: search } },
            ],
          }
        : {}),
    }
    const list = await this.prisma.administrationDepartment.findMany({
      where,
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
      include: DEPARTMENT_INCLUDE,
      ...(params.take ? { take: Math.min(Math.max(params.take, 1), 200) } : {}),
    })
    return list.map(toResponse)
  }

  /**
   * 현대 국가의 기관 — 연결된 역사국가(historicalCountryModernCountry) 소속 기관까지.
   * 시대별 정권·내각 화면이 과거 기관(6조·대장성·OKW)까지 매칭하도록.
   */
  async listByCountry(countryId: string): Promise<AdministrationDepartmentResponseDto[]> {
    const linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
      .findMany({ where: { modernCountryId: countryId }, select: { historicalCountryId: true } })
      .then((rows) => rows.map((row) => row.historicalCountryId))
    const list = await this.prisma.administrationDepartment.findMany({
      where:
        linkedHistoricalIds.length > 0
          ? { OR: [{ countryId }, { historicalCountryId: { in: linkedHistoricalIds } }] }
          : { countryId },
      orderBy: { name: 'asc' },
      include: DEPARTMENT_INCLUDE,
    })
    return list.map(toResponse)
  }

  async getById(id: string): Promise<AdministrationDepartmentResponseDto | null> {
    const row = await this.prisma.administrationDepartment.findUnique({ where: { id }, include: DEPARTMENT_INCLUDE })
    return row ? toResponse(row) : null
  }

  /** 이 기관이 관여한 사건(발령·수령·주체·관여) — 삭제된 사건은 뺀다 */
  async listEvents(id: string): Promise<DepartmentEventLinkDto[]> {
    await this.requireDepartment(id)
    const rows = await this.prisma.eventDepartmentRelation.findMany({
      where: { departmentId: id, event: { deletedAt: null } },
      include: {
        event: {
          select: { id: true, title: true, startEra: true, startYear: true, startMonth: true, startDay: true },
        },
      },
      orderBy: [{ event: { startYear: 'asc' } }, { createdAt: 'asc' }],
    })
    return rows.map((row) => ({
      relationId: row.id,
      role: row.role,
      roleDescription: row.roleDescription ?? null,
      event: {
        id: row.event.id,
        title: row.event.title,
        startEra: (row.event.startEra as string | null) ?? null,
        startYear: row.event.startYear ?? null,
        startMonth: row.event.startMonth ?? null,
        startDay: row.event.startDay ?? null,
      },
    }))
  }

  /** 이 기관 소속 재임(역대 장관) */
  async listTenures(id: string): Promise<any[]> {
    const list = await this.prisma.governmentPositionTenure.findMany({
      where: { administrationDepartmentId: id },
      orderBy: [{ startKey: 'desc' }, { startDate: 'desc' }],
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
              select: { id: true, name: true, flagEmoji: true, isoCode: true, defaultNameDisplayOrder: true },
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
      ordinal: row.ordinal,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      startEra: row.startEra ?? null,
      startYear: row.startYear ?? null,
      endEra: row.endEra ?? null,
      endYear: row.endYear ?? null,
      title: row.title,
      positionDefinition: (row as any).positionDefinition,
      person: (row as any).person,
      country: (row as any).country,
      historicalCountry: (row as any).historicalCountry,
    }))
  }

  // ─── 쓰기 ───────────────────────────────────────────────────────────────

  async create(body: CreateAdministrationDepartmentDto): Promise<AdministrationDepartmentResponseDto> {
    this.assertCountryAxis(body.countryId, body.historicalCountryId)
    const established = dateColumns(body.establishedInfo, body.establishedDate)
    const abolished = dateColumns(body.abolishedInfo, body.abolishedDate)
    this.assertDateOrder(established, abolished)
    if (body.parentId) await this.requireDepartment(body.parentId, '상위 기관을 찾을 수 없습니다.')

    const row = await this.prisma.administrationDepartment.create({
      data: {
        name: body.name.trim(),
        nameLocal: body.nameLocal?.trim() || null,
        nameEn: body.nameEn?.trim() || null,
        abbreviation: body.abbreviation?.trim() || null,
        kind: body.kind ?? 'MINISTRY',
        countryId: body.countryId ?? null,
        historicalCountryId: body.historicalCountryId ?? null,
        parentId: body.parentId ?? null,
        categoryId: body.categoryId ?? null,
        thumbnailUrl: body.thumbnailUrl ?? null,
        description: body.description ?? null,
        ...this.establishedData(established),
        ...this.abolishedData(abolished),
      },
      include: DEPARTMENT_INCLUDE,
    })
    await this.notificationService.notifyAdministrationDepartment(
      row.name,
      EventMethod.CREATE,
      row.id,
      row.category?.name ?? undefined,
    )
    return toResponse(row)
  }

  async update(id: string, body: UpdateAdministrationDepartmentDto): Promise<AdministrationDepartmentResponseDto> {
    const current = await this.prisma.administrationDepartment.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('기관을 찾을 수 없습니다.')

    // 부분 수정 — 병합 결과로 검증(한 축만 비우는 요청이 무소속 기관을 만들지 않게)
    this.assertCountryAxis(
      body.countryId !== undefined ? body.countryId : current.countryId,
      body.historicalCountryId !== undefined ? body.historicalCountryId : current.historicalCountryId,
    )
    if (body.parentId !== undefined && body.parentId !== null) {
      await this.assertNoParentCycle(id, body.parentId)
    }

    const establishedTouched = body.establishedInfo !== undefined || body.establishedDate !== undefined
    const abolishedTouched = body.abolishedInfo !== undefined || body.abolishedDate !== undefined
    const established = establishedTouched
      ? dateColumns(body.establishedInfo, body.establishedDate)
      : {
          era: current.establishedEra,
          year: current.establishedYear,
          month: current.establishedMonth,
          day: current.establishedDay,
          precision: current.establishedPrecision,
          date: current.establishedDate,
        }
    const abolished = abolishedTouched
      ? dateColumns(body.abolishedInfo, body.abolishedDate)
      : {
          era: current.abolishedEra,
          year: current.abolishedYear,
          month: current.abolishedMonth,
          day: current.abolishedDay,
          precision: current.abolishedPrecision,
          date: current.abolishedDate,
        }
    this.assertDateOrder(established, abolished)

    const row = await this.prisma.administrationDepartment.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name.trim() }),
        ...(body.nameLocal !== undefined && { nameLocal: body.nameLocal?.trim() || null }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn?.trim() || null }),
        ...(body.abbreviation !== undefined && { abbreviation: body.abbreviation?.trim() || null }),
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(body.countryId !== undefined && { countryId: body.countryId }),
        ...(body.historicalCountryId !== undefined && { historicalCountryId: body.historicalCountryId }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
        ...(body.description !== undefined && { description: body.description }),
        ...(establishedTouched && this.establishedData(established)),
        ...(abolishedTouched && this.abolishedData(abolished)),
      },
      include: DEPARTMENT_INCLUDE,
    })
    await this.notificationService.notifyAdministrationDepartment(
      row.name,
      EventMethod.UPDATE,
      row.id,
      row.category?.name ?? undefined,
    )
    return toResponse(row)
  }

  /**
   * 삭제 — 매달린 기록이 하나라도 있으면 409. 무엇이 몇 건 걸려 있는지 문구로 알린다.
   * 계보 줄은 기관과 함께 사라진다(관계 행이라 따로 남길 의미가 없다).
   */
  async delete(id: string): Promise<void> {
    const row = await this.prisma.administrationDepartment.findUnique({
      where: { id },
      include: {
        category: true,
        _count: { select: { children: true, tenures: true, militaryUnits: true, eventRelations: true } },
      },
    })
    if (!row) throw new NotFoundException('기관을 찾을 수 없습니다.')
    const blockers = [
      row._count.children > 0 && `하위 기관 ${row._count.children}곳`,
      row._count.tenures > 0 && `재임 기록 ${row._count.tenures}건`,
      row._count.militaryUnits > 0 && `군 부대 ${row._count.militaryUnits}개`,
      row._count.eventRelations > 0 && `사건 연결 ${row._count.eventRelations}건`,
    ].filter(Boolean)
    if (blockers.length > 0) {
      throw new ConflictException(
        `「${row.name}」에 걸린 기록이 있어 지울 수 없습니다 — ${blockers.join(' · ')}. 먼저 옮기거나 끊어 주세요.`,
      )
    }
    await this.prisma.administrationDepartment.delete({ where: { id } })
    await this.notificationService.notifyAdministrationDepartment(
      row.name,
      EventMethod.DELETE,
      row.id,
      row.category?.name ?? undefined,
    )
  }

  // ─── 계보 ───────────────────────────────────────────────────────────────

  async addTransition(predecessorId: string, body: CreateDepartmentTransitionDto): Promise<AdministrationDepartmentResponseDto> {
    if (predecessorId === body.successorId) {
      throw new BadRequestException('같은 기관을 자기 후신으로 둘 수 없습니다.')
    }
    await this.requireDepartment(predecessorId)
    await this.requireDepartment(body.successorId, '뒤 기관을 찾을 수 없습니다.')
    await this.assertNoLineageCycle(predecessorId, body.successorId)
    const exists = await this.prisma.administrationDepartmentTransition.findFirst({
      where: { predecessorId, successorId: body.successorId },
    })
    if (exists) throw new ConflictException('이미 이어져 있는 두 기관입니다.')
    await this.prisma.administrationDepartmentTransition.create({
      data: {
        predecessorId,
        successorId: body.successorId,
        kind: body.kind,
        era: (body.era ?? (body.year != null ? 'AD' : null)) as Era | null,
        year: body.year ?? null,
        month: body.month ?? null,
        note: body.note?.trim() || null,
      },
    })
    return (await this.getById(predecessorId))!
  }

  async updateTransition(transitionId: string, body: UpdateDepartmentTransitionDto): Promise<void> {
    const current = await this.prisma.administrationDepartmentTransition.findUnique({ where: { id: transitionId } })
    if (!current) throw new NotFoundException('계보 연결을 찾을 수 없습니다.')
    await this.prisma.administrationDepartmentTransition.update({
      where: { id: transitionId },
      data: {
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(body.era !== undefined && { era: body.era as Era | null }),
        ...(body.year !== undefined && { year: body.year }),
        ...(body.month !== undefined && { month: body.month }),
        ...(body.note !== undefined && { note: body.note?.trim() || null }),
      },
    })
  }

  async deleteTransition(transitionId: string): Promise<void> {
    const current = await this.prisma.administrationDepartmentTransition.findUnique({ where: { id: transitionId } })
    if (!current) throw new NotFoundException('계보 연결을 찾을 수 없습니다.')
    await this.prisma.administrationDepartmentTransition.delete({ where: { id: transitionId } })
  }

  // ─── 내부 ───────────────────────────────────────────────────────────────

  private establishedData(columns: ReturnType<typeof dateColumns>) {
    return {
      establishedEra: columns.era,
      establishedYear: columns.year,
      establishedMonth: columns.month,
      establishedDay: columns.day,
      establishedPrecision: columns.precision,
      establishedDate: columns.date,
    }
  }

  private abolishedData(columns: ReturnType<typeof dateColumns>) {
    return {
      abolishedEra: columns.era,
      abolishedYear: columns.year,
      abolishedMonth: columns.month,
      abolishedDay: columns.day,
      abolishedPrecision: columns.precision,
      abolishedDate: columns.date,
    }
  }

  private assertCountryAxis(countryId?: string | null, historicalCountryId?: string | null): void {
    if (!countryId && !historicalCountryId) {
      throw new BadRequestException('소속 국가(현대 또는 역사적 국가) 중 하나는 반드시 지정해야 합니다.')
    }
  }

  private assertDateOrder(
    established: { era: Era | null; year: number | null; month: number | null; day: number | null },
    abolished: { era: Era | null; year: number | null; month: number | null; day: number | null },
  ): void {
    const start = structuredDateKey(established.era, established.year, established.month, established.day)
    const end = structuredDateEndKey(abolished.era, abolished.year, abolished.month, abolished.day)
    if (start != null && end != null && end < start) {
      throw new BadRequestException('폐지일이 설립일보다 앞설 수 없습니다.')
    }
  }

  private async requireDepartment(id: string, message = '기관을 찾을 수 없습니다.') {
    const row = await this.prisma.administrationDepartment.findUnique({ where: { id }, select: { id: true } })
    if (!row) throw new NotFoundException(message)
    return row
  }

  /** 새 상위(parentId)에서 위로 올라가다 자기 자신을 만나면 순환 */
  private async assertNoParentCycle(id: string, parentId: string): Promise<void> {
    if (parentId === id) throw new BadRequestException('기관을 자기 자신의 상위로 둘 수 없습니다.')
    let cursor: string | null = parentId
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === id) throw new BadRequestException('하위 기관을 상위로 둘 수 없습니다(순환).')
      if (seen.has(cursor)) break
      seen.add(cursor)
      const parent: { parentId: string | null } | null = await this.prisma.administrationDepartment.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      })
      if (!parent) throw new NotFoundException('상위 기관을 찾을 수 없습니다.')
      cursor = parent.parentId
    }
  }

  /** 뒤 기관에서 후신을 따라가다 앞 기관을 만나면 순환(A→B→…→A) */
  private async assertNoLineageCycle(predecessorId: string, successorId: string): Promise<void> {
    const queue = [successorId]
    const seen = new Set<string>()
    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === predecessorId) {
        throw new BadRequestException('계보가 돌아서 제자리로 옵니다(순환). 방향을 확인해 주세요.')
      }
      if (seen.has(current)) continue
      seen.add(current)
      const next = await this.prisma.administrationDepartmentTransition.findMany({
        where: { predecessorId: current },
        select: { successorId: true },
      })
      queue.push(...next.map((row) => row.successorId))
    }
  }
}
