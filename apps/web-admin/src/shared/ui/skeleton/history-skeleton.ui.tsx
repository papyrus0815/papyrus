import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Skeleton } from './skeleton.ui'

// --- 키프레임 애니메이션 ---
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

// 💧 리퀴드 글라스 효과 (대시보드와 동일)
const liquidGlassEffect = css`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid transparent;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);

  /* 그라데이션 테두리를 위한 가상 요소 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 24px;
    border: 1px solid transparent;
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.2),
        rgba(255, 255, 255, 0.1)
      )
      border-box;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 190, 255, 0.3);
    box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.2);
  }
`

const HistoryContainer = styled.div`
  display: flex;
  height: calc(100vh - 64px);
  /* 대시보드와 동일한 배경색 적용 */
  background: linear-gradient(135deg, #0f1115 0%, #12151a 50%, #0b0d11 100%);
  overflow: hidden;
  position: relative;
  animation: ${fadeIn} 0.6s ease-out;

  /* 대시보드의 radial-gradient 효과 추가 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 80% 20%,
      rgba(0, 0, 0, 0.25) 0%,
      transparent 55%
    );
    pointer-events: none;
  }

  @media (min-width: 1024px) {
    gap: 1.5rem;
    padding: 1.5rem;
  }

  @media (min-width: 769px) and (max-width: 1023px) {
    gap: 1rem;
    padding: 1rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
`

const SidebarSkeleton = styled.div`
  ${liquidGlassEffect}
  flex-shrink: 0;
  width: 12rem;
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  animation: ${slideInUp} 0.6s ease-out 0.1s both;

  @media (max-width: 1024px) {
    width: 10rem;
    padding: 0.75rem;
  }

  @media (max-width: 768px) {
    display: none;
  }
`

const MainSkeleton = styled.div`
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  gap: 1rem;
  animation: ${slideInUp} 0.6s ease-out 0.2s both;

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`

const LeftPaneSkeleton = styled.div`
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  overflow: hidden;

  @media (min-width: 769px) and (max-width: 1023px) {
    flex: 0 0 350px;
  }

  @media (max-width: 768px) {
    flex: none;
    height: auto;
    max-height: 50vh;
  }
`

const RightPaneSkeleton = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow: hidden;

  @media (max-width: 768px) {
    flex: 1;
    height: auto;
    min-height: 50vh;
  }
`

const CardSkeleton = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#1e293b'
      : theme.colors.background?.primary || '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.1)'
        : theme.colors.border?.default || '#e5e7eb'};
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const FilterCardSkeleton = styled(CardSkeleton)`
  flex-shrink: 0;
  height: 200px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 8px 15px -3px rgba(0, 0, 0, 0.4)'
        : '0 8px 15px -3px rgba(0, 0, 0, 0.15)'};
    transform: translateY(-1px);
  }
`

const ListCardSkeleton = styled(CardSkeleton)`
  flex: 1;
  overflow: hidden;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 8px 15px -3px rgba(0, 0, 0, 0.4)'
        : '0 8px 15px -3px rgba(0, 0, 0, 0.15)'};
    transform: translateY(-1px);
  }
`

const DetailCardSkeleton = styled(CardSkeleton)`
  flex: 1;
  overflow: hidden;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 8px 15px -3px rgba(0, 0, 0, 0.4)'
        : '0 8px 15px -3px rgba(0, 0, 0, 0.15)'};
    transform: translateY(-1px);
  }
`

export const HistorySkeleton: React.FC = () => {
  return (
    <HistoryContainer>
      {/* 사이드바 스켈레톤 */}
      <SidebarSkeleton>
        {/* 사이드바 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <Skeleton variant="circular" width={28} height={28} />
          <Skeleton variant="text" width={60} height={20} />
        </div>

        {/* 메뉴 항목들 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              borderRadius: '0.75rem',
            }}
          >
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={80} height={16} />
          </div>
        ))}
      </SidebarSkeleton>

      <MainSkeleton>
        <LeftPaneSkeleton>
          {/* 필터 섹션 */}
          <FilterCardSkeleton>
            <Skeleton
              variant="text"
              width={120}
              height={24}
              style={{ marginBottom: '1rem' }}
            />

            {/* 검색 입력 */}
            <div style={{ marginBottom: '1rem' }}>
              <Skeleton
                variant="text"
                width={60}
                height={16}
                style={{ marginBottom: '0.5rem' }}
              />
              <Skeleton variant="rectangular" width="100%" height={40} />
            </div>

            {/* 대륙 선택 */}
            <div>
              <Skeleton
                variant="text"
                width={40}
                height={16}
                style={{ marginBottom: '0.5rem' }}
              />
              <Skeleton variant="rectangular" width="100%" height={40} />
            </div>
          </FilterCardSkeleton>

          {/* 리스트 섹션 */}
          <ListCardSkeleton>
            {/* 리스트 헤더 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: `1px solid ${({ theme }: any) => theme?.colors?.border?.light || '#f3f4f6'}`,
              }}
            >
              <Skeleton variant="text" width={100} height={24} />
              <Skeleton variant="rectangular" width={80} height={32} />
            </div>

            {/* 리스트 아이템들 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                overflow: 'hidden',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <Skeleton variant="circular" width={48} height={48} />
                  <div style={{ flex: 1 }}>
                    <Skeleton
                      variant="text"
                      width="70%"
                      height={16}
                      style={{ marginBottom: '0.25rem' }}
                    />
                    <Skeleton variant="text" width="40%" height={14} />
                  </div>
                  <Skeleton variant="circular" width={8} height={8} />
                </div>
              ))}
            </div>
          </ListCardSkeleton>
        </LeftPaneSkeleton>

        <RightPaneSkeleton>
          {/* 상세 정보 섹션 */}
          <DetailCardSkeleton>
            {/* 타이틀 */}
            <Skeleton
              variant="text"
              width={180}
              height={28}
              style={{ marginBottom: '1.5rem' }}
            />

            {/* 기본 정보 그리드 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--theme-bg-secondary, #f8fafc)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--theme-border-light, #f3f4f6)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Skeleton
                    variant="text"
                    width="60%"
                    height={14}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <Skeleton variant="text" width="80%" height={18} />
                </div>
              ))}
            </div>

            {/* 차트/그래프 영역 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <Skeleton
                variant="text"
                width={120}
                height={20}
                style={{ marginBottom: '1rem' }}
              />
              <Skeleton
                variant="rectangular"
                width="100%"
                height={180}
                style={{ borderRadius: '0.5rem' }}
              />
            </div>

            {/* 액션 버튼들 */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <Skeleton variant="rectangular" width={100} height={40} />
              <Skeleton variant="rectangular" width={80} height={40} />
              <Skeleton variant="rectangular" width={60} height={40} />
            </div>
          </DetailCardSkeleton>
        </RightPaneSkeleton>
      </MainSkeleton>
    </HistoryContainer>
  )
}

export default HistorySkeleton
