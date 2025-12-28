import React from 'react'
import styled from 'styled-components'
import { Skeleton } from './skeleton.ui'

const SkeletonContainer = styled.div`
  display: flex;
  height: 100%;
  gap: 0.75rem;
  padding: 0.75rem;
  animation: fadeIn 0.3s ease-out;
`

const SidebarSkeleton = styled.div`
  flex-shrink: 0;
  width: 12rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background?.primary || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border?.default || '#e5e7eb'};
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const MainSkeleton = styled.div`
  flex: 1;
  display: flex;
  gap: 1rem;
  min-height: 0;
`

const LeftPaneSkeleton = styled.div`
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const RightPaneSkeleton = styled.div`
  flex: 7;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const CardSkeleton = styled.div`
  background: ${({ theme }) => theme.colors.background?.primary || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border?.default || '#e5e7eb'};
  border-radius: 0.75rem;
  padding: 1.5rem;
`

interface LayoutSkeletonProps {
  showSidebar?: boolean
}

export const LayoutSkeleton: React.FC<LayoutSkeletonProps> = ({
  showSidebar = true,
}) => {
  return (
    <SkeletonContainer>
      {showSidebar && (
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
              }}
            >
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={80} height={16} />
            </div>
          ))}
        </SidebarSkeleton>
      )}

      <MainSkeleton>
        <LeftPaneSkeleton>
          {/* 필터 섹션 */}
          <CardSkeleton>
            <Skeleton
              variant="text"
              width={120}
              height={24}
              style={{ marginBottom: '1rem' }}
            />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={40}
              style={{ marginBottom: '1rem' }}
            />
            <Skeleton variant="rectangular" width="100%" height={40} />
          </CardSkeleton>

          {/* 리스트 섹션 */}
          <CardSkeleton style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
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
              }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                  }}
                >
                  <Skeleton variant="circular" width={48} height={48} />
                  <div style={{ flex: 1 }}>
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={16}
                      style={{ marginBottom: '0.25rem' }}
                    />
                    <Skeleton variant="text" width="40%" height={14} />
                  </div>
                  <Skeleton variant="circular" width={8} height={8} />
                </div>
              ))}
            </div>
          </CardSkeleton>
        </LeftPaneSkeleton>

        <RightPaneSkeleton>
          {/* 상세 정보 섹션 */}
          <CardSkeleton style={{ flex: 1 }}>
            <Skeleton
              variant="text"
              width={150}
              height={28}
              style={{ marginBottom: '1.5rem' }}
            />

            {/* 상세 정보 그리드 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton
                    variant="text"
                    width="70%"
                    height={14}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <Skeleton variant="text" width="50%" height={18} />
                </div>
              ))}
            </div>

            {/* 차트 영역 */}
            <Skeleton
              variant="rectangular"
              width="100%"
              height={200}
              style={{ marginBottom: '1rem' }}
            />

            {/* 액션 버튼들 */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Skeleton variant="rectangular" width={100} height={40} />
              <Skeleton variant="rectangular" width={80} height={40} />
            </div>
          </CardSkeleton>
        </RightPaneSkeleton>
      </MainSkeleton>
    </SkeletonContainer>
  )
}

export default LayoutSkeleton
