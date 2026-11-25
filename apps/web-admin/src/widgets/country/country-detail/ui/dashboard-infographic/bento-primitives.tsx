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
  type CenturyDomainBucket,
  HdiScaleBar,
  MiniDonutRing,
  MiniSvgSparkline,
  PercentileBulletBar,
  type SegmentSlice,
  SemiCircleGauge,
  type SparkPoint,
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

export {
  type CenturyDomainBucket,
  HdiScaleBar,
  MiniDonutRing,
  MiniSvgSparkline,
  PercentileBulletBar,
  type SegmentSlice,
  SemiCircleGauge,
  type SparkPoint,
  StackedCenturyDomainChart,
  StackedSegmentBar,
}

/* ─── Cardless Open Editorial Canvas Primitives (무카드 에디토리얼 레이아웃) ─── */

export const BentoCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  padding: 6px 0 56px;
  box-sizing: border-box;

  > * {
    padding: 52px 0;
  }

  > *:first-child {
    padding-top: 12px;
    padding-bottom: 52px;
  }

  > *:last-child {
    padding-bottom: 0;
  }

  > * + * {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.085)'
          : 'rgba(15, 23, 42, 0.08)'};
  }

  @media (max-width: 768px) {
    > * {
      padding: 36px 0;
    }

    > *:first-child {
      padding-top: 8px;
      padding-bottom: 36px;
    }
  }
`

export const BentoGridAsym = styled.div<{
  $leftFr?: number
  $rightFr?: number
}>`
  display: grid;
  grid-template-columns: ${({ $leftFr = 1.2, $rightFr = 1 }) =>
    `minmax(0, ${$leftFr}fr) minmax(0, ${$rightFr}fr)`};
  gap: 0;
  align-items: start;

  > *:first-child {
    padding-right: 42px;
  }

  > *:nth-child(2) {
    padding-left: 42px;
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.085)'
          : 'rgba(15, 23, 42, 0.075)'};
  }

  @media (max-width: 1040px) {
    grid-template-columns: 1fr;

    > *:first-child {
      padding-right: 0;
    }

    > *:nth-child(2) {
      padding-left: 0;
      border-left: none;
      margin-top: 38px;
      padding-top: 38px;
      border-top: 1px solid
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.085)'
            : 'rgba(15, 23, 42, 0.075)'};
    }
  }
`

export const BentoGrid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  align-items: start;

  > *:first-child {
    padding-right: 42px;
  }

  > *:nth-child(2) {
    padding-left: 42px;
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.085)'
          : 'rgba(15, 23, 42, 0.075)'};
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;

    > *:first-child {
      padding-right: 0;
    }

    > *:nth-child(2) {
      padding-left: 0;
      border-left: none;
      margin-top: 38px;
      padding-top: 38px;
      border-top: 1px solid
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.085)'
            : 'rgba(15, 23, 42, 0.075)'};
    }
  }
`

export const BentoGrid3Col = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  align-items: start;

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
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
  min-width: 0;
`

export const BentoCardHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 0 0 22px 0;
  background: transparent;
`

export const BentoCardTitleGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

export const BentoCardTitle = styled.h2`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 820;
  letter-spacing: -0.028em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const BentoCardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  gap: 3.5px;
  height: 26px;
  padding: 0 7px;
  margin-right: -4px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const BentoCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  flex: 1;
  min-width: 0;
`

export const BentoDivider = styled.div`
  height: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.055)'};
`

