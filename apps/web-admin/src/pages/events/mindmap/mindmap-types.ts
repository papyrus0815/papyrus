/**
 * 사건 마인드맵의 공용 모양 — 캔버스(xyflow, lazy)와 어댑터(가벼운 lib)가 함께 쓴다.
 * 어댑터가 캔버스 파일을 가져오면 xyflow가 조망 첫 번들에 실려 이 파일로 나눴다.
 */
import { type MindTreeNode } from './mindmap-layout'

export type MindNodeKind = 'root' | 'branch' | 'phase' | 'event' | 'external'

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
  event: { width: 188, height: 28 },
  external: { width: 188, height: 28 },
}

