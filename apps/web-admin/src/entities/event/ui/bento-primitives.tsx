import React from 'react'
import styled, { useTheme } from 'styled-components'

import {
  domainAccent,
  domainLabel,
  EVENT_DOMAIN_ORDER,
} from '@/entities/event/model/event-domain'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  MOTION,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

export interface CenturyDomainBucket {
  century: number
  total: number
  domains: Record<string, number>
}

/* ─── Bento Grid Layout Primitives ───────────────────────────────────────── */

export const BentoCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 18px 0 40px;
  box-sizing: border-box;
`

export const BentoGridAsym = styled.div<{ $leftFr?: number; $rightFr?: number }>`
  display: grid;
  grid-template-columns: ${({ $leftFr = 1.2, $rightFr = 1 }) =>
    `minmax(0, ${$leftFr}fr) minmax(0, ${$rightFr}fr)`};
  gap: 16px;
  align-items: stretch;

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;
  }
`

export const BentoGrid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

export const BentoGrid3Col = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

export const BentoCard = styled.section`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
  min-width: 0;
`

export const BentoCardHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const BentoCardTitleGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

export const BentoCardTitle = styled.h2`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const BentoCardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1.5px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

export const BentoHeaderActions = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const BentoActionBtn = styled.button<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? ledgerAccentBorder(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const BentoCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 15px 16px;
  flex: 1;
  min-width: 0;
`

export const BentoDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

export const BentoSubLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.01em;
`

export const BentoPill = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $accent }) =>
    $accent ? ledgerAccentSubtle(theme.mode) : ledgerSubtleFill(theme.mode)};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

/* ─── 1. Continental Percentile Bullet Bar ───────────────────────────────── */

export function PercentileBulletBar({
  rank,
  total,
  deltaPct,
  scopeLabel = '대륙',
}: {
  rank: number | null
  total: number | null
  deltaPct?: number | null
  scopeLabel?: string
}) {
  if (rank == null || total == null || total < 2) {
    return null
  }
  // 1위가 우측(100%), 꼴찌가 좌측(6%)에 오도록 백분위 산출
  const pct = Math.max(
    6,
    Math.min(100, Math.round(((total - rank + 1) / total) * 100)),
  )
  const deltaText =
    deltaPct != null && Number.isFinite(deltaPct)
      ? `평균 ${deltaPct >= 0 ? `+${Math.round(deltaPct)}%` : `${Math.round(deltaPct)}%`}`
      : null

  return (
    <BulletWrap>
      <BulletTrack aria-hidden="true">
        <BulletFill style={{ width: `${pct}%` }} />
        <BulletAvgTick title={`${scopeLabel} 중위 기준`} />
        <BulletDot style={{ left: `${pct}%` }} />
      </BulletTrack>
      <BulletMeta>
        <span>
          {scopeLabel} <strong>{rank}위</strong> / {total}국
        </span>
        {deltaText ? <span>{deltaText}</span> : null}
      </BulletMeta>
    </BulletWrap>
  )
}

const BulletWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 3px;
`

const BulletTrack = styled.div`
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'};
`

const BulletFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: 0.72;
`

const BulletAvgTick = styled.span`
  position: absolute;
  left: 50%;
  top: -2px;
  bottom: -2px;
  width: 1.5px;
  background: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.45;
`

const BulletDot = styled.span`
  position: absolute;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  border: 1.5px solid ${({ theme }) => ledgerBackground(theme.mode)};
`

const BulletMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/* ─── 2. HDI 0.00–1.00 4-Tier Segmented Scale Bar ────────────────────────── */

export function HdiScaleBar({ hdi }: { hdi: number }) {
  const clamped = Math.max(0, Math.min(1, hdi))
  const tierLabel =
    clamped >= 0.8
      ? '최상위 (Very High)'
      : clamped >= 0.7
        ? '상위 (High)'
        : clamped >= 0.55
          ? '중위 (Medium)'
          : '하위 (Low)'

  return (
    <BulletWrap>
      <HdiSegments aria-hidden="true">
        <HdiSeg $w={55} $opacity={0.18} />
        <HdiSeg $w={15} $opacity={0.32} />
        <HdiSeg $w={10} $opacity={0.5} />
        <HdiSeg $w={20} $opacity={0.78} />
        <BulletDot style={{ left: `${clamped * 100}%` }} />
      </HdiSegments>
      <BulletMeta>
        <span>
          <strong>{tierLabel}</strong>
        </span>
        <span>0.80 기준선</span>
      </BulletMeta>
    </BulletWrap>
  )
}

const HdiSegments = styled.div`
  position: relative;
  display: flex;
  gap: 2px;
  height: 6px;
  border-radius: 999px;
`

