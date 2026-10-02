import type { EntityConnectionEdge, EntityConnections } from '@/shared/api/entity-graph'

import { buildConnectionSections, formatConnectionPeriod } from './connections.lib'

const edge = (overrides: Partial<EntityConnectionEdge>): EntityConnectionEdge => ({
  relation: 'person.tenure',
  relationLabel: '재임',
  group: 'office',
  direction: 'out',
  target: { kind: 'historicalCountry', id: 'a', label: '가', subtitle: null, imageUrl: null, accessible: true },
  role: null,
  period: null,
  count: 1,
  ...overrides,
})

const data = (edges: EntityConnectionEdge[], totals: Record<string, number> = {}): EntityConnections => ({
  subject: { kind: 'person', id: 'p', label: 'P' },
  edges,
  totals,
})

describe('buildConnectionSections', () => {
  it('묶음 순서는 CONNECTION_GROUPS 순서, 빈 묶음은 뺀다', () => {
    const sections = buildConnectionSections(
      data([edge({ group: 'event' }), edge({ group: 'polity', relation: 'person.nationality' })]),
    )
    expect(sections.map((section) => section.group)).toEqual(['polity', 'event'])
  })

  it('묶음 안은 시작 연도순, 연도 없는 것은 뒤', () => {
    const sections = buildConnectionSections(
      data([
        edge({ target: { kind: 'historicalCountry', id: 'n', label: '무', subtitle: null, imageUrl: null, accessible: true } }),
        edge({ target: { kind: 'historicalCountry', id: 'b', label: '나', subtitle: null, imageUrl: null, accessible: true }, period: { from: 1900, to: null } }),
        edge({ target: { kind: 'historicalCountry', id: 'c', label: '다', subtitle: null, imageUrl: null, accessible: true }, period: { from: 1850, to: 1860 } }),
      ]),
    )
    expect(sections[0].edges.map((item) => item.target.id)).toEqual(['c', 'b', 'n'])
  })

  it('역방향 상한에 잘린 수만 omitted로 — 정방향 차이는 세지 않는다', () => {
    const sections = buildConnectionSections(
      data(
        [
          edge({ direction: 'in', relationLabel: '재임자', count: 2 }),
          edge({ relation: 'person.affiliation', group: 'office' }),
        ],
        { 'person.tenure:in': 70, 'person.affiliation:out': 2 },
      ),
    )
    expect(sections[0].omitted).toBe(68)
  })
})

describe('formatConnectionPeriod', () => {
  it('열린 끝·같은 해·기원전', () => {
    expect(formatConnectionPeriod({ from: 2017, to: null })).toBe('2017–')
    expect(formatConnectionPeriod({ from: 1906, to: 1906 })).toBe('1906')
    expect(formatConnectionPeriod({ from: -59, to: -44 })).toBe('기원전 59–기원전 44')
    expect(formatConnectionPeriod(null)).toBeNull()
  })
})
