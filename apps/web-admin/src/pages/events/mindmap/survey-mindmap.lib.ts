/**
 * 조망 › 연결 마인드맵의 재료 — 최상위 사건 아래 나무(뿌리 → 묶음 → 국면 → 사건) + 그 위를 가로지르는 관련 사건.
 *
 * - '연결만'(links): 관계가 닿은 사건과 그 조상 경로만 남긴다(프랑스 혁명 93마디 → 20마디 남짓).
 * - '전체'(all): 모든 마디. 접은 마디 아래는 숨기고 숨은 사건 수를 단다.
 * - 관계 끝이 숨은 마디면 보이는 가장 가까운 조상으로 붙이고, 같은 두 마디 사이는 한 선 + '×N'.
 * - 트리 밖 관계는 뿌리 아래 '이 묶음 밖' 가지의 마디로.
 */
import { type EventOverviewNode, type EventOverviewRelation } from '@/shared/api/event-overview'

import { type EventPhase, phaseReach } from '../detail/components/event-phase.lib'
import { MIND_NODE_SIZE, type MindEdgeSpec, type MindNodeKind, type MindNodeSpec, type MindmapData } from './mindmap-types'
import { type MindTreeNode } from './mindmap-layout'

export type RelationType = EventOverviewRelation['type']

/** 관계 종류 → 선 모양(간트 화살표·연결 범례와 같은 규약) */
export const RELATION_DASH: Record<RelationType, string> = {
  LED_TO: '',
  INFLUENCED: '6 4',
  RESPONSE_TO: '10 3 2 3',
  CONCURRENT: '2 4',
  RELATED: '1 5',
}
export const DIRECTED_RELATIONS: ReadonlySet<RelationType> = new Set(['LED_TO', 'INFLUENCED', 'RESPONSE_TO'])

export const RELATION_TYPE_NAME: Record<RelationType, string> = {
  LED_TO: '직접 계기',
  INFLUENCED: '배경·영향',
  RESPONSE_TO: '대응',
  CONCURRENT: '같은 국면',
  RELATED: '그 밖의 연관',
}

export interface SurveyMindmapInput {
  root: EventOverviewNode
  /** 전개 순서의 하위 전부 */
  ordered: ReadonlyArray<EventOverviewNode>
  relations: ReadonlyArray<EventOverviewRelation>
  numberById: Map<string, string>
  /** 마디 → 가지 색(묶음 색) */
  colorOf: (id: string) => string | null
  dateLabelById?: Map<string, string>
  mode: 'links' | 'all'
  collapsed: ReadonlySet<string>
  hiddenTypes: ReadonlySet<RelationType>
}

interface Draft {
  id: string
  kind: MindNodeKind
  label: string
  number: string | null
  color: string | null
  openable: boolean
  children: Draft[]
  /** 사건 id(국면 마디는 null) — 보일지 정할 때 */
  eventId: string | null
  hint?: string | null
}

const PHASE_PREFIX = 'phase:'
export const OUTSIDE_BRANCH_ID = 'outside'

