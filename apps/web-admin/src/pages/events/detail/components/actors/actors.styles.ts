import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

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
import { toolbarControlHeight } from '@/pages/events/styles/theme'

import * as S from '../../styles'
import { CLAMP_LINES } from './actors.lib'

export const mutedTextColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.64)' : 'rgba(15,23,42,0.62)'

export type RoleVisualTone = 'blue' | 'rose' | 'emerald' | 'amber' | 'violet' | 'neutral'

export function roleVisualToneOf(role: string | null | undefined): RoleVisualTone {
  switch (role) {
    case 'INITIATOR':
      return 'blue'
    case 'TARGET':
    case 'VICTIM':
      return 'rose'
    case 'BENEFICIARY':
    case 'FOUNDED':
      return 'emerald'
    case 'MEDIATOR':
    case 'OBSERVER':
      return 'amber'
    case 'DISSOLVED':
      return 'violet'
    default:
      return 'neutral'
  }
}

const roleToneStyles = (tone: RoleVisualTone, mode: 'light' | 'dark') => {
  switch (tone) {
    case 'blue':
      return css`
        color: ${mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
        background: ${mode === 'dark' ? 'rgba(59,130,246,0.16)' : 'rgba(37,99,235,0.08)'};
        border-color: ${mode === 'dark' ? 'rgba(96,165,250,0.32)' : 'rgba(37,99,235,0.24)'};
      `
    case 'rose':
      return css`
        color: ${mode === 'dark' ? '#fca5a5' : '#b91c1c'};
        background: ${mode === 'dark' ? 'rgba(239,68,68,0.16)' : 'rgba(220,38,38,0.08)'};
        border-color: ${mode === 'dark' ? 'rgba(248,113,113,0.32)' : 'rgba(220,38,38,0.22)'};
      `
    case 'emerald':
      return css`
        color: ${mode === 'dark' ? '#6ee7b7' : '#047857'};
        background: ${mode === 'dark' ? 'rgba(16,185,129,0.16)' : 'rgba(5,150,105,0.08)'};
        border-color: ${mode === 'dark' ? 'rgba(52,211,153,0.32)' : 'rgba(5,150,105,0.24)'};
      `
    case 'amber':
      return css`
        color: ${mode === 'dark' ? '#fcd34d' : '#b45309'};
        background: ${mode === 'dark' ? 'rgba(245,158,11,0.16)' : 'rgba(217,119,6,0.08)'};
        border-color: ${mode === 'dark' ? 'rgba(251,191,36,0.32)' : 'rgba(217,119,6,0.24)'};
      `
    case 'violet':
      return css`
        color: ${mode === 'dark' ? '#ddd6fe' : '#6d28d9'};
        background: ${mode === 'dark' ? 'rgba(139,92,246,0.16)' : 'rgba(124,58,237,0.08)'};
        border-color: ${mode === 'dark' ? 'rgba(167,139,250,0.32)' : 'rgba(124,58,237,0.24)'};
      `
    default:
      return css`
        color: ${mutedTextColor(mode)};
        background: ${ledgerSubtleFill(mode)};
        border-color: ${ledgerHairlineStrong(mode)};
      `
  }
}

/* ─── Section Top Header & Compact Unified Command Toolbar ─── */

export const ActorsCanvas = styled.div`
  ${S.breakout}
  display: flex;
  flex-direction: column;
  gap: 18px;
`

export const ActorsHeader = styled(S.SectionHeader)`
  ${S.breakout}
  padding-left: ${S.breakoutGutter};
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 16px;
`

export const ActorsHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 280px;
`

export const ActorsHeaderRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

export const ActorsSubtitle = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ActorsSummary = styled.span`
  margin-left: 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  ${DIGIT_DISPLAY}
`

export const CommandToolbarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
`

export const CommandToolbarLeft = styled.div`
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;

  @media (max-width: 640px) {
    flex: 1 1 100%;
  }
`

export const CommandToolbarRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

