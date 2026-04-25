/**
 * 인물 인포그래픽 콘텐츠
 * - 헤더 + 검색 + 뷰 전환 + 통계 스트립 + 시대 칩 + 뷰 영역(매트릭스/은하계/스토리/왕조)
 * - 필터·뷰 상태는 zustand store(usePersonInfographicFilterStore)로 공유.
 * - 좌측 NavRail은 분리(PersonFilterPanel).
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { FiArrowRight, FiBarChart2, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import styled, { css, useTheme } from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

import { usePersons } from '@/entities/person/api'
import type { Person } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  glassOrSolidMixin,
  scrollbarThinMixin,
} from '@/shared/styles/mixins'
import {
  PersonTabSharedDesc,
  PersonTabSharedHeader,
  PersonTabSharedHeaderLeft,
  PersonTabSharedHeaderRight,
  PersonTabSharedTitle,
} from '@/widgets/country/country-detail/ui/country-detail.styles'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  ERAS,
  FIELDS,
  REGIONS,
  REGION_COLORS,
  adapt,
  yearOfEra,
  usePersonInfographicFilterStore,
  type AdaptedPerson,
  type PersonInfographicView,
} from '@/widgets/person-infographic'

// 검색 하이라이트
function highlight(text: string, q: string): React.ReactNode {
  const trimmed = q.trim()
  if (!trimmed) return text
  const idx = text.toLowerCase().indexOf(trimmed.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <HLMark>{text.slice(idx, idx + trimmed.length)}</HLMark>
      {text.slice(idx + trimmed.length)}
    </>
  )
}

// ================================================================
// HEADER STATS STRIP (4-column)
// ================================================================
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


function HeaderStats({ people }: { people: AdaptedPerson[] }) {
  const theme = useTheme()
  const dark = theme.mode === 'dark'
  // S2+S10 — 차트 클릭 → 필터 토글, 활성 scope 강조
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

  const MIN_Y = -200
  const RANGE = 2230
  const BINS = 42
  const binW = RANGE / BINS
  const TOP_COUNTRY_DEFAULT = 6
  const TOP_COUNTRY_EXPANDED = 15

  // 파생값 일괄 메모이즈 — people 변화 시에만 재계산
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
  }, [people, binW])

  const { bins, eraC, regC, fieldC, topCt, countryRegion, maxBin, regionMax, fieldMax } = stats
  const countryList = countriesExpanded
    ? topCt.slice(0, TOP_COUNTRY_EXPANDED)
    : topCt.slice(0, TOP_COUNTRY_DEFAULT)
  const hasMoreCountries = topCt.length > TOP_COUNTRY_DEFAULT
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
    <StatsStrip>
      {/* 시대 밀도 — 전체 너비. bin 클릭 → 그 시대 필터 */}
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
          >
            {/* 상단 max guide + 연도 세로 점선 */}
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
            {/* 히스토그램 — bin 클릭 시 그 연도가 속한 시대 토글 */}
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
                    {eraInfo.lbl} · {Math.round(fromYear)}–{Math.round(toYear)} · {n}명
                  </title>
                </rect>
              )
            })}
            {/* 연도 라벨 */}
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
            {/* 시대 리본 — 아래쪽 얇은 영역으로 영역 구분 + 클릭 필터 */}
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

      {/* 지역 막대 (도넛 → 막대로 통일) */}
      <StatCard>
        <StatLabel>지역 분포</StatLabel>
        <BarList>
          {REGIONS.filter((r) => regC[r])
            .sort((a, b) => (regC[b] || 0) - (regC[a] || 0))
            .map((r) => {
              const n = regC[r] || 0
              const isActive = scopes.region.includes(r)
              const color = REGION_COLORS[REGIONS.indexOf(r) % REGION_COLORS.length]
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

      {/* 분야 막대 */}
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

      {/* 상위 국가 막대 — 국가별 소속 지역 색 */}
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
              : `+ ${Math.min(topCt.length, TOP_COUNTRY_EXPANDED) - TOP_COUNTRY_DEFAULT}개 더보기`}
          </TopCountryToggle>
        )}
      </StatCard>
    </StatsStrip>
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

