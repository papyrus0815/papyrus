/**
 * EventCreatePage 유틸리티 함수
 */
import type { HistoricalEventCategory } from './create/events.types'

export const getApiHost = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  console.log('🔍 VITE_API_BASE_URL:', envUrl, typeof envUrl)

  if (envUrl === '') {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    console.log('✅ 빈 문자열 → origin 사용:', origin)
    return origin
  }

  if (envUrl) {
    console.log('✅ 환경변수 사용:', envUrl)
    return envUrl
  }

  console.log('⚠️ 기본값 사용: http://localhost:8000')
  return 'http://localhost:8000'
}

export const getImageUrl = (url: string): string => {
  console.log('🔍 getImageUrl 입력:', url)

  // 절대 URL(http://, https://, blob:)은 그대로 반환
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:')
  ) {
    console.log('✅ 절대 URL 반환:', url)
    return url
  }

  // 상대 경로(/uploads/...)는 그대로 반환하여 Vite 프록시가 처리하도록 함
  // Vite는 /uploads를 자동으로 API 서버(localhost:8000 또는 네트워크 IP)로 프록시
  if (url.startsWith('/')) {
    console.log('✅ 상대 경로 그대로 반환:', url)
    return url
  }

  // / 없이 시작하는 경로는 / 추가
  const relativePath = `/${url}`
  console.log('✅ 상대 경로로 변환:', relativePath)
  return relativePath
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
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}년 ${month}월 ${day}일`
  } catch {
    return dateString
  }
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
