/**
 * API 클라이언트 설정
 * Nestia SDK를 사용하여 타입 안전한 API 호출
 */

import type { IConnection } from '@api/IConnection'

// API 연결 설정 함수 (api.service.ts와 동일한 로직)
function getApiHost(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  // 환경 변수가 빈 문자열이면 현재 origin 사용 (프록시를 통함)
  if (envUrl === '') {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    console.log('🔗 Countries/Continents API Connection (현재 origin):', origin)

    return origin
  }

  // 환경 변수가 설정되어 있으면 그 값 사용
  if (envUrl) {
    console.log('🔗 Countries/Continents API Connection (환경 변수):', envUrl)

    return envUrl
  }

  // 기본값
  const fallback = 'http://localhost:8000'
  console.log('🔗 Countries/Continents API Connection (기본값):', fallback)

  return fallback
}

// API 연결 설정
export const apiConnection: IConnection = {
  host: getApiHost(),
}