export const HeaderControlBtn = styled.button<{ $active?: boolean; $primary?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $active, $primary }) =>
      $primary
        ? 'transparent'
        : $active
          ? ledgerAccentBorder(theme.mode)
          : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active, $primary }) =>
    $primary
      ? ledgerAccent(theme.mode)
      : $active
        ? ledgerAccentSubtle(theme.mode)
        : theme.colors.background.primary};
  color: ${({ theme, $active, $primary }) =>
    $primary
      ? theme.mode === 'dark'
        ? ledgerBackground('dark')
        : '#ffffff'
      : $active
        ? ledgerAccent(theme.mode)
        : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    opacity ${MOTION.fast} ease;

  &:hover {
    ${({ theme, $primary, $active }) =>
      $primary
        ? css`
            opacity: 0.92;
          `
        : css`
            color: ${$active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
            background: ${$active
              ? ledgerAccentSubtle(theme.mode)
              : ledgerHoverFill(theme.mode)};
            border-color: ${ledgerAccentBorder(theme.mode)};
          `}
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export const ManageBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 12px;
  border-left: 3px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-weight: 700;
  }
`

/* ─── Pure Flat Hairline Ledger Sections (Zero Outer Card Box) ─── */

export const ActorSectionCard = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  outline-offset: 4px;
`

export const ActorSectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
  padding: 0 2px 8px;
  border-bottom: 1.5px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const ActorSectionTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const ActorSectionTitleRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

export const SectionHintText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const GroupLabel = styled.h3`
  margin: 0;
  font-size: 13.5px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const GroupCount = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ $muted }) => ($muted ? '0' : '1px 7px')};
  border-radius: ${RADIUS.PILL};
  background: ${({ theme, $muted }) =>
    $muted ? 'transparent' : ledgerAccentSubtle(theme.mode)};
  font-size: 11px;
  font-weight: ${({ $muted }) => ($muted ? 500 : 700)};
  color: ${({ theme, $muted }) =>
    $muted ? mutedTextColor(theme.mode) : ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

export const GroupCaption = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ActorSectionHeadActions = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const ActorSectionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
`

export const EmptyActorsCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  padding: 14px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  font-size: 12.5px;
  line-height: 1.55;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

export const EmptyGroupLine = styled.div`
  padding: 8px 10px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* ─── Side Confrontation Columns & Flat Hairline Lists ─── */

export const SideColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px 28px;
  padding-top: 12px;
  align-items: start;

  @container eventdetail (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SideGroup = styled.div<{ $rest?: boolean; $dragOver?: boolean; $color?: string }>`
  min-width: 0;
  padding: 10px 0 0;
  border-top: ${({ $color, theme }) =>
    $color ? `2.5px solid ${$color}` : `1.5px solid ${ledgerHairlineStrong(theme.mode)}`};
  background: transparent;
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  outline-offset: 4px;
  ${({ $rest }) => ($rest ? 'grid-column: 1 / -1;' : '')}
`

export const SideHead = styled.div<{ $color?: string }>`
  margin: 0;
  padding: 0 2px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const SideHeadTitle = styled.h4`
  margin: 0;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
`

export const SideHeadRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

export const SideSwatch = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 2.5px;
  background: ${({ $color }) => $color};
`

export const SideOutcomeTag = styled.span`
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

export const SideQuickAddBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const SideCountryList = styled.ol<{ $restGrid?: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

export const CountryList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

export const PersonList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

/* ─── Shared Row Controls (Clean Single-Row + ⋯ Consolidation) ─── */

export const RowTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

export const RowControls = styled.div`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: opacity ${MOTION.fast} ease;
`

/*
 * 행 버튼(인물·참여 바꾸기·⋯)은 그 행에 마우스가 오거나 키보드 포커스가 들어올 때만 보인다 — 14개국·15명 사건에서
 * 상시 노출 버튼이 40개를 넘어 이름·서술보다 먼저 눈에 걸렸다. 터치(hover 없음)·정렬 모드(data-pinned)·
 * 메뉴가 열린 동안(aria-expanded)은 늘 보인다. opacity만 바꿔 자리는 지킨다(행 높이·줄바꿈이 흔들리지 않게).
 */
const revealRowControlsOnHover = css`
  @media (hover: hover) and (pointer: fine) {
    ${RowControls}:not([data-pinned]) {
      opacity: 0;
    }

    &:hover ${RowControls}, &:focus-within ${RowControls}, ${RowControls}:has([aria-expanded='true']) {
      opacity: 1;
    }
  }
`

export const DragGrip = styled.span`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 24px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  svg {
    width: 15px;
    height: 15px;
  }
`

export const GhostRowBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 12.5px;
    height: 12.5px;
  }
`

export const SemanticRolePill = styled.button<{ $tone: RoleVisualTone; $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  ${({ $tone, theme }) => roleToneStyles($tone, theme.mode)}
  ${({ $active, theme }) =>
    $active &&
    css`
      box-shadow: 0 0 0 2px ${ledgerAccentSubtle(theme.mode)};
    `}

  svg {
    width: 10px;
    height: 10px;
    opacity: 0.75;
  }

  &:hover {
    filter: brightness(0.96);
  }
`

export const QuickSideAssignBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px dashed ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

/* ─── Country Row (Flat Hairline Row + Indented Tree Delegation) ─── */

export const CountryRow = styled.li<{ $dragOver?: boolean; $editing?: boolean; $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $editing }) =>
    $editing ? ledgerSubtleFill(theme.mode) : 'transparent'};
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  outline-offset: -2px;
  transition: background ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme, $editing }) =>
      $editing ? ledgerSubtleFill(theme.mode) : ledgerHoverFill(theme.mode)};
  }

  &[draggable='true'] {
    cursor: grab;
  }
  &[draggable='true']:active {
    cursor: grabbing;
  }
