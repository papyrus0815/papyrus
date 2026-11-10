import type { EventDomainValue } from '../domain/event-domain'
import type { EventTypeValue } from '../domain/event-type'
import { Injectable } from '@nestjs/common'
import { ObservationSubjectType, Prisma, PrismaClient } from '@prisma/client'

import { columnsToPoint, type StructuredPoint } from '../../shared/structured-point'
import { formatEventDate } from '../domain/event-date'
import { assertEventOwnership } from '../domain/event-ownership'

/**
 * 최상위 사건 조망 — 하위 사건 **전부**를 한 번에, 집계에 필요한 사실만 실어 준다.
 *
 * 왜 따로 두나: 상세 응답은 직계 자식의 제목·날짜까지만 싣고, 목록 응답은 인물·진영·수치를
 * 싣지 않는다. 최상위 사건 화면은 하위 전체의 참여국·인물·진영·수치를 한꺼번에 세야 해서,
 * 기존 API로는 하위 사건마다 상세를 따로 받아야 했다(1차세계대전 18회).
 *
 * 범위: 주 상위(parentEventId) 계보만 따라 내려간다. 추가 상위(EventParentLink)로만 붙은
 * 사건은 다른 계보의 일원이라 세지 않는다(같은 사건이 두 조망에 이중 집계되는 것 방지).
 * 소프트삭제된 사건과 그 아래는 뺀다.
 */

/** 무한 루프·폭주 방지 — 실데이터 최대 깊이는 2, 최대 하위는 18 */
const MAX_DEPTH = 12
const MAX_NODES = 2000

export interface EventOverviewCountry {
  /** 'c:<id>'(현대) | 'h:<id>'(역사) — 두 FK 공간을 한 축으로 셀 때의 키 */
  key: string
  id: string
  kind: 'modern' | 'historical'
  name: string
  flagEmoji: string | null
  role: string | null
  roleDescription?: string | null
  sideId: string | null
  join?: StructuredPoint | null
  joinReason?: string | null
  withdraw?: StructuredPoint | null
  withdrawReason?: string | null
}

export interface EventOverviewPerson {
  personId: string
  name: string | null
  surname: string | null
  middleName: string | null
  nameDisplayOrder: string | null
  defaultNameDisplayOrder: string | null
  profileImageUrl: string | null
  role: string | null
  sideId: string | null
}

export interface EventOverviewDeployedUnit {
  id: string
  militaryUnitId: string
  name: string
  unitType: string | null
  branch: string | null
  /** 작전 당시 상급 부대 오버라이드 우선, 없으면 기본 상위 부대 */
  parentUnitId: string | null
  role: string | null
  note: string | null
}

export interface EventOverviewSide {
  id: string
  name: string
  color: string | null
  outcome?: string | null
  outcomeNote?: string | null
  parentSideId?: string | null
  deployedUnits?: EventOverviewDeployedUnit[]
}

export interface EventOverviewMetric {
  metricKey: string
  metricName: string
  unit: string | null
  value: number | null
  low: number | null
  high: number | null
  approx: boolean
  /** '이상' — 하한만 아는 값(1,000명 이상) */
  atLeast: boolean
  /**
   * 누구의 수치인가 — 사건 전체 · 진영 · 참여국 한 줄 · 투입 부대 한 줄.
   * 실데이터 수치는 대부분 진영·참여국·부대에 걸려 있다.
   */
  scope: 'EVENT' | 'SIDE' | 'PARTICIPANT' | 'UNIT'
  /** 진영 이름·참여국 이름·투입 부대 이름 — 사건 전체면 null */
  scopeLabel: string | null
}

