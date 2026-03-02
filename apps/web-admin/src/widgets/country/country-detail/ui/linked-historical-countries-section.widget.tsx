/**
 * 연결된 역사적 국가와 관계 섹션
 * - 현대 국가 상세 > 대시보드 탭에서 사용
 * - 탭: 목록 | 흐름도 (역대 수반 계보도 스타일 참조)
 * - 변천·소속·수평 관계 정보를 모두 표시
 * - 깔끔하고 트렌디한 디자인
 */
import React, { useMemo, useState } from 'react'

import { useQueries } from '@tanstack/react-query'

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getStateTypeLabel } from '@/entities/historical-country/lib/utils'
import {
  type HistoricalCountryMembershipDto,
  type HistoricalCountryRelationDto,
  type HistoricalCountryTransitionDto,
  type HistoricalMembershipRole,
  type HistoricalRelationType,
  type TransitionEventType,
  getMembershipsByHistoricalCountryId,
  getRelationsByHistoricalCountryId,
  getTransitionsByHistoricalCountryId,
} from '@/shared/api/historical-countries'
import { pathKeys } from '@/shared/router'

/* 행정조직·인물과 동일: 단일 악센트, 회색 톤 */
const MAIN = '#6366f1'
const BORDER = '#e5e7eb'
const MUTED = '#64748b'
const TITLE = '#0f172a'

const TRANSITION_EVENT_LABELS: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병/연합',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SECULARIZATION: '세속화',
  SPLIT: '분열',
  OTHER: '기타',
}

const RELATION_TYPE_LABELS: Record<HistoricalRelationType, string> = {
  ALLIANCE: '동맹',
  WAR: '전쟁',
  SUZERAIN_VASSAL: '종주-속국',
  TRIBUTARY: '조공',
  PERSONAL_UNION: '동군연합',
}

const MEMBERSHIP_ROLE_LABELS: Record<HistoricalMembershipRole, string> = {
  COLONY: '식민지',
  PROTECTORATE: '보호국',
  DOMINION: '자치령',
  CONFEDERATION_MEMBER: '연방 구성원',
  VASSAL_STATE: '속국',
  ALLY: '동맹',
  UNION: '연합',
  SUCCESSION: '계승',
  OTHER: '기타',
}

const sectionLabelStyle: React.CSSProperties = {
  marginBottom: 18,
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  lineHeight: 1.4,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sectionLabelStyle}>{children}</div>
}

function formatPeriod(h: {
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
}): string {
  const start = h.startYear
    ? `${h.startEra === 'BC' ? '기원전 ' : ''}${h.startYear}년`
    : ''
  const end = h.endYear
    ? `${h.endEra === 'BC' ? '기원전 ' : ''}${h.endYear}년`
    : ''
  if (!start && !end) return '—'
  if (!start) return `~ ${end}`
  if (!end) return `${start} ~`
  return `${start} ~ ${end}`
}

/* 행정조직 StatCard와 동일: 흰 배경, 테두리, 아이콘만 악센트 */
const StatCardWrap = styled.div`
  background: #ffffff;
  border: 1px solid ${BORDER};
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    border-color: #d1d5db;
  }
`

function StatCard({
  icon,
  title,
  value,
  unit,
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  unit: string
}) {
  return (
    <StatCardWrap>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: MAIN,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: MUTED,
            marginBottom: 4,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: TITLE,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>
            {unit}
          </span>
        </div>
      </div>
    </StatCardWrap>
  )
}

/** 역대 수반 계보도와 동일한 탭 스타일 */
/* 행정조직 탭과 동일: pill 배경, 활성 = 흰 배경 + 인디고 글자 */
const ViewModeTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: #f1f5f9;
  border-radius: 20px;
  width: fit-content;
  &::-webkit-scrollbar {
    display: none;
  }
`

const ViewModeTab = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

/** 흐름도: 하단 연도 축과 같은 가로 스케일 — 카드 left/width = 연도 구간 */
const FLOW_ROW_HEIGHT = 128
/** 이 연수 미만이면 카드 대신 필(툴팁) 표기 */
const SHORT_DURATION_YEARS = 20

/** 흐름도 스크롤 — 카드+연도축이 같은 너비로 함께 스크롤, 스크롤바는 막대바 아래. flex:1로 남은 높이 채우고 하단 막대는 항상 뷰 하단에 */
const FlowContentScroll = styled.div`
  width: 100%;
  min-width: 0;
  flex: 1;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
`

/** 스크롤 안 한 덩어리 — 연도 범위에 따라 최소 너비(한 세기당 더 넓게). flex column으로 하단 축을 항상 아래로 */
const FLOW_TIMELINE_BASE_MIN_WIDTH = 960
const FLOW_PX_PER_YEAR = 6
const FlowScrollInner = styled.div<{ $minWidth: number }>`
  width: 100%;
  min-width: ${(p) => p.$minWidth}px;
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

/** 흐름도 카드 영역 — FlowScrollInner와 동일 너비, flex:1로 남은 공간 채워 하단 연도축을 뷰 하단으로 */
const FlowContent = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
  flex: 1;
  padding: 16px 0 32px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
`

/** 한 계보 한 줄 — 너비 100% = minYear~maxYear, 카드는 연도 비율로 위치·너비 */
const FlowRow = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  height: ${FLOW_ROW_HEIGHT}px;
  box-sizing: border-box;
`

/** 카드: left%·width% = 하단 연도 축과 동일 스케일 (연도 구간 정확히) */
const FlowCard = styled.button<{ $leftPct: number; $widthPct: number }>`
  position: absolute;
  left: ${(p) => p.$leftPct}%;
  width: ${(p) => Math.max(0.5, p.$widthPct)}%;
  top: 0;
  height: 100%;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid ${BORDER};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  box-sizing: border-box;

  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
`

/** 짧은 기간(10년 미만) 국가용 필 — 연도 위치 유지, 툴팁으로 전체 정보 */
const FlowCardPill = styled.button<{ $leftPct: number; $widthPct: number }>`
  position: absolute;
  left: ${(p) => p.$leftPct}%;
  width: ${(p) => Math.max(0.5, p.$widthPct)}%;
  top: 50%;
  transform: translateY(-50%);
  min-height: 40px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid ${BORDER};
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  box-sizing: border-box;

  &:hover {
    border-color: #c7d2fe;
    background: #f5f3ff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }
`

