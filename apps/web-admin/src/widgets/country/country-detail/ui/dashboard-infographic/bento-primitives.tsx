import React from 'react'
import { FiArrowUpRight, FiClock, FiPlus, FiShield } from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

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
  BentoPill,
  BentoSubLabel,
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'

import { formatRelativeTime } from '../../lib/relative-time'
import type {
  MilitaryBranchSummary,
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
