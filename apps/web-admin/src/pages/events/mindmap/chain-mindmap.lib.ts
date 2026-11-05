/**
 * 관련 사건 사슬 마인드맵 — 상위(묶음) 사건의 연관 지도 기본 보기.
 *
 * "관련된 사건을 보는 마인드맵"이다: 소속 나무(묶음 → 국면 → 사건)가 아니라, 아래 사건들이 서로·바깥과 이은
 * 관련 사건(event_relation)만 모아 **원인 → 결과 사슬**로 펼친다. 소속은 마디 색(묶음 색)과 번호로만 남는다.
 *
 * - 사슬 = 연결로 이어진 덩어리. 들어오는 방향 있는 연결이 없는 사건(첫 원인)이 사슬의 머리 — 가운데(상위 사건)에서 뻗는다.
 * - 머리에서 방향대로(원인 → 결과) 너비 우선으로 펼치고, 방향 없는 연결(같은 국면·그 밖)은 양쪽으로 따라간다.
 *   거꾸로만 닿는 사건은 닿은 마디 밑에 붙인다. 나무 선 대신 관계 선이 잇는다(같은 연결을 두 번 긋지 않게).
 * - 사슬에 들지 않은 연결(이미 펼친 두 마디 사이)은 가로지르는 관계 선으로.
 */
import { type EventOverviewNode, type EventOverviewRelation } from '@/shared/api/event-overview'

import { type MindTreeNode } from './mindmap-layout'
import { MIND_NODE_SIZE, type MindEdgeSpec, type MindNodeSpec, type MindmapData } from './mindmap-types'
import { DIRECTED_RELATIONS, RELATION_DASH, RELATION_TYPE_NAME, type RelationType, yearOf } from './survey-mindmap.lib'

export interface ChainMindmapInput {
  root: EventOverviewNode
  ordered: ReadonlyArray<EventOverviewNode>
  relations: ReadonlyArray<EventOverviewRelation>
  numberById: Map<string, string>
  colorOf: (id: string) => string | null
  groupOf?: (id: string) => string | null
  hiddenTypes: ReadonlySet<RelationType>
}

const extId = (id: string) => `ext:${id}`

