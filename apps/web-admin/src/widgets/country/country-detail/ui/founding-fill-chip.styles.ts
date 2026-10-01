import styled from 'styled-components'

/** 빈 항목 칩 — 점선 테두리로 '아직 없음'을, 누르면 바로 그 자리를 채운다 */
export const FillChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.14s,
    color 0.14s,
    background 0.14s;

  &:hover {
    border-style: solid;
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`
