/**
 * EventCreatePage 스타일 컴포넌트
 */
import styled, { keyframes } from 'styled-components'

import type { HistoricalEventCategory } from './events.types'
import type { MentionEntityType } from './mention-system'
import { MENTION_TYPE_CONFIG } from './mention-system'

// ============================================
// 폼 필드 max-width 설정 (여기서 한 번에 변경 가능)
// ============================================
export const FORM_FIELD_MAX_WIDTH = '1200px'

// ============================================
// 메인 색상 변수 (여기서 한 번에 변경 가능)
// ============================================
export const COLORS = {
  // 메인 보라색 계열
  primary: {
    main: '#8b5cf6', // 메인 보라색
    light: '#a78bfa', // 밝은 보라색
    dark: '#7c3aed', // 어두운 보라색
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    gradientFull:
      'linear-gradient(135deg, #1e293b 0%, #4f46e5 50%, #7c3aed 100%)',
  },
  // 배경색
  background: {
    page: '#f5f7fa', // 페이지 배경 (회색)
    content: '#ffffff', // 콘텐츠 배경 (흰색)
    section: '#fafbfc', // 섹션 배경 (연한 회색)
    hover: '#f8fafc', // 호버 배경
    input: '#f8fafc', // 입력 필드 배경
  },
  // 테두리
  border: {
    default: '#e2e8f0', // 기본 테두리
    hover: '#cbd5e1', // 호버 테두리
    focus: '#8b5cf6', // 포커스 테두리
    light: '#f1f5f9', // 연한 테두리
  },
  // 텍스트
  text: {
    primary: '#1e293b', // 주요 텍스트
    secondary: '#64748b', // 보조 텍스트
    muted: '#94a3b8', // 흐린 텍스트
    inverse: '#ffffff', // 반전 텍스트
  },
  // 상태 색상
  state: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
} as const

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`

export const getCategoryColor = (category: HistoricalEventCategory | '') => {
  const colors = {
    military: {
      border: 'rgba(239, 68, 68, 0.4)',
      background: 'rgba(239, 68, 68, 0.08)',
      iconBackground: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#b91c1c',
      shadow: 'rgba(248, 113, 113, 0.18)',
    },
    political: {
      border: 'rgba(99, 102, 241, 0.4)',
      background: 'rgba(99, 102, 241, 0.08)',
      iconBackground: 'rgba(99, 102, 241, 0.18)',
      iconColor: '#4c1d95',
      shadow: 'rgba(129, 140, 248, 0.2)',
    },
    economic: {
      border: 'rgba(245, 158, 11, 0.4)',
      background: 'rgba(245, 158, 11, 0.08)',
      iconBackground: 'rgba(245, 158, 11, 0.2)',
      iconColor: '#b45309',
      shadow: 'rgba(251, 191, 36, 0.2)',
    },
    social: {
      border: 'rgba(6, 182, 212, 0.4)',
      background: 'rgba(6, 182, 212, 0.08)',
      iconBackground: 'rgba(6, 182, 212, 0.18)',
      iconColor: '#0f766e',
      shadow: 'rgba(34, 211, 238, 0.2)',
    },
    technological: {
      border: 'rgba(14, 165, 233, 0.4)',
      background: 'rgba(14, 165, 233, 0.08)',
      iconBackground: 'rgba(14, 165, 233, 0.2)',
      iconColor: '#0369a1',
      shadow: 'rgba(14, 165, 233, 0.2)',
    },
    cultural: {
      border: 'rgba(236, 72, 153, 0.4)',
      background: 'rgba(236, 72, 153, 0.08)',
      iconBackground: 'rgba(236, 72, 153, 0.2)',
      iconColor: '#be185d',
      shadow: 'rgba(244, 114, 182, 0.2)',
    },
    diplomatic: {
      border: 'rgba(139, 92, 246, 0.4)',
      background: 'rgba(139, 92, 246, 0.08)',
      iconBackground: 'rgba(139, 92, 246, 0.2)',
      iconColor: '#6b21a8',
      shadow: 'rgba(167, 139, 250, 0.2)',
    },
    conference: {
      border: 'rgba(99, 102, 241, 0.4)',
      background: 'rgba(99, 102, 241, 0.08)',
      iconBackground: 'rgba(99, 102, 241, 0.2)',
      iconColor: '#4338ca',
      shadow: 'rgba(129, 140, 248, 0.2)',
    },
    religious: {
      border: 'rgba(251, 146, 60, 0.4)',
      background: 'rgba(251, 146, 60, 0.08)',
      iconBackground: 'rgba(251, 146, 60, 0.2)',
      iconColor: '#c2410c',
      shadow: 'rgba(253, 186, 116, 0.2)',
    },
    other: {
      border: 'rgba(107, 114, 128, 0.4)',
      background: 'rgba(107, 114, 128, 0.08)',
      iconBackground: 'rgba(107, 114, 128, 0.2)',
      iconColor: '#374151',
      shadow: 'rgba(156, 163, 175, 0.2)',
    },
  }

  if (!category || !colors[category as HistoricalEventCategory]) {
    return colors.other
  }

  return colors[category as HistoricalEventCategory]
}

export const PageWrapper = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding: 32px;
  overflow-y: auto;
  background: transparent;
`

