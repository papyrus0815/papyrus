/**
 * 정부·행정(Government & Administration) 지면 공통 스타일 프리미티브.
 *
 * 사건 페이지(`pages/events/styles/*`)의 편집·원장(Flat Ledger) 디자인 언어를 그대로 따른다:
 * - 상단 중복 크롬 배너(아이콘 박스·그라데이션 카드) 제거 → 1px 헤어라인 서브탭 & 34px 단일 높이 툴바
 * - 모든 툴바 컨트롤 높이 34px(모바일 ≤768px 40px), radius 8px 통일
 * - hover 시 translateY 들썩임·두꺼운 그림자 금지, 색/배경 틴트로만 피드백
 * - 브랜드 블루(#2563eb)는 인터랙션·선택 인디케이터·주 CTA에만 절제 사용, 계층 레일·구획 제목은 무채색 잉크 유지
 * - 숫자 카운트·연도는 `font-variant-numeric: tabular-nums` 고정
 */
import styled, { css } from 'styled-components'

import { scrollbarMixin } from '@/shared/styles/mixins'

export const GOV_BRAND = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.08)',
  primarySoftDark: 'rgba(96, 165, 250, 0.14)',
  primaryBorder: 'rgba(37, 99, 235, 0.28)',
  primaryBorderDark: 'rgba(96, 165, 250, 0.34)',
  primaryInk: '#1d4ed8',
  primaryInkDark: '#93c5fd',
} as const

export const GOV_ROW_HAIRLINE = {
  light: 'rgba(15, 23, 42, 0.08)',
  dark: 'rgba(255, 255, 255, 0.1)',
} as const

export const GOV_PANEL_BORDER = {
  light: 'rgba(20, 19, 34, 0.08)',
  dark: 'rgba(255, 255, 255, 0.08)',
} as const

export const GOV_RAIL_AXIS = {
  light: 'rgba(15, 23, 42, 0.36)',
  dark: 'rgba(255, 255, 255, 0.32)',
} as const

export const govTabularNums = css`
  font-variant-numeric: tabular-nums;
`

/** 정부·행정 루트 컨테이너 (사건 목록 페이지와 동일한 플랫 캔버스 패딩) */
export const GovLedgerPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 28px 48px;
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 12px 16px 36px;
    gap: 14px;
  }
`

/** 상단 서브탭 + 우측 유틸리티 단일 플랫 바 (불필요한 배너 카드 제거) */
export const GovSubNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light};
  min-height: 42px;
  flex-wrap: wrap;
`

export const GovSubTabList = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  min-width: 0;
  ${scrollbarMixin}
`

export const GovSubTabBtn = styled.button<{ $active?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 13px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#f8fafc'
        : '#0f172a'
      : theme.colors.text.secondary};
  transition: color 0.14s ease;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active }) =>
      $active ? GOV_BRAND.primary : 'transparent'};
    transition: background 0.14s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const GovSubTabCount = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  ${govTabularNums}
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primaryInkDark
        : GOV_BRAND.primaryInk
      : theme.colors.text.tertiary};
`

/** 사건 페이지 list-toolbar.styles.ts 와 동일한 34px 단일 높이 툴바 */
export const GovToolbarShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const GovToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const GovPromSearch = styled.div`
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
  max-width: 380px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 11px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(20, 19, 34, 0.08)'};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:focus-within {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
    border-color: transparent;
    box-shadow: 0 0 0 2px ${GOV_BRAND.primary};
  }

  & > svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    flex: 1 1 100%;
    max-width: none;
    height: 40px;
  }
`

export const GovPromSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const GovPromSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const GovToolbarGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

export const GovToolbarRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
`

export const GovToolbarDivider = styled.span`
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(15, 23, 42, 0.1)'};
  flex-shrink: 0;
`

/** 34px 고스트·필터 버튼 (사건 페이지 ToolbarBtn 계승) */
export const GovToolbarBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryBorderDark
          : GOV_BRAND.primaryBorder
        : 'transparent'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primaryInkDark
        : GOV_BRAND.primaryInk
      : theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.14s ease,
    color 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? GOV_BRAND.primarySoftDark
          : GOV_BRAND.primarySoft
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryInkDark
          : GOV_BRAND.primaryInk
        : theme.colors.text.primary};
  }

  @media (max-width: 768px) {
    height: 40px;
  }
`

/** 34px 주 등록 버튼 — 한 줄에서 단 하나만 솔리드 블루(#2563eb) */
export const GovPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${GOV_BRAND.primary};
  color: #ffffff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.14s ease, opacity 0.14s ease;

  &:hover:not(:disabled) {
    background: ${GOV_BRAND.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    height: 40px;
  }
`

export const GovViewMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${govTabularNums}
`

export const GovActiveFiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

export const GovActiveFiltersLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

export const GovActiveFilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primaryInkDark : GOV_BRAND.primaryInk};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? GOV_BRAND.primarySoftDark
      : GOV_BRAND.primarySoft};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? GOV_BRAND.primaryBorderDark
        : GOV_BRAND.primaryBorder};
  cursor: pointer;

  &:hover {
    opacity: 0.86;
  }
`

export const GovClearFiltersBtn = styled.button`
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
  }
`

/** 플랫 원장 패널 — 그림자·그라데이션 없이 1px 보더만 */
export const GovLedgerPanel = styled.div`
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? GOV_PANEL_BORDER.dark : GOV_PANEL_BORDER.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'};
  overflow: hidden;
  min-width: 0;
`

export const GovLedgerSection = styled.section`
  padding: 16px 18px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light};

  &:last-child {
    border-bottom: none;
  }
`

/** 사건 상세 DetailSectionTitle 과 동일 — 중성 12px/700, 파란색 금지 */
export const GovLedgerSectionTitle = styled.h4`
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
`
