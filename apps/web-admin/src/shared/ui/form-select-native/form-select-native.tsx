import styled from 'styled-components'

/**
 * 테마(라이트/다크)에 맞춘 네이티브 `<select>`.
 * 모달·폼 공통 — `color-scheme`으로 OS 드롭다운 톤을 맞추고, 화살표는 테마별 SVG.
 */
export const FormSelectNative = styled.select<{ $error?: boolean }>`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px 40px 12px 14px;
  font-size: 15px;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  background-color: ${({ $error, theme }) =>
    $error
      ? theme.colors.alert.danger.bg
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  color-scheme: ${({ theme }) => (theme.mode === 'dark' ? 'dark' : 'light')};
  background-image: ${({ theme }) =>
    theme.mode === 'dark'
      ? `url("${chevronDataUri('#a1a1aa')}")`
      : `url("${chevronDataUri('#64748b')}")`};
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px 8px;

  &:focus {
    outline: none;
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.primary};
    box-shadow: ${({ $error, theme }) =>
      $error ? theme.colors.focusRing.danger : theme.colors.focusRing.primary};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  option {
    background-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#18181b' : '#ffffff'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

function chevronDataUri(stroke: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='none' stroke='${stroke}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1.5L6 6.5L11 1.5'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
