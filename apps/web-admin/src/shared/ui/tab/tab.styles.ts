/**
 * 공용 Pill형 탭 컴포넌트
 *
 * 사용법:
 *   <PillTabNav>
 *     <PillTabButton $active={tab === 'a'} onClick={() => setTab('a')}>탭A</PillTabButton>
 *     <PillTabButton $active={tab === 'b'} onClick={() => setTab('b')}>탭B</PillTabButton>
 *   </PillTabNav>
 */
import styled from 'styled-components'

/** 배경 pill 컨테이너 */
export const PillTabNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 20px;
  width: fit-content;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : theme.colors.background.tertiary};
  border: ${({ theme }) =>
    theme.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none'};
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

/** Pill형 탭 버튼 */
export const PillTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.15)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#ffffff'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${({ $active }) =>
    $active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none'};

  svg {
    flex-shrink: 0;
  }

  &:hover {
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#ffffff'
          : theme.colors.primary
        : theme.colors.text.primary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.15)'
          : '#ffffff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.6)'};
  }
`
