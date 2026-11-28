import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { COLUMN_HEAD_BAND, ROW_HAIRLINE } from '@/pages/events/styles/theme'

export const PageScene = styled.div`
  position: fixed;
  top: var(--header-height, 64px);
  left: var(--content-left-inset, 0px);
  right: 0;
  bottom: 0;
  height: calc(100vh - var(--header-height, 64px));
  padding-top: 8px;
  padding-bottom: max(14px, env(safe-area-inset-bottom));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};

  @media (max-width: 768px) {
    height: calc(100dvh - var(--header-height, 64px));
  }
`

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 0 clamp(16px, 1.2vw, 32px);
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

export const TopChrome = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-shrink: 0;
`

export const TopHeadlineGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
`

export const AccentBar = styled.span`
  width: 3px;
  height: 30px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SummaryLine = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }

  .sep {
    opacity: 0.45;
  }

  .accent {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    b {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }

  .warn {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
    cursor: pointer;
    font-weight: 600;
    &:hover {
      text-decoration: underline;
    }
  }

  @media (max-width: 640px) {
    display: none;
  }
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

export const CrossDomainNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-right: 4px;

  @media (max-width: 1100px) {
    display: none;
  }
`

export const CrossDomainLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

export const TopToolbarCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
`

export const TopFilterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

export const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 480px;
  min-width: 0;
  flex-wrap: wrap;
`

export const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
`

export const DomainSegment = styled.div`
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 2px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9'};
`

export const SegmentBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 100%;
  padding: 0 11px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ theme, $active }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.06)'
      : 'none'};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const SegmentCount = styled.span<{ $active?: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 999px;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.06)'};
`

export const SearchInputWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 220px;
  flex: 1 1 240px;
  max-width: 340px;
  height: 34px;
  padding: 0 10px;
  gap: 7px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};

  &:focus-within {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 12.5px;
  }
`

export const ClearSearchBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const SubFilterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0 6px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-wrap: wrap;
`

export const FilterChipGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

export const FilterChip = styled.button<{ $active?: boolean; $warn?: boolean }>`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid
    ${({ theme, $active, $warn }) =>
      $active
        ? $warn
          ? 'rgba(245, 158, 11, 0.5)'
          : ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active, $warn }) =>
    $active
      ? $warn
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.16)'
          : '#fef3c7'
        : ledgerAccentSubtle(theme.mode)
      : 'transparent'};
  color: ${({ theme, $active, $warn }) =>
    $active
      ? $warn
        ? theme.mode === 'dark'
          ? '#fcd34d'
          : '#92400e'
        : ledgerAccent(theme.mode)
      : theme.colors.text.secondary};

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

export const InlineSelect = styled.select`
  height: 29px;
  padding: 0 26px 0 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`

export const PolityPickerBox = styled.div`
  width: 220px;
  min-width: 180px;
