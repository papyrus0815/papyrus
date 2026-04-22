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

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const HeaderTitle = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
`

export const HeaderLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const HeaderValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

export const ContextChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  margin-bottom: 14px;
  max-width: 100%;

  > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
`

export const Placeholder = styled.div`
  padding: 20px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  line-height: 1.55;
`

export const PlaceholderTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`
