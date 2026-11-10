/**
 * 전개 '시간순' — 묶음 사건의 하위 전부(잎)를 계층을 풀고 한 줄기의 시간 순서로, 상위 국면으로 나눠 읽는다.
 *
 * 기본 전개는 계층이 먼저다. 직계가 기간 전체를 덮는 묶음(전쟁 › 전선)이면 국면이 직계에만 날짜로 배정돼
 * 모든 전선이 1·2국면에 들어가고 '전환점'·'반격과 종전' 장은 비었다(인포그래픽 검토 §4·10). 여기서는
 * **잎 사건마다 자기 날짜로** 상위 국면에 놓는다 — 스탈린그라드·노르망디가 제 장에 선다.
 * 행마다 어느 묶음 소속인지('서부·북유럽 전선 › 노르망디 상륙 작전')를 묶음 색과 함께 꼬리로 단다.
 * 또한 각 전투 행에 진영 승패·참전 부대·핵심 피해·장소 인라인 전황 배지를 달고, 부대(집단군/전선군)별 축선 필터를 제공한다.
 */
import { useMemo, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { ledgerBackground } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { groupColor } from '@/pages/events/overview/overview.styles'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { formatSpanLabel } from './development-timeline.lib'
import { type BattleRowSummary, type TreeNode, summarizeBattleRow } from './development-tree.lib'
import { type EventPhase, phaseRangeLabel, phaseReach } from './event-phase.lib'
import { compareEventStart } from './detail-network.lib'

interface FlowRow {
  node: TreeNode
  /** 직계 조상 이름 — 직계 묶음부터 바로 위까지 */
  path: string[]
  /** 직계 묶음 순번(색) — 직계 개별 사건이면 null */
  groupIndex: number | null
  year: number | null
  summary: BattleRowSummary
}

interface FlowSection {
  key: string
  label: string
  meta: string | null
  rows: FlowRow[]
}

export function ChronologicalFlow({
  tree,
  chapters,
  onOpen,
}: {
  tree: ReadonlyArray<TreeNode>
  /** 이 사건(상위)의 국면 — 없으면 해 단위로만 나눈다 */
  chapters: ReadonlyArray<EventPhase>
  onOpen: (id: string) => void
}) {
  const theme = useTheme()
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)

  const { allRows, unitCounts } = useMemo(() => {
    const rows: FlowRow[] = []
    const counts = new Map<string, number>()
    let collectionIndex = 0
    for (const top of tree) {
      const groupIndex = top.children.length > 0 ? collectionIndex++ : null
      const walk = (node: TreeNode, path: string[]) => {
        if (node.children.length === 0) {
          const summary = summarizeBattleRow(node)
          for (const unitName of summary.unitNames) {
            counts.set(unitName, (counts.get(unitName) ?? 0) + 1)
          }
          rows.push({
            node,
            path,
            groupIndex,
            year: parseIsoDateParts(node.startDate)?.year ?? null,
            summary,
          })
          return
        }
        for (const child of node.children) walk(child, [...path, node.title])
      }
      walk(top, [])
    }
    rows.sort((left, right) => compareEventStart(left.node.startDate, right.node.startDate))
    const sortedUnits = [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 12)
    return { allRows: rows, unitCounts: sortedUnits }
  }, [tree])

  const sections = useMemo<FlowSection[]>(() => {
    const filteredRows = selectedUnit
      ? allRows.filter((row) => row.summary.unitNames.includes(selectedUnit))
      : allRows

    const ordered = [...chapters].sort((left, right) => left.order - right.order)
    if (ordered.length === 0) {
      return [{ key: 'all', label: '전체', meta: null, rows: filteredRows }]
    }
    const buckets = new Map<string, FlowSection>()
    const sectionOf = (row: FlowRow): FlowSection => {
      const reach = phaseReach(ordered, {
        id: row.node.id,
        /* 손 지정 국면은 직계의 것이라 잎에는 쓰지 않는다 — 자기 날짜로만 */
        phaseId: null,
        startDate: row.node.startDate ?? null,
        startDatePrecision: row.node.startDatePrecision ?? null,
        endDate: row.node.endDate ?? null,
        endDatePrecision: row.node.endDatePrecision ?? null,
      })
      const key = reach.from != null ? `p${reach.from}` : `o:${reach.outside ?? 'none'}`
      const existing = buckets.get(key)
      if (existing) return existing
      const phase = reach.from != null ? ordered[reach.from - 1] : null
      const section: FlowSection = {
        key,
        label: phase
          ? `${reach.from}국면 · ${phase.title}`
          : reach.outside === 'before'
            ? '국면 전'
            : reach.outside === 'after'
              ? '국면 뒤'
              : '날짜 미상',
        meta: phase ? phaseRangeLabel(phase) || null : null,
        rows: [],
      }
      buckets.set(key, section)
      return section
    }
    for (const row of filteredRows) sectionOf(row).rows.push(row)
    const order = (key: string) =>
      key === 'o:before' ? -1 : key.startsWith('p') ? Number(key.slice(1)) : key === 'o:after' ? 1e6 : 2e6
    return [...buckets.values()].sort((left, right) => order(left.key) - order(right.key))
  }, [allRows, chapters, selectedUnit])

  const neutral = theme.mode === 'dark' ? '#71717a' : '#a1a1aa'

  return (
    <Flow>
      {unitCounts.length > 0 && (
        <FilterBar role="group" aria-label="참전 부대·기동 축선 필터">
          <FilterLabel>부대·축선</FilterLabel>
          <FilterChip
            type="button"
            $active={selectedUnit === null}
            onClick={() => setSelectedUnit(null)}
          >
            전체 ({allRows.length})
          </FilterChip>
          {unitCounts.map(([unitName, count]) => (
            <FilterChip
              key={unitName}
              type="button"
              $active={selectedUnit === unitName}
              onClick={() => setSelectedUnit((prev) => (prev === unitName ? null : unitName))}
            >
              ⚔️ {unitName} ({count})
            </FilterChip>
          ))}
        </FilterBar>
      )}

      {sections.map((section) => (
        <Section key={section.key} aria-label={section.label}>
          <SectionHead>
            <b>{section.label}</b>
            {section.meta && <span>{section.meta}</span>}
            <span>{section.rows.length}건</span>
          </SectionHead>
          <Rows>
            {section.rows.map((row) => {
              const color = row.groupIndex != null ? groupColor(row.groupIndex, theme.mode) : neutral
              const { outcomeBadge, unitSummary, metricSummary, locationLabel } = row.summary
              const hasBattleChips = Boolean(outcomeBadge || unitSummary || metricSummary || locationLabel)
              return (
                <Row key={row.node.id}>
                  <Dot style={{ background: color }} aria-hidden="true" />
                  <When>{formatSpanLabel(row.node)}</When>
                  <RowBody>
                    <TitleLine>
                      <Title type="button" onClick={() => onOpen(row.node.id)} title="미리보기">
                        {row.node.title}
                      </Title>
                      {row.path.length > 0 && (
                        <Path style={{ color }} title={row.path.join(' › ')}>
                          {row.path.join(' › ')}
                        </Path>
                      )}
                    </TitleLine>
                    {hasBattleChips && (
                      <BattleStrip>
                        {outcomeBadge && (
                          <OutcomeChip $color={outcomeBadge.color}>
                            🏆 {outcomeBadge.label}
                          </OutcomeChip>
                        )}
                        {unitSummary && <UnitChip>⚔️ {unitSummary}</UnitChip>}
                        {metricSummary && <MetricChip>📉 {metricSummary}</MetricChip>}
                        {locationLabel && <LocationChip>📍 {locationLabel}</LocationChip>}
                      </BattleStrip>
                    )}
                  </RowBody>
                </Row>
              )
            })}
          </Rows>
        </Section>
      ))}
    </Flow>
  )
}