export const PageHeader = styled.div`
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    #f8fafc 20%,
    #eef2ff 50%,
    #e0e7ff 80%,
    #ddd6fe 100%
  );
  padding: 32px 40px;
  margin: -24px -24px 24px;
  border-radius: 0 0 24px 24px;
  box-shadow:
    0 4px 6px -1px rgba(99, 102, 241, 0.1),
    0 2px 4px -2px rgba(99, 102, 241, 0.06),
    inset 0 -1px 0 0 rgba(255, 255, 255, 0.5);
  position: relative;
  overflow: hidden;
  border-bottom: 2px solid rgba(99, 102, 241, 0.08);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 200%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: ${shimmer} 3s infinite;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -5%;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(99, 102, 241, 0.15) 0%,
      rgba(139, 92, 246, 0.08) 40%,
      transparent 70%
    );
    border-radius: 50%;
    animation: ${float} 6s ease-in-out infinite;
    filter: blur(40px);
  }

  @media (max-width: 768px) {
    padding: 24px 20px;
    margin: -16px -16px 20px;
    border-radius: 0 0 20px 20px;
  }
`

export const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 2;

  &::before {
    content: '';
    position: absolute;
    bottom: -60%;
    left: 10%;
    width: 300px;
    height: 300px;
    background: radial-gradient(
      circle,
      rgba(168, 85, 247, 0.12) 0%,
      rgba(99, 102, 241, 0.05) 40%,
      transparent 70%
    );
    border-radius: 50%;
    filter: blur(60px);
    animation: ${float} 8s ease-in-out infinite;
    animation-delay: 1s;
    z-index: -1;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`

export const BackButton = styled.button`
  border: 1.5px solid ${COLORS.border.default};
  background: ${COLORS.background.content};
  color: ${COLORS.text.secondary};
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;

  svg {
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  &:hover {
    background: ${COLORS.background.hover};
    border-color: ${COLORS.border.hover};
    color: ${COLORS.text.primary};

    svg {
      transform: translateX(-3px);
    }
  }

  &:active {
    transform: scale(0.98);
  }
`

export const HeaderTitle = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const HeaderTitleText = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  background: ${COLORS.primary.gradientFull};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  line-height: 1.2;
  position: relative;

  &::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    background: none;
    -webkit-text-fill-color: rgba(99, 102, 241, 0.1);
    transform: translate(2px, 2px);
  }

  @media (max-width: 768px) {
    font-size: 24px;
  }
`

export const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${COLORS.text.secondary};
  font-weight: 500;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '✨';
    font-size: 16px;
  }

  @media (max-width: 768px) {
    font-size: 13px;
  }
`

export const LoadingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 600;
  box-shadow:
    0 2px 8px rgba(99, 102, 241, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: ${pulse} 2s ease-in-out infinite;

  span {
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    padding: 8px 14px;
    font-size: 13px;
  }
`

export const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
`

export const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 220px 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

export const StepNavigation = styled.nav`
  background: ${COLORS.background.content};
  border: 1.5px solid ${COLORS.border.default};
  border-radius: 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: sticky;
  top: 0;

  @media (max-width: 768px) {
    height: auto;
    position: static;
  }
`

export const StepNavigationHeader = styled.div`
  padding: 20px;
  background: ${COLORS.background.section};
  border-bottom: 1.5px solid ${COLORS.border.default};
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const StepNavigationTitle = styled.h2`
  margin: 12px 0 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  letter-spacing: -0.01em;
`

export const StepNavigationActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1.5px solid #e2e8f0;
  background: #fafbfc;
  border-radius: 0 0 16px 16px;
`

export const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px;
  flex: 1;
  overflow-y: auto;
`

export const StepItem = styled.button<{
  $active: boolean
  $completed: boolean
}>`
  border: none;
  border-radius: 10px;
  padding: 14px 16px;
  background: ${({ $active, $completed }) =>
    $active ? '#f8f9fa' : $completed ? '#f0fdf4' : 'transparent'};
  color: ${({ $active }) => ($active ? '#0f172a' : COLORS.text.primary)};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  margin-bottom: 2px;
  border-left: ${({ $active }) =>
    $active ? '3px solid #8b5cf6' : '3px solid transparent'};
  padding-left: ${({ $active }) => ($active ? '13px' : '16px')};
  box-shadow: ${({ $active }) =>
    $active ? '0 2px 8px rgba(139, 92, 246, 0.1)' : 'none'};

  &:hover {
    background: ${({ $active }) =>
      $active ? '#f1f3f5' : 'rgba(139, 92, 246, 0.04)'};
  }

  &:active {
    transform: scale(0.98);
  }
`

export const StepNumber = styled.div<{
  $active?: boolean
}>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: ${({ $active }) =>
    $active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${({ $active }) =>
    $active ? COLORS.text.inverse : COLORS.primary.main};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
`

export const StepIconWrapper = styled.div<{
  $active: boolean
  $completed: boolean
}>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $active, $completed }) =>
    $active ? '#8b5cf6' : $completed ? '#22c55e' : 'rgba(139, 92, 246, 0.1)'};
  color: ${({ $active, $completed }) =>
    $active || $completed ? '#ffffff' : COLORS.primary.main};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: ${({ $active }) =>
    $active ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none'};
`

export const StepLabel = styled.div<{
  $active?: boolean
}>`
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? '700' : '600')};
  color: ${({ $active }) => ($active ? '#0f172a' : COLORS.text.primary)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`

export const StepConnector = styled.div`
  position: absolute;
  right: -2px;
  top: 50%;
  width: 4px;
  height: 2px;
  background: ${COLORS.border.default};
  transform: translateY(-50%);
`

export const FormArea = styled.div`
  background: ${COLORS.background.content};
  border: 1.5px solid ${COLORS.border.default};
  border-radius: 16px;
  padding: 0;
  min-height: 500px;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    border-radius: 16px;
  }
`

export const FormAreaHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1.5px solid ${COLORS.border.default};
  background: ${COLORS.background.section};
  border-radius: 16px 16px 0 0;
`

export const FormAreaTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  letter-spacing: -0.02em;
`

export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  flex: 1;
  overflow: visible;
  width: 100%;
`

export const SectionHeader = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 24px;
  margin-bottom: 32px;
  border-bottom: 2px solid ${COLORS.border.light};

  svg {
    color: ${COLORS.primary.main};
    margin-top: 4px;
    flex-shrink: 0;
  }

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: ${COLORS.text.primary};
    letter-spacing: -0.02em;
  }

  p {
    margin: 6px 0 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
  }
`

// Notion 스타일 레이아웃: Label/Field 좌우 분리
export const FormRow = styled.div<{ $noBorder?: boolean; $compact?: boolean }>`
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  align-items: start;
  padding: ${(props) => (props.$compact ? '0' : '20px 0')};
  margin-top: ${(props) => (props.$compact ? '0' : '0')};
  border-bottom: ${(props) => (props.$noBorder ? 'none' : '1px solid #f1f5f9')};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 160px 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: ${(props) => (props.$compact ? '0' : '16px 0')};
  }
`

export const FormLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;

  @media (max-width: 768px) {
    padding-top: 0;
  }
`

export const PeriodBadge = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1),
    rgba(139, 92, 246, 0.08)
  );
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 6px;
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  span {
    color: #94a3b8;
    font-size: 10px;
  }
`

export const OptionalBadge = styled.span`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 4px;
`

export const RequiredBadge = styled.span`
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
`

export const DateRangeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

export const DateRangeColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const DateRangeLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
`

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

// 레거시 호환용
export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

export const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 4px;
`

export const Required = styled.span`
  color: #ef4444;
  font-size: 14px;
`

// 모던 스타일 Input (보라색 계열)
export const Input = styled.input`
  border: 1.5px solid ${COLORS.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: ${COLORS.text.primary};
  background: ${COLORS.background.input};
  transition: all 0.2s ease;

  &::placeholder {
    color: ${COLORS.text.muted};
  }

  &:hover {
    border-color: ${COLORS.border.hover};
    background: ${COLORS.border.light};
  }

  &:focus {
    outline: none;
    border-color: ${COLORS.border.focus};
    background: ${COLORS.background.content};
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  }
`

export const Textarea = styled.textarea`
  border: 1.5px solid ${COLORS.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: ${COLORS.text.primary};
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  background: ${COLORS.background.input};
  transition: all 0.2s ease;

  &::placeholder {
    color: ${COLORS.text.muted};
  }

  &:hover {
    border-color: ${COLORS.border.hover};
    background: ${COLORS.border.light};
  }

  &:focus {
    outline: none;
    border-color: ${COLORS.border.focus};
    background: ${COLORS.background.content};
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  }
`

export const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  max-width: 1000px;
`

// 확장 가능한 카테고리 카드
export const ExpandableCategoryCard = styled.div<{
  $selected: boolean
  $category: HistoricalEventCategory | ''
  $expanded: boolean
}>`
  position: relative;
  border: 2px solid
    ${({ $selected, $category }) =>
      $selected ? getCategoryColor($category).border : '#e2e8f0'};
  border-radius: 16px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${({ $selected }) =>
    $selected
      ? '0 4px 16px rgba(139, 92, 246, 0.15)'
      : '0 2px 6px rgba(0, 0, 0, 0.04)'};

  /* 확장 시 전체 너비 차지 */
  grid-column: ${({ $expanded }) => ($expanded ? '1 / -1' : 'auto')};

  &:hover {
    border-color: ${({ $category }) => getCategoryColor($category).border};
    background: #ffffff;
    transform: ${({ $expanded }) => ($expanded ? 'none' : 'translateY(-3px)')};
    box-shadow: 0 6px 20px
      ${({ $category }) => getCategoryColor($category).shadow};
  }

  &:active {
    transform: ${({ $expanded }) => ($expanded ? 'none' : 'translateY(-1px)')};
  }
`

export const CategoryCardHeader = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
`

export const CategoryExpandedContent = styled.div`
  padding: 0 20px 20px 20px;
  border-top: 1.5px dashed rgba(239, 68, 68, 0.2);
  margin-top: -10px;
  animation: expandDown 0.3s ease-out;

  @keyframes expandDown {
    from {
      opacity: 0;
      max-height: 0;
      padding-bottom: 0;
    }
    to {
      opacity: 1;
      max-height: 500px;
      padding-bottom: 20px;
    }
  }
`

export const ExpandedLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  margin-top: 16px;

  span:first-child {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
  }
`

export const MiniConflictTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`

export const MiniCombatTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`

export const MiniTypeButton = styled.button<{ $selected: boolean }>`
  padding: 12px 8px;
  border: 1.5px solid ${({ $selected }) => ($selected ? '#ef4444' : '#e2e8f0')};
  border-radius: 10px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(239, 68, 68, 0.08)' : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  font-weight: 600;
  color: #475569;

  &:hover {
    border-color: #f87171;
    background: rgba(239, 68, 68, 0.06);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(248, 113, 113, 0.15);
  }

  &:active {
    transform: translateY(0);
    background: rgba(239, 68, 68, 0.12);
    border-color: #dc2626;
  }
`

export const CategoryCard = styled.button<{
  $selected: boolean
  $category: HistoricalEventCategory | ''
}>`
  position: relative;
  border: 2px solid
    ${({ $selected, $category }) =>
      $selected ? getCategoryColor($category).border : '#e2e8f0'};
  border-radius: 16px;
  padding: 20px;
  background: ${({ $selected, $category }) =>
    $selected ? getCategoryColor($category).background : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  box-shadow: ${({ $selected }) =>
    $selected
      ? '0 4px 16px rgba(139, 92, 246, 0.15)'
      : '0 2px 6px rgba(0, 0, 0, 0.04)'};

  &:hover {
    border-color: ${({ $category }) => getCategoryColor($category).border};
    background: ${({ $category }) => getCategoryColor($category).background};
    transform: translateY(-3px);
    box-shadow: 0 6px 20px
      ${({ $category }) => getCategoryColor($category).shadow};
  }

  &:active {
    transform: translateY(-1px);
  }
`

export const CategoryIcon = styled.div<{
  $category: HistoricalEventCategory | ''
}>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $category }) => getCategoryColor($category).iconBackground};
  color: ${({ $category }) => getCategoryColor($category).iconColor};
  display: flex;
  align-items: center;
  justify-content: center;
`

export const CategoryLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

export const CategoryCheck = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #22c55e;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const MilitaryNoticeBox = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.06),
    rgba(124, 58, 237, 0.04)
  );
  border: 2px solid rgba(139, 92, 246, 0.15);
  border-radius: 16px;
  margin-bottom: 0;
  margin-top: 0;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

// 전투 유형/양상 선택 (군사 카테고리) - 하위 상세 옵션 느낌
export const CombatTypeSection = styled.div`
  margin-top: 0;
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(
    135deg,
    rgba(148, 163, 184, 0.04),
    rgba(203, 213, 225, 0.03)
  );
  border: 2px dashed rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
  position: relative;

  &::before {
    content: '⚔️ 전쟁/군사 상세 설정';
    position: absolute;
    top: -12px;
    left: 16px;
    background: #ffffff;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
`

export const ConflictTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
  max-width: 1000px;
`

export const ConflictTypeButton = styled.button<{ $selected: boolean }>`
  position: relative;
  border: 2px solid ${({ $selected }) => ($selected ? '#ef4444' : '#e2e8f0')};
  border-radius: 16px;
  padding: 20px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(239, 68, 68, 0.08)' : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  box-shadow: ${({ $selected }) =>
    $selected
      ? '0 4px 16px rgba(239, 68, 68, 0.18)'
      : '0 2px 6px rgba(0, 0, 0, 0.04)'};

  &:hover {
    border-color: #f87171;
    background: rgba(239, 68, 68, 0.06);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.2);
  }

  &:active {
    transform: translateY(-1px);
    background: rgba(239, 68, 68, 0.12);
    border-color: #dc2626;
  }
