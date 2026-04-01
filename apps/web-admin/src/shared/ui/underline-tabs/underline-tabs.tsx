/**
 * 섹션용 신규 탭 — 트랙·버튼 모두 배경 없음. 활성만 타이포 + 그라데이션 바.
 * MapRegionTabNav/Button 과 별도.
 */
import styled, { css } from 'styled-components'

export const UnderlineTabNav = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  flex-shrink: 0;
  margin-bottom: 20px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;

  &::-webkit-scrollbar {
    display: none;
  }
`

export const UnderlineTabButton = styled.button<{ $active?: boolean }>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.45;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  letter-spacing: -0.03em;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  transition: color 0.18s ease, opacity 0.18s ease;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 0;
    height: 2px;
    border-radius: 2px;
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transform: translateY(${({ $active }) => ($active ? '0' : '2px')})
      scaleX(${({ $active }) => ($active ? 1 : 0.6)});
    transition:
      opacity 0.2s ease,
      transform 0.22s ease;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            background: linear-gradient(
              90deg,
              ${theme.colors.primary} 0%,
              ${theme.colors.secondary} 100%
            );
            box-shadow: 0 0 12px ${theme.colors.primary}55;
          `
        : css`
            background: linear-gradient(
              90deg,
              ${theme.colors.primary} 0%,
              ${theme.colors.secondary} 100%
            );
          `}
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: transparent;
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      color: ${theme.colors.primary};

      &:hover {
        color: ${theme.colors.primary};
      }
    `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 4px;
    border-radius: 6px;
  }

  svg {
    flex-shrink: 0;
    opacity: ${({ $active }) => ($active ? 1 : 0.82)};
  }

  @media (max-width: 768px) {
    padding: 8px 10px;
    font-size: 12px;

    &::after {
      left: 8px;
      right: 8px;
      height: 2px;
    }
  }
`
