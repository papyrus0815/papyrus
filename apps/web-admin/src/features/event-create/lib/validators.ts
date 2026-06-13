/**
 * 이벤트 생성/수정 시 유효성 검증 함수들
 * FSD: features/event-create/lib
 */
import { compareByDate } from '@/shared/lib/iso-date'
import { notify } from '@/shared/ui/toast'

/**
 * 기본 정보 유효성 검증 결과 — 어느 필드가 왜 막혔는지 사용자에게 표시할 수 있도록 구조화.
 * `firstError`는 toast 등 1회성 안내용. `fields`로는 inline 에러 표시 가능.
 */
export interface BasicInfoValidationResult {
  ok: boolean
  fields: { title?: string; startDate?: string; endDate?: string }
  firstError?: string
}

export const checkBasicInfo = (data: {
  title: string
  startDate: string
  endDate?: string
}): BasicInfoValidationResult => {
  const fields: BasicInfoValidationResult['fields'] = {}
  if (!data.title.trim()) {
    fields.title = '사건명을 입력해주세요.'
  }
  if (!data.startDate) {
    fields.startDate = '시작일을 선택해주세요.'
  }
  // 종료일이 시작일보다 이전이면 inline 에러 — 제출 시점 toast만으론 잡기 어려움.
  // BC/고대 날짜는 네이티브 Date가 NaN이 되므로 iso-date 유틸로 비교.
  if (
    data.startDate &&
    data.endDate &&
    compareByDate(data.startDate, data.endDate) > 0
  ) {
    fields.endDate = '종료일은 시작일보다 이후여야 합니다.'
  }
  const ok = Object.keys(fields).length === 0
  return {
    ok,
    fields,
    firstError: fields.title ?? fields.startDate ?? fields.endDate,
  }
}

/**
 * 기본 정보 유효성 검증 — 호환 유지용. 토스트는 제출 시점에서만 띄움.
 */
export const validateBasicInfo = (data: {
  title: string
  startDate: string
}): boolean => {
  const result = checkBasicInfo(data)
  if (!result.ok && result.firstError) {
    notify.error(result.firstError)
  }
  return result.ok
}

/**
 * 날짜 범위 유효성 검증
 */
export const validateDateRange = (
  startDate: string,
  endDate: string | undefined,
): boolean => {
  if (!endDate) return true

  // BC/고대 날짜 안전 비교 (네이티브 Date는 음수 연도에서 NaN)
  if (compareByDate(startDate, endDate) > 0) {
    notify.error('종료일은 시작일보다 이후여야 합니다.')
    return false
  }

  return true
}
