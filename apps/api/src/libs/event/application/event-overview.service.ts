import { Injectable } from '@nestjs/common'
import { ObservationSubjectType, Prisma, PrismaClient } from '@prisma/client'

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
  sideId: string | null
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

export interface EventOverviewSide {
  id: string
  name: string
  color: string | null
}

export interface EventOverviewMetric {
  metricKey: string
  metricName: string
  unit: string | null
  value: number | null
  low: number | null
  high: number | null
  approx: boolean
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
  category: { id: string; name: string } | null
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

export interface EventOverviewResponse {
  root: EventOverviewNode
  /** 루트를 뺀 하위 전부 — 시작 시점 순 */
  descendants: EventOverviewNode[]
  /** 노드 상한에 걸려 잘렸는가 */
  truncated: boolean
}

const NODE_INCLUDE = {
  category: { select: { id: true, name: true } },
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
    select: { id: true, name: true, color: true },
  },
  _count: { select: { eventSections: true, eventImages: true } },
} satisfies Prisma.EventInclude

type OverviewRow = Prisma.EventGetPayload<{ include: typeof NODE_INCLUDE }>

const hasText = (html: string | null | undefined) =>
  Boolean(html && html.replace(/<[^>]*>/g, '').trim())

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

    // 1) 계보 수집 — 너비 우선, 깊이·노드 상한
    const depthOf = new Map<string, number>([[eventId, 0]])
    let frontier = [eventId]
    let truncated = false
    for (let depth = 1; depth <= MAX_DEPTH && frontier.length > 0; depth += 1) {
      const children = await this.prisma.event.findMany({
        where: { parentEventId: { in: frontier }, deletedAt: null },
        select: { id: true },
      })
      frontier = []
      for (const child of children) {
        if (depthOf.has(child.id)) continue
        if (depthOf.size >= MAX_NODES) {
          truncated = true
          break
        }
        depthOf.set(child.id, depth)
        frontier.push(child.id)
      }
    }
    const ids = [...depthOf.keys()]

    // 2) 노드 본체 + 수치
    const [rows, observations] = await Promise.all([
      this.prisma.event.findMany({ where: { id: { in: ids } }, include: NODE_INCLUDE }),
      this.prisma.observation.findMany({
        where: { subjectType: ObservationSubjectType.EVENT, subjectId: { in: ids } },
        orderBy: [{ sortOrder: 'asc' }],
        include: { metric: { select: { key: true, name: true, unit: true } } },
      }),
    ])
    const metricsByEvent = new Map<string, EventOverviewMetric[]>()
    for (const observation of observations) {
      const list = metricsByEvent.get(observation.subjectId) ?? []
      list.push({
        metricKey: observation.metric.key,
        metricName: observation.metric.name,
        unit: observation.metric.unit ?? null,
        value: toNumber(observation.value),
        low: toNumber(observation.low),
        high: toNumber(observation.high),
        approx: observation.approx,
      })
      metricsByEvent.set(observation.subjectId, list)
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
    return { root, descendants, truncated }
  }

  private toNode(
    row: OverviewRow,
    depth: number,
    metricsByEvent: Map<string, EventOverviewMetric[]>,
  ): EventOverviewNode {
    const countries: EventOverviewCountry[] = []
    for (const relation of row.countryRelations) {
      if (relation.country) {
        countries.push({
          key: `c:${relation.country.id}`,
          id: relation.country.id,
          kind: 'modern',
          name: relation.country.name,
          flagEmoji: relation.country.flagEmoji ?? null,
          role: relation.role ?? null,
          sideId: relation.sideId ?? null,
        })
      } else if (relation.historicalCountry) {
        countries.push({
          key: `h:${relation.historicalCountry.id}`,
          id: relation.historicalCountry.id,
          kind: 'historical',
          name: relation.historicalCountry.name,
          flagEmoji: null,
          role: relation.role ?? null,
          sideId: relation.sideId ?? null,
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
        sideId: null,
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
      category: row.category ? { id: row.category.id, name: row.category.name } : null,
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
      sides: row.sides.map((side) => ({ id: side.id, name: side.name, color: side.color ?? null })),
      metrics: metricsByEvent.get(row.id) ?? [],
      sectionCount: row._count.eventSections,
      imageCount: row._count.eventImages,
      hasBackground: hasText(row.background),
      hasAftermath: hasText(row.aftermath),
    }
  }
}
