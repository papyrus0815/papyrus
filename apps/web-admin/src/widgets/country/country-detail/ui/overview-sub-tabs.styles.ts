import styled from 'styled-components'

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  padding: 12px 24px;
`

export const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
`

export const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

export const TabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin: 0;
  overflow-x: auto;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    display: none;
  }
`

export const TabButton = styled.button<{ $active?: boolean }>`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.activeLight : 'transparent')};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#ffffff'
          : theme.colors.primary
        : theme.colors.text.primary};
    background: ${({ $active, theme }) =>
      $active ? theme.colors.activeLight : theme.colors.background.secondary};
    border-color: ${({ $active, theme }) =>
      $active ? theme.colors.activeLight : theme.colors.border.default};
  }
`
