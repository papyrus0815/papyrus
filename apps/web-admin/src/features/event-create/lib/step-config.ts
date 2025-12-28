/**
 * 폼 단계 설정
 * FSD: features/event-create/lib
 */
import type { IconType } from 'react-icons'
import {
  FiFileText,
  FiGlobe,
  FiLayers,
  FiMapPin,
  FiShield,
} from 'react-icons/fi'

import type { FormStep } from '../model/use-event-ui-state'
import { isDiplomaticCategory, isMilitaryCategory } from './category-utils'
import { FORM_STEPS } from './constants'

export interface Step {
  id: FormStep
  label: string
  icon: IconType
}

/**
 * 카테고리에 따른 폼 단계 목록 생성
 */
export const getFormSteps = (category?: string): Step[] => {
  const allSteps: Step[] = [
    {
      id: FORM_STEPS.BASIC,
      label: '기본 정보',
      icon: FiFileText,
    },
    {
      id: FORM_STEPS.MILITARY,
      label: isMilitaryCategory(category)
        ? '군사 정보'
        : isDiplomaticCategory(category)
          ? '회담 정보'
          : '상세 정보',
      icon: isMilitaryCategory(category)
        ? FiShield
        : isDiplomaticCategory(category)
          ? FiGlobe
          : FiLayers,
    },
    {
      id: FORM_STEPS.DETAILS,
      label: '내용 작성',
      icon: FiLayers,
    },
    {
      id: FORM_STEPS.LOCATION,
      label: '위치 정보',
      icon: FiMapPin,
    },
    {
      id: FORM_STEPS.RELATIONSHIPS,
      label: '관계 설정',
      icon: FiGlobe,
    },
  ]

  // 군사/회담/외교 카테고리가 아니면 두 번째 단계 숨김
  return allSteps.filter((step) => {
    if (step.id === FORM_STEPS.MILITARY) {
      return isMilitaryCategory(category) || isDiplomaticCategory(category)
    }
    return true
  })
}
