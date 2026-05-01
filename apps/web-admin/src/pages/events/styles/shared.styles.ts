/**
 * Shared mixins
 *
 * 페이지 내에서 *여러 컴포넌트가 재사용*하는 mixin만 노출.
 * 페이지 외부 사용처가 없는 EmptyState/ButtonBase/ModalShell 등 컴포넌트는 dead code로 제거됨
 * (각 사용처가 자체 styled를 가짐 — list.styles의 EmptyCatalogState, modal.styles의 Modal 등).
 */

import styled, { css } from 'styled-components'

import { KEYFRAMES } from './theme'

/** Shimmer — skeleton 표면 슬라이드. reduced-motion에서 정지. */
export const shimmerAnimation = css`
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  ${KEYFRAMES.shimmer}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** Pulse — opacity 펄스. reduced-motion에서 정지. */
export const pulseAnimation = css`
  animation: pulse 1.5s ease-in-out infinite;
  ${KEYFRAMES.pulse}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** 스크롤바 mixin — overflow 컨테이너에 attach. */
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
    background: rgba(37, 99, 235, 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(37, 99, 235, 0.3);
  }
`

/** Skeleton 베이스 — 표면 색 + shimmer 일괄 적용 */
export const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(37, 99, 235, 0.15) 50%,
    rgba(37, 99, 235, 0.1) 100%
  );
  ${shimmerAnimation}
  border-radius: 6px;
`

/** Skeleton 텍스트 한 줄 — width prop으로 길이 조절 */
export const SkeletonText = styled(SkeletonBase)<{ $width?: string }>`
  width: ${({ $width }) => $width ?? '100%'};
  height: 12px;
`
