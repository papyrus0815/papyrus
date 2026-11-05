import { type EventOverviewNode, type EventOverviewRelation } from '@/shared/api/event-overview'

import { buildChainMindmap } from './chain-mindmap.lib'

const node = (id: string, parentEventId: string | null, startDate: string): EventOverviewNode =>
  ({
    id,
    title: id.toUpperCase(),
    parentEventId,
    startDate,
    kind: 'SINGLE',
    phases: [],
  }) as unknown as EventOverviewNode

const relation = (id: string, fromId: string, toId: string, type: EventOverviewRelation['type'] = 'LED_TO'): EventOverviewRelation => ({
  id,
  fromId,
  toId,
  type,
  description: null,
  external: null,
})

const root = node('root', null, '1789-01-01')
const ordered = ['a', 'b', 'c', 'd', 'x', 'lonely'].map((id, index) => node(id, 'root', `179${index}-01-01`))
const base = { root, ordered, numberById: new Map<string, string>(), colorOf: () => null, hiddenTypes: new Set<EventOverviewRelation['type']>() }

describe('buildChainMindmap', () => {
  it('관련 사건만 — 사슬 머리가 가운데에서 뻗고 원인 → 결과로 이어진다', () => {
    const data = buildChainMindmap({
      ...base,
      relations: [relation('r1', 'a', 'b'), relation('r2', 'b', 'c'), relation('r3', 'x', 'd', 'CONCURRENT')],
    })
    expect(data.chainCount).toBe(2)
    expect(data.tree.children.map((child) => child.id)).toEqual(['a', 'd'])
    const a = data.tree.children[0]
    expect(a.children.map((child) => child.id)).toEqual(['b'])
    expect(a.children[0].children.map((child) => child.id)).toEqual(['c'])
    /* 관계 없는 사건은 그리지 않는다 */
    expect(data.specs.has('lonely')).toBe(false)
    expect(data.specs.get('b')?.hideTreeEdge).toBe(true)
    expect(data.relations).toHaveLength(3)
  })

  it('거꾸로만 닿는 사건은 닿은 마디 밑에, 바깥 사건은 ext: 마디', () => {
    const data = buildChainMindmap({
      ...base,
      relations: [
        relation('r1', 'a', 'b'),
        relation('r2', 'c', 'b'),
        { ...relation('r3', 'b', 'out'), external: { id: 'out', title: 'OUT', startDate: '1800-01-01', side: 'to' } },
      ],
    })
    const heads = data.tree.children.map((child) => child.id)
    expect(heads).toEqual(['a', 'c'])
    expect(data.specs.get('ext:out')?.kind).toBe('external')
  })
})
