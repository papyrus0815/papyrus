/**
 * List Styled Components
 * 이벤트 리스트 관련 스타일
 */
import styled from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import { CATEGORY_BADGE_COLORS } from './theme'

export const CompactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 12px 120px 0;

  &::-webkit-scrollbar {
    width: 6px;
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

  @media (max-width: 768px) {
    max-height: none;
  }
`

export const CompactListItem = styled.div<{
  $active: boolean
  $depth: number
}>`
  border: 1.5px solid
    ${({ $active, $depth }) =>
      $active
        ? 'rgba(99, 102, 241, 0.4)'
        : $depth > 0
          ? 'rgba(99, 102, 241, 0.08)'
          : 'rgba(20, 19, 34, 0.08)'};
  border-radius: 14px;
  padding: 0;
  margin-left: ${({ $depth }) => $depth * 24}px;
  background: ${({ $active, $depth }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.06))'
      : $depth > 0
        ? 'rgba(248, 250, 252, 0.8)'
        : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ $active, $depth }) =>
    $active
      ? '0 2px 8px rgba(99, 102, 241, 0.12)'
      : '0 1px 3px rgba(0, 0, 0, 0.04)'};
  position: relative;
  display: flex;

  /* 선택 상태 좌측 바 */
  ${({ $active }) =>
    $active &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 14px 0 0 14px;
      box-shadow: 2px 0 8px rgba(99, 102, 241, 0.3);
    }
  `}

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
  }

  @media (max-width: 768px) {
    min-height: ${({ $depth }) => Math.max(80, 100 - $depth * 10)}px;
  }
`

export const CompactListBody = styled.div`
  display: flex;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: inherit;
`

export const CompactThumbnail = styled.div<{
  $depth: number
  $isEmpty?: boolean
}>`
  width: ${({ $depth }) => Math.max(60, 90 - $depth * 10)}px;
  align-self: stretch;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 12px 0 0 12px;
  overflow: hidden;
  background-color: ${({ $isEmpty }) =>
    $isEmpty ? 'rgba(99, 102, 241, 0.05)' : 'transparent'};

  ${({ $isEmpty }) =>
    $isEmpty &&
    `
    display: flex;
    align-items: center;
    justify-content: center;
    
    &::before {
      content: '';
      width: 24px;
      height: 24px;
      background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="rgba(99, 102, 241, 0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.4;
    }
  `}

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $isEmpty }) =>
      $isEmpty
        ? 'none'
        : 'linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 100%)'};
  }
`

export const CompactCategoryBadge = styled.span<{
  $category: HistoricalEventCategory
}>`
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $category }) => {
    const color = CATEGORY_BADGE_COLORS[$category]
    return `${color}E6` // 90% opacity
  }};
`

export const CompactListContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 12px 14px;
  min-width: 0;
`

export const CompactListHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
`

export const ExpandButton = styled.button`
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: #fff;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 1px;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.35);
    color: #4f46e5;
    transform: scale(1.1);
  }
`

export const ExpandSpacer = styled.span`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`

export const CompactCategoryDot = styled.span<{
  $category: HistoricalEventCategory
  $depth: number
}>`
  width: ${({ $depth }) => 10 - $depth * 1}px;
  height: ${({ $depth }) => 10 - $depth * 1}px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  border: ${({ $depth }) =>
    $depth > 0 ? '1.5px solid rgba(255, 255, 255, 0.8)' : 'none'};
  background: ${({ $category }) => CATEGORY_BADGE_COLORS[$category]};
  opacity: ${({ $depth }) => Math.max(0.5, 1 - $depth * 0.12)};
`

export const CompactListTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    font-size: 14px;
    line-height: 1.5;
  }
`

export const CompactListMeta = styled.div<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;

  span {
    line-height: 1;
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

export const TimelineDateWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
`

export const TimelineDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;

  &::before {
    content: '━━━';
    color: #cbd5e1;
    letter-spacing: -2px;
  }
`

export const TimelineDuration = styled.div`
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
  font-weight: 600;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
`

export const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: #94a3b8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const YearDivider = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 16px 0;
  padding: 0;
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  transition: all 0.2s ease;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(203, 213, 225, 0.3);
  }

  span {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    background: #fafafa;
    padding: 6px 16px;
    border-radius: 10px;
    border: 1.5px solid rgba(203, 213, 225, 0.5);
    letter-spacing: 0.2px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;

    svg {
      transition: transform 0.2s ease;
      color: #6366f1;
      font-size: 12px;
    }
  }

  &:hover span {
    background: #ffffff;
    border-color: rgba(99, 102, 241, 0.25);
  }
`

export const CollapsedCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #ffffff;
  background: #94a3b8;
  padding: 3px 8px;
  border-radius: 8px;
  margin-left: auto;
`

export const CompactListSummary = styled.p<{ $depth: number }>`
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 13px;
    line-height: 1.6;
  }