const StatsStrip = styled.div`
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
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
`
const EraDensityLegend = styled.div`
  display: flex; gap: 4px; margin-left: auto; flex-wrap: wrap;
`
const EraDensityLegendItem = styled.button<{ $active: boolean; $color: string }>`
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

/** 통계 막대 — 시대 밀도 외 3 카드(지역·분야·국가)에서 공통 사용 */
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

const BarFill = styled.div<{ $accent?: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: ${({ $accent, theme }) =>
    $accent ? theme.colors.active : 'currentColor'};
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

// ================================================================
// VIEW 1: TIMELINE MATRIX
// ================================================================
const MATRIX_COUNTRY_TOP_N = 20

function TimelineMatrix({ people, onOpen }: { people: AdaptedPerson[]; onOpen: (id: string) => void }) {
  const theme = useTheme()
  const [hover, setHover] = useState<{ p: AdaptedPerson; x: number; y: number } | null>(null)
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

  // M1 — 컨테이너 폭 자동 추적 (반응형)
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      // 라벨 컬럼 130px + padding 여백 24px 정도 빼고
      setW(Math.max(480, w - 130 - 24))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // C2 — 활성 필터 강조: 사이드바 scope과 양방향
  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const hasActiveFilter =
    scopes.era.length + scopes.region.length + scopes.field.length + scopes.country.length > 0
  const isActiveByScope = (p: AdaptedPerson): boolean => {
    if (!hasActiveFilter) return true
    const eraKey = yearOfEra(p.activityYear).key
    if (scopes.era.length > 0 && !scopes.era.includes(eraKey)) return false
    if (scopes.region.length > 0 && !scopes.region.includes(p.region)) return false
    if (scopes.field.length > 0 && !scopes.field.includes(p.field)) return false
    if (scopes.country.length > 0 && !scopes.country.includes(p.country)) return false
    return true
  }

  const byCountry: Record<string, AdaptedPerson[]> = {}
  people.forEach((p) => { (byCountry[p.country] = byCountry[p.country] || []).push(p) })
  const allCountries = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length)
  // M2 — top N 표시 + 전체 보기 토글
  const countries = showAll ? allCountries : allCountries.slice(0, MATRIX_COUNTRY_TOP_N)
  const hiddenCount = allCountries.length - countries.length

  if (!allCountries.length)
    return <EmptyState>인물 데이터가 없습니다. 국가·시대·분야·영향력 필터를 확인해보세요.</EmptyState>

  let minY = Infinity
  let maxY = -Infinity
  for (const p of people) {
    if (p.born < minY) minY = p.born
    if (p.died > maxY) maxY = p.died
  }
  const rng = Math.max(1, maxY - minY)
  const LANE_H = 18, GAP_PX = 2
  const BAR_H = LANE_H - 4
  const BAR_TOP_OFFSET = (LANE_H - BAR_H) / 2
  const LABEL_MIN_GAP_PX = 6
  const LABEL_CHAR_PX = 7
  const yearX = (y: number) => ((y - minY) / rng) * W

  // 국가별 lane 패킹: 생년 순으로 그리디 배치
  const packed = countries.map(([c, arr]) => {
    const sorted = [...arr].sort((a, b) => a.born - b.born)
    const lanes: number[] = []
    const placed = sorted.map((p) => {
      const x1 = yearX(p.born)
      const x2 = Math.max(x1 + 3, yearX(p.died))
      let lane = lanes.findIndex((rightX) => rightX + GAP_PX <= x1)
      if (lane === -1) { lanes.push(x2); lane = lanes.length - 1 }
      else lanes[lane] = x2
      return { p, x1, x2, lane }
    })
    const laneCount = Math.max(1, lanes.length)
    return { country: c, count: arr.length, placed, rowH: laneCount * LANE_H + 4 }
  })
  const totalRowH = packed.reduce((s, r) => s + r.rowH, 0)

  const startDec = Math.ceil(minY / 50) * 50
  const ticks: number[] = []
  for (let y = startDec; y <= maxY; y += 50) ticks.push(y)

  const gridLine = theme.colors.border.light
  const tickLine = theme.colors.border.default

  return (
    <ViewPanel>
      <ViewPanelHeader>
        <ViewPanelTitle>국가 × 연도 매트릭스</ViewPanelTitle>
        <ViewPanelDesc>가로 = 생몰 · 색 = 시대</ViewPanelDesc>
        {minInfluence > 0 && (
          <MatrixFilterBadge>영향력 ≥ {minInfluence}</MatrixFilterBadge>
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
        <MatrixScroll>
          <div style={{ display: 'grid', gridTemplateColumns: `130px ${W}px` }}>
            <MatrixLabels>
              <MatrixAxisRow>
                <MatrixAxisTxt>국가 / 인물수</MatrixAxisTxt>
              </MatrixAxisRow>
              {packed.map(({ country: c, count, rowH }) => {
                const isActive = !hasActiveFilter || scopes.country.length === 0 || scopes.country.includes(c)
                const isHoveredCountry = hoveredBar?.country === c
                return (
                  <MatrixLabelRow
                    key={c}
                    style={{
                      height: rowH,
                      opacity: isActive ? 1 : 0.4,
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
                    <span style={{ fontSize: 10, color: theme.colors.text.tertiary }}>{count}</span>
                  </MatrixLabelRow>
                )
              })}
            </MatrixLabels>
            <div style={{ position: 'relative' }}>
              <svg width={W} height={30 + totalRowH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                {ERAS.map((e) => {
                  const x1 = Math.max(0, yearX(Math.max(e.from, minY)))
                  const x2 = Math.min(W, yearX(Math.min(e.to, maxY)))
                  if (x2 <= x1) return null
                  const isEraActive = scopes.era.includes(e.key)
                  const op = scopes.era.length > 0 ? (isEraActive ? 0.12 : 0.02) : 0.05
                  return <rect key={e.key} x={x1} y={0} width={x2 - x1} height={30 + totalRowH} fill={e.color} opacity={op} />
                })}
                {ticks.map((y) => (
                  <line key={y} x1={yearX(y)} y1={30} x2={yearX(y)} y2={30 + totalRowH} stroke={tickLine} strokeWidth={0.5} strokeDasharray="2 5" />
                ))}
              </svg>
              <div style={{ height: 30, position: 'relative' }}>
                {ticks.filter((_, i) => i % 2 === 0).map((y) => (
                  <div key={y} style={{ position: 'absolute', left: yearX(y), top: 0, fontSize: 9, color: theme.colors.text.tertiary, transform: 'translateX(-50%)', paddingTop: 8, fontVariantNumeric: 'tabular-nums' }}>
                    {y < 0 ? `${-y}BC` : y}
                  </div>
                ))}
              </div>
              {packed.map(({ country: c, placed, rowH }) => (
                <div key={c} style={{ height: rowH, position: 'relative', borderTop: `1px solid ${gridLine}` }}>
                  {placed.map(({ p, x1, x2, lane }) => {
                    const yy = lane * LANE_H + BAR_TOP_OFFSET
                    const era = yearOfEra(p.activityYear)
                    const active = isActiveByScope(p)
                    const isHoveredLane =
                      hoveredBar?.country === c && hoveredBar?.lane === lane
                    const isHoveredSelf = hoveredBar?.id === p.id
                    const isOtherInLane = isHoveredLane && !isHoveredSelf
                    const isSelected = selectedId === p.id
                    const baseOp = active ? 0.85 : 0.2
                    // M3: 같은 lane의 다른 막대 dim
                    const op = isOtherInLane ? Math.min(baseOp, 0.25) : baseOp
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={`${p.name} ${p.born}-${p.died}`}
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
                          // M4: selected ring
                          boxShadow: isSelected
                            ? `0 0 0 2px ${theme.colors.background.primary}, 0 0 0 3.5px ${theme.colors.active}`
                            : 'none',
                          zIndex: isSelected ? 2 : isHoveredSelf ? 1 : 0,
                        }}
                        onMouseEnter={(e) => {
                          setHoveredBar({ country: c, lane, id: p.id })
                          setHover({ p, x: e.clientX, y: e.clientY })
                        }}
                        onMouseMove={(e) => setHover({ p, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => {
                          setHoveredBar(null)
                          setHover(null)
                        }}
                      />
                    )
                  })}
                  {/* 라벨 — lane 단위 collision 기반 필터링. 선택·호버 인물은 우선 표시 */}
                  {(() => {
                    const laneMap = new Map<number, typeof placed>()
                    for (const item of placed) {
                      if (!isActiveByScope(item.p)) continue
                      const arr = laneMap.get(item.lane) ?? []
                      arr.push(item)
                      laneMap.set(item.lane, arr)
                    }
                    const chosen: Array<{
                      p: AdaptedPerson
                      lane: number
                      mode: 'inline' | 'side'
                      left: number
                      right: number
                    }> = []
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
                        const priHover = hoveredBar?.id === p.id ? 500 : 0
                        const prio = priSelect + priHover + (p.influence ?? 0)
                        if (inline) {
                          // 라벨은 막대 밖으로 삐져나가도 허용 — collision은 label-label 기준
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
                      // 우선순위 내림차순 → greedy: 이미 배치된 라벨과 겹치지 않는 것만 선택
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
                        chosen.push({
                          p: e.item.p,
                          lane: e.item.lane,
                          mode: e.mode,
                          left: e.mode === 'inline' ? (e.item.x1 + e.item.x2) / 2 : e.left,
                          right: e.right,
                        })
                        // side 모드는 sideName 렌더를 위해 원본 entry 참조가 필요
                        ;(chosen[chosen.length - 1] as unknown as { sideName?: string }).sideName =
                          e.sideName
                      }
                    }
                    return chosen.map((c) => {
                      const { p, lane, mode } = c
                      if (mode === 'inline') {
                        return (
                          <div
                            key={'lbl-' + p.id}
                            style={{
                              position: 'absolute',
                              left: c.left,
                              top: lane * LANE_H + LANE_H / 2,
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
                            {p.name}
                          </div>
                        )
                      }
                      const sideName =
                        (c as unknown as { sideName?: string }).sideName ?? p.name
                      return (
                        <div
                          key={'lbl-' + p.id}
                          style={{
                            position: 'absolute',
                            left: c.left,
                            top: lane * LANE_H + LANE_H / 2,
                            transform: 'translateY(-50%)',
                            fontSize: 10,
                            lineHeight: 1,
                            color: theme.colors.text.secondary,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                          }}
                        >
                          {sideName}
                        </div>
                      )
                    })
                  })()}
                </div>
              ))}
            </div>
          </div>
        </MatrixScroll>
        {hiddenCount > 0 && (
          <ShowAllRow>
            <ShowAllBtn type="button" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `상위 ${MATRIX_COUNTRY_TOP_N}개만 보기` : `+${hiddenCount}개 국가 더 보기`}
            </ShowAllBtn>
          </ShowAllRow>
        )}
      </div>
      {hover && (
        <MatrixTooltip style={{ top: hover.y + 14, left: hover.x + 14 }}>
          {hover.p.profileImageUrl ? (
            <MatrixTooltipImg src={hover.p.profileImageUrl} alt={hover.p.name} />
          ) : (
            <MatrixTooltipImgPh $color={yearOfEra(hover.p.activityYear).color}>
              <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </MatrixTooltipImgPh>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hover.p.name}</div>
            <div style={{ fontSize: 11, color: theme.colors.text.secondary, marginTop: 2 }}>
              {hover.p.country}{hover.p.faction ? ` · ${hover.p.faction}` : ''}
            </div>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {hover.p.born < 0 ? `${-hover.p.born}BC` : hover.p.born} – {hover.p.died < 0 ? `${-hover.p.died}BC` : hover.p.died} · 영향력 {hover.p.influence}
            </div>
          </div>
        </MatrixTooltip>
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

/** 매트릭스 막대 클릭 시 뜨는 인물 프리뷰 — "상세 보기"로 이동. ESC·backdrop·X 로 닫힘. */
function PersonPreviewModal({
  person,
  onClose,
  onOpenDetail,
}: {
  person: AdaptedPerson | null
  onClose: () => void
  onOpenDetail: (id: string) => void
}) {
  const theme = useTheme()

  useEffect(() => {
    if (!person) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'Enter') onOpenDetail(person.id)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [person, onClose, onOpenDetail])

  if (!person) return null
  const era = yearOfEra(person.activityYear)
  const born = person.born < 0 ? `${-person.born}BC` : String(person.born)
  const died = person.died < 0 ? `${-person.died}BC` : String(person.died)
  const age = person.age != null ? `${person.age}세` : null

  return createPortal(
    <PreviewOverlay
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${person.name} 인물 정보`}
    >
      <PreviewCard onClick={(e) => e.stopPropagation()}>
        <PreviewClose type="button" onClick={onClose} aria-label="닫기">
          <FiX size={18} />
        </PreviewClose>
        <PreviewHeader>
          {person.profileImageUrl ? (
            <PreviewAvatar src={person.profileImageUrl} alt={person.name} />
          ) : (
            <PreviewAvatarPh $color={era.color}>
              <svg viewBox="0 0 24 24" fill="currentColor" width={32} height={32}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </PreviewAvatarPh>
          )}
          <PreviewHeaderText>
            <PreviewName>{person.name}</PreviewName>
            {person.primaryTitle && (
              <PreviewTitle>{person.primaryTitle}</PreviewTitle>
            )}
            <PreviewEra $color={era.color}>
              <span />
              {era.lbl}
            </PreviewEra>
          </PreviewHeaderText>
        </PreviewHeader>

        <PreviewMetaGrid>
          <PreviewMetaRow>
            <PreviewMetaKey>생몰</PreviewMetaKey>
            <PreviewMetaVal>
              {born} – {died}
              {age ? ` · ${age}` : ''}
            </PreviewMetaVal>
          </PreviewMetaRow>
          <PreviewMetaRow>
            <PreviewMetaKey>국가 / 파벌</PreviewMetaKey>
            <PreviewMetaVal>
              {person.country}
              {person.faction ? ` · ${person.faction}` : ''}
            </PreviewMetaVal>
          </PreviewMetaRow>
          <PreviewMetaRow>
            <PreviewMetaKey>지역 / 분야</PreviewMetaKey>
            <PreviewMetaVal>
              {person.region} · {person.field}
            </PreviewMetaVal>
          </PreviewMetaRow>
          <PreviewMetaRow>
            <PreviewMetaKey>영향력</PreviewMetaKey>
            <PreviewMetaVal>
              <PreviewInfluenceBar>
                <PreviewInfluenceFill
                  style={{
                    width: `${Math.min(100, Math.max(0, person.influence))}%`,
                    background: era.color,
                  }}
                />
              </PreviewInfluenceBar>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: theme.colors.text.secondary,
                  marginLeft: 8,
                }}
              >
                {person.influence}
              </span>
            </PreviewMetaVal>
          </PreviewMetaRow>
        </PreviewMetaGrid>

        {person.biography && (
          <PreviewBio>{person.biography}</PreviewBio>
        )}

        <PreviewActions>
          <PreviewSecondaryBtn type="button" onClick={onClose}>
            닫기
          </PreviewSecondaryBtn>
          <PreviewPrimaryBtn
            type="button"
            onClick={() => onOpenDetail(person.id)}
            autoFocus
          >
            상세 보기
            <FiArrowRight size={16} />
          </PreviewPrimaryBtn>
        </PreviewActions>
      </PreviewCard>
    </PreviewOverlay>,
    document.body,
  )
}

