import { type EventRelationGraph } from '@/shared/api/event-overview'

import { CHILDREN_BRANCH_ID, buildEgoMindmap } from './ego-mindmap.lib'

type GraphNode = EventRelationGraph['nodes'][number]
const graphNode = (id: string, hop: number, via: GraphNode['via'], reachedFrom: string | null): GraphNode => ({
  id,
  title: id,
  startDate: null,
  domain: 'POLITICS',
  kind: 'SINGLE',
  hop,
  via,
  reachedFrom,
})

const graph: EventRelationGraph = {
  centerId: 'c',
  nodes: [
    graphNode('c', 0, 'center', null),
    graphNode('p', 1, 'parent', 'c'),
    graphNode('k', 1, 'child', 'c'),
    graphNode('cause', 1, 'relation', 'c'),
    graphNode('effect', 1, 'relation', 'c'),
    graphNode('far', 2, 'relation', 'effect'),
  ],
  relations: [
    { id: 'r1', fromId: 'cause', toId: 'c', type: 'LED_TO', description: null },
    { id: 'r2', fromId: 'c', toId: 'effect', type: 'INFLUENCED', description: null },
    { id: 'r3', fromId: 'effect', toId: 'far', type: 'LED_TO', description: null },
  ],
  childrenTruncated: false,
  truncated: false,
}

describe('buildEgoMindmap', () => {
  it('원인·상위는 왼쪽, 결과·하위는 오른쪽, 2단은 찾은 마디 밑', () => {
    const data = buildEgoMindmap(graph, 2)
    const sides = new Map(data.tree.children.map((child) => [child.id, child.side]))
    expect(sides.get('p')).toBe('left')
    expect(sides.get('cause')).toBe('left')
    expect(sides.get('effect')).toBe('right')
    expect(sides.get(CHILDREN_BRANCH_ID)).toBe('right')
    expect(data.tree.children.find((child) => child.id === 'effect')?.children.map((child) => child.id)).toEqual(['far'])
    expect(data.specs.get('effect')?.hideTreeEdge).toBe(true)
    expect(data.relations).toHaveLength(3)
  })

  it('1단만 보면 2단 마디와 그 선이 빠진다', () => {
    const data = buildEgoMindmap(graph, 1)
    expect(data.specs.has('far')).toBe(false)
    expect(data.relations.map((relation) => relation.id)).toEqual(['r1', 'r2'])
  })
})
