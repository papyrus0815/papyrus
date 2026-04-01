/**
 * 공용 Pill형 탭 컴포넌트
 *
 * 사용법:
 *   <PillTabNav>
 *     <PillTabButton $active={tab === 'a'} onClick={() => setTab('a')}>탭A</PillTabButton>
 *     <PillTabButton $active={tab === 'b'} onClick={() => setTab('b')}>탭B</PillTabButton>
 *   </PillTabNav>
 *
 * 탭 줄만큼만 너비를 쓰려면 (행정구역 탭과 동일): <PillTabNav $hugContent>
 */
import styled from 'styled-components'

/** 배경 pill 컨테이너 */
export const PillTabNav = styled.div<{ $hugContent?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  /* 세로로 글자가 잘리지 않도록 여유 확보 (한글/굵은 글꼴 대비) */
  padding: 10px 10px 12px;
  min-height: 52px;
  box-sizing: border-box;
  /* 기본: 가로 전체. $hugContent: 탭 개수·라벨 길이만큼만 (MapRegionTabNav와 동일) */
  width: ${({ $hugContent }) => ($hugContent ? 'fit-content' : '100%')};
  max-width: 100%;
  min-width: 0;
  align-self: ${({ $hugContent }) => ($hugContent ? 'flex-start' : 'stretch')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : theme.colors.background.tertiary};
  border: ${({ theme }) =>
    theme.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none'};
  border-radius: 20px;
  /* 가로만 스크롤 — overflow-y: hidden 은 한글 글리프 상·하단이 잘리는 원인이 됨 */
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  touch-action: manipulation;
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.2)'
        : 'rgba(15, 23, 42, 0.2)'};
  }
`

/** Pill형 탭 버튼 */
export const PillTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 18px;
  min-height: 40px;
  box-sizing: border-box;
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
  line-height: 1.45;
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
