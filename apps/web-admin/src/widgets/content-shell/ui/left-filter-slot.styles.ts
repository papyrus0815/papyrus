import styled, { css } from 'styled-components'

export const Wrapper = styled.aside<{ $collapsed?: boolean }>`
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height, 64px));
  position: sticky;
  top: var(--header-height, 64px);
  min-width: 0;
  overflow: hidden;
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};

  ${({ theme, $collapsed }) =>
    $collapsed
      ? css`
          width: 48px;
        `
      : css`
          background: ${theme.colors.background.primary};
        `}

  @media (max-width: 1024px) {
    display: none;
  }
`

export const CollapseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const CollapsedRail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  height: 100%;
`

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px;
  scrollbar-width: thin;
`

