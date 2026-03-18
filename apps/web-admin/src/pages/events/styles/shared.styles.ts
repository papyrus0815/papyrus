/**
 * Shared Styled Components
 * 여러 컴포넌트에서 공통으로 사용되는 스타일드 컴포넌트
 */

import styled, { css } from 'styled-components'
import { KEYFRAMES, BREAKPOINTS } from './theme'

/**
 * Shimmer 애니메이션 믹스인
 */
export const shimmerAnimation = css`
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  ${KEYFRAMES.shimmer}
`

/**
 * Pulse 애니메이션 믹스인
 */
export const pulseAnimation = css`
  animation: pulse 1.5s ease-in-out infinite;
  ${KEYFRAMES.pulse}
`

/**
 * 스크롤바 스타일 믹스인
 */
export const customScrollbar = css`
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.3);
  }
`

/**
 * 스켈레톤 베이스 스타일
 */
export const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(99, 102, 241, 0.15) 50%,
    rgba(99, 102, 241, 0.1) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
`

/**
 * 스켈레톤 텍스트
 */
export const SkeletonText = styled(SkeletonBase)<{ $width?: string }>`
  width: ${({ $width }) => $width ?? '100%'};
  height: 12px;
`

/**
 * 모달 오버레이
 */
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
`

/**
 * 모달 컨테이너
 */
export const ModalContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 24px;
  z-index: 1001;
  width: 90%;
  max-width: 480px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(20, 20, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  ` : css`
    background: #ffffff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  `}
`

/**
 * 모달 헤더
 */
export const ModalHeader = styled.div`
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  ` : css`
    border-bottom: 1px solid rgba(99, 102, 241, 0.12);
  `}
`

/**
 * 모달 타이틀
 */
export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

/**
 * 모달 닫기 버튼
 */
export const ModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};

  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(99, 102, 241, 0.12)'};
    color: ${({ theme }) => theme.mode === 'dark' ? '#a5b4fc' : '#6366f1'};
  }
`

/**
 * 모달 컨텐츠
 */
export const ModalContent = styled.div`
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  ${customScrollbar}
`

/**
 * 엠티 스테이트 컨테이너
 */
export const EmptyStateContainer = styled.div`
  border-radius: 24px;
  padding: 80px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-height: 400px;
  justify-content: center;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border: 2px dashed rgba(99, 102, 241, 0.2);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(168, 85, 247, 0.02));
  ` : css`
    border: 2px dashed rgba(99, 102, 241, 0.12);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.02));
  `}

  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 60px 24px;
    min-height: 300px;
  }
`

/**
 * 엠티 아이콘
 */
export const EmptyIcon = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);

  svg {
    color: #6366f1;
    opacity: 0.7;
  }

  @media (max-width: ${BREAKPOINTS.mobile}) {
    width: 100px;
    height: 100px;

    svg {
      width: 40px;
      height: 40px;
    }
  }
`

/**
 * 엠티 타이틀
 */
export const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'};

  @media (max-width: ${BREAKPOINTS.mobile}) {
    font-size: 20px;
  }
`

/**
 * 엠티 설명
 */
export const EmptyDescription = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  max-width: 400px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};

  @media (max-width: ${BREAKPOINTS.mobile}) {
    font-size: 14px;
  }
`

/**
 * 버튼 베이스 스타일
 */
export const ButtonBase = styled.button`
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(99, 102, 241, 0.15);
    border: 1.5px solid rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
    &:hover {
      background: rgba(99, 102, 241, 0.25);
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      transform: translateY(-2px);
    }
  ` : css`
    background: rgba(99, 102, 241, 0.12);
    border: 1.5px solid rgba(99, 102, 241, 0.12);
    color: #4f46e5;
    &:hover {
      border-color: rgba(99, 102, 241, 0.4);
      background: rgba(99, 102, 241, 0.18);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
      transform: translateY(-2px);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`