export interface EventOverviewNode {
  id: string
  title: string
  description: string | null
  parentEventId: string | null
  /** 조망 루트 0, 직계 1, 손자 2 … */
  depth: number
  startDate: string | null
  startDatePrecision: string | null
  endDate: string | null
  endDatePrecision: string | null
  location: string | null
  /** 지도 핀(대표 한 점) — 위도·경도가 짝으로 있을 때만. 조망 '지도' 보기가 하위 전부를 한 지도에 꽂는다 */
  locationLatitude: number | null
  locationLongitude: number | null
  locationNote: string | null
  /** 분야 — 무엇에 관한 일인가 */
  domain: EventDomainValue
  /** 세부 분야 — 점검표가 세부(와 분야)로 적용 칸을 고른다 */
  type: EventTypeValue | null
  /** 사건 종류 — 묶음 전개 트리가 '하위가 아직 없는 묶음'(끌어다 놓을 수 있는 자리)을 알아보게 */
  kind: 'SINGLE' | 'COLLECTION'
  /** 손으로 넣은 상위의 국면(없으면 날짜로 자동) */
  phaseId: string | null
  /** 이 묶음의 국면 — 사건이 아니라 구획(목차) */
  phases: Array<{
    id: string
    title: string
    order: number
    startEra: 'BC' | 'AD' | null
    startYear: number | null
    startMonth: number | null
    startDay: number | null
    endEra: 'BC' | 'AD' | null
    endYear: number | null
    endMonth: number | null
    endDay: number | null
  }>
  countries: EventOverviewCountry[]
  persons: EventOverviewPerson[]
  sides: EventOverviewSide[]
  metrics: EventOverviewMetric[]
  /** 기록 점검용 — 무엇이 채워졌나 */
  sectionCount: number
  imageCount: number
  hasBackground: boolean
  hasAftermath: boolean
}

/**
 * 관련 사건(event_relation) 한 줄 — 한쪽 이상이 이 트리 안. 방향 유형은 fromId → toId로 읽는다.
 * 둘 다 트리 안이면 external은 null, 한쪽이 트리 밖이면 그 사건의 제목·날짜를 싣는다(조망은 트리 밖 노드를 모른다).
 */
export interface EventOverviewRelation {
  id: string
  fromId: string
  toId: string
  type: 'LED_TO' | 'INFLUENCED' | 'RESPONSE_TO' | 'CONCURRENT' | 'RELATED'
  description: string | null
  external: { id: string; title: string; startDate: string | null; side: 'from' | 'to' } | null
}

export interface EventOverviewResponse {
  root: EventOverviewNode
  /** 루트를 뺀 하위 전부 — 시작 시점 순 */
  descendants: EventOverviewNode[]
  /** 트리 안 사건이 낀 관련 사건 연결 전부 — 루트 상세의 연관 탭은 루트 자신의 연결만 보여서 하위끼리의 인과가 안 보였다 */
  relations: EventOverviewRelation[]
  /** 노드 상한에 걸려 잘렸는가 */
  truncated: boolean
}

/** 사건 중심 연결 그래프 — 상세 › 연관 마인드맵. 가운데 사건의 상위·하위(한 단) + 관련 사건(최대 2단) */
export interface EventRelationGraphNode {
  id: string
  title: string
  startDate: string | null
  domain: EventDomainValue
  kind: 'SINGLE' | 'COLLECTION'
  /** 가운데에서 몇 단(가운데 0) */
  hop: number
  /** 어떻게 닿았나 — 가운데·상위·하위·관련 */
  via: 'center' | 'parent' | 'child' | 'relation'
  /** 이 마디를 처음 찾은 마디(마인드맵 가지의 부모) */
  reachedFrom: string | null
}

export interface EventRelationGraphResponse {
  centerId: string
  nodes: EventRelationGraphNode[]
  relations: Array<{ id: string; fromId: string; toId: string; type: EventOverviewRelation['type']; description: string | null }>
  /** 하위가 상한에 걸려 잘렸는가 */
  childrenTruncated: boolean
  /** 마디 상한에 걸려 관련의 관련이 잘렸는가 */
  truncated: boolean
}

const GRAPH_CHILD_CAP = 40
const GRAPH_NODE_CAP = 200