/* ── styled ── */

const Flow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)')};
`

const FilterLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${metaText};
  margin-right: 4px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? '#818cf8'
          : '#4f46e5'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(15,23,42,0.12)'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(129,140,248,0.18)'
        : 'rgba(79,70,229,0.10)'
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca') : theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: ${metaText};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.10)' : 'rgba(79,70,229,0.06)')};

  b {
    font-size: 15px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Rows = styled.ol`
  margin: 0 0 0 10px;
  padding: 4px 0 4px 20px;
  list-style: none;
  border-left: 2px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.28)' : 'rgba(79,70,229,0.22)')};
`

const Row = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  column-gap: 14px;
  align-items: baseline;
  padding: 6px 0;

  @media (max-width: 640px) {
    grid-template-columns: 84px minmax(0, 1fr);
    column-gap: 10px;
  }
`

const Dot = styled.span`
  position: absolute;
  left: -25px;
  top: 11px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px ${ledgerBackground};
`

const When = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const TitleLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 0;
`

const Title = styled.button`
  align-self: flex-start;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const Path = styled.span`
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BattleStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
`

const OutcomeChip = styled.span<{ $color: string | null }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $color }) => $color ?? (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
  background: ${({ theme, $color }) =>
    $color ? `${$color}1c` : theme.mode === 'dark' ? 'rgba(251,191,36,0.14)' : 'rgba(245,158,11,0.12)'};
`

const UnitChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
`

const MetricChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)')};
`

const LocationChip = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  color: ${metaText};
`
