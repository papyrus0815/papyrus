import { useState } from 'react'

import styled from 'styled-components'

export interface GuideStepItem {
  key: string
  stepNumber: number
  title: string
  description: string
  status: 'completed' | 'partial' | 'empty'
  statusLabel: string
  actionLabel: string
  onAction: () => void
}

export interface DiagnosticHintItem {
  key: string
  tone?: 'info' | 'warning'
  message: string
  actionLabel: string
  onAction: () => void
}

export interface DashboardGuideBannerProps {
  countryId: string
  steps: GuideStepItem[]
  diagnosticHints?: DiagnosticHintItem[]
  isLoading?: boolean
}

const STORAGE_KEY_PREFIX = 'papyrus:country-guide-open:'

export function DashboardGuideBanner({
  countryId,
  steps,
  diagnosticHints = [],
  isLoading = false,
}: DashboardGuideBannerProps) {
  const completedCount = steps.filter((step) => step.status === 'completed').length
  const partialCount = steps.filter((step) => step.status === 'partial').length
  const totalSteps = steps.length || 4

  const [manualToggle, setManualToggle] = useState<{
    countryId: string
    open: boolean
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${countryId}`)
      if (saved === 'true' || saved === 'false') {
        return { countryId, open: saved === 'true' }
      }
    } catch {
      // sessionStorage 접근 불가 환경 무시
    }
    return null
  })

  // 기본값: 완료된 단계가 1개 이하이고 진행 중인 단계도 적을 때는 자동으로 펼쳐 온보딩을 돕고,
  // 데이터가 어느 정도 찬 국가에서는 한 줄 요약 바로 접어 둔다.
  const defaultOpen = !isLoading && completedCount + partialCount <= 1
  const isOpen =
    manualToggle && manualToggle.countryId === countryId
      ? manualToggle.open
      : defaultOpen

  const handleToggle = () => {
    const nextOpen = !isOpen
    setManualToggle({ countryId, open: nextOpen })
    try {
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${countryId}`,
        String(nextOpen),
      )
    } catch {
      // ignore
    }
  }

  if (isLoading) return null

  const progressRatio = Math.min(
    100,
    Math.round(((completedCount + partialCount * 0.5) / totalSteps) * 100),
  )

  return (
    <Container aria-label="국가 아카이빙 구축 가이드 및 데이터 진단">
      <HeaderBar>
        <HeaderLeft>
          <GuideBadge>구축 가이드</GuideBadge>
          <HeaderTitle>
            {completedCount === totalSteps
              ? '핵심 4단계 아카이빙이 모두 채워졌습니다'
              : '권장 순서에 따라 국가 기록을 단계별로 완성해 보세요'}
          </HeaderTitle>
          <ProgressWrap>
            <ProgressTrack aria-hidden>
              <ProgressFill style={{ width: `${progressRatio}%` }} />
            </ProgressTrack>
            <ProgressLabel>
              {completedCount}/{totalSteps} 단계 완료 ({progressRatio}%)
            </ProgressLabel>
          </ProgressWrap>
        </HeaderLeft>

        <ToggleButton
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
        >
          {isOpen ? '가이드 접기' : '4단계 가이드 보기'}
        </ToggleButton>
      </HeaderBar>

      {isOpen && (
        <StepGrid>
          {steps.map((step) => (
            <StepCard key={step.key} $status={step.status}>
              <StepTopRow>
                <StepNumBadge $status={step.status}>
                  {step.stepNumber}단계
                </StepNumBadge>
                <StepStatusChip $status={step.status}>
                  <StepStatusDot $status={step.status} aria-hidden />
                  {step.statusLabel}
                </StepStatusChip>
              </StepTopRow>
              <StepTitle>{step.title}</StepTitle>
              <StepDesc>{step.description}</StepDesc>
              <StepActionBtn type="button" onClick={step.onAction}>
                {step.actionLabel} ›
              </StepActionBtn>
            </StepCard>
          ))}
        </StepGrid>
      )}

      {diagnosticHints.length > 0 && (
        <DiagnosticsList aria-label="데이터 정합성 및 보완 제안">
          {diagnosticHints.map((hint) => (
            <DiagnosticItem key={hint.key} $tone={hint.tone ?? 'info'}>
              <DiagnosticLead>
                <DiagnosticBadge $tone={hint.tone ?? 'info'}>
                  <DiagnosticStatusDot $tone={hint.tone ?? 'info'} aria-hidden />
                  {hint.tone === 'warning' ? '정합성 주의' : '보완 제안'}
                </DiagnosticBadge>
                <DiagnosticText>{hint.message}</DiagnosticText>
              </DiagnosticLead>
              <DiagnosticAction type="button" onClick={hint.onAction}>
                {hint.actionLabel}
              </DiagnosticAction>
            </DiagnosticItem>
          ))}
        </DiagnosticsList>
      )}
    </Container>
  )
}