const NODE_INCLUDE = {
  // 국면(묶음 안의 구획) — 조망이 묶음 띠 위에 장 경계를 긋는다
  phases: { orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }] },
  countryRelations: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      country: { select: { id: true, name: true, flagEmoji: true } },
      historicalCountry: { select: { id: true, name: true } },
    },
  },
  historicalCountry: { select: { id: true, name: true } },
  persons: {
    orderBy: [{ sortOrder: 'asc' as const }],
    include: {
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
    },
  },
  sides: {
    orderBy: [{ sortOrder: 'asc' as const }],
    select: {
      id: true,
      name: true,
      color: true,
      outcome: true,
      outcomeNote: true,
      parentSideId: true,
      deployedUnits: {
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          id: true,
          militaryUnitId: true,
          parentUnitId: true,
          role: true,
          note: true,
          militaryUnit: {
            select: {
              id: true,
              name: true,
              unitType: true,
              branch: true,
              parentUnitId: true,
            },
          },
        },
      },
    },
  },
  _count: { select: { eventSections: true, eventImages: true } },
} satisfies Prisma.EventInclude

type OverviewRow = Prisma.EventGetPayload<{ include: typeof NODE_INCLUDE }>

/** 글자나 시각 콘텐츠(본문 지도 iframe·이미지·표)가 있나 — 지도만 넣은 요약도 채운 것 */
const hasText = (html: string | null | undefined) =>
  Boolean(
    html &&
      (html.replace(/<[^>]*>/g, '').trim() || /<(?:iframe|img|figure|table|hr)\b/i.test(html)),
  )

const toNumber = (value: unknown): number | null =>
  value == null ? null : Number(value)

@Injectable()
export class EventOverviewService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverview(eventId: string, userId: string): Promise<EventOverviewResponse> {
    await assertEventOwnership(this.prisma, eventId, userId, {
      action: '조회',
      deleted: 'not-found',
    })

