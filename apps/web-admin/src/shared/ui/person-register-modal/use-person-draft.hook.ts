/**
 * 인물 등록/수정 폼 임시 저장(draft) 훅.
 * - 폼 상태가 dirty해질 때 throttled로 localStorage에 보관.
 * - 진입 시 저장된 draft가 있으면 사용자에게 복원 여부를 묻는 패턴.
 * - 썸네일 파일(File 객체)·blob URL은 직렬화 불가 — draft 대상에서 제외.
 *
 * key: papyrus:person-register-draft:<editPersonId | 'new'>
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const KEY_PREFIX = 'papyrus:person-register-draft:'
const SAVE_THROTTLE_MS = 500

export type PersonDraftValue = Record<string, unknown>

export interface PersonDraftEnvelope<T extends PersonDraftValue> {
  savedAt: number
  version: number
  data: T
}

const DRAFT_VERSION = 1

function readDraft<T extends PersonDraftValue>(
  key: string,
): PersonDraftEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersonDraftEnvelope<T>
    if (parsed?.version !== DRAFT_VERSION) return null
    if (!parsed.data) return null
    return parsed
  } catch {
    return null
  }
}

function writeDraft<T extends PersonDraftValue>(key: string, data: T) {
  try {
    const env: PersonDraftEnvelope<T> = {
      savedAt: Date.now(),
      version: DRAFT_VERSION,
      data,
    }
    localStorage.setItem(key, JSON.stringify(env))
  } catch {
    // 용량 초과·차단 — 조용히 무시.
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

interface UsePersonDraftArgs<T extends PersonDraftValue> {
  /** 'new' 또는 인물 ID — 신규/수정 분리 */
  scopeId: string
  /** 직렬화 대상 — 호출 시점의 폼 값 스냅샷 반환 */
  getSnapshot: () => T
  /** 저장 트리거 — true면 throttled save, false면 무시 */
  enabled: boolean
}

/**
 * dirty 시 throttled save, 외부에서 restore/clear 직접 호출 가능한 훅.
 */
export function usePersonDraft<T extends PersonDraftValue>(
  args: UsePersonDraftArgs<T>,
) {
  const { scopeId, getSnapshot, enabled } = args
  const key = KEY_PREFIX + scopeId
  const getSnapshotRef = useRef(getSnapshot)
  getSnapshotRef.current = getSnapshot
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  /** dirty 트리거 시 호출 — 디바운스로 저장. */
  const scheduleSave = useCallback(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const snapshot = getSnapshotRef.current()
      writeDraft(key, snapshot)
      setSavedAt(Date.now())
    }, SAVE_THROTTLE_MS)
  }, [enabled, key])

  /** 진입 시 저장된 draft 읽기 (한 번만 호출 — 사용자 응답 후 결정). */
  const peekDraft = useCallback(
    () => readDraft<T>(key),
    [key],
  )

  /** 저장된 draft 비우기. 등록 성공·사용자 거부 시 호출. */
  const discardDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    clearDraft(key)
    setSavedAt(null)
  }, [key])

  // 언마운트 시 보류 중 타이머 정리. 즉시 저장은 하지 않음 — 사용자가 의도적으로
  // 페이지를 떠난 경우 굳이 마지막 입력을 강제로 저장할 이유가 없음.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return {
    scheduleSave,
    peekDraft,
    discardDraft,
    savedAt,
  }
}
