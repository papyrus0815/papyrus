/**
 * VIEW: 국가 × 연도 매트릭스.
 * 가로 = 생몰 연도, 색 = 시대. 국가별로 lane 패킹.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import type { AdaptedPerson } from '../model/types'
import { bornForPlot, diedForPlot } from '../model/adapt'
import { formatYear } from '../model/century'
import { ERAS, INFOGRAPHIC_DEFAULTS } from '../model/constants'
import {
  usePersonInfographicFilterStore,
  useHasActiveFilter,
} from '../model/filter.store'
import { hasAnyActiveScope, isPersonInScopes } from '../model/sort-helpers'

import { EmptyState } from './_shared/empty-state'
import { PersonHoverTooltip } from './_shared/tooltip'
import { PersonPreviewModal } from './_shared/person-preview-modal'
import {
  ViewLegend,
  ViewLegendItem,
  ViewPanel,
  ViewPanelDesc,
  ViewPanelHeader,
  ViewPanelTitle,
  scrollbarThinMixin,
} from './_shared/view-panel'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
}

const LABEL_MIN_GAP_PX = 6
const LABEL_CHAR_PX = 7
const LANE_H = 18
const GAP_PX = 2
const BAR_H = LANE_H - 4
const BAR_TOP_OFFSET = (LANE_H - BAR_H) / 2

export function MatrixView({ people, onOpen }: Props) {
  const theme = useTheme()
  const [hover, setHover] = useState<{
    p: AdaptedPerson
    x: number
    y: number
  } | null>(null)
  const [hoveredBar, setHoveredBar] = useState<{
    country: string
    lane: number
    id: string
  } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewPerson, setPreviewPerson] = useState<AdaptedPerson | null>(null)
  const [showAll, setShowAll] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [W, setW] = useState(1100)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setW(Math.max(480, w - 130 - 24))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const clearAllScopes = usePersonInfographicFilterStore(
    (s) => s.clearAllScopes,
  )
  const resetFilters = usePersonInfographicFilterStore((s) => s.resetFilters)
  // 막대 강조는 scope 한정. 빈 결과 CTA는 전체 필터 기준.
  const hasActiveFilter = hasAnyActiveScope(scopes)
  const hasAnyFilter = useHasActiveFilter()

  // 안정 참조 — hover(setHover)로 인한 리렌더마다 새로 만들면
  // memo(MatrixLaneLabels)의 O(n²) 라벨 충돌 계산이 매 프레임 재실행됨.
  const isActive = useCallback(
    (person: AdaptedPerson) =>
      !hasActiveFilter || isPersonInScopes(person, scopes),
    [hasActiveFilter, scopes],
  )

  // 국가별 lane 패킹 — people·showAll·W 변할 때만 재계산
  const grouped = useMemo(() => {
    const byCountry: Record<string, AdaptedPerson[]> = {}
    for (const p of people) {
      ;(byCountry[p.country] = byCountry[p.country] || []).push(p)
    }
    const all = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length)
    const visible = showAll
      ? all
      : all.slice(0, INFOGRAPHIC_DEFAULTS.MATRIX_COUNTRY_TOP_N)
    let minY = Infinity
    let maxY = -Infinity
    for (const p of people) {
      const bornY = bornForPlot(p)
      const diedY = diedForPlot(p)
      if (bornY < minY) minY = bornY
      if (diedY > maxY) maxY = diedY
    }
    const rng = Math.max(1, maxY - minY)
    const yearX = (y: number) => ((y - minY) / rng) * W

    const packed = visible.map(([c, arr]) => {
      const sorted = [...arr].sort((a, b) => bornForPlot(a) - bornForPlot(b))
      const lanes: number[] = []
      const placed = sorted.map((p) => {
        const x1 = yearX(bornForPlot(p))
        const x2 = Math.max(x1 + 3, yearX(diedForPlot(p)))
        let lane = lanes.findIndex((rightX) => rightX + GAP_PX <= x1)
        if (lane === -1) {
          lanes.push(x2)
          lane = lanes.length - 1
        } else lanes[lane] = x2
        return { p, x1, x2, lane }
      })
      const laneCount = Math.max(1, lanes.length)
      return {
        country: c,
        count: arr.length,
        placed,
        rowH: laneCount * LANE_H + 4,
      }
    })
    const totalRowH = packed.reduce((s, r) => s + r.rowH, 0)

    const startDec = Math.ceil(minY / 50) * 50
    const ticks: number[] = []
    for (let y = startDec; y <= maxY; y += 50) ticks.push(y)
    return {
      all,
      visible,
      packed,
      totalRowH,
      minY,
      maxY,
      yearX,
      ticks,
      hiddenCount: all.length - visible.length,
    }
  }, [people, showAll, W])

  if (!grouped.all.length) {
    return (
      <EmptyState
        hasActiveFilter={hasAnyFilter}
        onClearFilters={resetFilters}
        description="국가·시대·분야·영향력 필터를 확인해보세요."
      />
    )
  }

  const { packed, totalRowH, minY, maxY, yearX, ticks, hiddenCount } = grouped

  const gridLine = theme.colors.border.light
  const tickLine = theme.colors.border.default

  return (
    <ViewPanel>
      <ViewPanelHeader>
        <ViewPanelTitle>국가 × 연도 매트릭스</ViewPanelTitle>
        <ViewPanelDesc>가로 = 생몰 · 색 = 시대</ViewPanelDesc>
        {minInfluence > 0 && (
          <FilterBadge>영향력 ≥ {minInfluence}</FilterBadge>
        )}
        <ViewLegend>
          {ERAS.map((e) => (
            <ViewLegendItem
              key={e.key}
              $active={scopes.era.includes(e.key)}
              $color={e.color}
            >
              <span style={{ background: e.color }} />
              {e.lbl}
            </ViewLegendItem>
          ))}
        </ViewLegend>
      </ViewPanelHeader>
      <div ref={containerRef}>
        <Scroll>
          <div style={{ display: 'grid', gridTemplateColumns: `130px ${W}px` }}>
            <Labels>
              <AxisRow>
                <AxisTxt>국가 / 인물수</AxisTxt>
              </AxisRow>
              {packed.map(({ country: c, count, rowH }) => {
                const labelActive =
                  !hasActiveFilter ||
                  scopes.country.length === 0 ||
                  scopes.country.includes(c)
                const isHoveredCountry = hoveredBar?.country === c
                return (
                  <LabelRow
                    key={c}
                    style={{
                      height: rowH,
                      opacity: labelActive ? 1 : 0.4,
                      background: isHoveredCountry
                        ? theme.colors.activeLight
                        : 'transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: isHoveredCountry ? 700 : 400,
                        color: isHoveredCountry
                          ? theme.colors.active
                          : theme.colors.text.primary,
                      }}
                    >
                      {c}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: theme.colors.text.tertiary,
                      }}
                    >
                      {count}
                    </span>
                  </LabelRow>
                )
              })}
            </Labels>
            <div style={{ position: 'relative' }}>
              <svg
                width={W}
                height={30 + totalRowH}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                }}
              >
                {ERAS.map((e) => {
                  const x1 = Math.max(0, yearX(Math.max(e.from, minY)))
                  const x2 = Math.min(W, yearX(Math.min(e.to, maxY)))
                  if (x2 <= x1) return null
                  const isEraActive = scopes.era.includes(e.key)
                  const op =
                    scopes.era.length > 0
                      ? isEraActive
                        ? 0.12
                        : 0.02
                      : 0.05
                  return (
                    <rect
                      key={e.key}
                      x={x1}
                      y={0}
                      width={x2 - x1}
                      height={30 + totalRowH}
                      fill={e.color}
                      opacity={op}
                    />
                  )
                })}
                {ticks.map((y) => (
                  <line
                    key={y}
                    x1={yearX(y)}
                    y1={30}
                    x2={yearX(y)}
                    y2={30 + totalRowH}
                    stroke={tickLine}
                    strokeWidth={0.5}
                    strokeDasharray="2 5"
                  />
                ))}
              </svg>
              <div style={{ height: 30, position: 'relative' }}>
                {ticks
                  .filter((_, i) => i % 2 === 0)
                  .map((y) => (
                    <div
                      key={y}
                      style={{
                        position: 'absolute',
                        left: yearX(y),
                        top: 0,
                        fontSize: 9,
                        color: theme.colors.text.tertiary,
                        transform: 'translateX(-50%)',
                        paddingTop: 8,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {y < 0 ? `${-y}BC` : y}
                    </div>
                  ))}
              </div>
              {packed.map(({ country: c, placed, rowH }) => (
                <div
                  key={c}
                  style={{
                    height: rowH,
                    position: 'relative',
                    borderTop: `1px solid ${gridLine}`,
                  }}
                >
                  {placed.map(({ p, x1, x2, lane }) => {
                    const yy = lane * LANE_H + BAR_TOP_OFFSET
                    const era = p.era
                    const active = isActive(p)
                    const isHoveredLane =
                      hoveredBar?.country === c && hoveredBar?.lane === lane
                    const isHoveredSelf = hoveredBar?.id === p.id
                    const isOtherInLane = isHoveredLane && !isHoveredSelf
                    const isSelected = selectedId === p.id
                    const baseOp = active ? 0.85 : 0.2
                    const op = isOtherInLane ? Math.min(baseOp, 0.25) : baseOp
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={`${p.name} ${
                          p.born == null ? '?' : formatYear(p.born)
                        }–${p.died == null ? '?' : formatYear(p.died)}`}
                        onClick={() => {
                          setSelectedId(p.id)
                          setPreviewPerson(p)
                          setHover(null)
                        }}
                        onDoubleClick={() => {
                          setSelectedId(p.id)
                          setPreviewPerson(null)
                          onOpen(p.id)
                        }}
                        style={{
                          position: 'absolute',
                          left: x1,
                          top: yy,
                          width: Math.max(3, x2 - x1),
                          height: BAR_H,
                          background: era.color,
                          borderRadius: 2,
                          cursor: 'pointer',
                          opacity: isHoveredSelf ? 1 : op,
                          border: 'none',
                          padding: 0,
                          transition: 'opacity 0.12s, box-shadow 0.12s',
                          boxShadow: isSelected
                            ? `0 0 0 2px ${theme.colors.background.primary}, 0 0 0 3.5px ${theme.colors.active}`
                            : 'none',
                          zIndex: isSelected ? 2 : isHoveredSelf ? 1 : 0,
                        }}
                        onMouseEnter={(e) => {
                          setHoveredBar({ country: c, lane, id: p.id })
                          setHover({ p, x: e.clientX, y: e.clientY })
                        }}
                        onMouseMove={(e) =>
                          setHover({ p, x: e.clientX, y: e.clientY })
                        }
                        onMouseLeave={() => {
                          setHoveredBar(null)
                          setHover(null)
                        }}
                      />
                    )
                  })}
                  <MatrixLaneLabels
                    placed={placed}
                    isActive={isActive}
                    selectedId={selectedId}
                    hoveredId={hoveredBar?.id ?? null}
                    W={W}
                    secondaryColor={theme.colors.text.secondary}
                  />
                </div>
              ))}
            </div>
          </div>
        </Scroll>
        {hiddenCount > 0 && (
          <ShowAllRow>
            <ShowAllBtn type="button" onClick={() => setShowAll((v) => !v)}>
              {showAll
                ? `상위 ${INFOGRAPHIC_DEFAULTS.MATRIX_COUNTRY_TOP_N}개만 보기`
                : `+${hiddenCount}개 국가 더 보기`}
            </ShowAllBtn>
          </ShowAllRow>
        )}
      </div>
      {hover && (
        <PersonHoverTooltip
          person={hover.p}
          x={hover.x}
          y={hover.y}
          metaSecondLine={
            hover.p.faction
              ? `${hover.p.country} · ${hover.p.faction}`
              : hover.p.country
          }
        />
      )}
      <PersonPreviewModal
        person={previewPerson}
        onClose={() => setPreviewPerson(null)}
        onOpenDetail={(id) => {
          setPreviewPerson(null)
          onOpen(id)
        }}
      />
    </ViewPanel>
  )
}

/**
 * lane 단위 라벨 collision 처리 — 선택·호버 인물 우선 표시.
 * matrix 본체에서 IIFE로 인라인하던 로직을 분리하여 가독성 회복.
 */