export const BentoSubLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: -0.005em;
`

export const BentoPill = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $accent }) =>
    $accent
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(79, 70, 229, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.055)'
        : 'rgba(15, 23, 42, 0.042)'};
  color: ${({ theme, $accent }) =>
    $accent ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

/**
 * 자료가 없는 대시보드 카드 — 카드 틀(제목)은 그대로 두고 안쪽만 빈 안내.
 *
 * 2026-09-10 결정: 국가 대시보드는 자료가 있든 없든 **같은 배치**를 그린다(값만 비운다).
 * 그 뒤 벤토 개편에서 카드마다 `return null`이 다시 들어와, 자료가 없는 나라(케냐)는 묶음 9개 중
 * 3개가 통째로 사라지고 격자 열 수까지 바뀌었다. 자료가 들어온 뒤 어디에 무엇이 생길지 미리 보이게 한다.
 */
export function EmptyBentoCard({
  title,
  text,
  actionLabel,
  onAction,
  hint,
}: {
  title: string
  text: string
  actionLabel?: string
  onAction?: () => void
  hint?: string
}) {
  return (
    <BentoCard aria-label={title}>
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>{title}</BentoCardTitle>
        </BentoCardTitleGroup>
      </BentoCardHeader>
      <BentoCardBody>
        {/* SectionEmpty는 위아래 선이 있어 카드 머리 선과 겹선이 됐다 — 카드 안에선 선 없는 한 줄 */}
        <EmptyCardRow>
          <div className="text">
            <p>{text}</p>
            {hint ? <span className="hint">{hint}</span> : null}
          </div>
          {actionLabel && onAction ? (
            <EmptyCardAction type="button" onClick={onAction}>
              + {actionLabel}
            </EmptyCardAction>
          ) : null}
        </EmptyCardRow>
      </BentoCardBody>
    </BentoCard>
  )
}

const EmptyCardRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 6px 0;

  .text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1 1 260px;
  }
  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};
    word-break: keep-all;
  }
  .hint {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const EmptyCardAction = styled.button`
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  border-radius: 8px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/* ─── 6. Military Force Branch & War Summary Strip ───────────────────────── */

const BRANCH_META: Record<
  string,
  { label: string; light: string; dark: string; gradient: string }
> = {
  ARMY: {
    label: '육군',
    light: '#059669',
    dark: '#34d399',
    gradient: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
  },
  NAVY: {
    label: '해군',
    light: '#0284c7',
    dark: '#38bdf8',
    gradient: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
  },
  AIR_FORCE: {
    label: '공군',
    light: '#4f46e5',
    dark: '#818cf8',
    gradient: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 100%)',
  },
  MARINE_CORPS: {
    label: '해병대',
    light: '#e11d48',
    dark: '#fb7185',
    gradient: 'linear-gradient(90deg, #e11d48 0%, #fb7185 100%)',
  },
  JOINT: {
    label: '합동·통합',
    light: '#7c3aed',
    dark: '#c084fc',
    gradient: 'linear-gradient(90deg, #7c3aed 0%, #c084fc 100%)',
  },
  COAST_GUARD: {
    label: '해안경비',
    light: '#0d9488',
    dark: '#2dd4bf',
    gradient: 'linear-gradient(90deg, #0d9488 0%, #2dd4bf 100%)',
  },
  SPACE_FORCE: {
    label: '우주군',
    light: '#334155',
    dark: '#94a3b8',
    gradient: 'linear-gradient(90deg, #475569 0%, #94a3b8 100%)',
  },
  OTHER: {
    label: '기타 편제',
    light: '#d97706',
    dark: '#fbbf24',
    gradient: 'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)',
  },
}

