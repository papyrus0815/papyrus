/**
 * 폼 단계 관련 유틸리티
 * FSD: features/event-create/lib
 */
import type { FormStep } from '../model/use-event-ui-state'
import { isDiplomaticCategory, isMilitaryCategory } from './category-utils'
import { FORM_STEPS, STEP_TITLES } from './constants'

/**
 * 단계별 타이틀 가져오기
 */
export const getStepTitle = (step: FormStep, category?: string): string => {
  if (step === FORM_STEPS.MILITARY) {
    if (isMilitaryCategory(category)) return '군사 정보'
    if (isDiplomaticCategory(category)) return '회담 정보'
    return '상세 정보'
  }

  return STEP_TITLES[step]
}

/**
 * 단계 유효성 검증 함수 맵
 */
export const createStepValidators = (context: {
  title: string
  startDate: string
  category: string
}) => {
  return {
    basic: () => {
      return !!(context.title.trim() && context.startDate)
    },
    military: () => true, // 선택 사항
    details: () => true, // 선택 사항
    location: () => true, // 선택 사항
    relationships: () => true, // 선택 사항
  }
}
