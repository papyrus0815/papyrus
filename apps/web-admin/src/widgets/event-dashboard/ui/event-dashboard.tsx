/**
 * Event Dashboard - 상단 통계 카드
 */
import React from 'react'

import { FiActivity, FiCalendar, FiGlobe, FiTrendingUp } from 'react-icons/fi'
import styled from 'styled-components'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'

interface EventDashboardProps {
  events: HistoricalEvent[]
  filteredEvents: HistoricalEvent[]
}

export const EventDashboard: React.FC<EventDashboardProps> = ({
  events,
  filteredEvents,
}) => {
  const totalEvents = events.length
  const filteredCount = filteredEvents.length

  // 카테고리별 개수
  const categoryCount = filteredEvents.reduce(
    (acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const topCategory = Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1],
  )[0]

  // 국가 개수
  const countryCount = new Set(
    filteredEvents.flatMap((e) => [
      ...((e as any).relatedCountries || []).map((c: any) => c.id),
      ...((e as any).relatedHistoricalCountries || []).map((c: any) => c.id),
    ]),
  ).size

  return (
    <DashboardGrid>
      <DashboardCard>
        <CardIcon $color="#6366f1">
          <FiActivity size={20} />
        </CardIcon>
        <CardContent>
          <CardLabel>전체 사건</CardLabel>
          <CardValue>{totalEvents}건</CardValue>
        </CardContent>
      </DashboardCard>

      <DashboardCard>
        <CardIcon $color="#8b5cf6">
          <FiCalendar size={20} />
        </CardIcon>
        <CardContent>
          <CardLabel>필터링</CardLabel>
          <CardValue>{filteredCount}건</CardValue>
        </CardContent>
      </DashboardCard>

      <DashboardCard>
        <CardIcon $color="#ec4899">
          <FiGlobe size={20} />
        </CardIcon>
        <CardContent>
          <CardLabel>관련 국가</CardLabel>
          <CardValue>{countryCount}개국</CardValue>
        </CardContent>
      </DashboardCard>

      <DashboardCard>
        <CardIcon $color="#14b8a6">
          <FiTrendingUp size={20} />
        </CardIcon>
        <CardContent>
          <CardLabel>주요 카테고리</CardLabel>
          <CardValue>
            {topCategory ? `${topCategory[0]} (${topCategory[1]})` : '-'}
          </CardValue>
        </CardContent>
      </DashboardCard>
    </DashboardGrid>
  )
}

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const DashboardCard = styled.div<{ $gradient?: string }>`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: ${({ $gradient }) => $gradient ?? 'transparent'};
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0) 100%
    );
    pointer-events: none;
  }

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transform: translateY(-4px) scale(1.02);
  }
`

const CardIcon = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: ${({ $color }) => $color ?? 'rgba(255, 255, 255, 0.25)'};
  color: #ffffff;
  border-radius: 14px;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
`

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`

const CardLabel = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  letter-spacing: 0.3px;
`

const CardValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CardSubtext = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
