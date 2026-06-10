/**
 * EventCreatePage 유틸리티 함수
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import type { HistoricalEventCategory } from '../create/events.types'

export const getApiHost = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (envUrl === '') {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }

  if (envUrl) {
    return envUrl
  }

  return 'http://localhost:8000'
}

export const getImageUrl = (url: string): string => {
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:')
  ) {
    return url
  }
  if (url.startsWith('/')) {
    return url
  }
  return `/${url}`
}

/**
 * 카테고리 이름을 그대로 반환합니다.
 * 서버에서 받은 카테고리 이름을 직접 사용합니다.
 */
export const mapCategoryNameToType = (
  categoryName: string,
): HistoricalEventCategory => {
  return categoryName
}

export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return ''
  const parts = parseIsoDateParts(dateString)
  if (!parts) return dateString
  return `${parts.year}년 ${parts.month}월 ${parts.day}일`
}

export const calculateDaysDifference = (
  startDate: string,
  endDate: string,
): number | null => {
  if (!startDate || !endDate) return null

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

export const getDateError = (
  startDate: string,
  endDate: string,
): string | null => {
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return '종료일은 시작일보다 이후여야 합니다'
  }
  return null
}
