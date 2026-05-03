/**
 * RHF 폼 데이터를 localStorage에 자동 저장·복원하는 훅.
 *
 * - create 모드 전용 (수정 모드는 서버 데이터를 신뢰)
 * - 모달이 닫히거나 저장 성공 시 clear() 호출
 * - 빈 폼 상태로 새로 열릴 때만 복원 (사용자가 작성 중이면 덮어쓰지 않음)
 */
import { useCallback, useEffect } from 'react'

const DRAFT_PREFIX = 'papyrus.draft.'

export interface FormDraftOptions<T> {
  /** localStorage 키 식별자 (예: 'country-create', 'historical-country-create') */
  key: string
  /** 활성화 여부 — false면 아무 동작 안 함 (수정 모드에서 끄기 위함) */
  enabled: boolean
  /** 현재 폼 값 (RHF watch() 결과 등) */
  values: T
  /** 복원 시 호출 — RHF reset(restored) 등 */
  onRestore: (restored: T) => void
}

/**
 * 사용 예:
 * ```ts
 * useFormDraft({
 *   key: 'country-create',
 *   enabled: mode === 'create' && isOpen,
 *   values: watch(),
 *   onRestore: (data) => reset(data),
 * })
 * ```
 *
 * 반환된 `clear()`를 저장 성공 시 호출해야 stale draft가 남지 않음.
 */
export function useFormDraft<T extends object>({
  key,
  enabled,
  values,
  onRestore,
}: FormDraftOptions<T>) {
  const storageKey = `${DRAFT_PREFIX}${key}`

  // 마운트 시 한 번만 복원 시도
  useEffect(() => {
    if (!enabled) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as T
      onRestore(parsed)
    } catch {
      // 파싱 실패 → 무시 (오염된 draft는 다음 저장에서 덮어씀)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enabled 변경 시(create 모드 진입)에만 복원
  }, [enabled, storageKey])

  // 값이 바뀔 때마다 저장 (debounce 없이도 저렴 — JSON.stringify는 폼 크기에서 무시 가능)
  useEffect(() => {
    if (!enabled) return
    try {
      // 빈 객체이거나 모든 값이 falsy면 저장 안 함 (오염 방지)
      const hasAnyValue = Object.values(values as Record<string, unknown>).some(
        (v) =>
          v != null &&
          v !== '' &&
          !(Array.isArray(v) && v.length === 0),
      )
      if (!hasAnyValue) {
        localStorage.removeItem(storageKey)
        return
      }
      localStorage.setItem(storageKey, JSON.stringify(values))
    } catch {
      // localStorage 용량 초과 등 — 무시
    }
  }, [enabled, storageKey, values])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // 무시
    }
  }, [storageKey])

  return { clear }
}
