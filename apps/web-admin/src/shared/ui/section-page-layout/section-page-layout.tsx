/**
 * 섹션 페이지 공용 레이아웃 (Event Ledger Flat Design)
 *
 * 사건 페이지(`entities/event/ui/ledger-tokens.ts` · `pages/events/styles/theme.ts`)의
 * 평면 원장(Flat Ledger) 디자인 언어를 따른다:
 * - SectionRoot       : 모든 하위 탭이 공유하는 표준 캔버스 패딩·배경
 * - SectionTabHeader  : 글라스/보라 오브 없이 1px 잉크 헤어라인으로 마감되는 편집형 섹션 헤더
 * - SectionKpiPanel   : 평면 1px 보더 + tabular-nums KPI 요약 바
 * - SectionEmptyState : 블러 오브 없는 정갈한 점선 빈 상태
 * - SectionFormCard   : 그림자 없는 10px(RADIUS.MD) 등록/수정 폼 카드
 * - AddButton         : 34px 인디고 플랫 주 CTA 버튼
 */
import React from 'react'

import { motion } from 'framer-motion'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentHover,
  ledgerBackground,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerInkLine,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { metaText, toolbarControlHeight } from '@/pages/events/styles/theme'
import { scrollbarMixin } from '@/shared/styles/mixins'

// ─── Styled Components ────────────────────────────────────────────────────────

export const SectionRoot = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px clamp(20px, 2.5vw, 32px) 48px;
  position: relative;
  min-height: calc(100vh - 200px);
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 14px 16px 36px;
    gap: 16px;
  }
`

// ─── SectionTabHeader (모든 variant를 사건 페이지형 플랫 편집 헤더로 통일) ───

const TabHeaderOuter = styled.header<{
  $variant: 'hero' | 'flat' | 'plain'
}>`
  position: relative;
  padding: 0 0 16px;
  margin: 0;
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  box-shadow: none;

  @media (max-width: 768px) {
    padding: 0 0 14px;
  }
`

const TabHeaderInner = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px 20px;
  position: relative;
  flex-wrap: wrap;
`

const TabHeaderLeft = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
`

const TabHeaderTextCol = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 4px;
`

const TabHeaderTitle = styled.h1<{ $variant: 'hero' | 'flat' | 'plain' }>`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.015em;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`

const TabHeaderSubtitle = styled.p<{ $variant: 'hero' | 'flat' | 'plain' }>`
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  max-width: min(100%, 44rem);
  ${metaText}

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

const TabHeaderRightSlot = styled.div<{ $variant: 'hero' | 'flat' | 'plain' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
`

export interface SectionTabHeaderProps {
  title: string
  description: string
  /** 왼쪽 타이틀 앞에 올 슬롯 (예: 국기 썸네일) */
  leftSlot?: React.ReactNode
  /** 우측 버튼 슬롯 */
  rightSlot?: React.ReactNode
  /** 하위 호환용 prop — 모든 모드가 플랫 원장 헤더로 렌더링된다 */
  variant?: 'hero' | 'flat' | 'plain'
}

export function SectionTabHeader({
  title,
  description,
  leftSlot,
  rightSlot,
  variant = 'plain',
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
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
  flex-wrap: wrap;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.015em;
  line-height: 1.3;
`

const HeaderDesc = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  max-width: 540px;
  font-weight: 400;
  ${metaText}
`

const KpiOuter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const KpiPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  box-shadow: none;
`

const KpiLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  ${metaText}
`

const KpiValue = styled.span`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const KpiUnit = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  margin-left: 3px;
  ${metaText}
`

const EmptyOuter = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px 52px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  box-shadow: none;
`

const EmptyInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const EmptyDesc = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  max-width: 340px;
  line-height: 1.55;
  font-weight: 400;
  ${metaText}
`

const FormCardOuter = styled.div`
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border-radius: ${RADIUS.MD};
  overflow: hidden;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  box-shadow: none;
`

const FormCardTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerInkLine(theme.mode)};
  flex-wrap: wrap;
  gap: 12px;
`

const FormCardBody = styled.div`
  padding: 20px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 0;
  ${scrollbarMixin}
`

export const AddButton = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? ledgerBackground('dark') : '#ffffff'};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  box-shadow: none;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background ${MOTION.fast} ease,
    opacity ${MOTION.fast} ease;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${({ theme }) => ledgerBackground(theme.mode)},
      0 0 0 4px ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }
`

export const ErrorBox = styled.div`
  margin-bottom: 20px;
  padding: 10px 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  font-weight: 500;
`

export const BackButton = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  cursor: pointer;
  transition:
    color ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

export const SaveButton = styled.button<{ $saving?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 16px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? ledgerBackground('dark') : '#ffffff'};
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: ${({ $saving }) => ($saving ? 'wait' : 'pointer')};
  box-shadow: none;
  opacity: ${({ $saving }) => ($saving ? 0.65 : 1)};
  transition:
    opacity ${MOTION.fast} ease,
    background ${MOTION.fast} ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerAccentHover(theme.mode)};
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px ${({ theme }) => ledgerBackground(theme.mode)},
      0 0 0 4px ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

// ─── 섹션 애니메이션 상수 ──────────────────────────────────────────────────────

export const SECTION_MOTION = {
  initial: { opacity: 0, y: 6 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const },
}

export const EMPTY_MOTION = {
  initial: { opacity: 0, y: 6 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] as const },
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
            <FiPlus aria-hidden />
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
  /** UnderlineTabNav 등 탭 컴포넌트 */
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
  /** 아이콘 슬롯 (기본: 플랫 레저 아이콘) */
  icon?: React.ReactNode
}

const DefaultEmptyIcon = () => (
  <div style={{ marginBottom: 16 }}>
    <svg
      width="72"
      height="52"
      viewBox="0 0 72 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block', opacity: 0.7 }}
    >
      <rect
        x="6"
        y="8"
        width="60"
        height="38"
        rx="6"
        stroke="currentColor"
        strokeOpacity="0.24"
        strokeWidth="1.25"
      />
      <line
        x1="16"
        y1="20"
        x2="42"
        y2="20"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="29"
        x2="54"
        y2="29"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="36"
        x2="48"
        y2="36"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton type="button" onClick={onBack}>
            <FiArrowLeft aria-hidden />
            목록으로
          </BackButton>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: 'inherit',
            }}
          >
            {formTitle}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