/** 카드와 카드 경계(연도 이어짐) 표시 — 하단 축과 맞는 x 위치 */
const FlowConnector = styled.div<{ $leftPct: number }>`
  position: absolute;
  left: ${(p) => p.$leftPct}%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.1);
`

/** 하단 연도 축 래퍼 — 카드와 동일 너비, 카드↔막대바 간격 충분히 확보 */
const FlowBottomAxisWrap = styled.div`
  width: 100%;
  min-width: 0;
  margin-top: 24px;
  padding-top: 40px;
  padding-bottom: 16px;
  flex-shrink: 0;
  box-sizing: border-box;
`

const FlowBottomAxisTrack = styled.div`
  position: relative;
  width: 100%;
  height: 44px;
  box-sizing: border-box;
`

const FlowBottomAxisBar = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 14px;
  height: 5px;
  background: linear-gradient(90deg, #c7d2fe 0%, #a5b4fc 50%, #818cf8 100%);
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.15);
`

const FlowBottomAxisLabel = styled.span<{ $leftPct: number }>`
  position: absolute;
  left: ${(p) => p.$leftPct}%;
  transform: translateX(-50%);
  bottom: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${MUTED};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

/** 관계 뱃지 — 행정조직 탭 버튼과 동일: 인디고 배경/텍스트 */
const RelationBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
  padding: 4px 10px;
  border-radius: 8px;
  background: #eef2ff;
  white-space: nowrap;
