/**
 * 인포그래픽 상단 4-column 통계 스트립.
 * 시대 밀도(전체 너비 차트) + 지역 / 분야 / 상위 국가 막대 카드.
 * 각 항목 클릭 → 해당 scope 토글 (필터 패널과 양방향).
 */
import { useMemo, useState } from 'react'

import styled, { css, useTheme } from 'styled-components'

import type { AdaptedPerson } from '../model/types'
import { yearOfEra } from '../model/adapt'
import {
  ERAS,
  FIELDS,
  INFOGRAPHIC_DEFAULTS,
  REGIONS,
  REGION_COLORS,
} from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'

const FIELD_COLOR_MAP: Record<string, string> = {
  '정치': '#6366f1',
  '군사': '#ef4444',
  '사상': '#8b5cf6',
  '과학': '#0ea5e9',
  '예술': '#f59e0b',
  '기타': '#64748b',
}

const colorForField = (f: string): string =>
  FIELD_COLOR_MAP[f] ?? FIELD_COLOR_MAP['기타']

const colorForRegion = (r: string): string =>
  REGION_COLORS[Math.max(0, REGIONS.indexOf(r)) % REGION_COLORS.length]

const MIN_Y = -200
const RANGE = 2230
const BINS = INFOGRAPHIC_DEFAULTS.ERA_DENSITY_BINS
const binW = RANGE / BINS

