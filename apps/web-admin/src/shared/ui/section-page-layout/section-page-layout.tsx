/**
 * 섹션 페이지 공용 레이아웃
 *
 * dynasty / ethnicity / events-timeline 등의 공통 구조를 추출한 컴포넌트 모음.
 * - SectionPageRoot     : motion.div 래퍼 (gap/padding/minHeight)
 * - SectionPageHeader   : h2 + 설명 + 우측 버튼 헤더
 * - SectionKpiPanel     : KPI 카운트 패널 (탭 아래)
 * - SectionEmptyState   : 빈 상태 (radial orb + 텍스트)
 * - SectionFormCard     : 등록/수정 폼 카드 래퍼
 * - SectionAddButton    : "+ 새 항목 추가" 버튼
 * - SectionErrorBox     : 폼 에러 메시지 박스
 * - SectionBackButton   : 폼 ← 목록으로 버튼
 * - SectionSaveButton   : 폼 저장/등록 버튼
 */
import React from 'react'

import { motion } from 'framer-motion'
import styled, { css, useTheme } from 'styled-components'

import {
  emptyCardMixin,
  kpiPanelMixin,
  scrollbarMixin,
} from '@/shared/styles/mixins'

// ─── Styled Components ────────────────────────────────────────────────────────

export const SectionRoot = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 36px 32px 48px;
  position: relative;
  min-height: calc(100vh - 200px);
  background: ${({ theme }) => theme.colors.background.primary};
`

// ─── SectionTabHeader (hero / flat / plain: 배경 없음) ─

const TabHeaderOuter = styled.header<{
  $variant: 'hero' | 'flat' | 'plain'
}>`
  border-radius: 20px;
  position: relative;

  ${({ $variant, theme }) =>
    $variant === 'plain'
      ? css`
          padding: 0 0 20px;
          margin-bottom: 4px;
          border-radius: 0;
          border-bottom: 1px solid ${theme.colors.border.light};
        `
      : css`
          padding: 28px 32px;
        `}

  @media (max-width: 768px) {
    ${({ $variant, theme }) =>
      $variant === 'plain'
        ? css`
            padding: 0 0 16px;
            margin-bottom: 2px;
            border-radius: 0;
            border-bottom: 1px solid ${theme.colors.border.light};
          `
        : css`
            padding: 20px 22px;
            border-radius: 16px;
          `}
  }

  ${({ theme, $variant }) =>
    $variant === 'plain'
      ? css`
          background: transparent;
          border-top: none;
          border-left: none;
          border-right: none;
          box-shadow: none;
        `
      : $variant === 'flat'
        ? theme.mode === 'dark'
          ? css`
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              box-shadow: none;
              backdrop-filter: none;
              -webkit-backdrop-filter: none;
            `
          : css`
              background: #f1f5f9;
              border: none;
              box-shadow: none;
            `
        : theme.mode === 'dark'
          ? css`
              background: rgba(255, 255, 255, 0.04);
              backdrop-filter: blur(24px) saturate(180%);
              -webkit-backdrop-filter: blur(24px) saturate(180%);
              border: 1px solid rgba(255, 255, 255, 0.08);
              box-shadow:
                0 4px 24px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.06);
            `
          : css`
              background: ${theme.colors.background.primary};
              border: 1px solid ${theme.colors.border.default};
              box-shadow: 0 2px 8px ${theme.colors.shadow.sm};
            `}

  /* 히어로 전용: 보라 음영 오버레이 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 0;
    ${({ $variant, theme }) =>
      $variant === 'hero'
        ? css`
            background: radial-gradient(
              ellipse at 85% 20%,
              ${theme.mode === 'dark'
                  ? 'rgba(159, 122, 234, 0.07)'
                  : 'rgba(139, 92, 246, 0.04)'}
                0%,
              transparent 55%
            );
          `
        : css`
            display: none;
          `}
  }
`

const TabHeaderInner = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: flex;
  align-items: ${({ $variant }) =>
    $variant === 'plain' ? 'flex-start' : 'center'};
  justify-content: space-between;
  gap: ${({ $variant }) => ($variant === 'plain' ? '16px 24px' : '20px')};
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
`

const TabHeaderLeft = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: flex;
  align-items: ${({ $variant }) =>
    $variant === 'plain' ? 'flex-start' : 'center'};
  gap: ${({ $variant }) => ($variant === 'plain' ? '16px' : '20px')};
  flex: 1;
  min-width: 0;
`

const TabHeaderTextCol = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: ${({ $variant }) => ($variant === 'plain' ? 6 : 4)}px;
`

const TabHeaderTitle = styled.h1<{ $variant: 'hero' | 'flat' | 'plain' }>`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  line-height: 1.3;

  ${({ $variant }) =>
    $variant === 'plain' &&
    css`
      font-size: 21px;
      font-weight: 600;
      letter-spacing: -0.035em;
      line-height: 1.28;
    `}

  @media (max-width: 768px) {
    font-size: 18px;

    ${({ $variant }) =>
      $variant === 'plain' &&
      css`
        font-size: 18px;
      `}
  }
`

const TabHeaderSubtitle = styled.p<{ $variant: 'hero' | 'flat' | 'plain' }>`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};

  ${({ $variant }) =>
    $variant === 'plain' &&
    css`
      font-weight: 400;
      line-height: 1.55;
      max-width: min(100%, 40rem);
      color: ${({ theme }) => theme.colors.text.secondary};
    `}

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

const TabHeaderRightSlot = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  flex-shrink: 0;
  ${({ $variant }) =>
    $variant === 'plain' &&
    css`
      padding-top: 2px;
    `}
`

export interface SectionTabHeaderProps {
  title: string
  description: string
  /** 왼쪽 타이틀 앞에 올 슬롯 (예: 국기 썸네일) */
  leftSlot?: React.ReactNode
  /** 우측 버튼 슬롯 */
  rightSlot?: React.ReactNode
  /**
   * `flat`: 행정구역 탭 줄과 같은 얕은 배경·무그림자
   * `plain`: 배경·테두리 없음 (행정조직 등)
   * 기본 `hero`: 글라스·그림자·보라 하이라이트
   */
  variant?: 'hero' | 'flat' | 'plain'
}