export function buildSurveyMindmap(input: SurveyMindmapInput): MindmapData & { visibleRelationCount: number } {
  const { root, ordered, numberById, colorOf, mode, collapsed, hiddenTypes } = input
  const relations = input.relations.filter((relation) => !hiddenTypes.has(relation.type))
  const byId = new Map([root, ...ordered].map((node) => [node.id, node]))
  const childrenOf = new Map<string, EventOverviewNode[]>()
  for (const node of ordered) {
    if (!node.parentEventId) continue
    childrenOf.set(node.parentEventId, [...(childrenOf.get(node.parentEventId) ?? []), node])
  }

  /* 사건 → 나무 마디(국면은 사이 마디) */
  const draftOf = (node: EventOverviewNode, isRoot: boolean): Draft => {
    const children = childrenOf.get(node.id) ?? []
    const chapters = [...((node.phases ?? []) as EventPhase[])].sort((left, right) => left.order - right.order)
    const draftChildren: Draft[] = []
    const phaseDrafts = new Map<string, Draft>()
    for (const child of children) {
      const childDraft = draftOf(child, false)
      /* '연결만'은 국면 열을 두지 않는다 — 열 하나가 늘면 화면 맞춤 배율이 줄어 글자가 안 읽혔다. 국면은 마디 설명에 */
      if (chapters.length === 0 || mode === 'links') {
        if (chapters.length > 0) {
          const reach = phaseReach(chapters, {
            id: child.id,
            phaseId: child.phaseId ?? null,
            startDate: child.startDate,
            startDatePrecision: child.startDatePrecision,
          })
          const chapter = reach.from != null ? chapters[reach.from - 1] : null
          if (chapter) childDraft.hint = [childDraft.hint, `${reach.from}국면 · ${chapter.title}`].filter(Boolean).join('\n')
        }
        draftChildren.push(childDraft)
        continue
      }
      const reach = phaseReach(chapters, {
        id: child.id,
        phaseId: child.phaseId ?? null,
        startDate: child.startDate,
        startDatePrecision: child.startDatePrecision,
      })
      const chapter = reach.from != null ? chapters[reach.from - 1] : null
      if (!chapter) {
        draftChildren.push(childDraft)
        continue
      }
      let phaseDraft = phaseDrafts.get(chapter.id)
      if (!phaseDraft) {
        phaseDraft = {
          id: `${PHASE_PREFIX}${chapter.id}`,
          kind: 'phase',
          label: `${reach.from}국면 · ${chapter.title}`,
          number: null,
          color: colorOf(node.id),
          openable: false,
          children: [],
          eventId: null,
        }
        phaseDrafts.set(chapter.id, phaseDraft)
        draftChildren.push(phaseDraft)
      }
      phaseDraft.children.push(childDraft)
    }
    const depthOne = node.parentEventId === root.id
    return {
      id: node.id,
      kind: isRoot ? 'root' : depthOne && node.kind === 'COLLECTION' ? 'branch' : 'event',
      label: node.title,
      number: isRoot ? null : (numberById.get(node.id) ?? null),
      color: isRoot ? null : colorOf(node.id),
      openable: !isRoot,
      children: draftChildren,
      eventId: node.id,
      hint: input.dateLabelById?.get(node.id) ?? null,
    }
  }
  const fullTree = draftOf(root, true)

  /* '연결만' — 관계 끝 사건 + 그 조상 */
  const keep = new Set<string>()
  if (mode === 'links') {
    const keepWithAncestors = (id: string) => {
      let cursor: EventOverviewNode | undefined = byId.get(id)
      while (cursor) {
        keep.add(cursor.id)
        cursor = cursor.parentEventId ? byId.get(cursor.parentEventId) : undefined
      }
    }
    for (const relation of relations) {
      if (byId.has(relation.fromId)) keepWithAncestors(relation.fromId)
      if (byId.has(relation.toId)) keepWithAncestors(relation.toId)
    }
  }

  /* 보이는 나무 + 숨은 사건 → 보이는 대리 마디 */
  const proxy = new Map<string, string>()
  const countEvents = (draft: Draft): number =>
    draft.children.reduce((sum, child) => sum + (child.eventId ? 1 : 0) + countEvents(child), 0)
  const mapHidden = (draft: Draft, to: string) => {
    for (const child of draft.children) {
      if (child.eventId) proxy.set(child.eventId, to)
      mapHidden(child, to)
    }
  }
  const specs = new Map<string, MindNodeSpec>()
  const prune = (draft: Draft): MindTreeNode | null => {
    if (mode === 'links' && draft.eventId && !keep.has(draft.eventId)) return null
    if (draft.eventId) proxy.set(draft.eventId, draft.id)
    const isCollapsed = mode === 'all' && collapsed.has(draft.id) && draft.children.length > 0
    let children: MindTreeNode[] = []
    if (isCollapsed) mapHidden(draft, draft.id)
    else children = draft.children.map(prune).filter((child): child is MindTreeNode => child !== null)
    /* 국면 마디가 '연결만'에서 비면 뺀다 */
    if (draft.kind === 'phase' && children.length === 0 && !isCollapsed) return null
    const size = MIND_NODE_SIZE[draft.kind]
    const hidden = isCollapsed ? countEvents(draft) : 0
    specs.set(draft.id, {
      id: draft.id,
      kind: draft.kind,
      label: draft.label,
      number: draft.number,
      color: draft.color,
      openable: draft.openable,
      hint: draft.hint ?? null,
      collapse:
        mode === 'all' && draft.kind !== 'root' && draft.children.length > 0
          ? { collapsed: isCollapsed, hidden }
          : null,
    })
    return { id: draft.id, width: size.width, height: size.height, children }
  }
  const tree = prune(fullTree) ?? { id: root.id, width: MIND_NODE_SIZE.root.width, height: MIND_NODE_SIZE.root.height, children: [] }

  /* 트리 밖 관계 — '이 묶음 밖' 가지 */
  const externals = relations.filter((relation) => relation.external)
  if (externals.length > 0) {
    const outsideChildren: MindTreeNode[] = []
    for (const relation of externals) {
      const external = relation.external!
      const id = `ext:${external.id}`
      if (specs.has(id)) continue
      specs.set(id, {
        id,
        kind: 'external',
        label: external.title,
        number: null,
        color: null,
        openable: true,
        hint: external.startDate?.slice(0, 4) ?? null,
      })
      outsideChildren.push({ id, ...MIND_NODE_SIZE.external, children: [] })
      proxy.set(external.id, id)
    }
    specs.set(OUTSIDE_BRANCH_ID, {
      id: OUTSIDE_BRANCH_ID,
      kind: 'branch',
      label: '이 묶음 밖',
      number: null,
      color: null,
      openable: false,
    })
    tree.children.push({ id: OUTSIDE_BRANCH_ID, ...MIND_NODE_SIZE.branch, children: outsideChildren })
  }

  /* 관계 선 — 보이는 마디로 옮기고 같은 쌍·종류는 하나로 */
  const merged = new Map<string, MindEdgeSpec>()
  for (const relation of relations) {
    const from = proxy.get(relation.fromId)
    const to = proxy.get(relation.toId)
    if (!from || !to || from === to) continue
    const key = `${from}>${to}:${relation.type}`
    const existing = merged.get(key)
    if (existing) {
      existing.count = (existing.count ?? 1) + 1
      continue
    }
    const fromTitle = byId.get(relation.fromId)?.title ?? relation.external?.title ?? ''
    const toTitle = byId.get(relation.toId)?.title ?? relation.external?.title ?? ''
    merged.set(key, {
      id: relation.id,
      from,
      to,
      dash: RELATION_DASH[relation.type],
      arrow: DIRECTED_RELATIONS.has(relation.type),
      count: 1,
      title: `${RELATION_TYPE_NAME[relation.type]}: ${fromTitle} → ${toTitle}${relation.description ? `\n${relation.description}` : ''}`,
    })
  }
  return { tree, specs, relations: [...merged.values()], visibleRelationCount: relations.length }
}