`

export const ConflictTypeIcon = styled.div<{ $selected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'};
  color: ${({ $selected }) => ($selected ? '#dc2626' : '#ef4444')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`

export const ConflictTypeLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

export const CombatTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  max-width: 1000px;
`

export const CombatTypeButton = styled.button<{ $selected: boolean }>`
  position: relative;
  border: 2px solid ${({ $selected }) => ($selected ? '#ef4444' : '#e2e8f0')};
  border-radius: 16px;
  padding: 20px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(239, 68, 68, 0.08)' : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  box-shadow: ${({ $selected }) =>
    $selected
      ? '0 4px 16px rgba(239, 68, 68, 0.18)'
      : '0 2px 6px rgba(0, 0, 0, 0.04)'};

  &:hover {
    border-color: #f87171;
    background: rgba(239, 68, 68, 0.06);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.2);
  }

  &:active {
    transform: translateY(-1px);
    background: rgba(239, 68, 68, 0.12);
    border-color: #dc2626;
  }
`

export const CombatTypeIcon = styled.div<{ $selected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'};
  color: ${({ $selected }) => ($selected ? '#dc2626' : '#ef4444')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`

export const CombatTypeLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

// InfoBox 스타일 (전투 유형 가이드용)
export const InfoBox = styled.div`
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #6366f1;
  border-radius: 10px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }
`