const MatrixScroll = styled.div`overflow-x: auto; ${scrollbarThinMixin}`
const MatrixTooltip = styled.div`
  position: fixed; z-index: 50; pointer-events: none;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 10px; min-width: 180px; max-width: 280px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(20,20,25,0.95); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 8px 24px rgba(0,0,0,0.4);`
      : css`background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(0,0,0,0.12);`}
`
const MatrixTooltipImg = styled.img`
  width: 44px; height: 44px; border-radius: 8px; object-fit: cover; object-position: top center; flex-shrink: 0;
`
const MatrixTooltipImgPh = styled.div<{ $color: string }>`
  width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $color }) => $color}18; color: ${({ $color }) => $color}; opacity: 0.7;
`
const MatrixLabels = styled.div`
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : theme.colors.background.secondary};
`
const MatrixAxisRow = styled.div`height: 30px; display: flex; align-items: center; padding: 0 12px;`
const MatrixAxisTxt = styled.span`font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${({ theme }) => theme.colors.text.tertiary};`
const MatrixLabelRow = styled.div`
  display: flex; align-items: center; gap: 6px; padding: 0 10px;
  border-top: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

// ================================================================
// VIEW 2: 국가 은하계
// ================================================================
function fieldSvgPath(field: string, cx: number, cy: number, r: number): string {
  switch (field) {
    case '정치': return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`
    case '군사': { const h = r * 0.87; return `M${cx},${cy - r} L${cx + h},${cy + r * 0.5} L${cx - h},${cy + r * 0.5} Z` }
    case '과학': { const pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}` }); return `M${pts.join(' L')} Z` }
    default: return `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
  }
}

/**
 * 은하계 — 단일 산점도 (한 우주, 모든 인물).
 *
 * x = 활동 연도, y = 영향력
 * **색 = 지역(대륙)** — 지역 클러스터 시각 인지 (시대는 시간 위치로 자연 인지)
 * 시대는 배경 영역으로 표시 (별도 차원)
 * 모양은 모두 원 — 작은 점에서 모양 차이 무의미
 * 같은 좌표 인물은 jitter로 살짝 분산 (겹침 방지)
 */
const REGION_COLOR_MAP: Record<string, string> = REGIONS.reduce(
  (acc, r, i) => {
    acc[r] = REGION_COLORS[i % REGION_COLORS.length]
    return acc
  },
  {} as Record<string, string>,
)

/** 결정적 jitter — 인물 ID 기반, 같은 인물은 항상 같은 offset */
function deterministicJitter(id: string, range: number): { dx: number; dy: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const dx = ((h % 1000) / 1000 - 0.5) * 2 * range
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 2 * range
  return { dx, dy }
}
function GalaxyView({
  people,
  onOpen,
}: {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
}) {
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

  // 컨테이너 폭 자동 추적
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

  // viewport 높이 추적 (vh 기반 차트 높이)
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const toggleScope = usePersonInfographicFilterStore((s) => s.toggleScope)
  const clearAllScopes = usePersonInfographicFilterStore(
    (s) => s.clearAllScopes,
  )
  const hasActiveFilter =
    scopes.era.length +
      scopes.region.length +
      scopes.field.length +
      scopes.country.length >
    0
  const isActiveByScope = (p: AdaptedPerson): boolean => {
    if (!hasActiveFilter) return true
    const eraKey = yearOfEra(p.activityYear).key
    if (scopes.era.length > 0 && !scopes.era.includes(eraKey)) return false
    if (scopes.region.length > 0 && !scopes.region.includes(p.region)) return false
    if (scopes.field.length > 0 && !scopes.field.includes(p.field)) return false
    if (scopes.country.length > 0 && !scopes.country.includes(p.country))
      return false
    return true
  }

  if (!people.length) return <EmptyState>인물 데이터가 없습니다.</EmptyState>

  // 좌표계 — 모든 인물 공통 시간축 (vh 기반 — 640–1100 clamp)
  const CHART_H = Math.max(640, Math.min(1100, Math.round(vh * 0.9)))
  const PADDING = { left: 50, right: 24, top: 18, bottom: 36 }
  const innerW = W - PADDING.left - PADDING.right
  const innerH = CHART_H - PADDING.top - PADDING.bottom

  const minYr = Math.min(...people.map((p) => p.activityYear))
  const maxYr = Math.max(...people.map((p) => p.activityYear))
  // 양 끝 5% 여유
  const yrPad = (maxYr - minYr) * 0.03
  const X_MIN = minYr - yrPad
  const X_MAX = maxYr + yrPad
  const xRange = Math.max(1, X_MAX - X_MIN)

  const xPos = (yr: number) =>
    PADDING.left + ((yr - X_MIN) / xRange) * innerW
  const yPos = (inf: number) =>
    PADDING.top + (1 - inf / 100) * innerH

  // 연도 눈금 — 적절한 간격 (대략 8개)
  const tickStep = pickTickStep(xRange / 8)
  const xTicks: number[] = []
  for (
    let y = Math.ceil(X_MIN / tickStep) * tickStep;
    y <= X_MAX;
    y += tickStep
  )
    xTicks.push(y)

  const axisStroke = theme.colors.border.default
  const gridStroke = theme.colors.border.light
  const labelColor = theme.colors.text.tertiary

  // 활성 인물을 위에 그리기 위해 정렬 (비활성이 먼저, 활성이 나중)
  const ordered = [...people].sort((a, b) => {
    const aActive = isActiveByScope(a) ? 1 : 0
    const bActive = isActiveByScope(b) ? 1 : 0
    return aActive - bActive
  })

  // 데이터 있는 region만 범례 표시 (S5)
  const regionCounts: Record<string, number> = {}
  for (const p of people) {
    regionCounts[p.region] = (regionCounts[p.region] ?? 0) + 1
  }
  const visibleRegions = REGIONS.filter((r) => (regionCounts[r] ?? 0) > 0)

  // 라벨 collision 처리 (S1) — 영향력 높은 순으로 배치, 거리 부족하면 skip
  const labelCandidates = ordered
    .filter((p) => p.influence >= 60 && isActiveByScope(p))
    .map((p) => {
      const baseX = xPos(p.activityYear)
      const baseY = yPos(p.influence)
      const { dx, dy } = deterministicJitter(p.id, 6)
      return { p, x: baseX + dx, y: baseY + dy }
    })
    .sort((a, b) => b.p.influence - a.p.influence)

  const placedLabels: Array<{
    p: AdaptedPerson
    x: number
    y: number
    above: boolean
  }> = []
  const MIN_X_DIST = 52
  const Y_BAND = 14
  for (const cand of labelCandidates) {
    if (placedLabels.length >= 50) break
    // 같은 y 밴드에서 너무 가까이 놓인 라벨 검사
    const collidesAbove = placedLabels.some(
      (l) =>
        l.above &&
        Math.abs(l.x - cand.x) < MIN_X_DIST &&
        Math.abs(l.y - cand.y) < Y_BAND,
    )
    const collidesBelow = placedLabels.some(
      (l) =>
        !l.above &&
        Math.abs(l.x - cand.x) < MIN_X_DIST &&
        Math.abs(l.y - cand.y) < Y_BAND,
    )
    if (!collidesAbove) {
      placedLabels.push({ ...cand, above: true })
    } else if (!collidesBelow) {
      placedLabels.push({ ...cand, above: false })
    }
    // 둘 다 충돌하면 skip
  }

  // G1: 활성 인물 수
  const activeCount = hasActiveFilter
    ? people.filter(isActiveByScope).length
    : people.length

  // G4: density underlay — 점이 많을 때만 (300+)
  const showDensity = people.length >= 300
  const densityBins: Array<{ x: number; y: number; intensity: number }> = []
  if (showDensity) {
    const BIN = 36
    const map = new Map<string, number>()
    for (const p of people) {
      const baseX = xPos(p.activityYear)
      const baseY = yPos(p.influence)
      const bx = Math.floor(baseX / BIN)
      const by = Math.floor(baseY / BIN)
      const key = `${bx}:${by}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    let max = 1
    for (const v of map.values()) if (v > max) max = v
    for (const [k, count] of map.entries()) {
      const [bx, by] = k.split(':').map(Number)
      densityBins.push({
        x: bx * BIN,
        y: by * BIN,
        intensity: count / max,
      })
    }
  }
  const BIN_SIZE = 36

  return (
    <ViewPanel>
      <ViewPanelHeader>
        <ViewPanelTitle>인물 은하계</ViewPanelTitle>
        <ViewPanelDesc>가로 = 활동연도 · 세로 = 영향력 · 색 = 지역 · 시대 = 배경</ViewPanelDesc>
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
            const isActive = scopes.region.includes(r)
            return (
              <ViewLegendItem
                key={r}
                $active={isActive}
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
      {/* G2: ERAS 범례 — 별도 행 */}
      <ViewLegendRow>
        <ViewLegendRowLabel>시대</ViewLegendRowLabel>
        {ERAS.map((e) => {
          const isActive = scopes.era.includes(e.key)
          return (
            <ViewLegendItem
              key={e.key}
              $active={isActive}
              $color={e.color}
              onClick={() => toggleScope('era', e.key)}
              style={{ cursor: 'pointer' }}
            >
              <span style={{ background: e.color }} />
              {e.lbl}
            </ViewLegendItem>
          )
        })}
      </ViewLegendRow>
      <GalaxyChartWrap ref={containerRef}>
        <svg
          width={W}
          height={CHART_H}
          style={{ display: 'block' }}
        >
          {/* G4: density underlay — 점이 많을 때만 */}
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

          {/* 시대 배경 영역 — 활성 시 진하게 */}
          {ERAS.map((e) => {
            const x1 = Math.max(PADDING.left, xPos(Math.max(e.from, X_MIN)))
            const x2 = Math.min(
              W - PADDING.right,
              xPos(Math.min(e.to, X_MAX)),
            )
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

          {/* y axis grid (영향력 25/50/75) */}
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

          {/* y axis */}
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={CHART_H - PADDING.bottom}
            stroke={axisStroke}
            strokeWidth={1}
          />
          {/* x axis */}
          <line
            x1={PADDING.left}
            y1={CHART_H - PADDING.bottom}
            x2={W - PADDING.right}
            y2={CHART_H - PADDING.bottom}
            stroke={axisStroke}
            strokeWidth={1}
          />

          {/* y axis labels */}
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

          {/* x axis labels */}
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

          {/* 시대 라벨 (배경 영역 위쪽) */}
          {ERAS.map((e) => {
            const x1 = Math.max(PADDING.left, xPos(Math.max(e.from, X_MIN)))
            const x2 = Math.min(
              W - PADDING.right,
              xPos(Math.min(e.to, X_MAX)),
            )
            if (x2 - x1 < 40) return null
            const isActive = scopes.era.includes(e.key)
            return (
              <text
                key={'lbl-' + e.key}
                x={(x1 + x2) / 2}
                y={PADDING.top + 12}
                textAnchor="middle"
                fontSize={10}
                fill={e.color}
                fontWeight={isActive ? 800 : 600}
                opacity={
                  scopes.era.length > 0 && !isActive ? 0.4 : 0.85
                }
                style={{ cursor: 'pointer' }}
                onClick={() => toggleScope('era', e.key)}
              >
                {e.lbl}
              </text>
            )
          })}

          {/* 인물 점 — 색=지역, 모양=원, 사이즈=영향력, 같은 좌표 jitter */}
          {ordered.map((p) => {
            const baseX = xPos(p.activityYear)
            const baseY = yPos(p.influence)
            const { dx, dy } = deterministicJitter(p.id, 6)
            const x = baseX + dx
            const y = baseY + dy
            const color = REGION_COLOR_MAP[p.region] ?? theme.colors.text.tertiary
            const active = isActiveByScope(p)
            const isHovered = hoveredId === p.id
            // S2: 점 크기 = 영향력 비례 (4-10)
            const baseR = 4 + (p.influence / 100) * 6
            const r = isHovered ? baseR + 1.5 : baseR
            // S3: 비활성 opacity 0.1 → 0.18
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
                onMouseMove={(e) =>
                  setHover({ p, x: e.clientX, y: e.clientY })
                }
                onMouseLeave={() => {
                  setHover(null)
                  setHoveredId(null)
                }}
              >
                {/* 모바일·터치 hit area (r+10) */}
                <circle cx={x} cy={y} r={r + 10} fill="transparent" />
                {/* glow — hover 시 강화 */}
                <circle
                  cx={x}
                  cy={y}
                  r={r + (isHovered ? 6 : 4)}
                  fill={color}
                  opacity={op * (isHovered ? 0.32 : 0.2)}
                />
                {/* S4: 활성 점 흰색 외곽 ring (배경 대비 강화) */}
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
                {/* point — 모두 원 */}
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

          {/* 영향력 ≥60 활성 인물 라벨 — collision 회피 (S1) */}
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
        {/* G3: 활성 결과 0건 안내 */}
        {hasActiveFilter && activeCount === 0 && (
          <EmptyOverlay>
            <EmptyOverlayTitle>조건에 맞는 인물이 없습니다</EmptyOverlayTitle>
            <EmptyOverlayDesc>
              현재 필터에 일치하는 인물이 없어요. 필터를 해제해 전체를
              보세요.
            </EmptyOverlayDesc>
            <EmptyOverlayBtn type="button" onClick={clearAllScopes}>
              필터 모두 해제
            </EmptyOverlayBtn>
          </EmptyOverlay>
        )}
      </GalaxyChartWrap>
      {hover && (
        <MatrixTooltip style={{ top: hover.y + 14, left: hover.x + 14 }}>
          {hover.p.profileImageUrl ? (
            <MatrixTooltipImg src={hover.p.profileImageUrl} alt={hover.p.name} />
          ) : (
            <MatrixTooltipImgPh $color={yearOfEra(hover.p.activityYear).color}>
              <svg viewBox="0 0 24 24" fill="currentColor" width={22} height={22}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </MatrixTooltipImgPh>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.colors.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {hover.p.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.colors.text.secondary,
                marginTop: 2,
              }}
            >
              {hover.p.country} · {hover.p.field}
            </div>
            <div
              style={{
                fontSize: 10,
                color: theme.colors.text.tertiary,
                marginTop: 3,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {hover.p.born < 0 ? `${-hover.p.born}BC` : hover.p.born} –{' '}
              {hover.p.died < 0 ? `${-hover.p.died}BC` : hover.p.died} · 영향력{' '}
              {hover.p.influence}
            </div>
          </div>
        </MatrixTooltip>
      )}
    </ViewPanel>
  )
}

/** 적당한 눈금 간격 선택 (1, 2, 5, 10, 20, 50, 100, ...) */
function pickTickStep(target: number): number {
  const exp = Math.floor(Math.log10(Math.max(1, target)))
  const base = Math.pow(10, exp)
  const norm = target / base
  let mult = 1
  if (norm > 5) mult = 10
  else if (norm > 2) mult = 5
  else if (norm > 1) mult = 2
  return mult * base
}

const GalaxyChartWrap = styled.div`
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

const ViewLegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
`

const ViewLegendRowLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 600;
  margin-right: 6px;
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

// ================================================================
// 공용 인물 카드
// ================================================================
type EraConf = { color: string; lbl: string }
interface PersonCardProps {
  p: AdaptedPerson
  era: EraConf
  q: string
  pinned: boolean
  onTogglePin: (id: string, e: React.MouseEvent) => void
  onOpen: (id: string) => void
}
function PersonCardItem({ p, era, q, pinned, onTogglePin, onOpen }: PersonCardProps) {
  const bioTooltip = p.biography
    ? p.biography
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 240)
    : undefined
  return (
    <EraCard
      $pinned={pinned}
      title={bioTooltip}
      onClick={() => onOpen(p.id)}
    >
      <EraCardThumbWrap $color={era.color}>
        {p.profileImageUrl ? (
          <EraCardThumbImg src={p.profileImageUrl} alt={p.name} loading="lazy" />
        ) : (
          <EraCardThumbGradient $color={era.color}>
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={46} height={46}>
              <circle cx="24" cy="18" r="8" />
              <path d="M8 40c0-8.8 7.2-14 16-14s16 5.2 16 14" />
            </svg>
          </EraCardThumbGradient>
        )}
        {(p.isMonarch || p.isHeadOfState) && (
          <EraCardBadge
            title={p.isMonarch ? '군주' : '국가원수'}
            style={{ background: p.isMonarch ? '#b45309' : '#1d4ed8' }}
          >
            {p.isMonarch ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                <path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5zm0 2v2h14v-2H5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11}>
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            )}
          </EraCardBadge>
        )}
        <EraCardPin
          $active={pinned}
          onClick={(e) => onTogglePin(p.id, e)}
          title={pinned ? '핀 해제' : '핀 고정'}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} width={12} height={12}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </EraCardPin>
        <EraCardFieldTag $color={era.color}>{p.field}</EraCardFieldTag>
      </EraCardThumbWrap>
      <EraCardBody>
        <EraName title={p.name}>{highlight(p.name, q)}</EraName>
        {p.primaryTitle && (
          <EraPrimaryTitle title={p.primaryTitle}>{p.primaryTitle}</EraPrimaryTitle>
        )}
        <EraCountryRow>
          <EraCountryName title={p.country}>{p.country}</EraCountryName>
          {p.faction && <EraFaction title={p.faction}>· {p.faction}</EraFaction>}
        </EraCountryRow>
        <EraYear>
          {p.born < 0 ? `${-p.born}BC` : p.born}
          {' – '}
          {p.isAlive ? '현재' : p.died < 0 ? `${-p.died}BC` : p.died}
          {p.age != null && ` · ${p.age}세`}
        </EraYear>
        <EraInfluenceRow>
          <EraBarTrack>
            <EraBarFill style={{ width: p.influence + '%', background: era.color }} />
          </EraBarTrack>
          <EraInfluenceValue>{p.influence}</EraInfluenceValue>
        </EraInfluenceRow>
      </EraCardBody>
    </EraCard>
  )
}

// ================================================================
// VIEW 3: 시대 스토리
// ================================================================
function EraStory({
  people,
  onOpen,
  q,
  pinned,
  togglePin,
}: {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  q: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}) {
  const theme = useTheme()
  const [sort, setSort] = useState<'influence' | 'name' | 'year' | 'deathYear'>('influence')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const TOP_N = 20

  const sortFn = (a: AdaptedPerson, b: AdaptedPerson) => {
    const pa = pinned.has(a.id), pb = pinned.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'year') return a.born - b.born
    if (sort === 'deathYear') return b.died - a.died
    return b.influence - a.influence
  }

  const byEra: Record<string, AdaptedPerson[]> = {}
  people.forEach((p) => { const k = yearOfEra(p.activityYear).key; (byEra[k] = byEra[k] || []).push(p) })
  if (!Object.values(byEra).some((a) => a.length > 0)) return <EmptyState>인물 데이터가 없습니다.</EmptyState>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <EraSortBar>
        <EraSortLabel>정렬</EraSortLabel>
        {([['influence', '영향력'], ['name', '이름'], ['year', '출생연도'], ['deathYear', '사망연도']] as const).map(([k, lbl]) => (
          <EraSortBtn key={k} $active={sort === k} onClick={() => setSort(k)}>{lbl}</EraSortBtn>
        ))}
      </EraSortBar>
      {ERAS.map((era) => {
        const arr = (byEra[era.key] || []).slice().sort(sortFn)
        if (!arr.length) return null
        const isExpanded = !!expanded[era.key]
        const shown = isExpanded ? arr : arr.slice(0, TOP_N)
        const hasMore = arr.length > TOP_N
        return (
          <EraBlock key={era.key}>
            <EraBlockHdr>
              <span style={{ fontSize: 20, fontWeight: 700, color: era.color }}>{era.lbl}</span>
              <span style={{ fontSize: 11, color: theme.colors.text.tertiary }}>{era.from < 0 ? `${-era.from}BC` : era.from} — {era.to}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.text.tertiary }}>{arr.length}명</span>
            </EraBlockHdr>
            <EraCardGrid>
              {shown.map((p) => (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={era}
                  q={q}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              ))}
            </EraCardGrid>
            {hasMore && (
              <EraMoreBtn onClick={() => setExpanded((prev) => ({ ...prev, [era.key]: !prev[era.key] }))}>
                {isExpanded ? '접기' : `+ ${arr.length - TOP_N}명 더보기`}
              </EraMoreBtn>
            )}
          </EraBlock>
        )
      })}
    </div>
  )
}

// ================================================================
// VIEW 4: 왕조별 그룹핑
// ================================================================
function DynastyView({
  people,
  onOpen,
  q,
  pinned,
  togglePin,
}: {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  q: string
  pinned: Set<string>
  togglePin: (id: string, e: React.MouseEvent) => void
}) {
  const theme = useTheme()
  const byFaction: Record<string, AdaptedPerson[]> = {}
  const noFaction: AdaptedPerson[] = []
  people.forEach((p) => {
    if (p.faction) (byFaction[p.faction] = byFaction[p.faction] || []).push(p)
    else noFaction.push(p)
  })
  const factions = Object.entries(byFaction).sort((a, b) => b[1].length - a[1].length)
  if (!factions.length && !noFaction.length) return <EmptyState>인물 데이터가 없습니다.</EmptyState>

  const sortFn = (a: AdaptedPerson, b: AdaptedPerson) => {
    const pa = pinned.has(a.id), pb = pinned.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    return a.born - b.born
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {factions.map(([faction, arr]) => {
        const sorted = arr.slice().sort(sortFn)
        const minYr = Math.min(...arr.map((p) => p.born))
        const maxYr = Math.max(...arr.map((p) => p.died))
        const countryName = arr[0]?.country ?? ''
        return (
          <EraBlock key={faction}>
            <EraBlockHdr>
              <span style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text.primary }}>{faction}</span>
              <span style={{ fontSize: 11, color: theme.colors.text.tertiary }}>
                {countryName} · {minYr < 0 ? `${-minYr}BC` : minYr}–{maxYr < 0 ? `${-maxYr}BC` : maxYr}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.text.tertiary }}>{arr.length}명</span>
            </EraBlockHdr>
            <EraCardGrid>
              {sorted.map((p) => {
                const era = yearOfEra(p.activityYear)
                return (
                  <PersonCardItem
                    key={p.id}
                    p={p}
                    era={era}
                    q={q}
                    pinned={pinned.has(p.id)}
                    onTogglePin={togglePin}
                    onOpen={onOpen}
                  />
                )
              })}
            </EraCardGrid>
          </EraBlock>
        )
      })}
      {noFaction.length > 0 && (
        <EraBlock>
          <EraBlockHdr>
            <span style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text.secondary }}>소속 없음</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.text.tertiary }}>{noFaction.length}명</span>
          </EraBlockHdr>
          <EraCardGrid>
            {noFaction.slice().sort(sortFn).map((p) => {
              const era = yearOfEra(p.activityYear)
              return (
                <PersonCardItem
                  key={p.id}
                  p={p}
                  era={era}
                  q={q}
                  pinned={pinned.has(p.id)}
                  onTogglePin={togglePin}
                  onOpen={onOpen}
                />
              )
            })}
          </EraCardGrid>
        </EraBlock>
      )}
    </div>
  )
}