`

export const SplitWorkspace = styled.div<{ $hasDrawer?: boolean }>`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: ${({ $hasDrawer }) =>
    $hasDrawer ? 'minmax(0, 1fr) minmax(420px, 500px)' : 'minmax(0, 1fr)'};
  gap: 14px;
  overflow: hidden;

  @media (max-width: 1080px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const LedgerPane = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const POS_GRID_TEMPLATE =
  '52px 118px minmax(180px, 1.3fr) minmax(190px, 1.4fr) 132px'

export const LedgerHeaderBand = styled.div`
  ${COLUMN_HEAD_BAND}
  display: grid;
  grid-template-columns: ${POS_GRID_TEMPLATE};
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-shrink: 0;

  @media (max-width: 820px) {
    grid-template-columns: 44px 104px minmax(140px, 1fr) 92px;
    [data-col='scope'] {
      display: none;
    }
  }
`

export const LedgerScrollList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

export const LedgerRow = styled.div<{ $selected?: boolean }>`
  ${ROW_HAIRLINE}
  display: grid;
  grid-template-columns: ${POS_GRID_TEMPLATE};
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  border-left: 3px solid
    ${({ theme, $selected }) =>
      $selected ? ledgerAccent(theme.mode) : 'transparent'};

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 820px) {
    grid-template-columns: 44px 104px minmax(140px, 1fr) 92px;
    [data-col='scope'] {
      display: none;
    }
  }
`

export const RankNumCell = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TONE_PALETTE = {
  amber: { lightBg: '#fef3c7', lightFg: '#92400e', darkBg: 'rgba(245,158,11,0.16)', darkFg: '#fcd34d' },
  blue: { lightBg: '#dbeafe', lightFg: '#1e40af', darkBg: 'rgba(59,130,246,0.18)', darkFg: '#93c5fd' },
  emerald: { lightBg: '#d1fae5', lightFg: '#065f46', darkBg: 'rgba(16,185,129,0.16)', darkFg: '#6ee7b7' },
  teal: { lightBg: '#ccfbf1', lightFg: '#115e59', darkBg: 'rgba(20,184,166,0.16)', darkFg: '#5eead4' },
  sky: { lightBg: '#e0f2fe', lightFg: '#0369a1', darkBg: 'rgba(14,165,233,0.16)', darkFg: '#7dd3fc' },
  violet: { lightBg: '#ede9fe', lightFg: '#5b21b6', darkBg: 'rgba(139,92,246,0.18)', darkFg: '#c4b5fd' },
  rose: { lightBg: '#ffe4e6', lightFg: '#9f1239', darkBg: 'rgba(244,63,94,0.16)', darkFg: '#fda4af' },
  orange: { lightBg: '#ffedd5', lightFg: '#9a3412', darkBg: 'rgba(249,115,22,0.16)', darkFg: '#fdba74' },
  slate: { lightBg: '#f1f5f9', lightFg: '#334155', darkBg: 'rgba(148,163,184,0.14)', darkFg: '#cbd5e1' },
} as const

export const TypeBadge = styled.span<{ $tone?: keyof typeof TONE_PALETTE }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${({ theme, $tone = 'slate' }) => {
    const p = TONE_PALETTE[$tone] ?? TONE_PALETTE.slate
    return css`
      background: ${theme.mode === 'dark' ? p.darkBg : p.lightBg};
      color: ${theme.mode === 'dark' ? p.darkFg : p.lightFg};
    `
  }}
`

export const TitleCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const TitleMainLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const TitleSubLine = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const MonarchMiniTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.18)' : '#fef9c3'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fde047' : '#854d0e')};
  flex-shrink: 0;
`

export const ScopeChipsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 0;
`

export const ScopePill = styled.span<{
  $kind?: 'universal' | 'polity' | 'institution'
}>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 185px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid
    ${({ theme, $kind }) =>
      $kind === 'universal'
        ? theme.mode === 'dark'
          ? 'rgba(56,189,248,0.3)'
          : '#bae6fd'
        : $kind === 'institution'
          ? theme.mode === 'dark'
            ? 'rgba(167,139,250,0.32)'
            : '#ddd6fe'
          : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $kind }) =>
    $kind === 'universal'
      ? theme.mode === 'dark'
        ? 'rgba(14,165,233,0.12)'
        : '#f0f9ff'
      : $kind === 'institution'
        ? theme.mode === 'dark'
          ? 'rgba(139,92,246,0.12)'
          : '#f5f3ff'
        : ledgerChipFill(theme.mode)};
  color: ${({ theme, $kind }) =>
    $kind === 'universal'
      ? theme.mode === 'dark'
        ? '#7dd3fc'
        : '#0369a1'
      : $kind === 'institution'
        ? theme.mode === 'dark'
          ? '#c4b5fd'
          : '#5b21b6'
        : theme.colors.text.secondary};
`

export const UsageCell = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex-wrap: wrap;
`

export const UsagePill = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

/* ─── Right Detail & Editor Drawer ─── */

export const DetailPane = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;

  @media (max-width: 1080px) {
    position: fixed;
    top: var(--header-height, 64px);
    right: 0;
    bottom: 0;
    width: min(500px, 100vw);
    z-index: 60;
    border-radius: 0;
    box-shadow: -8px 0 28px rgba(0, 0, 0, 0.22);
  }
`

export const DetailHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 16px 11px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-shrink: 0;
`

export const DetailTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const DetailTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-shrink: 0;
`

export const DetailTabBtn = styled.button<{ $active?: boolean }>`
  ${DIGIT_DISPLAY}
  padding: 9px 11px 8px;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const DetailScrollBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const FormFieldGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols = 2 }) =>
    $cols === 1 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'};
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FieldBlock = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  > span.lbl {
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

export const TextInput = styled.input`
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

export const TextArea = styled.textarea`
  min-height: 68px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

export const SectionCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

export const SectionCardTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const RuleCallout = styled.div`
  font-size: 11.5px;
  line-height: 1.5;
  padding: 9px 11px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const DetailFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  flex-shrink: 0;
`

export const ActionBtn = styled.button<{
  $variant?: 'primary' | 'danger' | 'ghost'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 33px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  ${({ theme, $variant = 'ghost' }) => {
    if ($variant === 'primary') {
      return css`
        border: 1px solid transparent;
        background: ${theme.colors.primary};
        color: #ffffff;
        &:hover:not(:disabled) {
          opacity: 0.92;
        }
      `
    }
    if ($variant === 'danger') {
      return css`
        border: 1px solid rgba(239, 68, 68, 0.38);
        background: rgba(239, 68, 68, 0.08);
        color: ${theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
        &:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.16);
        }
      `
    }
    return css`
      border: 1px solid ${ledgerHairlineStrong(theme.mode)};
      background: transparent;
      color: ${theme.colors.text.secondary};
      &:hover:not(:disabled) {
        background: ${ledgerHoverFill(theme.mode)};
        color: ${theme.colors.text.primary};
      }
    `
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const ScopeItemRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

export const OfficeholderRowCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

export const EmptyStateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
`
