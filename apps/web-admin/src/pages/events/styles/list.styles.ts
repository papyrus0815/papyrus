/**
 * List Styled Components
 * 이벤트 리스트 관련 스타일
 */
import styled, { css } from 'styled-components'

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
  padding: 4px 12px 120px 70px;
  position: relative;

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

export type ListItemImportance = 'critical' | 'major' | 'normal'

export const CompactListItem = styled.div<{
  $active: boolean
  $depth: number
  $importance?: ListItemImportance
}>`
  border-radius: 14px;
  padding: 0;
  margin-left: ${({ $depth }) => $depth * 24}px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  animation: fadeIn 0.3s ease-out;

  /* importance에 따라 카드 최소 높이 차등 — 한눈 스캔 시 위계 인지 */
  min-height: ${({ $importance }) =>
    $importance === 'critical'
      ? '84px'
      : $importance === 'major'
        ? '68px'
        : '52px'};

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 좌측 importance 강조 보더 — active > critical > major 순 우선 */
  border-left: ${({ $active, $importance }) =>
    $active
      ? '4px solid #6366f1'
      : $importance === 'critical'
        ? '4px solid #6366f1'
        : $importance === 'major'
          ? '3px solid rgba(245, 158, 11, 0.7)'
          : '1.5px solid transparent'};

  /* 타임라인 연결선 */
  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => -41 - $depth * 24}px;
    top: 50%;
    width: ${({ $depth }) => 38 + $depth * 24}px;
    height: 2px;
    background: rgba(99, 102, 241, 0.25);
    transition: all 0.2s ease;
  }

  &:hover::before {
    width: ${({ $depth }) => 40 + $depth * 24}px;
  }

  ${({ theme, $active, $depth }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))'
            : $depth > 0
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(255, 255, 255, 0.04)'};
          border: 1.5px solid
            ${$active
              ? 'rgba(99, 102, 241, 0.4)'
              : $depth > 0
                ? 'rgba(99, 102, 241, 0.1)'
                : 'rgba(255, 255, 255, 0.07)'};
          border-left: ${$active
            ? '4px solid #6366f1'
            : `1.5px solid ${$depth > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.07)'}`};
          box-shadow: ${$active
            ? '0 2px 8px rgba(99, 102, 241, 0.15)'
            : 'none'};
          &:hover {
            border-color: rgba(99, 102, 241, 0.3);
            transform: translateX(2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          &::after {
            content: '';
            position: absolute;
            left: ${-41 - $depth * 24}px;
            top: 50%;
            transform: translateY(-50%);
            width: ${$active ? '10px' : '8px'};
            height: ${$active ? '10px' : '8px'};
            background: ${$active ? '#6366f1' : 'rgba(30, 30, 40, 0.9)'};
            border: 2px solid ${$active ? '#6366f1' : 'rgba(99, 102, 241, 0.4)'};
            border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(15, 15, 15, 0.8);
            transition: all 0.2s ease;
            z-index: 1;
          }
          &:hover::after {
            background: #6366f1;
            transform: translateY(-50%) scale(1.15);
          }
        `
      : css`
          background: ${$active
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.06))'
            : $depth > 0
              ? 'rgba(248, 250, 252, 0.8)'
              : '#ffffff'};
          border: 1.5px solid
            ${$active
              ? 'rgba(99, 102, 241, 0.4)'
              : $depth > 0
                ? 'rgba(99, 102, 241, 0.08)'
                : 'rgba(20, 19, 34, 0.08)'};
          border-left: ${$active
            ? '4px solid #6366f1'
            : `1.5px solid ${$depth > 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(20, 19, 34, 0.08)'}`};
          box-shadow: ${$active
            ? '0 2px 8px rgba(99, 102, 241, 0.12)'
            : '0 1px 3px rgba(0, 0, 0, 0.04)'};
          &:hover {
            border-color: rgba(99, 102, 241, 0.3);
            transform: translateX(2px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
          }
          &::after {
            content: '';
            position: absolute;
            left: ${-41 - $depth * 24}px;
            top: 50%;
            transform: translateY(-50%);
            width: ${$active ? '10px' : '8px'};
            height: ${$active ? '10px' : '8px'};
            background: ${$active ? '#6366f1' : '#ffffff'};
            border: 2px solid ${$active ? '#6366f1' : 'rgba(99, 102, 241, 0.4)'};
            border-radius: 50%;
            box-shadow: 0 0 0 2px #ffffff;
            transition: all 0.2s ease;
            z-index: 1;
          }
          &:hover::after {
            background: #6366f1;
            transform: translateY(-50%) scale(1.15);
          }
        `}

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
    return `${color}E6`
  }};
`

export const CompactListContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
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
  border-radius: 6px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 1px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          &:hover {
            background: rgba(99, 102, 241, 0.22);
            border-color: rgba(99, 102, 241, 0.4);
            transform: scale(1.1);
          }
        `
      : css`
          background: #fff;
          border: 1px solid rgba(99, 102, 241, 0.2);
          &:hover {
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.35);
            transform: scale(1.1);
          }
        `}
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
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};

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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};

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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#64748b')};
`

