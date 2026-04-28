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

import { BODY_TEXT, ledgerBackground, ledgerHairline, ledgerInkLine } from './ledger-tokens'

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
    background: rgba(99, 102, 241, 0.18);
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
`
