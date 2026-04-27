/**
 * 가문 구성원 인포그래픽 모달 — 공통 styled components.
 */
import styled from 'styled-components'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

export const primarySoft = (mode: 'light' | 'dark') =>
  isDark(mode) ? 'rgba(99,106,242,0.14)' : 'rgba(99,102,241,0.08)'

/* ─── Stats strip ───────────────────────────────────────────────────────── */

export const StatsStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 22px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const StatChip = styled.div<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: ${({ theme, $accent }) =>
    $accent ? primarySoft(theme.mode) : theme.colors.background.secondary};
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent
        ? isDark(theme.mode)
          ? 'rgba(99,106,242,0.3)'
          : 'rgba(99,102,241,0.22)'
        : theme.colors.border.light};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

export const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

export const StatValue = styled.strong<{ $accent?: boolean }>`
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $accent }) =>
    $accent ? theme.colors.primary : theme.colors.text.primary};
`

export const StatSub = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  margin-left: 2px;
`

/* ─── Controls bar ──────────────────────────────────────────────────────── */

export const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
`

export const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 34px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => primarySoft(theme.mode)};
  }
`

export const SortSelect = styled.select`
  padding: 8px 28px 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: ${({ theme }) =>
    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(
      isDark(theme.mode) ? '#a1a1aa' : '#6b7280',
    )}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>")`};
  background-repeat: no-repeat;
  background-position: right 9px center;
`

export const ViewToggleGroup = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 9px;
  overflow: hidden;
  margin-left: auto;
`

export const ViewToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? primarySoft(theme.mode) : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not([aria-pressed='true']) {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const Counter = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/* ─── Body wrap ─────────────────────────────────────────────────────────── */

export const ViewBody = styled.div`
  padding: 18px 22px 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`