const EraBlock = styled.div`
  border-radius: 12px; padding: 16px 18px;
  ${({ theme }) => glassOrSolidMixin(theme)}
`
const EraBlockHdr = styled.div`display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px;`
const EraSortBar = styled.div`
  display: flex; align-items: center; gap: 4px; padding: 0 2px;
`
const EraSortLabel = styled.span`
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
`
const EraSortBtn = styled.button<{ $active: boolean }>`
  padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer;
  font-size: 11px; transition: background 0.12s, color 0.12s;
  ${({ $active, theme }) =>
    $active
      ? css`background: ${theme.mode === 'dark' ? 'rgba(99,106,242,0.22)' : '#eef2ff'}; color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'}; font-weight: 600;`
      : css`background: transparent; color: ${theme.colors.text.secondary}; &:hover { background: ${theme.colors.hover}; color: ${theme.colors.text.primary}; }`}
`
const EraCardGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(172px, 1fr)); gap: 12px;`
const EraCard = styled.div<{ $pinned?: boolean }>`
  border-radius: 12px; cursor: pointer; overflow: hidden;
  display: flex; flex-direction: column; transition: transform 0.14s, box-shadow 0.14s, background 0.14s;
  ${({ theme, $pinned }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255,255,255,0.04);
          border: 1px solid ${$pinned ? '#fbbf24' : 'rgba(255,255,255,0.07)'};
          &:hover { background: rgba(255,255,255,0.07); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.3); }
        `
      : css`
          background: ${theme.colors.background.secondary};
          border: 1px solid ${$pinned ? '#f59e0b' : theme.colors.border.light};
          &:hover { background: ${theme.colors.background.tertiary}; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
        `}