export const TimelineDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;

  &::before {
    content: '━━━';
    color: ${({ theme }) => (theme.mode === 'dark' ? '#334155' : '#cbd5e1')};
    letter-spacing: -2px;
  }
`

export const TimelineDuration = styled.div`
  font-size: 10px;
  text-align: center;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'};
`

export const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  border-top-color: ${({ theme }) =>
    theme.mode === 'dark' ? '#6366f1' : '#94a3b8'};
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
  gap: 0;
  margin: 32px 0 24px -70px;
  padding: 0;
  background: transparent;
  border: none;
  width: calc(100% + 70px);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 32px;
    transform: translateX(-50%);
    width: 14px;
    height: 14px;
    background: #6366f1;
    border: 3px solid
      ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
    z-index: 2;
    transition: all 0.2s ease;
  }

  &:hover::before {
    transform: translateX(-50%) scale(1.1);
  }

  span {
    margin-left: 60px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 8px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            color: #94a3b8;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: none;
          `
        : css`
            color: #475569;
            background: #ffffff;
            border: 1px solid rgba(203, 213, 225, 0.5);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          `}

    svg {
      transition: transform 0.2s ease;
      color: #6366f1;
      font-size: 10px;
      flex-shrink: 0;
    }
  }

  &:hover span {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
`

export const CollapsedCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  border-radius: 6px;
  margin-left: 2px;
  flex-shrink: 0;
`

export const DateDivider = styled.button`
  display: flex;
  align-items: center;
  margin: 16px 0 8px -70px;
  padding: 0;
  background: transparent;
  border: none;
  width: calc(100% + 70px);
  cursor: pointer;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 32px;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: rgba(99, 102, 241, 0.4);
    border-radius: 50%;
    z-index: 1;
  }

  span {
    margin-left: 52px;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 10px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            color: #64748b;
            border: 1px solid rgba(255, 255, 255, 0.07);
          `
        : css`
            color: #64748b;
            border: 1px solid rgba(203, 213, 225, 0.4);
          `}

    svg {
      transition: transform 0.2s ease;
      color: #94a3b8;
    }
  }

  &:hover span {
    border-color: rgba(99, 102, 241, 0.25);
  }
`

export const SimpleYearLabel = styled.div`
  margin: 12px 0 8px 0;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#94a3b8')};
`

export const CollapsedPlaceholder = styled.div`
  margin: 0 0 16px 0;
  padding: 16px 20px;
  border-radius: 12px;
  text-align: center;
  position: relative;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.03);
          border: 1px dashed rgba(99, 102, 241, 0.15);
        `
      : css`
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.03) 0%,
            rgba(168, 85, 247, 0.02) 100%
          );
          border: 1px dashed rgba(99, 102, 241, 0.2);
        `}

  &::before {
    content: '';
    position: absolute;
    left: -38px;
    top: 50%;
    width: 38px;
    height: 1px;
    border-top: 1px dashed rgba(99, 102, 241, 0.2);
  }

  &::after {
    content: '';
    position: absolute;
    left: -38px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    background: rgba(99, 102, 241, 0.2);
    border: 2px solid rgba(99, 102, 241, 0.3);
    border-radius: 50%;
    box-shadow: 0 0 0 2px
      ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};
  }

  span {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#94a3b8')};
  }
`

export const CompactListSummary = styled.p<{ $depth: number }>`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#475569')};

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
  padding: 80px 40px;
  position: relative;
  margin-left: 40px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      to bottom,
      ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#e2e8f0'}
        0%,
      ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.25)' : '#cbd5e1'}
        50%,
      ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#e2e8f0'}
        100%
    );
  }

  &::after {
    content: '';
    position: absolute;
    left: -7px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
    border: 2px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#cbd5e1'};
    box-shadow: 0 0 0 4px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.08)'
          : 'rgba(226, 232, 240, 0.3)'};
  }

  @media (max-width: 768px) {
    padding: 60px 30px;
    min-height: 360px;
  }
  @media (max-width: 480px) {
    padding: 50px 24px;
    min-height: 320px;
  }
`