const HdiSeg = styled.div<{ $w: number; $opacity: number }>`
  flex: ${({ $w }) => $w} 1 0;
  border-radius: 2px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: ${({ $opacity }) => $opacity};
`

/* ─── 3. Proportional Stacked Segment Bar + Swatch Legend ────────────────── */

export interface SegmentSlice {
  key: string
  label: string
  value: number
  color: string
  meta?: string
}

export function StackedSegmentBar({
  slices,
  height = 9,
  showPercent = false,
}: {
  slices: SegmentSlice[]
  height?: number
  showPercent?: boolean
}) {
  const valid = slices.filter((s) => s.value > 0)
  const total = valid.reduce((acc, s) => acc + s.value, 0)
  if (total <= 0) return null

  return (
    <SegmentWrap>
      <SegmentTrack $height={height} aria-hidden="true">
        {valid.map((s) => (
          <SegmentPiece
            key={s.key}
            $color={s.color}
            style={{ flexGrow: s.value }}
            title={`${s.label}: ${s.value.toLocaleString('ko-KR')} (${Math.round((s.value / total) * 100)}%)`}
          />
        ))}
      </SegmentTrack>
      <SegmentLegend>
        {valid.map((s) => {
          const pct = Math.round((s.value / total) * 100)
          return (
            <LegendItem key={s.key}>
              <LegendSwatch $color={s.color} />
              <LegendLabel>{s.label}</LegendLabel>
              <LegendVal>
                {s.meta ??
                  (showPercent
                    ? `${pct}%`
                    : s.value.toLocaleString('ko-KR'))}
              </LegendVal>
            </LegendItem>
          )
        })}
      </SegmentLegend>
    </SegmentWrap>
  )
}

const SegmentWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const SegmentTrack = styled.div<{ $height: number }>`
  display: flex;
  gap: 2px;
  width: 100%;
  height: ${({ $height }) => $height}px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const SegmentPiece = styled.div<{ $color: string }>`
  flex: 1 1 0;
  min-width: 3px;
  background: ${({ $color }) => $color};
`

const SegmentLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LegendSwatch = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const LegendLabel = styled.span`
  font-weight: 500;
`

const LegendVal = styled.strong`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

/* ─── 4. Mini Linear SVG Sparkline (Non-Scaling Stroke) ──────────────────── */

export interface SparkPoint {
  year: number
  value: number
}

