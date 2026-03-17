/**
 * CountryDetail 위젯 전용 스타일
 * 상세 뷰 패널, 로딩, Analytics 대시보드
 */
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

// ─── 상세 패널 레이아웃 ────────────────────────────────────────────────────────

export const DetailPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: calc(100vh - var(--header-height));
  min-height: 0;
  overflow-y: auto;
  border-left: none;

  @media (max-width: 1024px) {
    display: none;
  }
`

export const DetailPaneRelative = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - var(--header-height));
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background.primary};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.medium};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.colors.border.dark};
    }
  }

  @media (max-width: 768px) {
    height: auto;
  }
`

export const DetailContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

// ─── 로딩 오버레이 ────────────────────────────────────────────────────────────

export const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.background.primary}f2;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: ${Z_INDEX.LOADING_OVERLAY};
`

export const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 50%;
  border-top-color: ${({ theme }) => theme.colors.text.secondary};
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const LoadingSpinnerInner = styled.div`
  display: none;
`

export const LoadingText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.01em;
`

// ─── Analytics 대시보드 ───────────────────────────────────────────────────────

export const AnalyticsDashboard = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0;

  @media (max-width: 768px) {
    padding: 20px;
    gap: 20px;
  }
`