`
const EraCardThumbWrap = styled.div<{ $color: string }>`
  position: relative; width: 100%; aspect-ratio: 4 / 3; overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
`
const EraCardThumbImg = styled.img`
  width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block;
`
const EraCardThumbGradient = styled.div<{ $color: string }>`
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  ${({ theme, $color }) =>
    theme.mode === 'dark'
      ? css`
          background:
            radial-gradient(circle at 30% 25%, ${$color}22, transparent 62%),
            linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
          color: ${$color};
          opacity: 0.88;
        `
      : css`
          background:
            radial-gradient(circle at 30% 25%, ${$color}1a, transparent 65%),
            linear-gradient(160deg, #ffffff, #eef1f5);
          color: ${$color};
          opacity: 0.72;
        `}
`
const EraCardBadge = styled.div`
  position: absolute; top: 6px; left: 6px;
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
`
const EraCardPin = styled.button<{ $active: boolean }>`
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.14s, color 0.14s, transform 0.14s, opacity 0.14s;
  ${({ $active }) =>
    $active
      ? css`background: #fbbf24; color: #1f1200; opacity: 1;`
      : css`
          background: rgba(0,0,0,0.4); color: #fff;
          opacity: 0;
          ${EraCard}:hover &, &:focus-visible {
            opacity: 1;
          }
          &:hover { background: rgba(0,0,0,0.6); transform: scale(1.08); }
        `}
