/**
 * 프로젝트 공용 CSS 믹스인
 * - 다크/라이트 테마 조건부 스타일을 간결하게 작성하기 위한 헬퍼
 */
import { css } from 'styled-components'

// ─── 다크 전용 원시 믹스인 ────────────────────────────────────────────────────

/** 다크 모드: 리퀴드 글래스 효과 (blur + 반투명 배경/보더) */
export const darkGlassMixin = css`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`

/** 다크 모드: 약한 글래스 (blur 8px) */
export const darkGlassSoftMixin = css`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
`

/** 다크 모드: 카드 hover 배경 */
export const darkHoverMixin = css`
  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`

/** 다크 모드 전용 액센트 활성 상태 (보라색 계열 반투명) */
export const darkAccentActiveMixin = css`
  background: rgba(99, 106, 242, 0.2);
  border: 1px solid rgba(99, 106, 242, 0.4);
  color: #a5b4fc;
`

// ─── 테마 분기 함수 믹스인 ────────────────────────────────────────────────────

type ThemeBase = {
  mode?: string
  colors: {
    background: { primary: string; secondary: string; tertiary: string }
    border: { default: string; light: string }
    shadow: { sm: string; md: string; lg: string }
    text: { primary: string; secondary: string }
  }
}

/**
 * 모달/카드 컨테이너 — 다크: 리퀴드 글래스, 라이트: 솔리드 화이트
 * @example
 *   const Modal = styled.div`${({ theme }) => glassCardMixin(theme)}`
 */
export function glassCardMixin(theme: ThemeBase) {
  if (theme.mode === 'dark') {
    return css`
      background: rgba(20, 20, 20, 0.92);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `
  }
  return css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.default};
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  `
}

/**
 * 입력 필드 — 다크: 반투명, 라이트: 솔리드 화이트
 * @example
 *   const Input = styled.input`${({ theme }) => darkInputMixin(theme)}`
 */
export function darkInputMixin(theme: ThemeBase) {
  if (theme.mode === 'dark') {
    return css`
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: ${theme.colors.text.primary};
    `
  }
  return css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.default};
    color: ${theme.colors.text.primary};
  `
}

/**
 * KPI 패널 — 다크: 글래스, 라이트: 솔리드
 */
export function kpiPanelMixin(theme: ThemeBase) {
  if (theme.mode === 'dark') {
    return css`
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid ${theme.colors.border.default};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    `
  }
  return css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.default};
  `
}

/**
 * 빈 상태 카드 — 다크: 글래스, 라이트: 솔리드
 */
export function emptyCardMixin(theme: ThemeBase) {
  if (theme.mode === 'dark') {
    return css`
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid ${theme.colors.border.light};
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    `
  }
  return css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.light};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  `
}

/**
 * 테마 모드에 따라 darkGlass / lightSolid 분기 (단순 배경+보더)
 * @example
 *   const Card = styled.div`${({ theme }) => glassOrSolidMixin(theme)}`
 */
export function glassOrSolidMixin(theme: ThemeBase) {
  if (theme.mode === 'dark') {
    return css`
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    `
  }
  return css`
    background: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.default};
  `
}

// ─── 공용 스크롤바 ─────────────────────────────────────────────────────────────

/** 웹킷 커스텀 스크롤바 (6px, 테마 연동) */
export const scrollbarMixin = css`
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

/** 얇은 스크롤바 (4px) */
export const scrollbarThinMixin = css`
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }
`
