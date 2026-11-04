/**
 * 사건 등록 폼 임시 저장(localStorage draft) 훅 및 순수 헬퍼.
 *
 * - 신규 등록 모드(!isEditMode)에서 폼이 수정(isDirty)될 때 디바운스(400ms)로 자동 저장한다.
 * - 모달이 갑자기 닫히거나 탭이 닫힐 때(unmount / beforeunload) 대기 중인 변경이 있으면 즉시 flush한다.
 * - 재진입 시 유효한 초안이 있으면 상단 복원 바를 통해 원클릭으로 모든 필드를 이어 쓸 수 있다.
 * - 사건 등록 완료 시 또는 사용자가 '버리기'를 누를 때 초안을 정리한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  EventCountryParticipant,
  EventDomainKey,
  EventTypeKey,
} from '@/entities/event/model'
import type {
  EventRelatedDraft,
  RegisterFacetDrafts,
} from '@/features/event-facets/model/register-facets'
import type { EventParentPreset } from '@/widgets/event-form/ui/event-basic-form'

export type EventDatePrecision = 'year' | 'month' | 'day'

export const EVENT_DRAFT_STORAGE_KEY = 'papyrus:event-register-draft:new'
const DRAFT_VERSION = 1
const SAVE_DEBOUNCE_MS = 400
/** 30일 지난 초안은 자동 만료 */
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface EventDraftSnapshot {
  title: string
  description: string
  startDate: string
  startTime: string
  startDatePrecision: EventDatePrecision
  endDate: string
  endTime: string
  endDatePrecision: EventDatePrecision
  category: EventDomainKey | ''
  eventType: EventTypeKey | null
  kind: 'SINGLE' | 'COLLECTION'
  location?: string
  locationLatitude?: number | null
  locationLongitude?: number | null
  locationNote?: string
  thumbnail: string
  keywords: string[]
  relatedCountries: EventCountryParticipant[]
  parentEvent: EventParentPreset | null
  relatedEvents: EventRelatedDraft[]
  facetDrafts: RegisterFacetDrafts
}

export interface EventDraftEnvelope {
  version: number
  savedAt: number
  data: EventDraftSnapshot
}

/**
 * 직렬화 전 정제 — 세션이 끝나면 무효가 되는 `blob:` 미리보기 URL은 제외한다.
 */
export function sanitizeEventDraftSnapshot(
  snapshot: EventDraftSnapshot,
): EventDraftSnapshot {
  return {
    ...snapshot,
    thumbnail: snapshot.thumbnail?.startsWith('blob:') ? '' : snapshot.thumbnail,
  }
}

/**
 * 초안에 사용자가 입력한 유의미한 값이 하나라도 있는지 판정한다.
 */
export function hasEventDraftContent(
  snapshot: EventDraftSnapshot | null | undefined,
): boolean {
  if (!snapshot) return false
  if (snapshot.title?.trim()) return true
  if (snapshot.description?.trim()) return true
  if (snapshot.startDate) return true
  if (snapshot.endDate) return true
  if (snapshot.category) return true
  if (snapshot.eventType) return true
  if (snapshot.location?.trim()) return true
  if (snapshot.locationNote?.trim()) return true
  if (snapshot.locationLatitude != null || snapshot.locationLongitude != null) {
    return true
  }
  if (snapshot.thumbnail && !snapshot.thumbnail.startsWith('blob:')) return true
  if (Array.isArray(snapshot.keywords) && snapshot.keywords.length > 0) return true
  if (
    Array.isArray(snapshot.relatedCountries) &&
    snapshot.relatedCountries.length > 0
  ) {
    return true
  }
  if (snapshot.parentEvent?.id) return true
  if (Array.isArray(snapshot.relatedEvents) && snapshot.relatedEvents.length > 0) {
    return true
  }
  const facets = snapshot.facetDrafts
  if (facets) {
    if (
      facets.sides?.names?.[0]?.trim() ||
      facets.sides?.names?.[1]?.trim() ||
      Object.keys(facets.sides?.assignment ?? {}).length > 0
    ) {
      return true
    }
    if (facets.treaty && facets.treaty.mode !== 'none') return true
    if (Array.isArray(facets.power) && facets.power.length > 0) return true
    if (Array.isArray(facets.persons) && facets.persons.length > 0) return true
    if (Array.isArray(facets.organizations) && facets.organizations.length > 0) {
      return true
    }
    if (facets.election) return true
  }
  return false
}