`
const EraCardFieldTag = styled.span<{ $color: string }>`
  position: absolute; bottom: 6px; right: 6px;
  font-size: 9px; font-weight: 600; padding: 3px 7px; border-radius: 10px;
  background: ${({ $color }) => $color}ee; color: #fff;
  letter-spacing: 0.02em;
`
const EraPrimaryTitle = styled.div`
  font-size: 12px; font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`
const HLMark = styled.mark`
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(251,191,36,0.35)' : '#fef3c7'};
  color: inherit;
  padding: 0 1px; border-radius: 2px;
`
const EraCardBody = styled.div`
  padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 5px;
`
const EraName = styled.div`
  font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`
const EraCountryRow = styled.div`display: flex; align-items: center; gap: 5px; min-width: 0;`
const EraCountryName = styled.span`
  font-size: 11px; font-weight: 500; color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; max-width: 60%;
`
const EraFaction = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
`
const EraYear = styled.div`font-size: 11px; color: ${({ theme }) => theme.colors.text.tertiary}; font-variant-numeric: tabular-nums;`
const EraInfluenceRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-top: 2px;
`
const EraInfluenceValue = styled.span`
  font-size: 11px; font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  min-width: 20px; text-align: right;
`
const EraBarTrack = styled.div`
  flex: 1; height: 5px; border-radius: 3px; overflow: hidden;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
