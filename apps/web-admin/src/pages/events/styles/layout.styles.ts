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
  padding-bottom: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};

  @media (max-width: 768px) {
    padding-top: 16px;
    padding-bottom: 16px;
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
 * 채워진 indigo로 시인성 확보. hover는 한 톤 진하게(`primaryHover`)로만 변경. */
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

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
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

/* detail 패널 폭 — 1400+에서 440px (본문/관계/이미지 충분).
 *   1200~1400: 380px (콤팩트)
 *   <1200: drawer (좌측 main만, 우측 slide-in) */
export const CatalogSplit = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 440px;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 18px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
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