`

export interface LinkedHistoricalCountriesSectionProps {
  country: UnifiedCountry
}

type HistoricalCountryItem = NonNullable<
  NonNullable<UnifiedCountry['historicalCountries']>[number]
>

/** 국가의 숫자 연도 범위 (BC = 음수). 흐름도 연도 기준 배치용 */
function getCountryYearRange(
  h: HistoricalCountryItem,
): { startYear: number; endYear: number } | null {
  const toNum = (v: number | null | undefined): number | null => {
    if (v == null) return null
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }
  const startYear = toNum(h.startYear)
  const endYear = toNum(h.endYear)
  const sy =
    startYear != null
      ? h.startEra === 'BC'
        ? -Math.abs(startYear)
        : Math.abs(startYear)
      : null
  const ey =
    endYear != null
      ? h.endEra === 'BC'
        ? -Math.abs(endYear)
        : Math.abs(endYear)
      : null
  if (sy == null && ey == null) return null
  const s = sy ?? ey!
  const e = ey ?? sy!
  return { startYear: s, endYear: e }
}

/** 연결된 국가 ID 집합 내에서만 유효한 변천만 필터 */
function useTransitionsWithinLinked(
  linkedIds: string[],
): HistoricalCountryTransitionDto[] {
  const idSet = useMemo(() => new Set(linkedIds), [linkedIds])
  const queries = useQueries({
    queries: linkedIds.map((id) => ({
      queryKey: ['historical-country-transitions', id],
      queryFn: () => getTransitionsByHistoricalCountryId(id),
      enabled: linkedIds.length > 0,
    })),
  })
  const allData = useMemo(() => queries.flatMap((q) => q.data ?? []), [queries])
  return useMemo(() => {
    const seen = new Set<string>()
    return allData.filter((t) => {
      if (!idSet.has(t.predecessorId) || !idSet.has(t.successorId)) return false
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [allData, idSet])
}

/** 연결된 국가 ID 집합 내에서만 유효한 관계만 필터 */
function useRelationsWithinLinked(
  linkedIds: string[],
): HistoricalCountryRelationDto[] {
  const idSet = useMemo(() => new Set(linkedIds), [linkedIds])
  const queries = useQueries({
    queries: linkedIds.map((id) => ({
      queryKey: ['historical-country-relations', id],
      queryFn: () => getRelationsByHistoricalCountryId(id),
      enabled: linkedIds.length > 0,
    })),
  })
  const allData = useMemo(() => queries.flatMap((q) => q.data ?? []), [queries])
  return useMemo(() => {
    const seen = new Set<string>()
    return allData.filter((r) => {
      if (!idSet.has(r.subjectCountryId) || !idSet.has(r.objectCountryId))
        return false
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
  }, [allData, idSet])
}

/** 연결된 국가 ID 집합 내에서만 유효한 소속만 필터 */
function useMembershipsWithinLinked(
  linkedIds: string[],
): HistoricalCountryMembershipDto[] {
  const idSet = useMemo(() => new Set(linkedIds), [linkedIds])
  const queries = useQueries({
    queries: linkedIds.map((id) => ({
      queryKey: ['historical-country-memberships', id],
      queryFn: () => getMembershipsByHistoricalCountryId(id),
      enabled: linkedIds.length > 0,
    })),
  })
  const allData = useMemo(() => queries.flatMap((q) => q.data ?? []), [queries])
  return useMemo(() => {
    const seen = new Set<string>()
    return allData.filter((m) => {
      if (!idSet.has(m.historicalCountryId) || !idSet.has(m.memberCountryId))
        return false
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  }, [allData, idSet])
}

/** 한 컴포넌트 내 위상 정렬 (루트→리프) */
function topologicalOrder(
  nodeIds: string[],
  edges: { predecessorId: string; successorId: string }[],
): string[] {
  const idSet = new Set(nodeIds)
  const inDeg = new Map<string, number>()
  const outEdges = new Map<string, string[]>()
  nodeIds.forEach((id) => {
    inDeg.set(id, 0)
    outEdges.set(id, [])
  })
  edges.forEach(({ predecessorId, successorId }) => {
    if (!idSet.has(predecessorId) || !idSet.has(successorId)) return
    inDeg.set(successorId, (inDeg.get(successorId) ?? 0) + 1)
    outEdges.get(predecessorId)!.push(successorId)
  })
  const queue = nodeIds.filter((id) => inDeg.get(id) === 0)
  const order: string[] = []
  while (queue.length > 0) {
    const u = queue.shift()!
    order.push(u)
    for (const v of outEdges.get(u) ?? []) {
      const d = (inDeg.get(v) ?? 0) - 1
      inDeg.set(v, d)
      if (d === 0) queue.push(v)
    }
  }
  return order.length === nodeIds.length ? order : nodeIds
}

/** 방향 무시 연결 요소로 묶고, 각 컴포넌트를 위상 정렬해 체인 배열 반환 */
function getChains(
  nodeIds: string[],
  edges: { predecessorId: string; successorId: string }[],
): string[][] {
  const idSet = new Set(nodeIds)
  const adj = new Map<string, string[]>()
  nodeIds.forEach((id) => adj.set(id, []))
  edges.forEach(({ predecessorId, successorId }) => {
    if (!idSet.has(predecessorId) || !idSet.has(successorId)) return
    adj.get(predecessorId)!.push(successorId)
    adj.get(successorId)!.push(predecessorId)
  })
  const visited = new Set<string>()
  const components: string[][] = []
  for (const id of nodeIds) {
    if (visited.has(id)) continue
    const stack = [id]
    const comp: string[] = []
    while (stack.length > 0) {
      const u = stack.pop()!
      if (visited.has(u)) continue
      visited.add(u)
      comp.push(u)
      for (const v of adj.get(u) ?? []) stack.push(v)
    }
    if (comp.length > 0) {
      const edgeSubset = edges.filter(
        (e) =>
          idSet.has(e.predecessorId) &&
          idSet.has(e.successorId) &&
          comp.includes(e.predecessorId) &&
          comp.includes(e.successorId),
      )
      components.push(topologicalOrder(comp, edgeSubset))
    }
  }
  return components
}

/** 메인 계보(루트→말단 최장 경로)와 합류 브랜치를 나눔. 브랜치끼리 계승으로 이어지면 같은 줄에 배치 */
function getMainPathAndBranchRows(
  chain: string[],
  edges: { predecessorId: string; successorId: string }[],
): string[][] {
  const idSet = new Set(chain)
  const inChain = edges.filter(
    (e) => idSet.has(e.predecessorId) && idSet.has(e.successorId),
  )
  const successors = new Map<string, string[]>()
  chain.forEach((id) => successors.set(id, []))
  inChain.forEach(({ predecessorId, successorId }) => {
    successors.get(predecessorId)!.push(successorId)
  })
  const roots = chain.filter(
    (id) => !inChain.some((e) => e.successorId === id),
  )
  function longestPathFrom(id: string): string[] {
    const succs = successors.get(id) ?? []
    if (succs.length === 0) return [id]
    let best: string[] = [id]
    for (const s of succs) {
      const sub = longestPathFrom(s)
      if (1 + sub.length > best.length) best = [id, ...sub]
    }
    return best
  }
  let mainPath: string[] = []
  for (const r of roots) {
    const path = longestPathFrom(r)
    if (path.length > mainPath.length) mainPath = path
  }
  const mainSet = new Set(mainPath)
  const branches = chain.filter((id) => !mainSet.has(id))
  if (branches.length === 0) return [mainPath]

  const branchSet = new Set(branches)
  const branchSuccessor = new Map<string, string>()
  inChain.forEach((e) => {
    if (branchSet.has(e.predecessorId) && branchSet.has(e.successorId))
      branchSuccessor.set(e.predecessorId, e.successorId)
  })
  const hasPredecessorInBranches = new Set(branchSuccessor.values())
  const branchRoots = branches.filter((b) => !hasPredecessorInBranches.has(b))
  const branchRows: string[][] = []
  for (const root of branchRoots) {
    const row: string[] = []
    let id: string | undefined = root
    while (id) {
      row.push(id)
      id = branchSuccessor.get(id)
    }
    branchRows.push(row)
  }
  return [mainPath, ...branchRows]
}

export function LinkedHistoricalCountriesSection({
  country,
}: LinkedHistoricalCountriesSectionProps) {
  const navigate = useNavigate()
  const list = country.historicalCountries ?? []
  const count = list.length
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list')

  const transitions = useTransitionsWithinLinked(list.map((h) => h.id))
  const relations = useRelationsWithinLinked(list.map((h) => h.id))
  const memberships = useMembershipsWithinLinked(list.map((h) => h.id))
  const idToCountry = useMemo(() => {
    const m = new Map<string, (typeof list)[0]>()
    list.forEach((h) => m.set(h.id, h))
    return m
  }, [list])

  /** 국가별 관계 정보 집계 */
  const countryRelations = useMemo(() => {
    const map = new Map<
      string,
      {
        transitions: HistoricalCountryTransitionDto[]
        relations: HistoricalCountryRelationDto[]
        memberships: HistoricalCountryMembershipDto[]
      }
    >()
    list.forEach((h) => {
      map.set(h.id, { transitions: [], relations: [], memberships: [] })
    })
    transitions.forEach((t) => {
      map.get(t.predecessorId)?.transitions.push(t)
      map.get(t.successorId)?.transitions.push(t)
    })
    relations.forEach((r) => {
      map.get(r.subjectCountryId)?.relations.push(r)
      map.get(r.objectCountryId)?.relations.push(r)
    })
    memberships.forEach((m) => {
      map.get(m.historicalCountryId)?.memberships.push(m)
      map.get(m.memberCountryId)?.memberships.push(m)
    })
    return map
  }, [list, transitions, relations, memberships])

  /** 흐름도용: 변천 있으면 체인별, 없으면 전체를 한 줄로. 연방-구성원도 같은 체인으로 묶어 선 연결 */
  const { chains, transitionByEdge } = useMemo(() => {
    const edgeMap = new Map<string, HistoricalCountryTransitionDto>()
    transitions.forEach((t) => {
      edgeMap.set(`${t.predecessorId}\t${t.successorId}`, t)
    })
    const nodeIds = list.map((h) => h.id)
    if (nodeIds.length === 0) {
      return { chains: [] as string[][], transitionByEdge: edgeMap }
    }
    const edges: { predecessorId: string; successorId: string }[] = transitions.map((t) => ({
      predecessorId: t.predecessorId,
      successorId: t.successorId,
    }))
    memberships.forEach((m) => {
      if (nodeIds.includes(m.memberCountryId) && nodeIds.includes(m.historicalCountryId)) {
        edges.push({
          predecessorId: m.memberCountryId,
          successorId: m.historicalCountryId,
        })
      }
    })
    if (edges.length === 0) {
      return {
        chains: [nodeIds],
        transitionByEdge: edgeMap,
      }
    }
    const chainsList = getChains(nodeIds, edges)
    return { chains: chainsList, transitionByEdge: edgeMap }
  }, [list, transitions, memberships])

  /** 메인 계보(최장 경로) 1행 + 합류 브랜치 각 1행 → 튜튼→프로이센공국→프로이센왕국 / 브란덴부르크 */
  const flowRowsByChain = useMemo(() => {
    return chains.map((chain) =>
      getMainPathAndBranchRows(
        chain,
        transitions.map((t) => ({
          predecessorId: t.predecessorId,
          successorId: t.successorId,
        })),
      ),
    )
  }, [chains, transitions])

  /** 흐름도 좌측 연도 바용: 연결된 국가들의 연도 범위 (BC는 음수). 숫자 보정 적용 */
  const flowYearRange = useMemo(() => {
    const toNum = (v: number | null | undefined): number | null => {
      if (v == null) return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : null
    }
    let minY: number | null = null
    let maxY: number | null = null
    list.forEach((h) => {
      const startYear = toNum(h.startYear)
      const endYear = toNum(h.endYear)
      const sy =
        startYear != null
          ? h.startEra === 'BC'
            ? -Math.abs(startYear)
            : Math.abs(startYear)
          : null
      const ey =
        endYear != null
          ? h.endEra === 'BC'
            ? -Math.abs(endYear)
            : Math.abs(endYear)
          : null
      if (sy != null) {
        minY = minY == null ? sy : Math.min(minY, sy)
        maxY = maxY == null ? sy : Math.max(maxY, sy)
      }
      if (ey != null) {
        minY = minY == null ? ey : Math.min(minY, ey)
        maxY = maxY == null ? ey : Math.max(maxY, ey)
      }
    })
    const currentYear = new Date().getFullYear()
    if (minY == null || maxY == null) {
      const c = minY ?? maxY ?? currentYear
      return {
        minYear: c - 100,
        maxYear: Math.max(c + 100, currentYear),
        labels: [c - 100, c, currentYear] as number[],
        currentYear,
      }
    }
    const maxYExtended = Math.max(maxY, currentYear)
    if (minY === maxY) {
      const pad = Math.max(50, Math.abs(minY) / 10)
      return {
        minYear: minY - pad,
        maxYear: Math.max(maxY + pad, currentYear),
        labels: [minY - pad, minY, currentYear] as number[],
        currentYear,
      }
    }
    const range = maxYExtended - minY
    const step =
      range <= 200 ? 50 : range <= 500 ? 100 : range <= 2000 ? 200 : 500
    const labels: number[] = []
    const start = Math.floor(minY / step) * step
    for (let y = start; y <= maxYExtended; y += step) {
      if (y >= minY - step && y <= maxYExtended) labels.push(y)
    }
    if (labels.length === 0) labels.push(minY, maxYExtended)
    const minYVal = minY
    const roundYears = [1800, 1900, 2000]
    roundYears.forEach((y) => {
      if (minYVal != null && y >= minYVal && y <= maxYExtended && !labels.includes(y))
        labels.push(y)
    })
    if (maxYExtended >= currentYear && !labels.includes(currentYear))
      labels.push(currentYear)
    labels.sort((a, b) => a - b)
    return { minYear: minY, maxYear: maxYExtended, labels, currentYear }
  }, [list])

  /** 행별 카드 위치(%) — 연결선 좌표 계산용 */
  const flowLayout = useMemo(() => {
    const range = flowYearRange.maxYear - flowYearRange.minYear
    const toPct = (y: number) =>
      range === 0
        ? 0
        : ((y - flowYearRange.minYear) / range) * 100
    return flowRowsByChain.map((rows) =>
      rows.map((row) =>
        row.map((id) => {
          const h = idToCountry.get(id)
          const yr = h ? getCountryYearRange(h) : null
          if (!h || !yr) return { id, leftPct: 0, widthPct: 0 }
          const leftPct = toPct(yr.startYear)
          const endPct = toPct(yr.endYear)
          const widthPct = Math.max(0.5, endPct - leftPct)
          return { id, leftPct, widthPct }
        }),
      ),
    )
  }, [flowRowsByChain, flowYearRange, idToCountry])

  /** 브랜치 → 메인 행 연결: fromId/toId 포함 (뱃지·한가닥선·요약용). 계승·동군연합·연방(멤버십) 포함 */
  const flowConnectors = useMemo(() => {
    const out: {
      fromId: string
      toId: string
      fromGlobalRow: number
      toGlobalRow: number
      fromCenterPct: number
      toCenterPct: number
      type: 'successor' | 'personal_union' | 'membership'
      membershipRole?: string
      isLeadingMember?: boolean
    }[] = []
    let globalRowOffset = 0
    flowRowsByChain.forEach((rows, chainIdx) => {
      const mainRowIds = new Set(rows[0])
      const mainLayout = flowLayout[chainIdx]?.[0] ?? []
      const toCenter = (nodeId: string) => {
        const p = mainLayout.find((x) => x.id === nodeId)
        return p ? p.leftPct + p.widthPct / 2 : 50
      }
      for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const rowLayout = flowLayout[chainIdx]?.[rowIdx] ?? []
        for (const { id: branchId, leftPct, widthPct } of rowLayout) {
          const fromCenterPct = leftPct + widthPct / 2
          const fromGlobalRow = globalRowOffset + rowIdx
          const toGlobalRow = globalRowOffset + 0
          const rels = countryRelations.get(branchId) ?? {
            transitions: [],
            relations: [],
            memberships: [],
          }
          const successorId = transitions.find(
            (t) => t.predecessorId === branchId,
          )?.successorId
          if (successorId && mainRowIds.has(successorId)) {
            out.push({
              fromId: branchId,
              toId: successorId,
              fromGlobalRow,
              toGlobalRow,
              fromCenterPct,
              toCenterPct: toCenter(successorId),
              type: 'successor',
            })
          }
          rels.relations
            .filter(
              (r) =>
                r.relationType === 'PERSONAL_UNION' &&
                (r.subjectCountryId === branchId ||
                  r.objectCountryId === branchId),
            )
            .forEach((r) => {
              const otherId =
                r.subjectCountryId === branchId
                  ? r.objectCountryId
                  : r.subjectCountryId
              if (mainRowIds.has(otherId)) {
                out.push({
                  fromId: branchId,
                  toId: otherId,
                  fromGlobalRow,
                  toGlobalRow,
                  fromCenterPct,
                  toCenterPct: toCenter(otherId),
                  type: 'personal_union',
                })
              }
            })
          rels.memberships.forEach((m) => {
            if (m.memberCountryId !== branchId) return
            const parentId = m.historicalCountryId
            if (!mainRowIds.has(parentId)) return
            out.push({
              fromId: branchId,
              toId: parentId,
              fromGlobalRow,
              toGlobalRow,
              fromCenterPct,
              toCenterPct: toCenter(parentId),
              type: 'membership',
              membershipRole: m.role,
              isLeadingMember: m.isLeadingMember ?? false,
            })
          })
        }
      }
      globalRowOffset += rows.length
    })
    return out
  }, [flowRowsByChain, flowLayout, transitions, countryRelations])

  /** 메인 행 카드별로 "들어오는" 브랜치 관계 (뱃지용). 계승·동군연합·연방 구성원 포함 */
  const incomingRelationsByMainId = useMemo(() => {
    const map = new Map<
      string,
      {
        successor: string[]
        personalUnion: string[]
        membership: Array<{ id: string; role: string; isLeadingMember: boolean }>
      }
    >()
    flowConnectors.forEach((c) => {
      if (!map.has(c.toId))
        map.set(c.toId, {
          successor: [],
          personalUnion: [],
          membership: [],
        })
      const entry = map.get(c.toId)!
      if (c.type === 'successor') entry.successor.push(c.fromId)
      else if (c.type === 'personal_union') entry.personalUnion.push(c.fromId)
      else if (c.type === 'membership' && c.membershipRole != null)
        entry.membership.push({
          id: c.fromId,
          role: c.membershipRole,
          isLeadingMember: c.isLeadingMember ?? false,
        })
    })
    return map
  }, [flowConnectors])

  /** 관계 유형별로 선을 분리 (계승 / 동군연합 / 연방 각각 따로, 끝에 해당 관계만 라벨) */
  const flowConnectorsByBranch = useMemo(() => {
    const byKey = new Map<
      string,
      { fromGlobalRow: number; fromCenterPct: number; toGlobalRow: number; type: 'successor' | 'personal_union' | 'membership'; list: typeof flowConnectors }
    >()
    flowConnectors.forEach((c) => {
      const key = `${c.fromGlobalRow}\t${c.fromCenterPct}\t${c.type}`
      if (!byKey.has(key))
        byKey.set(key, {
          fromGlobalRow: c.fromGlobalRow,
          fromCenterPct: c.fromCenterPct,
          toGlobalRow: c.toGlobalRow,
          type: c.type,
          list: [],
        })
      byKey.get(key)!.list.push(c)
    })
    return Array.from(byKey.values())
  }, [flowConnectors])

  const totalFlowRows = flowRowsByChain.reduce(
    (s, rows) => s + rows.length,
    0,
  )
  const FLOW_ROW_GAP = 20
  const flowRowsTotalHeight =
    totalFlowRows * FLOW_ROW_HEIGHT +
    Math.max(0, totalFlowRows - 1) * FLOW_ROW_GAP

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        padding: '36px 32px 48px',
        background: '#ffffff',
        flex: 1,
        minHeight: 0,
        position: 'relative',
      }}
    >
      <header
        style={{
          paddingBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: TITLE,
              letterSpacing: '-0.04em',
              lineHeight: 1.25,
            }}
          >
            연결된 역사적 국가와 관계
          </h2>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 15,
              color: MUTED,
              lineHeight: 1.55,
              maxWidth: 560,
              fontWeight: 500,
            }}
          >
            이 현대 국가에 연결된 역사적 국가의 변천·소속·수평 관계를 목록 또는
            흐름도로 확인할 수 있습니다.
          </p>
        </div>
      </header>

      {/* 요약 지표 — 행정조직과 동일 톤 */}
      <section aria-label="연결된 역사적 국가 요약">
        <SectionLabel>요약 지표</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 20,
          }}
        >
          <StatCard
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
            title="연결된 역사적 국가"
            value={count}
            unit="개"
          />
          <StatCard
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            }
            title="변천 관계"
            value={transitions.length}
            unit="건"
          />
          <StatCard
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="수평 관계"
            value={relations.length}
            unit="건"
          />
          <StatCard
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            title="소속 관계"
            value={memberships.length}
            unit="건"
          />
        </div>
      </section>

      {/* 탭: 목록 | 흐름도 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <ViewModeTabs role="tablist" aria-label="보기 방식">
          <ViewModeTab
            role="tab"
            aria-selected={viewMode === 'list'}
            $active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            목록
          </ViewModeTab>
          <ViewModeTab
            role="tab"
            aria-selected={viewMode === 'flow'}
            $active={viewMode === 'flow'}
            onClick={() => setViewMode('flow')}
          >
            흐름도
          </ViewModeTab>
        </ViewModeTabs>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {viewMode === 'list'
            ? '연결된 역사적 국가를 카드 목록으로 볼 수 있습니다.'
            : '전임·계승 국가 변천을 한눈에 볼 수 있습니다.'}
        </span>
      </div>

      {viewMode === 'list' && (
        <section aria-label="연결된 역사적 국가 목록">
          <SectionLabel>역사적 국가 목록</SectionLabel>
          {count === 0 ? (
            <EmptyCard>
              이 현대 국가에 연결된 역사적 국가가 없습니다. 역사적 국가를 등록한
              뒤, 해당 국가 편집에서 「연결할 현대 국가」로 이 국가를 지정하면
              여기에 표시됩니다.
            </EmptyCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {list.map((h, idx) => {
                const rels = countryRelations.get(h.id) ?? {
                  transitions: [],
                  relations: [],
                  memberships: [],
                }
                return (
                  <HistoricalCountryCard
                    key={h.id}
                    h={h}
                    idx={idx}
                    relations={rels}
                    idToCountry={idToCountry}
                    onDetail={() =>
                      navigate(pathKeys.history.countryDetail(h.id))
                    }
                  />
                )
              })}
            </div>
          )}
        </section>
      )}

      {viewMode === 'flow' && (
        <section
          aria-label="국가 계보 흐름도"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <SectionLabel>국가 계보 흐름도</SectionLabel>
          {count === 0 ? (
            <EmptyCard>
              이 현대 국가에 연결된 역사적 국가가 없습니다. 역사적 국가를 등록한
              뒤 연결하면 흐름도를 볼 수 있습니다.
            </EmptyCard>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                width: '100%',
                minWidth: 0,
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <FlowContentScroll>
                <FlowScrollInner
                  $minWidth={Math.max(
                    FLOW_TIMELINE_BASE_MIN_WIDTH,
                    (flowYearRange.maxYear - flowYearRange.minYear) *
                      FLOW_PX_PER_YEAR,
                  )}
                >
                  <FlowContent>
                    {totalFlowRows > 0 &&
                      flowConnectorsByBranch.length > 0 && (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: flowRowsTotalHeight,
                            pointerEvents: 'none',
                            zIndex: 10,
                          }}
                        >
                          <svg
                            width="100%"
                            height={flowRowsTotalHeight}
                            style={{ display: 'block' }}
                            preserveAspectRatio="none"
                            viewBox={`0 0 100 ${flowRowsTotalHeight}`}
                          >
                            {flowConnectorsByBranch.map((group, i) => {
                              const midX =
                                group.list.reduce(
                                  (s, c) => s + c.toCenterPct,
                                  0,
                                ) / group.list.length
                              const fromX = group.fromCenterPct
                              const rowCenter = (r: number) =>
                                16 +
                                (r + 0.5) * (FLOW_ROW_HEIGHT + FLOW_ROW_GAP) -
                                FLOW_ROW_GAP / 2
                              const fromY = rowCenter(group.fromGlobalRow)
                              const toY = rowCenter(group.toGlobalRow)
                              return (
                                <line
                                  key={i}
                                  x1={fromX}
                                  y1={fromY}
                                  x2={midX}
                                  y2={toY}
                                  stroke="#a5b4fc"
                                  strokeWidth={1.5}
                                  strokeLinecap="round"
                                  vectorEffect="non-scaling-stroke"
                                />
                              )
                            })}
                          </svg>
                          {flowConnectorsByBranch.map((group, i) => {
                            const midX =
                              group.list.reduce(
                                (s, c) => s + c.toCenterPct,
                                0,
                              ) / group.list.length
                            const fromX = group.fromCenterPct
                            const toY =
                              16 +
                              (group.toGlobalRow + 0.5) * (FLOW_ROW_HEIGHT + FLOW_ROW_GAP) -
                              FLOW_ROW_GAP / 2
                            const labelText =
                              group.type === 'successor'
                                ? '계승'
                                : group.type === 'personal_union'
                                  ? '동군연합'
                                  : group.list[0]?.type === 'membership' && group.list[0]?.membershipRole
                                    ? group.list[0].isLeadingMember
                                      ? '연방·주축'
                                      : (MEMBERSHIP_ROLE_LABELS[group.list[0].membershipRole as keyof typeof MEMBERSHIP_ROLE_LABELS] ?? group.list[0].membershipRole)
                                    : ''
                            return (
                              labelText ? (
                                <div
                                  key={`label-${i}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${midX}%`,
                                    top: toY,
                                    transform: 'translate(-50%, -100%)',
                                    marginBottom: -4,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: '#64748b',
                                    background: '#f8fafc',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  }}
                                >
                                  {labelText}
                                </div>
                              ) : null
                            )
                          })}
                        </div>
                      )}
                    {flowRowsByChain.flatMap((rows, chainIdx) =>
                      rows.map((orderedChain, rowIdx) => {
                        const range =
                          flowYearRange.maxYear - flowYearRange.minYear
                        const toPct = (y: number) =>
                          range === 0
                            ? 0
                            : ((y - flowYearRange.minYear) / range) * 100
                        return (
                          <FlowRow
                            key={`${chainIdx}-${rowIdx}`}
                          >
                            {orderedChain.map((id, index) => {
                              const h = idToCountry.get(id)
                              const yr = h ? getCountryYearRange(h) : null
                              if (!h || !yr) return null
                              const leftPct = toPct(yr.startYear)
                              const endPct = toPct(yr.endYear)
                              const widthPct = Math.max(
                                0.5,
                                endPct - leftPct,
                              )
                              const spanYears = yr.endYear - yr.startYear
                              const isShortDuration =
                                spanYears < SHORT_DURATION_YEARS
                              const nextId = orderedChain[index + 1]
                              const transition = nextId
                                ? transitionByEdge.get(`${id}\t${nextId}`)
                                : null
                              const rels = countryRelations.get(id) ?? {
                                transitions: [],
                                relations: [],
                                memberships: [],
                              }
                              const hasPersonalUnionWithNext =
                                !!nextId &&
                                !transition &&
                                rels.relations.some(
                                  (r) =>
                                    (r.subjectCountryId === nextId ||
                                      r.objectCountryId === nextId) &&
                                    r.relationType === 'PERSONAL_UNION',
                                )
                              const connectorPct = toPct(yr.endYear)
                            const periodText = formatPeriod({
                              startEra: h.startEra,
                              startYear: h.startYear,
                              endEra: h.endEra,
                              endYear: h.endYear,
                            })
                            const tooltipText = `${h.name} (${periodText})`
                            return (
                              <React.Fragment key={id}>
                                {isShortDuration ? (
                                  <FlowCardPill
                                    type="button"
                                    $leftPct={leftPct}
                                    $widthPct={widthPct}
                                    title={tooltipText}
                                    onClick={() =>
                                      navigate(
                                        pathKeys.history.countryDetail(h.id),
                                      )
                                    }
                                  >
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: TITLE,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {h.name}
                                    </span>
                                  </FlowCardPill>
                                ) : (
                                  <FlowCard
                                    type="button"
                                    $leftPct={leftPct}
                                    $widthPct={widthPct}
                                    title={tooltipText}
                                    onClick={() =>
                                      navigate(
                                        pathKeys.history.countryDetail(h.id),
                                      )
                                    }
                                  >
                                    {h.thumbnailUrl ? (
                                      <img
                                        src={h.thumbnailUrl}
                                        alt=""
                                        style={{
                                          width: 44,
                                          height: 44,
                                          borderRadius: 10,
                                          objectFit: 'cover',
                                          border: `1px solid ${BORDER}`,
                                          flexShrink: 0,
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: 44,
                                          height: 44,
                                          borderRadius: 10,
                                          background: '#eef2ff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 20,
                                          flexShrink: 0,
                                          border: `1px solid #c7d2fe`,
                                        }}
                                      >
                                        🏴
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        minWidth: 0,
                                        flex: 1,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 700,
                                          color: TITLE,
                                          letterSpacing: '-0.02em',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {h.name}
                                      </div>
                                      {rowIdx === 0 && (() => {
                                        const incoming =
                                          incomingRelationsByMainId.get(id)
                                        if (
                                          !incoming ||
                                          (incoming.successor.length === 0 &&
                                            incoming.personalUnion.length === 0 &&
                                            incoming.membership.length === 0)
                                        )
                                          return null
                                        return (
                                          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {incoming.successor.length > 0 && (
                                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginRight: 2 }}>계승</span>
                                                {incoming.successor.map((bid) => (
                                                  <span
                                                    key={`s-${bid}`}
                                                    title={`계승: ${idToCountry.get(bid)?.name ?? bid}`}
                                                    style={{
                                                      flexShrink: 0,
                                                      fontSize: 10,
                                                      fontWeight: 600,
                                                      color: '#4f46e5',
                                                      background: '#eef2ff',
                                                      padding: '2px 6px',
                                                      borderRadius: 4,
                                                      border: '1px solid #c7d2fe',
                                                    }}
                                                  >
                                                    ← {idToCountry.get(bid)?.name ?? bid}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            {incoming.personalUnion.length > 0 && (
                                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginRight: 2 }}>동군연합</span>
                                                {incoming.personalUnion.map((bid) => (
                                                  <span
                                                    key={`p-${bid}`}
                                                    title={`동군연합: ${idToCountry.get(bid)?.name ?? bid}`}
                                                    style={{
                                                      flexShrink: 0,
                                                      fontSize: 10,
                                                      fontWeight: 600,
                                                      color: '#6366f1',
                                                      background: '#f5f3ff',
                                                      padding: '2px 6px',
                                                      borderRadius: 4,
                                                      border: '1px solid #ddd6fe',
                                                    }}
                                                  >
                                                    {idToCountry.get(bid)?.name ?? bid}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            {incoming.membership.length > 0 && (
                                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginRight: 2 }}>소속·연방</span>
                                                {incoming.membership.map(
                                                  ({ id: bid, role, isLeadingMember }) => (
                                                    <span
                                                      key={`m-${bid}`}
                                                      title={`${MEMBERSHIP_ROLE_LABELS[role as keyof typeof MEMBERSHIP_ROLE_LABELS] ?? role}: ${idToCountry.get(bid)?.name ?? bid}${isLeadingMember ? ' (주축)' : ''}`}
                                                      style={{
                                                        flexShrink: 0,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        color: isLeadingMember ? '#b45309' : '#64748b',
                                                        background: isLeadingMember ? '#fef3c7' : '#f1f5f9',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        border: `1px solid ${isLeadingMember ? '#fcd34d' : '#e2e8f0'}`,
                                                      }}
                                                    >
                                                      {idToCountry.get(bid)?.name ?? bid}
                                                      {isLeadingMember ? ' ·주축' : ''}
                                                    </span>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontSize: 12,
                                          color: MUTED,
                                          fontWeight: 500,
                                        }}
                                      >
                                        {periodText}
                                      </div>
                                      <div style={{ marginTop: 6 }}>
                                        <RelationBadge>
                                          {getStateTypeLabel(
                                            h.stateType as Parameters<
                                              typeof getStateTypeLabel
                                            >[0],
                                          )}
                                        </RelationBadge>
                                      </div>
                                    </div>
                                  </FlowCard>
                                )}
                                {transition && (
                                  <FlowConnector
                                    $leftPct={connectorPct}
                                    title={
                                      TRANSITION_EVENT_LABELS[
                                        transition.eventType as TransitionEventType
                                      ] ?? transition.eventType
                                    }
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#6366f1"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                  </FlowConnector>
                                )}
                                {hasPersonalUnionWithNext && (
                                  <FlowConnector
                                    $leftPct={connectorPct}
                                    title="동군연합"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#6366f1"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                  </FlowConnector>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </FlowRow>
                      )
                    })
                    )}
                  </FlowContent>
                  <FlowBottomAxisWrap>
                    <FlowBottomAxisTrack>
                      <FlowBottomAxisBar />
                      {flowYearRange.labels.map((year) => {
                        const range =
                          flowYearRange.maxYear - flowYearRange.minYear
                        const leftPct =
                          range === 0
                            ? 50
                            : ((year - flowYearRange.minYear) / range) * 100
                        const label =
                          flowYearRange.currentYear != null &&
                          year === flowYearRange.currentYear
                            ? '현재'
                            : year < 0
                              ? `BC ${Math.abs(year)}`
                              : String(year)
                        return (
                          <FlowBottomAxisLabel key={year} $leftPct={leftPct}>
                            {label}
                          </FlowBottomAxisLabel>
                        )
                      })}
                    </FlowBottomAxisTrack>
                  </FlowBottomAxisWrap>
                </FlowScrollInner>
              </FlowContentScroll>
            </div>
          )}
        </section>
      )}
    </motion.div>
  )
}