`
const EraBarFill = styled.div`height: 100%; border-radius: 3px; transition: width 0.3s;`
const EraMoreBtn = styled.button`
  margin: 12px auto 0; display: block;
  padding: 6px 16px; border-radius: 16px; border: none; cursor: pointer;
  font-size: 11px; font-weight: 500; transition: background 0.12s, color 0.12s;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.06); color: ${theme.colors.text.secondary}; &:hover { background: rgba(255,255,255,0.12); color: ${theme.colors.text.primary}; }`
      : css`background: #f3f4f6; color: ${theme.colors.text.secondary}; &:hover { background: #e5e7eb; color: ${theme.colors.text.primary}; }`}
`

// ================================================================
// 뷰 공통 컨테이너
// ================================================================
const ViewPanel = styled.div`
  border-radius: 12px;
  overflow: hidden;
  ${({ theme }) => glassOrSolidMixin(theme)}
`
const ViewPanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`
const ViewPanelTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`
const ViewPanelDesc = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
const ViewLegend = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-wrap: wrap;
`
const ViewLegendItem = styled.button<{ $active?: boolean; $color: string }>`
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  color: ${({ $color }) => $color};
  background: ${({ $active, $color }) => ($active ? `${$color}1f` : 'transparent')};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};

  > span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
`
const PreviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  animation: previewOverlayIn 0.16s ease;
  @keyframes previewOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`
const PreviewCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
  padding: 22px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: previewCardIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  @keyframes previewCardIn {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`
const PreviewClose = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
const PreviewHeader = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
`
const PreviewAvatar = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  object-position: top center;
  flex-shrink: 0;
`
const PreviewAvatarPh = styled.div<{ $color: string }>`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
`
const PreviewHeaderText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`
const PreviewName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const PreviewTitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const PreviewEra = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}1f;
  align-self: flex-start;
  margin-top: 2px;
  > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`
const PreviewMetaGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 10px;
`
const PreviewMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
`
const PreviewMetaKey = styled.span`
  width: 76px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 500;
`
const PreviewMetaVal = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const PreviewInfluenceBar = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.border.light};
  overflow: hidden;
  max-width: 180px;
`
const PreviewInfluenceFill = styled.div`
  height: 100%;
  border-radius: 3px;
  transition: width 0.18s ease;
`
const PreviewBio = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
const PreviewActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`
const PreviewSecondaryBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
const PreviewPrimaryBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover {
    filter: brightness(1.08);
  }
`
const MatrixFilterBadge = styled.span`
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
const EmptyState = styled.div`
  padding: 60px 0; text-align: center; font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ================================================================
// 검색 인풋
// ================================================================
const SearchRow = styled.div`
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;
`
const SearchBox = styled.div`
  display: flex; align-items: center; gap: 7px; flex: 1; max-width: 320px; height: 36px; padding: 0 12px; border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);`
      : css`background: ${theme.colors.background.secondary}; border: 1px solid ${theme.colors.border.default};`}
`
const SearchInput = styled.input`
  flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder { color: ${({ theme }) => theme.colors.text.tertiary}; }
`
const SearchIconWrap = styled.span`color: ${({ theme }) => theme.colors.text.tertiary}; display: flex; align-items: center; flex-shrink: 0;`
const ClearBtn = styled.button`background: none; border: none; cursor: pointer; color: ${({ theme }) => theme.colors.text.tertiary}; padding: 0 2px; line-height: 1; display: flex; align-items: center; &:hover { color: ${({ theme }) => theme.colors.text.primary}; }`
const AddPersonBtn = styled.button`
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: #6366f1; color: #fff;
  transition: background 0.14s;
  &:hover { background: #4f46e5; }
`

const StatsToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.14s, color 0.14s, border-color 0.14s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    border-color: transparent;
  }
