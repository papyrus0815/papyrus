import React, { useMemo, useState } from 'react'
import {
  FiArrowUpRight,
  FiClock,
  FiPlus,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import {
  domainAccent,
  domainLabel,
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
import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoDivider,
  BentoHeaderActions,
  BentoPill,
  BentoSubLabel,
  type CenturyDomainBucket,
  MiniDonutRing,
  type SegmentSlice,
  StackedCenturyDomainChart,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import { getUploadImageUrl } from '@/shared/api/upload'

import { formatRelativeTime } from '../../lib/relative-time'
import type {
  MilestoneEventItem,
  MilitaryBranchSummary,
  PersonSpotlightSummary,
  RecentActivityItem,
  WarOutcomeSummary,
} from '../../model/use-country-dashboard-stats'

export * from '@/entities/event/ui/bento-primitives'

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

  const decidedTotal =
    warSummary.victories + warSummary.defeats + warSummary.draws
  const winRatePct =
    decidedTotal > 0 ? Math.round((warSummary.victories / decidedTotal) * 100) : null

  const outcomeSlices: SegmentSlice[] =
    decidedTotal > 0
      ? [
          {
            key: 'win',
            label: '승리',
            value: warSummary.victories,
            color: theme.mode === 'dark' ? '#34d399' : '#059669',
          },
          {
            key: 'loss',
            label: '패배',
            value: warSummary.defeats,
            color: theme.mode === 'dark' ? '#fb7185' : '#e11d48',
          },
          {
            key: 'draw',
            label: '무승부·기타',
            value: warSummary.draws,
            color: theme.mode === 'dark' ? '#94a3b8' : '#64748b',
          },
        ]
      : []

  return (
    <ForceBlock>
      <BentoSubLabel>
        <span>
          <FiShield size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
          군사 전력 · 참전 전적
        </span>
        <InlineTextAction type="button" onClick={onOpenMilitary}>
          군사 탭 <FiArrowUpRight size={11} />
        </InlineTextAction>
      </BentoSubLabel>

      <ForceVisualRow $hasDonut={outcomeSlices.length > 0}>
        {outcomeSlices.length > 0 && (
          <MiniDonutRing
            slices={outcomeSlices}
            size={66}
            strokeWidth={8}
            centerValue={winRatePct != null ? `${winRatePct}%` : undefined}
            centerLabel="승률"
          />
        )}

        <ForceRightStack>
          {slices.length > 0 ? (
            <StackedSegmentBar slices={slices} height={8} />
          ) : null}

          <ForcePillsRow>
            {militaryCount > 0 ? (
              <BentoPill>
                편제 {militaryCount}개
                {highCommandCount > 0 ? ` · 사령부 ${highCommandCount}` : ''}
              </BentoPill>
            ) : null}
            {warSummary.totalMilitaryEvents > 0 ? (
              <BentoPill $accent>
                전쟁 {warSummary.wars} · 전투 {warSummary.battles}
              </BentoPill>
            ) : null}
            {decidedTotal > 0 ? (
              <BentoPill>
                {warSummary.victories}승 {warSummary.defeats}패
                {warSummary.draws > 0 ? ` ${warSummary.draws}무` : ''}
              </BentoPill>
            ) : null}
          </ForcePillsRow>
        </ForceRightStack>
      </ForceVisualRow>
    </ForceBlock>
  )
}

const ForceVisualRow = styled.div<{ $hasDonut: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasDonut }) =>
    $hasDonut ? '66px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  gap: 12px;
  align-items: center;
`

const ForceRightStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
`

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

/* ─── 8. 6-Axis National Profile SVG Radar Polygon Chart ──────────────────── */

export interface RadarAxisMetric {
  key: string
  label: string
  /** 0 ~ 100 정규화 점수 */
  score: number
  /** 실제 건수/단위 표기 (예: '42건', '18명') */
  valueLabel: string
  onClick?: () => void
}

