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
    console.log('🔧 API 서비스 토큰 업데이트 시작:', token ? '***' : null)

    this.connection.headers = {
      ...this.connection.headers,
      Authorization: `Bearer ${token}`,
    }

    console.log('✅ API 서비스 토큰 업데이트 완료')
    console.log('🔍 현재 연결 헤더 확인:', {
      host: this.connection.host,
      hasAuth: !!this.connection.headers.Authorization,
      authType: this.connection.headers.Authorization ? 'Bearer ***' : 'None',
    })
  }

  // 기본 URL 업데이트
  updateBaseURL(baseURL: string) {
    this.connection.host = baseURL
  }

  // 현재 연결 정보 제공 (도메인 레이어에서 SDK 호출 시 사용)
  getConnection(): IConnection {
    return this.connection
  }
}

// 환경 변수 체크 함수
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  console.log('🔍 VITE_API_BASE_URL 원본 값:', envUrl)
  console.log('🔍 envUrl 타입:', typeof envUrl)
  console.log('🔍 envUrl === "":', envUrl === '')

  // Electron 환경 감지
  const isElectron =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' ||
      (window as any).electron !== undefined)

  if (isElectron) {
    console.log('🖥️ Electron 환경 감지됨')
  }

  // 환경 변수가 명시적으로 빈 문자열이면 현재 origin 사용 (프록시를 통함)
  if (envUrl === '') {
    // Electron에서는 file:// 프로토콜이므로 localhost 사용
    if (isElectron) {
      const fallbackUrl = 'http://localhost:8000'
      console.log('✅ Electron 환경: 기본 API URL 사용:', fallbackUrl)

      return fallbackUrl
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    console.log(
      '✅ API 요청을 프록시를 통해 전송합니다 (현재 origin 사용):',
      origin,
    )

    return origin
  }

  if (!envUrl || envUrl.trim() === '') {
    // Electron 환경에서는 localhost 사용
    if (isElectron) {
      const fallbackUrl = 'http://localhost:8000'
      console.warn(
        '⚠️ Electron 환경: VITE_API_BASE_URL이 설정되지 않아 기본값 사용:',
        fallbackUrl,
      )

      return fallbackUrl
    }

    // 환경 변수가 없으면 현재 origin 사용
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    console.warn(
      '⚠️ VITE_API_BASE_URL 환경 변수가 설정되지 않았습니다. 현재 origin을 사용합니다:',
      origin,
    )

    return origin
  }

  console.log('🔍 VITE_API_BASE_URL을 그대로 사용:', envUrl)

  return envUrl
}

// 싱글톤 인스턴스
export const nestiaApiService = new NestiaApiService(getApiBaseUrl())
// 인증 훅은 도메인(session) 레이어로 이동했습니다.