// 말풍선 스타일 가이드
export const GuideIconButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid rgba(139, 92, 246, 0.15);
  background: rgba(139, 92, 246, 0.04);
  color: #8b5cf6;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  margin-left: auto;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(139, 92, 246, 0.08);
    color: #7c3aed;
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

export const GuideTooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 46px;
  right: 0;
  width: 380px;
  max-width: calc(100vw - 40px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 4px 20px rgba(15, 23, 42, 0.12),
    0 12px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.15);
  padding: 18px;
  z-index: 1000;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transform: ${({ $visible }) =>
    $visible ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top right;

  /* 말풍선 화살표 */
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 10px;
    width: 12px;
    height: 12px;
    background: #ffffff;
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-bottom: none;
    border-right: none;
    transform: rotate(45deg);
  }

  @media (max-width: 640px) {
    width: calc(100vw - 40px);
    right: 0;

    &::before {
      right: 10px;
    }
  }
`

export const GuideTooltipHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
`

export const GuideTooltipTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #8b5cf6;
    width: 16px;
    height: 16px;
  }
`

export const GuideTooltipClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(148, 163, 184, 0.1);
    color: #64748b;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export const GuideTooltipContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

// 기존 접을 수 있는 가이드 스타일들은 유지 (다른 곳에서 사용할 수 있음)
export const CollapsibleGuide = styled.div`
  margin-bottom: 28px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.03),
    rgba(168, 85, 247, 0.02)
  );
  border: 1px solid rgba(139, 92, 246, 0.12);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.2);
    box-shadow: 0 2px 12px rgba(139, 92, 246, 0.08);
  }
