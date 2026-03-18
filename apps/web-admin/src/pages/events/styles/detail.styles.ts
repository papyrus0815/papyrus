/**
 * Detail Panel Styled Components
 * 상세 패널 관련 스타일
 */
import styled, { css } from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import { CATEGORY_BADGE_COLORS } from './theme'

export const DetailPanel = styled.aside`
  height: 100%;
  border-radius: 14px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1.5px solid rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  ` : css`
    background: #ffffff;
    border: 1.5px solid rgba(20, 19, 34, 0.08);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  `}

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }

  @media (max-width: 1200px) { display: none; }
`

export const DetailPanelContent = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const DetailHeroImage = styled.div<{ $isEmpty?: boolean }>`
  width: 100%;
  max-width: 400px;
  height: 220px;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 12px;
  margin: 20px auto;
  background-color: ${({ $isEmpty }) => $isEmpty ? 'rgba(99, 102, 241, 0.04)' : 'transparent'};

  ${({ $isEmpty }) => $isEmpty && `
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
    background: ${({ $isEmpty }) => $isEmpty
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
  -webkit-backdrop-filter: blur(8px);
  background: ${({ $category }) => {
    const color = CATEGORY_BADGE_COLORS[$category]
    return `${color}E6`
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
  @media (max-width: 768px) { min-height: 320px; padding: 32px 20px; }
`

export const DetailPanelEmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
  margin-bottom: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08));
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
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-6px) rotate(5deg); }
  }

  @media (max-width: 768px) { width: 64px; height: 64px; margin-bottom: 16px; svg { width: 28px; height: 28px; } }
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
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#1e293b'};
  @media (max-width: 768px) { font-size: 14px; }
`

export const DetailPanelEmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'};
  animation: textPulse 3s ease-in-out infinite;

  @keyframes textPulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  @media (max-width: 768px) { font-size: 12px; }
`

export const DetailPanelHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 24px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.07);
  ` : css`
    border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);
  `}
`

export const DetailTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const DetailDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const DetailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px;
  &:first-of-type { padding-top: 20px; }
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
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
  ` : css`
    background: linear-gradient(180deg, #fafbff, #ffffff);
    border: 1px solid rgba(20, 19, 34, 0.08);
  `}

  svg { color: #6366f1; flex-shrink: 0; margin-top: 2px; width: 16px; height: 16px; }
  div { display: flex; flex-direction: column; gap: 3px; }
  small { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'}; }
  strong { font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'}; }
`

export const DetailText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const DetailFiguresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DetailFigureCard = styled.div`
  border-radius: 10px;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  div { display: flex; flex-direction: column; gap: 2px; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    strong { font-size: 12px; color: #e2e8f0; }
    span { font-size: 11px; color: #64748b; }
    small { font-size: 10px; color: #475569; }
  ` : css`
    background: #fafbff;
    border: 1px solid rgba(20, 19, 34, 0.08);
    strong { font-size: 12px; color: #0f172a; }
    span { font-size: 11px; color: #475569; }
    small { font-size: 10px; color: #64748b; }
  `}
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
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(99, 102, 241, 0.12);
    strong { font-size: 12px; font-weight: 600; color: #e2e8f0; }
    span { font-size: 11px; line-height: 1.4; color: #64748b; }
    &:hover { border-color: rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  ` : css`
    background: #fafbff;
    border: 1px solid rgba(99, 102, 241, 0.12);
    strong { font-size: 12px; font-weight: 600; color: #0f172a; }
    span { font-size: 11px; line-height: 1.4; color: #64748b; }
    &:hover { border-color: rgba(99, 102, 241, 0.25); background: #f0f4ff; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1); }
  `}
`

export const DetailActions = styled.div`
  padding: 12px 16px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-top: 1.5px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
  ` : css`
    border-top: 1.5px solid rgba(99, 102, 241, 0.1);
    background: rgba(248, 250, 252, 0.5);
  `}
`

export const SecondaryActionsRow = styled.div`
  display: flex;
  gap: 8px;
`

export const SecondaryActionButton = styled.button`
  flex: 1;
  border-radius: 8px;
  padding: 8px 12px;
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
  svg { width: 13px; height: 13px; }
  &:active { transform: scale(0.98); }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    &:hover { border-color: rgba(99, 102, 241, 0.35); background: rgba(99, 102, 241, 0.15); color: #a5b4fc; }
  ` : css`
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(99, 102, 241, 0.15);
    &:hover { border-color: rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.05); color: #4f46e5; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.08); }
  `}
`

export const ViewAllHierarchyButton = styled.button`
  border-radius: 10px;
  padding: 10px 14px;
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
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(99, 102, 241, 0.08);
    border: 1.5px solid rgba(99, 102, 241, 0.2);
    &:hover { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.15); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); }
  ` : css`
    background: rgba(99, 102, 241, 0.05);
    border: 1.5px solid rgba(99, 102, 241, 0.25);
    &:hover { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.1); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); }
  `}
`

// Timeline View
export const TimelineContainer = styled.div`
  position: relative;
  padding-left: 32px;

  &::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.25) 50%, rgba(99, 102, 241, 0.2) 100%);
    border-radius: 999px;
  }
`

export const TimelineEventCard = styled.div<{ $depth: number }>`
  position: relative;
  padding: 16px 18px;
  margin-bottom: 20px;
  margin-left: ${({ $depth }) => $depth * 24}px;
  border-radius: 14px;
  transition: all 0.2s ease;
  ${({ theme, $depth }) => theme.mode === 'dark' ? css`
    background: ${$depth === 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.04)'};
    border: 1.5px solid rgba(99, 102, 241, 0.15);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    &:hover { border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
  ` : css`
    background: ${$depth === 0 ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.03))' : '#ffffff'};
    border: 1.5px solid rgba(99, 102, 241, 0.15);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
    &:hover { border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.12); }
  `}

  &::before {
    content: '';
    position: absolute;
    left: -32px;
    top: 24px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $depth }) => $depth === 0 ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent'};
    border: 3px solid ${({ $depth }) => $depth === 0 ? '#6366f1' : 'rgba(99, 102, 241, 0.5)'};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.mode === 'dark' ? 'rgba(15,15,15,0.8)' : 'rgba(255, 255, 255, 1)'};
  }