export function MilitaryForceInfographicBlock({
  militaryCount,
  highCommandCount,
  branchBreakdown,
  warSummary,
  onOpenMilitary,
  hideSubHeader = false,
}: {
  militaryCount: number
  highCommandCount: number
  branchBreakdown: MilitaryBranchSummary[]
  warSummary: WarOutcomeSummary
  onOpenMilitary: () => void
  hideSubHeader?: boolean
}) {
  const theme = useTheme()
  if (militaryCount === 0 && warSummary.totalMilitaryEvents === 0) return null

  const maxBranchVal = Math.max(
    1,
    ...branchBreakdown.map((branchRow) => branchRow.count),
  )

  const decidedTotal =
    warSummary.victories + warSummary.defeats + warSummary.draws
  const winRatePct =
    decidedTotal > 0
      ? Math.round((warSummary.victories / decidedTotal) * 100)
      : null

  const outcomeSlices: SegmentSlice[] =
    decidedTotal >= MIN_DECIDED_FOR_WIN_RATE
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
            color: theme.mode === 'dark' ? '#fbbf24' : '#d97706',
          },
        ]
      : []

  return (
    <ForceBlock>
      {!hideSubHeader ? (
        <BentoSubLabel>
          <span>
            <FiShield size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
            군사 전력 · 참전 전적
          </span>
          <InlineTextAction type="button" onClick={onOpenMilitary}>
            군사 탭 <FiArrowUpRight size={11} />
          </InlineTextAction>
        </BentoSubLabel>
      ) : null}

      <ForceVisualRow $hasDonut={outcomeSlices.length > 0}>
        {outcomeSlices.length > 0 && (
          <MiniDonutRing
            slices={outcomeSlices}
            size={70}
            strokeWidth={8.5}
            centerValue={winRatePct != null ? `${winRatePct}%` : undefined}
            centerLabel="승률"
          />
        )}

        <ForceRightStack>
          {branchBreakdown.length > 0 ? (
            <ForceBranchBarsGrid>
              {branchBreakdown.slice(0, 5).map((branchRow) => {
                const meta =
                  BRANCH_META[branchRow.branch] ?? BRANCH_META.OTHER
                const toneColor =
                  theme.mode === 'dark' ? meta.dark : meta.light
                const widthPct = Math.max(
                  10,
                  Math.round((branchRow.count / maxBranchVal) * 100),
                )
                return (
                  <ForceBranchRow key={branchRow.branch}>
                    <span className="name">
                      <i style={{ background: toneColor }} />
                      {meta.label}
                    </span>
                    <div className="track">
                      <div
                        className="fill"
                        style={{ width: `${widthPct}%`, background: meta.gradient }}
                      />
                    </div>
                    <strong className="cnt">{branchRow.count}</strong>
                  </ForceBranchRow>
                )
              })}
            </ForceBranchBarsGrid>
          ) : null}

          <ForcePillsRow>
            {militaryCount > 0 ? (
              <BentoPill>
                총 편제 {militaryCount}개
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
                전적 {warSummary.victories}승 {warSummary.defeats}패
                {warSummary.draws > 0 ? ` ${warSummary.draws}무` : ''}
              </BentoPill>
            ) : null}
          </ForcePillsRow>
        </ForceRightStack>
      </ForceVisualRow>
    </ForceBlock>
  )
}

/** 승률(%)을 말할 수 있는 최소 표본 — 결과가 난 교전 수 */
const MIN_DECIDED_FOR_WIN_RATE = 5

const ForceVisualRow = styled.div<{ $hasDonut: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasDonut }) =>
    $hasDonut ? '70px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  gap: 14px;
  align-items: center;
