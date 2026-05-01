/**
 * VIEW: 인물 은하계 — 단일 산점도 (한 우주, 모든 인물).
 *
 * x = 활동 연도, y = 영향력
 * 색 = 지역(대륙), 시대 = 배경 영역.
 * 같은 좌표 인물은 결정적 jitter 로 분산.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import type { AdaptedPerson } from '../model/types'
import { yearOfEra } from '../model/adapt'
import {
  ERAS,
  INFOGRAPHIC_DEFAULTS,
  REGIONS,
  REGION_COLORS,
} from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import {
  hasAnyActiveScope,
  isPersonInScopes,
} from '../model/sort-helpers'
import { pickTickStep } from '../model/tick-step'

import { EmptyState } from './_shared/empty-state'
import { PersonHoverTooltip } from './_shared/tooltip'
import {
  ViewLegend,
  ViewLegendItem,
  ViewLegendRow,
  ViewLegendRowLabel,
  ViewPanel,
  ViewPanelDesc,
  ViewPanelHeader,
  ViewPanelTitle,
} from './_shared/view-panel'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
}

const REGION_COLOR_MAP: Record<string, string> = REGIONS.reduce(
  (acc, r, i) => {
    acc[r] = REGION_COLORS[i % REGION_COLORS.length]
    return acc
  },
  {} as Record<string, string>,
)

/** 결정적 jitter — 인물 ID 기반, 같은 인물은 항상 같은 offset */
function deterministicJitter(id: string, range: number) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const dx = ((h % 1000) / 1000 - 0.5) * 2 * range
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 2 * range
  return { dx, dy }
}