`

export const CountryCard = styled.div`
  position: relative;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  ${revealRowControlsOnHover}
`

export const CountryBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

export const CountryNameLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const CountryFlag = styled.span<{ $monogram?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-style: normal;
  vertical-align: middle;
  flex-shrink: 0;
  ${({ $monogram, theme }) =>
    $monogram
      ? css`
          font-size: 11.5px;
          font-weight: 800;
          color: ${theme.colors.text.secondary};
        `
      : css`
          font-size: 15px;
        `}
`

export const CountryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  font-weight: inherit;
  line-height: 1.3;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

export const HistoricalCountryName = styled(CountryLink)``

export const CountryRoleTag = styled.span<{ $tone?: RoleVisualTone }>`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  ${({ $tone = 'neutral', theme }) => roleToneStyles($tone, theme.mode)}
`

export const CountryFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  padding-left: 31px;
  font-size: 11.5px;
  line-height: 1.4;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const FactTag = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 6px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 600;
  line-height: 19px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  ${({ $color }) =>
    $color
      ? `&::before { content: ''; width: 6px; height: 6px; border-radius: 2px; background: ${$color}; }`
      : ''}
`

export const CountryForceInline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 1px 0 0 31px;
  max-width: 360px;
`

export const CountryForceHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    font-size: 12px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

export const CountryForceTrack = styled.div`
  height: 4px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  overflow: hidden;
`

export const CountryForceFill = styled.div<{ $color?: string | null }>`
  height: 100%;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme, $color }) => $color || ledgerAccent(theme.mode)};
`

export const FigureChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-left: 31px;
`

export const FigureChip = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  strong {
    font-size: 11.5px;
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
`

export const CountryRoleLine = styled.div<{ $hasContent: boolean }>`
  display: flex;
  flex-direction: column;
  padding-left: 31px;
  font-size: 13px;
  line-height: 1.56;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const CountryNoteLine = styled.div<{ $hasContent: boolean }>`
  padding-left: 31px;
  font-size: 12px;
  line-height: 1.52;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

