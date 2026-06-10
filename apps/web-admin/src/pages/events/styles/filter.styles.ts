/**
 * Filter Sidebar Styled Components
 * 필터 사이드바 및 세기 선택 관련 스타일
 */
import styled, { css } from 'styled-components'

import { BRAND, MOTION } from './theme'

/* FilterColumn — 사용처에서 obsolete (FilterBlock과 중복 wrapper)이지만
 * 외부 import 호환 위해 단순 contents fragment처럼 둠. 모든 layout 스타일은
 * FilterBlock에서 처리. 새 코드는 FilterColumn 사용 X. */
export const FilterColumn = styled.div`
  display: contents;
`

/* FilterBlock — toolbar 아이템들이 직접 flex로 배치되는 row. */
export const FilterBlock = styled.div`
  display: inline-flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

/**
 * FilterGroup — *연관된 filter 트리거 5개를 한 묶음 border*로.
 *
 * 이전: 카테고리 / 국가 / 세기 / 정렬 / 정렬방향 — 각자 *자신의 1px border*
 *       → toolbar 한 줄에 bordered box 5개 + 그 외 6개 = 어수선
 *
 * 지금: 외곽 1px border 1개 + 내부 hairline `border-right` 구분선
 *       → 한 *그룹* 인상. Linear / Notion 데이터 toolbar 패턴.
 *
 * 자식들은 각자 border 제거 / radius 0 / hover 시 inset bg shift만.
 */
export const FilterGroup = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
        `}

  /* 모든 nested control(직속 + 깊이 1단)은 자기 border/bg 제거 */
  & button,
  & select {
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    height: 100% !important;
    box-shadow: none !important;
  }

  /* 직속 자식들 사이 hairline divider */
  & > button,
  & > select,
  & > div {
    border-right: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(15, 23, 42, 0.08)'} !important;
    border-radius: 0 !important;
  }
  & > *:last-child {
    border-right: none !important;
  }

  /* 내부 hover는 inset bg shift */
  & button:hover,
  & select:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06) !important'
        : 'rgba(15, 23, 42, 0.04) !important'};
  }

  /* 그룹 외곽 hover */
  &:hover {
    border-color: ${BRAND.primaryBorder};
  }

  /* focus halo — 그룹에 표시 */
  &:focus-within {
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const FilterBlockLabel = styled.div`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#94a3b8'};
`

export const FilterSearchInput = styled.input`
  border-radius: 8px;
  padding: 8px 12px 8px 34px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  font-size: 12.5px;
  min-width: 200px;
  max-width: 300px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  &::placeholder {
    font-size: 12px;
    color: #94a3b8;
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04)
            url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="11" cy="11" r="8"/%3E%3Cline x1="21" y1="21" x2="16.65" y2="16.65"/%3E%3C/svg%3E')
            no-repeat 11px 50%;
          background-size: 13px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          &:hover {
            background-color: rgba(255, 255, 255, 0.06);
            border-color: rgba(37, 99, 235, 0.3);
          }
          &:focus {
            outline: none;
            border-color: rgba(37, 99, 235, 0.5);
            background-color: rgba(255, 255, 255, 0.06);
            box-shadow: ${BRAND.focusRing};
          }
        `
      : css`
          background: #f8fafc
            url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="11" cy="11" r="8"/%3E%3Cline x1="21" y1="21" x2="16.65" y2="16.65"/%3E%3C/svg%3E')
            no-repeat 11px 50%;
          background-size: 13px;
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: #0f172a;
          &:hover {
            background-color: #ffffff;
            border-color: rgba(37, 99, 235, 0.3);
          }
          &:focus {
            outline: none;
            border-color: rgba(37, 99, 235, 0.5);
            background-color: #ffffff;
            box-shadow: ${BRAND.focusRing};
          }
        `}
