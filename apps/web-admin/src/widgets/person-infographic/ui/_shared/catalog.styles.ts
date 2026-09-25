/**
 * 인물 목록 페이지 크롬(검색·툴바·뷰 전환·활성 필터) 스타일.
 *
 * 사건 목록(`pages/events/styles/list-toolbar.styles.ts`)과 **같은 시각 언어**를 쓴다 —
 * 34px 컨트롤 높이 · radius 8 · 차분한 단색 indigo · 불투명 focus 링.
 * widgets 레이어는 pages를 import할 수 없어(FSD) 토큰 값만 동일하게 옮겨 둔다.
 * 사건 쪽 토큰(`BRAND`)을 바꾸면 여기도 함께 바꿀 것.
 */
import styled, { css } from 'styled-components'

export const BRAND = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.06)',
  primarySoftHover: 'rgba(37, 99, 235, 0.12)',
  primaryFill: 'rgba(37, 99, 235, 0.16)',
  primaryBorder: 'rgba(37, 99, 235, 0.3)',
  primaryBorderHover: 'rgba(37, 99, 235, 0.5)',
  /** 반투명 금지 — 양 테마에서 WCAG 1.4.11(3:1) 통과하는 단색 */
  focusRing: '0 0 0 2px #2563eb',
  primaryTextOnDark: '#93c5fd',
  primarySoftDark: 'rgba(37, 99, 235, 0.14)',
  primaryFillDark: 'rgba(37, 99, 235, 0.22)',
} as const

export const MOTION_FAST = '0.15s ease'

/** 행 메타 텍스트 — 라이트 4.83:1 / 다크 7.48:1 (사건 META_TEXT와 동일) */
export const metaText = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'

/** 목록 표면색 — sticky 헤더 오클루전용(반투명 금지). */
export const surface = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#141414' : '#ffffff'

export const hairline = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'

/** 시각적으로만 숨김 — 헤딩 탐색·라이브 영역용 */
export const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

export const VisuallyHiddenTitle = styled.h1`
  ${srOnly}
`

/* ─── 상단 툴바: 검색 · 필터 그룹 · 액션 ─────────────────────────────── */

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid ${hairline};
`

export const Search = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  min-width: 220px;
  max-width: 480px;
  height: 34px;
  border-radius: 8px;
  transition: border-color ${MOTION_FAST}, background ${MOTION_FAST},
    box-shadow ${MOTION_FAST};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          &:focus-within {
            background: rgba(255, 255, 255, 0.06);
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid rgba(20, 19, 34, 0.08);
          &:focus-within {
            background: #ffffff;
          }
        `}
  &:focus-within {
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }

  @media (max-width: 640px) {
    max-width: none;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const SearchIcon = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 10px 0 14px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  flex-shrink: 0;
  pointer-events: none;
`

export const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding-right: 10px;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 400;
  }
  &::-webkit-search-cancel-button {
    display: none;
  }
`

export const SearchKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  height: 20px;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
  user-select: none;
  flex-shrink: 0;
  transition: opacity ${MOTION_FAST};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(226, 232, 240, 0.65);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.12);
          color: #64748b;
        `}
  ${Search}:focus-within & {
    opacity: 0.4;
  }
  @media (max-width: 640px) {
    display: none;
  }
`

export const SearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  border: none;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

/** 필터 드롭다운 묶음 — 사건의 [카테고리|대륙|국가|기간] 그룹과 같은 외곽 */
export const FilterGroup = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 34px;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'};

  & > * + * {
    border-left: 1px solid ${hairline};
  }
`

export const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
`

/** 보조 액션 — ghost. 활성(aria-pressed)일 때만 indigo 틴트. */
export const GhostBtn = styled.button<{ $hideOnMobile?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION_FAST}, color ${MOTION_FAST},
    border-color ${MOTION_FAST};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  }
  &[aria-pressed='true'] {
    border-color: ${BRAND.primaryBorderHover};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoftHover};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primaryTextOnDark : BRAND.primaryHover};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  ${({ $hideOnMobile }) =>
    $hideOnMobile &&
    css`
      @media (max-width: 640px) {
        display: none;
      }
    `}
`

export const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: ${BRAND.primary};
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background ${MOTION_FAST};
  &:hover {
    background: ${BRAND.primaryHover};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${surface}, 0 0 0 4px ${BRAND.primary};
  }
`

/* ─── 활성 필터 칩 줄 ─────────────────────────────────────────────────── */

export const ActiveFiltersRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 10px;
`

export const ActiveFilterLabel = styled.span`
  padding: 0 4px 0 2px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(191, 219, 254, 0.85)' : '#1e40af'};
`

export const ActiveFilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primaryBorderHover : BRAND.primaryBorder};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primaryFillDark : BRAND.primarySoft};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e0e7ff' : '#1e40af')};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${MOTION_FAST}, border-color ${MOTION_FAST};

  & > svg {
    opacity: 0.55;
  }
  &:hover {
    border-color: ${BRAND.primaryBorderHover};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.28)' : BRAND.primarySoftHover};
  }
  &:hover > svg {
    opacity: 1;
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

export const ActiveFilterClear = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

/* ─── 뷰 전환 줄: 세그먼트 · 표시 옵션 · 메타 ─────────────────────────── */

export const ViewRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 14px;

  @media (max-width: 640px) {
    gap: 8px 10px;
  }
`

export const ViewSegmented = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px;
  border-radius: 8px;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
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
`

export const ViewSegment = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  height: 30px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.005em;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.13)' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)'
        : '0 1px 2px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(15,23,42,0.03)'
      : 'none'};
  transition: background ${MOTION_FAST}, color ${MOTION_FAST};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  & > svg {
    flex-shrink: 0;
    opacity: ${({ $active }) => ($active ? 1 : 0.75)};
  }

  /* 좁은 폭 — 라벨은 sr-only로 내리고 아이콘만 (사건 뷰 전환과 같은 규칙) */
  & > span.label {
    @media (max-width: 1100px) {
      ${srOnly}
    }
  }
  @media (max-width: 640px) {
    height: 36px;
    padding: 6px 11px;
  }
`

export const DisplayOptions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

export const Select = styled.select`
  height: 34px;
  padding: 0 28px 0 12px;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;

  option {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1f1f23' : '#ffffff')};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)'};
  }
  &:focus-visible {
    outline: none;
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }
`

export const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${BRAND.primary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  & > svg {
    transition: transform ${MOTION_FAST};
  }
`

/** 우측 끝 결과 요약 — "<strong>123</strong>명 · 평균 수명 61년" */
export const ViewMeta = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const MetaDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 5px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  transform: translateY(-1px);
`
