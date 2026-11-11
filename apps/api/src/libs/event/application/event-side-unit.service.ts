import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Era, EstimateRole, ObservationSubjectType, PrismaClient, SideUnitRole } from '@prisma/client'

import { removeObservationsForSubjects } from '../../evidence/application/observation-cleanup'
import { displayPersonName } from '../../shared/person-display-name'
import { assertEventOwnership } from '../domain/event-ownership'
import { partsOf } from './person-participation'

/** 부대 계통의 한 칸 — 상위 부대 사슬과 소속 기관을 화면이 그대로 쓴다 */
export interface SideUnitLineage {
  id: string
  name: string
  abbreviation?: string | null
  unitType?: string | null
}

/** 작전 시점의 부대 지휘관 — 명시 오버라이드 또는 부대 지휘관 임기(GovernmentPositionTenure / MilitaryUnitCommander)에서 자동 추론 */
export interface SideUnitCommanderView {
  id: string
  name: string
  rank: string | null
  role: string | null
  isOverride: boolean
  /** 해당 군사부대의 GovernmentPositionTenure 정본과 연결되어 있으면 그 tenure ID */
  tenureId: string | null
}

/** 투입 부대 한 줄의 대표 측정값(병력·전차·항공기·사상자 등) */
export interface SideUnitMetricView {
  id: string
  metricKey: string
  metricName: string
  unit: string | null
  value: number | null
  low: number | null
  high: number | null
  approx: boolean
  qualifier: string | null
}

export interface SideUnitView {
  /** 투입 줄 id — 이 작전 병력 측정값의 subjectId(EVENT_SIDE_UNIT) */
  id: string
  sideId: string
  /** 작전 당시 배속 상급 부대 오버라이드 ID (null이면 기본 편제) */
  parentUnitId: string | null
  /** 작전 당시 지휘관 오버라이드 ID (null이면 임기 자동 추론) */
  commanderId: string | null
  commander: SideUnitCommanderView | null
  role: SideUnitRole | null
  note: string | null
  sortOrder: number
  metrics: SideUnitMetricView[]
  unit: {
    id: string
    name: string
    abbreviation?: string | null
    unitType: string | null
    branch: string | null
    nickname: string | null
    countryId: string | null
    historicalCountryId: string | null
    /** 소속 국가 이름 — 역사 우선 */
    countryName: string | null
    /** 바로 위 부대부터 맨 위 부대까지(가까운 순) */
    parents: SideUnitLineage[]
    /**
     * 소속 행정부처 — 이 부대 또는 상위 부대에 걸린 민간 부처(국방부·국방인민위원부 등).
     * OKW·OHL·스타프카 등 군 최고사령부는 parents 부대 사슬 맨 위에 그대로 올라간다.
     */
    department: { id: string; name: string; abbreviation: string | null } | null
  }
}

export interface AddSideUnitInput {
  militaryUnitId: string
  parentUnitId?: string | null
  commanderId?: string | null
  role?: SideUnitRole | null
  note?: string | null
}

export interface UpdateSideUnitInput {
  parentUnitId?: string | null
  commanderId?: string | null
  role?: SideUnitRole | null
  note?: string | null
  sortOrder?: number
}

const PERSON_DISPLAY_SELECT = {
  id: true,
  name: true,
  surname: true,
  middleName: true,
  nameDisplayOrder: true,
  country: { select: { defaultNameDisplayOrder: true } },
} as const

const UNIT_SELECT = {
  id: true,
  name: true,
  abbreviation: true,
  unitType: true,
  branch: true,
  nickname: true,
  countryId: true,
  historicalCountryId: true,
  parentUnitId: true,
  administrationDepartmentId: true,
  country: { select: { name: true } },
  historicalCountry: { select: { name: true } },
  administrationDepartment: { select: { id: true, name: true, abbreviation: true } },
  tenures: {
    orderBy: { startKey: 'desc' },
    select: {
      id: true,
      personId: true,
      title: true,
      rankTitle: true,
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
      positionDefinition: { select: { title: true } },
      person: { select: PERSON_DISPLAY_SELECT },
    },
  },
  commanders: {
    select: {
      personId: true,
      rank: true,
      role: true,
      isCurrent: true,
      startDate: true,
      endDate: true,
      person: { select: PERSON_DISPLAY_SELECT },
    },
  },
} as const