`

export const GuideHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.04);
  }

  &:active {
    background: rgba(139, 92, 246, 0.06);
  }
`

export const GuideIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #ffffff;
  flex-shrink: 0;
`

export const GuideTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.01em;
`

export const GuideToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b5cf6;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`

export const GuideContent = styled.div`
  padding: 8px 20px 20px 20px;
  overflow: hidden;
`

export const GuideTip = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(241, 245, 249, 1);
    border-color: rgba(203, 213, 225, 1);
  }
`

export const TipNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #8b5cf6;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
`

export const TipTitle = styled.h5`
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
`

export const TipDescription = styled.p`
  margin: 0 0 6px 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
`

export const TipExample = styled.div`
  padding: 6px 8px;
  background: rgba(139, 92, 246, 0.06);
  border-radius: 6px;
  font-size: 11px;
  color: #7c3aed;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  border-left: 2px solid rgba(139, 92, 246, 0.3);
`

export const InfoIconWrapper = styled.div`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: #6366f1;

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 768px) {
    svg {
      width: 18px;
      height: 18px;
    }
  }
`

export const InfoContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const InfoTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`

export const InfoDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

export const InfoExamples = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
`

export const InfoExample = styled.div`
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
  display: flex;
  align-items: baseline;
  gap: 6px;

  &::before {
    content: '•';
    color: #6366f1;
    font-weight: 700;
    flex-shrink: 0;
  }

  strong {
    font-weight: 600;
    color: #475569;
  }

  @media (max-width: 768px) {
    font-size: 11px;
  }
`

export const MilitaryNoticeIcon = styled.div`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: ${COLORS.primary.gradient};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLORS.text.inverse};
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
`

export const MilitaryNoticeContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const MilitaryNoticeTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
`

export const MilitaryNoticeText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.6;
`

export const Hint = styled.span`
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  font-weight: 400;
`

export const DateRangeInfo = styled.div`
  max-width: ${FORM_FIELD_MAX_WIDTH};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.08) 0%,
    rgba(139, 92, 246, 0.05) 100%
  );
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  margin-top: 0;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }
`

export const DateRangeText = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  line-height: 1.5;

  strong {
    color: #6366f1;
    font-weight: 700;
    font-size: 15px;
  }

  span {
    color: #64748b;
    font-size: 13px;
    margin-left: 4px;
  }
`

