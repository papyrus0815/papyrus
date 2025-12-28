/**
 * 이벤트 생성/수정 시 유효성 검증 함수들
 * FSD: features/event-create/lib
 */
import { toast } from 'react-hot-toast'

/**
 * 기본 정보 유효성 검증
 */
export const validateBasicInfo = (data: {
  title: string
  startDate: string
}): boolean => {
  if (!data.title.trim()) {
    toast.error('사건명을 입력해주세요.')
    return false
  }

  if (!data.startDate) {
    toast.error('시작일을 입력해주세요.')
    return false
  }

  return true
}

/**
 * 날짜 범위 유효성 검증
 */
export const validateDateRange = (
  startDate: string,
  endDate: string | undefined,
): boolean => {
  if (!endDate) return true

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end < start) {
    toast.error('종료일은 시작일보다 이후여야 합니다.')
    return false
  }

  return true
}