/**
 * 사건 진영의 투입 부대 — 쓰기 단일 통로.
 *
 * 부대 자체(이름·계통·소속 기관·지휘관)는 군사 부대 도메인이 쓰고, 여기는 '이 작전에 이 진영으로 들어갔다'는
 * 연결과 그 몫(주공·조공·예비)·작전 당시 배속 상급 부대(parentUnitId)·지휘관(commanderId)을 쓴다.
 * 병력·전차는 측정값(EVENT_SIDE_UNIT)이라 출처·범위·'약'을 그대로 쓴다.
 * 줄을 지우면 그 줄의 측정값도 같은 트랜잭션에서 지운다(다형이라 FK가 없다).
 */
@Injectable()
export class EventSideUnitService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(eventId: string): Promise<SideUnitView[]> {
    const [event, rows] = await Promise.all([
      this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          startDate: true,
          startEra: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endDate: true,
          endEra: true,
          endYear: true,
          endMonth: true,
          endDay: true,
        },
      }),
      this.prisma.sideDeployedUnit.findMany({
        where: { side: { eventId } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          militaryUnit: { select: UNIT_SELECT },
          commander: { select: PERSON_DISPLAY_SELECT },
        },
      }),
    ])
    return this.toViews(rows, event)
  }

  async add(actorId: string, eventId: string, sideId: string, input: AddSideUnitInput): Promise<SideUnitView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, { action: '수정', deleted: 'conflict' })
    const side = await this.prisma.eventSide.findUnique({ where: { id: sideId }, select: { eventId: true } })
    if (!side || side.eventId !== eventId) throw new NotFoundException('이 사건의 진영이 아닙니다')
    const unit = await this.prisma.militaryUnit.findUnique({ where: { id: input.militaryUnitId }, select: { id: true } })
    if (!unit) throw new NotFoundException('부대를 찾을 수 없습니다')
    if (input.parentUnitId) {
      if (input.parentUnitId === input.militaryUnitId) {
        throw new BadRequestException('자기 자신을 상급 부대로 지정할 수 없습니다')
      }
      const parentUnit = await this.prisma.militaryUnit.findUnique({
        where: { id: input.parentUnitId },
        select: { id: true },
      })
      if (!parentUnit) throw new NotFoundException('상급 부대를 찾을 수 없습니다')
    }
    if (input.commanderId) {
      const commander = await this.prisma.person.findUnique({
        where: { id: input.commanderId },
        select: { id: true },
      })
      if (!commander) throw new NotFoundException('지휘관 인물을 찾을 수 없습니다')
    }
    /* 같은 사건 다른 진영에 이미 있으면 막는다 — 한 작전에서 한 부대가 양편일 수는 없다 */
    const elsewhere = await this.prisma.sideDeployedUnit.findFirst({
      where: { militaryUnitId: input.militaryUnitId, side: { eventId } },
      select: { sideId: true },
    })
    if (elsewhere) {
      throw new BadRequestException(
        elsewhere.sideId === sideId ? '이미 이 진영에 투입된 부대입니다' : '이 사건의 다른 진영에 이미 투입된 부대입니다',
      )
    }
    const last = await this.prisma.sideDeployedUnit.aggregate({ where: { sideId }, _max: { sortOrder: true } })
    await this.prisma.sideDeployedUnit.create({
      data: {
        sideId,
        militaryUnitId: input.militaryUnitId,
        parentUnitId: input.parentUnitId ?? null,
        commanderId: input.commanderId ?? null,
        role: input.role ?? null,
        note: input.note?.trim() || null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    })
    return this.list(eventId)
  }

  async update(actorId: string, eventId: string, id: string, input: UpdateSideUnitInput): Promise<SideUnitView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, { action: '수정', deleted: 'conflict' })
    const row = await this.assertRowOfEvent(eventId, id)
    if (input.parentUnitId) {
      if (input.parentUnitId === row.militaryUnitId) {
        throw new BadRequestException('자기 자신을 상급 부대로 지정할 수 없습니다')
      }
      const parentUnit = await this.prisma.militaryUnit.findUnique({
        where: { id: input.parentUnitId },
        select: { id: true },
      })
      if (!parentUnit) throw new NotFoundException('상급 부대를 찾을 수 없습니다')
    }
    if (input.commanderId) {
      const commander = await this.prisma.person.findUnique({
        where: { id: input.commanderId },
        select: { id: true },
      })
      if (!commander) throw new NotFoundException('지휘관 인물을 찾을 수 없습니다')
    }
    await this.prisma.sideDeployedUnit.update({
      where: { id },
      data: {
        ...(input.parentUnitId !== undefined ? { parentUnitId: input.parentUnitId } : {}),
        ...(input.commanderId !== undefined ? { commanderId: input.commanderId } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    })
    return this.list(eventId)
  }

  async remove(actorId: string, eventId: string, id: string): Promise<SideUnitView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, { action: '수정', deleted: 'conflict' })
    await this.assertRowOfEvent(eventId, id)
    await this.prisma.$transaction(async (tx) => {
      await removeObservationsForSubjects(tx, ObservationSubjectType.EVENT_SIDE_UNIT, [id])
      await tx.sideDeployedUnit.delete({ where: { id } })
    })
    return this.list(eventId)
  }

  /**
   * 전투서열(ORBAT)에 지정된 지휘관을 군사부대 보직 정본(GovernmentPositionTenure)으로 역방향 동기화한다.
   */
  async syncCommanderTenure(actorId: string, eventId: string, id: string): Promise<SideUnitView[]> {
    await assertEventOwnership(this.prisma, eventId, actorId, { action: '수정', deleted: 'conflict' })
    const row = await this.prisma.sideDeployedUnit.findUnique({
      where: { id },
      select: {
        id: true,
        commanderId: true,
        side: {
          select: {
            eventId: true,
            event: {
              select: {
                title: true,
                startDate: true,
                startEra: true,
                startYear: true,
                startMonth: true,
                startDay: true,
                endDate: true,
                endEra: true,
                endYear: true,
                endMonth: true,
                endDay: true,
              },
            },
          },
        },
        militaryUnit: {
          select: {
            id: true,
            name: true,
            unitType: true,
            countryId: true,
            historicalCountryId: true,
            tenures: {
              select: {
                id: true,
                personId: true,
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
              },
            },
            commanders: {
              select: {
                personId: true,
                rank: true,
                role: true,
              },
            },
          },
        },
      },
    })
    if (!row || row.side.eventId !== eventId) {
      throw new NotFoundException('이 사건의 투입 부대가 아닙니다')
    }
    const targetPersonId = row.commanderId
    if (!targetPersonId) {
      throw new BadRequestException('이 전투서열 항목에 직접 지정된 지휘관이 없습니다')
    }

    const eventInfo = row.side.event
    const evStart = partsOf(
      eventInfo.startEra,
      eventInfo.startYear,
      eventInfo.startMonth,
      eventInfo.startDay,
      eventInfo.startDate,
    )
    if (!evStart.year || evStart.year < 1) {
      throw new BadRequestException(
        '사건 시작 연도가 없어 지휘관 보직 임기를 자동 생성할 수 없습니다. 부대 상세에서 직접 등록해 주세요.',
      )
    }
    const evEnd = partsOf(
      eventInfo.endEra,
      eventInfo.endYear,
      eventInfo.endMonth,
      eventInfo.endDay,
      eventInfo.endDate,
    )
    const evStartKey = dateKey(evStart.year, evStart.month, evStart.day, false)
    const evEndKey = dateKey(evEnd.year, evEnd.month, evEnd.day, true) ?? evStartKey

    const alreadyLinked = row.militaryUnit.tenures.some((tenureItem) => {
      if (tenureItem.personId !== targetPersonId) return false
      if (evStartKey == null || evEndKey == null) return true
      const tStart = partsOf(
        tenureItem.startEra,
        tenureItem.startYear,
        tenureItem.startMonth,
        tenureItem.startDay,
        tenureItem.startDate,
      )
      const tEnd = partsOf(
        tenureItem.endEra,
        tenureItem.endYear,
        tenureItem.endMonth,
        tenureItem.endDay,
        tenureItem.endDate,
      )
      const tStartKey = dateKey(tStart.year, tStart.month, tStart.day, false)
      const tEndKey = dateKey(tEnd.year, tEnd.month, tEnd.day, true) ?? Number.MAX_SAFE_INTEGER
      if (tStartKey == null) return true
      return tStartKey <= evEndKey && tEndKey >= evStartKey
    })

    if (alreadyLinked) {
      return this.list(eventId)
    }

    let genericDef = await this.prisma.governmentPositionDefinition.findFirst({
      where: { positionType: 'MILITARY_COMMANDER', isGeneric: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!genericDef) {
      genericDef = await this.prisma.governmentPositionDefinition.findFirst({
        where: { positionType: 'MILITARY_COMMANDER' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
    }
    if (!genericDef) {
      genericDef = await this.prisma.governmentPositionDefinition.create({
        data: {
          title: '군 지휘관',
          positionType: 'MILITARY_COMMANDER',
          isGeneric: true,
        },
        select: { id: true },
      })
    }

    const legacyMatch = row.militaryUnit.commanders.find(
      (cmdItem) => cmdItem.personId === targetPersonId,
    )
    const unitName = row.militaryUnit.name
    const unitType = row.militaryUnit.unitType
    const defaultRoleSuffix =
      unitType === 'SUPREME_COMMAND' || unitType === 'THEATER'
        ? '총사령관'
        : unitType === 'GENERAL_STAFF'
          ? '참모총장'
          : unitType === 'CORPS' || unitType === 'AIR_CORPS'
            ? '군단장'
            : unitType === 'DIVISION'
              ? '사단장'
              : unitType === 'BRIGADE'
                ? '여단장'
                : unitType === 'REGIMENT'
                  ? '연대장'
                  : unitType === 'BATTALION'
                    ? '대대장'
                    : unitType === 'FLEET'
                      ? '함대사령관'
                      : '사령관'
    const computedTitle =
      legacyMatch?.role?.trim() || `${unitName} ${defaultRoleSuffix}`

    const resolvedEnd = evEnd.year != null ? evEnd : evStart

    await this.prisma.governmentPositionTenure.create({
      data: {
        personId: targetPersonId,
        positionDefinitionId: genericDef.id,
        positionType: 'MILITARY_COMMANDER',
        title: computedTitle.slice(0, 100),
        rankTitle: legacyMatch?.rank?.trim() || null,
        militaryUnitId: row.militaryUnit.id,
        countryId: row.militaryUnit.countryId ?? null,
        historicalCountryId: row.militaryUnit.historicalCountryId ?? null,
        startEra: (evStart.year != null && evStart.year < 0 ? 'BC' : 'AD') as Era,
        startYear: evStart.year != null ? Math.abs(evStart.year) : null,
        startMonth: evStart.month ?? null,
        startDay: evStart.day ?? null,
        endEra: (resolvedEnd.year != null && resolvedEnd.year < 0 ? 'BC' : 'AD') as Era,
        endYear: resolvedEnd.year != null ? Math.abs(resolvedEnd.year) : null,
        endMonth: resolvedEnd.month ?? null,
        endDay: resolvedEnd.day ?? null,
        notes: `사건 「${eventInfo.title}」 전투서열(ORBAT) 지휘관 지정에서 동기화됨`,
      },
    })

    return this.list(eventId)
  }

  private async assertRowOfEvent(eventId: string, id: string): Promise<{ militaryUnitId: string }> {
    const row = await this.prisma.sideDeployedUnit.findUnique({
      where: { id },
      select: { militaryUnitId: true, side: { select: { eventId: true } } },
    })
    if (!row || row.side.eventId !== eventId) throw new NotFoundException('이 사건의 투입 부대가 아닙니다')
    return { militaryUnitId: row.militaryUnitId }
  }

  /** 상위 부대 사슬·소속 기관·작전 당시 지휘관·부대별 측정값을 채운다 */
  private async toViews(
    rows: Array<{
      id: string
      sideId: string
      parentUnitId: string | null
      commanderId: string | null
      commander: CommanderPersonRow | null
      role: SideUnitRole | null
      note: string | null
      sortOrder: number
      militaryUnit: UnitRow
    }>,
    event: {
      startDate: Date | null
      startEra: string | null
      startYear: number | null
      startMonth: number | null
      startDay: number | null
      endDate: Date | null
      endEra: string | null
      endYear: number | null
      endMonth: number | null
      endDay: number | null
    } | null,
  ): Promise<SideUnitView[]> {
    if (rows.length === 0) return []
    const byId = new Map<string, UnitRow>()
    for (const row of rows) byId.set(row.militaryUnit.id, row.militaryUnit)

    /* 작전 당시 상급 부대 오버라이드(row.parentUnitId)가 있으면 그것도 초기 탐색 대상에 넣는다 */
    const initialOverrideIds = rows
      .map((row) => row.parentUnitId)
      .filter((id): id is string => Boolean(id) && !byId.has(id as string))
    if (initialOverrideIds.length > 0) {
      const overrideUnits = await this.prisma.militaryUnit.findMany({
        where: { id: { in: [...new Set(initialOverrideIds)] } },
        select: UNIT_SELECT,
      })
      for (const overrideUnit of overrideUnits) {
        byId.set(overrideUnit.id, overrideUnit)
      }
    }

    /* 상위 부대를 필요한 만큼 한 단씩 — 순환 방어(최대 12단) */
    for (let depth = 0; depth < 12; depth += 1) {
      const missing = [...byId.values()]
        .map((unit) => unit.parentUnitId)
        .filter((id): id is string => Boolean(id) && !byId.has(id as string))
      if (missing.length === 0) break
      const parents = await this.prisma.militaryUnit.findMany({ where: { id: { in: missing } }, select: UNIT_SELECT })
      if (parents.length === 0) break
      for (const parent of parents) byId.set(parent.id, parent)
    }

    /* 같은 진영 안에서 투입된 다른 부대가 작전 당시 상급 부대 오버라이드(parentUnitId)를 갖고 있으면,
       하위 부대가 상위로 걸어 올라갈 때도 그 오버라이드를 존중한다 */
    const overrideParentBySideAndUnit = new Map<string, string>()
    for (const row of rows) {
      if (row.parentUnitId) {
        overrideParentBySideAndUnit.set(`${row.sideId}:${row.militaryUnit.id}`, row.parentUnitId)
      }
    }

    /* 투입 부대별 측정값(EVENT_SIDE_UNIT) 조회 */
    const observations = await this.prisma.observation.findMany({
      where: {
        subjectType: ObservationSubjectType.EVENT_SIDE_UNIT,
        subjectId: { in: rows.map((row) => row.id) },
        estimateRole: EstimateRole.PREFERRED,
      },
      include: {
        metric: {
          select: { key: true, name: true, unit: true, sortOrder: true },
        },
      },
      orderBy: [{ metric: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    })
    const metricsByRowId = new Map<string, SideUnitMetricView[]>()
    for (const obs of observations) {
      const list = metricsByRowId.get(obs.subjectId) ?? []
      list.push({
        id: obs.id,
        metricKey: obs.metric.key,
        metricName: obs.metric.name,
        unit: obs.metric.unit ?? null,
        value: obs.value != null ? Number(obs.value) : null,
        low: obs.low != null ? Number(obs.low) : null,
        high: obs.high != null ? Number(obs.high) : null,
        approx: obs.approx,
        qualifier: obs.qualifier ?? null,
      })
      metricsByRowId.set(obs.subjectId, list)
    }

    return rows.map((row) => {
      const unit = row.militaryUnit
      const parents: SideUnitLineage[] = []
      let department = unit.administrationDepartment
      const seen = new Set<string>([unit.id])
      const firstParentId = row.parentUnitId ?? unit.parentUnitId
      let cursor = firstParentId ? byId.get(firstParentId) : undefined
      while (cursor && !seen.has(cursor.id)) {
        seen.add(cursor.id)
        parents.push({
          id: cursor.id,
          name: cursor.name,
          abbreviation: cursor.abbreviation ?? null,
          unitType: cursor.unitType ?? null,
        })
        department ??= cursor.administrationDepartment
        const nextParentId =
          overrideParentBySideAndUnit.get(`${row.sideId}:${cursor.id}`) ?? cursor.parentUnitId
        cursor = nextParentId ? byId.get(nextParentId) : undefined
      }
      const unifiedCandidates = mergeTenureAndLegacyCommanders(unit.tenures ?? [], unit.commanders ?? [])
      const commander = resolveUnitCommanderAtEvent(row.commanderId, row.commander, unifiedCandidates, event)
      return {
        id: row.id,
        sideId: row.sideId,
        parentUnitId: row.parentUnitId ?? null,
        commanderId: row.commanderId ?? null,
        commander,
        role: row.role,
        note: row.note,
        sortOrder: row.sortOrder,
        metrics: metricsByRowId.get(row.id) ?? [],
        unit: {
          id: unit.id,
          name: unit.name,
          abbreviation: unit.abbreviation ?? null,
          unitType: unit.unitType ?? null,
          branch: unit.branch ?? null,
          nickname: unit.nickname ?? null,
          countryId: unit.countryId,
          historicalCountryId: unit.historicalCountryId,
          countryName: unit.historicalCountry?.name ?? unit.country?.name ?? null,
          parents,
          department: department ?? null,
        },
      }
    })
  }
}

interface CommanderPersonRow {
  id: string
  name: string
  surname: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  country?: { defaultNameDisplayOrder?: string | null } | null
}

interface UnitTenureRow {
  id: string
  personId: string
  title: string | null
  rankTitle: string | null
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  startDate: Date | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  endDate: Date | null
  positionDefinition: { title: string } | null
  person: CommanderPersonRow
}

interface UnitCommanderRow {
  tenureId?: string | null
  personId: string
  rank: string | null
  role: string | null
  isCurrent: boolean | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  startDate: Date | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  endDate: Date | null
  person: CommanderPersonRow
}

interface UnitRow {
  id: string
  name: string
  abbreviation?: string | null
  unitType: string | null
  branch: string | null
  nickname: string | null
  countryId: string | null
  historicalCountryId: string | null
  parentUnitId: string | null
  administrationDepartmentId: string | null
  country: { name: string } | null
  historicalCountry: { name: string } | null
  administrationDepartment: { id: string; name: string; abbreviation: string | null } | null
  tenures?: UnitTenureRow[]
  commanders: UnitCommanderRow[]
}

function mergeTenureAndLegacyCommanders(
  tenures: UnitTenureRow[],
  legacyCommanders: UnitCommanderRow[],
): UnitCommanderRow[] {
  const fromTenures: UnitCommanderRow[] = tenures.map((tenure) => ({
    tenureId: tenure.id,
    personId: tenure.personId,
    rank: tenure.rankTitle ?? null,
    role: tenure.title ?? tenure.positionDefinition?.title ?? null,
    isCurrent: !tenure.endYear && !tenure.endDate,
    startEra: tenure.startEra,
    startYear: tenure.startYear,
    startMonth: tenure.startMonth,
    startDay: tenure.startDay,
    startDate: tenure.startDate,
    endEra: tenure.endEra,
    endYear: tenure.endYear,
    endMonth: tenure.endMonth,
    endDay: tenure.endDay,
    endDate: tenure.endDate,
    person: tenure.person,
  }))
  return [...fromTenures, ...legacyCommanders]
}

function dateKey(year: number | null, month: number | null, day: number | null, isEnd: boolean): number | null {
  if (year == null) return null
  const resolvedMonth = month ?? (isEnd ? 12 : 1)
  const resolvedDay = day ?? (isEnd ? 31 : 1)
  return year * 10000 + resolvedMonth * 100 + resolvedDay
}

/**
 * 작전 당시 부대 지휘관 결정:
 * 1) SideDeployedUnit.commanderId가 명시돼 있으면 그 인물을 최우선 사용 (동일 인물의 부대 재임·지휘관 기록이 있으면 계급·직책 보강)
 * 2) 없으면 통합 재임(GovernmentPositionTenure.militaryUnitId) + 레거시 MilitaryUnit.commanders 중 사건 기간과 임기가 겹치는 지휘관을 자동 선택
 */
function resolveUnitCommanderAtEvent(
  overrideId: string | null,
  overridePerson: CommanderPersonRow | null,
  commanders: UnitCommanderRow[],
  event: {
    startDate: Date | null
    startEra: string | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    endDate: Date | null
    endEra: string | null
    endYear: number | null
    endMonth: number | null
    endDay: number | null
  } | null,
): SideUnitCommanderView | null {
  if (overrideId && overridePerson) {
    const matchedTenure =
      commanders.find((cmd) => cmd.personId === overrideId && Boolean(cmd.tenureId)) ??
      commanders.find((cmd) => cmd.personId === overrideId)
    return {
      id: overridePerson.id,
      name: displayPersonName(overridePerson),
      rank: matchedTenure?.rank ?? null,
      role: matchedTenure?.role ?? null,
      isOverride: true,
      tenureId: matchedTenure?.tenureId ?? null,
    }
  }
  if (commanders.length === 0) return null

  if (event) {
    const evStart = partsOf(event.startEra, event.startYear, event.startMonth, event.startDay, event.startDate)
    const evEnd = partsOf(event.endEra, event.endYear, event.endMonth, event.endDay, event.endDate)
    const evStartKey = dateKey(evStart.year, evStart.month, evStart.day, false)
    const evEndKey = dateKey(evEnd.year, evEnd.month, evEnd.day, true) ?? evStartKey

    if (evStartKey != null && evEndKey != null) {
      const overlapping = commanders.find((cmd) => {
        const cStart = partsOf(cmd.startEra, cmd.startYear, cmd.startMonth, cmd.startDay, cmd.startDate)
        const cEnd = partsOf(cmd.endEra, cmd.endYear, cmd.endMonth, cmd.endDay, cmd.endDate)
        const cStartKey = dateKey(cStart.year, cStart.month, cStart.day, false)
        const cEndKey = dateKey(cEnd.year, cEnd.month, cEnd.day, true) ?? Number.MAX_SAFE_INTEGER
        if (cStartKey == null) return false
        return cStartKey <= evEndKey && cEndKey >= evStartKey
      })
      if (overlapping) {
        return {
          id: overlapping.person.id,
          name: displayPersonName(overlapping.person),
          rank: overlapping.rank ?? null,
          role: overlapping.role ?? null,
          isOverride: false,
          tenureId: overlapping.tenureId ?? null,
        }
      }
    }
  }

  /* 날짜 없는 단일 지휘관 기록 또는 현임(isCurrent) 지휘관 폴백 */
  const fallback =
    commanders.find((cmd) => !cmd.startYear && !cmd.startDate && !cmd.endYear && !cmd.endDate) ??
    (commanders.length === 1 && !commanders[0].startYear && !commanders[0].startDate ? commanders[0] : null)
  if (!fallback) return null
  return {
    id: fallback.person.id,
    name: displayPersonName(fallback.person),
    rank: fallback.rank ?? null,
    role: fallback.role ?? null,
    isOverride: false,
    tenureId: fallback.tenureId ?? null,
  }
}