export const DateInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1.5px solid ${COLORS.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${COLORS.background.input};
  max-width: ${FORM_FIELD_MAX_WIDTH};

  &:hover {
    border-color: ${COLORS.border.hover};
    background: ${COLORS.border.light};
  }

  &:focus-within {
    border-color: ${COLORS.border.focus};
    background: ${COLORS.background.content};
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
  }

  svg {
    color: ${COLORS.primary.main};
    flex-shrink: 0;
  }
`

export const DateInputDisplay = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${COLORS.text.primary};

  &:empty::before {
    content: '날짜를 선택하세요';
    color: #94a3b8;
  }
`

export const ErrorMessage = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '⚠';
    font-size: 14px;
  }
`

export const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1.5px solid rgba(99, 102, 241, 0.1);
  margin-top: 24px;
`

// 모던 스타일 버튼 (보라색 계열)
export const ActionButton = styled.button<{
  $variant: 'primary' | 'secondary'
}>`
  border: none;
  border-radius: 12px;
  padding: 14px 28px;
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? COLORS.primary.gradient
      : COLORS.background.content};
  color: ${({ $variant }) =>
    $variant === 'primary' ? COLORS.text.inverse : COLORS.text.secondary};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: ${({ $variant }) =>
    $variant === 'primary'
      ? '0 4px 12px rgba(139, 92, 246, 0.3)'
      : '0 2px 6px rgba(0, 0, 0, 0.08)'};
  border: ${({ $variant }) =>
    $variant === 'secondary' ? `1.5px solid ${COLORS.border.default}` : 'none'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? `linear-gradient(135deg, ${COLORS.primary.dark} 0%, #6d28d9 100%)`
        : COLORS.background.hover};
    box-shadow: ${({ $variant }) =>
      $variant === 'primary'
        ? '0 6px 16px rgba(139, 92, 246, 0.4)'
        : '0 4px 10px rgba(0, 0, 0, 0.1)'};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`

export const PreviewPanel = styled.aside`
  position: sticky;
  top: calc(var(--header-height) + 24px);
  background: #fff;
  border: 1px solid rgba(20, 19, 34, 0.08);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  max-height: calc(100vh - var(--header-height) - 48px);
  overflow-y: auto;

  @media (max-width: 1200px) {
    display: none;
  }
`

export const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1.5px solid rgba(99, 102, 241, 0.1);
  margin-bottom: 16px;

  svg {
    color: #6366f1;
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }
`

export const PreviewContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const PreviewItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const PreviewLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export const PreviewValue = styled.div`
  font-size: 13px;
  color: #0f172a;
  line-height: 1.6;
`

export const ParentEventSelector = styled.div`
  position: relative;
  width: 100%;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

export const ParentEventInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  background: #ffffff;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }

  &:focus-within {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  svg:first-child {
    color: #94a3b8;
    flex-shrink: 0;
  }
`

export const ParentEventInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #0f172a;
  background: transparent;

  &::placeholder {
    color: #94a3b8;
  }
`

export const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 50%;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(99, 102, 241, 0.2);
  }
`

export const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: #6366f1;
  }
`

export const ParentEventList = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  background: #ffffff;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  z-index: 100;
  margin-top: 4px;
`

export const ParentEventItem = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.05)' : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.03)'};
  }
`

export const ParentEventIcon = styled.div<{
  $category: HistoricalEventCategory
}>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $category }) => getCategoryColor($category).iconBackground};
  color: ${({ $category }) => getCategoryColor($category).iconColor};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export const ParentEventInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const ParentEventTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const ParentEventMeta = styled.div`
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: #94a3b8;

  svg {
    margin-bottom: 8px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
`

export const SelectedEventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #15803d;
  font-weight: 500;

  svg {
    flex-shrink: 0;
  }
`

export const PersonSelector = styled.div`
  position: relative;
  width: 100%;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

export const SelectedPersonsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`

export const SelectedPersonItem = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;

  strong {
    display: block;
    font-size: 13px;
    color: #0f172a;
    margin-bottom: 4px;
  }
`

export const SelectedEventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`

export const SectionCard = styled.div`
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  background: #ffffff;
  transition: all 0.2s ease;
  max-width: ${FORM_FIELD_MAX_WIDTH};

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);
  }
`

export const SectionCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

export const SectionNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
`

export const SectionTitleInput = styled.input`
  flex: 1;
  border: 1.5px solid rgba(99, 102, 241, 0.12);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
  }

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

export const RemoveSectionButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1.5px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.05);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }
`

export const RichTextEditorWrapper = styled.div`
  width: 100%;
  margin-top: 12px;
  max-width: ${FORM_FIELD_MAX_WIDTH};
`

export const MentionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
`

export const MentionTag = styled.div<{ $type: MentionEntityType }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: ${({ $type }) => {
    const config = MENTION_TYPE_CONFIG[$type]
    return `${config.color}1A`
  }};
  border: 1px solid
    ${({ $type }) => {
      const config = MENTION_TYPE_CONFIG[$type]
      return `${config.color}33`
    }};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ $type }) => MENTION_TYPE_CONFIG[$type].color};

  svg {
    flex-shrink: 0;
  }
`

export const RemoveMentionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
`

