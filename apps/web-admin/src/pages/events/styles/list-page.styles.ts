/**
 * List Page Shell Styled Components
 * 메인/상세 패널 레이아웃 · 단축키 도움말 · 에러 배너
 */
import styled from 'styled-components'

import { BRAND, MOTION } from './theme'

/**
 * 시각적으로만 숨긴 페이지 제목.
 *
 * h1 '사건 연대표'는 좌측 nav의 활성 탭 '사건'과 같은 말을 27px + 간격 12px에 다시 적었고,
 * 스크롤해도 회수되지 않는 고정 크롬이었다. 시각 층에서는 지우되 문서에 h1이 없으면
 * 헤딩 탐색이 깨지므로(세기 h3 · 연도 h4가 그 아래에 매달려 있다) 접근성 트리에는 남긴다.
 */
export const VisuallyHiddenPageTitle = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

/**
 * 뷰 본문 래퍼 — 활성 뷰 슬롯.
 *
 * ⚠️ **폭 상한은 레포 어디에도 없다**(2026-08-02 전폭 전환). 여기에도 두지 말 것.
 */
export const ActiveContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  min-width: 0;
  flex: 1;
`

/**
 * 상세 패널 컨테이너:
 * - >=1200px: Layout.CatalogSplit grid의 두 번째 컬럼으로 자연스럽게 자리잡음
 * - <1200px: 우측에서 슬라이드인하는 fixed drawer로 동작
 *
 * 다크 모드 drawer 배경은 PageScene(`#0f0f0f`)보다 한 톤 위(`#171717`)로 경계 인지 강화.
 */
export const DetailPanelHost = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  /* 데스크톱(그리드 두 번째 열) — 오른쪽에서 16px 미끄러지며 나타나고, 닫힐 때 거꾸로.
     열 폭 자체는 보간하지 않는다(CatalogSplit 주석: 목록 250행이 매 프레임 재조판). */
  @media (min-width: 1201px) {
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    transform: translateX(${({ $open }) => ($open ? '0' : '16px')});
    transition:
      opacity 0.2s ease,
      transform ${MOTION.drawer};
  }
  @media (min-width: 1201px) and (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }

  @media (max-width: 1200px) {
    position: fixed;
    top: var(--header-height, 0);
    right: 0;
    bottom: 0;
    width: min(420px, 92vw);
    z-index: 1100;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#171717' : '#ffffff'};
    box-shadow: ${({ $open }) =>
      $open ? '-12px 0 32px rgba(15, 17, 29, 0.18)' : 'none'};
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
    transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
    transition: transform ${MOTION.drawer};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    /* drawer 내부 스크롤이 body로 새는 것 방지 (iOS rubber band 포함) */
    overscroll-behavior: contain;
  }

  /* 모바일 — drawer를 풀폭으로. 92vw로 8vw만 backdrop 노출하던 이전엔
   * 정확한 backdrop tap이 어려워 닫기가 사실상 헤더 X 버튼 한 가지뿐이었음. */
  @media (max-width: 640px) {
    width: 100vw;
    width: 100dvw;
    border-left: none;
  }

  @media (max-width: 1200px) and (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * 패널 내용 갈아끼우기 — 사건을 바꿀 때 내용만 짧게 페이드인. 스크롤 컨테이너(자식)가
 * 높이를 받도록 flex 열·min-height 0을 이어 준다.
 */
export const DetailPanelSwap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  @media (prefers-reduced-motion: no-preference) {
    animation: detailSwapIn 0.18s ease;
  }
  @keyframes detailSwapIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

export const DetailDrawerBackdrop = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 1200px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
    z-index: 1099;
  }

  @media (max-width: 1200px) and (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** 드로어 열림 고지 전용 — 시각적으로 숨기고 접근성 트리에만 남긴다. */
export const DrawerAnnouncer = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

export const ShortcutOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  /**
   * 짧은 뷰포트 대비 — 모달이 열린 동안 body는 overflow:hidden이고 셸도 position:fixed라
   * 문서 스크롤이 아예 없다. 오버레이에 스크롤이 없으면 내용(13항목 + 섹션 제목 ≈ 600px)이
   * 뷰포트 높이 ~660px 미만에서 위아래로 잘린 채 **읽을 방법이 사라진다**(검토 RWD-5).
   * 내용이 넘칠 때만 세로 스크롤이 생기도록 하고, 중앙 정렬이 넘침을 잘라먹지 않게
   * align-items를 safe center로 둔다.
   */
  overflow-y: auto;
  overscroll-behavior: contain;
  /* 위의 align-items:center 는 의도적인 폴백이다 — safe 키워드 미지원 브라우저에서는
   * 중앙 정렬이 유지되고(넘치면 위쪽이 잘릴 수 있음), 지원 브라우저에서는 넘칠 때
   * start 정렬로 떨어져 잘림 없이 스크롤된다. */
  align-items: safe center;
  animation: fadein 0.15s ease-out;

  @keyframes fadein {
    from {
      opacity: 0;
    }
  }
`

export const ShortcutBox = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(28,28,32,0.96)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  border-radius: 18px;
  padding: 20px 24px 22px;
  width: 100%;
  max-width: 460px;
  /* 오버레이 패딩(24px×2)을 뺀 높이를 넘지 않게 하고, 넘치면 박스 안에서 스크롤한다.
   * dvh가 이 폴더의 정본이다(layout.styles.ts:27, modal.styles.ts:168) — 100vh는 모바일에서
   * 주소창 높이만큼 실제 뷰포트보다 커서, 상한을 걸어도 그만큼 잘린다. vh는 구형 폴백. */
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.24),
    0 2px 6px rgba(15, 23, 42, 0.06);
  animation: pop 0.18s ease-out;

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const ShortcutHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

export const ShortcutClose = styled.button`
  background: transparent;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const ShortcutList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: background 0.12s;

    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(15,23,42,0.025)'};
    }

    & > span:last-child {
      margin-left: auto;
      color: ${({ theme }) => theme.colors.text.primary};
      font-weight: 500;
    }
  }

  kbd {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-bottom-width: 2px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
    font: 600 11.5px/1
      ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    /* 다크 모드에서도 키 입체감이 보이도록 안쪽 highlight 강화 */
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)'
        : 'inset 0 -1px 0 rgba(15,23,42,0.04)'};
  }
`

/**
 * 사건 fetch 실패 배너 — events=[]를 '사건 없음'으로 오인시키지 않도록 명시적 오류 + 재시도.
 */
export const ErrorBanner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 260px;
  padding: 32px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ErrorBannerTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ErrorBannerDesc = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ErrorRetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: ${BRAND.primary};
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`
