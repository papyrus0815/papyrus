import styled, { css } from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
`

export const Panel = styled.div`
  position: fixed;
  left: 50%;
  top: 14vh;
  transform: translateX(-50%);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  width: min(640px, calc(100vw - 32px));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(22, 23, 32, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.default};
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
        `}
`

export const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const KeyHint = styled.kbd`
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  line-height: 1;
`

export const ResultList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
`

export const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ClearRecentBtn = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  letter-spacing: normal;
  text-transform: none;
  font-weight: 500;

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

export const Row = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : '#eef0ff'
      : 'transparent'};
  transition: background 0.1s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f4f5fb'};
  }
`

export const RowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
`

export const Flag = styled.span`
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
`

export const RowText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const RowTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const RowSubtitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TypeChip = styled.span<{ $historical?: boolean }>`
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.02em;

  ${({ theme, $historical }) =>
    $historical
      ? css`
          background: ${theme.mode === 'dark'
            ? 'rgba(245, 158, 11, 0.18)'
            : '#fef3c7'};
          color: ${theme.mode === 'dark' ? '#fcd34d' : '#b45309'};
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.18)'
            : '#eef0ff'};
          color: ${theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
        `}
`

export const Empty = styled.div`
  padding: 36px 20px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FooterHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`