export function SectionTabHeader({
  title,
  description,
  leftSlot,
  rightSlot,
  variant = 'hero',
}: SectionTabHeaderProps) {
  return (
    <TabHeaderOuter $variant={variant}>
      <TabHeaderInner $variant={variant}>
        <TabHeaderLeft $variant={variant}>
          {leftSlot}
          <TabHeaderTextCol $variant={variant}>
            <TabHeaderTitle $variant={variant}>{title}</TabHeaderTitle>
            <TabHeaderSubtitle $variant={variant}>
              {description}
            </TabHeaderSubtitle>
          </TabHeaderTextCol>
        </TabHeaderLeft>
        {rightSlot && (
          <TabHeaderRightSlot $variant={variant}>{rightSlot}</TabHeaderRightSlot>
        )}
      </TabHeaderInner>
    </TabHeaderOuter>
  )
}

const HeaderOuter = styled.header`
  padding-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const HeaderDesc = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.55;
  max-width: 540px;
  font-weight: 500;
`

const KpiOuter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const KpiPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  padding: 20px 28px;
  border-radius: 16px;
  ${({ theme }) => kpiPanelMixin(theme)}
`

const KpiLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const KpiValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
`

const KpiUnit = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: 2px;
`

const EmptyOuter = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 40px 72px;
  border-radius: 20px;
  overflow: hidden;
  ${({ theme }) => emptyCardMixin(theme)}
`

const OrbPrimary = styled.div`
  position: absolute;
  left: 50%;
  top: 20%;
  width: 280px;
  height: 280px;
  margin-left: -140px;
  margin-top: -140px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.06) 0%,
    transparent 70%
  );
  filter: blur(32px);
  pointer-events: none;
`

const OrbSecondary = styled.div`
  position: absolute;
  right: 10%;
  bottom: 15%;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.04) 0%,
    transparent 70%
  );
  filter: blur(24px);
  pointer-events: none;
`

const EmptyInner = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

const EmptyDesc = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 300px;
  line-height: 1.55;
  font-weight: 500;
`

const FormCardOuter = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
`

const FormCardTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
  gap: 16px;
`

const FormCardBody = styled.div`
  padding: 28px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
  ${scrollbarMixin}
`

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  transition:
    background 0.2s,
    border-color 0.2s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

export const ErrorBox = styled.div`
  margin-bottom: 24px;
  padding: 12px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,69,58,0.15)' : '#fee2e2'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,69,58,0.3)' : '#fecaca'};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.error};
  font-size: 14px;
  font-weight: 500;
`

export const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

export const SaveButton = styled.button<{ $saving?: boolean }>`
  padding: 12px 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ $saving }) => ($saving ? 'wait' : 'pointer')};
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  opacity: ${({ $saving }) => ($saving ? 0.7 : 1)};
  transition:
    opacity 0.2s,
    background 0.2s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