`

export const ImportanceBadge = styled.span<{ $major?: boolean }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $major }) =>
    $major ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
  color: ${({ $major }) => ($major ? '#d97706' : '#dc2626')};
`

export const EmptyCatalogState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  padding: 60px 40px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px dashed rgba(99, 102, 241, 0.15);
    border-radius: 16px;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.02) 0%,
      rgba(168, 85, 247, 0.02) 100%
    );
  }

  @media (max-width: 768px) {
    padding: 50px 30px;
    min-height: 360px;
  }

  @media (max-width: 480px) {
    padding: 40px 24px;
    min-height: 320px;
  }
`

export const EmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1),
    rgba(168, 85, 247, 0.08)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);

  svg {
    color: #6366f1;
    animation: iconFloat 3s ease-in-out infinite;
  }

  @keyframes iconFloat {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-6px) rotate(-5deg);
    }
  }

  @media (max-width: 768px) {
    width: 72px;
    height: 72px;
    margin-bottom: 20px;

    svg {
      width: 40px;
      height: 40px;
    }
  }

  @media (max-width: 480px) {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;

    svg {
      width: 36px;
      height: 36px;
    }
  }
`

export const EmptyContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 400px;
  text-align: center;
`

export const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.01em;
  line-height: 1.4;

  @media (max-width: 768px) {
    font-size: 16px;
  }

  @media (max-width: 480px) {
    font-size: 15px;
  }
`

export const EmptyDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 13px;
  }

  @media (max-width: 480px) {
    font-size: 13px;
  }
`

export const EmptyActions = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

export const EmptyResetButton = styled.button`
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 10px 20px;
  background: #ffffff;
  color: #6366f1;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.04);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
  }

  @media (max-width: 480px) {
    padding: 9px 18px;
    font-size: 13px;
  }
`

export const EmptyCreateButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 11px 22px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 480px) {
    padding: 10px 20px;
    font-size: 13px;
  }
`

export const SummaryIconButton = styled.button`
  border: none;
  background: rgba(99, 102, 241, 0.1);
  padding: 4px 6px;
  border-radius: 6px;
  color: #6366f1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 6px;

  &:hover {
    background: rgba(99, 102, 241, 0.18);
    color: #4f46e5;
    transform: scale(1.1);
  }
`

// Catalog Section (Main Container)
export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  max-height: calc(100vh - var(--header-height) - 60px);
  overflow: hidden;
`

// Result Controls (Toolbar)
export const ResultControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: #ffffff;
  border: 1.5px solid rgba(20, 19, 34, 0.08);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
  }
`

export const ToolbarMeta = styled.div`
  font-size: 14px;
  color: #475569;
  font-weight: 600;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;

  span {
    color: #6366f1;
  }
`

export const ToolbarToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
`

export const ToolbarToggleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ToolbarToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #475569;
`

export const ToolbarToggleDescription = styled.span`
  font-size: 10px;
  color: rgba(20, 19, 34, 0.5);
`

// Sort Controls
export const SortSelect = styled.select`
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 9px 32px 9px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.04);
  appearance: none;
  background-image: url('data:image/svg+xml,%3Csvg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M1 1L6 6L11 1" stroke="%236366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E');
  background-repeat: no-repeat;
  background-position: calc(100% - 10px) 50%;

  &:hover {
    border-color: rgba(99, 102, 241, 0.35);
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }
`

export const SortDirectionToggle = styled.button`
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 9px 11px;
  background: #ffffff;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.04);

  svg {
    transition: transform 0.2s ease;
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.35);
    background: rgba(99, 102, 241, 0.05);
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);

    svg {
      transform: scale(1.1);
    }
  }

  &:active {
    transform: scale(0.95);
  }
`

// 국가 원수 정보 스타일
export const HeadOfStateSection = styled.div<{ $depth: number }>`
  margin-top: 8px;
  padding: 10px 12px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.04),
    rgba(168, 85, 247, 0.03)
  );
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  margin-left: ${({ $depth }) => $depth * 24}px;
`

export const HeadOfStateTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: rgba(99, 102, 241, 0.8);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 12px;
    height: 12px;
  }
`

export const HeadOfStateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const HeadOfStateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: white;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.08);
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.2);
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.08);
  }
`

export const HeadOfStateAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.15),
    rgba(168, 85, 247, 0.1)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(99, 102, 241, 0.9);
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const HeadOfStateInfo = styled.div`
  flex: 1;
  min-width: 0;
`

export const HeadOfStateName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #141322;
  margin-bottom: 2px;
`

export const HeadOfStateDetails = styled.div`
  font-size: 10px;
  color: rgba(20, 19, 34, 0.6);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

export const HeadOfStateCountry = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 4px;
  font-weight: 500;
  color: rgba(99, 102, 241, 0.9);
