/**
 * Ledger Shell Layout
 *
 * 가로 사이드바 없음. 위에서 아래로 3 영역 + 우상단 floating ⌘K hint.
 *
 *   ┌─────── lens bar (60px) ───────┐
 *   ├─────── pivot tabs (40px) ──────┤
 *   │                                │
 *   │      LEDGER (스크롤 영역)       │
 *   │                                │
 *   └────────────────────────────────┘
 *                          [⌘K floating]
 */
import styled from 'styled-components'

import {
  BODY_TEXT,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerInkLine,
  ledgerSurfaceSolid,
} from './ledger-tokens'

export const Page = styled.div`
  ${BODY_TEXT}
  position: relative;
  display: grid;
  grid-template-rows: 60px 40px minmax(0, 1fr);
  /* 앱 전역 fixed Header(--header-height, 기본 64px) 아래로 내려서 겹침 방지 */
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;

  @media (max-width: 480px) {
    grid-template-rows: 56px 40px minmax(0, 1fr);
  }
`

export const LensSlot = styled.header`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  min-width: 0;

  @media (max-width: 480px) {
    padding: 0 12px;
  }
`

export const PivotSlot = styled.nav`
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0 20px;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  overflow-x: auto;
  scrollbar-width: none;
  min-width: 0;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 480px) {
    padding: 0 12px;
  }
`

export const LedgerSlot = styled.main`
  position: relative;
  overflow: hidden;
  min-height: 0;
`

export const LedgerScroller = styled.div`
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

export const FloatingHintWrap = styled.div`
  position: absolute;
  bottom: 18px;
  right: 22px;
  z-index: 5;

  /* 모바일에선 가상 키보드가 올라오면 가려질 수 있으므로 약간 더 위로,
   * 그리고 가운데 정렬해 한 손 조작 친화적으로. */
  @media (max-width: 480px) {
    bottom: 14px;
    right: 50%;
    transform: translateX(50%);
  }
`

/**
 * 자동 소진(autoLoadAll) 중 일부 페이지 로드가 실패했을 때 상단에 뜨는 sticky 배너.
 * 부분 데이터로 pivot을 집계 중임을 알리고 재시도(이어받기)를 노출한다 — 없으면 옛 세기
 * 사건이 조용히 누락된다. sticky라 스크롤해도 유지.
 */
export const LoadMoreFailedBanner = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 8px;
  background: ${({ theme }) => ledgerSurfaceSolid(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  border-radius: 10px;
  ${BODY_TEXT}
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const LoadMoreRetryButton = styled.button`
  flex: none;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`