export const ThumbnailUploadArea = styled.div`
  border: 2px dashed rgba(226, 232, 240, 1);
  border-radius: 12px;
  padding: 20px;
  background: #f8fafc;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  max-width: ${FORM_FIELD_MAX_WIDTH};

  &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
  }

  svg {
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #94a3b8;
  }
`

export const ThumbnailPreview = styled.div`
  border: 2px dashed rgba(226, 232, 240, 1);
  border-radius: 12px;
  padding: 20px;
  background: #f8fafc;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: ${FORM_FIELD_MAX_WIDTH};
  cursor: pointer;

  in &:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.02);
  }

  img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

export const ThumbnailImage = styled.img``

export const ThumbnailDeleteButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`

export const UploadButton = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
`

// ============================================
// 내용 작성 섹션: 에디터 + 사이드바 레이아웃
// ============================================

export const ContentLayoutWrapper = styled.div`
  display: flex;
  gap: 32px;
  padding: 32px;
  flex: 1;
  overflow: visible;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  justify-content: center;
  align-items: flex-start;

  @media (max-width: 1440px) {
    gap: 24px;
  }

  @media (max-width: 1200px) {
    flex-direction: column;
    overflow-y: auto;
    align-items: stretch;
  }
`

export const EditorColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  overflow-x: visible;
  width: 100%;
  max-width: 900px;
  flex-shrink: 0;
  padding: 0 16px 0 4px;
  position: relative;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.3);
  }

  @media (max-width: 1200px) {
    max-width: 100%;
    padding: 0;
  }
`

export const SidebarColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  width: 400px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  max-height: calc(100vh - 200px);

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.15);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.25);
  }

  @media (max-width: 1440px) {
    width: 350px;
  }

  @media (max-width: 1200px) {
    display: none;
  }
`

// ============================================
// 사이드바: 사건 빠른 정보
// ============================================

export const SidebarCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid ${COLORS.border.default};
  padding: 20px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.2);
  }
`

export const SidebarCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${COLORS.border.light};

  svg {
    color: ${COLORS.primary.main};
    flex-shrink: 0;
  }
`

export const SidebarCardTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${COLORS.text.primary};
  letter-spacing: -0.01em;
`

export const SidebarCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const QuickInfoItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;

  svg {
    color: ${COLORS.primary.main};
    flex-shrink: 0;
    margin-top: 2px;
  }
`

export const QuickInfoLabel = styled.span`
  color: ${COLORS.text.secondary};
  font-weight: 500;
  min-width: 60px;
`

export const QuickInfoValue = styled.span`
  color: ${COLORS.text.primary};
  font-weight: 400;
  flex: 1;
  word-break: break-word;
`

export const QuickInfoThumbnail = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid ${COLORS.border.default};
  margin-bottom: 8px;
`

// ============================================
// 사이드바: 목차 / 섹션 네비게이션
// ============================================

export const TocList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const TocItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: ${(props) =>
    props.$active
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(124, 58, 237, 0.06))'
      : 'transparent'};
  border-left: 3px solid
    ${(props) => (props.$active ? COLORS.primary.main : 'transparent')};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: ${(props) =>
    props.$active ? COLORS.primary.main : COLORS.text.secondary};
  font-weight: ${(props) => (props.$active ? 600 : 500)};

  &:hover {
    background: ${(props) =>
      props.$active
        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))'
        : 'rgba(139, 92, 246, 0.04)'};
  }

  svg {
    flex-shrink: 0;
  }
`

export const TocItemTitle = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TocItemBadge = styled.span`
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(139, 92, 246, 0.1);
  color: ${COLORS.primary.main};
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
`

// ============================================
// 사이드바: 작성 통계
// ============================================

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`

export const StatCard = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.04),
    rgba(168, 85, 247, 0.02)
  );
  border: 1px solid rgba(139, 92, 246, 0.1);
  text-align: center;
`

export const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${COLORS.primary.main};
  margin-bottom: 4px;
`

export const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${COLORS.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

// ============================================
// 사이드바: 빠른 참조
// ============================================

export const QuickRefList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const QuickRefItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.03);
  border: 1px solid rgba(139, 92, 246, 0.08);
  font-size: 12px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.15);
  }

  svg {
    color: ${COLORS.primary.main};
    flex-shrink: 0;
  }
`

export const QuickRefName = styled.span`
  color: ${COLORS.text.primary};
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const QuickRefCount = styled.span`
  padding: 2px 6px;
  border-radius: 10px;
  background: ${COLORS.primary.main};
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
`

export const QuickRefEmpty = styled.div`
  padding: 16px;
  text-align: center;
  color: ${COLORS.text.muted};
  font-size: 12px;
  font-style: italic;
`

// ============================================
// 기존 섹션 추가 버튼
// ============================================

export const AddSectionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 2px 8px rgba(139, 92, 246, 0.2),
    0 0 0 0 rgba(139, 92, 246, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 4px 16px rgba(139, 92, 246, 0.3),
      0 0 0 4px rgba(139, 92, 246, 0.1);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow:
      0 2px 8px rgba(139, 92, 246, 0.2),
      0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 2.5;
  }