export function HeaderStats({ people }: { people: AdaptedPerson[] }) {
  const theme = useTheme()
  const dark = theme.mode === 'dark'
  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const toggleScope = usePersonInfographicFilterStore((s) => s.toggleScope)
  const [hoveredEraKey, setHoveredEraKey] = useState<string | null>(null)
  const [hoverBin, setHoverBin] = useState<{
    index: number
    count: number
    from: number
    to: number
    eraKey: string
    eraLbl: string
    eraColor: string
    x: number
    y: number
  } | null>(null)
  const [countriesExpanded, setCountriesExpanded] = useState(false)

  const stats = useMemo(() => {
    const bins = new Array<number>(BINS).fill(0)
    const eraC: Record<string, number> = {}
    const regC: Record<string, number> = {}
    const fieldC: Record<string, number> = {}
    const ctC: Record<string, number> = {}
    const countryRegion: Record<string, string> = {}
    for (const p of people) {
      const i = Math.min(
        BINS - 1,
        Math.max(0, Math.floor((p.activityYear - MIN_Y) / binW)),
      )
      bins[i]++
      const eraKey = yearOfEra(p.activityYear).key
      eraC[eraKey] = (eraC[eraKey] || 0) + 1
      regC[p.region] = (regC[p.region] || 0) + 1
      fieldC[p.field] = (fieldC[p.field] || 0) + 1
      ctC[p.country] = (ctC[p.country] || 0) + 1
      if (!countryRegion[p.country]) countryRegion[p.country] = p.region
    }
    let maxBin = 1
    for (const v of bins) if (v > maxBin) maxBin = v
    let regionMax = 1
    for (const v of Object.values(regC)) if (v > regionMax) regionMax = v
    let fieldMax = 1
    for (const v of Object.values(fieldC)) if (v > fieldMax) fieldMax = v
    const topCt = Object.entries(ctC).sort((a, b) => b[1] - a[1])
    return {
      bins,
      eraC,
      regC,
      fieldC,
      topCt,
      countryRegion,
      maxBin,
      regionMax,
      fieldMax,
    }
  }, [people])

  const {
    bins,
    eraC,
    regC,
    fieldC,
    topCt,
    countryRegion,
    maxBin,
    regionMax,
    fieldMax,
  } = stats

  const countryList = countriesExpanded
    ? topCt.slice(0, INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_EXPANDED)
    : topCt.slice(0, INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_DEFAULT)
  const hasMoreCountries = topCt.length > INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_DEFAULT
  const ctMax = topCt[0]?.[1] || 1

  const muted = theme.colors.text.tertiary
  const gridStroke = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const maxGuideStroke = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
  const inactiveBinFill = dark ? 'rgba(255,255,255,0.14)' : '#d1d5db'

  const VB_W = 1200
  const CHART_H = 90
  const BAR_TOP_PAD = 10
  const YEAR_LABEL_BAND = 14
  const RIBBON_GAP = 3
  const RIBBON_H = 2
  const TOTAL_H = CHART_H + YEAR_LABEL_BAND + RIBBON_GAP + RIBBON_H
  const yearTicks: number[] = []
  for (let y = Math.ceil(MIN_Y / 200) * 200; y <= MIN_Y + RANGE; y += 200)
    yearTicks.push(y)

  return (
    <>
      <Strip>
        <EraDensityCard>
          <EraDensityHead>
            <StatLabel>시대 밀도</StatLabel>
            <EraDensityLegend>
              {ERAS.map((e) => {
                const n = eraC[e.key] ?? 0
                const isDim =
                  hoveredEraKey != null && hoveredEraKey !== e.key
                return (
                  <EraDensityLegendItem
                    key={e.key}
                    $active={scopes.era.includes(e.key)}
                    $color={e.color}
                    style={isDim ? { opacity: 0.45 } : undefined}
                    aria-label={`${e.lbl} ${n}명, 필터 토글`}
                    onMouseEnter={() => setHoveredEraKey(e.key)}
                    onMouseLeave={() => setHoveredEraKey(null)}
                    onFocus={() => setHoveredEraKey(e.key)}
                    onBlur={() => setHoveredEraKey(null)}
                    onClick={() => toggleScope('era', e.key)}
                  >
                    <span style={{ background: e.color }} />
                    {e.lbl}
                    <EraLegendCount>{n}</EraLegendCount>
                  </EraDensityLegendItem>
                )
              })}
            </EraDensityLegend>
          </EraDensityHead>
          <EraDensityChartWrap>
            <svg
              viewBox={`0 0 ${VB_W} ${TOTAL_H}`}
              width="100%"
              preserveAspectRatio="none"
              style={{ display: 'block', marginTop: 6 }}
              role="img"
              aria-label="시대별 인물 밀도"
            >
              <line
                x1={0}
                y1={BAR_TOP_PAD}
                x2={VB_W}
                y2={BAR_TOP_PAD}
                stroke={maxGuideStroke}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              {yearTicks.map((y) => {
                const x = ((y - MIN_Y) / RANGE) * VB_W
                return (
                  <line
                    key={y}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={CHART_H}
                    stroke={gridStroke}
                    strokeWidth={1}
                    strokeDasharray="3 4"
                  />
                )
              })}
              {bins.map((n, i) => {
                const barW = VB_W / BINS
                const x = (i / BINS) * VB_W
                const h = (n / maxBin) * (CHART_H - BAR_TOP_PAD)
                const fromYear = MIN_Y + binW * i
                const toYear = MIN_Y + binW * (i + 1)
                const eraInfo = yearOfEra(MIN_Y + binW * (i + 0.5))
                const isActiveEra = scopes.era.includes(eraInfo.key)
                const anyActive = scopes.era.length > 0
                const isHoverDimmed =
                  hoveredEraKey != null && hoveredEraKey !== eraInfo.key
                const fill = anyActive
                  ? isActiveEra
                    ? eraInfo.color
                    : inactiveBinFill
                  : eraInfo.color
                const opacity = isHoverDimmed ? 0.3 : anyActive ? 1 : 0.85
                return (
                  <rect
                    key={i}
                    x={x + 1.5}
                    y={CHART_H - h}
                    width={Math.max(1, barW - 3)}
                    height={h}
                    rx={1.5}
                    fill={fill}
                    opacity={opacity}
                    style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                    aria-label={`${eraInfo.lbl} ${Math.round(fromYear)}–${Math.round(toYear)}, ${n}명`}
                    onMouseEnter={(ev) => {
                      setHoveredEraKey(eraInfo.key)
                      setHoverBin({
                        index: i,
                        count: n,
                        from: Math.round(fromYear),
                        to: Math.round(toYear),
                        eraKey: eraInfo.key,
                        eraLbl: eraInfo.lbl,
                        eraColor: eraInfo.color,
                        x: ev.clientX,
                        y: ev.clientY,
                      })
                    }}
                    onMouseMove={(ev) =>
                      setHoverBin((prev) =>
                        prev && prev.index === i
                          ? { ...prev, x: ev.clientX, y: ev.clientY }
                          : prev,
                      )
                    }
                    onMouseLeave={() => {
                      setHoveredEraKey(null)
                      setHoverBin(null)
                    }}
                    onClick={() => toggleScope('era', eraInfo.key)}
                  >
                    <title>
                      {eraInfo.lbl} · {Math.round(fromYear)}–
                      {Math.round(toYear)} · {n}명
                    </title>
                  </rect>
                )
              })}
              {yearTicks.map((y) => {
                const x = ((y - MIN_Y) / RANGE) * VB_W
                return (
                  <text
                    key={y}
                    x={x}
                    y={CHART_H + YEAR_LABEL_BAND - 3}
                    textAnchor="middle"
                    fontSize={9}
                    fill={muted}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {y < 0 ? `${-y}BC` : y === 0 ? '0' : y}
                  </text>
                )
              })}
              {ERAS.map((e) => {
                const x1 = Math.max(0, ((e.from - MIN_Y) / RANGE) * VB_W)
                const x2 = Math.min(VB_W, ((e.to - MIN_Y) / RANGE) * VB_W)
                if (x2 <= x1) return null
                const isActive = scopes.era.includes(e.key)
                const anyActive = scopes.era.length > 0
                const isHoverEmphasized = hoveredEraKey === e.key
                const isHoverDimmed =
                  hoveredEraKey != null && !isHoverEmphasized
                const opacity = isHoverEmphasized
                  ? 1
                  : isHoverDimmed
                    ? 0.18
                    : anyActive
                      ? isActive
                        ? 1
                        : 0.25
                      : 0.75
                return (
                  <rect
                    key={e.key}
                    x={x1}
                    y={CHART_H + YEAR_LABEL_BAND + RIBBON_GAP}
                    width={x2 - x1}
                    height={RIBBON_H}
                    fill={e.color}
                    opacity={opacity}
                    style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                    aria-label={`${e.lbl} (${eraC[e.key] ?? 0}명)`}
                    onMouseEnter={() => setHoveredEraKey(e.key)}
                    onMouseLeave={() => setHoveredEraKey(null)}
                    onClick={() => toggleScope('era', e.key)}
                  >
                    <title>
                      {e.lbl} · {eraC[e.key] ?? 0}명
                    </title>
                  </rect>
                )
              })}
            </svg>
            <EraDensityMax>최대 {maxBin}명</EraDensityMax>
          </EraDensityChartWrap>
        </EraDensityCard>

        <StatCard>
          <StatLabel>지역 분포</StatLabel>
          <BarList>
            {REGIONS.filter((r) => regC[r])
              .sort((a, b) => (regC[b] || 0) - (regC[a] || 0))
              .map((r) => {
                const n = regC[r] || 0
                const isActive = scopes.region.includes(r)
                const color =
                  REGION_COLORS[REGIONS.indexOf(r) % REGION_COLORS.length]
                return (
                  <BarRow
                    key={r}
                    $active={isActive}
                    onClick={() => toggleScope('region', r)}
                  >
                    <BarLabel>{r}</BarLabel>
                    <BarTrack>
                      <BarFill
                        style={{
                          width: `${(n / regionMax) * 100}%`,
                          background: color,
                        }}
                      />
                    </BarTrack>
                    <BarValue>{n}</BarValue>
                  </BarRow>
                )
              })}
          </BarList>
        </StatCard>

        <StatCard>
          <StatLabel>분야</StatLabel>
          <BarList>
            {FIELDS.filter((f) => fieldC[f]).map((f) => {
              const n = fieldC[f] || 0
              const isActive = scopes.field.includes(f)
              const color = colorForField(f)
              return (
                <BarRow
                  key={f}
                  $active={isActive}
                  aria-label={`${f} ${n}명, 필터 토글`}
                  onClick={() => toggleScope('field', f)}
                >
                  <BarLabel>{f}</BarLabel>
                  <BarTrack>
                    <BarFill
                      style={{
                        width: `${(n / fieldMax) * 100}%`,
                        background: color,
                      }}
                    />
                  </BarTrack>
                  <BarValue>{n}</BarValue>
                </BarRow>
              )
            })}
          </BarList>
        </StatCard>

        <StatCard>
          <StatLabel>상위 국가</StatLabel>
          <BarList>
            {countryList.map(([c, n], i) => {
              const isActive = scopes.country.includes(c)
              const color = colorForRegion(countryRegion[c] ?? '')
              return (
                <BarRow
                  key={c}
                  $active={isActive}
                  aria-label={`${i + 1}위 ${c} ${n}명, 필터 토글`}
                  onClick={() => toggleScope('country', c)}
                >
                  <BarRank>{i + 1}</BarRank>
                  <BarLabel $flex>{c}</BarLabel>
                  <BarTrack $compact>
                    <BarFill
                      style={{
                        width: `${(n / ctMax) * 100}%`,
                        background: color,
                      }}
                    />
                  </BarTrack>
                  <BarValue>{n}</BarValue>
                </BarRow>
              )
            })}
          </BarList>
          {hasMoreCountries && (
            <TopCountryToggle
              type="button"
              onClick={() => setCountriesExpanded((v) => !v)}
            >
              {countriesExpanded
                ? '접기'
                : `+ ${Math.min(topCt.length, INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_EXPANDED) - INFOGRAPHIC_DEFAULTS.TOP_COUNTRY_DEFAULT}개 더보기`}
            </TopCountryToggle>
          )}
        </StatCard>
      </Strip>
      {hoverBin && (
        <EraDensityTooltip
          style={{ top: hoverBin.y + 14, left: hoverBin.x + 14 }}
        >
          <EraDensityTooltipDot style={{ background: hoverBin.eraColor }} />
          <strong style={{ color: hoverBin.eraColor }}>{hoverBin.eraLbl}</strong>
          <span>
            {hoverBin.from < 0 ? `${-hoverBin.from}BC` : hoverBin.from} –{' '}
            {hoverBin.to < 0 ? `${-hoverBin.to}BC` : hoverBin.to}
          </span>
          <EraDensityTooltipCount>{hoverBin.count}명</EraDensityTooltipCount>
        </EraDensityTooltip>
      )}
    </>
  )
}

