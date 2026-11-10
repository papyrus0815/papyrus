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

function transitionSortKey(transition: {
  era: Era | null
  year: number | null
  month: number | null
}): number {
  return (
    structuredDateKey(transition.era, transition.year, transition.month, 1) ??
    Number.POSITIVE_INFINITY
  )
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
  const sortedPredecessors = [...(row.predecessorTransitions ?? [])].sort(
    (a, b) => transitionSortKey(a) - transitionSortKey(b),
  )
  const sortedSuccessors = [...(row.successorTransitions ?? [])].sort(
    (a, b) => transitionSortKey(a) - transitionSortKey(b),
  )
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
    children: (row.children ?? []).map(toRef),
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
    predecessors: sortedPredecessors.map((transition) => lineage(transition, transition.predecessor)),
    successors: sortedSuccessors.map((transition) => lineage(transition, transition.successor)),
    militaryUnits: (row.militaryUnits ?? []).map((unit) => ({
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
    if (this.prisma.administrationDepartmentCategory?.findUnique) {
      const current = await this.prisma.administrationDepartmentCategory.findUnique({
        where: { id },
      })
      if (!current) throw new NotFoundException('분류를 찾을 수 없습니다.')
      if (body.name != null) {
        const nextName = body.name.trim()
        if (nextName !== current.name) {
          const duplicate = await this.prisma.administrationDepartmentCategory.findFirst({
            where: { name: nextName, id: { not: id } },
          })
          if (duplicate) throw new ConflictException(`이미 있는 분류입니다: ${nextName}`)
        }
      }
    }
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
    let categoryName = '해당 분류'
    if (this.prisma.administrationDepartmentCategory?.findUnique) {
      const current = await this.prisma.administrationDepartmentCategory.findUnique({
        where: { id },
      })
      if (!current) throw new NotFoundException('분류를 찾을 수 없습니다.')
      categoryName = current.name
    }
    const [deptCount, defCount] = await Promise.all([
      this.prisma.administrationDepartment?.count
        ? this.prisma.administrationDepartment.count({ where: { categoryId: id } })
        : Promise.resolve(0),
      this.prisma.governmentPositionDefinition?.count
        ? this.prisma.governmentPositionDefinition.count({ where: { categoryId: id } })
        : Promise.resolve(0),
    ])
    const blockers = [
      deptCount > 0 && `기관 ${deptCount}곳`,
      defCount > 0 && `직위 정의 ${defCount}개`,
    ].filter(Boolean)
    if (blockers.length > 0) {
      throw new ConflictException(
        `「${categoryName}」 분류에 연결된 기록이 있어 지울 수 없습니다 — ${blockers.join(' · ')}. 먼저 다른 분류로 옮겨 주세요.`,
      )
    }
    await this.prisma.administrationDepartmentCategory.delete({ where: { id } })
  }

  // ─── 조회 ───────────────────────────────────────────────────────────────

  /**
   * 목록 — 역사적 국가 우선(historicalCountryId가 있으면 해당 역사국가 소속만, 없으면 countryId 기준 + 연결된 역사국가 확장).
   * search는 이름·원어명·영문명·약칭.
   */
  async list(params: {
    countryId?: string
    historicalCountryId?: string
    search?: string
    kind?: string
    take?: number
  }): Promise<AdministrationDepartmentResponseDto[]> {
    const search = params.search?.trim()
    let linkedHistoricalIds: string[] = []
    if (!params.historicalCountryId && params.countryId) {
      linkedHistoricalIds = await this.prisma.historicalCountryModernCountry
        .findMany({
          where: { modernCountryId: params.countryId },
          select: { historicalCountryId: true },
        })
        .then((rows) => rows.map((row) => row.historicalCountryId))
    }

    const countryOrClause =
      !params.historicalCountryId && params.countryId && linkedHistoricalIds.length > 0
        ? {
            OR: [
              { countryId: params.countryId },
              { historicalCountryId: { in: linkedHistoricalIds } },
            ],
          }
        : null

    const searchOrClause = search
      ? {
          OR: [
            { name: { contains: search } },
            { nameLocal: { contains: search } },
            { nameEn: { contains: search } },
            { abbreviation: { contains: search } },
          ],
        }
      : null

    const where: Prisma.AdministrationDepartmentWhereInput = {
      ...(params.historicalCountryId
        ? { historicalCountryId: params.historicalCountryId }
        : params.countryId && !countryOrClause
          ? { countryId: params.countryId }
          : {}),
      ...(params.kind ? { kind: params.kind as AdministrationDepartmentKindValue } : {}),
      ...(countryOrClause && searchOrClause
        ? { AND: [countryOrClause, searchOrClause] }
        : countryOrClause
          ? countryOrClause
          : searchOrClause
            ? searchOrClause
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
    rows.sort((a, b) => {
      const ka =
        structuredDateKey(a.event.startEra, a.event.startYear, a.event.startMonth, a.event.startDay) ??
        Number.POSITIVE_INFINITY
      const kb =
        structuredDateKey(b.event.startEra, b.event.startYear, b.event.startMonth, b.event.startDay) ??
        Number.POSITIVE_INFINITY
      return ka - kb
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

  /** 이 기관 소속 재임(역대 장관) — 직접 연결 또는 이 기관 전용 직위 정의를 통한 재임 포함 */
  async listTenures(id: string): Promise<any[]> {
    const list = await this.prisma.governmentPositionTenure.findMany({
      where: {
        OR: [
          { administrationDepartmentId: id },
          {
            administrationDepartmentId: null,
            positionDefinition: { is: { administrationDepartmentId: id } },
          },
        ],
      },
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
        positionDefinition: {
          select: { id: true, title: true, positionType: true, isMonarchical: true },
        },
        country: { select: { id: true, name: true } },
        historicalCountry: { select: { id: true, name: true } },
      },
    })
    return list.map((row) => ({
      id: row.id,
      personId: row.personId,
      ordinal: row.ordinal,
      subTermNumber: row.subTermNumber ?? null,
      isMonarchical: Boolean((row as any).positionDefinition?.isMonarchical),
      startDate:
        toSignedDateString(row.startEra, row.startYear, row.startMonth, row.startDay) ??
        row.startDate?.toISOString() ??
        null,
      endDate:
        toSignedDateString(row.endEra, row.endYear, row.endMonth, row.endDay) ??
        row.endDate?.toISOString() ??
        null,
      startDatePrecision: row.startDatePrecision ?? null,
      startEra: row.startEra ?? null,
      startYear: row.startYear ?? null,
      startMonth: row.startMonth ?? null,
      startDay: row.startDay ?? null,
      endEra: row.endEra ?? null,
      endYear: row.endYear ?? null,
      endMonth: row.endMonth ?? null,
      endDay: row.endDay ?? null,
      title: row.title,
      cabinetId: row.cabinetId ?? null,
      administrationDepartmentId: row.administrationDepartmentId ?? null,
      positionDefinition: (row as any).positionDefinition,
      person: (row as any).person,
      country: (row as any).country,
      historicalCountry: (row as any).historicalCountry,
    }))
  }

  // ─── 쓰기 ───────────────────────────────────────────────────────────────

  async create(body: CreateAdministrationDepartmentDto): Promise<AdministrationDepartmentResponseDto> {
    this.assertCountryAxis(body.countryId, body.historicalCountryId)
    await this.assertReferencesExist({
      countryId: body.countryId,
      historicalCountryId: body.historicalCountryId,
      categoryId: body.categoryId,
    })
    const resolvedCountryId = await this.resolveDualFillCountryId(body.countryId, body.historicalCountryId)
    const established = dateColumns(body.establishedInfo, body.establishedDate)
    const abolished = dateColumns(body.abolishedInfo, body.abolishedDate)
    this.assertDateOrder(established, abolished)
    if (body.parentId) {
      await this.assertCompatibleParentDepartment(
        body.parentId,
        resolvedCountryId,
        body.historicalCountryId ?? null,
      )
    }
    await this.assertNoDuplicateDepartment({
      name: body.name,
      countryId: resolvedCountryId,
      historicalCountryId: body.historicalCountryId ?? null,
      parentId: body.parentId ?? null,
      established,
      abolished,
    })

    const row = await this.prisma.administrationDepartment.create({
      data: {
        name: body.name.trim(),
        nameLocal: body.nameLocal?.trim() || null,
        nameEn: body.nameEn?.trim() || null,
        abbreviation: body.abbreviation?.trim() || null,
        kind: body.kind ?? 'MINISTRY',
        countryId: resolvedCountryId,
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
    // historicalCountryId만 새로 변경(non-null)하고 countryId는 미전달인 경우,
    // 이전 dual-fill countryId를 그대로 쓰지 않고 새 historicalCountryId 기준으로 재계산한다.
    const nextHistoricalCountryId =
      body.historicalCountryId !== undefined ? body.historicalCountryId : current.historicalCountryId
    const nextCountryId =
      body.countryId !== undefined
        ? body.countryId
        : body.historicalCountryId !== undefined && body.historicalCountryId !== null
          ? null
          : current.countryId
    this.assertCountryAxis(nextCountryId, nextHistoricalCountryId)
    await this.assertReferencesExist({
      countryId: body.countryId !== undefined ? body.countryId : undefined,
      historicalCountryId: body.historicalCountryId !== undefined ? body.historicalCountryId : undefined,
      categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
    })
    const resolvedCountryId =
      body.countryId !== undefined || body.historicalCountryId !== undefined
        ? await this.resolveDualFillCountryId(nextCountryId, nextHistoricalCountryId)
        : undefined
    const effectiveCountryId = resolvedCountryId !== undefined ? resolvedCountryId : current.countryId
    const effectiveParentId = body.parentId !== undefined ? body.parentId : current.parentId
    if (effectiveParentId) {
      if (body.parentId !== undefined) {
        await this.assertNoParentCycle(id, effectiveParentId)
      }
      if (
        body.parentId !== undefined ||
        body.countryId !== undefined ||
        body.historicalCountryId !== undefined
      ) {
        await this.assertCompatibleParentDepartment(
          effectiveParentId,
          effectiveCountryId,
          nextHistoricalCountryId,
        )
      }
    }
    if (body.countryId !== undefined || body.historicalCountryId !== undefined) {
      await this.assertCompatibleDependentsOnCountryChange(
        id,
        effectiveCountryId,
        nextHistoricalCountryId,
        {
          prevCountryId: current.countryId ?? null,
          prevHistoricalCountryId: current.historicalCountryId ?? null,
        },
      )
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
    await this.assertNoDuplicateDepartment({
      excludeId: id,
      name: body.name != null ? body.name : current.name,
      countryId: effectiveCountryId ?? null,
      historicalCountryId: nextHistoricalCountryId ?? null,
      parentId: effectiveParentId ?? null,
      established,
      abolished,
    })

    const row = await this.prisma.administrationDepartment.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name.trim() }),
        ...(body.nameLocal !== undefined && { nameLocal: body.nameLocal?.trim() || null }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn?.trim() || null }),
        ...(body.abbreviation !== undefined && { abbreviation: body.abbreviation?.trim() || null }),
        ...(body.kind !== undefined && { kind: body.kind }),
        ...(resolvedCountryId !== undefined && { countryId: resolvedCountryId }),
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

    // 부처의 국가 축 또는 분류(categoryId)가 변경된 경우, 하위 기관 및 귀속된 직위 정의(GovernmentPositionDefinition)의 스코프·분류도 동기화
    const countryChanged =
      effectiveCountryId !== current.countryId ||
      nextHistoricalCountryId !== current.historicalCountryId
    const categoryChanged =
      body.categoryId !== undefined && body.categoryId !== current.categoryId
    if (countryChanged && this.prisma.administrationDepartment?.updateMany) {
      await this.prisma.administrationDepartment.updateMany({
        where: {
          parentId: id,
          countryId: current.countryId ?? null,
          historicalCountryId: current.historicalCountryId ?? null,
        },
        data: {
          countryId: effectiveCountryId ?? null,
          historicalCountryId: nextHistoricalCountryId ?? null,
        },
      })
    }
    if (countryChanged || categoryChanged) {
      await this.syncDependentPositionDefinitions(id, {
        countryChanged,
        prevCountryId: current.countryId ?? null,
        prevHistoricalCountryId: current.historicalCountryId ?? null,
        effectiveCountryId: effectiveCountryId ?? null,
        effectiveHistoricalCountryId: nextHistoricalCountryId ?? null,
        categoryChanged,
        prevCategoryId: current.categoryId ?? null,
        nextCategoryId: body.categoryId !== undefined ? (body.categoryId ?? null) : (current.categoryId ?? null),
      })
    }
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
        _count: {
          select: {
            children: true,
            tenures: true,
            positionDefinitions: true,
            militaryUnits: true,
            eventRelations: true,
          },
        },
      },
    })
    if (!row) throw new NotFoundException('기관을 찾을 수 없습니다.')
    const blockers = [
      row._count.children > 0 && `하위 기관 ${row._count.children}곳`,
      row._count.tenures > 0 && `재임 기록 ${row._count.tenures}건`,
      row._count.positionDefinitions > 0 && `직위 정의 ${row._count.positionDefinitions}개`,
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
    await this.assertCompatibleTransitionDepartments(predecessorId, body.successorId)
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

  private async assertReferencesExist(opts: {
    countryId?: string | null
    historicalCountryId?: string | null
    categoryId?: string | null
  }): Promise<void> {
    if (opts.countryId && this.prisma.country?.findUnique) {
      const country = await this.prisma.country.findUnique({
        where: { id: opts.countryId },
        select: { id: true },
      })
      if (!country) throw new NotFoundException('선택한 현대 국가를 찾을 수 없습니다.')
    }
    if (opts.historicalCountryId && this.prisma.historicalCountry?.findUnique) {
      const hc = await this.prisma.historicalCountry.findUnique({
        where: { id: opts.historicalCountryId },
        select: { id: true },
      })
      if (!hc) throw new NotFoundException('선택한 역사적 국가를 찾을 수 없습니다.')
    }
    if (opts.categoryId && this.prisma.administrationDepartmentCategory?.findUnique) {
      const cat = await this.prisma.administrationDepartmentCategory.findUnique({
        where: { id: opts.categoryId },
        select: { id: true },
      })
      if (!cat) throw new NotFoundException('선택한 기관 분류를 찾을 수 없습니다.')
    }
  }

  /**
   * 역사적 국가 기관은 연결된 현대 국가가 단일(1개)일 때만 countryId도 함께 채운다(dual-fill).
   * 두 축이 동시에 전달된 경우에는 브리지(HistoricalCountryModernCountry) 연결 여부를 검증한다.
   */
  private async resolveDualFillCountryId(
    countryId?: string | null,
    historicalCountryId?: string | null,
  ): Promise<string | null> {
    if (!historicalCountryId) return countryId ?? null
    const links = await this.prisma.historicalCountryModernCountry.findMany({
      where: { historicalCountryId },
      select: { modernCountryId: true },
    })
    const modernIds = links.map((l) => l.modernCountryId)
    if (countryId) {
      if (!modernIds.includes(countryId)) {
        throw new BadRequestException(
          '선택한 역사적 국가와 현대 국가가 서로 연결되어 있지 않습니다.',
        )
      }
      return countryId
    }
    return modernIds.length === 1 ? modernIds[0] : null
  }

  /**
   * 부처의 소속 국가 축 또는 분류가 변경되었을 때, 이 부처에 귀속된 직위 정의(GovernmentPositionDefinition)들의
   * 스코프(GovernmentPositionDefinitionScope) 및 상속 분류(categoryId)를 부처와 일치하도록 동기화한다.
   * 기존 스코프에 입력된 localTitle·note·기간 및 타국 공유 스코프를 유실하지 않도록 이전 국가 스코프를 in-place 갱신한다.
   */
  private async syncDependentPositionDefinitions(
    departmentId: string,
    opts: {
      countryChanged: boolean
      prevCountryId: string | null
      prevHistoricalCountryId: string | null
      effectiveCountryId: string | null
      effectiveHistoricalCountryId: string | null
      categoryChanged: boolean
      prevCategoryId: string | null
      nextCategoryId: string | null
    },
  ): Promise<void> {
    if (!this.prisma.governmentPositionDefinition) return
    const definitions = await this.prisma.governmentPositionDefinition.findMany({
      where: { administrationDepartmentId: departmentId },
      select: { id: true, categoryId: true },
    })
    if (definitions.length === 0) return

    if (opts.categoryChanged) {
      const targetDefIds = definitions
        .filter((d) => d.categoryId == null || d.categoryId === opts.prevCategoryId)
        .map((d) => d.id)
      if (targetDefIds.length > 0) {
        await this.prisma.governmentPositionDefinition.updateMany({
          where: { id: { in: targetDefIds } },
          data: { categoryId: opts.nextCategoryId },
        })
      }
    }

    if (
      opts.countryChanged &&
      this.prisma.governmentPositionDefinitionScope &&
      (opts.effectiveCountryId || opts.effectiveHistoricalCountryId)
    ) {
      const defIds = definitions.map((d) => d.id)
      const existingScopes =
        (await this.prisma.governmentPositionDefinitionScope.findMany?.({
          where: { definitionId: { in: defIds } },
          select: {
            id: true,
            definitionId: true,
            countryId: true,
            historicalCountryId: true,
          },
        })) ?? []

      const scopeIdsToUpdate: string[] = []
      const scopeIdsToDelete: string[] = []
      const defIdsToCreate: string[] = []

      for (const defId of defIds) {
        const defScopes = existingScopes.filter((s) => s.definitionId === defId)
        const alreadyHasTarget = defScopes.some(
          (s) =>
            s.countryId === opts.effectiveCountryId &&
            s.historicalCountryId === opts.effectiveHistoricalCountryId,
        )
        const matchingPrev = defScopes.filter((s) =>
          opts.prevHistoricalCountryId
            ? s.historicalCountryId === opts.prevHistoricalCountryId
            : s.countryId === opts.prevCountryId && s.historicalCountryId == null,
        )
        const candidates =
          matchingPrev.length > 0
            ? matchingPrev
            : defScopes.length === 1
              ? defScopes
              : []

        if (candidates.length > 0) {
          if (alreadyHasTarget) {
            for (const c of candidates) {
              if (
                c.countryId !== opts.effectiveCountryId ||
                c.historicalCountryId !== opts.effectiveHistoricalCountryId
              ) {
                scopeIdsToDelete.push(c.id)
              }
            }
          } else {
            scopeIdsToUpdate.push(candidates[0].id)
            for (const extra of candidates.slice(1)) {
              scopeIdsToDelete.push(extra.id)
            }
          }
        } else if (!alreadyHasTarget) {
          defIdsToCreate.push(defId)
        }
      }

      if (scopeIdsToDelete.length > 0) {
        await this.prisma.governmentPositionDefinitionScope.deleteMany({
          where: { id: { in: scopeIdsToDelete } },
        })
      }
      if (
        scopeIdsToUpdate.length > 0 &&
        this.prisma.governmentPositionDefinitionScope.updateMany
      ) {
        await this.prisma.governmentPositionDefinitionScope.updateMany({
          where: { id: { in: scopeIdsToUpdate } },
          data: {
            countryId: opts.effectiveCountryId,
            historicalCountryId: opts.effectiveHistoricalCountryId,
          },
        })
      }
      if (defIdsToCreate.length > 0) {
        await this.prisma.governmentPositionDefinitionScope.createMany({
          data: defIdsToCreate.map((definitionId) => ({
            definitionId,
            countryId: opts.effectiveCountryId,
            historicalCountryId: opts.effectiveHistoricalCountryId,
          })),
        })
      }
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

  /**
   * 두 기관의 국가 축(countryId / historicalCountryId)이 같은 국가(또는 브리지로 연결된 계보)에 속하는지 확인한다.
   */
  private async areCountryAxesCompatible(
    a: { countryId: string | null; historicalCountryId: string | null },
    b: { countryId: string | null; historicalCountryId: string | null },
    options?: { allowSiblingHistoricalEras?: boolean },
  ): Promise<boolean> {
    if (!a.countryId && !a.historicalCountryId) return true
    if (!b.countryId && !b.historicalCountryId) return true

    if (a.historicalCountryId || b.historicalCountryId) {
      if (a.historicalCountryId && b.historicalCountryId) {
        if (a.historicalCountryId === b.historicalCountryId) return true
        if (!options?.allowSiblingHistoricalEras) return false
      } else if (!options?.allowSiblingHistoricalEras) {
        return false
      }
    }

    if (a.countryId && b.countryId && a.countryId === b.countryId) {
      return true
    }

    const resolveModerns = async (axis: {
      countryId: string | null
      historicalCountryId: string | null
    }): Promise<Set<string>> => {
      const set = new Set<string>()
      if (axis.countryId) set.add(axis.countryId)
      if (axis.historicalCountryId) {
        const links = await this.prisma.historicalCountryModernCountry.findMany({
          where: { historicalCountryId: axis.historicalCountryId },
          select: { modernCountryId: true },
        })
        for (const l of links) {
          if (l.modernCountryId) set.add(l.modernCountryId)
        }
      }
      return set
    }

    const [modernsA, modernsB] = await Promise.all([resolveModerns(a), resolveModerns(b)])
    for (const m of modernsA) {
      if (modernsB.has(m)) return true
    }
    return false
  }

  private async assertNoDuplicateDepartment(opts: {
    excludeId?: string
    name: string
    countryId: string | null
    historicalCountryId: string | null
    parentId: string | null
    established: { era: Era | null; year: number | null; month: number | null; day: number | null }
    abolished: { era: Era | null; year: number | null; month: number | null; day: number | null }
  }): Promise<void> {
    if (!this.prisma.administrationDepartment?.findMany) return
    const trimmedName = opts.name.trim()
    if (!trimmedName) return
    const existingList = await this.prisma.administrationDepartment.findMany({
      where: {
        name: trimmedName,
        countryId: opts.countryId,
        historicalCountryId: opts.historicalCountryId,
        parentId: opts.parentId,
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        establishedEra: true,
        establishedYear: true,
        establishedMonth: true,
        establishedDay: true,
        abolishedEra: true,
        abolishedYear: true,
        abolishedMonth: true,
        abolishedDay: true,
      },
    })
    if (!existingList || existingList.length === 0) return

    const newStart = structuredDateKey(
      opts.established.era,
      opts.established.year,
      opts.established.month,
      opts.established.day,
    )
    const newEnd = structuredDateEndKey(
      opts.abolished.era,
      opts.abolished.year,
      opts.abolished.month,
      opts.abolished.day,
    )

    for (const row of existingList) {
      const existingStart = structuredDateKey(
        row.establishedEra,
        row.establishedYear,
        row.establishedMonth,
        row.establishedDay,
      )
      const existingEnd = structuredDateEndKey(
        row.abolishedEra,
        row.abolishedYear,
        row.abolishedMonth,
        row.abolishedDay,
      )
      const disjoint =
        (newEnd != null && existingStart != null && newEnd < existingStart) ||
        (existingEnd != null && newStart != null && existingEnd < newStart)
      if (!disjoint) {
        throw new ConflictException(
          `이미 같은 국가·시대 소속에 동일한 이름의 기관(「${trimmedName}」)이 등록되어 있습니다.`,
        )
      }
    }
  }

  private async assertCompatibleParentDepartment(
    parentId: string,
    countryId: string | null | undefined,
    historicalCountryId: string | null | undefined,
  ): Promise<void> {
    const parent = await this.prisma.administrationDepartment.findUnique({
      where: { id: parentId },
      select: { id: true, name: true, countryId: true, historicalCountryId: true },
    })
    if (!parent) throw new NotFoundException('상위 기관을 찾을 수 없습니다.')
    const compatible = await this.areCountryAxesCompatible(
      { countryId: countryId ?? null, historicalCountryId: historicalCountryId ?? null },
      parent,
      { allowSiblingHistoricalEras: false },
    )
    if (!compatible) {
      throw new BadRequestException(
        `상위 기관(${parent.name})의 소속 국가·시대와 현재 기관의 소속 국가·시대가 일치하지 않습니다.`,
      )
    }
  }

  private async assertCompatibleDependentsOnCountryChange(
    id: string,
    countryId: string | null | undefined,
    historicalCountryId: string | null | undefined,
    prevAxis?: {
      prevCountryId: string | null
      prevHistoricalCountryId: string | null
    },
  ): Promise<void> {
    const targetAxis = {
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
    }
    const [children, tenures, transitions, definitions, militaryUnits] = await Promise.all([
      this.prisma.administrationDepartment.findMany({
        where: { parentId: id },
        select: { id: true, name: true, countryId: true, historicalCountryId: true },
      }),
      this.prisma.governmentPositionTenure.findMany({
        where: { administrationDepartmentId: id },
        select: { id: true, countryId: true, historicalCountryId: true },
      }),
      this.prisma.administrationDepartmentTransition?.findMany
        ? this.prisma.administrationDepartmentTransition.findMany({
            where: { OR: [{ predecessorId: id }, { successorId: id }] },
            select: {
              predecessorId: true,
              successorId: true,
              predecessor: {
                select: { id: true, name: true, countryId: true, historicalCountryId: true },
              },
              successor: {
                select: { id: true, name: true, countryId: true, historicalCountryId: true },
              },
            },
          })
        : Promise.resolve([]),
      this.prisma.governmentPositionDefinition?.findMany
        ? this.prisma.governmentPositionDefinition.findMany({
            where: { administrationDepartmentId: id },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      (this.prisma as any).militaryUnit?.findMany
        ? (this.prisma as any).militaryUnit.findMany({
            where: { administrationDepartmentId: id },
            select: { id: true, name: true, countryId: true, historicalCountryId: true },
          })
        : Promise.resolve([]),
    ])
    for (const child of children) {
      const sharesPrevParentAxis =
        prevAxis != null &&
        (child.countryId ?? null) === prevAxis.prevCountryId &&
        (child.historicalCountryId ?? null) === prevAxis.prevHistoricalCountryId
      const compatible = await this.areCountryAxesCompatible(targetAxis, child, {
        allowSiblingHistoricalEras: sharesPrevParentAxis,
      })
      if (!compatible) {
        throw new BadRequestException(
          `하위 기관(${child.name})의 소속 국가·시대와 변경하려는 소속 국가·시대가 일치하지 않습니다. 하위 기관을 먼저 옮겨 주세요.`,
        )
      }
    }
    for (const unit of militaryUnits ?? []) {
      const compatible = await this.areCountryAxesCompatible(targetAxis, unit, {
        allowSiblingHistoricalEras: false,
      })
      if (!compatible) {
        throw new BadRequestException(
          `연결된 군 부대(${unit.name})의 소속 국가·시대와 변경하려는 소속 국가·시대가 일치하지 않습니다. 군 부대를 먼저 정리해 주세요.`,
        )
      }
    }
    for (const tenure of tenures) {
      const compatible = await this.areCountryAxesCompatible(targetAxis, tenure, {
        allowSiblingHistoricalEras: false,
      })
      if (!compatible) {
        throw new BadRequestException(
          '이미 이 기관에 연결된 재임 기록이 변경하려는 소속 국가·시대와 일치하지 않습니다. 재임 기록을 먼저 정리해 주세요.',
        )
      }
    }
    for (const t of transitions ?? []) {
      const other = t.predecessorId === id ? t.successor : t.predecessor
      if (!other) continue
      const compatible = await this.areCountryAxesCompatible(targetAxis, other, {
        allowSiblingHistoricalEras: true,
      })
      if (!compatible) {
        throw new BadRequestException(
          `계보로 연결된 기관(${other.name})의 소속 국가와 변경하려는 소속 국가가 호환되지 않습니다. 계보 연결을 먼저 해제해 주세요.`,
        )
      }
    }
    const defIds = (definitions ?? []).map((d) => d.id)
    if (defIds.length > 0) {
      const [defTenures, defPoliticalSystems] = await Promise.all([
        this.prisma.governmentPositionTenure.findMany({
          where: { positionDefinitionId: { in: defIds } },
          select: { id: true, countryId: true, historicalCountryId: true },
        }),
        this.prisma.politicalSystem?.findMany
          ? this.prisma.politicalSystem.findMany({
              where: {
                OR: [
                  { headOfStatePositionId: { in: defIds } },
                  { headOfGovernmentPositionId: { in: defIds } },
                ],
              },
              select: { id: true, name: true, countryId: true, historicalCountryId: true },
            })
          : Promise.resolve([]),
      ])
      for (const dt of defTenures ?? []) {
        const compatible = await this.areCountryAxesCompatible(targetAxis, dt, {
          allowSiblingHistoricalEras: false,
        })
        if (!compatible) {
          throw new BadRequestException(
            '이 기관 소속 직위 정의를 참조하는 재임 기록이 변경하려는 소속 국가·시대와 일치하지 않습니다. 재임 기록을 먼저 정리해 주세요.',
          )
        }
      }
      for (const ps of defPoliticalSystems ?? []) {
        const compatible = await this.areCountryAxesCompatible(targetAxis, ps, {
          allowSiblingHistoricalEras: false,
        })
        if (!compatible) {
          throw new BadRequestException(
            `이 기관 소속 직위 정의를 수반 직위로 참조하는 정체(${ps.name})의 소속 국가·시대와 일치하지 않습니다.`,
          )
        }
      }
    }
  }

  private async assertCompatibleTransitionDepartments(
    predecessorId: string,
    successorId: string,
  ): Promise<void> {
    const [predecessor, successor] = await Promise.all([
      this.prisma.administrationDepartment.findUnique({
        where: { id: predecessorId },
        select: { id: true, name: true, countryId: true, historicalCountryId: true },
      }),
      this.prisma.administrationDepartment.findUnique({
        where: { id: successorId },
        select: { id: true, name: true, countryId: true, historicalCountryId: true },
      }),
    ])
    if (!predecessor) throw new NotFoundException('기관을 찾을 수 없습니다.')
    if (!successor) throw new NotFoundException('뒤 기관을 찾을 수 없습니다.')
    const compatible = await this.areCountryAxesCompatible(predecessor, successor, {
      allowSiblingHistoricalEras: true,
    })
    if (!compatible) {
      throw new BadRequestException(
        `서로 다른 국가의 기관(${predecessor.name} → ${successor.name})끼리는 계보를 연결할 수 없습니다.`,
      )
    }
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
