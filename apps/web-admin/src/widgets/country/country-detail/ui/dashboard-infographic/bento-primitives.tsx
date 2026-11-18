import React from 'react'

import { FiArrowUpRight, FiClock, FiPlus, FiShield } from 'react-icons/fi'
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

import { formatRelativeTime } from '../../lib/relative-time'
import type {
  CenturyDomainBucket,
  MilitaryBranchSummary,
  RecentActivityItem,
  WarOutcomeSummary,
} from '../../model/use-country-dashboard-stats'

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
}: {
  points: SparkPoint[]
  color?: string
  height?: number
  showZeroLine?: boolean
}) {
  const theme = useTheme()
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

  const lastPt = sorted[sorted.length - 1]
  const zeroY = showZeroLine && lo < 0 && hi > 0 ? toY(0) : null

  return (
    <SparkContainer style={{ height }}>
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
        <path d={areaPath} fill={strokeColor} fillOpacity="0.11" />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M ${toX(lastPt.year).toFixed(2)} ${toY(lastPt.value).toFixed(2)} l 0 0.01`}
          stroke={strokeColor}
          strokeWidth="5.5"
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

/* ─── 6. Military Force Branch & War Summary Strip ───────────────────────── */

const BRANCH_META: Record<string, { label: string; light: string; dark: string }> = {
  ARMY: { label: '육군', light: '#15803d', dark: '#4ade80' },
  NAVY: { label: '해군', light: '#0369a1', dark: '#38bdf8' },
  AIR_FORCE: { label: '공군', light: '#4f46e5', dark: '#818cf8' },
  MARINE_CORPS: { label: '해병대', light: '#b91c1c', dark: '#f87171' },
  JOINT: { label: '합동·통합', light: '#7c3aed', dark: '#c084fc' },
  COAST_GUARD: { label: '해안경비', light: '#0d9488', dark: '#2dd4bf' },
  SPACE_FORCE: { label: '우주군', light: '#334155', dark: '#94a3b8' },
  OTHER: { label: '기타 편제', light: '#64748b', dark: '#94a3b8' },
}

export function MilitaryForceInfographicBlock({
  militaryCount,
  highCommandCount,
  branchBreakdown,
  warSummary,
  onOpenMilitary,
}: {
  militaryCount: number
  highCommandCount: number
  branchBreakdown: MilitaryBranchSummary[]
  warSummary: WarOutcomeSummary
  onOpenMilitary: () => void
}) {
  const theme = useTheme()
  if (militaryCount === 0 && warSummary.totalMilitaryEvents === 0) return null

  const slices: SegmentSlice[] = branchBreakdown.map((item) => {
    const meta = BRANCH_META[item.branch] ?? BRANCH_META.OTHER
    return {
      key: item.branch,
      label: meta.label,
      value: item.count,
      color: theme.mode === 'dark' ? meta.dark : meta.light,
    }
  })

  return (
    <ForceBlock>
      <BentoSubLabel>
        <span>
          <FiShield size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
          군사 전력 · 참전 요약
        </span>
        <InlineTextAction type="button" onClick={onOpenMilitary}>
          군사 탭 <FiArrowUpRight size={11} />
        </InlineTextAction>
      </BentoSubLabel>

      {slices.length > 0 ? <StackedSegmentBar slices={slices} height={8} /> : null}

      <ForcePillsRow>
        {militaryCount > 0 ? (
          <BentoPill>
            등록 편제 {militaryCount}개
            {highCommandCount > 0 ? ` · 상급사령부 ${highCommandCount}` : ''}
          </BentoPill>
        ) : null}
        {warSummary.totalMilitaryEvents > 0 ? (
          <BentoPill $accent>
            군사사건 {warSummary.totalMilitaryEvents}건 (전쟁 {warSummary.wars} · 전투{' '}
            {warSummary.battles})
          </BentoPill>
        ) : null}
        {warSummary.victories + warSummary.defeats + warSummary.draws > 0 ? (
          <BentoPill>
            전적: 승 {warSummary.victories} · 패 {warSummary.defeats}
            {warSummary.draws > 0 ? ` · 무/기타 ${warSummary.draws}` : ''}
          </BentoPill>
        ) : null}
      </ForcePillsRow>
    </ForceBlock>
  )
}

const ForceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ForcePillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const InlineTextAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

/* ─── 7. Single-Line Archive Footprint Ring + Recent Ticker Bar ──────────── */

export interface MissingAxisChip {
  key: string
  label: string
  onClick: () => void
}

export function ArchiveFootprintBar({
  filled,
  total,
  totalRecords,
  missingChips,
  recentActivity,
  onSelectActivity,
}: {
  filled: number
  total: number
  totalRecords: number
  missingChips: MissingAxisChip[]
  recentActivity: RecentActivityItem[]
  onSelectActivity?: (item: RecentActivityItem) => void
}) {
  const theme = useTheme()
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const radius = 15
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct / 100)
  const accent = ledgerAccent(theme.mode)

  return (
    <FootprintCard aria-label="아카이브 기록 완성도 및 최근 편집">
      <FootprintLeft>
        <RingBox>
          <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
            <circle
              cx="19"
              cy="19"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="3.5"
            />
            <circle
              cx="19"
              cy="19"
              r={radius}
              fill="none"
              stroke={accent}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 19 19)"
            />
          </svg>
          <RingLabel>{pct}%</RingLabel>
        </RingBox>

        <FootprintMeta>
          <FootprintTitle>
            아카이브 커버리지 {filled}/{total}개 도메인 · 누적{' '}
            {totalRecords.toLocaleString('ko-KR')}건
          </FootprintTitle>
          {missingChips.length > 0 ? (
            <MissingRow>
              <span>미입력 보완:</span>
              {missingChips.slice(0, 6).map((chip) => (
                <MissingChipBtn
                  key={chip.key}
                  type="button"
                  onClick={chip.onClick}
                >
                  <FiPlus size={10} /> {chip.label}
                </MissingChipBtn>
              ))}
              {missingChips.length > 6 ? (
                <MoreSpan>+{missingChips.length - 6}</MoreSpan>
              ) : null}
            </MissingRow>
          ) : (
            <MissingRow>모든 핵심 도메인 기록이 채워져 있습니다.</MissingRow>
          )}
        </FootprintMeta>
      </FootprintLeft>

      {recentActivity.length > 0 ? (
        <FootprintRight>
          <TickerHeader>
            <FiClock size={11} /> 최근 기록
          </TickerHeader>
          <TickerItems>
            {recentActivity.slice(0, 3).map((act) => (
              <TickerBtn
                key={act.id}
                type="button"
                onClick={() => onSelectActivity?.(act)}
                title={`${act.label} (${formatRelativeTime(act.createdAt)})`}
              >
                <span className="label">{act.label}</span>
                <span className="time">{formatRelativeTime(act.createdAt)}</span>
              </TickerBtn>
            ))}
          </TickerItems>
        </FootprintRight>
      ) : null}
    </FootprintCard>
  )
}

const FootprintCard = styled.footer`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 20px;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const FootprintLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 360px;
`

const RingBox = styled.div`
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RingLabel = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const FootprintMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const FootprintTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const MissingRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MissingChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1.5px 7px;
  border-radius: 5px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-style: solid;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const MoreSpan = styled.span`
  font-size: 10.5px;
  ${DIGIT_DISPLAY}
`

const FootprintRight = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const TickerHeader = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TickerItems = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const TickerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 200px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .time {
    flex-shrink: 0;
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`