/** 카드 내 관계 정보 블록 — 변천·수평·소속 모두 표기 */
function FlowCardRelations({
  rels,
  idToCountry,
  currentId,
}: {
  rels: {
    transitions: HistoricalCountryTransitionDto[]
    relations: HistoricalCountryRelationDto[]
    memberships: HistoricalCountryMembershipDto[]
  }
  idToCountry: Map<string, HistoricalCountryItem>
  currentId: string
}) {
  const hasAny =
    rels.transitions.length > 0 ||
    rels.relations.length > 0 ||
    rels.memberships.length > 0
  if (!hasAny) return null

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontSize: 12,
        color: MUTED,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: TITLE,
          fontSize: 11,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        관계 정보
      </div>
      {rels.transitions.length > 0 && (
        <div>
          <span style={{ fontWeight: 600, color: MUTED }}>변천 </span>
          {rels.transitions.map((t) => {
            const isIncoming = t.successorId === currentId
            const otherId = isIncoming ? t.predecessorId : t.successorId
            const otherName =
              idToCountry.get(otherId)?.name ??
              (isIncoming ? t.predecessorName : t.successorName) ??
              '—'
            return (
              <div key={t.id} style={{ marginTop: 2 }}>
                {isIncoming ? '전임' : '계승'} → {otherName}
                <span style={{ marginLeft: 6 }}>
                  (
                  {TRANSITION_EVENT_LABELS[
                    t.eventType as TransitionEventType
                  ] ?? t.eventType}
                  )
                </span>
              </div>
            )
          })}
        </div>
      )}
      {rels.relations.length > 0 && (
        <div>
          <span style={{ fontWeight: 600, color: MUTED }}>수평 관계 </span>
          {rels.relations.map((r) => {
            const otherId =
              r.subjectCountryId === currentId
                ? r.objectCountryId
                : r.subjectCountryId
            const otherName =
              idToCountry.get(otherId)?.name ??
              (r.subjectCountryId === currentId
                ? r.objectCountryName
                : r.subjectCountryName) ??
              '—'
            return (
              <div key={r.id} style={{ marginTop: 2 }}>
                {RELATION_TYPE_LABELS[
                  r.relationType as HistoricalRelationType
                ] ?? r.relationType}
                : {otherName}
              </div>
            )
          })}
        </div>
      )}
      {rels.memberships.length > 0 && (
        <div>
          <span style={{ fontWeight: 600, color: MUTED }}>소속 </span>
          {rels.memberships.map((m) => {
            const isParent = m.historicalCountryId === currentId
            const otherName = isParent ? m.memberName : m.parentName
            const role =
              MEMBERSHIP_ROLE_LABELS[m.role as HistoricalMembershipRole] ??
              m.role
            const roleLabel = m.isLeadingMember ? `${role} · 주축` : role
            return (
              <div key={m.id} style={{ marginTop: 2 }}>
                {isParent
                  ? `하위: ${otherName ?? '—'} (${roleLabel})`
                  : `상위: ${otherName ?? '—'} (${roleLabel})`}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const EmptyCard = styled.div`
  background: #fafafa;
  border: 1px solid ${BORDER};
  border-radius: 16px;
  padding: 56px 48px;
  text-align: center;
  color: ${MUTED};
  font-size: 15px;
  line-height: 1.65;
  font-weight: 500;
`

/** 목록용 국가 카드 — 행정조직 카드와 동일 톤 */
const ModernCountryCard = styled(motion.div)`
  background: #ffffff;
  border: 1px solid ${BORDER};
  border-radius: 16px;
  padding: 28px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
`

function HistoricalCountryCard({
  h,
  idx,
  relations,
  idToCountry,
  onDetail,
}: {
  h: HistoricalCountryItem
  idx: number
  relations: {
    transitions: HistoricalCountryTransitionDto[]
    relations: HistoricalCountryRelationDto[]
    memberships: HistoricalCountryMembershipDto[]
  }
  idToCountry: Map<string, HistoricalCountryItem>
  onDetail: () => void
}) {
  const totalRels =
    relations.transitions.length +
    relations.relations.length +
    relations.memberships.length

  return (
    <ModernCountryCard
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            minWidth: 0,
            flex: 1,
          }}
        >
          {h.thumbnailUrl ? (
            <img
              src={h.thumbnailUrl}
              alt=""
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                objectFit: 'cover',
                border: `1px solid ${BORDER}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
                border: `1px solid #c7d2fe`,
              }}
            >
              🏴
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.03em',
              }}
            >
              {h.name}
            </h3>
            {h.enName && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 14,
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                {h.enName}
              </p>
            )}
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#4f46e5',
                  background: '#eef2ff',
                  padding: '4px 10px',
                  borderRadius: 8,
                }}
              >
                {getStateTypeLabel(
                  h.stateType as Parameters<typeof getStateTypeLabel>[0],
                )}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                {formatPeriod({
                  startEra: h.startEra,
                  startYear: h.startYear,
                  endEra: h.endEra,
                  endYear: h.endYear,
                })}
              </span>
            </div>
            {totalRels > 0 && (
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {relations.transitions.length > 0 && (
                  <RelationBadge>
                    변천 {relations.transitions.length}
                  </RelationBadge>
                )}
                {relations.relations.length > 0 && (
                  <RelationBadge>
                    관계 {relations.relations.length}
                  </RelationBadge>
                )}
                {relations.memberships.length > 0 && (
                  <RelationBadge>
                    소속 {relations.memberships.length}
                  </RelationBadge>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDetail}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 12,
            border: `1px solid ${BORDER}`,
            background: '#fff',
            color: '#4f46e5',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#eef2ff'
            e.currentTarget.style.borderColor = '#c7d2fe'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff'
            e.currentTarget.style.borderColor = BORDER
          }}
        >
          상세 보기
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </ModernCountryCard>
  )
}