export const EmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          svg {
            color: #64748b;
          }
        `
      : css`
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          svg {
            color: #94a3b8;
          }
        `}

  @media (max-width: 768px) {
    width: 52px;
    height: 52px;
    margin-bottom: 14px;
    svg {
      width: 24px;
      height: 24px;
    }
  }
  @media (max-width: 480px) {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    svg {
      width: 22px;
      height: 22px;
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
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};

  @media (max-width: 768px) {
    font-size: 14px;
  }
  @media (max-width: 480px) {
    font-size: 14px;
  }
`

export const EmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#94a3b8')};

  @media (max-width: 768px) {
    font-size: 12px;
  }
  @media (max-width: 480px) {
    font-size: 12px;
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
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
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
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #64748b;
          &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.14);
          }
        `
      : css`
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          &:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }
        `}

  @media (max-width: 480px) {
    padding: 9px 18px;
    font-size: 13px;
  }
`

export const EmptyCreateButton = styled.button`
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  svg {
    width: 14px;
    height: 14px;
  }
  &:active {
    transform: translateY(0);
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(99, 102, 241, 0.25);
          background: rgba(99, 102, 241, 0.1);
          color: #a5b4fc;
          &:hover {
            background: rgba(99, 102, 241, 0.18);
          }
        `
      : css`
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          &:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }
        `}

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

export const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  max-height: calc(100vh - var(--header-height) - 60px);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 32px;
    top: 64px;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      180deg,
      rgba(99, 102, 241, 0.3) 0%,
      rgba(99, 102, 241, 0.1) 50%,
      rgba(99, 102, 241, 0.3) 100%
    );
    border-radius: 1px;
    z-index: 0;
    pointer-events: none;
  }
`

export const ResultControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  transition: all 0.2s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          &:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
        `
      : css`
          background: #ffffff;
          border: 1.5px solid rgba(20, 19, 34, 0.08);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          &:hover {
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12);
          }
        `}
`

export const ToolbarMeta = styled.div`
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};

  span {
    color: #6366f1;
  }
`

export const ToolbarToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.15);
        `
      : css`
          background: rgba(99, 102, 241, 0.04);
          border: 1px solid rgba(99, 102, 241, 0.12);
        `}
`

export const ToolbarToggleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ToolbarToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
`

export const ToolbarToggleDescription = styled.span`
  font-size: 10px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const SortSelect = styled.select`
  border-radius: 10px;
  padding: 9px 32px 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url('data:image/svg+xml,%3Csvg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M1 1L6 6L11 1" stroke="%236366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E');
  background-repeat: no-repeat;
  background-position: calc(100% - 10px) 50%;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background-color: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(99, 102, 241, 0.2);
          color: #e2e8f0;
          option {
            background: #1e1e2e;
            color: #e2e8f0;
          }
          &:hover {
            border-color: rgba(99, 102, 241, 0.35);
          }
          &:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          }
        `
      : css`
          background-color: #ffffff;
          border: 1.5px solid rgba(99, 102, 241, 0.2);
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(99, 102, 241, 0.04);
          &:hover {
            border-color: rgba(99, 102, 241, 0.35);
            box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
          }
          &:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          }
        `}
`

export const SortDirectionToggle = styled.button`
  border-radius: 10px;
  padding: 9px 11px;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  svg {
    transition: transform 0.2s ease;
  }
  &:active {
    transform: scale(0.95);
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(99, 102, 241, 0.2);
          &:hover {
            border-color: rgba(99, 102, 241, 0.35);
            background: rgba(99, 102, 241, 0.1);
            svg {
              transform: scale(1.1);
            }
          }
        `
      : css`
          background: #ffffff;
          border: 1.5px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 1px 2px rgba(99, 102, 241, 0.04);
          &:hover {
            border-color: rgba(99, 102, 241, 0.35);
            background: rgba(99, 102, 241, 0.05);
            svg {
              transform: scale(1.1);
            }
          }
        `}
`

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
  border-radius: 6px;
  transition: all 0.2s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(99, 102, 241, 0.1);
          &:hover {
            border-color: rgba(99, 102, 241, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `
      : css`
          background: white;
          border: 1px solid rgba(99, 102, 241, 0.08);
          &:hover {
            border-color: rgba(99, 102, 241, 0.2);
            box-shadow: 0 2px 4px rgba(99, 102, 241, 0.08);
          }
        `}
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
  margin-bottom: 2px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const HeadOfStateDetails = styled.div`
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(20, 19, 34, 0.6)'};
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
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(20, 19, 34, 0.7)'};
`