`

const ForceRightStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const ForceBranchBarsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ForceBranchRow = styled.div`
  display: grid;
  grid-template-columns: 78px 1fr 28px;
  align-items: center;
  gap: 8px;
  font-size: 11px;

  .name {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;

    i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }

  .track {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.055)'};
  }

  .fill {
    height: 100%;
    border-radius: 999px;
  }

  .cnt {
    text-align: right;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
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
  totalRecords,
  missingChips,
  recentActivity,
  onSelectActivity,
}: {
  filled?: number
  total?: number
  totalRecords: number
  missingChips: MissingAxisChip[]
  recentActivity: RecentActivityItem[]
  onSelectActivity?: (item: RecentActivityItem) => void
}) {
  const uniqueRecent = useMemo(() => {
    const seen = new Set<string>()
    const list: RecentActivityItem[] = []
    for (const act of recentActivity) {
      const key = `${act.kind}::${act.label.trim()}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push(act)
      if (list.length >= 3) break
    }
    return list
  }, [recentActivity])

  if (missingChips.length === 0 && uniqueRecent.length === 0) return null

  return (
    <FootprintCard aria-label="더 채울 수 있는 기록 및 최근 편집">
      <FootprintLeft>
        <FootprintMeta>
          {missingChips.length > 0 ? (
            <MissingRow>
              <FootprintLeadLabel>더 채울 수 있는 기록</FootprintLeadLabel>
              {missingChips.slice(0, 10).map((chip) => (
                <MissingChipBtn
                  key={chip.key}
                  type="button"
                  onClick={chip.onClick}
                >
                  <FiPlus size={10} /> {chip.label}
                </MissingChipBtn>
              ))}
              {missingChips.length > 10 ? (
                <MoreSpan>+{missingChips.length - 10}</MoreSpan>
              ) : null}
            </MissingRow>
          ) : (
            <MissingRow>
              <FootprintLeadLabel>
                주요 도메인 기록 {totalRecords.toLocaleString('ko-KR')}건 수록됨
              </FootprintLeadLabel>
            </MissingRow>
          )}
        </FootprintMeta>
      </FootprintLeft>

      {uniqueRecent.length > 0 ? (
        <FootprintRight>
          <TickerHeader>
            <FiClock size={11} /> 최근 편집
          </TickerHeader>
          <TickerItems>
            {uniqueRecent.map((act) => (
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

const FootprintLeadLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-right: 4px;
  white-space: nowrap;
`

const FootprintCard = styled.footer`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 20px;
  padding: 20px 0 0;
  border-radius: 0;
  border: none;
  background: transparent;
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
  gap: 3px;
  padding: 3.5px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.07)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
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
  gap: 6px;
  max-width: 210px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.06)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: border-color ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

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
  /**
   * 자료 없음 — 예전엔 미입력 축도 기본 점수(20 등)나 최솟값으로 꼭짓점을 찍어, 다각형이 자료가 있는
   * 것처럼 한쪽으로 꺼진 모양이 됐다. 미입력이면 꼭짓점을 찍지 않는다.
   */
  missing?: boolean
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

  /* 한 축이라도 비면 다각형(면적)은 거짓 모양이 된다 — 있는 축만 바퀴살(중심→값)로 그린다 */
  const allPresent = axes.every((ax) => !ax.missing)
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
      <RadarSvg viewBox="-44 0 308 196" role="img" aria-label="국가 다차원 역량 레이더 차트">
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
        {allPresent ? (
          <polygon
            points={dataPoly}
            fill={accent}
            fillOpacity={theme.mode === 'dark' ? '0.24' : '0.16'}
            stroke={accent}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ) : (
          axes.map((ax, idx) => {
            if (ax.missing) return null
            const ratio = Math.max(0.12, Math.min(1, ax.score / 100))
            const pt = pointAt(idx, ratio)
            return (
              <line
                key={`spoke-${ax.key}`}
                x1={cx}
                y1={cy}
                x2={pt.x}
                y2={pt.y}
                stroke={accent}
                strokeWidth="3"
                strokeLinecap="round"
                opacity={0.85}
              />
            )
          })
        )}
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
              {ax.missing ? (
                <circle
                  cx={pointAt(idx, 1).x}
                  cy={pointAt(idx, 1).y}
                  r="3"
                  fill="none"
                  stroke={gridStroke}
                  strokeWidth="1.3"
                  strokeDasharray="2 1.5"
                />
              ) : (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.3"
                  fill={accent}
                  stroke={ledgerBackground(theme.mode)}
                  strokeWidth="1.3"
                />
              )}
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
                fill={ax.missing ? 'currentColor' : accent}
                opacity={ax.missing ? 0.6 : 1}
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

/* 좌우 라벨('인간개발(HDI)')이 그림 밖으로 잘리던 것 — viewBox 좌우를 44씩 넓히고 폭도 같은 비율로 */
const RadarSvg = styled.svg`
  width: 100%;
  max-width: 320px;
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

  const fullCaption =
    subCaption ?? (showMajorityLine ? `과반 ${majoritySeats}석` : '정원')
  const [centerCaption, ...captionRest] = fullCaption.split(' · ')
  const footCaption = captionRest.join(' · ')

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
          <span>{centerCaption}</span>
        </HemicycleCenterText>
      </HemicycleSvgBox>
      {/* 반원 안쪽은 좁다 — '과반 199석 · 1907년 라이히스탁 선거'를 통째로 넣으면 의석 점 위로 넘쳤다.
          가운데엔 첫 마디만, 나머지(선거·의회 이름)는 반원 아래 한 줄로 */}
      {footCaption ? <HemicycleFootCaption>{footCaption}</HemicycleFootCaption> : null}

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

const HemicycleFootCaption = styled.div`
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
      ? '#10b981'
      : '#059669'
  const secondaryStop = inverted ? '#f43f5e' : '#0ea5e9'
  const yieldGradId = `yc-${curve.year}`

  const pathD = curve.pts
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${toX(pt.pos).toFixed(1)} ${toY(pt.val).toFixed(1)}`,
    )
    .join(' ')
  const areaD = `${pathD} L ${toX(maxPos).toFixed(1)} 94 L ${toX(minPos).toFixed(1)} 94 Z`

  return (
    <YieldCurveWrap>
      <YieldCurveSvgBox style={{ height }}>
        <svg viewBox="0 0 100 96" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={yieldGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={secondaryStop} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${yieldGradId})`} />
          <path
            d={pathD}
            fill="none"
            stroke={stroke}
            strokeWidth="2.1"
            vectorEffect="non-scaling-stroke"
          />
          {curve.pts.map((pt) => (
            <path
              key={pt.code}
              d={`M ${toX(pt.pos).toFixed(1)} ${toY(pt.val).toFixed(1)} l 0 0.01`}
              stroke={stroke}
              strokeWidth="5.5"
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

/** 히트맵에 빈 세기까지 채워 세울 최대 열 수 — 넘으면 있는 세기만 */
const MAX_CENTURY_COLUMNS = 24

function formatCenturyCol(century: number): string {
  return century < 0 ? `BC${Math.abs(century)}` : `${century}c`
}

export function CenturyEventMatrixAndMilestones({
  buckets,
  domainBreakdown,
  milestones = [],
  onSelectCentury,
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

  const domainSlices = useMemo<SegmentSlice[]>(() => {
    const totalCount = domainBreakdown.reduce(
      (sumAcc, item) => sumAcc + item.count,
      0,
    )
    return domainBreakdown.slice(0, 6).map((item) => {
      const pct =
        totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0
      return {
        key: item.domain,
        label: domainLabel(item.domain),
        value: item.count,
        color: domainAccent(item.domain, theme.mode),
        meta: `${item.count}건 (${pct}%)`,
      }
    })
  }, [domainBreakdown, theme.mode])

  if (buckets.length === 0 && milestones.length === 0) return null

  const hasBoth = buckets.length > 0 && milestones.length > 0
  const visibleMilestones = milestones.slice(0, 5)
  const topDomainSlice = domainSlices[0] ?? null
  const totalDomainEvents = domainBreakdown.reduce(
    (sumAcc, item) => sumAcc + item.count,
    0,
  )
  const topDomainSharePct =
    topDomainSlice && totalDomainEvents > 0
      ? Math.round((topDomainSlice.value / totalDomainEvents) * 100)
      : null

  return (
    <EventMatrixContainer $split={hasBoth}>
      {buckets.length > 0 && (
        <EventChartPane>
          <BentoSubLabel>
            <span>시대 · 분야별 사건 비중</span>
            {buckets.length >= 2 ? (
              <span>
                {formatCenturyCol(buckets[0].century)} –{' '}
                {formatCenturyCol(buckets[buckets.length - 1].century)}
              </span>
            ) : null}
          </BentoSubLabel>

          {domainSlices.length > 0 ? (
            <EventDomainSummaryBox>
              <MiniDonutRing
                slices={domainSlices}
                size={66}
                strokeWidth={8.5}
                centerValue={
                  topDomainSharePct != null ? `${topDomainSharePct}%` : undefined
                }
                centerLabel={topDomainSlice?.label}
              />
              <EventDomainPillsCol>
                {domainSlices.map((sliceItem) => (
                  <EventDomainPill key={sliceItem.key}>
                    <i style={{ background: sliceItem.color }} />
                    <span>{sliceItem.label}</span>
                    <strong>{sliceItem.value}</strong>
                  </EventDomainPill>
                ))}
              </EventDomainPillsCol>
            </EventDomainSummaryBox>
          ) : null}

          <StackedCenturyDomainChart
            buckets={buckets}
            domainBreakdown={domainBreakdown}
            onSelectCentury={onSelectCentury}
            hideLegend
          />
        </EventChartPane>
      )}

      {visibleMilestones.length > 0 && (
        <MilestoneStripWrap $split={hasBoth} $noTopBorder={buckets.length === 0}>
          <BentoSubLabel>
            <span>연대기 순 핵심 역사 전환점</span>
            <span>시간순 흐름 ↓</span>
          </BentoSubLabel>
          <ChronoSpineList>
            {visibleMilestones.map((ms) => {
              const accentHex = domainAccent(ms.domain, theme.mode)
              const kindBadge =
                ms.eventTypeLabel || domainLabel(ms.domain)
              return (
                <ChronoNodeBtn
                  key={ms.id}
                  type="button"
                  $accentColor={accentHex}
                  onClick={() => onSelectEvent?.(ms.id)}
                >
                  <span className="yr-col">{ms.yearLabel}</span>
                  <span className="rail-col" aria-hidden="true">
                    <i className="dot" style={{ background: accentHex }} />
                  </span>
                  <div className="content-col">
                    <div className="meta-line">
                      <span
                        className="kind-pill"
                        style={{
                          color: accentHex,
                          background:
                            theme.mode === 'dark'
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(15,23,42,0.045)',
                        }}
                      >
                        {domainLabel(ms.domain)} · {kindBadge}
                      </span>
                      {ms.polityName ? (
                        <small className="polity">{ms.polityName}</small>
                      ) : null}
                    </div>
                    <strong className="title">{ms.title}</strong>
                  </div>
                </ChronoNodeBtn>
              )
            })}
          </ChronoSpineList>
        </MilestoneStripWrap>
      )}
    </EventMatrixContainer>
  )
}

const EventMatrixContainer = styled.div<{ $split: boolean }>`
  display: grid;
  grid-template-columns: ${({ $split }) =>
    $split ? 'minmax(290px, 0.98fr) minmax(0, 1.22fr)' : 'minmax(0, 1fr)'};
  gap: ${({ $split }) => ($split ? '22px' : '14px')};
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

const EventChartPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const EventDomainSummaryBox = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(15, 23, 42, 0.024)'};
`

const EventDomainPillsCol = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px 8px;
  min-width: 0;
  flex: 1;
`

const EventDomainPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.045)'
      : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.06)'};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  strong {
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
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

const MilestoneStripWrap = styled.div<{
  $split?: boolean
  $noTopBorder?: boolean
}>`
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding-top: ${({ $split, $noTopBorder }) =>
    $split || $noTopBorder ? 0 : '8px'};
  padding-left: ${({ $split }) => ($split ? '16px' : '0')};
  border-top: ${({ $split, $noTopBorder, theme }) =>
    $split || $noTopBorder ? 'none' : `1px solid ${ledgerHairline(theme.mode)}`};
  border-left: ${({ $split, theme }) =>
    $split ? `1px solid ${ledgerHairline(theme.mode)}` : 'none'};

  @media (max-width: 960px) {
    padding-left: 0;
    border-left: none;
    padding-top: ${({ $noTopBorder }) => ($noTopBorder ? 0 : '10px')};
    border-top: ${({ $noTopBorder, theme }) =>
      $noTopBorder ? 'none' : `1px solid ${ledgerHairline(theme.mode)}`};
  }
`

const ChronoSpineList = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;

  &::before {
    content: '';
    position: absolute;
    left: 73px;
    top: 16px;
    bottom: 16px;
    width: 2px;
    border-radius: 999px;
    background: linear-gradient(
      180deg,
      #6366f1 0%,
      #0ea5e9 38%,
      #10b981 72%,
      #f59e0b 100%
    );
    opacity: 0.45;
    pointer-events: none;
  }
`

const ChronoNodeBtn = styled.button<{ $accentColor: string }>`
  position: relative;
  display: grid;
  grid-template-columns: 62px 24px minmax(0, 1fr);
  align-items: center;
  gap: 0;
  padding: 8px 12px 8px 6px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.035)'
      : 'rgba(15, 23, 42, 0.025)'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    transform ${MOTION.fast} ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.12)'
        : 'rgba(79, 70, 229, 0.055)'};
    transform: translateX(2px);
  }

  .yr-col {
    font-size: 11px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    text-align: right;
    padding-right: 4px;
    white-space: nowrap;
    ${DIGIT_DISPLAY}
  }

  .rail-col {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      box-shadow: 0 0 0 3px
        ${({ theme }) => (theme.mode === 'dark' ? '#111827' : '#ffffff')};
    }
  }

  .content-col {
    display: flex;
    flex-direction: column;
    gap: 2.5px;
    min-width: 0;
    padding-left: 6px;
  }

  .meta-line {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .kind-pill {
    display: inline-flex;
    align-items: center;
    padding: 1.5px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 750;
    white-space: nowrap;
  }

  .polity {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .title {
    font-size: 12px;
    font-weight: 720;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  if (personCount === 0 || spotlight.featured.length === 0) return null

  const roleSlices = useMemo<SegmentSlice[]>(() => {
    const list: SegmentSlice[] = []
    if (spotlight.roleCounts.rulers > 0) {
      list.push({
        key: 'rulers',
        label: '국가수반',
        value: spotlight.roleCounts.rulers,
        color: ledgerAccent(theme.mode),
        meta: `${spotlight.roleCounts.rulers}명`,
      })
    }
    if (spotlight.roleCounts.ministers > 0) {
      list.push({
        key: 'ministers',
        label: '관료·장성',
        value: spotlight.roleCounts.ministers,
        color: theme.mode === 'dark' ? '#38bdf8' : '#0284c7',
        meta: `${spotlight.roleCounts.ministers}명`,
      })
    }
    if (spotlight.roleCounts.figures > 0) {
      list.push({
        key: 'figures',
        label: '학자·인물',
        value: spotlight.roleCounts.figures,
        color: theme.mode === 'dark' ? '#94a3b8' : '#64748b',
        meta: `${spotlight.roleCounts.figures}명`,
      })
    }
    return list
  }, [spotlight.roleCounts, theme.mode])

  return (
    <BentoCard aria-label="주요 인물">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>주요 인물</BentoCardTitle>
          <BentoCardBadge>{personCount.toLocaleString('ko-KR')}명</BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenPersonsTab}>
            인물 전체 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {roleSlices.length > 1 ? (
          <StackedSegmentBar slices={roleSlices} height={7} />
        ) : null}

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
      </BentoCardBody>
    </BentoCard>
  )
}

const FiguresRoleMetaText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

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
