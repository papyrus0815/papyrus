import type * as api from '@api'

// Nestia SDK 타입 매핑
export type User = api.functional.account.me.Output
export type LoginRequest = api.functional.auth.login.Body
export type LoginResponse = api.functional.auth.login.Output
export type SessionResponse = api.functional.auth.session.Output

// 기존 모델 로직 유지
export interface SessionState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export const initialSessionState: SessionState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}