`

export const HeadOfStatePosition = styled.span`
  color: rgba(20, 19, 34, 0.7);
  font-weight: 500;
`

export const HeadOfStateTenure = styled.span`
  color: rgba(20, 19, 34, 0.5);
  font-size: 9px;
`

// 국가 원수 집권 기간 헤더
export const TenureGroupHeader = styled.div<{ $depth: number }>`
  margin: 12px 0 6px 0;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.04);
  border-radius: 6px;
  border-left: 3px solid rgba(99, 102, 241, 0.5);
  position: relative;
  margin-left: ${({ $depth }) => $depth * 24}px;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const TenureGroupTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(99, 102, 241, 0.8);
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 13px;
    height: 13px;
  }
`

export const TenureGroupInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #141322;
  font-weight: 600;
  flex: 1;
`

export const TenureGroupExpandButton = styled.button`
  padding: 4px 8px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 6px;
  color: rgba(99, 102, 241, 0.9);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
  margin-left: auto;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }
`

export const TenureDetailsPanel = styled.div`
  margin: 0 0 8px 0;
  padding: 10px 12px;
  background: rgba(249, 250, 251, 0.9);
  border-radius: 6px;
  border-left: 3px solid rgba(99, 102, 241, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
`

export const TenureDetailsHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TenureSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #141322;
`

export const TenureSectionDescription = styled.div`
  font-size: 10px;
  color: rgba(20, 19, 34, 0.5);
`

export const TenureDetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

export const TenureDetailLabel = styled.span`
  min-width: 44px;
  color: rgba(99, 102, 241, 0.9);
  font-weight: 600;
`

export const TenureDetailValue = styled.div`
  color: rgba(20, 19, 34, 0.7);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`

export const TenureTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const TenureTimelineItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.08);
`

export const TenureTimelinePeriod = styled.span`
  font-size: 10px;
  color: rgba(20, 19, 34, 0.5);
  min-width: 72px;
`

export const TenureTimelineTitle = styled.span`
  font-weight: 600;
  color: #141322;
`

export const TenureTimelineMeta = styled.span`
  color: rgba(20, 19, 34, 0.6);
`

export const OtherHeadsOfStateList = styled.div`
  margin: 0 0 6px 0;
  padding: 8px 12px;
  background: rgba(249, 250, 251, 1);
  border-radius: 6px;
  border-left: 3px solid rgba(99, 102, 241, 0.3);
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const OtherHeadOfStateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.08);
  font-size: 11px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.15);
    background: rgba(249, 250, 251, 1);
  }
`

export const OtherHeadAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.12),
    rgba(168, 85, 247, 0.08)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: rgba(99, 102, 241, 0.8);
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const OtherHeadInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  color: #475569;

  strong {
    font-weight: 600;
    color: #141322;
  }

  span {
    color: rgba(20, 19, 34, 0.6);
  }
`

export const TenureGroupAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.15),
    rgba(168, 85, 247, 0.1)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: rgba(99, 102, 241, 1);
  flex-shrink: 0;
  overflow: hidden;
  border: 1.5px solid white;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const TenureGroupDetails = styled.div`
  flex: 1;
  display: none;
`

export const TenureGroupName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #141322;
`

export const TenureGroupMeta = styled.div`
  font-size: 10px;
  color: rgba(20, 19, 34, 0.5);
  display: flex;
  align-items: center;
  gap: 4px;
`

export const TenureGroupBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 4px;
  font-weight: 500;
  color: rgba(99, 102, 241, 0.9);
  font-size: 10px;

  svg {
    width: 10px;
    height: 10px;
  }
`

// 집권 기간 내 사건 스타일
export const CompactListItemInTenure = styled(CompactListItem)`
  position: relative;
  margin-left: ${({ $depth }) => $depth * 24 + 8}px;

  &::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(
      180deg,
      rgba(99, 102, 241, 0.4),
      rgba(168, 85, 247, 0.3)
    );
    border-radius: 2px;
  }

  background: ${({ $active, $depth }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.1))'
      : $depth > 0
        ? 'rgba(248, 250, 252, 0.9)'
        : 'rgba(249, 250, 251, 1)'};

  border-color: ${({ $active }) =>
    $active ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.15)'};

  &:hover {
    background: ${({ $active, $depth }) =>
      $active
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.15))'
        : $depth > 0
          ? 'rgba(240, 244, 255, 1)'
          : 'rgba(245, 247, 255, 1)'};
    border-color: rgba(99, 102, 241, 0.4);
  }
`

export const TenureGroupFooter = styled.div`
  margin: 6px 0 12px 0;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.03);
  border-radius: 4px;
  border-left: 3px solid rgba(99, 102, 241, 0.25);
  font-size: 11px;
  color: rgba(99, 102, 241, 0.7);
  font-weight: 500;
  text-align: center;
`