`

// ─── 아이콘 ───────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const BackArrowIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
)

// ─── 섹션 애니메이션 상수 ──────────────────────────────────────────────────────

export const SECTION_MOTION = {
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
}

export const EMPTY_MOTION = {
  initial: { opacity: 0, y: 12 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
}

// ─── 복합 컴포넌트 ────────────────────────────────────────────────────────────

interface SectionPageHeaderProps {
  title: string
  description: string
  /** list 뷰일 때만 표시할 우측 추가 버튼 */
  addButton?: {
    label: string
    onClick: () => void
    ariaLabel?: string
  }
  /** 우측 커스텀 슬롯 (addButton보다 우선) */
  rightSlot?: React.ReactNode
}

export function SectionPageHeader({
  title,
  description,
  addButton,
  rightSlot,
}: SectionPageHeaderProps) {
  return (
    <HeaderOuter>
      <div>
        <HeaderTitle>{title}</HeaderTitle>
        <HeaderDesc>{description}</HeaderDesc>
      </div>
      {rightSlot ??
        (addButton && (
          <AddButton
            type="button"
            onClick={addButton.onClick}
            aria-label={addButton.ariaLabel ?? addButton.label}
          >
            <PlusIcon />
            {addButton.label}
          </AddButton>
        ))}
    </HeaderOuter>
  )
}

interface SectionKpiPanelProps {
  label: string
  count: number
  unit?: string
  /** PillTabNav 등 탭 컴포넌트 */
  tabSlot?: React.ReactNode
}

export function SectionKpiPanel({
  label,
  count,
  unit = '개',
  tabSlot,
}: SectionKpiPanelProps) {
  return (
    <KpiOuter>
      {tabSlot}
      <KpiPanel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <KpiLabel>{label}</KpiLabel>
          <KpiValue>
            {count}
            <KpiUnit>{unit}</KpiUnit>
          </KpiValue>
        </div>
      </KpiPanel>
    </KpiOuter>
  )
}

interface SectionEmptyStateProps {
  title: string
  description: React.ReactNode
  /** 아이콘 슬롯 (기본: 카드 스택 SVG) */
  icon?: React.ReactNode
}

const DefaultEmptyIcon = () => (
  <div style={{ marginBottom: 28 }}>
    <svg
      width="120"
      height="88"
      viewBox="0 0 120 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block' }}
    >
      <rect x="4" y="20" width="100" height="60" rx="14" fill="#e2e8f0" />
      <rect
        x="14"
        y="10"
        width="100"
        height="60"
        rx="14"
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth="1"
      />
      <rect
        x="24"
        y="0"
        width="100"
        height="60"
        rx="14"
        fill="#ffffff"
        stroke="#c7d2fe"
        strokeWidth="1.5"
      />
      <rect x="32" y="14" width="56" height="10" rx="5" fill="#eef2ff" />
      <rect x="32" y="30" width="76" height="6" rx="3" fill="#e0e7ff" />
      <rect x="32" y="42" width="64" height="6" rx="3" fill="#e0e7ff" />
    </svg>
  </div>
)

export function SectionEmptyState({
  title,
  description,
  icon,
}: SectionEmptyStateProps) {
  return (
    <EmptyOuter {...EMPTY_MOTION}>
      <OrbPrimary />
      <OrbSecondary />
      <EmptyInner>
        {icon ?? <DefaultEmptyIcon />}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDesc>{description}</EmptyDesc>
      </EmptyInner>
    </EmptyOuter>
  )
}

interface SectionFormCardProps {
  /** 폼 제목 */
  formTitle: string
  /** 저장 중 여부 */
  isSaving?: boolean
  /** 목록으로 */
  onBack: () => void
  /** 저장/등록 */
  onSave: () => void
  /** 수정 모드 여부 (버튼 텍스트) */
  isEditing?: boolean
  /** 에러 메시지 */
  error?: string | null
  children: React.ReactNode
}

export function SectionFormCard({
  formTitle,
  isSaving = false,
  onBack,
  onSave,
  isEditing = false,
  error,
  children,
}: SectionFormCardProps) {
  return (
    <FormCardOuter>
      <FormCardTopBar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <BackButton type="button" onClick={onBack}>
            <BackArrowIcon />
            목록으로
          </BackButton>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'inherit',
            }}
          >
            {formTitle}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <SaveButton
            type="button"
            onClick={onSave}
            disabled={isSaving}
            $saving={isSaving}
          >
            {isSaving ? '저장 중…' : isEditing ? '저장' : '등록'}
          </SaveButton>
        </div>
      </FormCardTopBar>

      <FormCardBody>
        {error && <ErrorBox>{error}</ErrorBox>}
        {children}
      </FormCardBody>
    </FormCardOuter>
  )
}