/*
 * 무컨테이너 헤어라인 구축 가이드 & 정합성 원장 —
 * 외곽 둥근 박스 및 4개 내부 카드 상자를 걷어내고 상·하단 실선과 열 구분선으로 정돈한다.
 */
const Container = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeaderBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 10px 0;
`

const HeaderLeft = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
`

const GuideBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
`

const HeaderTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const ProgressWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const ProgressTrack = styled.span`
  display: inline-block;
  width: 76px;
  height: 5px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)'};
`

const ProgressFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1, #10b981);
  transition: width 0.3s ease;
`

const ProgressLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ToggleButton = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const StepGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const StepCard = styled.div<{ $status: 'completed' | 'partial' | 'empty' }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px 12px 0;
  min-width: 0;

  @media (min-width: 1101px) {
    &:not(:first-child) {
      padding-left: 16px;
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
    &:last-child {
      padding-right: 0;
    }
  }

  @media (min-width: 601px) and (max-width: 1100px) {
    &:nth-child(2n) {
      padding-left: 16px;
      padding-right: 0;
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }

  @media (max-width: 600px) {
    padding: 10px 0;
    &:not(:first-child) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const StepTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

const StepNumBadge = styled.span<{
  $status: 'completed' | 'partial' | 'empty'
}>`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $status }) =>
    $status === 'completed'
      ? '#10b981'
      : $status === 'partial'
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : '#4f46e5'
        : theme.colors.text.tertiary};
`

const StepStatusChip = styled.span<{
  $status: 'completed' | 'partial' | 'empty'
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $status }) =>
    $status === 'completed'
      ? 'rgba(16, 185, 129, 0.12)'
      : $status === 'partial'
        ? 'rgba(99, 102, 241, 0.12)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(15,23,42,0.045)'};
  color: ${({ theme, $status }) =>
    $status === 'completed'
      ? '#10b981'
      : $status === 'partial'
        ? theme.mode === 'dark'
          ? '#a5b4fc'
          : '#4f46e5'
        : theme.colors.text.tertiary};
`

const StepStatusDot = styled.span<{
  $status: 'completed' | 'partial' | 'empty'
}>`
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme, $status }) =>
    $status === 'completed'
      ? '#10b981'
      : $status === 'partial'
        ? '#6366f1'
        : theme.colors.text.tertiary};
`

const StepTitle = styled.strong`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StepDesc = styled.p`
  margin: 0;
  flex: 1;
  font-size: 12px;
  line-height: 1.45;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StepActionBtn = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.22)'
        : 'rgba(99,102,241,0.13)'};
  }
`

const DiagnosticsList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const DiagnosticItem = styled.div<{ $tone: 'info' | 'warning' }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
  padding: 8px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const DiagnosticLead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 220px;
`

const DiagnosticBadge = styled.span<{ $tone: 'info' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 4px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $tone }) =>
    $tone === 'warning'
      ? 'rgba(245, 158, 11, 0.14)'
      : 'rgba(99, 102, 241, 0.10)'};
  color: ${({ theme, $tone }) =>
    $tone === 'warning'
      ? '#d97706'
      : theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'};
`

const DiagnosticStatusDot = styled.span<{ $tone: 'info' | 'warning' }>`
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === 'warning' ? '#f59e0b' : '#6366f1')};
`

const DiagnosticText = styled.span`
  font-size: 12px;
  line-height: 1.45;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DiagnosticAction = styled.button`
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: #6366f1;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  }
`
