/**
 * Detail Panel Styled Components
 * 상세 패널 관련 스타일
 */
import styled from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import { CATEGORY_BADGE_COLORS, IMPORTANCE_COLORS } from './theme'

export const DetailPanel = styled.aside`
  position: sticky;
  top: calc(var(--header-height) + 4px);
  align-self: flex-start;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  max-height: calc(100vh - var(--header-height) - 28px);
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.3);
  }

  @media (max-width: 1200px) {
    display: none;
  }
`

export const DetailPanelContent = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const DetailHeroImage = styled.div<{ $isEmpty?: boolean }>`
  width: 100%;
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 20px 20px 0 0;
  background-color: ${({ $isEmpty }) =>
    $isEmpty ? 'rgba(99, 102, 241, 0.04)' : 'transparent'};

  ${({ $isEmpty }) =>
    $isEmpty &&
    `
    display: flex;
    align-items: center;
    justify-content: center;
    
    &::before {
      content: '';
      width: 60px;
      height: 60px;
      background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" stroke="rgba(99, 102, 241, 0.25)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="54" height="54" rx="6" ry="6"/%3E%3Ccircle cx="22.5" cy="22.5" r="4.5"/%3E%3Cpolyline points="54 45 42 33 15 54"/%3E%3C/svg%3E');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.3;
      z-index: 1;
    }
  `}

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $isEmpty }) =>
      $isEmpty
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(168, 85, 247, 0.02) 100%)'
        : 'linear-gradient(135deg, rgba(10, 12, 28, 0.4) 0%, rgba(33, 18, 66, 0.3) 100%)'};
    z-index: 0;
  }
`

export const DetailCategory = styled.span<{
  $category: HistoricalEventCategory
}>`
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fff;
  z-index: 2;
  backdrop-filter: blur(8px);
  background: ${({ $category }) => {
    const color = CATEGORY_BADGE_COLORS[$category]
    return `${color}E6` // 90% opacity
  }};
`

export const DetailPanelEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 24px;
  position: relative;
  @media (max-width: 768px) {
    min-height: 320px;
    padding: 32px 20px;

    &::before {
      inset: 16px;
    }
  }
`

export const DetailPanelEmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
  margin-bottom: 20px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1),
    rgba(168, 85, 247, 0.08)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);

  svg {
    width: 32px;
    height: 32px;
    color: #6366f1;
    animation: iconFloat 3s ease-in-out infinite;
  }

  @keyframes iconFloat {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-6px) rotate(5deg);
    }
  }

  @media (max-width: 768px) {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;

    svg {
      width: 28px;
      height: 28px;
    }
  }
`

export const DetailPanelEmptyContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

export const DetailPanelEmptyTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`

export const DetailPanelEmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  animation: textPulse 3s ease-in-out infinite;

  @keyframes textPulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

export const DetailPanelHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 24px;
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);
`

export const DetailTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
`

export const DetailDescription = styled.p`
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
`

export const DetailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px;

  &:first-of-type {
    padding-top: 20px;
  }
`

export const DetailSectionTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export const DetailStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`

export const DetailStatCard = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: linear-gradient(180deg, #fafbff, #ffffff);
  display: flex;
  gap: 8px;
  align-items: flex-start;

  svg {
    color: #6366f1;
    flex-shrink: 0;
    margin-top: 2px;
    width: 16px;
    height: 16px;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  small {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  strong {
    font-size: 13px;
    color: #0f172a;
    font-weight: 600;
  }
`

export const DetailText = styled.p`
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
`

export const DetailFiguresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DetailFigureCard = styled.div`
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 10px;
  padding: 10px;
  background: #fafbff;
  display: flex;
  gap: 10px;
  align-items: center;

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  strong {
    font-size: 12px;
    color: #0f172a;
  }

  span {
    font-size: 11px;
    color: #475569;
  }

  small {
    font-size: 10px;
    color: #64748b;
  }
`

export const DetailFigureAvatar = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
`

export const DetailCountriesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const DetailCountryTag = styled.span`
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  font-size: 11px;
  font-weight: 600;
`

export const DetailChildrenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DetailChildItem = styled.button`
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafbff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 12px;
    color: #0f172a;
    font-weight: 600;
  }

  span {
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    background: #f0f4ff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  }
`

export const DetailActions = styled.div`
  padding: 12px 16px;
  border-top: 1.5px solid rgba(99, 102, 241, 0.1);
  background: rgba(248, 250, 252, 0.5);
`

export const SecondaryActionsRow = styled.div`
  display: flex;
  gap: 8px;
`

export const SecondaryActionButton = styled.button`
  flex: 1;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.8);
  color: #6366f1;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.05);
    color: #4f46e5;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.08);
  }

  &:active {
    transform: scale(0.98);
  }
`

export const ViewAllHierarchyButton = styled.button`
  border: 1.5px solid rgba(99, 102, 241, 0.25);
  border-radius: 10px;
  padding: 10px 14px;
  background: rgba(99, 102, 241, 0.05);
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;

  &:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`
