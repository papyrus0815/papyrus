/**
 * heads-of-state 위젯의 localStorage 통합 헬퍼.
 *
 * - 키 prefix를 한 곳에서 관리해 다른 위젯과 충돌 방지
 * - JSON parse 실패·시크릿 모드 등 예외를 한 번에 흡수
 * - 향후 스키마 변경 시 마이그레이션은 read 함수 안에서만 처리하면 됨
 */

const PREFIX = 'heads-of-state-timeline:'

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    // ignore quota/private mode
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(`${PREFIX}${key}`)
  } catch {
    // ignore
  }
}

/**
 * 첫 진입 시 v1 → v2 같은 키 마이그레이션을 한 번만 실행.
 * `migrate(oldKey, newKey, transform)` 호출 시 oldKey 데이터를 newKey로 옮기고 oldKey는 삭제.
 */
export function migrateKey<T>(
  fromKey: string,
  toKey: string,
  transform: (raw: unknown) => T | null,
): void {
  if (typeof window === 'undefined') return
  try {
    const fromFull = `${PREFIX}${fromKey}`
    const toFull = `${PREFIX}${toKey}`
    const existing = window.localStorage.getItem(toFull)
    if (existing) return // 이미 v2 있으면 마이그레이션 불필요
    const raw = window.localStorage.getItem(fromFull)
    if (!raw) return
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    const result = transform(parsed)
    if (result == null) return
    window.localStorage.setItem(toFull, JSON.stringify(result))
    window.localStorage.removeItem(fromFull)
  } catch {
    // ignore
  }
}
