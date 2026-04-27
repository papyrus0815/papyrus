/**
 * 사건 등록/수정 폼의 자동 임시 저장(Autosave) 유틸.
 *
 * 사용자가 폼을 작성하다 탭을 닫거나 새로고침해도 다음 진입 시 복원할 수 있게
 * localStorage에 직렬화된 스냅샷을 둔다. beforeunload 경고와 별개로, 강제
 * 종료/네트워크 단절 같은 케이스를 보완.
 *
 * - 키: 신규 등록은 `event-draft:create`, 편집은 `event-draft:edit:<id>`
 * - 값: { savedAt: ISO, payload: <임의 JSON> }
 * - 저장 실패(quota 초과, 시크릿 모드 등)는 무시(콘솔 경고만).
 */

const PREFIX = 'event-draft:'
const MAX_SIZE = 1_000_000 // ~1MB; 초과 시 저장 생략

export interface EventDraftEnvelope<T> {
  savedAt: string
  payload: T
}

export const getDraftKey = (editEventId?: string): string =>
  editEventId ? `${PREFIX}edit:${editEventId}` : `${PREFIX}create`

export const saveDraft = <T>(key: string, payload: T): void => {
  if (typeof window === 'undefined') return
  try {
    const env: EventDraftEnvelope<T> = {
      savedAt: new Date().toISOString(),
      payload,
    }
    const json = JSON.stringify(env)
    if (json.length > MAX_SIZE) return // 너무 크면 저장 생략
    window.localStorage.setItem(key, json)
  } catch (e) {
    // quota / 시크릿 모드 등에서 실패할 수 있음 — 진단용 경고만
    console.warn('[event-draft] 저장 실패:', e)
  }
}

export const loadDraft = <T>(
  key: string,
): EventDraftEnvelope<T> | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as EventDraftEnvelope<T>
  } catch (e) {
    console.warn('[event-draft] 로드 실패:', e)
    return null
  }
}

export const clearDraft = (key: string): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}
