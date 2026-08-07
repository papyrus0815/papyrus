/**
 * List Toolbar Styled Components
 * 검색바 · 액션 버튼 · 보기 전환 · 활성 필터 칩
 */
import styled, { css, keyframes } from 'styled-components'

import {
  BRAND,
  MOTION,
  metaText,
  toolbarControlHeight,
  toolbarSegmentHeight,
} from './theme'

/* radius 8 (toolbar 버튼과 정렬), focus halo BRAND.focusRing, 1px border (admin 톤).
 * 높이는 `toolbarControlHeight` — toolbar 한 줄 컨트롤 공통 규약(검토 VIS-9). */
export const PromSearch = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  min-width: 240px;
  /* 480px 고정 상한은 전폭 2,520px 바에서 검색창을 19%로 만든다. 툴바에서 실제로 폭을
     흡수하는 유일한 입력이므로 폭에 비례시키되 상·하한으로 묶는다. */
  max-width: clamp(280px, 22vw, 560px);
  ${toolbarControlHeight}
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
    color: ${metaText};
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
  /* 전폭에서 컨트롤이 좌측에 뭉치고 우측 1,000px 이상이 빈 border-bottom만 남던 문제.
     TopFilterBar가 flex-start 패킹이고 신축 자식이 검색바 하나뿐이라 "우측이 비었다"가
     툴바 층위에서 그대로 재현됐다 — 액션군을 우측 끝에 앵커해 바의 양 끝을 채운다.
     ⚠️ justify-content: flex-end는 이 요소 *안쪽* 정렬이라 바깥 위치를 못 바꾼다.
        그래서 지금까지 무효 선언이었고, 실제 앵커는 이 margin이 만든다.
        (이 주석 안에서 백틱 금지 — styled 템플릿 리터럴이 끊긴다.) */
  margin-left: auto;
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
  ${toolbarControlHeight}
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

  /* 지금 조건에서 아무 일도 하지 않는 컨트롤 — 예: 평면 보기의 '하위 접기'(검토 GAP-6).
     사유는 title로 말하므로 여기서는 '누를 수 없음'만 시각화한다. */
  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
  &:disabled:hover {
    background: transparent;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* 모바일 — 라벨(span)은 sr-only로 떨어뜨리고 icon만. tooltip(title)은 유지.
   *
   * ⚠️ 높이는 여기서 키우지 않는다 — 터치 확대는 toolbarControlHeight 믹스인이 768px에서
   * **한 줄 전체를 같이** 올린다(검토 VIS-9). 예전엔 이 640px 블록만 38px로 키워서
   * 641~768px 대역에 필터 그룹(40px)과 액션 버튼(34px)이 6px 어긋난 채 나란히 섰다.
   * 여기 남는 것은 '무엇을 보여줄 것인가'(라벨 sr-only·모바일 숨김)뿐이다. */
  @media (max-width: 640px) {
    padding: 9px 11px;
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

/**
 * 칩 묶음 — `Layout.ActiveFiltersRow` 안에서 신축한다(카운트→칩들).
 *
 * 예전엔 TopFilterBar 안 인라인이라 좌측 separator로 도구 그룹과 시각 분리를 했는데,
 * 전용 행으로 올라간 지금은 분리할 형제가 없어 separator가 근거를 잃었다.
 * 대신 신축을 여기서 받아 '전체 초기화'가 행의 우측 끝에 앵커되게 한다.
 */
export const ActiveFiltersBar = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
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
  /* 칩 바가 신축(flex:1)이므로 이 margin이 **이제 실제로 동작한다** — 인라인 시절에는
     부모가 inline-flex라 남는 폭이 없어 무효 선언이었다.
     앞의 hairline은 "칩 하나 지우려다 전체 초기화"를 막는 시각 분리다. */
  margin-left: auto;
  flex-shrink: 0;
  padding: 5px 12px 5px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  /* ⚠️ 위 단축 border 뒤에 와야 한다 — 앞에 두면 단축 선언이 덮어쓴다. */
  border-left: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
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

    /**
     * (제거됨) 양 끝 mask-image 페이드.
     *
     * 가로 스크롤 affordance로 넣었고 주석도 '스크롤 위치 무관하게 양 끝이 페이드된다'는
     * 비용을 인정하면서 '7개 모드가 넘치므로' 정당화했다. 그런데 배치3이 지도 뷰를
     * SECONDARY_MODES로 내리면서 PRIMARY_MODES는 2개, 실제 렌더 버튼은 3개(≈133px)가 됐다 —
     * **어떤 모바일 폭에서도 넘치지 않는다**. 스크롤은 영영 발생하지 않고 mask만 남아
     * 세그먼트 컨테이너의 좌우 모서리(라운드 보더·배경)가 상시 흐려 보였다(검토 RWD-4).
     * overflow-x:auto는 남겨 둔다 — 모드가 다시 늘어나면 스크롤 자체는 동작해야 한다.
     */

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
  ${toolbarSegmentHeight}
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

  /* 터치 대역의 높이는 toolbarSegmentHeight 믹스인이 768px에서 함께 올린다(검토 VIS-9).
   * 여기서는 손가락 적중 폭만 넓힌다. */
  @media (max-width: 640px) {
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

  /* 안에 들어오는 select/button은 툴바 컨트롤 높이 규약을 따른다 — ViewSegmented
   * (2px 패딩 + 안쪽 세그먼트)와 합이 같아 베이스라인이 정확히 맞는다(검토 VIS-9). */
  & > select,
  & > button {
    ${toolbarControlHeight}
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
  color: ${metaText};
  display: inline-flex;
  align-items: baseline;
  gap: 0;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