export const HeadOfStateTenure = styled.span`
  font-size: 9px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const TenureStartYearRow = styled.div`
  margin: 4px 0 8px 12px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(99, 102, 241, 0.75);
  background: rgba(99, 102, 241, 0.06);
  border-radius: 6px;
  border-left: 2px solid rgba(99, 102, 241, 0.25);
`

export const TenureEndYearRow = styled.div`
  margin: 4px 0 8px 12px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(99, 102, 241, 0.75);
  background: rgba(99, 102, 241, 0.06);
  border-radius: 6px;
  border-left: 2px solid rgba(99, 102, 241, 0.25);
`

export const TenureGroupHeader = styled.div<{
  $depth: number
  $clickable?: boolean
}>`
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
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    width: 100%;
    text-align: left;
    border: none;
    border-left: 3px solid rgba(99, 102, 241, 0.5);
    transition: background 0.2s ease;
    &:hover { background: rgba(99, 102, 241, 0.08); }
  `}
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
  font-weight: 600;
  flex: 1;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
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
  border-radius: 6px;
  border-left: 3px solid rgba(99, 102, 241, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
        `
      : css`
          background: rgba(249, 250, 251, 0.9);
        `}
`

export const TenureDetailsHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TenureSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureSectionDescription = styled.div`
  font-size: 10px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(20, 19, 34, 0.7)'};
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
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(99, 102, 241, 0.1);
        `
      : css`
          background: #fff;
          border: 1px solid rgba(99, 102, 241, 0.08);
        `}
`

export const TenureTimelinePeriod = styled.span`
  font-size: 10px;
  min-width: 72px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
`

export const TenureTimelineTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureTimelineMeta = styled.span`
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(20, 19, 34, 0.6)'};
`

export const HeadsOfStateYearGroup = styled.div`
  margin: 10px 0 12px 0;
  padding: 0;
  width: 100%;
  display: block;
`

export const HeadsOfStateYearGroupLabel = styled.div`
  margin: 0 0 8px 0;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: rgba(99, 102, 241, 0.85);
  width: 100%;
  display: block;
`

export const HeadsOfStateYearGroupToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 4px 0;
  padding: 6px 10px;
  width: 100%;
  border: none;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.06);
  border-left: 3px solid rgba(99, 102, 241, 0.35);
  font-size: 11px;
  font-weight: 600;
  color: rgba(99, 102, 241, 0.85);
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  &:hover {
    background: rgba(99, 102, 241, 0.1);
  }
`

export const OtherHeadsOfStateList = styled.div`
  margin: 0 0 6px 0;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid rgba(99, 102, 241, 0.3);
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
        `
      : css`
          background: rgba(249, 250, 251, 1);
        `}
`

export const OtherHeadOfStateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  transition: all 0.2s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(99, 102, 241, 0.08);
          &:hover {
            border-color: rgba(99, 102, 241, 0.15);
            background: rgba(255, 255, 255, 0.06);
          }
        `
      : css`
          background: white;
          border: 1px solid rgba(99, 102, 241, 0.08);
          &:hover {
            border-color: rgba(99, 102, 241, 0.15);
            background: rgba(249, 250, 251, 1);
          }
        `}
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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#64748b' : '#475569')};
  strong {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
  }
  span {
    color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.4)'
        : 'rgba(20, 19, 34, 0.6)'};
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
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'white'};
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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#141322')};
`

export const TenureGroupMeta = styled.div`
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(20, 19, 34, 0.5)'};
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

export const CompactListItemInTenure = styled(CompactListItem)`
  position: relative;
  margin-left: ${({ $depth }) => $depth * 24 + 8}px;

  background: ${({ $active, $depth }) =>
    $active
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.1))'
      : $depth > 0
        ? 'rgba(248, 250, 252, 0.9)'
        : 'rgba(249, 250, 251, 1)'};

  border-color: ${({ $active }) =>
    $active ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.15)'};

  border-left: 4px solid
    ${({ $active }) =>
      $active
        ? '#6366f1'
        : 'linear-gradient(180deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.3))'};

  &::before {
    left: ${({ $depth }) => -49 - $depth * 24}px;
    width: ${({ $depth }) => 46 + $depth * 24}px;
  }

  &::after {
    left: ${({ $depth }) => -49 - $depth * 24}px;
  }

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