export function readEventDraft(
  storageKey = EVENT_DRAFT_STORAGE_KEY,
): EventDraftEnvelope | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EventDraftEnvelope
    if (parsed?.version !== DRAFT_VERSION || !parsed.data) {
      window.localStorage.removeItem(storageKey)
      return null
    }
    if (
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(storageKey)
      return null
    }
    if (!hasEventDraftContent(parsed.data)) {
      window.localStorage.removeItem(storageKey)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeEventDraft(
  snapshot: EventDraftSnapshot,
  storageKey = EVENT_DRAFT_STORAGE_KEY,
): number | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  const sanitized = sanitizeEventDraftSnapshot(snapshot)
  if (!hasEventDraftContent(sanitized)) return null
  const savedAt = Date.now()
  try {
    const envelope: EventDraftEnvelope = {
      version: DRAFT_VERSION,
      savedAt,
      data: sanitized,
    }
    window.localStorage.setItem(storageKey, JSON.stringify(envelope))
    return savedAt
  } catch {
    return null
  }
}

export function clearEventDraft(storageKey = EVENT_DRAFT_STORAGE_KEY): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // ignore
  }
}

export function formatDraftRelativeTime(
  savedAt: number,
  now = Date.now(),
): string {
  const diffSec = Math.max(0, Math.floor((now - savedAt) / 1000))
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

export function formatDraftSummaryLabel(data: EventDraftSnapshot): string {
  const trimmedTitle = data.title?.trim()
  if (trimmedTitle) return `‘${trimmedTitle}’`
  const trimmedDesc = data.description?.trim()
  if (trimmedDesc) {
    const preview =
      trimmedDesc.length > 22 ? `${trimmedDesc.slice(0, 22)}…` : trimmedDesc
    return `‘${preview}’`
  }
  if (data.startDate) return `${data.startDate} 사건 초안`
  return '작성 중이던 사건 초안'
}

interface UseEventDraftOptions {
  enabled: boolean
  isDirty: boolean
  getSnapshot: () => EventDraftSnapshot
  storageKey?: string
}

export function useEventDraft({
  enabled,
  isDirty,
  getSnapshot,
  storageKey = EVENT_DRAFT_STORAGE_KEY,
}: UseEventDraftOptions) {
  const getSnapshotRef = useRef(getSnapshot)
  getSnapshotRef.current = getSnapshot
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPendingSaveRef = useRef(false)

  const [pendingDraft, setPendingDraft] = useState<EventDraftEnvelope | null>(
    () => (enabled ? readEventDraft(storageKey) : null),
  )
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!enabledRef.current || !isDirtyRef.current) {
      hasPendingSaveRef.current = false
      return null
    }
    const snapshot = getSnapshotRef.current()
    const savedAt = writeEventDraft(snapshot, storageKey)
    hasPendingSaveRef.current = false
    if (savedAt !== null) {
      setLastSavedAt(savedAt)
    }
    return savedAt
  }, [storageKey])

  const scheduleSave = useCallback(() => {
    if (!enabledRef.current || !isDirtyRef.current) return
    hasPendingSaveRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      if (!enabledRef.current || !isDirtyRef.current) {
        hasPendingSaveRef.current = false
        return
      }
      const snapshot = getSnapshotRef.current()
      const savedAt = writeEventDraft(snapshot, storageKey)
      hasPendingSaveRef.current = false
      if (savedAt !== null) {
        setLastSavedAt(savedAt)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [storageKey])

  const discardDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    hasPendingSaveRef.current = false
    clearEventDraft(storageKey)
    setPendingDraft(null)
    setLastSavedAt(null)
  }, [storageKey])

  const consumePendingDraft = useCallback((): EventDraftEnvelope | null => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    hasPendingSaveRef.current = false
    const current = pendingDraft ?? readEventDraft(storageKey)
    setPendingDraft(null)
    if (current) {
      writeEventDraft(current.data, storageKey)
      setLastSavedAt(current.savedAt)
    }
    return current
  }, [pendingDraft, storageKey])

  // 언마운트 또는 탭 종료 시 미저장 변경이 있으면 즉시 flush
  useEffect(() => {
    if (!enabled) return
    const handleBeforeUnload = () => {
      if (hasPendingSaveRef.current || isDirtyRef.current) {
        const snapshot = getSnapshotRef.current()
        writeEventDraft(snapshot, storageKey)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (hasPendingSaveRef.current && enabledRef.current && isDirtyRef.current) {
        const snapshot = getSnapshotRef.current()
        writeEventDraft(snapshot, storageKey)
        hasPendingSaveRef.current = false
      }
    }
  }, [enabled, storageKey])

  return {
    pendingDraft,
    lastSavedAt,
    scheduleSave,
    flushSave,
    discardDraft,
    consumePendingDraft,
  }
}
