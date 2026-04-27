/**
 * List Toolbar Styled Components
 * 검색바 · 액션 버튼 · 보기 전환 · 활성 필터 칩
 */
import styled, { css } from 'styled-components'

export const PromSearch = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  min-width: 240px;
  max-width: 480px;
  height: 38px;
  border-radius: 12px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          &:focus-within {
            border-color: rgba(99, 102, 241, 0.55);
            background: rgba(255, 255, 255, 0.07);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
          }
        `
      : css`
          background: #f8fafc;
          border: 1.5px solid rgba(20, 19, 34, 0.08);
          &:focus-within {
            border-color: rgba(99, 102, 241, 0.5);
            background: #ffffff;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          }
        `}
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
`

export const PromSearchIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px 0 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  pointer-events: none;
`

export const PromSearchInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  height: 100%;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  padding-right: 14px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 400;
  }
  &::-webkit-search-cancel-button {
    display: none;
  }
`

export const PromSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(15,23,42,0.08)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(15,23,42,0.14)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ToolbarActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  /* 작은 화면에서 toolbar가 줄바꿈되어도 정렬 유지 */
  flex-wrap: wrap;
  justify-content: flex-end;
`

export const ToolbarBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? 'rgba(99,102,241,0.55)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e5e7eb'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(99,102,241,0.2), rgba(99,102,241,0.12))'
        : 'linear-gradient(180deg, rgba(99,102,241,0.14), rgba(99,102,241,0.08))'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fff'};
  color: ${({ theme, $active }) =>
    $active ? '#4f46e5' : theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.1s;
  ${({ $active }) =>
    $active &&
    css`
      box-shadow:
        0 1px 2px rgba(99, 102, 241, 0.2),
        inset 0 0 0 1px rgba(99, 102, 241, 0.18);
    `}

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? 'linear-gradient(180deg, rgba(99,102,241,0.26), rgba(99,102,241,0.16))'
          : 'linear-gradient(180deg, rgba(99,102,241,0.18), rgba(99,102,241,0.12))'
        : 'rgba(99,102,241,0.06)'};
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.45);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`

/* TopFilterBar 내부에서 wrap 라인으로 전체 폭 차지 — 분리된 막대 인상 제거 */
export const ActiveFiltersBar = styled.div`
  width: 100%;
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 0 0;
  margin-top: 4px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.14)'};
`

export const ActiveFilterCount = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(199,210,254,0.85)' : '#4338ca'};

  svg {
    opacity: 0.65;
  }
`

export const ActiveFilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.45)'
        : 'rgba(99,102,241,0.32)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.16)'
      : 'rgba(99,102,241,0.06)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e0e7ff' : '#4338ca')};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.1s;

  & > svg {
    opacity: 0.55;
    transition: opacity 0.15s;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.24)'
        : 'rgba(99,102,241,0.14)'};
    border-color: rgba(99, 102, 241, 0.55);
    box-shadow: 0 1px 3px rgba(99, 102, 241, 0.15);
  }
  &:hover > svg {
    opacity: 1;
  }
  &:active {
    transform: translateY(1px);
  }
`

export const ActiveFilterClearAll = styled.button`
  margin-left: auto;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }
`

/* ─── View switcher (타임라인 ↔ 목록) ──────────────────────────────────── */

export const ViewSwitcherRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px;
`

export const ViewSegmented = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

export const ViewSegment = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? '#6366f1'
      : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'inset 0 0 0 1px rgba(99,102,241,0.35)'
        : '0 1px 3px rgba(15,23,42,0.08)'
      : 'none'};

  &:hover {
    color: ${({ $active }) => ($active ? '#4f46e5' : '#6366f1')};
  }
`

export const ViewMeta = styled.div`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