    // 1) 계보 수집 — 너비 우선, 깊이·노드 상한 (주 상위 parentEventId + 추가 상위 EventParentLink)
    const depthOf = new Map<string, number>([[eventId, 0]])
    let frontier = [eventId]
    let truncated = false
    for (let depth = 1; depth <= MAX_DEPTH && frontier.length > 0; depth += 1) {
      const [children, extraLinks] = await Promise.all([
        this.prisma.event.findMany({
          where: { parentEventId: { in: frontier }, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.eventParentLink.findMany({
          where: { parentEventId: { in: frontier }, childEvent: { deletedAt: null } },
          select: { childEventId: true },
        }),
      ])
      const candidateIds = [
        ...children.map((child) => child.id),
        ...extraLinks.map((link) => link.childEventId),
      ]
      frontier = []
      for (const candidateId of candidateIds) {
        if (depthOf.has(candidateId)) continue
        if (depthOf.size >= MAX_NODES) {
          truncated = true
          break
        }
        depthOf.set(candidateId, depth)
        frontier.push(candidateId)
      }
    }
    const ids = [...depthOf.keys()]

    // 2) 노드 본체 → 수치(사건 전체 · 진영 · 참여국 · 투입 부대). 진영·참여국·부대 id는 노드를 읽어야 알아 두 번에 나눈다
    const rows = await this.prisma.event.findMany({ where: { id: { in: ids } }, include: NODE_INCLUDE })
    /** 수치 주체 id → 어느 사건의 무엇인가 */
    const subjectOwner = new Map<string, { eventId: string; scope: EventOverviewMetric['scope']; label: string | null }>()
    for (const row of rows) {
      subjectOwner.set(row.id, { eventId: row.id, scope: 'EVENT', label: null })
      for (const side of row.sides) {
        subjectOwner.set(side.id, { eventId: row.id, scope: 'SIDE', label: side.name })
        for (const du of side.deployedUnits) {
          subjectOwner.set(du.id, {
            eventId: row.id,
            scope: 'UNIT',
            label: `${side.name} · ${du.militaryUnit.name}`,
          })
        }
      }
      for (const relation of row.countryRelations) {
        subjectOwner.set(relation.id, {
          eventId: row.id,
          scope: 'PARTICIPANT',
          label: relation.country?.name ?? relation.historicalCountry?.name ?? null,
        })
      }
    }
    const subjectIdsOf = (scope: EventOverviewMetric['scope']) =>
      [...subjectOwner.entries()].filter(([, owner]) => owner.scope === scope).map(([id]) => id)
    const observations = await this.prisma.observation.findMany({
      where: {
        OR: [
          { subjectType: ObservationSubjectType.EVENT, subjectId: { in: subjectIdsOf('EVENT') } },
          { subjectType: ObservationSubjectType.EVENT_SIDE, subjectId: { in: subjectIdsOf('SIDE') } },
          { subjectType: ObservationSubjectType.EVENT_PARTICIPANT, subjectId: { in: subjectIdsOf('PARTICIPANT') } },
          { subjectType: ObservationSubjectType.EVENT_SIDE_UNIT, subjectId: { in: subjectIdsOf('UNIT') } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }],
      include: { metric: { select: { key: true, name: true, unit: true } } },
    })
    const metricsByEvent = new Map<string, EventOverviewMetric[]>()
    for (const observation of observations) {
      const owner = subjectOwner.get(observation.subjectId)
      if (!owner) continue
      const list = metricsByEvent.get(owner.eventId) ?? []
      list.push({
        metricKey: observation.metric.key,
        metricName: observation.metric.name,
        unit: observation.metric.unit ?? null,
        value: toNumber(observation.value),
        low: toNumber(observation.low),
        high: toNumber(observation.high),
        approx: observation.approx,
        atLeast: observation.atLeast,
        scope: owner.scope,
        scopeLabel: owner.label,
      })
      metricsByEvent.set(owner.eventId, list)
    }

    const nodes = rows.map((row) => this.toNode(row, depthOf.get(row.id) ?? 0, metricsByEvent))
    const root = nodes.find((node) => node.id === eventId)
    if (!root) throw new Error('조망 루트가 사라졌습니다')
    const descendants = nodes
      .filter((node) => node.id !== eventId)
      .sort(
        (left, right) =>
          (left.startDate ?? '').localeCompare(right.startDate ?? '') ||
          left.title.localeCompare(right.title),
      )
    const relations = await this.loadRelations(ids)
    return { root, descendants, relations, truncated }
  }

  /**
   * 사건 중심 연결 그래프 — 상위·추가 상위·하위는 한 단만(묶음 하위가 수십 건이라 더 내려가면 마인드맵이 터진다),
   * 관련 사건(event_relation 양방향)은 depth 단까지 너비 우선. 소프트삭제 사건은 뺀다.
   */
  async getRelationGraph(eventId: string, userId: string, depth = 2): Promise<EventRelationGraphResponse> {
    await assertEventOwnership(this.prisma, eventId, userId, { action: '조회', deleted: 'not-found' })
    const maxHop = Math.min(3, Math.max(1, Math.floor(depth)))
    const meta = new Map<string, { hop: number; via: EventRelationGraphNode['via']; reachedFrom: string | null }>([
      [eventId, { hop: 0, via: 'center', reachedFrom: null }],
    ])
    const add = (id: string, hop: number, via: EventRelationGraphNode['via'], reachedFrom: string) => {
      if (meta.has(id) || meta.size >= GRAPH_NODE_CAP) return false
      meta.set(id, { hop, via, reachedFrom })
      return true
    }

    const center = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { parentEventId: true, extraParentLinks: { select: { parentEventId: true } } },
    })
    if (center?.parentEventId) add(center.parentEventId, 1, 'parent', eventId)
    for (const link of center?.extraParentLinks ?? []) add(link.parentEventId, 1, 'parent', eventId)
    const children = await this.prisma.event.findMany({
      where: { parentEventId: eventId, deletedAt: null },
      select: { id: true },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
      take: GRAPH_CHILD_CAP + 1,
    })
    const childrenTruncated = children.length > GRAPH_CHILD_CAP
    for (const child of children.slice(0, GRAPH_CHILD_CAP)) add(child.id, 1, 'child', eventId)

    const relationRows = new Map<string, { id: string; eventId: string; relatedEventId: string; relationType: EventOverviewRelation['type']; relationDescription: string | null }>()
    let truncated = false
    let frontier = [eventId]
    for (let hop = 1; hop <= maxHop && frontier.length > 0; hop += 1) {
      const rows = await this.prisma.eventRelation.findMany({
        where: { OR: [{ eventId: { in: frontier } }, { relatedEventId: { in: frontier } }] },
        select: { id: true, eventId: true, relatedEventId: true, relationType: true, relationDescription: true },
        orderBy: { createdAt: 'asc' },
      })
      const next: string[] = []
      for (const row of rows) {
        relationRows.set(row.id, row)
        const fromFrontier = frontier.includes(row.eventId)
        const other = fromFrontier ? row.relatedEventId : row.eventId
        const source = fromFrontier ? row.eventId : row.relatedEventId
        if (meta.has(other)) continue
        if (add(other, hop, 'relation', source)) next.push(other)
        else truncated = true
      }
      frontier = next
    }

    const ids = [...meta.keys()]
    const rows = await this.prisma.event.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, title: true, domain: true, kind: true, startDate: true, startEra: true, startYear: true, startMonth: true, startDay: true },
    })
    const alive = new Set(rows.map((row) => row.id))
    const nodes: EventRelationGraphNode[] = rows.map((row) => {
      const info = meta.get(row.id)!
      return {
        id: row.id,
        title: row.title,
        startDate: formatEventDate(row.startDate, row.startEra, row.startYear, row.startMonth, row.startDay),
        domain: row.domain,
        kind: row.kind,
        hop: info.hop,
        via: info.via,
        reachedFrom: info.reachedFrom && alive.has(info.reachedFrom) ? info.reachedFrom : info.reachedFrom ? eventId : null,
      }
    })
    const relations = [...relationRows.values()]
      .filter((row) => alive.has(row.eventId) && alive.has(row.relatedEventId))
      .map((row) => ({
        id: row.id,
        fromId: row.eventId,
        toId: row.relatedEventId,
        type: row.relationType,
        description: row.relationDescription ?? null,
      }))
    return { centerId: eventId, nodes, relations, childrenTruncated, truncated }
  }

  /** 트리 id 집합에 한쪽이라도 걸린 관련 사건 — 소프트삭제된 반대편은 뺀다 */
  private async loadRelations(ids: string[]): Promise<EventOverviewRelation[]> {
    const inTree = new Set(ids)
    const counterpart = { select: { id: true, title: true, deletedAt: true, startDate: true, startEra: true, startYear: true, startMonth: true, startDay: true } }
    const rows = await this.prisma.eventRelation.findMany({
      where: { OR: [{ eventId: { in: ids } }, { relatedEventId: { in: ids } }] },
      include: { event: counterpart, relatedEvent: counterpart },
      orderBy: { createdAt: 'asc' },
    })
    const result: EventOverviewRelation[] = []
    for (const row of rows) {
      if (row.event.deletedAt || row.relatedEvent.deletedAt) continue
      const fromInside = inTree.has(row.eventId)
      const toInside = inTree.has(row.relatedEventId)
      const outside = !fromInside ? row.event : !toInside ? row.relatedEvent : null
      result.push({
        id: row.id,
        fromId: row.eventId,
        toId: row.relatedEventId,
        type: row.relationType,
        description: row.relationDescription ?? null,
        external: outside
          ? {
              id: outside.id,
              title: outside.title,
              startDate: formatEventDate(outside.startDate, outside.startEra, outside.startYear, outside.startMonth, outside.startDay),
              side: fromInside ? 'to' : 'from',
            }
          : null,
      })
    }
    return result
  }

  private toNode(
    row: OverviewRow,
    depth: number,
    metricsByEvent: Map<string, EventOverviewMetric[]>,
  ): EventOverviewNode {
    const countries: EventOverviewCountry[] = []
    for (const relation of row.countryRelations) {
      const join = columnsToPoint({
        era: relation.joinEra ?? null,
        year: relation.joinYear ?? null,
        month: relation.joinMonth ?? null,
        day: relation.joinDay ?? null,
      })
      const withdraw = columnsToPoint({
        era: relation.withdrawEra ?? null,
        year: relation.withdrawYear ?? null,
        month: relation.withdrawMonth ?? null,
        day: relation.withdrawDay ?? null,
      })
      if (relation.country) {
        countries.push({
          key: `c:${relation.country.id}`,
          id: relation.country.id,
          kind: 'modern',
          name: relation.country.name,
          flagEmoji: relation.country.flagEmoji ?? null,
          role: relation.role ?? null,
          roleDescription: relation.roleDescription ?? null,
          sideId: relation.sideId ?? null,
          join,
          joinReason: relation.joinReason ?? null,
          withdraw,
          withdrawReason: relation.withdrawReason ?? null,
        })
      } else if (relation.historicalCountry) {
        countries.push({
          key: `h:${relation.historicalCountry.id}`,
          id: relation.historicalCountry.id,
          kind: 'historical',
          name: relation.historicalCountry.name,
          flagEmoji: null,
          role: relation.role ?? null,
          roleDescription: relation.roleDescription ?? null,
          sideId: relation.sideId ?? null,
          join,
          joinReason: relation.joinReason ?? null,
          withdraw,
          withdrawReason: relation.withdrawReason ?? null,
        })
      }
    }
    // 본체 FK로만 걸린 주 무대 역사국가(관계표 행 없음)도 참여국으로 센다 — 상세 응답(F17)과 같은 규칙
    if (
      row.historicalCountry &&
      !countries.some((country) => country.key === `h:${row.historicalCountry!.id}`)
    ) {
      countries.push({
        key: `h:${row.historicalCountry.id}`,
        id: row.historicalCountry.id,
        kind: 'historical',
        name: row.historicalCountry.name,
        flagEmoji: null,
        role: null,
        roleDescription: null,
        sideId: null,
        join: null,
        joinReason: null,
        withdraw: null,
        withdrawReason: null,
      })
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      parentEventId: row.parentEventId ?? null,
      depth,
      startDate: formatEventDate(row.startDate, row.startEra, row.startYear, row.startMonth, row.startDay),
      startDatePrecision: row.startDatePrecision ?? null,
      endDate: formatEventDate(row.endDate, row.endEra, row.endYear, row.endMonth, row.endDay),
      endDatePrecision: row.endDatePrecision ?? null,
      location: row.location ?? null,
      locationLatitude: row.locationLatitude != null && row.locationLongitude != null ? Number(row.locationLatitude) : null,
      locationLongitude: row.locationLatitude != null && row.locationLongitude != null ? Number(row.locationLongitude) : null,
      locationNote: row.locationNote ?? null,
      domain: row.domain,
      type: row.type,
      kind: row.kind,
      phaseId: row.phaseId ?? null,
      phases: row.phases.map((phase) => ({
        id: phase.id,
        title: phase.title,
        order: phase.order,
        startEra: phase.startEra,
        startYear: phase.startYear,
        startMonth: phase.startMonth,
        startDay: phase.startDay,
        endEra: phase.endEra,
        endYear: phase.endYear,
        endMonth: phase.endMonth,
        endDay: phase.endDay,
      })),
      countries,
      persons: row.persons.map((participation) => ({
        personId: participation.personId,
        name: participation.person?.name ?? null,
        surname: participation.person?.surname ?? null,
        middleName: participation.person?.middleName ?? null,
        nameDisplayOrder: participation.person?.nameDisplayOrder ?? null,
        defaultNameDisplayOrder: participation.person?.country?.defaultNameDisplayOrder ?? null,
        profileImageUrl: participation.person?.profileImageUrl ?? null,
        role: participation.role ?? null,
        sideId: participation.sideId ?? null,
      })),
      sides: row.sides.map((side) => ({
        id: side.id,
        name: side.name,
        color: side.color ?? null,
        outcome: side.outcome ?? null,
        outcomeNote: side.outcomeNote ?? null,
        parentSideId: side.parentSideId ?? null,
        deployedUnits: side.deployedUnits.map((du) => ({
          id: du.id,
          militaryUnitId: du.militaryUnitId,
          name: du.militaryUnit.name,
          unitType: du.militaryUnit.unitType ?? null,
          branch: du.militaryUnit.branch ?? null,
          parentUnitId: du.parentUnitId ?? du.militaryUnit.parentUnitId ?? null,
          role: du.role ?? null,
          note: du.note ?? null,
        })),
      })),
      metrics: metricsByEvent.get(row.id) ?? [],
      sectionCount: row._count.eventSections,
      imageCount: row._count.eventImages,
      hasBackground: hasText(row.background),
      hasAftermath: hasText(row.aftermath),
    }
  }
}