export function MiniSvgSparkline({
  points,
  color,
  height = 58,
  showZeroLine = false,
  formatValue,
}: {
  points: SparkPoint[]
  color?: string
  height?: number
  showZeroLine?: boolean
  formatValue?: (val: number) => string
}) {
  const theme = useTheme()
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)
  const strokeColor = color ?? ledgerAccent(theme.mode)

  if (points.length === 0) return null

  const sorted = [...points].sort((a, b) => a.year - b.year)
  if (sorted.length === 1) {
    return (
      <SinglePointBox style={{ height }}>
        <SingleDot $color={strokeColor} />
        <span>{sorted[0].year}년 단일 시점</span>
      </SinglePointBox>
    )
  }

  const minX = sorted[0].year
  const maxX = sorted[sorted.length - 1].year
  const spanX = Math.max(1, maxX - minX)

  const vals = sorted.map((p) => p.value)
  let minY = Math.min(...vals)
  let maxY = Math.max(...vals)
  if (showZeroLine) {
    minY = Math.min(minY, 0)
    maxY = Math.max(maxY, 0)
  }
  const padY = (maxY - minY || Math.abs(maxY) || 1) * 0.14
  const lo = minY - padY
  const hi = maxY + padY
  const spanY = Math.max(1e-6, hi - lo)

  const toX = (yr: number) => 4 + ((yr - minX) / spanX) * 92
  const toY = (val: number) => 92 - ((val - lo) / spanY) * 84

  const linePath = sorted
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${toX(pt.year).toFixed(2)} ${toY(pt.value).toFixed(2)}`,
    )
    .join(' ')
  const areaPath = `${linePath} L ${toX(maxX).toFixed(2)} 96 L ${toX(minX).toFixed(2)} 96 Z`

  const activePt =
    hoverIdx != null && sorted[hoverIdx]
      ? sorted[hoverIdx]
      : sorted[sorted.length - 1]
  const zeroY = showZeroLine && lo < 0 && hi > 0 ? toY(0) : null

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const targetYear = minX + ratio * spanX
    let best = 0
    let bestDiff = Infinity
    sorted.forEach((pt, idx) => {
      const diff = Math.abs(pt.year - targetYear)
      if (diff < bestDiff) {
        bestDiff = diff
        best = idx
      }
    })
    setHoverIdx(best)
  }

  return (
    <SparkContainer
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {hoverIdx != null && (
        <SparkHoverBadge>
          <span>{activePt.year}년</span>
          <strong>
            {formatValue
              ? formatValue(activePt.value)
              : activePt.value.toLocaleString('ko-KR', {
                  maximumFractionDigits: 2,
                })}
          </strong>
        </SparkHoverBadge>
      )}
      <SparkSvg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {zeroY != null ? (
          <line
            x1="0"
            y1={zeroY}
            x2="100"
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path d={areaPath} fill={strokeColor} fillOpacity="0.12" />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hoverIdx != null && (
          <line
            x1={toX(activePt.year)}
            y1="4"
            x2={toX(activePt.year)}
            y2="96"
            stroke={strokeColor}
            strokeOpacity="0.45"
            strokeWidth="1"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={`M ${toX(activePt.year).toFixed(2)} ${toY(activePt.value).toFixed(2)} l 0 0.01`}
          stroke={strokeColor}
          strokeWidth={hoverIdx != null ? '6.5' : '5'}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </SparkSvg>
      <SparkAxisRow>
        <span>{minX < 0 ? `BC ${Math.abs(minX)}` : minX}</span>
        <span>{maxX < 0 ? `BC ${Math.abs(maxX)}` : maxX}</span>
      </SparkAxisRow>
    </SparkContainer>
  )
}

const SparkHoverBadge = styled.div`
  position: absolute;
  top: -2px;
  right: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 10px;
  pointer-events: none;
  ${DIGIT_DISPLAY}

  span {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

/* ─── 4B. Semi-Circle Radial Arc Gauge & Multi-Segment Donut Ring ────────── */

export function SemiCircleGauge({
  percent,
  centerValue,
  subLabel,
  color,
  size = 86,
}: {
  percent: number
  centerValue: string
  subLabel?: string
  color?: string
  size?: number
}) {
  const theme = useTheme()
  const clamped = Math.max(0, Math.min(100, percent))
  const stroke = color ?? ledgerAccent(theme.mode)
  const r = 34
  const halfCirc = Math.PI * r
  const dashOffset = halfCirc * (1 - clamped / 100)

  return (
    <SemiGaugeWrap style={{ width: size }}>
      <svg
        width={size}
        height={Math.round(size * 0.6)}
        viewBox="0 0 84 50"
        aria-hidden
      >
        <path
          d="M 8 44 A 34 34 0 0 1 76 44"
          fill="none"
          stroke={
            theme.mode === 'dark'
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(15,23,42,0.08)'
          }
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M 8 44 A 34 34 0 0 1 76 44"
          fill="none"
          stroke={stroke}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeDasharray={halfCirc}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <SemiGaugeCenter>
        <strong>{centerValue}</strong>
        {subLabel ? <span>{subLabel}</span> : null}
      </SemiGaugeCenter>
    </SemiGaugeWrap>
  )
}

const SemiGaugeWrap = styled.div`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
`

const SemiGaugeCenter = styled.div`
  margin-top: -18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  ${DIGIT_DISPLAY}

  strong {
    font-size: 13px;
    font-weight: 800;
    line-height: 1.1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 9.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export function MiniDonutRing({
  slices,
  size = 76,
  strokeWidth = 9,
  centerValue,
  centerLabel,
}: {
  slices: SegmentSlice[]
  size?: number
  strokeWidth?: number
  centerValue?: string
  centerLabel?: string
}) {
  const theme = useTheme()
  const valid = slices.filter((s) => s.value > 0)
  const total = valid.reduce((acc, s) => acc + s.value, 0)
  const r = (size - strokeWidth) / 2 - 1
  const circ = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2

  let cumulative = 0
  const arcs =
    total > 0
      ? valid.map((s) => {
          const frac = s.value / total
          const len = Math.max(0, frac * circ - (valid.length > 1 ? 1.2 : 0))
          const offset = -cumulative * circ
          cumulative += frac
          return {
            key: s.key,
            color: s.color,
            dashArray: `${len} ${Math.max(0, circ - len)}`,
            dashOffset: offset,
            title: `${s.label}: ${s.meta ?? s.value}`,
          }
        })
      : []

  return (
    <MiniDonutBox style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={
            theme.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(15,23,42,0.06)'
          }
          strokeWidth={strokeWidth}
        />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
            >
              <title>{arc.title}</title>
            </circle>
          ))}
        </g>
      </svg>
      {(centerValue || centerLabel) && (
        <MiniDonutCenter>
          {centerValue ? <strong>{centerValue}</strong> : null}
          {centerLabel ? <span>{centerLabel}</span> : null}
        </MiniDonutCenter>
      )}
    </MiniDonutBox>
  )
}

const MiniDonutBox = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const MiniDonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
  ${DIGIT_DISPLAY}

  strong {
    font-size: 12px;
    font-weight: 800;
    line-height: 1.05;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 9.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SparkContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
`

const SparkSvg = styled.svg`
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: visible;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SparkAxisRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const SinglePointBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const SingleDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

/* ─── 5. Stacked Century Event Domain Histogram ──────────────────────────── */

function formatCenturyShort(century: number): string {
  return century < 0 ? `BC${Math.abs(century)}` : `${century}c`
}

export function StackedCenturyDomainChart({
  buckets,
  domainBreakdown,
  onSelectCentury,
}: {
  buckets: CenturyDomainBucket[]
  domainBreakdown: Array<{ domain: string; count: number }>
  onSelectCentury?: (century: number) => void
}) {
  const theme = useTheme()
  if (buckets.length === 0) return null

  const maxTotal = Math.max(1, ...buckets.map((b) => b.total))
  const topDomains = domainBreakdown.slice(0, 5)

  return (
    <CenturyChartWrap>
      <CenturyBarsRow role="list" aria-label="세기별 사건 분포">
        {buckets.map((bucket, idx) => {
          const prevCentury = idx > 0 ? buckets[idx - 1].century : null
          const skipped =
            prevCentury != null && bucket.century - prevCentury > 1
              ? bucket.century - prevCentury - 1
              : 0
          const heightPct = Math.max(10, Math.round((bucket.total / maxTotal) * 100))

          const orderedDomains = EVENT_DOMAIN_ORDER.filter(
            (dk) => (bucket.domains[dk] ?? 0) > 0,
          )
          // 혹시 등록되지 않은 키가 있으면 OTHER로 합산
          const extraCount = Object.entries(bucket.domains)
            .filter(([k]) => !EVENT_DOMAIN_ORDER.includes(k as never))
            .reduce((s, [, v]) => s + v, 0)

          return (
            <React.Fragment key={bucket.century}>
              {skipped > 0 ? (
                <CenturySkip aria-hidden="true" title={`${skipped}개 세기 공백`}>
                  ⋯
                </CenturySkip>
              ) : null}
              <CenturyCol
                type="button"
                role="listitem"
                onClick={() => onSelectCentury?.(bucket.century)}
                title={`${bucket.century < 0 ? `기원전 ${Math.abs(bucket.century)}세기` : `${bucket.century}세기`}: 사건 ${bucket.total}건 (클릭하여 이동)`}
              >
                <CenturyCount>{bucket.total}</CenturyCount>
                <CenturyBarTrack>
                  <CenturyBarStack style={{ height: `${heightPct}%` }}>
                    {orderedDomains.map((dk) => (
                      <CenturySeg
                        key={dk}
                        $color={domainAccent(dk, theme.mode)}
                        style={{ flexGrow: bucket.domains[dk] }}
                      />
                    ))}
                    {extraCount > 0 ? (
                      <CenturySeg
                        $color={domainAccent('OTHER', theme.mode)}
                        style={{ flexGrow: extraCount }}
                      />
                    ) : null}
                  </CenturyBarStack>
                </CenturyBarTrack>
                <CenturyLabel>{formatCenturyShort(bucket.century)}</CenturyLabel>
              </CenturyCol>
            </React.Fragment>
          )
        })}
      </CenturyBarsRow>

      {topDomains.length > 0 ? (
        <SegmentLegend>
          {topDomains.map((item) => (
            <LegendItem key={item.domain}>
              <LegendSwatch $color={domainAccent(item.domain, theme.mode)} />
              <LegendLabel>{domainLabel(item.domain)}</LegendLabel>
              <LegendVal>{item.count}</LegendVal>
            </LegendItem>
          ))}
        </SegmentLegend>
      ) : null}
    </CenturyChartWrap>
  )
}

const CenturyChartWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CenturyBarsRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 112px;
  padding-top: 14px;
  overflow-x: auto;
`

const CenturySkip = styled.span`
  align-self: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 2px;
`

const CenturyCol = styled.button`
  flex: 1 1 26px;
  min-width: 24px;
  max-width: 52px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  &:hover span:first-child {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CenturyCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const CenturyBarTrack = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`

const CenturyBarStack = styled.div`
  width: min(22px, 78%);
  display: flex;
  flex-direction: column-reverse;
  gap: 1px;
  border-radius: 3px 3px 0 0;
  overflow: hidden;
`

const CenturySeg = styled.div<{ $color: string }>`
  width: 100%;
  min-height: 2px;
  background: ${({ $color }) => $color};
`

const CenturyLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

