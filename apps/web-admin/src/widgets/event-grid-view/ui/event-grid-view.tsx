/**
 * Event Grid View — 연대(decade) 카드 격자.
 *
 * 사건을 시작연도 기준 10년 단위로 그룹핑하고, 각 셀을 카드로 표현.
 * 카드는 *시간 단위 그 자체*를 1차 단위로 두며, 사건 수·카테고리 분포(mini bar)·Top3 제목 미리보기.
 *
 * 사용처:
 *   - 사건 N건이 *어디에 몰려 있는지* 거시 진입점
 *   - 클릭 → 그 연대 첫 사건 선택 (drawer 열림 + 다른 모드에서도 컨텍스트)
 *
 * 인터랙션:
 *   - 카드 클릭 → 첫 사건 선택
 *   - 카드 안 사건 제목 클릭 → 그 사건 선택
 */
import React, { useMemo } from 'react'

import { FiGrid } from 'react-icons/fi'
import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'
import { EmptyStateSpotlight } from '@/shared/ui/empty-state/empty-state'
import { ImportancePill } from '@/shared/ui/importance-pill/importance-pill'
import { getDecade, parseIsoDateParts } from '@/shared/lib/iso-date'

import { BRAND, CATEGORY_BADGE_COLORS } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

interface Props {
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
}

interface DecadeCell {
  decade: number
  count: number
  byCategory: Map<string, number>
  top3: Array<{
    id: string
    title: string
    importance: string
    /** root event 참조 — 국가 chip 표시용 */
    event: HistoricalEvent
  }>
}

const TOP_N = 3

