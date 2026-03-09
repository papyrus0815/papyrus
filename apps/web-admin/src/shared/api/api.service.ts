import { useSessionStore } from '@/entities/session/session.store'
import { IConnection } from '@nestia/fetcher'

// Nestia SDK를 사용한 API 서비스
export class NestiaApiService {
  private connection: IConnection

  constructor(baseURL: string, token?: string) {
    this.connection = {
      host: baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      // 로그인 시 백엔드가 설정한 access_token 쿠키가 함께 전송되도록 (401 방지)
      options: { credentials: 'include' as RequestCredentials },
    }
  }

  // Axios 유사 인터페이스 호환 메서드 (일부 기존 코드 호환용)
  async get<T = any>(path: string): Promise<{ data: T }> {
    // 필요 시 path 스위칭하여 Nestia 함수로 연결
    // 현재는 사용처에서 대체되기 전 임시 방편으로 404 유사 에러를 던짐
    throw new Error(
      `GET ${path} is not supported by NestiaApiService. Replace with SDK call.`,
    )
  }

  // 토큰 업데이트
  updateToken(token: string) {
    this.connection.headers = {
      ...this.connection.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  // 기본 URL 업데이트
  updateBaseURL(baseURL: string) {
    this.connection.host = baseURL
  }

  // 현재 연결 정보 제공 (도메인 레이어에서 SDK 호출 시 사용)
  // 요청 시점에 저장소의 토큰이 있으면 반영 (rehydration 지연 또는 다른 탭 로그인 대응)
  getConnection(): IConnection {
    this.syncTokenFromStorage()
    return this.connection
  }

  /**
   * 매 요청 시점에 store/localStorage의 최신 토큰을 connection에 반영.
   * (한 번 설정 후 스킵하던 기존 로직은 재로그인·다른 탭 로그인·토큰 갱신 후에도
   * 이전 토큰이 쓰여 401이 나는 원인이 됨 → 항상 최신 토큰으로 덮어씀)
   */
  private syncTokenFromStorage(): void {
    if (typeof window === 'undefined') return

    let token: string | null = null
    try {
      token = useSessionStore.getState().token ?? null
      if (!token) {
        const persisted = localStorage.getItem('session-storage')
        if (persisted) {
          const parsed = JSON.parse(persisted)
          token = (parsed?.state?.token as string) ?? null
        }
      }
      if (!token) token = localStorage.getItem('token')
      const prev = this.connection.headers ?? {}
      const next = { ...prev } as Record<string, IConnection.HeaderValue>
      if (token) next['Authorization'] = `Bearer ${token}`
      else delete next['Authorization']
      this.connection.headers = next
    } catch {
      // ignore
    }
  }
}

// 환경 변수 체크 함수
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  const isElectron =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' ||
      (window as any).electron !== undefined)

  if (envUrl === '') {
    if (isElectron) return 'http://localhost:8000'
    return typeof window !== 'undefined' ? window.location.origin : ''
  }

  if (!envUrl || envUrl.trim() === '') {
    if (isElectron) return 'http://localhost:8000'
    return typeof window !== 'undefined' ? window.location.origin : ''
  }

  return envUrl
}

// 싱글톤 인스턴스
export const nestiaApiService = new NestiaApiService(getApiBaseUrl())
// 인증 훅은 도메인(session) 레이어로 이동했습니다.
