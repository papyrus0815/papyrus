import Constants from 'expo-constants'

/**
 * WebView가 로드할 web-admin URL 결정 (lib/api.ts의 baseURL 결정과 동일한 패턴).
 *
 * 우선순위:
 * 1) EXPO_PUBLIC_WEB_URL — 있으면 그대로 사용 (staging/prod 배포 URL 명시 지정)
 * 2) __DEV__ 모드: Expo dev server hostUri에서 호스트 추출 + EXPO_PUBLIC_WEB_PORT(기본 3000)
 *    - iOS 시뮬레이터:    hostUri="localhost:8081"       → http://localhost:3000
 *    - Android 에뮬레이터: hostUri="10.0.2.2:8081"        → http://10.0.2.2:3000
 *    - 실기기 (LAN):      hostUri="192.168.x.y:8081"     → http://192.168.x.y:3000
 *
 * web-admin dev 서버 포트는 루트 scripts(WEB_PORT)와 동일한 3000 기본값.
 */

const WEB_PORT = process.env.EXPO_PUBLIC_WEB_PORT ?? '3000'

function getDevHost(): string | null {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { hostUri?: string } }).expoGoConfig?.hostUri ??
    null
  if (!hostUri) return null
  const host = hostUri.split(':')[0]
  return host || null
}

export function resolveWebUrl(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_WEB_URL
  if (explicit && explicit.trim()) return explicit.trim()
  if (__DEV__) {
    const host = getDevHost()
    if (host) return `http://${host}:${WEB_PORT}`
  }
  return undefined
}
