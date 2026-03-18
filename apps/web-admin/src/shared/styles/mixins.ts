/**
 * 프로젝트 공용 CSS 믹스인
 * - 다크/라이트 테마 조건부 스타일을 간결하게 작성하기 위한 헬퍼
 */
import { css } from 'styled-components'

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

/**
 * 테마 모드에 따라 darkGlass / lightSolid 분기
 * @example
 *   const Card = styled.div`
 *     ${({ theme }) => glassOrSolidMixin(theme)}
 *   `
 */
export function glassOrSolidMixin(theme: {
  mode?: string
  colors: { background: { primary: string }; border: { default: string } }
}) {
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

/**
 * 다크 모드 전용 액센트 활성 상태 (보라색 계열 반투명)
 */
export const darkAccentActiveMixin = css`
  background: rgba(99, 106, 242, 0.2);
  border: 1px solid rgba(99, 106, 242, 0.4);
  color: #a5b4fc;
`
