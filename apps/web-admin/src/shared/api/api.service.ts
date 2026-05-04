import { useSessionStore } from '@/entities/session/session.store'
import { IConnection } from '@nestia/fetcher'

const REFRESH_PATH = '/auth/refresh'

// 401 시 refresh(쿠키) 후 한 번 재시도하는 fetch 래퍼 (토큰 만료 시 자동 복구)
function createFetchWithRefresh(getConnection: () => IConnection): typeof fetch {
  let refreshPromise: Promise<boolean> | null = null

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    const isRefresh = url.includes(REFRESH_PATH)

    let res = await fetch(input, init)

    if (res.status === 401 && !isRefresh && typeof window !== 'undefined') {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const conn = getConnection()
            const base = conn.host.replace(/\/$/, '')
            const r = await fetch(`${base}${REFRESH_PATH}`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            })
            return r.ok
          } finally {
            refreshPromise = null
          }
        })()
      }
      const ok = await refreshPromise
      if (ok) res = await fetch(input, init)
    }

    return res
  }
}

// Nestia SDK를 사용한 API 서비스
export class NestiaApiService {
  private connection: IConnection
  private baseURL: string

  constructor(baseURL: string, token?: string) {
    this.baseURL = baseURL
    this.connection = {
      host: baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      options: { credentials: 'include' as RequestCredentials },
      fetch: createFetchWithRefresh(() => {
        this.syncTokenFromStorage()
        return this.connection
      }),
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
    this.connection.options = { ...this.connection.options, credentials: 'include' as RequestCredentials }
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
    if (isElectron) return 'http://localhost:4242'
    return typeof window !== 'undefined' ? window.location.origin : ''
  }

  if (!envUrl || envUrl.trim() === '') {
    if (isElectron) return 'http://localhost:4242'
    return typeof window !== 'undefined' ? window.location.origin : ''
  }

  return envUrl
}

// 싱글톤 인스턴스
export const nestiaApiService = new NestiaApiService(getApiBaseUrl())
// 인증 훅은 도메인(session) 레이어로 이동했습니다.