/** 나라 행 아래에 상자 없이 들여쓰기 트리로 이어지는 소속 대표·인물 */
export const DelegationSection = styled.div`
  margin: 0 6px 8px 20px;
  padding: 2px 0 2px 11px;
  border-left: 1.5px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const DelegationCaption = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 1px 6px 3px;
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const DelegationList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const DelegationMore = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 2px 6px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

/* ─── Person Row (Flat Hairline Row & Indented Delegate Row) ─── */

export const PersonRow = styled.li<{
  $compact?: boolean
  $dragOver?: boolean
  $editing?: boolean
}>`
  position: relative;
  display: block;
  min-width: 0;
  padding: ${({ $compact }) => ($compact ? '4px 6px' : '10px 6px')};
  border-radius: ${({ $compact }) => ($compact ? RADIUS.XS : '0')};
  border-bottom: ${({ $compact, theme }) =>
    $compact ? 'none' : `1px solid ${ledgerHairline(theme.mode)}`};
  background: ${({ theme, $editing }) =>
    $editing ? ledgerSubtleFill(theme.mode) : 'transparent'};
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  outline-offset: -2px;
  transition: background ${MOTION.fast} ease;

  &[draggable='true'] {
    cursor: grab;
  }
  &[draggable='true']:active {
    cursor: grabbing;
  }

  &:hover {
    background: ${({ theme, $editing }) =>
      $editing ? ledgerSubtleFill(theme.mode) : ledgerHoverFill(theme.mode)};
  }

  ${revealRowControlsOnHover}
`

export const PersonBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const PersonNameLine = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 7px;
  min-width: 0;
`

export const PersonAvatarBtn = styled.button`
  flex: none;
  align-self: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

export const PersonAvatar = styled.span<{ $hasImage: boolean; $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $compact }) => ($compact ? '21px' : '24px')};
  height: ${({ $compact }) => ($compact ? '21px' : '24px')};
  overflow: hidden;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $hasImage }) =>
    $hasImage ? 'transparent' : ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 800;
  line-height: 1;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(0.18) contrast(1.02);
    transition: filter 0.18s;
  }

  ${PersonAvatarBtn}:hover & img {
    filter: grayscale(0) contrast(1);
  }
`

export const PersonNameBtn = styled.button<{ $compact?: boolean }>`
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: ${({ $compact }) => ($compact ? '13px' : '14.5px')};
  font-weight: ${({ $compact }) => ($compact ? 650 : 750)};
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  line-height: 1.3;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

export const PersonMetaLine = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
  padding-left: ${({ $compact }) => ($compact ? '28px' : '31px')};
  font-size: 11.5px;
  line-height: 1.42;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const OfficeAtEvent = styled.span`
  font-weight: 500;
`

export const PersonRoleLine = styled.div<{ $compact?: boolean }>`
  padding-left: ${({ $compact }) => ($compact ? '28px' : '31px')};
  font-size: 12.5px;
  line-height: 1.48;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
`

export const PersonNoteLine = styled.div<{ $hasContent: boolean; $compact?: boolean }>`
  padding-left: ${({ $compact }) => ($compact ? '28px' : '31px')};
  font-size: 13px;
  line-height: 1.56;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  flex-direction: column;
`

export const AddInfoButton = styled.button<{ $compact?: boolean; $inline?: boolean }>`
  align-self: flex-start;
  margin-left: ${({ $inline, $compact }) => ($inline ? '0' : $compact ? '28px' : '31px')};
  padding: 1px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11.5px;
  font-weight: 550;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: color ${MOTION.fast} ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/* ─── Alerts & Badges ─── */

export const MismatchNote = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  background: ${({ theme }) => theme.colors.alert.warning.bg};
  border-radius: ${RADIUS.PILL};
  white-space: nowrap;
`

export const ReplaceCountryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border: 1px dashed ${({ theme }) => ledgerAccent(theme.mode)};
  border-radius: ${RADIUS.PILL};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 10.5px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

export const DeathAtEventBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(185, 28, 28, 0.09)'};
  border-radius: ${RADIUS.PILL};
  white-space: nowrap;
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

/* ─── Flat Inline ActorEditPanel (No Nested Card Box, Unified 34px Inputs) ─── */

export const EditPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
  padding: 10px 2px 4px;
  border-top: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
`

export const EditPanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const EditGrid = styled.div`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: start;
  gap: 8px 14px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
  }
`

export const EditField = styled.div`
  display: contents;
`