`

export const TimelineEventDate = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
  margin-bottom: 6px;
`

export const TimelineEventTitle = styled.h4`
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const TimelineEventSummary = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const TimelineImportance = styled.span<{
  $importance: 'critical' | 'major' | 'notable'
}>`
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'major': return 'rgba(251, 191, 36, 0.15)'
      default: return 'rgba(99, 102, 241, 0.1)'
    }
  }};
  color: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return '#dc2626'
      case 'major': return '#d97706'
      default: return '#6366f1'
    }
  }};
`

// Tree View
export const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const TreeNodeWrapper = styled.div<{ $depth: number }>`
  margin-left: ${({ $depth }) => $depth * 32}px;
  position: relative;

  ${({ $depth }) => $depth > 0 && `
    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 20px;
      width: 12px;
      height: 2px;
      background: rgba(99, 102, 241, 0.25);
    }

    &::after {
      content: '';
      position: absolute;
      left: -16px;
      top: 0;
      bottom: 50%;
      width: 2px;
      background: rgba(99, 102, 241, 0.15);
    }
  `}
`

export const TreeNodeCard = styled.div<{
  $depth: number
  $importance: 'critical' | 'major' | 'notable'
}>`
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  border: 2px solid ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.3)'
      case 'major': return 'rgba(251, 191, 36, 0.3)'
      default: return 'rgba(99, 102, 241, 0.2)'
    }
  }};
  ${({ theme, $depth }) => theme.mode === 'dark' ? css`
    background: ${$depth === 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.04)'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    &:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.3); transform: translateX(4px); }
  ` : css`
    background: ${$depth === 0 ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05))' : '#ffffff'};
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
    &:hover { box-shadow: 0 6px 16px rgba(99, 102, 241, 0.12); transform: translateX(4px); }
  `}
`

export const TreeNodeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

export const TreeNodeTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  flex: 1;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const TreeImportanceBadge = styled.span<{
  $importance: 'critical' | 'major' | 'notable'
}>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'major': return 'rgba(251, 191, 36, 0.15)'
      default: return 'rgba(99, 102, 241, 0.1)'
    }
  }};
  color: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return '#dc2626'
      case 'major': return '#d97706'
      default: return '#6366f1'
    }
  }};
`

export const TreeNodeDate = styled.div`
  font-size: 12px;
  color: #6366f1;
  font-weight: 600;
  margin-bottom: 6px;
`

export const TreeNodeSummary = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const TreeNodeChildren = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
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