// memo — placed/isActive(안정)/selectedId/hoveredId 가 안 바뀌면 hover 툴팁 이동 시
// 재렌더·라벨 충돌 재계산을 건너뛴다.
const MatrixLaneLabels = memo(function MatrixLaneLabels({
  placed,
  isActive,
  selectedId,
  hoveredId,
  W,
  secondaryColor,
}: {
  placed: Array<{ p: AdaptedPerson; x1: number; x2: number; lane: number }>
  isActive: (p: AdaptedPerson) => boolean
  selectedId: string | null
  hoveredId: string | null
  W: number
  secondaryColor: string
}) {
  const chosen = useMemo(() => {
    const laneMap = new Map<number, typeof placed>()
    for (const item of placed) {
      if (!isActive(item.p)) continue
      const arr = laneMap.get(item.lane) ?? []
      arr.push(item)
      laneMap.set(item.lane, arr)
    }
    type Chosen = {
      p: AdaptedPerson
      lane: number
      mode: 'inline' | 'side'
      left: number
      right: number
      sideName?: string
    }
    const out: Chosen[] = []
    for (const group of laneMap.values()) {
      type Ent = {
        item: (typeof placed)[number]
        prio: number
        mode: 'inline' | 'side'
        left: number
        right: number
        sideName?: string
      }
      const entries: Ent[] = []
      for (const item of group) {
        const { p, x1, x2 } = item
        const inline = x2 - x1 >= 10
        const priSelect = selectedId === p.id ? 1000 : 0
        const priHover = hoveredId === p.id ? 500 : 0
        const prio = priSelect + priHover + (p.influence ?? 0)
        if (inline) {
          const w = p.name.length * LABEL_CHAR_PX
          const center = (x1 + x2) / 2
          entries.push({
            item,
            prio,
            mode: 'inline',
            left: center - w / 2,
            right: center + w / 2,
          })
        } else {
          const sideLeft = x2 + 4
          const maxChars = Math.max(
            0,
            Math.floor((W - sideLeft) / LABEL_CHAR_PX),
          )
          if (maxChars < 2) continue
          const sideName =
            p.name.length > maxChars
              ? p.name.slice(0, Math.max(1, maxChars - 1)) + '…'
              : p.name
          const w = sideName.length * LABEL_CHAR_PX
          entries.push({
            item,
            prio,
            mode: 'side',
            left: sideLeft,
            right: sideLeft + w,
            sideName,
          })
        }
      }
      entries.sort((a, b) => b.prio - a.prio)
      const placedLabels: Array<{ left: number; right: number }> = []
      for (const e of entries) {
        const collides = placedLabels.some(
          (pl) =>
            !(
              e.right + LABEL_MIN_GAP_PX <= pl.left ||
              e.left >= pl.right + LABEL_MIN_GAP_PX
            ),
        )
        if (collides) continue
        placedLabels.push({ left: e.left, right: e.right })
        out.push({
          p: e.item.p,
          lane: e.item.lane,
          mode: e.mode,
          left: e.mode === 'inline' ? (e.item.x1 + e.item.x2) / 2 : e.left,
          right: e.right,
          sideName: e.sideName,
        })
      }
    }
    return out
  }, [placed, isActive, selectedId, hoveredId, W])

  return (
    <>
      {chosen.map((c) => {
        if (c.mode === 'inline') {
          return (
            <div
              key={'lbl-' + c.p.id}
              style={{
                position: 'absolute',
                left: c.left,
                top: c.lane * LANE_H + LANE_H / 2,
                transform: 'translate(-50%, -50%)',
                fontSize: 10,
                lineHeight: 1,
                color: '#fff',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                textShadow:
                  '0 0 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.75), 0 1px 1px rgba(0,0,0,0.6)',
              }}
            >
              {c.p.name}
            </div>
          )
        }
        return (
          <div
            key={'lbl-' + c.p.id}
            style={{
              position: 'absolute',
              left: c.left,
              top: c.lane * LANE_H + LANE_H / 2,
              transform: 'translateY(-50%)',
              fontSize: 10,
              lineHeight: 1,
              color: secondaryColor,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            {c.sideName ?? c.p.name}
          </div>
        )
      })}
    </>
  )
})

const Scroll = styled.div`
  overflow-x: auto;
  ${scrollbarThinMixin}
`

const Labels = styled.div`
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : theme.colors.background.secondary};
`

const AxisRow = styled.div`
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px;
`

const AxisTxt = styled.span`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
`

const ShowAllRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ShowAllBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.active};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`
