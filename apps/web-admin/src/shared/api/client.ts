/**
 * API 클라이언트 설정
 * Nestia SDK를 사용하여 타입 안전한 API 호출
 */

import type { IConnection } from '@api/IConnection'
import { nestiaApiService } from './api.service'

// API 연결 설정 함수 (api.service.ts와 동일한 로직)
function getApiHost(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  // 환경 변수가 빈 문자열이면 현재 origin 사용 (프록시를 통함)
  if (envUrl === '') {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
  if (envUrl) {
    return envUrl
  }
  return 'http://localhost:8000'
}

// API 연결 (host만, 인증 불필요한 경우용)
export const apiConnection: IConnection = {
  host: getApiHost(),
}

/** 인증이 필요한 API 호출 시 사용 (JWT가 connection에 포함됨) */
export const getApiConnection = (): IConnection =>
  nestiaApiService.getConnection()
