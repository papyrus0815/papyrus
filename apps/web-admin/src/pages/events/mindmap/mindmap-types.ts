/**
 * 사건 마인드맵의 공용 모양 — 캔버스(xyflow, lazy)와 어댑터(가벼운 lib)가 함께 쓴다.
 * 어댑터가 캔버스 파일을 가져오면 xyflow가 조망 첫 번들에 실려 이 파일로 나눴다.
 */
import { type MindTreeNode } from './mindmap-layout'

export type MindNodeKind = 'root' | 'branch' | 'phase' | 'event' | 'external'

export type MindRelationType = 'LED_TO' | 'INFLUENCED' | 'RESPONSE_TO' | 'CONCURRENT' | 'RELATED'

/** 선 하나가 품은 관계(접힌 가지로 모이면 여럿) — 선을 누르면 뜨는 카드가 이것으로 고치고 지운다 */
export interface MindRelationItem {
  id: string
  fromId: string
  toId: string
  fromTitle: string
  toTitle: string
  type: MindRelationType
  description: string | null
}

/* type(인터페이스 아님) — xyflow 노드 data는 Record<string, unknown>이어야 해 암묵 색인 서명이 필요하다 */
export type MindNodeSpec = {
  id: string
  kind: MindNodeKind
  label: string
  number?: string | null
  /** 보조 한 줄(날짜 등) — 마우스를 올리면 */
  hint?: string | null
  /** 가지 색 — 테두리·점·가지 선 */
  color?: string | null
  /** 눌러 열 수 있는가(사건) */
  openable: boolean
  /** 접을 수 있으면 — 접혔을 때 숨은 사건 수 */
  collapse?: { collapsed: boolean; hidden: number } | null
  /** 가운데(상세 마인드맵의 그 사건) */
  focus?: boolean
  /** 연도 꼬리표 — 마인드맵은 시간축이 없어 '언제'를 마디가 든다 */
  year?: string | null
  /** 이 마디에서 끌어 다른 마디에 놓아 관계를 만들 수 있는가(실제 사건 마디만) */
  connectable?: boolean
  /** 부모에서 오는 나무 선을 긋지 않는다 — 관계 선이 이미 잇는 마디(같은 연결을 두 번 긋지 않게) */
  hideTreeEdge?: boolean
}

export interface MindEdgeSpec {
  id: string
  from: string
  to: string
  dash?: string
  arrow?: boolean
  /** 같은 두 마디 사이 연결 수(접힌 가지로 모인 것) */
  count?: number
  title?: string
  /** 묶음(가지)을 건너는 선 — 뿌리를 가로질러 그림을 가르므로 평소엔 한 단 흐리게 */
  cross?: boolean
  items?: MindRelationItem[]
}

export interface MindmapData {
  tree: MindTreeNode
  specs: Map<string, MindNodeSpec>
  relations: MindEdgeSpec[]
}

/*
 * 마디 크기 — 화면에 맞추면(fitView) 전체 폭이 줄어든 배율을 정한다. 처음 220·176·214 + 열 간격 56으로는
 * 프랑스 혁명 '연결만'이 1,800px 폭이라 0.55배로 줄어 글자가 7px이었다. 폭을 줄이고 '연결만'은 국면 열을 뺀다.
 */
export const MIND_NODE_SIZE: Record<MindNodeKind, { width: number; height: number }> = {
  root: { width: 168, height: 40 },
  branch: { width: 176, height: 32 },
  phase: { width: 140, height: 24 },
  /* 두 줄 제목 — 한 줄(28px)일 때 '1-17 세습 귀족 작위 …'처럼 거의 모든 제목이 잘렸다 */
  event: { width: 196, height: 40 },
  external: { width: 196, height: 40 },
}