export const EventGridView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  onSelectEvent,
}) => {
  /** 전체 events 기준 decade별 사건 수 — heat 정규화의 *글로벌 max* 산정에 사용.
   * 필터 결과만으로 정규화하면 작은 절대값도 100% heat로 보여 시각 왜곡. */
  const globalMaxByDecade = useMemo(() => {
    const m = new Map<number, number>()
    for (const e of events) {
      const p = parseIsoDateParts(e.startDate)
      if (!p) continue
      const d = getDecade(p.year)
      m.set(d, (m.get(d) ?? 0) + 1)
    }
    let max = 0
    for (const v of m.values()) if (v > max) max = v
    return max
  }, [events])

  const cells = useMemo<DecadeCell[]>(() => {
    const eventById = new Map<string, HistoricalEvent>()
    for (const e of events) eventById.set(e.id, e)

    const groups = new Map<number, DecadeCell>()
    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      const evt = eventById.get(item.node.id)
      if (!evt) continue
      const p = parseIsoDateParts(item.node.period.start)
      if (!p) continue
      const decade = getDecade(p.year)
      let cell = groups.get(decade)
      if (!cell) {
        cell = {
          decade,
          count: 0,
          byCategory: new Map(),
          top3: [],
        }
        groups.set(decade, cell)
      }
      cell.count += 1
      const cat = evt.category || 'other'
      cell.byCategory.set(cat, (cell.byCategory.get(cat) ?? 0) + 1)
      // top3 — critical/major 우선, 그 안에서 처음 들어온 것부터
      if (cell.top3.length < TOP_N || item.node.importance === 'critical') {
        cell.top3.push({
          id: item.node.id,
          title: item.node.title,
          importance: item.node.importance,
          event: evt,
        })
        cell.top3.sort((a, b) => {
          const ord: Record<string, number> = {
            critical: 0,
            major: 1,
            notable: 2,
          }
          return (ord[a.importance] ?? 3) - (ord[b.importance] ?? 3)
        })
        if (cell.top3.length > TOP_N) cell.top3 = cell.top3.slice(0, TOP_N)
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.decade - b.decade)
  }, [flattenedHierarchy, events])

  /** heat 정규화에 글로벌 max 사용 — 필터 좁힘 영향 없음 */
  const maxCount = globalMaxByDecade || 1

  if (cells.length === 0) {
    return (
      <EmptyStateSpotlight
        icon={<FiGrid size={28} />}
        title="표시할 연대가 없습니다"
        description="필터를 조정하거나 사건을 등록해보세요."
      />
    )
  }

  return (
    <Host>
      <Grid>
        {cells.map((cell) => {
          const sortedCats = Array.from(cell.byCategory.entries()).sort(
            (a, b) => b[1] - a[1],
          )
          const heatRatio = maxCount > 0 ? cell.count / maxCount : 0
          return (
            <Card
              key={cell.decade}
              type="button"
              onClick={() => {
                if (cell.top3[0]) onSelectEvent(cell.top3[0].id)
              }}
              $heat={heatRatio}
            >
              <CardHeader>
                <DecadeLabel>
                  {cell.decade}
                  <span>년대</span>
                </DecadeLabel>
                <CountBadge>{cell.count}</CountBadge>
              </CardHeader>

              <CategoryBar>
                {sortedCats.map(([cat, n]) => {
                  const color =
                    CATEGORY_BADGE_COLORS[
                      cat as keyof typeof CATEGORY_BADGE_COLORS
                    ] ?? '#94a3b8'
                  const ratio = n / cell.count
                  return (
                    <CategorySegment
                      key={cat}
                      style={{
                        flexBasis: `${ratio * 100}%`,
                        background: color,
                      }}
                      title={`${getCategoryName(cat, dbCategories)} ${n}건`}
                      aria-label={`${getCategoryName(cat, dbCategories)} ${n}건`}
                    />
                  )
                })}
              </CategoryBar>

              <Top3List>
                {cell.top3.map((t) => (
                  <Top3Row
                    key={t.id}
                    type="button"
                    $active={selectedEventId === t.id}
                    aria-current={selectedEventId === t.id ? 'true' : undefined}
                    data-event-id={t.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEvent(t.id)
                    }}
                  >
                    <ImportancePill
                      tier={t.importance as 'critical' | 'major' | 'notable'}
                      size="sm"
                    />
                    <Top3Title>{t.title}</Top3Title>
                    <CountryFlags
                      modern={t.event.relatedCountries}
                      historical={t.event.relatedHistoricalCountries}
                      max={2}
                      size="sm"
                    />
                  </Top3Row>
                ))}
                {cell.count > TOP_N && (
                  <MoreHint>+ {cell.count - TOP_N}건</MoreHint>
                )}
              </Top3List>
            </Card>
          )
        })}
      </Grid>
    </Host>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const Host = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 4px 80px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

/* heat ratio (0..1) → border 강도와 살짝의 배경 tint로 *밀도 시각화*.
 * 카드 자체는 평면 톤. ledger polish 정책 유지. */
const Card = styled.button<{ $heat: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 12px;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  ${({ theme, $heat }) => {
    const tint = theme.mode === 'dark' ? 0.05 + $heat * 0.06 : 0.02 + $heat * 0.04
    const border = theme.mode === 'dark' ? 0.08 + $heat * 0.12 : 0.06 + $heat * 0.12
    return `
      background: rgba(37, 99, 235, ${tint});
      border: 1px solid rgba(37, 99, 235, ${border});
      color: ${theme.colors.text.primary};
    `
  }}
  transition: transform 0.15s, border-color 0.15s, background 0.15s;

  &:hover {
    border-color: rgba(37, 99, 235, 0.4);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const DecadeLabel = styled.div`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: baseline;
  gap: 3px;

  span {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#1e40af')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.1)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(37,99,235,0.32)' : 'rgba(37,99,235,0.22)'};
`

/* 카테고리 분포 — 가로 stacked bar. 각 segment가 % 비율. */
const CategoryBar = styled.div`
  display: flex;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

const CategorySegment = styled.div`
  height: 100%;
  &:not(:last-child) {
    margin-right: 1px;
  }
`

const Top3List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Top3Row = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.16)'
        : 'rgba(37,99,235,0.08)'
      : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
  min-width: 0;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }
`

const Top3Title = styled.span`
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MoreHint = styled.div`
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`


