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

/* 검색바 우측의 키 힌트 — 빈 입력일 때만 노출. focus 시 fade out.
 * 모바일(<=640px)에선 키보드가 없으므로 렌더 자체를 숨겨 시각 노이즈 제거. */
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

  @media (max-width: 640px) {
    display: none;
  }

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
 * primary action(`+새 사건`)만 강조 색을 가짐.
 *
 * `$hideOnMobile`: 도움말·JSON 다운로드처럼 모바일 컨텍스트에서 의미가 작은
 * 버튼은 <=640px에서 렌더 안 함. */
export const ToolbarBtn = styled.button<{
  $active?: boolean
  $hideOnMobile?: boolean
}>`
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

  /* 모바일 — 라벨(span)은 sr-only로 떨어뜨리고 icon만. tooltip(title)은 유지.
   * 터치 타겟 권장(38~44px)에 맞춰 height/패딩도 키움. */
  @media (max-width: 640px) {
    padding: 9px 11px;
    height: 38px;
    & > span:not([class]) {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    ${({ $hideOnMobile }) =>
      $hideOnMobile &&
      css`
        display: none;
      `}
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
  flex-wrap: wrap;

  @media (max-width: 900px) {
    gap: 8px;
  }

  @media (max-width: 640px) {
    /* 통계 strip은 다음 줄로 자연 wrap — 메타가 한 줄로 강제 압축되지 않게 */
    gap: 6px 10px;
    padding: 0 2px;
  }
`

/* 7-mode segmented — 각 버튼은 icon + 짧은 라벨. 좁은 화면에선 라벨이 sr-only로 떨어짐.
 * 겉면에 약한 border + bg로 그룹 시각 정체성 부여 (Linear-style segmented control).
 *
 * 모바일(<=720px): 가로 스크롤 + 살짝의 fade hint로 7개가 좁은 폭에서도 접근 가능.
 * 데스크톱: 자연스럽게 한 줄에 들어감 (라벨이 1280px 이하에서 sr-only로 떨어지므로). */
export const ViewSegmented = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  gap: 1px;
  border-radius: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        `
      : css`
          background: rgba(15, 23, 42, 0.04);
          border: 1px solid rgba(15, 23, 42, 0.06);
        `}

  @media (max-width: 720px) {
    overflow-x: auto;
    overflow-y: hidden;
    max-width: 100%;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar {
      display: none;
    }

    /* 우측 가장자리 fade — 가로 스크롤로 더 있음을 시각적으로 안내.
     * mask는 스크롤 위치와 무관하게 "양 끝 페이드"가 되어 좌측 시작 위치에서도
     * 살짝 hint, 그러나 그 비용보다 affordance 이득이 큼. */
    mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 8px,
      #000 calc(100% - 16px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 8px,
      #000 calc(100% - 16px),
      transparent 100%
    );

    & > button {
      scroll-snap-align: start;
      flex-shrink: 0;
    }
  }
`

/* 컴팩트 — 각 버튼 30px 높이(모바일 36px), icon 13px + 라벨 11.5px.
 * 외곽 padding 2px 포함 시 ViewSegmented 총 34px → DisplayOptions의 select/button과 베이스라인 정렬.
 * active는 *살짝 떠오른 inner pill* (배경 흰색 + subtle shadow).
 * 라벨은 1024px 이하에서 sr-only로 떨어져 7개가 좁은 화면에서도 fit. */
export const ViewSegment = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  height: 30px;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.005em;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.13)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)'
        : '0 1px 2px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(15,23,42,0.03)'
      : 'none'};
  transition: background ${MOTION.fast}, color ${MOTION.fast},
    box-shadow ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#ffffff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  & > svg {
    opacity: ${({ $active }) => ($active ? 1 : 0.75)};
    transition: opacity ${MOTION.fast};
    flex-shrink: 0;
  }

  /* 1024px 이하 — 라벨 sr-only로 떨어져 icon만 (7 modes 압축).
   * 1280px → 1024px로 낮춤: 사이드바 펼친 13~14인치 노트북에서도 라벨 보존. */
  & > span.label {
    @media (max-width: 1024px) {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  /* 모바일 터치 타겟 — 30 → 36px로 살짝 키움. icon만 보이는 좁은 폭에서도 손가락 적중률 개선. */
  @media (max-width: 640px) {
    height: 36px;
    padding: 6px 11px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    & > svg {
      transition: none;
    }
  }
`

/* "표시 옵션" 그룹 — 정렬 + 방향 + 페이지 크기. ViewSegmented와 ViewMeta 사이.
 * filter group과 시각 family 분리: 외곽 border 없음, gap만으로 묶음. */
export const DisplayOptions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  flex-wrap: wrap;

  /* SortSelect / SortButton 모두 height 34 — ViewSegmented(2px padding+30px = 34) 와 정확 정렬 */
  & > select,
  & > button {
    height: 34px;
  }

  /* 페이지 크기 select(SortSelect 내부 두 번째 select)는 "20개"~"100개"로 폭이 좁으므로
   * 살짝 컴팩트하게. 인라인 style을 styled로 흡수. */
  & > select:last-of-type {
    width: 92px;
    font-size: 12px;
  }
`

/* 우측 끝 정렬 — 데이터 도구 관습 (Linear/Notion DB).
 * "표시 N · 전체 M" 형태에서 strong은 한 톤 진하게(text.primary). */
export const ViewMeta = styled.div`
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  align-items: baseline;
  gap: 0;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
