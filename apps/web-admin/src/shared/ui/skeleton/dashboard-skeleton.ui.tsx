import React from 'react'

import styled from 'styled-components'

import { Skeleton } from './skeleton.ui'

const DashboardContainer = styled.div`
  width: 100%;
  height: calc(100vh - 64px);
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#0f172a'
      : theme.colors.background?.secondary || '#f8fafc'};
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem;
  animation: fadeIn 0.4s ease-out;

  @media (min-width: 769px) and (max-width: 1023px) {
    padding: 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const WelcomeSection = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : theme.colors.gradient?.primary ||
        'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'};
  border-radius: 1.5rem;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'};
  animation: slideInUp 0.6s ease-out;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 50%
    );
    border-radius: 50%;
    transform: translate(50%, -50%);
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    margin-bottom: 1.5rem;
  }
`

const StatsGrid = styled.div`
  display: grid;
  margin-bottom: 2.5rem;
  animation: slideInUp 0.6s ease-out 0.2s both;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 769px) and (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`

const StatCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#1e293b'
      : theme.colors.background?.primary || '#ffffff'};
  padding: 2rem 1.5rem;
  border-radius: 1.25rem;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.1)'
        : theme.colors.border?.default || '#e5e7eb'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
        : theme.colors.gradient?.primary ||
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'};
  }

  @media (max-width: 480px) {
    padding: 1.5rem 1.25rem;
  }
`

const ActionGrid = styled.div`
  display: grid;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (min-width: 769px) and (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`

const ActionCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#1e293b'
      : theme.colors.background?.primary || '#ffffff'};
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.1)'
        : theme.colors.border?.default || '#e5e7eb'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 1px 3px rgba(0, 0, 0, 0.3)'
      : '0 1px 3px rgba(0, 0, 0, 0.1)'};
  text-align: center;
`

export const DashboardSkeleton: React.FC = () => {
  return (
    <DashboardContainer>
      {/* Welcome Section */}
      <WelcomeSection>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Skeleton
            variant="text"
            width={300}
            height={40}
            style={{
              marginBottom: '1rem',
              background: 'rgba(255, 255, 255, 0.3)',
            }}
          />
          <Skeleton
            variant="text"
            width={400}
            height={24}
            style={{
              marginBottom: '1.5rem',
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>
      </WelcomeSection>

      {/* Stats Grid */}
      <StatsGrid>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCard key={i}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <Skeleton variant="text" width={80} height={16} />
              <Skeleton variant="circular" width={32} height={32} />
            </div>
            <Skeleton
              variant="text"
              width={60}
              height={24}
              style={{ marginBottom: '0.5rem' }}
            />
            <Skeleton variant="text" width={100} height={14} />
          </StatCard>
        ))}
      </StatsGrid>

      {/* Quick Actions */}
      <div>
        <Skeleton
          variant="text"
          width={150}
          height={24}
          style={{ marginBottom: '1rem' }}
        />
        <ActionGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <ActionCard key={i}>
              <Skeleton
                variant="circular"
                width={48}
                height={48}
                style={{ margin: '0 auto 1rem' }}
              />
              <Skeleton
                variant="text"
                width={80}
                height={16}
                style={{ margin: '0 auto' }}
              />
            </ActionCard>
          ))}
        </ActionGrid>
      </div>
    </DashboardContainer>
  )
}

export default DashboardSkeleton