export const EditInlinePair = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const EditInlineField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const EditLabel = styled.label`
  padding-top: 7px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};

  @media (max-width: 560px) {
    padding-top: 4px;
  }
`

export const EditInlineLabel = styled.label`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ChoiceChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 0;
`

export const ChoiceChip = styled.button<{ $selected: boolean; $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 10px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ $selected, $muted, theme }) =>
      $selected && !$muted
        ? ledgerAccent(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ $selected, $muted, theme }) =>
    !$selected
      ? theme.colors.background.primary
      : $muted
        ? ledgerHoverFill(theme.mode)
        : ledgerAccentSubtle(theme.mode)};
  color: ${({ $selected, $muted, theme }) =>
    $selected && !$muted
      ? ledgerAccent(theme.mode)
      : $muted
        ? mutedTextColor(theme.mode)
        : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $selected, $muted }) => ($selected && !$muted ? 700 : 550)};
  white-space: nowrap;
  cursor: ${({ $selected }) => ($selected ? 'default' : 'pointer')};

  &:hover {
    border-color: ${({ $selected, theme }) =>
      $selected ? undefined : ledgerAccentBorder(theme.mode)};
    color: ${({ $selected, theme }) =>
      $selected ? undefined : theme.colors.text.primary};
  }
`

const editControl = css`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  line-height: 1.5;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    box-shadow: 0 0 0 2px ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

export const EditInput = styled.input`
  ${editControl}
  ${toolbarControlHeight}
  padding-top: 0;
  padding-bottom: 0;
`

export const EditTextarea = styled.textarea`
  ${editControl}
  min-height: 60px;
  resize: none;
  overflow: hidden;
`

export const EditFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const EditHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const EditDone = styled.button`
  flex: none;
  ${toolbarControlHeight}
  padding: 0 15px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      `color-mix(in srgb, ${ledgerAccent(theme.mode)} 16%, transparent)`};
  }
`

/* ─── Clamped Prose ─── */

export const ProseClamp = styled.div<{ $collapsed: boolean; $faded: boolean }>`
  ${({ $collapsed }) =>
    $collapsed &&
    css`
      max-height: calc(${CLAMP_LINES} * 1lh + 4px);
      overflow: hidden;
    `}
  ${({ $faded }) =>
    $faded &&
    css`
      mask-image: linear-gradient(#000, #000),
        linear-gradient(to right, #000 calc(100% - 7em), transparent calc(100% - 4.5em));
      mask-size: 100% calc(100% - 1lh - 4px), 100% calc(1lh + 4px);
      mask-position: top, bottom;
      mask-repeat: no-repeat;
    `}

  &:focus-within {
    max-height: none;
    mask-image: none;
  }

  &:focus-within + * {
    display: none;
  }

  strong {
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ClampHost = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`

export const FloatingMoreSlot = styled.div`
  position: absolute;
  right: 0;
  bottom: 4px;
  height: 1lh;
  display: flex;
  align-items: center;

  > button {
    margin: 0;
  }
`

export const MoreToggle = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  font-style: normal;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

export const ShowAllToggle = styled.button`
  display: block;
  width: 100%;
  ${toolbarControlHeight}
  padding: 0 12px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 650;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

/* ─── Self-Explanatory Flat Add Rows for Secondary Institutional Links ─── */

export const CollapsedActorSlot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 14px;
  width: 100%;
  padding: 8px 2px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:first-child {
    border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

export const CollapsedActorInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  min-width: 0;
  flex: 1 1 240px;

  strong {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }

  span {
    font-size: 12px;
    line-height: 1.45;
    color: ${({ theme }) => mutedTextColor(theme.mode)};
  }
`

export const CollapsedActorChipBtn = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};

    svg {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/**
 * 진영 묶음 끝 '소속국과 다른 편' 머리 — 내전처럼 소속국과 반대편에 선 인물을 그 진영 안에 세울 때.
 * 나라 줄과 구분되는 작은 꼬리표일 뿐, 묶음을 하나 더 세우지 않는다.
 */
export const CrossSideLabel = styled.li`
  margin: 6px 0 2px;
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`
