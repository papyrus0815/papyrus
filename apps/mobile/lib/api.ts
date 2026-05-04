import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { getAccessToken, clearTokens } from './auth-storage'

/**
 * baseURL 결정 우선순위:
 * 1) EXPO_PUBLIC_API_BASE_URL 환경변수 (있으면 그대로 사용 — staging/prod에서 명시적 지정용)
 * 2) __DEV__ 모드: Expo dev server hostUri에서 호스트 추출 + EXPO_PUBLIC_API_PORT(기본 8000)
 *    - iOS 시뮬레이터: hostUri="localhost:8081" → http://localhost:8000
 *    - Android 에뮬레이터: hostUri="10.0.2.2:8081" → http://10.0.2.2:8000
 *    - 실기기 (LAN): hostUri="192.168.x.y:8081" → http://192.168.x.y:8000
 */

const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '8000'

function getDevHost(): string | null {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { hostUri?: string } }).expoGoConfig?.hostUri ??
    null
  if (!hostUri) return null
  const host = hostUri.split(':')[0]
  return host || null
}

function resolveBaseURL(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL
  if (explicit && explicit.trim()) return explicit.trim()
  if (__DEV__) {
    const host = getDevHost()
    if (host) return `http://${host}:${API_PORT}`
  }
  return undefined
}

const baseURL = resolveBaseURL()

if (!baseURL) {
  console.warn('[api] baseURL을 결정할 수 없습니다 — EXPO_PUBLIC_API_BASE_URL을 설정하세요')
} else if (__DEV__) {
  console.log(`[api] baseURL=${baseURL}`)
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      await clearTokens()
      onUnauthorized?.()
    }
    return Promise.reject(err)
  },
)
