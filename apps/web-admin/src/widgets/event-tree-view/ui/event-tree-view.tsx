/**
 * Event Tree View — 모든 root 사건의 hierarchy를 트리 형태로 한 화면에.
 *
 * - 각 root 사건은 카드 헤더, 하위 노드는 들여쓰기로 시각화.
 * - 깊이 표시: 좌측 vertical guide line + indent.
 * - 시간 정렬은 부모(events.page)의 sortDirection을 따름. 트리 자체는 hierarchy 순서 유지.
 * - 기본 펼침 정책: depth 0~1만 자동 펼침, 그 이상은 클릭으로 확장.
 */
import React, { useMemo, useState } from 'react'

import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CategoryDot as SharedCategoryDot } from '@/shared/ui/category-dot/category-dot'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { ImportancePill } from '@/shared/ui/importance-pill/importance-pill'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { BRAND } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** 모든 클릭 컨트롤 공통 포커스 링 — theme.ts의 '모든 컨트롤 동일' 규약 준수 */
const focusVisible = `
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

/**
 * 연도 라벨 — 네이티브 Date 금지(BC·연도<100을 Invalid Date/오년도로 만듦).
 * ISO 구성요소 파싱으로 부호 연도 안전 처리. BC는 '기원전 N', 미상은 '—'.
 */
const formatYear = (start: string): string => {
  const parts = parseIsoDateParts(start)
  if (!parts) return '—'
  return parts.year < 0 ? `기원전 ${Math.abs(parts.year)}` : `${parts.year}`
}

interface Props {
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
}

export const EventTreeView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  onSelectEvent,
}) => {
  /** 현재 표시 대상 root 사건만 추출 (visibleFlattenedHierarchy의 depth 0) */
  const rootEvents = useMemo(() => {
    const eventById = new Map<string, HistoricalEvent>()
    for (const e of events) eventById.set(e.id, e)

    const seen = new Set<string>()
    const out: HistoricalEvent[] = []
    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      if (seen.has(item.node.id)) continue
      seen.add(item.node.id)
      const evt = eventById.get(item.node.id)
      if (evt) out.push(evt)
    }
    return out
  }, [flattenedHierarchy, events])

  /** 모든 노드 id 수집 — 전체 펼침 시 사용 */
  const allNodeIds = useMemo(() => {
    const ids: string[] = []
    const visit = (n: EventHierarchyNode) => {
      ids.push(n.id)
      if (n.children) for (const c of n.children) visit(c)
    }
    for (const evt of rootEvents) visit(evt.hierarchy)
    return ids
  }, [rootEvents])

  /** 깊은 자식들 수동 펼침 — depth 1까지는 자동 펼침, expanded set이 추가 펼침 제어 */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  /** 강제 접기 모드 — 사용자가 "모두 접기"를 누르면 depth 1 자동 펼침도 무시 */
  const [collapseAll, setCollapseAll] = useState(false)

  const toggle = (id: string) => {
    // 사용자가 한 번이라도 토글하면 강제 접기 해제 (정상 manual 모드로)
    if (collapseAll) setCollapseAll(false)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    setCollapseAll(false)
    setExpanded(new Set(allNodeIds))
  }
  const collapseAllNodes = () => {
    setCollapseAll(true)
    setExpanded(new Set())
  }

  if (rootEvents.length === 0) {
    return (
      <EmptyStateSpotlight
        icon={<FiChevronDown size={28} />}
        title="표시할 사건이 없습니다"
        description="필터를 풀거나 사건을 등록해보세요."
      />
    )
  }

  return (
    <Host>
      <Toolbar>
        <ToolbarStat>
          <strong>{rootEvents.length.toLocaleString()}</strong>개 root ·{' '}
          {allNodeIds.length.toLocaleString()}개 노드
        </ToolbarStat>
        <ToolbarActions>
          <ToolbarBtn type="button" onClick={expandAll}>
            모두 펼치기
          </ToolbarBtn>
          <ToolbarBtn type="button" onClick={collapseAllNodes}>
            모두 접기
          </ToolbarBtn>
        </ToolbarActions>
      </Toolbar>
      {rootEvents.map((evt) => {
        const root = evt.hierarchy
        const totalNodes = countAllNodes(root)
        const startYear = formatYear(root.period.start)
        return (
          <RootCard key={evt.id} $active={selectedEventId === root.id}>
            <RootHeader
              type="button"
              onClick={() => onSelectEvent(root.id)}
              $active={selectedEventId === root.id}
              aria-current={selectedEventId === root.id ? 'true' : undefined}
              data-event-id={root.id}
            >
              <RootYear>{startYear}</RootYear>
              <SharedCategoryDot category={evt.category} size={8} />
              <RootTitle>{root.title}</RootTitle>
              <CountryFlags
                modern={evt.relatedCountries}
                historical={evt.relatedHistoricalCountries}
                max={2}
                size="md"
              />
              <RootMeta>
                <CategoryLabel>
                  {getCategoryName(evt.category, dbCategories)}
                </CategoryLabel>
                {totalNodes > 1 && (
                  <NodeCount>{totalNodes}개 노드</NodeCount>
                )}
              </RootMeta>
            </RootHeader>
            {root.children && root.children.length > 0 && (
              <ChildrenWrap>
                {root.children.map((c) => (
                  <TreeNode
                    key={c.id}
                    node={c}
                    depth={1}
                    expanded={expanded}
                    collapseAll={collapseAll}
                    selectedId={selectedEventId}
                    onToggle={toggle}
                    onSelect={onSelectEvent}
                  />
                ))}
              </ChildrenWrap>
            )}
          </RootCard>
        )
      })}
    </Host>
  )
}

const TreeNode: React.FC<{
  node: EventHierarchyNode
  depth: number
  expanded: Set<string>
  /** 강제 접기 모드 — true면 depth 1 자동 펼침도 무시. 사용자 manual 토글로 해제됨. */
  collapseAll: boolean
  selectedId: string | null
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}> = ({
  node,
  depth,
  expanded,
  collapseAll,
  selectedId,
  onToggle,
  onSelect,
}) => {
  const hasChildren = !!(node.children && node.children.length > 0)
  // 강제 접기 모드: 사용자가 토글한 것만 펼침
  // 정상 모드: depth 1까지 자동 펼침 + expanded set
  const isOpen = collapseAll
    ? expanded.has(node.id)
    : depth <= 1 || expanded.has(node.id)
  const startYear = formatYear(node.period.start)

  return (
    <NodeWrap $depth={depth}>
      <NodeRow
        role="button"
        tabIndex={0}
        $active={selectedId === node.id}
        aria-current={selectedId === node.id ? 'true' : undefined}
        aria-label={node.title}
        data-event-id={node.id}
        onClick={() => onSelect(node.id)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault()
            onSelect(node.id)
          }
        }}
      >
        {hasChildren ? (
          <ToggleBtn
            type="button"
            aria-label={isOpen ? '접기' : '펼치기'}
            aria-expanded={isOpen}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.id)
            }}
          >
            {isOpen ? (
              <FiChevronDown size={11} />
            ) : (
              <FiChevronRight size={11} />
            )}
          </ToggleBtn>
        ) : (
          <ToggleSpacer />
        )}
        <NodeYear>{startYear}</NodeYear>
        <ImportancePill tier={node.importance} size="sm" />
        <NodeTitle>{node.title}</NodeTitle>
        {node.summary && <NodeSummary>{node.summary}</NodeSummary>}
      </NodeRow>
      {hasChildren && isOpen && (
        <NodeChildren>
          {node.children!.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              collapseAll={collapseAll}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </NodeChildren>
      )}
    </NodeWrap>
  )
}

const countAllNodes = (n: EventHierarchyNode): number => {
  let c = 1
  if (n.children) for (const ch of n.children) c += countAllNodes(ch)
  return c
}

// ─────────────────────────────────────────────────────────────────────────────

const Host = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 4px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 4px 2px;
  flex-wrap: wrap;
`

