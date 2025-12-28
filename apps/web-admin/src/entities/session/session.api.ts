import { queryOptions } from '@tanstack/react-query'

import { nestiaApiService } from '@/shared/api/api.service'
import { queryClient } from '@/shared/queryClient'
import * as api from '@api'

import { sessionKeys } from './session.keys'
import type { User } from './session.model'

/**
 * ⚙️ 현재 세션(로그인 사용자) 정보를 가져오는 쿼리 옵션 모음.
 * 이 객체 하나로 useQuery, prefetchQuery 등 어디서든 재사용 가능.
 */
export const sessionQueryOptions = queryOptions({
  /**
   * 🔑 쿼리 캐시를 위한 고유 식별 키.
   * `sessionKeys` 팩토리로 관리하여 일관성 유지.
   */
  queryKey: sessionKeys.currentUser(),

  /**
   * 🚀 데이터를 실제로 가져오는 비동기 함수 (Promise 반환 필수).
   * @param signal 요청 취소 신호를 받기 위한 AbortSignal.
   */
  queryFn: async ({ signal }) => {
    // 1. API 호출: Nestia SDK를 사용하여 서버에서 데이터 수신
    // Authorization 헤더가 없으면 불필요 요청 방지
    const conn = nestiaApiService.getConnection()
    if (!conn.headers?.Authorization) throw new Error('No authorization token')
    const userDto = await api.functional.account.me(conn)

    // 2. DTO를 그대로 User 타입으로 사용 (SDK 직접 사용 정책)
    return userDto as User
  },

  /**
   * ⏱️ 데이터가 fresh 상태로 유지되는 시간 (ms).
   * 이 시간 내에는 불필요한 API 재요청 방지. (현재 5분)
   */
  staleTime: 1000 * 60 * 5,

  /**
   * ✨ 쿼리 첫 로딩 시 사용할 초기 데이터.
   * 캐시에 데이터가 있으면 로딩 상태 없이 바로 UI 표시.
   */
  initialData: () => queryClient.getQueryData<User>(sessionKeys.currentUser()),

  /**
   * 🗓️ initialData의 최종 업데이트 시점.
   * 이 타임스탬프를 기준으로 staleTime 계산 시작.
   */
  initialDataUpdatedAt: () =>
    queryClient.getQueryState(sessionKeys.currentUser())?.dataUpdatedAt,

  /**
   * 🚫 401 Unauthorized 에러 시 재시도하지 않도록 설정
   */
  retry: (failureCount: number, error: Error) => {
    // 401 에러 (Unauthorized)인 경우 재시도하지 않음
    const errorWithStatus = error as Error & { status?: number }
    if (errorWithStatus?.status === 401 || error?.message?.includes('401')) {
      return false
    }
    // 다른 에러는 최대 1번만 재시도
    return failureCount < 1
  },

  /**
   * 🔄 재시도 간격 (ms)
   */
  retryDelay: 1000,
})

/**
 * 인증 도메인 API: 로그인/세션/리프레시는 세션 도메인에서 캡슐화.
 * 전송 계층은 shared/api에서 담당하고, 도메인 오케스트레이션은 여기서 처리.
 */
export const sessionApi = {
  async login(body: api.functional.auth.login.Body) {
    const conn = nestiaApiService.getConnection()
    return api.functional.auth.login(conn, body)
  },
  async getSession() {
    const conn = nestiaApiService.getConnection()
    return api.functional.auth.session(conn)
  },
  async refresh() {
    const conn = nestiaApiService.getConnection()
    return api.functional.auth.refresh(conn)
  },
  async me() {
    const conn = nestiaApiService.getConnection()
    return api.functional.account.me(conn)
  },
}