export function GalaxyView({ people, onOpen }: Props) {
  const theme = useTheme()
  const [hover, setHover] = useState<{
    p: AdaptedPerson
    x: number
    y: number
  } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [W, setW] = useState(900)
  const [vh, setVh] = useState(
    typeof window === 'undefined' ? 800 : window.innerHeight,
  )

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setW(Math.max(480, w - 32))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // viewport 높이 추적 (vh 기반 차트 높이) — throttle 적용
  useEffect(() => {
    let scheduled = false
    let lastFire = 0
    const onResize = () => {
      const now = Date.now()
      if (now - lastFire > INFOGRAPHIC_DEFAULTS.RESIZE_THROTTLE_MS) {
        lastFire = now
        setVh(window.innerHeight)
        return
      }
      if (scheduled) return
      scheduled = true
      const wait =
        INFOGRAPHIC_DEFAULTS.RESIZE_THROTTLE_MS - (now - lastFire)
      window.setTimeout(() => {
        scheduled = false
        lastFire = Date.now()
        setVh(window.innerHeight)
      }, Math.max(0, wait))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const toggleScope = usePersonInfographicFilterStore((s) => s.toggleScope)
  const clearAllScopes = usePersonInfographicFilterStore(
    (s) => s.clearAllScopes,
  )
  const hasActiveFilter = hasAnyActiveScope(scopes)

  const isActive = (p: AdaptedPerson): boolean =>
    !hasActiveFilter || isPersonInScopes(p, scopes)

  // 좌표계 — 모든 인물 공통 시간축
  const CHART_H = Math.max(
    INFOGRAPHIC_DEFAULTS.GALAXY_CHART_H_MIN,
    Math.min(
      INFOGRAPHIC_DEFAULTS.GALAXY_CHART_H_MAX,
      Math.round(vh * INFOGRAPHIC_DEFAULTS.GALAXY_CHART_H_VH_RATIO),
    ),
  )
  const PADDING = { left: 50, right: 24, top: 18, bottom: 36 }
  const innerW = W - PADDING.left - PADDING.right
  const innerH = CHART_H - PADDING.top - PADDING.bottom

  // 큰 입력에서 매 렌더 수십개 함수가 재계산되는 걸 방지
  const layout = useMemo(() => {
    if (!people.length) return null
    let minYr = Infinity
    let maxYr = -Infinity
    for (const p of people) {
      if (p.activityYear < minYr) minYr = p.activityYear
      if (p.activityYear > maxYr) maxYr = p.activityYear
    }
    const yrPad = (maxYr - minYr) * 0.03
    const X_MIN = minYr - yrPad
    const X_MAX = maxYr + yrPad
    const xRange = Math.max(1, X_MAX - X_MIN)
    const xPos = (yr: number) => PADDING.left + ((yr - X_MIN) / xRange) * innerW
    const yPos = (inf: number) => PADDING.top + (1 - inf / 100) * innerH
    const tickStep = pickTickStep(xRange / 8)
    const xTicks: number[] = []
    for (
      let y = Math.ceil(X_MIN / tickStep) * tickStep;
      y <= X_MAX;
      y += tickStep
    )
      xTicks.push(y)

    // 활성 인물을 위에 그리기 위해 정렬 (비활성 → 활성)
    const ordered = [...people].sort((a, b) => {
      const aA = isPersonInScopes(a, scopes) ? 1 : 0
      const bA = isPersonInScopes(b, scopes) ? 1 : 0
      return aA - bA
    })

    const regionCounts: Record<string, number> = {}
    for (const p of people) {
      regionCounts[p.region] = (regionCounts[p.region] ?? 0) + 1
    }
    const visibleRegions = REGIONS.filter((r) => (regionCounts[r] ?? 0) > 0)

    return {
      X_MIN,
      X_MAX,
      xPos,
      yPos,
      xTicks,
      ordered,
      regionCounts,
      visibleRegions,
    }
  }, [people, scopes, innerW, innerH])

  if (!people.length) {
    return (
      <EmptyState
        hasActiveFilter={hasActiveFilter}
        onClearFilters={clearAllScopes}
      />
    )
  }
  if (!layout) return null

  const {
    X_MIN,
    X_MAX,
    xPos,
    yPos,
    xTicks,
    ordered,
    regionCounts,
    visibleRegions,
  } = layout

  // 라벨 collision 처리 — 영향력 임계 이상만 후보, 위/아래 밴드로 배치
  const labelCandidates = ordered
    .filter(
      (p) =>
        p.influence >= INFOGRAPHIC_DEFAULTS.GALAXY_LABEL_MIN_INFLUENCE &&
        isActive(p),
    )
    .map((p) => {
      const baseX = xPos(p.activityYear)
      const baseY = yPos(p.influence)
      const { dx, dy } = deterministicJitter(
        p.id,
        INFOGRAPHIC_DEFAULTS.GALAXY_JITTER_RANGE,
      )
      return { p, x: baseX + dx, y: baseY + dy }
    })
    .sort((a, b) => b.p.influence - a.p.influence)

  const placedLabels: Array<{
    p: AdaptedPerson
    x: number
    y: number
    above: boolean
  }> = []
  for (const cand of labelCandidates) {
    if (placedLabels.length >= INFOGRAPHIC_DEFAULTS.GALAXY_LABEL_MAX) break
    const collidesAbove = placedLabels.some(
      (l) =>
        l.above &&
        Math.abs(l.x - cand.x) < INFOGRAPHIC_DEFAULTS.GALAXY_LABEL_MIN_X_DIST &&
        Math.abs(l.y - cand.y) < INFOGRAPHIC_DEFAULTS.GALAXY_LABEL_Y_BAND,
    )
    const collidesBelow = placedLabels.some(
      (l) =>
        !l.above &&
        Math.abs(l.x - cand.x) < INFOGRAPHIC_DEFAULTS.GALAXY_LABEL_MIN_X_DIST &&
        Math.abs(l.y - cand.y) < INFOGRAPHIC_DEFAULTS.GALAXY_LABEL_Y_BAND,
    )
    if (!collidesAbove) placedLabels.push({ ...cand, above: true })
    else if (!collidesBelow) placedLabels.push({ ...cand, above: false })
  }

  const activeCount = hasActiveFilter
    ? people.filter((p) => isPersonInScopes(p, scopes)).length
    : people.length

  // density underlay — 점이 많을 때만
  const showDensity =
    people.length >= INFOGRAPHIC_DEFAULTS.GALAXY_DENSITY_THRESHOLD
  const BIN_SIZE = INFOGRAPHIC_DEFAULTS.GALAXY_DENSITY_BIN_SIZE
  const densityBins: Array<{ x: number; y: number; intensity: number }> = []
  if (showDensity) {
    const map = new Map<string, number>()
    for (const p of people) {
      const baseX = xPos(p.activityYear)
      const baseY = yPos(p.influence)
      const bx = Math.floor(baseX / BIN_SIZE)
      const by = Math.floor(baseY / BIN_SIZE)
      map.set(`${bx}:${by}`, (map.get(`${bx}:${by}`) ?? 0) + 1)
    }
    let max = 1
    for (const v of map.values()) if (v > max) max = v
    for (const [k, count] of map.entries()) {
      const [bx, by] = k.split(':').map(Number)
      densityBins.push({
        x: bx * BIN_SIZE,
        y: by * BIN_SIZE,
        intensity: count / max,
      })
    }
  }

  const axisStroke = theme.colors.border.default
  const gridStroke = theme.colors.border.light
  const labelColor = theme.colors.text.tertiary

  return (
    <ViewPanel>
      <ViewPanelHeader>
        <ViewPanelTitle>인물 은하계</ViewPanelTitle>
        <ViewPanelDesc>
          가로 = 활동연도 · 세로 = 영향력 · 색 = 지역 · 시대 = 배경
        </ViewPanelDesc>
        {hasActiveFilter && (
          <FilterIndicator>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              <strong>{activeCount.toLocaleString()}</strong>
              <span style={{ opacity: 0.6 }}>
                {' / '}
                {people.length.toLocaleString()}
              </span>{' '}
              명 강조
            </span>
            <FilterIndicatorClear
              type="button"
              onClick={clearAllScopes}
              aria-label="필터 모두 해제"
            >
              필터 해제
            </FilterIndicatorClear>
          </FilterIndicator>
        )}
        <ViewLegend>
          {visibleRegions.map((r) => {
            const color = REGION_COLOR_MAP[r] ?? theme.colors.text.tertiary
            return (
              <ViewLegendItem
                key={r}
                $active={scopes.region.includes(r)}
                $color={color}
                onClick={() => toggleScope('region', r)}
                style={{ cursor: 'pointer' }}
              >
                <span style={{ background: color }} />
                {r}
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: 10,
                    color: theme.colors.text.tertiary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {regionCounts[r]}
                </span>
              </ViewLegendItem>
            )
          })}
        </ViewLegend>
      </ViewPanelHeader>
      <ViewLegendRow>
        <ViewLegendRowLabel>시대</ViewLegendRowLabel>
        {ERAS.map((e) => (
          <ViewLegendItem
            key={e.key}
            $active={scopes.era.includes(e.key)}
            $color={e.color}
            onClick={() => toggleScope('era', e.key)}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ background: e.color }} />
            {e.lbl}
          </ViewLegendItem>
        ))}
      </ViewLegendRow>
      <ChartWrap ref={containerRef}>
        <svg
          width={W}
          height={CHART_H}
          style={{ display: 'block' }}
          role="img"
          aria-label="인물 은하계 산점도"
        >
          {showDensity &&
            densityBins.map((b, i) => (
              <rect
                key={'dens-' + i}
                x={b.x}
                y={b.y}
                width={BIN_SIZE}
                height={BIN_SIZE}
                fill={theme.colors.text.primary}
                opacity={Math.min(0.12, 0.02 + b.intensity * 0.12)}
                pointerEvents="none"
              />
            ))}

          {ERAS.map((e) => {
            const x1 = Math.max(PADDING.left, xPos(Math.max(e.from, X_MIN)))
            const x2 = Math.min(W - PADDING.right, xPos(Math.min(e.to, X_MAX)))
            if (x2 <= x1) return null
            const isEraActive = scopes.era.includes(e.key)
            const op =
              scopes.era.length > 0 ? (isEraActive ? 0.16 : 0.05) : 0.07
            return (
              <rect
                key={e.key}
                x={x1}
                y={PADDING.top}
                width={x2 - x1}
                height={innerH}
                fill={e.color}
                opacity={op}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleScope('era', e.key)}
              />
            )
          })}

          {[25, 50, 75].map((inf) => (
            <line
              key={inf}
              x1={PADDING.left}
              y1={yPos(inf)}
              x2={W - PADDING.right}
              y2={yPos(inf)}
              stroke={gridStroke}
              strokeWidth={1}
              strokeDasharray="2 5"
            />
          ))}

          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={CHART_H - PADDING.bottom}
            stroke={axisStroke}
            strokeWidth={1}
          />
          <line
            x1={PADDING.left}
            y1={CHART_H - PADDING.bottom}
            x2={W - PADDING.right}
            y2={CHART_H - PADDING.bottom}
            stroke={axisStroke}
            strokeWidth={1}
          />

          {[0, 25, 50, 75, 100].map((inf) => (
            <text
              key={inf}
              x={PADDING.left - 8}
              y={yPos(inf) + 3}
              textAnchor="end"
              fontSize={10}
              fill={labelColor}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {inf}
            </text>
          ))}
          <text
            x={PADDING.left - 8}
            y={PADDING.top - 4}
            textAnchor="end"
            fontSize={9}
            fill={labelColor}
          >
            영향력 ↑
          </text>

          {xTicks.map((yr) => (
            <g key={yr}>
              <line
                x1={xPos(yr)}
                y1={CHART_H - PADDING.bottom}
                x2={xPos(yr)}
                y2={CHART_H - PADDING.bottom + 4}
                stroke={axisStroke}
                strokeWidth={1}
              />
              <text
                x={xPos(yr)}
                y={CHART_H - PADDING.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill={labelColor}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {yr < 0 ? `${-yr}BC` : yr}
              </text>
            </g>
          ))}

          {ERAS.map((e) => {
            const x1 = Math.max(PADDING.left, xPos(Math.max(e.from, X_MIN)))
            const x2 = Math.min(W - PADDING.right, xPos(Math.min(e.to, X_MAX)))
            if (x2 - x1 < 40) return null
            const isActiveEra = scopes.era.includes(e.key)
            return (
              <text
                key={'lbl-' + e.key}
                x={(x1 + x2) / 2}
                y={PADDING.top + 12}
                textAnchor="middle"
                fontSize={10}
                fill={e.color}
                fontWeight={isActiveEra ? 800 : 600}
                opacity={
                  scopes.era.length > 0 && !isActiveEra ? 0.4 : 0.85
                }
                style={{ cursor: 'pointer' }}
                onClick={() => toggleScope('era', e.key)}
              >
                {e.lbl}
              </text>
            )
          })}

          {ordered.map((p) => {
            const baseX = xPos(p.activityYear)
            const baseY = yPos(p.influence)
            const { dx, dy } = deterministicJitter(
              p.id,
              INFOGRAPHIC_DEFAULTS.GALAXY_JITTER_RANGE,
            )
            const x = baseX + dx
            const y = baseY + dy
            const color = REGION_COLOR_MAP[p.region] ?? theme.colors.text.tertiary
            const active = isActive(p)
            const isHovered = hoveredId === p.id
            const baseR = 4 + (p.influence / 100) * 6
            const r = isHovered ? baseR + 1.5 : baseR
            const op = active ? 0.85 : 0.18
            return (
              <g
                key={p.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onOpen(p.id)}
                onMouseEnter={(e) => {
                  setHover({ p, x: e.clientX, y: e.clientY })
                  setHoveredId(p.id)
                }}
                onMouseMove={(e) => setHover({ p, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => {
                  setHover(null)
                  setHoveredId(null)
                }}
              >
                <circle cx={x} cy={y} r={r + 10} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={r + (isHovered ? 6 : 4)}
                  fill={color}
                  opacity={op * (isHovered ? 0.32 : 0.2)}
                />
                {active && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 1.2}
                    fill="none"
                    stroke={theme.colors.background.primary}
                    strokeWidth={1.5}
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  opacity={op}
                  stroke={color}
                  strokeOpacity={Math.min(1, op + (isHovered ? 0.15 : 0))}
                  strokeWidth={isHovered ? 1.6 : 1}
                />
              </g>
            )
          })}

          {placedLabels.map(({ p, x, y, above }) => {
            const r = 4 + (p.influence / 100) * 6
            const offset = above ? -(r + 6) : r + 12
            return (
              <text
                key={'lbl-' + p.id}
                x={x}
                y={y + offset}
                textAnchor="middle"
                fontSize={9}
                fill={theme.colors.text.secondary}
                fontWeight={500}
                style={{ pointerEvents: 'none' }}
              >
                {p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name}
              </text>
            )
          })}
        </svg>
        {hasActiveFilter && activeCount === 0 && (
          <EmptyOverlay>
            <EmptyOverlayTitle>조건에 맞는 인물이 없습니다</EmptyOverlayTitle>
            <EmptyOverlayDesc>
              현재 필터에 일치하는 인물이 없어요. 필터를 해제해 전체를 보세요.
            </EmptyOverlayDesc>
            <EmptyOverlayBtn type="button" onClick={clearAllScopes}>
              필터 모두 해제
            </EmptyOverlayBtn>
          </EmptyOverlay>
        )}
      </ChartWrap>
      {hover && (
        <PersonHoverTooltip
          person={hover.p}
          x={hover.x}
          y={hover.y}
          metaSecondLine={`${hover.p.country} · ${hover.p.field}`}
        />
      )}
    </ViewPanel>
  )
}

const ChartWrap = styled.div`
  padding: 14px 16px 18px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
`

const FilterIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
  font-size: 11px;
  font-weight: 500;
`

const FilterIndicatorClear = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
  &:hover {
    opacity: 0.85;
  }
`

const EmptyOverlay = styled.div`
  position: absolute;
  inset: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: ${({ theme }) => theme.colors.background.primary}cc;
  backdrop-filter: blur(2px);
`

const EmptyOverlayTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyOverlayDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
  text-align: center;
  line-height: 1.5;
`

const EmptyOverlayBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  &:hover {
    opacity: 0.9;
  }
`
