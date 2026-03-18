/**
 * Modal Styled Components
 * 모달 관련 스타일
 */
import styled, { css } from 'styled-components'

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
`

export const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 24px;
  z-index: 1001;
  width: 90%;
  max-width: 480px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(20, 20, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  ` : css`
    background: #ffffff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  `}
`

export const ModalHeader = styled.div`
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  ` : css`
    border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  `}
`

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const ModalClose = styled.button`
  border: none;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};

  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(99, 102, 241, 0.08)'};
    color: ${({ theme }) => theme.mode === 'dark' ? '#a5b4fc' : '#6366f1'};
  }
`

export const ModalContent = styled.div`
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 3px; }
`

export const ModalOption = styled.button<{ $active: boolean }>`
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  div { display: flex; flex-direction: column; gap: 4px; }
  ${({ theme, $active }) => theme.mode === 'dark' ? css`
    background: ${$active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.04)'};
    border: 1.5px solid ${$active ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.08)'};
    strong { font-size: 14px; font-weight: 600; color: ${$active ? '#a5b4fc' : '#e2e8f0'}; }
    span { font-size: 12px; color: #64748b; }
    &:hover {
      border-color: rgba(99, 102, 241, 0.3);
      background: ${$active ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255,255,255,0.07)'};
    }
  ` : css`
    background: ${$active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08))' : '#ffffff'};
    border: 1.5px solid ${$active ? 'rgba(99, 102, 241, 0.4)' : 'rgba(20, 19, 34, 0.08)'};
    strong { font-size: 14px; font-weight: 600; color: #0f172a; }
    span { font-size: 12px; color: #6b7280; }
    &:hover {
      border-color: rgba(99, 102, 241, 0.25);
      background: ${$active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.1))' : '#f8fafc'};
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }
  `}
`

export const ModalOptionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 20px; height: 20px; }
`

export const SummaryModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 24px;
  z-index: 1001;
  width: 90%;
  max-width: 1000px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(15, 15, 20, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  ` : css`
    background: #ffffff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  `}
`

export const SummarySubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#64748b'};
`

export const SummaryTabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
  ` : css`
    border-bottom: 1px solid rgba(99, 102, 241, 0.1);
    background: #fafbff;
  `}
`

export const SummaryTab = styled.button<{ $active: boolean }>`
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  ${({ theme, $active }) => theme.mode === 'dark' ? css`
    background: ${$active ? 'rgba(99, 102, 241, 0.15)' : 'transparent'};
    border: 1.5px solid ${$active ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.07)'};
    color: ${$active ? '#a5b4fc' : '#64748b'};
    &:hover { border-color: rgba(99, 102, 241, 0.3); background: ${$active ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255,255,255,0.05)'}; }
  ` : css`
    background: ${$active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))' : '#ffffff'};
    border: 1.5px solid ${$active ? 'rgba(99, 102, 241, 0.4)' : 'rgba(20, 19, 34, 0.08)'};
    color: ${$active ? '#4f46e5' : '#64748b'};
    &:hover { border-color: rgba(99, 102, 241, 0.3); background: ${$active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))' : '#f8fafc'}; }
  `}
`

export const SummaryContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(99, 102, 241, 0.04); }
  &::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
`

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
    background: ${$depth === 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.04)'};
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
    box-shadow: 0 0 0 4px ${({ theme }) => theme.mode === 'dark' ? 'rgba(15,15,20,0.9)' : 'rgba(255, 255, 255, 1)'};
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
    background: ${$depth === 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.04)'};
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

export const ViewAllHierarchyButton = styled.button`
  border-radius: 10px;
  padding: 12px 16px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    &:hover { background: rgba(99, 102, 241, 0.15); border-color: rgba(99, 102, 241, 0.35); transform: translateY(-1px); }
  ` : css`
    background: rgba(99, 102, 241, 0.05);
    border: 1px solid rgba(99, 102, 241, 0.2);
    &:hover { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.35); transform: translateY(-1px); }
  `}
  &:active { transform: translateY(0); }
`
