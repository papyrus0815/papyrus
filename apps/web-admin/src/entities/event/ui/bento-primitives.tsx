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
  gradient?: string
  meta?: string
}

export function StackedSegmentBar({
  slices,
  height = 10,
  showPercent = false,
}: {
  slices: SegmentSlice[]
  height?: number
  showPercent?: boolean
}) {
  const validSlices = slices.filter((sliceItem) => sliceItem.value > 0)
  const totalValue = validSlices.reduce(
    (sumAcc, sliceItem) => sumAcc + sliceItem.value,
    0,
  )
  if (totalValue <= 0) return null

  return (
    <SegmentWrap>
      <SegmentTrack $height={height} aria-hidden="true">
        {validSlices.map((sliceItem) => (
          <SegmentPiece
            key={sliceItem.key}
            style={{
              flex: `${sliceItem.value} 1 0%`,
              background: sliceItem.gradient ?? sliceItem.color,
            }}
            title={`${sliceItem.label}: ${sliceItem.value.toLocaleString('ko-KR')} (${Math.round((sliceItem.value / totalValue) * 100)}%)`}
          />
        ))}
      </SegmentTrack>
      <SegmentLegend>
        {validSlices.map((sliceItem) => {
          const pct = Math.round((sliceItem.value / totalValue) * 100)
          return (
            <LegendItem key={sliceItem.key}>
              <LegendSwatch style={{ background: sliceItem.color }} />
              <LegendLabel>{sliceItem.label}</LegendLabel>
              <LegendVal>
                {sliceItem.meta ??
                  (showPercent
                    ? `${pct}%`
                    : sliceItem.value.toLocaleString('ko-KR'))}
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
  gap: 8px;
`

const SegmentTrack = styled.div<{ $height: number }>`
  display: flex;
  gap: 2.5px;
  width: 100%;
  height: ${({ $height }) => $height}px;
  border-radius: 999px;
  overflow: hidden;
  padding: 1.5px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.055)'};
`

const SegmentPiece = styled.div`
  min-width: 4px;
  height: 100%;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
`

const SegmentLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 10px;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(15, 23, 42, 0.032)'};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LegendSwatch = styled.span`
  width: 7.5px;
  height: 7.5px;
  border-radius: 50%;
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
  const gradUid = React.useId().replace(/:/g, '')
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)
  const strokeColor = color ?? ledgerAccent(theme.mode)

  if (points.length === 0) return null

  const sorted = [...points].sort((left, right) => left.year - right.year)
  if (sorted.length === 1) {
    const singlePt = sorted[0]
    const formattedSingle = formatValue
      ? formatValue(singlePt.value)
      : singlePt.value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
    const isPercentLike = singlePt.value > 0 && singlePt.value <= 100
    if (isPercentLike) {
      const clampedPct = Math.max(4, Math.min(100, singlePt.value))
      return (
        <SingleGaugeWrap>
          <SingleGaugeMeta>
            <span>{singlePt.year}년 기준</span>
            <strong style={{ color: strokeColor }}>{formattedSingle}</strong>
          </SingleGaugeMeta>
          <SingleGaugeTrack>
            <SingleGaugeFill
              style={{
                width: `${clampedPct}%`,
                background: `linear-gradient(90deg, ${strokeColor}, #6366f1, #10b981)`,
              }}
            />
          </SingleGaugeTrack>
        </SingleGaugeWrap>
      )
    }
    return (
      <SinglePointBox style={{ height }}>
        <SingleDot $color={strokeColor} />
        <span>
          {singlePt.year}년 · <strong>{formattedSingle}</strong>
        </span>
      </SinglePointBox>
    )
  }

  const minX = sorted[0].year
  const maxX = sorted[sorted.length - 1].year
  const spanX = Math.max(1, maxX - minX)

  const vals = sorted.map((pt) => pt.value)
  let minY = Math.min(...vals)
  let maxY = Math.max(...vals)
  if (showZeroLine) {
    minY = Math.min(minY, 0)
    maxY = Math.max(maxY, 0)
  }
  const padY = (maxY - minY || Math.abs(maxY) || 1) * 0.16
  const lo = minY - padY
  const hi = maxY + padY
  const spanY = Math.max(1e-6, hi - lo)

  const toX = (yr: number) => 4 + ((yr - minX) / spanX) * 92
  const toY = (val: number) => 90 - ((val - lo) / spanY) * 80

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

  const handleMouseMove = (moveEvent: React.MouseEvent<HTMLDivElement>) => {
    const rect = moveEvent.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.max(
      0,
      Math.min(1, (moveEvent.clientX - rect.left) / rect.width),
    )
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
        <defs>
          <linearGradient id={`spk-${gradUid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
          strokeDasharray="2.5 2.5"
          vectorEffect="non-scaling-stroke"
        />
        {zeroY != null ? (
          <line
            x1="0"
            y1={zeroY}
            x2="100"
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity="0.24"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path d={areaPath} fill={`url(#spk-${gradUid})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
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
          strokeWidth={hoverIdx != null ? '7.5' : '6'}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </SparkSvg>
      <SparkAxisRow>
        <span>{minX < 0 ? `BC ${Math.abs(minX)}` : `${minX}년`}</span>
        <span>{maxX < 0 ? `BC ${Math.abs(maxX)}` : `${maxX}년`}</span>
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

const SingleGaugeWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.035)'
      : 'rgba(15, 23, 42, 0.028)'};
`

const SingleGaugeMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  strong {
    font-size: 12.5px;
    font-weight: 800;
  }
`

const SingleGaugeTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(15, 23, 42, 0.07)'};
`

const SingleGaugeFill = styled.div`
  height: 100%;
  border-radius: 999px;
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

function formatCenturyShort(century: number, compact = false): string {
  if (century < 0) return `BC${Math.abs(century)}`
  return compact ? `${century}c` : `${century}세기`
}

export function StackedCenturyDomainChart({
  buckets,
  domainBreakdown,
  onSelectCentury,
  hideLegend = false,
}: {
  buckets: CenturyDomainBucket[]
  domainBreakdown: Array<{ domain: string; count: number }>
  onSelectCentury?: (century: number) => void
  hideLegend?: boolean
}) {
  const theme = useTheme()
  if (buckets.length === 0) return null

  const maxTotal = Math.max(1, ...buckets.map((bucket) => bucket.total))
  const topDomains = domainBreakdown.slice(0, 6)
  const isCompactAxis = buckets.length > 6

  return (
    <CenturyChartWrap>
      <CenturyBarsRow
        $dense={isCompactAxis}
        role="list"
        aria-label="세기별 사건 분포"
      >
        {buckets.map((bucket, idx) => {
          const prevCentury = idx > 0 ? buckets[idx - 1].century : null
          const skipped =
            prevCentury != null && bucket.century - prevCentury > 1
              ? bucket.century - prevCentury - 1
              : 0
          const heightPct = Math.max(
            14,
            Math.round((bucket.total / maxTotal) * 100),
          )

          const orderedDomains = EVENT_DOMAIN_ORDER.filter(
            (dk) => (bucket.domains[dk] ?? 0) > 0,
          )
          const extraCount = Object.entries(bucket.domains)
            .filter(([domKey]) => !EVENT_DOMAIN_ORDER.includes(domKey as never))
            .reduce((sumVal, [, countVal]) => sumVal + countVal, 0)

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
                $dense={isCompactAxis}
                onClick={() => onSelectCentury?.(bucket.century)}
                title={`${bucket.century < 0 ? `기원전 ${Math.abs(bucket.century)}세기` : `${bucket.century}세기`}: 사건 ${bucket.total}건`}
              >
                <CenturyCount>{bucket.total}</CenturyCount>
                <CenturyBarTrack>
                  <CenturyBarWell>
                    <CenturyBarStack style={{ height: `${heightPct}%` }}>
                      {orderedDomains.map((dk) => (
                        <CenturySeg
                          key={dk}
                          style={{
                            flexGrow: bucket.domains[dk],
                            background: domainAccent(dk, theme.mode),
                          }}
                        />
                      ))}
                      {extraCount > 0 ? (
                        <CenturySeg
                          style={{
                            flexGrow: extraCount,
                            background: domainAccent('OTHER', theme.mode),
                          }}
                        />
                      ) : null}
                    </CenturyBarStack>
                  </CenturyBarWell>
                </CenturyBarTrack>
                <CenturyLabel>
                  {formatCenturyShort(bucket.century, isCompactAxis)}
                </CenturyLabel>
              </CenturyCol>
            </React.Fragment>
          )
        })}
      </CenturyBarsRow>

      {!hideLegend && topDomains.length > 0 ? (
        <SegmentLegend>
          {topDomains.map((item) => (
            <LegendItem key={item.domain}>
              <LegendSwatch
                style={{ background: domainAccent(item.domain, theme.mode) }}
              />
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
  gap: 10px;
`

const CenturyBarsRow = styled.div<{ $dense?: boolean }>`
  display: flex;
  align-items: flex-end;
  gap: ${({ $dense }) => ($dense ? '3px' : '6px')};
  height: 126px;
  padding: ${({ $dense }) => ($dense ? '10px 6px 6px' : '10px 8px 6px')};
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(15, 23, 42, 0.024)'};
  overflow-x: auto;
`

const CenturySkip = styled.span`
  align-self: center;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 1px;
`

const CenturyCol = styled.button<{ $dense?: boolean }>`
  flex: 1 1 ${({ $dense }) => ($dense ? '18px' : '32px')};
  min-width: ${({ $dense }) => ($dense ? '17px' : '26px')};
  max-width: 64px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  &:hover span:first-child {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CenturyCount = styled.span`
  font-size: 10.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const CenturyBarTrack = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`

const CenturyBarWell = styled.div`
  width: min(26px, 82%);
  height: 100%;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.045)'
      : 'rgba(15, 23, 42, 0.045)'};
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  padding: 1.5px;
`

const CenturyBarStack = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  gap: 1.5px;
  border-radius: 6px;
  overflow: hidden;
`

const CenturySeg = styled.div`
  width: 100%;
  min-height: 3px;
  border-radius: 2px;
`

const CenturyLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

