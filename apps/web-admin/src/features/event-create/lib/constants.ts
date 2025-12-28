/**
 * 이벤트 생성 관련 상수
 * FSD: features/event-create/lib
 */
import type { FormStep } from '../model/use-event-ui-state'

/**
 * 폼 단계 상수
 * - 타입 안전성 보장
 * - 오타 방지
 * - 리팩토링 용이
 */
export const FORM_STEPS = {
  BASIC: 'basic',
  MILITARY: 'military',
  DETAILS: 'details',
  LOCATION: 'location',
  RELATIONSHIPS: 'relationships',
} as const satisfies Record<string, FormStep>

/**
 * 카테고리 상수
 */
export const CATEGORIES = {
  MILITARY: 'military',
  DIPLOMATIC: 'diplomatic',
  CONFERENCE: 'conference',
  POLITICAL: 'political',
  ECONOMIC: 'economic',
  SOCIAL: 'social',
  CULTURAL: 'cultural',
  TECHNOLOGICAL: 'technological',
  RELIGIOUS: 'religious',
} as const

/**
 * 단계별 타이틀 맵
 */
export const STEP_TITLES: Record<FormStep, string> = {
  [FORM_STEPS.BASIC]: '기본 정보',
  [FORM_STEPS.MILITARY]: '상세 정보',
  [FORM_STEPS.DETAILS]: '내용 작성',
  [FORM_STEPS.LOCATION]: '위치 정보',
  [FORM_STEPS.RELATIONSHIPS]: '관계 설정',
}

/**
 * 카테고리별 군사/회담 단계 타이틀
 */
export const getMilitaryStepTitle = (category?: string): string => {
  if (category === CATEGORIES.MILITARY) return '군사 정보'
  if (
    category === CATEGORIES.DIPLOMATIC ||
    category === CATEGORIES.CONFERENCE
  ) {
    return '회담 정보'
  }
  return '상세 정보'
}
