/**
 * Layout Styled Components
 * 페이지 레이아웃 관련 스타일
 */
import styled, { css } from 'styled-components'

import { BRAND, MOTION } from './theme'

export const PageScene = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding-top: 16px;
  /* iOS home indicator 영역 회피 — env가 0인 데스크톱에선 그냥 16px */
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};

  @media (max-width: 768px) {
    /* dvh는 모바일 주소창 표시/숨김에 따라 줄어들고 펼쳐짐 — 마지막 사건이 가려지는 걸 방지 */
    height: calc(100dvh - var(--header-height));
    padding-top: 12px;
  }
`

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 0 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`

export const PageTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

export const PageTopTitle = styled.div`
  h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }

  p {
    margin: 6px 0 0;
    font-size: 14px;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
  }
`

/* primary action 버튼 — 페이지 내 *유일한 primary CTA*. ledger polish 평면 톤 안에서도
 * 채워진 indigo로 시인성 확보. hover는 한 톤 진하게(`primaryHover`)로만 변경.
 *
 * 모바일(<=640px)에서는 toolbar에서 숨기고 우하단 `CreateEventFab`를 별도 렌더 — 좁은 폭에서
 * toolbar가 5-6줄로 흩어지는 문제와, 사용자가 +CTA를 즉시 찾기 어려운 문제 동시 해결. */
export const CreateEventButton = styled.button`
  border-radius: 8px;
  padding: 8px 14px;
  height: 34px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    box-shadow ${MOTION.fast};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${BRAND.primary};
  border: 1px solid ${BRAND.primary};
  color: #ffffff;

  &:hover {
    background: ${BRAND.primaryHover};
    border-color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 640px) {
    /* toolbar에서 hide — 우하단 FAB가 같은 액션을 제공 */
    display: none;
  }
`

/** 모바일 우하단 floating action button — toolbar의 `+새 사건`을 대체.
 * iOS home indicator를 피해 safe-area-inset-bottom 만큼 위로 띄움.
 * 데스크톱(>640px)에선 hide. */
export const CreateEventFab = styled.button`
  display: none;

  @media (max-width: 640px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    right: 16px;
    bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: ${BRAND.primary};
    color: #ffffff;
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.32);
    cursor: pointer;
    z-index: 1050;
    transition: background ${MOTION.fast}, transform ${MOTION.fast};

    &:hover {
      background: ${BRAND.primaryHover};
    }

    &:active {
      transform: scale(0.96);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.32), ${BRAND.focusRing};
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* toolbar — *카드 아닌 단순 flex row*. border / bg 모두 제거.
 * (이전: card-in-card 인상 → 14개 bordered children 위에 또 카드 1개) */
export const TopFilterBar = styled.div`
  display: flex;
  gap: 10px;
  padding: 4px 0 12px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.06)'};
`

/**
 * detail 패널 폭 — 1400+에서 440px / 1200~1400에서 380px / <1200은 drawer.
 *
 * `$hasSelection=false`일 땐 *우측 컬럼 자체 미할당* → 메인 뷰 풀 폭.
 * 사건이 선택되면 컬럼 등장 (CSS transition은 grid-template로 자연스럽게).
 */
export const CatalogSplit = styled.div<{ $hasSelection?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasSelection }) =>
    $hasSelection ? 'minmax(0, 1fr) 440px' : 'minmax(0, 1fr)'};
  gap: ${({ $hasSelection }) => ($hasSelection ? '20px' : '0')};
  flex: 1;
  min-height: 0;
  overflow: hidden;
  transition: grid-template-columns 0.18s ease, gap 0.18s ease;

  @media (max-width: 1400px) {
    grid-template-columns: ${({ $hasSelection }) =>
      $hasSelection ? 'minmax(0, 1fr) 380px' : 'minmax(0, 1fr)'};
    gap: ${({ $hasSelection }) => ($hasSelection ? '18px' : '0')};
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
`
