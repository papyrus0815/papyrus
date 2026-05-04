import styled from 'styled-components'

/**
 * 테마(라이트/다크)에 맞춘 네이티브 `<select>`.
 * 모달·폼 공통 — `color-scheme`으로 OS 드롭다운 톤을 맞추고, 화살표는 테마별 SVG.
 */
export const FormSelectNative = styled.select<{ $error?: boolean }>`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 8px 32px 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 6px;
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  background-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb'};
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
  background-position: right 10px center;
  background-size: 10px 6px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:focus {
    outline: none;
    background-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#fff'};
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