`

/* admin 도구 톤 — 1px border, radius 8, hover transform/shadow 제거. */
export const FilterTriggerButton = styled.button`
  border-radius: 8px;
  padding: 7px 12px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    color ${MOTION.fast};
  svg {
    color: ${BRAND.primary};
    flex-shrink: 0;
  }
  &:focus-visible {
    outline: none;
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: rgba(255, 255, 255, 0.06);
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: #1e293b;
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: #ffffff;
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const FilterCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #2563eb;
  }

  span {
    font-size: 12px;
    font-weight: 500;
    color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#475569'};
  }

  &:hover span { color: #2563eb; }
`

export const FilterChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/* radius 16 → 6, 그라데이션 → 단색 alpha. 페이지 ActiveFilterChip과 family. */
export const FilterChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.3);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8')};

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
    transition: background 0.15s;
    opacity: 0.7;
    &:hover {
      opacity: 1;
      background: rgba(37, 99, 235, 0.16);
    }
  }

  span {
    white-space: nowrap;
  }
`

export const FilterResetButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 7px 12px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  background: rgba(239, 68, 68, 0.06);
  color: #ef4444;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  &:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.4);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.18);
  }
`

export const FilterDivider = styled.hr`
  border: none;
  height: 1px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(37, 99, 235,0.12)'};
  margin: 8px 0;
`

export const CenturyHeader = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const CenturyTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const CenturyCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`

export const CenturyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 768px) {
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding: 4px 0;
    &::-webkit-scrollbar { height: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(37, 99, 235,0.2); border-radius: 2px; }
  }
`

/* 단색 alpha + 1px border, hover translateX/box-shadow 제거. */
export const CenturyButton = styled.button<{ $active: boolean }>`
  border-radius: 8px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;

  ${({ $active }) =>
    $active &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #2563eb;
    }
  `}

  @media (max-width: 768px) {
    flex-shrink: 0;
    min-width: 140px;
  }

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active
            ? 'rgba(37, 99, 235, 0.12)'
            : 'rgba(255, 255, 255, 0.04)'};
          border: 1px solid
            ${$active
              ? 'rgba(37, 99, 235, 0.35)'
              : 'rgba(255, 255, 255, 0.07)'};
          &:hover {
            border-color: rgba(37, 99, 235, 0.3);
            background: ${$active
              ? 'rgba(37, 99, 235, 0.18)'
              : 'rgba(255, 255, 255, 0.06)'};
          }
        `
      : css`
          background: ${$active
            ? 'rgba(37, 99, 235, 0.06)'
            : '#f8fafc'};
          border: 1px solid
            ${$active
              ? 'rgba(37, 99, 235, 0.3)'
              : 'rgba(203, 213, 225, 0.6)'};
          &:hover {
            border-color: rgba(37, 99, 235, 0.3);
            background: ${$active
              ? 'rgba(37, 99, 235, 0.1)'
              : '#ffffff'};
          }
        `}
`

export const CenturyLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'};
  }

  span {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
  }
`

export const CenturyEventCount = styled.span`
  font-size: 11px;
  color: #2563eb;
  font-weight: 700;
  padding: 3px 8px;
  background: rgba(37, 99, 235, 0.12);
  border-radius: 6px;
  align-self: flex-start;
`

export const ResultControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #fff;
          border: 1px solid rgba(20, 19, 34, 0.06);
        `}
`

export const SortDirectionToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 7px 12px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  svg { width: 14px; height: 14px; }
  &:hover { border-color: rgba(37, 99, 235, 0.3); }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          &:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.06); }
        `
      : css`
          background: #fff;
          border: 1px solid rgba(15, 23, 42, 0.12);
          color: #1f2937;
          &:hover { color: #111827; }
        `}
`

export const SortSelect = styled.select`
  border-radius: 8px;
  padding: 7px 10px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  min-width: 100px;
  transition: background 0.15s, border-color 0.15s;
  &:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.5);
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          option { background: #1e1e2e; color: #e2e8f0; }
          &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(37, 99, 235, 0.3);
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: #1e293b;
          option { background: #ffffff; color: #1f2937; }
          &:hover {
            background: #ffffff;
            border-color: rgba(37, 99, 235, 0.3);
          }
        `}