export function buildChainMindmap(input: ChainMindmapInput): MindmapData & { chainCount: number } {
  const { root, ordered, numberById, colorOf, hiddenTypes } = input
  const relations = input.relations.filter((relation) => !hiddenTypes.has(relation.type))
  const byId = new Map([root, ...ordered].map((node) => [node.id, node]))
  /* 마디 id — 트리 밖 사건은 'ext:' 접두(조망 마인드맵과 같은 규약) */
  const nodeIdOf = (eventId: string) => (byId.has(eventId) ? eventId : extId(eventId))
  const titleOf = new Map<string, string>()
  const startOf = new Map<string, string | null>()
  for (const node of [root, ...ordered]) {
    titleOf.set(node.id, node.title)
    startOf.set(node.id, node.startDate)
  }
  for (const relation of relations) {
    if (!relation.external) continue
    titleOf.set(extId(relation.external.id), relation.external.title)
    startOf.set(extId(relation.external.id), relation.external.startDate)
  }

  /* 이웃 — 방향 있는 연결은 원인 → 결과만, 없는 연결은 양쪽 */
  const forward = new Map<string, string[]>()
  const backward = new Map<string, string[]>()
  const incomingDirected = new Map<string, number>()
  const push = (map: Map<string, string[]>, key: string, value: string) => map.set(key, [...(map.get(key) ?? []), value])
  const members = new Set<string>()
  for (const relation of relations) {
    const from = nodeIdOf(relation.fromId)
    const to = nodeIdOf(relation.toId)
    if (from === to) continue
    members.add(from)
    members.add(to)
    push(forward, from, to)
    push(backward, to, from)
    if (DIRECTED_RELATIONS.has(relation.type)) incomingDirected.set(to, (incomingDirected.get(to) ?? 0) + 1)
    else {
      push(forward, to, from)
      push(backward, from, to)
    }
  }

  /* 덩어리(사슬) — 방향 무시하고 이어진 것 */
  const undirected = new Map<string, Set<string>>()
  for (const id of members) undirected.set(id, new Set([...(forward.get(id) ?? []), ...(backward.get(id) ?? [])]))
  const dateKey = (id: string) => startOf.get(id) ?? '9999'
  const byDate = (left: string, right: string) => dateKey(left).localeCompare(dateKey(right))
  const seen = new Set<string>()
  const components: string[][] = []
  for (const id of [...members].sort(byDate)) {
    if (seen.has(id)) continue
    const stack = [id]
    const component: string[] = []
    seen.add(id)
    while (stack.length > 0) {
      const current = stack.pop()!
      component.push(current)
      for (const next of undirected.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      }
    }
    components.push(component.sort(byDate))
  }

  const specs = new Map<string, MindNodeSpec>()
  const treeNodes = new Map<string, MindTreeNode>()
  const treeOf = (id: string): MindTreeNode => {
    let tree = treeNodes.get(id)
    if (!tree) {
      const kind = id.startsWith('ext:') ? 'external' : 'event'
      tree = { id, ...MIND_NODE_SIZE[kind], children: [] }
      treeNodes.set(id, tree)
      specs.set(id, {
        id,
        kind,
        label: titleOf.get(id) ?? '',
        number: id.startsWith('ext:') ? null : (numberById.get(id) ?? null),
        color: id.startsWith('ext:') ? null : colorOf(id),
        openable: true,
        year: yearOf(startOf.get(id)),
        hint: id.startsWith('ext:') ? '이 묶음 밖 사건' : null,
        connectable: !id.startsWith('ext:'),
      })
    }
    return tree
  }

  const center: MindTreeNode = { id: root.id, ...MIND_NODE_SIZE.root, children: [] }
  specs.set(root.id, { id: root.id, kind: 'root', label: root.title, openable: false, connectable: true })
  treeNodes.set(root.id, center)
  const placed = new Set<string>()
  /** 사슬 나무를 이룬 연결(부모 → 자식) — 나머지는 사슬을 가로지르는 보조 선 */
  const treeLinks = new Set<string>()
  for (const component of components) {
    /* 머리 — 방향 있는 연결이 들어오지 않는 사건(첫 원인). 없으면(고리) 가장 이른 사건 */
    const heads = component.filter((id) => !incomingDirected.get(id))
    const starts = heads.length > 0 ? heads : [component[0]]
    const expand = (queue: string[], neighbors: Map<string, string[]>) => {
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const next of [...(neighbors.get(current) ?? [])].sort(byDate)) {
          if (placed.has(next)) continue
          placed.add(next)
          treeLinks.add(`${current}>${next}`)
          treeLinks.add(`${next}>${current}`)
          treeOf(current).children.push(treeOf(next))
          specs.get(next)!.hideTreeEdge = true
          queue.push(next)
        }
      }
    }
    /* 머리를 이른 순으로 하나씩 펼친다 — 앞 머리에서 이미 닿은 사건(같은 국면으로 이어진 짝)은 새 머리가 되지 않는다 */
    for (const start of starts) {
      if (placed.has(start)) continue
      placed.add(start)
      /* 뿌리 → 사슬 머리 선은 연결이 아니다 — 한 사슬의 시작을 가리키는 가는 선(나무 선)으로 남긴다.
         사슬은 모두 오른쪽으로 — 좌우로 나누면 왼쪽 사슬은 결과 → 원인(화살표가 왼쪽)으로 읽히고 그림이 옆으로 두 배 넓어졌다 */
      const head = treeOf(start)
      head.side = 'right'
      center.children.push(head)
      expand([start], forward)
    }
    /* 거꾸로만 닿는 사건 — 닿은 마디 밑에 */
    expand(
      component.filter((id) => placed.has(id)),
      backward,
    )
  }

  const edges: MindEdgeSpec[] = relations.flatMap((relation) => {
    const from = nodeIdOf(relation.fromId)
    const to = nodeIdOf(relation.toId)
    if (from === to || !treeNodes.has(from) || !treeNodes.has(to)) return []
    return [
      {
        id: relation.id,
        from,
        to,
        dash: RELATION_DASH[relation.type],
        arrow: DIRECTED_RELATIONS.has(relation.type),
        count: 1,
        /*
         * 사슬을 이루지 않은 연결(이미 다른 사슬에 놓인 결과로 가는 선)은 보조 선 — 한 단 흐리고 가늘게.
         * 프랑스 혁명에서 '1791년 프랑스 헌법 → 지롱드파 축출' 같은 긴 선이 주 사슬과 같은 무게로 그림을 갈랐다
         */
        cross: !treeLinks.has(`${from}>${to}`),
        title: `${RELATION_TYPE_NAME[relation.type]}: ${titleOf.get(from) ?? ''} → ${titleOf.get(to) ?? ''}${relation.description ? `\n${relation.description}` : ''}`,
        items: [
          {
            id: relation.id,
            fromId: relation.fromId,
            toId: relation.toId,
            fromTitle: titleOf.get(from) ?? '',
            toTitle: titleOf.get(to) ?? '',
            type: relation.type,
            description: relation.description,
          },
        ],
      },
    ]
  })
  return { tree: center, specs, relations: edges, chainCount: components.length }
}
