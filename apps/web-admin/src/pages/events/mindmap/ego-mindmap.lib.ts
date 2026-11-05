/**
 * 상세 › 연관 마인드맵의 재료 — 그 사건을 가운데 두고 상위·하위(한 단)와 관련 사건(최대 2단).
 *
 * 좌·우에 뜻을 싣는다: 왼쪽 = 이 사건으로 들어오는 것(상위, 원인·배경·대응의 대상), 오른쪽 = 나가는 것(하위, 결과).
 * 방향 없는 관계(같은 국면·그 밖)는 적은 쪽에 얹는다.
 * 관련으로 닿은 마디는 나무 선 대신 관계 선이 잇는다(같은 연결을 두 번 긋지 않게). 2단 마디는 처음 찾은 마디 밑에.
 */
import { type EventRelationGraph } from '@/shared/api/event-overview'

import { type MindTreeNode } from './mindmap-layout'
import { MIND_NODE_SIZE, type MindEdgeSpec, type MindNodeSpec, type MindmapData } from './mindmap-types'
import { DIRECTED_RELATIONS, RELATION_DASH, RELATION_TYPE_NAME, yearOf } from './survey-mindmap.lib'

export const CHILDREN_BRANCH_ID = 'children'

export function buildEgoMindmap(graph: EventRelationGraph, maxHop: number): MindmapData {
  const nodes = graph.nodes.filter((node) => node.hop <= maxHop)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const relations = graph.relations.filter((relation) => byId.has(relation.fromId) && byId.has(relation.toId))
  const center = byId.get(graph.centerId)
  const specs = new Map<string, MindNodeSpec>()
  const treeNodes = new Map<string, MindTreeNode>()
  const ensure = (id: string, kind: MindNodeSpec['kind']): MindTreeNode => {
    let tree = treeNodes.get(id)
    if (!tree) {
      tree = { id, ...MIND_NODE_SIZE[kind], children: [] }
      treeNodes.set(id, tree)
    }
    return tree
  }

  const root = ensure(graph.centerId, 'root')
  specs.set(graph.centerId, {
    id: graph.centerId,
    kind: 'root',
    label: center?.title ?? '',
    openable: false,
    focus: true,
    hint: center?.startDate?.slice(0, 10) ?? null,
    connectable: true,
  })

  /* 상위 — 왼쪽, 나무 선(소속) */
  for (const node of nodes.filter((item) => item.via === 'parent')) {
    const tree = ensure(node.id, 'event')
    tree.side = 'left'
    root.children.push(tree)
    specs.set(node.id, { id: node.id, kind: 'event', label: node.title, number: '상위', openable: true, hint: node.startDate?.slice(0, 10) ?? null, year: yearOf(node.startDate), connectable: true })
  }

  /* 하위 — 오른쪽 '하위 N' 가지 아래 */
  const children = nodes.filter((item) => item.via === 'child')
  if (children.length > 0) {
    const branch = ensure(CHILDREN_BRANCH_ID, 'branch')
    branch.side = 'right'
    specs.set(CHILDREN_BRANCH_ID, {
      id: CHILDREN_BRANCH_ID,
      kind: 'branch',
      label: `하위 사건 ${children.length}${graph.childrenTruncated ? '+' : ''}`,
      openable: false,
    })
    for (const node of children) {
      branch.children.push(ensure(node.id, 'event'))
      specs.set(node.id, { id: node.id, kind: 'event', label: node.title, openable: true, hint: node.startDate?.slice(0, 10) ?? null, year: yearOf(node.startDate), connectable: true })
    }
    root.children.push(branch)
  }

  /* 관련 — 찾은 순서(가까운 단부터). 1단은 방향으로 좌·우, 2단은 찾은 마디 밑 */
  const related = nodes.filter((item) => item.via === 'relation').sort((left, right) => left.hop - right.hop)
  for (const node of related) {
    const tree = ensure(node.id, 'event')
    specs.set(node.id, {
      id: node.id,
      kind: 'event',
      label: node.title,
      openable: true,
      hint: node.startDate?.slice(0, 10) ?? null,
      year: yearOf(node.startDate),
      connectable: true,
      hideTreeEdge: true,
    })
    const parentId = node.reachedFrom && treeNodes.has(node.reachedFrom) ? node.reachedFrom : graph.centerId
    if (parentId === graph.centerId) {
      const link = relations.find(
        (relation) =>
          (relation.fromId === node.id && relation.toId === graph.centerId) ||
          (relation.toId === node.id && relation.fromId === graph.centerId),
      )
      if (link && DIRECTED_RELATIONS.has(link.type)) tree.side = link.toId === graph.centerId ? 'left' : 'right'
      root.children.push(tree)
    } else {
      ensure(parentId, 'event').children.push(tree)
    }
  }

  const edges: MindEdgeSpec[] = relations.map((relation) => ({
    items: [
      {
        id: relation.id,
        fromId: relation.fromId,
        toId: relation.toId,
        fromTitle: byId.get(relation.fromId)?.title ?? '',
        toTitle: byId.get(relation.toId)?.title ?? '',
        type: relation.type,
        description: relation.description,
      },
    ],
    id: relation.id,
    from: relation.fromId,
    to: relation.toId,
    dash: RELATION_DASH[relation.type],
    arrow: DIRECTED_RELATIONS.has(relation.type),
    title: `${RELATION_TYPE_NAME[relation.type]}: ${byId.get(relation.fromId)?.title ?? ''} → ${byId.get(relation.toId)?.title ?? ''}${relation.description ? `\n${relation.description}` : ''}`,
  }))
  return { tree: root, specs, relations: edges }
}