`

// 섹션 사이에 나타나는 작은 추가 버튼
export const AddSectionButtonCompact = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin: 16px 0;
  padding: 10px 16px;
  border: 2px dashed rgba(139, 92, 246, 0.25);
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.04);
  color: #8b5cf6;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.7;

  &:hover {
    opacity: 1;
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.08);
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

export const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

export const BelligerentCard = styled.div`
  padding: 20px;
  background: rgba(148, 163, 184, 0.04);
  border: 1.5px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  margin-bottom: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.2);
    background: rgba(99, 102, 241, 0.02);
  }
`

export const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

// 태그 관련 스타일
export const TagInputWrapper = styled.div`
  width: 100%;
`

export const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

export const TagChip = styled.div<{ $isGroup?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${({ $isGroup }) =>
    $isGroup
      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))'
      : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid
    ${({ $isGroup }) =>
      $isGroup ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)'};
  border-radius: 8px;
  font-size: 12px;
  font-weight: ${({ $isGroup }) => ($isGroup ? '600' : '500')};
  color: ${({ $isGroup }) => ($isGroup ? '#6366f1' : '#475569')};
  transition: all 0.2s ease;

  ${({ $isGroup }) =>
    $isGroup &&
    `
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
  `}

  &:hover {
    background: ${({ $isGroup }) =>
      $isGroup
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))'
        : 'rgba(99, 102, 241, 0.12)'};
    border-color: rgba(99, 102, 241, 0.35);
  }
`

export const TagRemoveButton = styled.button`
  border: none;
  background: rgba(99, 102, 241, 0.15);
  padding: 2px;
  border-radius: 4px;
  color: #6366f1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.25);
    color: #4f46e5;
  }
`

// 선택된 사건 리스트
export const SelectedEventItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: #0f172a;

  span {
    flex: 1;
    font-weight: 500;
  }
`

// 관련 국가 스타일
export const CountryAddForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 12px;
  margin-bottom: 12px;
`

export const CountryTypeToggle = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
`

export const RelatedCountriesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
`

export const CountryRelationCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 40px 14px 14px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.04) 0%,
    rgba(168, 85, 247, 0.03) 100%
  );
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.25);
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.06) 0%,
      rgba(168, 85, 247, 0.04) 100%
    );
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.1);
  }
`

export const CountryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;

  svg {
    color: #6366f1;
  }

  span {
    flex: 1;
  }
`

export const RoleBadge = styled.span`
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`

export const CountryDescription = styled.div`
  font-size: 12px;
  color: #64748b;
  padding-left: 24px;
  line-height: 1.5;
`

export const SaveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

export const CancelButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  background: white;
  color: #64748b;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.05);
    color: #6366f1;
  }
`

export const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.12);
  }
`

export const RemoveButton = styled.button`
  border: none;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px;
  border-radius: 6px;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
`

export const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`

export const EmptyMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
`

export const CountryChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;

  svg {
    color: #6366f1;
  }

  button {
    background: none;
    border: none;
    color: #6366f1;
    cursor: pointer;
    padding: 2px;
    display: flex;

    &:hover {
      color: #ef4444;
    }
  }
`

export const SelectedCountriesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

export const CountrySelectGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

// 모달 스타일
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
`

export const Modal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  display: flex;
  flex-direction: column;
`

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.12);

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
  }

  button {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    transition: color 0.2s ease;

    &:hover {
      color: #ef4444;
    }
  }
`

export const ModalContent = styled.div`
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
`

export const CountryModalSection = styled.div`
  margin-top: 20px;

  &:first-of-type {
    margin-top: 16px;
  }
`

export const CountryModalTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const CountryModalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 250px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 3px;
  }
`

export const CountryModalItem = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.1)' : 'white'};
  border: 1px solid
    ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.12)'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  span {
    flex: 1;
    font-size: 13px;
    color: #0f172a;
    font-weight: ${({ $selected }) => ($selected ? '600' : '500')};
  }

  &:hover {
    background: ${({ $selected }) =>
      $selected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.05)'};
    border-color: rgba(99, 102, 241, 0.3);
  }
`

// ============================================
// 🆕 하위 사건 빠른 추가 스타일
// ============================================

export const ChildEventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`

export const ChildEventItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${COLORS.background.section};
  border: 1px solid ${COLORS.border.default};
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.border.hover};
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.05);
  }
`

export const ChildEventThumbnail = styled.img`
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
`

export const ChildEventInfo = styled.div`
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: ${COLORS.text.primary};
    margin-bottom: 4px;
  }

  div {
    font-size: 12px;
    color: ${COLORS.text.secondary};
  }

  span {
    white-space: nowrap;
  }
`

export const RemoveChildButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.1);
  }
`

export const ChildEventFormCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: ${COLORS.background.content};
  border: 1.5px solid ${COLORS.border.default};
  border-radius: 12px;
  margin-bottom: 16px;
`

export const ChildEventFormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid ${COLORS.border.light};
`
