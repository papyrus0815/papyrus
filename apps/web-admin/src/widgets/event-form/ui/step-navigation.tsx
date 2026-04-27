/**
 * 폼 단계 네비게이션
 * FSD: widgets/event-form/ui
 */
import React from 'react'

import type { IconType } from 'react-icons'
import { FiArrowLeft, FiCheck } from 'react-icons/fi'
import { useTheme } from 'styled-components'

import type { FormStep } from '@/features/event-create/model'
import * as S from '@/pages/events/create/event-create.styles'

interface Step {
  id: FormStep
  label: string
  icon: IconType
}

interface StepNavigationProps {
  steps: Step[]
  currentStep: FormStep
  setCurrentStep: (step: FormStep) => void
  playClickSound: () => void
  onBack?: () => void
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  steps,
  currentStep,
  setCurrentStep,
  playClickSound,
  onBack,
}) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStep)
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  return (
    <S.StepNavigation>
      {/* 뒤로가기 버튼 */}
      {onBack && (
        <S.StepItem
          $active={false}
          $completed={false}
          onClick={() => {
            playClickSound()
            onBack()
          }}
          style={{
            marginBottom: '16px',
            background: 'transparent',
            border: `1.5px solid ${isDark ? '#2a2a2a' : '#e2e8f0'}`,
          }}
        >
          <S.StepIconWrapper $active={false} $completed={false}>
            <FiArrowLeft size={16} />
          </S.StepIconWrapper>
          <S.StepLabel $active={false}>이전 페이지</S.StepLabel>
        </S.StepItem>
      )}

      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = step.id === currentStep
        const Icon = step.icon

        return (
          <S.StepItem
            key={step.id}
            $active={isCurrent}
            $completed={isCompleted}
            onClick={() => {
              playClickSound()
              setCurrentStep(step.id)
            }}
          >
            <S.StepIconWrapper $active={isCurrent} $completed={isCompleted}>
              {isCompleted ? <FiCheck size={16} /> : <Icon size={16} />}
            </S.StepIconWrapper>
            <S.StepLabel $active={isCurrent}>{step.label}</S.StepLabel>
            {index < steps.length - 1 && <S.StepConnector />}
          </S.StepItem>
        )
      })}
    </S.StepNavigation>
  )
}