const ToolbarStat = styled.div`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const ToolbarActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const ToolbarBtn = styled.button`
  padding: 4px 10px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${focusVisible}
`

const RootCard = styled.div<{ $active: boolean }>`
  border-radius: 12px;
  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? `background: rgba(255,255,255,0.025);
         border: 1px solid ${$active ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.06)'};`
      : `background: #fff;
         border: 1px solid ${$active ? 'rgba(37,99,235,0.4)' : 'rgba(15,23,42,0.06)'};`}
  overflow: hidden;
`

const RootHeader = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.12)'
        : 'rgba(37,99,235,0.06)'
      : 'transparent'};
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.025)'};
  }
  ${focusVisible}
`

const RootYear = styled.span`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  flex-shrink: 0;
  min-width: 48px;
`


const RootTitle = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RootMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const CategoryLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NodeCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 6px;
  border-radius: 999px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#1e40af')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.1)'};
`

const ChildrenWrap = styled.div`
  padding: 6px 14px 12px;
`

const NodeWrap = styled.div<{ $depth: number }>`
  position: relative;
  margin-left: ${({ $depth }) => ($depth - 1) * 18}px;
`

// 노드 행은 클릭 가능하지만 내부에 실제 <button>(ToggleBtn)을 담으므로 <button>이 아닌
// role="button" <div>로 둔다(<button> 안 <button> DOM 중첩 오류 회피). 키보드는 onKeyDown.
const NodeRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px 6px 0;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.14)'
        : 'rgba(37,99,235,0.06)'
      : 'transparent'};
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }
  ${focusVisible}
`

const ToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 0;
  border-radius: 4px;

  &:hover {
    background: rgba(37, 99, 235, 0.16);
    color: #2563eb;
  }
  ${focusVisible}
`

const ToggleSpacer = styled.span`
  width: 16px;
  flex-shrink: 0;
`

const NodeYear = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  min-width: 36px;
`

const NodeTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  flex-shrink: 0;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NodeSummary = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NodeChildren = styled.div`
  margin-top: 2px;
  border-left: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'};
  padding-left: 12px;
  margin-left: 8px;
`

