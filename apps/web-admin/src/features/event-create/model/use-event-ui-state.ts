/**
 * 이벤트 폼 UI 상태 관리 Hook
 * FSD: features/event-create/model
 */
import { useState } from 'react'

export type FormStep =
  | 'basic'
  | 'military'
  | 'details'
  | 'location'
  | 'relationships'

export const useEventUIState = () => {
  // 현재 단계
  const [currentStep, setCurrentStep] = useState<FormStep>('basic')

  // 로딩 상태
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)

  // 날짜 선택 모달
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false)
  const [isEndDateModalOpen, setIsEndDateModalOpen] = useState(false)

  // 시간 선택 모달
  const [isStartTimeModalOpen, setIsStartTimeModalOpen] = useState(false)
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false)

  return {
    currentStep,
    setCurrentStep,
    isLoadingEvent,
    setIsLoadingEvent,
    isStartDateModalOpen,
    setIsStartDateModalOpen,
    isEndDateModalOpen,
    setIsEndDateModalOpen,
    isStartTimeModalOpen,
    setIsStartTimeModalOpen,
    isEndTimeModalOpen,
    setIsEndTimeModalOpen,
  }
}

export type EventUIState = ReturnType<typeof useEventUIState>
