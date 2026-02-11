import { nestiaApiService } from '@/shared/api/api.service'

/**
 * 애플리케이션 시작 시 저장소의 토큰을 API 클라이언트에 연결합니다.
 * FSD 원칙상 인증 토큰 복원은 도메인(Session) 쪽에서 관리하고,
 * 전송 계층(shared/api)은 순수 전달 역할만 하도록 분리합니다.
 */
export function attachAuthInterceptor(): void {
  if (typeof window === 'undefined') return

  try {
    // 최신: zustand persist 저장소에서 토큰 복원
    const persisted = localStorage.getItem('session-storage')
    if (persisted) {
      const parsed = JSON.parse(persisted)
      const token = parsed?.state?.token as string | undefined
      if (token) {
        nestiaApiService.updateToken(token)
        return
      }
    }
  } catch {
    // ignore
  }

  // 구버전 호환: 단일 'token' 키를 사용하는 경우
  const legacyToken = localStorage.getItem('token')
  if (legacyToken) {
    nestiaApiService.updateToken(legacyToken)
  }
}
