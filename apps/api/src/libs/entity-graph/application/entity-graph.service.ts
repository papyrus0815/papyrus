import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'

import type {
  ConnectionEdge,
  EntityKind,
  ProjectionContext,
} from '../domain/entity-graph.types'
import { PROJECTIONS } from './projections'
import { displayPersonName } from '../../shared/person-display-name'

/** 역방향 한 투영의 기본 상한 — 국가의 '국적 인물'처럼 수백 건이 되는 역방향 제어 */
export const ENTITY_GRAPH_REVERSE_LIMIT = 60

export interface EntityConnections {
  subject: { kind: EntityKind; id: string; label: string }
  edges: ConnectionEdge[]
  /** relation(+방향)별 전체 수 — 상한에 잘린 역방향은 edges보다 크다 */
  totals: Record<string, number>
}

/**
 * 엔티티 연결 읽기 모델 — 투영 레지스트리를 주어 kind로 골라 병렬로 돌리고 합친다.
 * 정본은 각 전용 테이블이고 여기는 파생이다(쓰지 않는다). 설계: docs/entity-graph-design.md
 */
@Injectable()
export class EntityGraphService {
  constructor(private readonly prisma: PrismaService) {}

  async connections(
    kind: EntityKind,
    id: string,
    accountId: string | undefined,
  ): Promise<EntityConnections> {
    const label = await this.resolveSubject(kind, id, accountId)
    const ctx: ProjectionContext = { accountId, reverseLimit: ENTITY_GRAPH_REVERSE_LIMIT }

    const runs = PROJECTIONS.flatMap((projection) => {
      const tasks: Array<Promise<{ key: string; edges: ConnectionEdge[]; total: number }>> = []
      if (projection.subject === kind) {
        tasks.push(
          projection
            .forward(this.prisma, ctx, id)
            .then((res) => ({ key: `${projection.relation}:out`, ...res })),
        )
      }
      if (projection.reverse && projection.objects.includes(kind)) {
        tasks.push(
          projection
            .reverse(this.prisma, ctx, kind, id)
            .then((res) => ({ key: `${projection.relation}:in`, ...res })),
        )
      }
      return tasks
    })

    const settled = await Promise.all(runs)
    const raw: ConnectionEdge[] = []
    const totals: Record<string, number> = {}
    for (const run of settled) {
      raw.push(...run.edges)
      totals[run.key] = run.total
    }
    return { subject: { kind, id, label }, edges: mergeEdges(dropRedundant(raw)), totals }
  }

  /**
   * 주어 존재 확인 + 라벨. 인물·사건은 소유자 범위 — 기존 상세 API(person.findById 404,
   * event 403)와 같은 문을 쓴다. 미소유·부재는 404로 같은 말을 한다(존재 여부를 흘리지 않게).
   */
  private async resolveSubject(
    kind: EntityKind,
    id: string,
    accountId: string | undefined,
  ): Promise<string> {
    const notFound = () => new NotFoundException('대상을 찾을 수 없습니다')
    switch (kind) {
      case 'person': {
        const person = await this.prisma.person.findFirst({
          where: accountId ? { id, accountId } : { id },
          select: {
            name: true,
            surname: true,
            middleName: true,
            nameDisplayOrder: true,
            country: { select: { defaultNameDisplayOrder: true } },
          },
        })
        if (!person) throw notFound()
        return displayPersonName(person)
      }
      case 'event': {
        const event = await this.prisma.event.findFirst({
          where: accountId ? { id, createdById: accountId, deletedAt: null } : { id, deletedAt: null },
          select: { title: true },
        })
        if (!event) throw notFound()
        return event.title
      }
      case 'country':
        return this.nameOrThrow(this.prisma.country.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'historicalCountry':
        return this.nameOrThrow(this.prisma.historicalCountry.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'dynasty':
        return this.nameOrThrow(this.prisma.dynasty.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'organization':
        return this.nameOrThrow(this.prisma.organization.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'treaty':
        return this.nameOrThrow(this.prisma.treaty.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'militaryUnit':
        return this.nameOrThrow(this.prisma.militaryUnit.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'politicalParty':
        return this.nameOrThrow(this.prisma.politicalParty.findUnique({ where: { id }, select: { name: true } }), notFound)
      case 'personGroup':
        return this.nameOrThrow(this.prisma.personGroup.findUnique({ where: { id }, select: { name: true } }), notFound)
    }
  }

  private async nameOrThrow(
    query: Promise<{ name: string } | null>,
    notFound: () => NotFoundException,
  ): Promise<string> {
    const row = await query
    if (!row) throw notFound()
    return row.name
  }
}

const targetKey = (edge: ConnectionEdge) => `${edge.target.kind}:${edge.target.id}`

/**
 * 같은 사실을 두 번 말하는 연결 제거 — 소속 '시민권'이 국적과 같은 나라면 국적만 남긴다
 * (국적은 주 국적 FK, 시민권은 다중 소속 테이블 — 같은 나라를 두 경로로 적어 둔 경우가 흔하다).
 */
export function dropRedundant(edges: ConnectionEdge[]): ConnectionEdge[] {
  const nationalityTargets = new Set(
    edges.filter((edge) => edge.relation === 'person.nationality').map(targetKey),
  )
  return edges.filter(
    (edge) =>
      !(
        edge.relation === 'person.affiliation' &&
        edge.direction === 'out' &&
        edge.relationLabel === '시민권' &&
        nationalityTargets.has(targetKey(edge))
      ),
  )
}

/**
 * 같은 관계·같은 방향·같은 대상은 한 줄로 — 조프르의 재임 15건이 '재임 → 프랑스 제3공화국'
 * 15줄로, 역사국가 쪽에선 '재임자 → 조프르' 15줄로 반복되던 것. 합친 줄은 count(원 기록 수),
 * 역할은 서로 다른 것 앞 2개(+ '외 N'), 기간은 가장 이른 시작~가장 늦은 끝.
 */
export function mergeEdges(edges: ConnectionEdge[]): ConnectionEdge[] {
  const merged = new Map<string, { edge: ConnectionEdge; roles: string[] }>()
  for (const edge of edges) {
    const key = `${edge.relation}|${edge.direction}|${edge.relationLabel}|${targetKey(edge)}`
    const current = merged.get(key)
    if (!current) {
      merged.set(key, { edge: { ...edge, count: 1 }, roles: edge.role ? [edge.role] : [] })
      continue
    }
    current.edge.count = (current.edge.count ?? 1) + 1
    if (edge.role && !current.roles.includes(edge.role)) current.roles.push(edge.role)
    current.edge.period = widenPeriod(current.edge.period, edge.period)
  }
  return [...merged.values()].map(({ edge, roles }) => ({
    ...edge,
    role:
      roles.length === 0
        ? null
        : roles.length <= 2
          ? roles.join(' · ')
          : `${roles.slice(0, 2).join(' · ')} 외 ${roles.length - 2}`,
  }))
}

function widenPeriod(
  left: ConnectionEdge['period'],
  right: ConnectionEdge['period'],
): ConnectionEdge['period'] {
  if (!left) return right
  if (!right) return left
  const pick = (
    first: number | null,
    second: number | null,
    choose: (one: number, other: number) => number,
  ) => (first == null ? second : second == null ? first : choose(first, second))
  return { from: pick(left.from, right.from, Math.min), to: pick(left.to, right.to, Math.max) }
}
