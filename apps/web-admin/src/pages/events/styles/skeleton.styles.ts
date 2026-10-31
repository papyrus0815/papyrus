/**
 * ⚠️ **이 파일은 살아 있다 — 삭제하지 말 것.**
 *
 * 유일 소비처는 widgets/event-list/ui/event-detail-panel.tsx의 **상세 패널 로딩 상태**다
 * (SkeletonDetailHeroImage · DetailPanelSkeleton · SkeletonDetailTitle · SkeletonText ·
 * SkeletonCard 5개를 실제로 렌더한다).
 *
 * 목록 뷰의 스켈레톤은 여기가 아니라 event-compact-list.tsx 안에 따로 산다
 * (SkeletonStop/SkeletonBody — 행 격자 rowGridTemplate를 공유한다). 이름이 비슷해
 * "전이적 죽은 파일"로 오판된 전례가 있어 남긴다.
 */
/**
 * Skeleton Loading Styled Components
 *
 * shimmer/pulse 키프레임은 `theme.ts`의 `KEYFRAMES`에 1회 정의되며 `shared.styles`의
 * `shimmerAnimation`/`pulseAnimation` mixin을 통해 주입된다. 컴포넌트마다 keyframes
 * 인라인 재선언하던 12곳은 정리됨.
 *
 * `prefers-reduced-motion`은 mixin 안에서 `animation: none`으로 분기 — 운동 민감
 * 사용자에게는 정적 표면색만 표시된다.
 */
import styled from 'styled-components'

import { shimmerAnimation } from './shared.styles'

/** 카드 표면 위에 얹는 shimmering bar — height/width를 prop으로 받도록 base 통일 */
const skeletonBar = `
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(37, 99, 235, 0.15) 50%,
    rgba(37, 99, 235, 0.1) 100%
  );
`
const skeletonBarStrong = `
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.15) 0%,
    rgba(37, 99, 235, 0.25) 50%,
    rgba(37, 99, 235, 0.15) 100%
  );
`
const skeletonBarSubtle = `
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.08) 0%,
    rgba(37, 99, 235, 0.12) 50%,
    rgba(37, 99, 235, 0.08) 100%
  );
`

// ─── Detail Panel Skeleton ────────────────────────────────────────
export const DetailPanelSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
`

/* HeroFigure(200px)와 height 일치 — skeleton→실제 전환 시 CLS 0 */
/**
 * 상세 패널 히어로 자리.
 *
 * 200px이었다 — 실제 히어로(`HeroFigure`)와 높이를 맞춰 CLS를 없애려는 값이었는데,
 * 대표 이미지를 가진 사건은 실측 19/293(6.5%)뿐이다. 즉 이 스켈레톤은 **93.5%의 경우에
 * 없을 이미지 자리를 200px 잡았다가 40px로 무너뜨리고** 있었다. 다수 쪽(빈 히어로 띠)에
 * 맞춘다 — 이미지가 있는 6.5%에서만 아래로 밀리고, 그쪽은 이미지가 도착하는 순간이라
 * 사용자가 원인을 본다.
 */
export const SkeletonDetailHeroImage = styled.div`
  height: 40px;
  margin: 12px 16px 0;
  ${skeletonBarStrong}
  ${shimmerAnimation}
  border-radius: 10px;
`

export const SkeletonDetailTitle = styled.div`
  width: 85%;
  height: 24px;
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.12) 0%,
    rgba(37, 99, 235, 0.18) 50%,
    rgba(37, 99, 235, 0.12) 100%
  );
  ${shimmerAnimation}
  border-radius: 8px;
`

export const SkeletonText = styled.div<{ $width?: string }>`
  width: ${({ $width }) => $width ?? '100%'};
  height: 12px;
  ${skeletonBarSubtle}
  ${shimmerAnimation}
  border-radius: 6px;
`

export const SkeletonCard = styled.div`
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.08)'};
  border-radius: 12px;
  padding: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : '#ffffff'};
  height: 60px;
  display: flex;
  gap: 8px;
  align-items: center;

  &::before {
    content: '';
    width: 16px;
    height: 16px;
    ${skeletonBar}
    ${shimmerAnimation}
    border-radius: 4px;
  }

  &::after {
    content: '';
    flex: 1;
    height: 12px;
    ${skeletonBarSubtle}
    ${shimmerAnimation}
    border-radius: 6px;
  }
`