`

export const ToolbarMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;

  span {
    padding: 4px 10px;
    background: rgba(37, 99, 235, 0.08);
    border-radius: 6px;
    color: #1d4ed8;
  }
`

/* FilterToggle — 컨테이너 박스 제거. 단순 inline group으로 toolbar의 다른
 * item들과 같은 평면에 배치. (이전엔 box-in-box-in-box 였음) */
export const FilterToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  padding: 0 4px;
  cursor: pointer;
  user-select: none;
`

export const FilterToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`

/* CenturySelectWrap — icon + select 한 묶음. FilterGroup 안에서 자식으로 동작.
 * 아이콘 색은 테마 토큰(text.tertiary)으로 정렬. */
export const CenturySelectWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 100%;

  & > svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

export const CenturySelect = styled.select`
  border-radius: 8px;
  padding: 7px 10px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  min-width: 90px;
  transition: background 0.15s, border-color 0.15s;
  &:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.5);
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(37, 99, 235, 0.3);
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: #1e293b;
          &:hover {
            background: #ffffff;
            border-color: rgba(37, 99, 235, 0.3);
          }
        `}
`

/* SortButton — direction 토글 시 같은 아이콘을 transform rotate 180deg로 부드럽게.
 * 호출처는 $direction prop을 전달해 회전 상태를 제어. */
export const SortButton = styled.button<{ $direction?: 'asc' | 'desc' }>`
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  width: 34px;
  height: 34px;
  @media (max-width: 768px) {
    min-height: 40px;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  svg {
    color: ${BRAND.primary};
    transition: transform ${MOTION.base};
    transform: rotate(
      ${({ $direction }) => ($direction === 'asc' ? '180deg' : '0deg')}
    );
  }
  &:hover svg {
    color: ${BRAND.primaryHover};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #64748b;
          &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: ${BRAND.primaryBorder};
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: #64748b;
          &:hover {
            background: #ffffff;
            border-color: ${BRAND.primaryBorder};
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    svg {
      transition: none;
    }
  }
`

/* Switch — admin 도구 톤. 30×18 콤팩트, accent border + subtle bg fill.
 * 흰 썸 + 그림자 → 둥근 색 점, 그림자 없음. iOS 토글 인상 제거.
 * focus 표식은 box-shadow halo로 통일 (다른 컨트롤들과 동일). */
export const Switch = styled.button<{ $active?: boolean }>`
  position: relative;
  width: 30px;
  height: 18px;
  background: ${({ $active, theme }) =>
    $active
      ? BRAND.primarySoftDark
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.06)'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? BRAND.primaryBorderHover
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.12)'};
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  transition: background ${MOTION.base}, border-color ${MOTION.base};

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? BRAND.primaryFillDark
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.1)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const SwitchThumb = styled.div<{ $active?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $active }) => ($active ? '14px' : '2px')};
  width: 12px;
  height: 12px;
  background: ${({ $active, theme }) =>
    $active
      ? BRAND.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.55)'
        : 'rgba(15, 23, 42, 0.4)'};
  border-radius: 50%;
  transition: left ${MOTION.base}, background ${MOTION.base};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const ChildSortButtons = styled.div`
  display: flex;
  gap: 4px;
  width: 100%;
`

export const ChildSortButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 11px;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  border: 1px solid ${({ $active }) => $active ? '#2563eb' : 'rgba(203,213,225,0.6)'};
  background: ${({ theme, $active }) => $active
    ? 'rgba(37, 99, 235,0.08)'
    : theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ $active }) => $active ? '#2563eb' : 'inherit'};
  &:hover { border-color: #2563eb; background: rgba(37, 99, 235,0.05); }
`