`

// ================================================================
// MAIN CONTENT (인포그래픽 중앙 영역)
// ================================================================
interface InfographicContentProps {
  /** 인물 카드/아이템 클릭 시 상세로 이동 */
  onPersonClick: (id: string) => void
}

export function InfographicContent({ onPersonClick }: InfographicContentProps) {
  const { data: rawPersons, isLoading } = usePersons()

  const scopes = usePersonInfographicFilterStore((s) => s.scopes)
  const toggleScope = usePersonInfographicFilterStore((s) => s.toggleScope)
  const clearAllScopes = usePersonInfographicFilterStore(
    (s) => s.clearAllScopes,
  )
  const view = usePersonInfographicFilterStore((s) => s.view)
  const q = usePersonInfographicFilterStore((s) => s.query)
  const setQ = usePersonInfographicFilterStore((s) => s.setQuery)
  const minInfluence = usePersonInfographicFilterStore((s) => s.minInfluence)
  const aliveFilter = usePersonInfographicFilterStore((s) => s.aliveFilter)
  const pinnedList = usePersonInfographicFilterStore((s) => s.pinned)
  const storeTogglePin = usePersonInfographicFilterStore((s) => s.togglePin)

  const pinned = useMemo(() => new Set(pinnedList), [pinnedList])
  const togglePin = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      storeTogglePin(id)
    },
    [storeTogglePin],
  )

  const [formOpen, setFormOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  // 통계 차트 접힘 (B2) — 기본 접힘. localStorage persist.
  const STATS_KEY = 'person-infographic-stats-open'
  const [statsOpen, setStatsOpen] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(STATS_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggleStats = React.useCallback(() => {
    setStatsOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STATS_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const allPeople = useMemo<AdaptedPerson[]>(() => {
    if (!rawPersons) return []
    return (rawPersons as Person[]).map(adapt).filter((p): p is AdaptedPerson => p !== null)
  }, [rawPersons])

  const filtered = useMemo(() => {
    let arr = allPeople
    if (scopes.era.length > 0)
      arr = arr.filter((p) => scopes.era.includes(yearOfEra(p.activityYear).key))
    if (scopes.region.length > 0)
      arr = arr.filter((p) => scopes.region.includes(p.region))
    if (scopes.field.length > 0)
      arr = arr.filter((p) => scopes.field.includes(p.field))
    if (scopes.country.length > 0)
      arr = arr.filter((p) => scopes.country.includes(p.country))
    if (minInfluence > 0) arr = arr.filter((p) => p.influence >= minInfluence)
    if (aliveFilter === 'alive') arr = arr.filter((p) => p.isAlive)
    else if (aliveFilter === 'dead') arr = arr.filter((p) => !p.isAlive)
    if (q.trim()) {
      const qq = q.toLowerCase()
      arr = arr.filter((p) =>
        p.name.toLowerCase().includes(qq) ||
        p.country.toLowerCase().includes(qq) ||
        p.faction.toLowerCase().includes(qq) ||
        (p.primaryTitle?.toLowerCase().includes(qq) ?? false),
      )
    }
    return arr
  }, [allPeople, scopes, q, minInfluence, aliveFilter])

  // 활성 scope 라벨 — 단일이면 그 값, 다중이면 "필터링됨". 모두 비면 "전체 인물".
  const totalScopeCount =
    scopes.era.length + scopes.region.length + scopes.field.length + scopes.country.length
  const scopeLabel =
    totalScopeCount === 0
      ? '전체 인물'
      : totalScopeCount === 1
        ? scopes.era[0]
          ? (ERAS.find((e) => e.key === scopes.era[0])?.lbl ?? scopes.era[0])
          : (scopes.region[0] ?? scopes.field[0] ?? scopes.country[0] ?? '필터링됨')
        : `${totalScopeCount}개 필터 적용됨`

  const avgLifespan = filtered.length ? Math.round(filtered.reduce((s, p) => s + Math.abs(p.died - p.born), 0) / filtered.length) : 0

  // 뷰 스위처에서 'cards' 이외의 뷰만 이 콘텐츠가 다룸. (cards는 PersonListContent가 처리.)
  const activeView: Exclude<PersonInfographicView, 'cards'> =
    view === 'cards' ? 'story' : view

  return (
    <motion.div
      key="infographic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <InfographicWrap>
        {/* 헤더 */}
        <PersonTabSharedHeader>
          <PersonTabSharedHeaderLeft>
            <PersonTabSharedTitle>
              {scopeLabel}
              {filtered.length > 0 && (
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 10 }}>
                  {filtered.length}명 · 평균 수명 {avgLifespan}년
                </span>
              )}
            </PersonTabSharedTitle>
          </PersonTabSharedHeaderLeft>
          <PersonTabSharedHeaderRight>
            <StatsToggleBtn
              type="button"
              onClick={toggleStats}
              aria-pressed={statsOpen}
              title={statsOpen ? '통계 숨기기' : '통계 보기'}
            >
              <FiBarChart2 size={13} />
              통계
            </StatsToggleBtn>
            <AddPersonBtn onClick={() => setFormOpen(true)}>
              <FiPlus size={14} />
              새 인물
            </AddPersonBtn>
          </PersonTabSharedHeaderRight>
        </PersonTabSharedHeader>

        {/* 검색 — 뷰 전환은 상위(PersonInfographicPane)의 뷰 스위처에서 처리 */}
        <SearchRow>
          <SearchBox>
            <SearchIconWrap><FiSearch size={13} /></SearchIconWrap>
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름, 국가, 소속 검색…" />
            {q && <ClearBtn onClick={() => setQ('')}><FiX size={13} /></ClearBtn>}
          </SearchBox>
        </SearchRow>

        {/* 인포그래픽 통계 스트립 — 기본 접힘 (B2). 펼침 토글은 헤더 우측에 */}
        {!isLoading && filtered.length > 0 && statsOpen && (
          <HeaderStats people={filtered} />
        )}

        {/* 로딩 */}
        {isLoading && <EmptyState>데이터를 불러오는 중…</EmptyState>}

        {/* 메인 뷰 */}
        {!isLoading && (
          <ViewArea>
            {activeView === 'matrix' && <TimelineMatrix people={filtered} onOpen={onPersonClick} />}
            {activeView === 'galaxy' && <GalaxyView people={filtered} onOpen={onPersonClick} />}
            {activeView === 'story' && <EraStory people={filtered} onOpen={onPersonClick} q={q} pinned={pinned} togglePin={togglePin} />}
            {activeView === 'dynasty' && <DynastyView people={filtered} onOpen={onPersonClick} q={q} pinned={pinned} togglePin={togglePin} />}
          </ViewArea>
        )}

        {/* 푸터 */}
        {!isLoading && filtered.length > 0 && (
          <Footer>
            <span>총 {filtered.length}명</span>
            <span>· 평균 영향력 {Math.round(filtered.reduce((s, p) => s + p.influence, 0) / filtered.length)}</span>
          </Footer>
        )}
      </InfographicWrap>

      {/* 모달 */}
      <PersonRegisterViewModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={() => setFormOpen(false)} />
      <PersonRegisterViewModal isOpen={editOpen} onClose={() => setEditOpen(false)} editPersonId={editId} onSuccess={() => setEditOpen(false)} />
    </motion.div>
  )
}


const InfographicWrap = styled.div`
  /* 상위(PersonInfographicPane)가 좌우/상단 padding을 담당. 여기서는 하단 여백만. */
  padding: 12px 0 60px;

  @media (max-width: 768px) {
    padding: 8px 0 40px;
  }
`

const EraChipRow = styled.div`
  display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 14px;
`
const EraChip = styled.button<{ $active: boolean; $color: string }>`
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.12s;
  border: 1px solid ${({ $color }) => $color}55;
  ${({ $active, $color }) =>
    $active
      ? css`background: ${$color}; color: #fff; border-color: ${$color};`
      : css`background: ${$color}10; color: ${$color}; &:hover { background: ${$color}22; }`}
`

const ViewArea = styled.div`margin-top: 18px;`
const Footer = styled.div`
  margin-top: 24px; display: flex; gap: 12px; font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