export function NationalRadarPolygonChart({
  axes,
  compareAxes,
  primaryLabel,
  compareLabel,
}: {
  axes: RadarAxisMetric[]
  compareAxes?: RadarAxisMetric[] | null
  primaryLabel?: string | null
  compareLabel?: string | null
}) {
  const theme = useTheme()
  const accent = ledgerAccent(theme.mode)
  const compareStroke = theme.mode === 'dark' ? '#38bdf8' : '#0284c7'
  const gridStroke =
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)'
  const n = axes.length
  if (n < 3) return null

  const cx = 110
  const cy = 98
  const maxR = 64

  const pointAt = (idx: number, ratio: number) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / n
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    }
  }

  const ringPoints = (ratio: number) =>
    axes
      .map((_, idx) => {
        const pt = pointAt(idx, ratio)
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
      })
      .join(' ')

  const dataPoly = axes
    .map((ax, idx) => {
      const ratio = Math.max(0.12, Math.min(1, ax.score / 100))
      const pt = pointAt(idx, ratio)
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    })
    .join(' ')

  const hasCompare = Boolean(compareAxes && compareAxes.length === n)
  const comparePoly = hasCompare
    ? compareAxes!
        .map((ax, idx) => {
          const ratio = Math.max(0.12, Math.min(1, ax.score / 100))
          const pt = pointAt(idx, ratio)
          return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
        })
        .join(' ')
    : null

  return (
    <RadarOuterWrap>
      <RadarSvg viewBox="0 0 220 196" role="img" aria-label="국가 다차원 역량 레이더 차트">
        {[0.33, 0.66, 1].map((lv) => (
          <polygon
            key={lv}
            points={ringPoints(lv)}
            fill="none"
            stroke={gridStroke}
            strokeWidth="1"
          />
        ))}
        {axes.map((ax, idx) => {
          const outer = pointAt(idx, 1)
          return (
            <line
              key={ax.key}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke={gridStroke}
              strokeWidth="1"
            />
          )
        })}
        {comparePoly ? (
          <polygon
            points={comparePoly}
            fill={compareStroke}
            fillOpacity={theme.mode === 'dark' ? '0.14' : '0.09'}
            stroke={compareStroke}
            strokeWidth="1.5"
            strokeDasharray="3.5 2.5"
            strokeLinejoin="round"
          />
        ) : null}
        <polygon
          points={dataPoly}
          fill={accent}
          fillOpacity={theme.mode === 'dark' ? '0.24' : '0.16'}
          stroke={accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {hasCompare
          ? compareAxes!.map((cAx, idx) => {
              const ratio = Math.max(0.12, Math.min(1, cAx.score / 100))
              const pt = pointAt(idx, ratio)
              return (
                <circle
                  key={`cmp-${cAx.key}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="2.6"
                  fill={compareStroke}
                >
                  <title>{`${compareLabel ?? '비교국'} · ${cAx.label}: ${cAx.valueLabel}`}</title>
                </circle>
              )
            })
          : null}
        {axes.map((ax, idx) => {
          const ratio = Math.max(0.12, Math.min(1, ax.score / 100))
          const pt = pointAt(idx, ratio)
          const labelPt = pointAt(idx, 1.26)
          const anchor =
            Math.abs(labelPt.x - cx) < 10
              ? 'middle'
              : labelPt.x > cx
                ? 'start'
                : 'end'
          return (
            <g
              key={ax.key}
              style={{ cursor: ax.onClick ? 'pointer' : 'default' }}
              onClick={ax.onClick}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.3"
                fill={accent}
                stroke={ledgerBackground(theme.mode)}
                strokeWidth="1.3"
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 3}
                textAnchor={anchor}
                fontSize="9.5"
                fontWeight="700"
                fill="currentColor"
              >
                {ax.label}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 8.5}
                textAnchor={anchor}
                fontSize="9"
                fontWeight="600"
                fill={accent}
              >
                {ax.valueLabel}
              </text>
            </g>
          )
        })}
      </RadarSvg>
      {hasCompare && (primaryLabel || compareLabel) ? (
        <RadarCompareLegend>
          <span>
            <i style={{ background: accent }} />
            <strong>{primaryLabel ?? '기준국'}</strong>
          </span>
          <span>
            <i className="cmp" style={{ borderColor: compareStroke }} />
            <strong>{compareLabel ?? '비교국'}</strong>
          </span>
        </RadarCompareLegend>
      ) : null}
    </RadarOuterWrap>
  )
}

const RadarOuterWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RadarCompareLegend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 10.5px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  i.cmp {
    background: transparent;
    border: 1.5px dashed;
  }

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RadarSvg = styled.svg`
  width: 100%;
  max-width: 244px;
  height: auto;
  overflow: visible;
  ${DIGIT_DISPLAY}
`

/* ─── 9. Parliamentary 180° Hemicycle Seat Diagram ────────────────────────── */

export function ParliamentHemicycleSvg({
  slices,
  totalSeats,
  subCaption,
  showMajorityLine = true,
}: {
  slices: SegmentSlice[]
  totalSeats?: number | null
  subCaption?: string | null
  showMajorityLine?: boolean
}) {
  const theme = useTheme()
  const valid = slices.filter((s) => s.value > 0)
  const sumVal = valid.reduce((acc, s) => acc + s.value, 0)

  const seatDots = useMemo(() => {
    if (sumVal <= 0) return []
    const rows = [
      { r: 44, count: 16 },
      { r: 57, count: 22 },
      { r: 70, count: 28 },
    ]
    const totalDots = rows.reduce((a, b) => a + b.count, 0)
    // 각 정당·의원 슬라이스에 비례 배분
    const rawQuotas = valid.map((s) => ({
      slice: s,
      exact: (s.value / sumVal) * totalDots,
    }))
    const assigned = rawQuotas.map((q) => Math.floor(q.exact))
    let rem = totalDots - assigned.reduce((a, b) => a + b, 0)
    const orderByFrac = rawQuotas
      .map((q, idx) => ({ idx, frac: q.exact - Math.floor(q.exact) }))
      .sort((a, b) => b.frac - a.frac)
    let k = 0
    while (rem > 0 && orderByFrac.length > 0) {
      assigned[orderByFrac[k % orderByFrac.length].idx] += 1
      rem -= 1
      k += 1
    }

    const paletteSeq: Array<{ color: string; label: string }> = []
    valid.forEach((s, idx) => {
      for (let c = 0; c < assigned[idx]; c += 1) {
        paletteSeq.push({ color: s.color, label: s.label })
      }
    })

    // 좌측(π)에서 우측(0) 각도 순으로 정렬해 실제 본회의장 좌석처럼 배치
    const coords: Array<{ angle: number; x: number; y: number }> = []
    const cx = 90
    const cy = 84
    for (const row of rows) {
      for (let i = 0; i < row.count; i += 1) {
        const ratio = row.count > 1 ? i / (row.count - 1) : 0.5
        const theta = Math.PI - ratio * Math.PI
        coords.push({
          angle: theta,
          x: cx + Math.cos(theta) * row.r,
          y: cy - Math.sin(theta) * row.r,
        })
      }
    }
    coords.sort((a, b) => b.angle - a.angle)

    return coords.map((pt, i) => ({
      ...pt,
      color: paletteSeq[i]?.color ?? '#94a3b8',
      label: paletteSeq[i]?.label ?? '',
    }))
  }, [valid, sumVal])

  if (sumVal <= 0) return null

  const displayTotal = totalSeats ?? sumVal
  const majoritySeats = Math.floor(displayTotal / 2) + 1

  return (
    <HemicycleWrap>
      <HemicycleSvgBox>
        <svg viewBox="0 0 180 92" aria-label="의회 반원 의석 분포도">
          {showMajorityLine ? (
            <line
              x1="90"
              y1="6"
              x2="90"
              y2="52"
              stroke={theme.mode === 'dark' ? 'rgba(255,255,255,0.32)' : 'rgba(15,23,42,0.28)'}
              strokeWidth="1"
              strokeDasharray="2.5 2.5"
            />
          ) : null}
          {seatDots.map((dot, idx) => (
            <circle
              key={idx}
              cx={dot.x.toFixed(1)}
              cy={dot.y.toFixed(1)}
              r="3.2"
              fill={dot.color}
            >
              <title>{dot.label}</title>
            </circle>
          ))}
        </svg>
        <HemicycleCenterText>
          <strong>{displayTotal.toLocaleString('ko-KR')}</strong>
          <span>
            {subCaption ?? (showMajorityLine ? `과반 ${majoritySeats}석` : '정원')}
          </span>
        </HemicycleCenterText>
      </HemicycleSvgBox>

      <HemicycleLegend>
        {valid.slice(0, 6).map((s) => (
          <HemicycleLegendItem key={s.key}>
            <span className="sw" style={{ background: s.color }} />
            <span className="lb">{s.label}</span>
            <strong>{s.meta ?? s.value.toLocaleString('ko-KR')}</strong>
          </HemicycleLegendItem>
        ))}
      </HemicycleLegend>
    </HemicycleWrap>
  )
}

const HemicycleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const HemicycleSvgBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 224px;
  margin: 0 auto;

  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
`

const HemicycleCenterText = styled.div`
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
  ${DIGIT_DISPLAY}

  strong {
    font-size: 15px;
    font-weight: 800;
    line-height: 1.05;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: 9.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const HemicycleLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 10px;
`

const HemicycleLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};

  .sw {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

/* ─── 10. Sovereign Yield Curve SVG (1M ~ 30Y Term Structure) ─────────────── */

const MATURITY_ORDER: Array<{ code: string; label: string; pos: number }> = [
  { code: 'M1', label: '1M', pos: 0 },
  { code: 'M3', label: '3M', pos: 1 },
  { code: 'M6', label: '6M', pos: 2 },
  { code: 'Y1', label: '1Y', pos: 3 },
  { code: 'Y2', label: '2Y', pos: 4.2 },
  { code: 'Y3', label: '3Y', pos: 5.2 },
  { code: 'Y5', label: '5Y', pos: 6.4 },
  { code: 'Y7', label: '7Y', pos: 7.4 },
  { code: 'Y10', label: '10Y', pos: 8.6 },
  { code: 'Y20', label: '20Y', pos: 9.8 },
  { code: 'Y30', label: '30Y', pos: 11 },
]

export function SovereignYieldCurveSvg({
  bondYields,
  height = 54,
}: {
  bondYields: Array<{
    year: number
    maturity: string
    yieldRate?: number | string | null
  }>
  height?: number
}) {
  const theme = useTheme()
  const curve = useMemo(() => {
    const byYear = new Map<number, Map<string, number>>()
    for (const row of bondYields) {
      const val = Number(row.yieldRate)
      if (row.yieldRate == null || !Number.isFinite(val)) continue
      const m = byYear.get(row.year) ?? new Map<string, number>()
      m.set(row.maturity, val)
      byYear.set(row.year, m)
    }
    const yearsDesc = [...byYear.keys()].sort((a, b) => b - a)
    const targetYear =
      yearsDesc.find((y) => (byYear.get(y)?.size ?? 0) >= 2) ?? yearsDesc[0]
    if (targetYear == null) return null
    const map = byYear.get(targetYear)!
    const pts = MATURITY_ORDER.filter((m) => map.has(m.code)).map((m) => ({
      ...m,
      val: map.get(m.code)!,
    }))
    if (pts.length < 2) return null
    const y2 = map.get('Y2')
    const y10 = map.get('Y10')
    const spreadBp =
      y10 != null && y2 != null ? Math.round((y10 - y2) * 100) : null
    return { year: targetYear, pts, spreadBp }
  }, [bondYields])

  if (!curve) return null

  const minPos = curve.pts[0].pos
  const maxPos = curve.pts[curve.pts.length - 1].pos
  const spanPos = Math.max(1, maxPos - minPos)
  const vals = curve.pts.map((p) => p.val)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const padV = Math.max(0.15, (maxV - minV) * 0.2)
  const lo = minV - padV
  const hi = maxV + padV
  const spanV = Math.max(0.01, hi - lo)

  const toX = (pos: number) => 6 + ((pos - minPos) / spanPos) * 88
  const toY = (val: number) => 88 - ((val - lo) / spanV) * 76

  const inverted = curve.spreadBp != null && curve.spreadBp < 0
  const stroke = inverted
    ? theme.mode === 'dark'
      ? '#fb7185'
      : '#e11d48'
    : theme.mode === 'dark'
      ? '#fbbf24'
      : '#d97706'

  const pathD = curve.pts
    .map(
      (p, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${toX(p.pos).toFixed(1)} ${toY(p.val).toFixed(1)}`,
    )
    .join(' ')
  const areaD = `${pathD} L ${toX(maxPos).toFixed(1)} 94 L ${toX(minPos).toFixed(1)} 94 Z`

  return (
    <YieldCurveWrap>
      <YieldCurveSvgBox style={{ height }}>
        <svg viewBox="0 0 100 96" preserveAspectRatio="none" aria-hidden>
          <path d={areaD} fill={stroke} fillOpacity="0.13" />
          <path
            d={pathD}
            fill="none"
            stroke={stroke}
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
          />
          {curve.pts.map((pt) => (
            <path
              key={pt.code}
              d={`M ${toX(pt.pos).toFixed(1)} ${toY(pt.val).toFixed(1)} l 0 0.01`}
              stroke={stroke}
              strokeWidth="5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${pt.label}: ${pt.val.toFixed(2)}%`}</title>
            </path>
          ))}
        </svg>
      </YieldCurveSvgBox>
      <YieldCurveFooter>
        <span>
          {curve.pts[0].label} {curve.pts[0].val.toFixed(2)}% →{' '}
          {curve.pts[curve.pts.length - 1].label}{' '}
          {curve.pts[curve.pts.length - 1].val.toFixed(2)}%
        </span>
        {curve.spreadBp != null ? (
          <strong className={inverted ? 'inv' : 'norm'}>
            10Y−2Y {curve.spreadBp >= 0 ? `+${curve.spreadBp}` : curve.spreadBp}
            bp
          </strong>
        ) : (
          <span>{curve.year}년 곡선</span>
        )}
      </YieldCurveFooter>
    </YieldCurveWrap>
  )
}

const YieldCurveWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
`

const YieldCurveSvgBox = styled.div`
  width: 100%;

  svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
`

const YieldCurveFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  strong.norm {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#34d399' : '#059669')};
  }
  strong.inv {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#e11d48')};
  }
`

/* ─── 11. Century × Domain Heatmap Matrix + Milestone Events Strip ────────── */

function formatCenturyCol(century: number): string {
  return century < 0 ? `BC${Math.abs(century)}` : `${century}c`
}

export function CenturyEventMatrixAndMilestones({
  buckets,
  domainBreakdown,
  milestones = [],
  onSelectCentury,
  onSelectCell,
  onSelectEvent,
}: {
  buckets: CenturyDomainBucket[]
  domainBreakdown: Array<{ domain: string; count: number }>
  milestones?: MilestoneEventItem[]
  onSelectCentury?: (century: number) => void
  onSelectCell?: (century: number, domain: string) => void
  onSelectEvent?: (eventId: string) => void
}) {
  const theme = useTheme()
  const [viewMode, setViewMode] = useState<'bars' | 'matrix'>('matrix')

  const topDomains = useMemo(
    () => domainBreakdown.filter((d) => d.count > 0).slice(0, 6),
    [domainBreakdown],
  )
  const maxCellCount = useMemo(() => {
    let max = 1
    for (const b of buckets) {
      for (const d of topDomains) {
        const v = b.domains[d.domain] ?? 0
        if (v > max) max = v
      }
    }
    return max
  }, [buckets, topDomains])

  if (buckets.length === 0 && milestones.length === 0) return null

  return (
    <EventMatrixContainer>
      {buckets.length > 0 && (
        <>
          <BentoSubLabel>
            <span>세기별 역사 사건 밀도 · 분야 매트릭스</span>
            <MatrixModeSwitch>
              <MatrixModeBtn
                type="button"
                $active={viewMode === 'matrix'}
                onClick={() => setViewMode('matrix')}
              >
                시대×분야 히트맵
              </MatrixModeBtn>
              <MatrixModeBtn
                type="button"
                $active={viewMode === 'bars'}
                onClick={() => setViewMode('bars')}
              >
                스택 히스토그램
              </MatrixModeBtn>
            </MatrixModeSwitch>
          </BentoSubLabel>

          {viewMode === 'bars' || topDomains.length <= 1 ? (
            <StackedCenturyDomainChart
              buckets={buckets}
              domainBreakdown={domainBreakdown}
              onSelectCentury={onSelectCentury}
            />
          ) : (
            <HeatmapScrollWrap>
              <HeatmapTable>
                <thead>
                  <tr>
                    <th className="dom-head">분야 \ 세기</th>
                    {buckets.map((b) => (
                      <th key={b.century}>
                        <HeatmapCenturyBtn
                          type="button"
                          onClick={() => onSelectCentury?.(b.century)}
                          title={`${formatCenturyCol(b.century)} 사건 보기 (${b.total}건)`}
                        >
                          {formatCenturyCol(b.century)}
                        </HeatmapCenturyBtn>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topDomains.map((dom) => {
                    const color = domainAccent(dom.domain, theme.mode)
                    return (
                      <tr key={dom.domain}>
                        <td className="dom-cell">
                          <span
                            className="dot"
                            style={{ background: color }}
                          />
                          <span>{domainLabel(dom.domain)}</span>
                          <small>{dom.count}</small>
                        </td>
                        {buckets.map((b) => {
                          const cnt = b.domains[dom.domain] ?? 0
                          const alpha =
                            cnt > 0
                              ? 0.18 + (cnt / maxCellCount) * 0.72
                              : 0
                          return (
                            <td key={b.century}>
                              <HeatmapCellBtn
                                type="button"
                                $empty={cnt === 0}
                                style={
                                  cnt > 0
                                    ? {
                                        background: color,
                                        opacity: alpha,
                                      }
                                    : undefined
                                }
                                onClick={() => {
                                  if (onSelectCell) {
                                    onSelectCell(b.century, dom.domain)
                                  } else {
                                    onSelectCentury?.(b.century)
                                  }
                                }}
                                title={`${formatCenturyCol(b.century)} · ${domainLabel(dom.domain)}: ${cnt}건 (클릭 시 세기+분야 필터)`}
                              >
                                {cnt > 0 ? <span>{cnt}</span> : null}
                              </HeatmapCellBtn>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </HeatmapTable>
            </HeatmapScrollWrap>
          )}
        </>
      )}

      {milestones.length > 0 && (
        <MilestoneStripWrap>
          <BentoSubLabel>
            <span>주요 역사적 분수령 사건 ({milestones.length}선)</span>
            <span>클릭 시 사건 요약</span>
          </BentoSubLabel>
          <MilestoneCardsRow>
            {milestones.map((ms) => (
              <MilestonePinBtn
                key={ms.id}
                type="button"
                $accentColor={domainAccent(ms.domain, theme.mode)}
                onClick={() => onSelectEvent?.(ms.id)}
              >
                <div className="top">
                  <span className="yr">{ms.yearLabel}</span>
                  <span className="dom">{domainLabel(ms.domain)}</span>
                </div>
                <strong className="title">{ms.title}</strong>
                {ms.polityName ? (
                  <small className="polity">{ms.polityName}</small>
                ) : null}
              </MilestonePinBtn>
            ))}
          </MilestoneCardsRow>
        </MilestoneStripWrap>
      )}
    </EventMatrixContainer>
  )
}

const EventMatrixContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const MatrixModeSwitch = styled.span`
  display: inline-flex;
  padding: 1.5px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const MatrixModeBtn = styled.button<{ $active: boolean }>`
  height: 20px;
  padding: 0 7px;
  border: none;
  border-radius: 3.5px;
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`

const HeatmapScrollWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
`

const HeatmapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  ${DIGIT_DISPLAY}

  th,
  td {
    padding: 3px 4px;
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    text-align: center;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  th.dom-head {
    text-align: left;
    padding-left: 8px;
    font-size: 10px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
  }

  td.dom-cell {
    text-align: left;
    padding: 4px 8px;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};

    .dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 5px;
      vertical-align: 1px;
    }

    small {
      margin-left: 5px;
      font-size: 10px;
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const HeatmapCenturyBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px 3px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const HeatmapCellBtn = styled.button<{ $empty: boolean }>`
  width: 100%;
  min-width: 24px;
  height: 22px;
  border: none;
  border-radius: 3px;
  background: ${({ $empty, theme }) =>
    $empty ? ledgerSubtleFill(theme.mode) : 'transparent'};
  color: #ffffff;
  font-family: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  span {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }
`

const MilestoneStripWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const MilestoneCardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(156px, 1fr));
  gap: 7px;
`

const MilestonePinBtn = styled.button<{ $accentColor: string }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 7px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 3px solid ${({ $accentColor }) => $accentColor};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    border-left-color: ${({ $accentColor }) => $accentColor};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    font-size: 10px;
    ${DIGIT_DISPLAY}
  }

  .yr {
    font-weight: 800;
    color: ${({ $accentColor }) => $accentColor};
  }

  .dom {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .title {
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    width: 100%;
  }

  .polity {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/* ─── 12. Shared Figures Spotlight & Role/Era Infographic Bento Card ──────── */

export function FiguresSpotlightBentoCard({
  spotlight,
  personCount,
  onSelectPerson,
  onOpenPersonsTab,
}: {
  spotlight: PersonSpotlightSummary
  personCount: number
  onSelectPerson: (personId: string) => void
  onOpenPersonsTab: () => void
}) {
  const theme = useTheme()
  if (personCount === 0) return null

  const roleSlices: SegmentSlice[] = [
    {
      key: 'rulers',
      label: '통치 · 국가수반',
      value: spotlight.roleCounts.rulers,
      color: ledgerAccent(theme.mode),
      meta: `${spotlight.roleCounts.rulers}명`,
    },
    {
      key: 'ministers',
      label: '내각 · 관료 · 장성',
      value: spotlight.roleCounts.ministers,
      color: theme.mode === 'dark' ? '#38bdf8' : '#0284c7',
      meta: `${spotlight.roleCounts.ministers}명`,
    },
    {
      key: 'figures',
      label: '인물 · 학술 · 기타',
      value: spotlight.roleCounts.figures,
      color: theme.mode === 'dark' ? '#34d399' : '#0d9488',
      meta: `${spotlight.roleCounts.figures}명`,
    },
  ].filter((s) => s.value > 0)

  const eraPalette =
    theme.mode === 'dark'
      ? ['#a5b4fc', '#38bdf8', '#34d399', '#fbbf24', '#c084fc']
      : ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed']

  const eraBarSlices: SegmentSlice[] = spotlight.eraSlices.map((e, idx) => ({
    key: e.key,
    label: e.label,
    value: e.count,
    color: eraPalette[idx % eraPalette.length],
    meta: `${e.count}명`,
  }))

  return (
    <BentoCard aria-label="소속 인물 역할·시대 분포 및 주요 인물 초상">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>인물 아카이브 · 역할 분포 & 주요 인물</BentoCardTitle>
          <BentoCardBadge>총 {personCount.toLocaleString('ko-KR')}명</BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenPersonsTab}>
            인물 전체 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        <FiguresTopSplit>
          <MiniDonutRing
            slices={roleSlices}
            size={64}
            strokeWidth={8}
            centerValue={personCount.toLocaleString('ko-KR')}
            centerLabel="인물"
          />
          <FiguresBarsCol>
            <StackedSegmentBar slices={roleSlices} height={8} />
            {eraBarSlices.length > 1 ? (
              <StackedSegmentBar slices={eraBarSlices} height={6} />
            ) : null}
          </FiguresBarsCol>
        </FiguresTopSplit>

        {spotlight.featured.length > 0 && (
          <>
            <BentoDivider />
            <PortraitGrid>
              {spotlight.featured.slice(0, 8).map((person) => {
                const img = person.profileImageUrl
                  ? getUploadImageUrl(person.profileImageUrl)
                  : null
                const roleLabel =
                  person.roleKind === 'ruler'
                    ? '수반'
                    : person.roleKind === 'minister'
                      ? '관료'
                      : '인물'
                return (
                  <PortraitCardBtn
                    key={person.id}
                    type="button"
                    onClick={() => onSelectPerson(person.id)}
                  >
                    <PortraitThumb>
                      {img ? (
                        <img src={img} alt="" />
                      ) : (
                        <FiUser size={13} aria-hidden />
                      )}
                    </PortraitThumb>
                    <PortraitMeta>
                      <div className="name-row">
                        <strong>{person.name}</strong>
                        <span className={`role ${person.roleKind}`}>
                          {roleLabel}
                        </span>
                      </div>
                      {person.subLabel ? (
                        <small>{person.subLabel}</small>
                      ) : null}
                    </PortraitMeta>
                  </PortraitCardBtn>
                )
              })}
            </PortraitGrid>
          </>
        )}
      </BentoCardBody>
    </BentoCard>
  )
}

const FiguresTopSplit = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const FiguresBarsCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PortraitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 7px;
`

const PortraitCardBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const PortraitThumb = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PortraitMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  .name-row {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  strong {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .role {
    flex-shrink: 0;
    padding: 0.5px 5px;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 700;
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .role.ruler {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  small {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    ${DIGIT_DISPLAY}
  }
`
