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
   * store 또는 localStorage에 토큰이 있으면 connection에 반영 (Authorization 없을 때만)
   */
  private syncTokenFromStorage(): void {
    if (typeof window === 'undefined') return
    if (this.connection.headers?.Authorization) return

    let token: string | null = null

    try {
      // 1) Zustand store에서 먼저 확인 (로그인 직후 persist 지연 대응)
      token = useSessionStore.getState().token ?? null
      // 2) localStorage (reload 후 복원)
      if (!token) {
        const persisted = localStorage.getItem('session-storage')
        if (persisted) {
          const parsed = JSON.parse(persisted)
          token = (parsed?.state?.token as string) ?? null
        }
      }
      if (!token) token = localStorage.getItem('token')
      if (token) {
        this.connection.headers = {
          ...this.connection.headers,
          Authorization: `Bearer ${token}`,
        }
      }
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
