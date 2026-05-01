/**
 * List Toolbar Styled Components
 * 검색바 · 액션 버튼 · 보기 전환 · 활성 필터 칩
 */
import styled, { css, keyframes } from 'styled-components'

import { BRAND, MOTION } from './theme'

/* radius 8 (toolbar 버튼과 정렬), focus halo BRAND.focusRing, 1px border (admin 톤).
 * 높이 34px — toolbar 다른 컨트롤과 통일. */
export const PromSearch = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  min-width: 240px;
  max-width: 480px;
  height: 34px;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          &:focus-within {
            border-color: ${BRAND.primaryBorderHover};
            background: rgba(255, 255, 255, 0.06);
            box-shadow: ${BRAND.focusRing};
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(20, 19, 34, 0.08);
          &:focus-within {
            border-color: ${BRAND.primaryBorderHover};
            background: #ffffff;
            box-shadow: ${BRAND.focusRing};
          }
        `}
  transition: border-color ${MOTION.fast}, background ${MOTION.fast},
    box-shadow ${MOTION.fast};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 한 톤 어두운 search icon — light mode `#94a3b8` → `#64748b` (대비 약 2.6:1 → 4.6:1) */
export const PromSearchIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px 0 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  flex-shrink: 0;
  pointer-events: none;
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

/** 디바운스 중 검색 인디케이터 — 좌측 아이콘 자리 대체 */
export const PromSearchSpinner = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px 0 14px;
  flex-shrink: 0;
  pointer-events: none;

  &::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(147, 197, 253, 0.25)' : 'rgba(37, 99, 235, 0.25)')};
    border-top-color: ${BRAND.primary};
    animation: ${spin} 0.7s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
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

/* 검색바 우측의 키 힌트 — 빈 입력일 때만 노출. focus 시 fade out */
export const PromSearchKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  padding: 1px 6px;
  height: 20px;
  min-width: 20px;
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  flex-shrink: 0;
  pointer-events: none;
  user-select: none;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.04);
          color: rgba(226, 232, 240, 0.65);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.12);
          box-shadow: inset 0 -1px 0 rgba(15, 23, 42, 0.04);
          color: #64748b;
        `}
  transition: opacity ${MOTION.fast};

  /* 사용자가 검색바에 포커스하면 살짝 흐려져 시각적 간섭 없음 */
  ${PromSearch}:focus-within & {
    opacity: 0.4;
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
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(15,23,42,0.14)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
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

/* secondary action 버튼 — *ghost*. 평소엔 border 없음, hover 시 subtle bg.
 * primary action(`+새 사건`)만 강조 색을 가짐. */
export const ToolbarBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active }) => ($active ? BRAND.primaryBorderHover : 'transparent')};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primarySoftDark
        : BRAND.primarySoftHover
      : 'transparent'};
  color: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast},
    border-color ${MOTION.fast};

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? BRAND.primaryFillDark
          : BRAND.primaryFill
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(15,23,42,0.04)'};
    color: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? BRAND.primaryTextOnDark
          : BRAND.primaryHover
        : theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* TopFilterBar 안에서 인라인으로 흐름 — 가용 폭이 부족하면 wrap.
 * 좌측 separator로 도구 그룹과 시각 분리만 (카운트→칩들→clearAll). */
export const ActiveFiltersBar = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-left: 10px;
  margin-left: 2px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 1px;
    height: 18px;
    transform: translateY(-50%);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
    border-radius: 1px;
  }
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
    theme.mode === 'dark' ? 'rgba(191, 219, 254,0.85)' : '#1e40af'};

  svg {
    opacity: 0.65;
  }
`

/* 평면 톤 통일 — 이전 hover 시 translateY/box-shadow는 ledger polish 평면 정책과 충돌. 제거.
 * filter.styles.ts FilterChip과 시각 family 맞춤. */
export const ActiveFilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primaryBorderHover : BRAND.primaryBorder};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primaryFillDark : BRAND.primarySoft};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e0e7ff' : '#1e40af')};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};

  & > svg {
    opacity: 0.55;
    transition: opacity ${MOTION.fast};
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235,0.28)'
        : BRAND.primarySoftHover};
    border-color: ${BRAND.primaryBorderHover};
  }
  &:hover > svg {
    opacity: 1;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    & > svg {
      transition: none;
    }
  }
`

export const ActiveFilterClearAll = styled.button`
  margin-left: auto;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast},
    border-color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* ─── View switcher (타임라인 ↔ 목록) — underline 탭 톤 ──────────────────
 * count가 우측으로 정렬되도록 ViewMeta가 `margin-left: auto`. */

export const ViewSwitcherRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 4px;
`

export const ViewSegmented = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

export const ViewSegment = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.005em;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  transition: color ${MOTION.fast};

  /* active 하단 accent line — 버튼 좌우 inset 6px */
  &::after {
    content: '';
    position: absolute;
    left: 6px;
    right: 6px;
    bottom: 0;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active }) => ($active ? BRAND.primary : 'transparent')};
    transition: background ${MOTION.base};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    border-radius: 4px;
  }

  & > svg {
    opacity: ${({ $active }) => ($active ? 1 : 0.7)};
    transition: opacity ${MOTION.fast};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      transition: none;
    }
    & > svg {
      transition: none;
    }
  }
`

/* 우측 끝 정렬 — 데이터 도구 관습 (Linear/Notion DB) */
export const ViewMeta = styled.div`
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
