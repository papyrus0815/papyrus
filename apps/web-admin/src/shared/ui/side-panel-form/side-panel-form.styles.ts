/**
 * 조약 등록(TreatyLinkModal) 사이드 패널과 동일한 폼 크롬
 * — 상단 고정 언더라인 탭, 목록 행 버튼
 */
import styled from 'styled-components'

/** 본문 상단: 탭 바를 스크롤 영역 맨 위에 고정 */
export const SidePanelFormTabBarWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  margin: -22px -28px 14px -28px;
  width: calc(100% + 56px);
  box-sizing: border-box;
`

export const SidePanelFormTabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: 0 8px 0 24px;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
`

export const SidePanelFormTab = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 22px;
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  color: ${(p) =>
    p.$active ? '#4f46e5' : p.theme.mode === 'dark' ? '#94a3b8' : '#64748b'};
  background: none;
  border: none;
  border-bottom: 3px solid ${(p) => (p.$active ? '#6366f1' : 'transparent')};
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 조약 목록 행(TreatyListRow)과 동일 */
export const SidePanelFormListRow = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  border-radius: 12px;
  border: 1.5px solid
    ${({ $selected, theme }) =>
      $selected
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : theme.colors.border.light};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.12)'
        : '#eef2ff'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fafbff'};
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  color: ${({ theme }) => theme.colors.text.primary};
  &:hover {
    border-color: #a5b4fc;
  }
`

/** 서명국 카드 등 — 조약 SignatoryRowCard 톤 */
export const SidePanelFormSectionCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 14px;
  padding: 16px 18px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafbff'};
`