const Strip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const StatCard = styled.div`
  padding: 14px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  &:last-child {
    border-bottom: none;
  }
`

const EraDensityCard = styled(StatCard)`
  grid-column: 1 / -1;
  padding: 12px 4px 14px;
`

const EraDensityChartWrap = styled.div`
  position: relative;
`

const EraDensityMax = styled.div`
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  pointer-events: none;
`

const EraDensityTooltip = styled.div`
  position: fixed;
  z-index: 50;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(20, 20, 25, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        `
      : css`
          background: #fff;
          border: 1px solid #e5e7eb;
          color: #111827;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        `}
  strong {
    font-weight: 700;
  }
  span {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const EraDensityTooltipDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`

const EraDensityTooltipCount = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary} !important;
  margin-left: 2px;
`

const EraLegendCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  margin-left: 2px;
`

const TopCountryToggle = styled.button`
  margin-top: 6px;
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 500;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EraDensityHead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`

const EraDensityLegend = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-wrap: wrap;
`

const EraDensityLegendItem = styled.button<{
  $active: boolean
  $color: string
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.12s, opacity 0.12s;

  > span:first-child {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  ${({ $active, $color }) =>
    $active &&
    css`
      background: ${$color}1f;
      color: ${$color};
      font-weight: 600;
    `}

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const StatLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
`

const BarRow = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
    `}
`

const BarLabel = styled.span<{ $flex?: boolean }>`
  ${({ $flex }) =>
    $flex
      ? css`
          flex: 1;
          min-width: 0;
        `
      : css`
          width: 70px;
          flex-shrink: 0;
        `}
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BarTrack = styled.div<{ $compact?: boolean }>`
  flex: ${({ $compact }) => ($compact ? '0 0 64px' : '1')};
  height: 5px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.background.secondary};
  position: relative;
  overflow: hidden;
`

const BarFill = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: currentColor;
  transition: width 0.18s ease;
`

const BarValue = styled.span`
  width: 28px;
  font-size: 10px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const BarRank = styled.span`
  width: 14px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  text-align: center;
  flex-shrink: 0;
`
