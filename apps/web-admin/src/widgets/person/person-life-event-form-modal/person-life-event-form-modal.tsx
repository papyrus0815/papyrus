/**
 * 인물 연보 등록/수정 모달 — 공용 Modal 프리미티브 기반
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FiActivity,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCompass,
  FiCopy,
  FiEdit3,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiHome,
  FiRotateCcw,
  FiShield,
  FiStar,
  FiTag,
  FiTarget,
  FiX,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  PERSON_LIFE_EVENT_CATEGORIES,
  PERSON_LIFE_EVENT_CATEGORY_COLOR,
  PERSON_LIFE_EVENT_CATEGORY_LABEL,
  type PersonLifeEvent,
  type PersonLifeEventCategory,
  createPersonLifeEvent,
  deletePersonLifeEvent,
  updatePersonLifeEvent,
} from '@/shared/api/person-life-events'
import { createRichTextImageUploader } from '@/shared/api/upload'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { notify } from '@/shared/ui/toast'

type DatePrecision = 'year' | 'month' | 'day'
const DATE_PRECISIONS: DatePrecision[] = ['day', 'month', 'year']
const PRECISION_LABEL: Record<DatePrecision, string> = {
  day: '연·월·일',
  month: '연·월',
  year: '연도',
}

/** 설명이 이 길이를 넘으면 정보성 경고 표시 (하드 리밋은 없음) */
const DESCRIPTION_SOFT_LIMIT = 5_000

/**
 * HTML에서 태그를 제거해 가시 텍스트만 추출 — 글자 수 카운터·경고 판정용.
 * (RichTextEditor는 HTML을 저장하므로 value.length를 그대로 쓰면 태그·속성까지 카운트됨)
 */
function getVisibleTextLength(html: string): number {
  if (!html) return 0
  // SSR 안전성 위해 DOMParser 가드
  if (typeof window === 'undefined') return html.length
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').trim().length
}

/**
 * 기존 plain text 데이터도 편집기에서 자연스럽게 보이도록 변환.
 * - 이미 HTML(태그 포함)이면 그대로 — 태그 사이 \n은 contenteditable이 무시함
 * - 순수 plain text일 때만 \n → <br>
 *
 * (예전엔 `<` 시작 여부만 봤는데, "abc<br>def" 같은 인라인 시작은 태그가 있어도
 *  통과돼 \n이 또 <br>로 바뀌면서 빈 줄이 누적되는 버그가 있어 정규식으로 보강)
 */
function descriptionToEditorValue(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  const hasHtmlTag =
    /<\/?(?:p|div|span|ul|ol|li|strong|em|b|i|u|h[1-6]|figure|table|img|hr|blockquote|a|br)\b/i.test(
      raw,
    )
  if (hasHtmlTag) return raw
  return raw.replace(/\n/g, '<br>')
}

export const CATEGORY_ICON: Record<
  PersonLifeEventCategory,
  typeof FiBookOpen
> = {
  EDUCATION: FiBookOpen,
  TRAVEL: FiCompass,
  PUBLICATION: FiEdit3,
  EXILE: FiFlag,
  AWARD: FiAward,
  PERSONAL: FiHeart,
  CAREER: FiBriefcase,
  MILITARY: FiShield,
  POLITICAL: FiTarget,
  DIPLOMATIC: FiGlobe,
  RELIGIOUS: FiStar,
  HEALTH: FiActivity,
  FAMILY: FiHome,
  OTHER: FiTag,
}

/** 같은 인물의 재임·재위 기록 참조 — 직위성 사실 중복 입력 경고에 사용 (최소 필드만) */
export interface PositionalRecordRef {
  id: string
  title?: string | null
  startDate?: string | null
  endDate?: string | null
}

/** 직위성 카테고리 — 직책·임기는 재임 기록/경력으로 관리하도록 유도 (경고-only) */
const POSITIONAL_CATEGORIES: PersonLifeEventCategory[] = [
  'POLITICAL',
  'MILITARY',
  'DIPLOMATIC',
  'CAREER',
]

export interface PersonLifeEventFormModalProps {
  open: boolean
  personId: string
  lifeEvent?: PersonLifeEvent | null
  onClose: () => void
  /** 저장 성공 시 호출. savedId 인자로 타임라인에서 하이라이트·스크롤 등에 활용. */
  onSuccess?: (savedId?: string) => void
  /** 인물 출생·사망일 — 입력한 날짜가 범위 밖이면 인라인 경고 (저장은 허용) */
  birthDate?: string | null
  deathDate?: string | null
  /** 같은 인물의 기존 연보 — 중복 등록 경고·sortOrder 자동 분배에 사용 */
  existingLifeEvents?: PersonLifeEvent[]
  /** 같은 인물의 재임 기록 — 입력 시점이 재임 기간에 포함되면 중복 경고 (저장은 허용) */
  existingTenures?: PositionalRecordRef[]
  /** 같은 인물의 재위 기록 — 입력 시점이 재위 기간에 포함되면 중복 경고 (저장은 허용) */
  existingReigns?: PositionalRecordRef[]
}

/** localStorage 드래프트 키 — tabId 포함해 다른 탭과 충돌 방지 */
function draftKey(personId: string, lifeEventId: string | undefined, tabId: string) {
  return `draft:life-event:${personId}:${lifeEventId ?? 'new'}:${tabId}`
}

/** 카테고리 사용 빈도 localStorage 키 — 자주 쓰는 카테고리 상단 정렬 */
const CATEGORY_FREQ_KEY = 'life-event:category-freq'
type CategoryFreqMap = Partial<Record<PersonLifeEventCategory, number>>

function loadCategoryFreq(): CategoryFreqMap {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CATEGORY_FREQ_KEY)
    return raw ? (JSON.parse(raw) as CategoryFreqMap) : {}
  } catch {
    return {}
  }
}

function bumpCategoryFreq(c: PersonLifeEventCategory) {
  if (typeof localStorage === 'undefined') return
  try {
    const freq = loadCategoryFreq()
    freq[c] = (freq[c] ?? 0) + 1
    localStorage.setItem(CATEGORY_FREQ_KEY, JSON.stringify(freq))
  } catch {
    /* 무시 */
  }
}

interface DraftPayload {
  title: string
  category: PersonLifeEventCategory | ''
  description: string
  startDate: string
  endDate: string
  startPrecision: DatePrecision
  endPrecision: DatePrecision
  savedAt: number
}

/** 탭 단위 고유 id — 같은 사용자가 여러 탭에서 동일 인물 편집 시 드래프트 충돌 방지 */
const tabIdRef = (() => {
  if (typeof window === 'undefined') return { current: 'ssr' }
  const KEY = '__life_event_tab_id'
  // sessionStorage는 탭별로 분리되므로 탭별 id 보관에 적합
  let id = window.sessionStorage.getItem(KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    try {
      window.sessionStorage.setItem(KEY, id)
    } catch {
      /* 무시 */
    }
  }
  return { current: id }
})()

export function PersonLifeEventFormModal({
  open,
  personId,
  lifeEvent,
  onClose,
  onSuccess,
  birthDate,
  deathDate,
  existingLifeEvents,
  existingTenures,
  existingReigns,
}: PersonLifeEventFormModalProps) {
  const queryClient = useQueryClient()
  const [isEdit, setIsEdit] = useState(() => !!lifeEvent)
  const [lifeEventId, setLifeEventId] = useState<string | undefined>(lifeEvent?.id)

  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [category, setCategory] = useState<PersonLifeEventCategory | ''>('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startPrecision, setStartPrecision] = useState<DatePrecision>('day')
  const [endPrecision, setEndPrecision] = useState<DatePrecision>('day')
  const [sortOrder, setSortOrder] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [draftRestoredFlash, setDraftRestoredFlash] = useState(false)

  /** 초기 스냅샷 — dirty 판정용 기준값 */
  const initialSnapshotRef = useRef<string>('')
  /** 드래프트 저장 debounce 타이머 */
  const draftDebounceRef = useRef<number | null>(null)

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        title,
        category,
        description,
        startDate,
        endDate,
        startPrecision,
        endPrecision,
        sortOrder,
      }),
    [
      title,
      category,
      description,
      startDate,
      endDate,
      startPrecision,
      endPrecision,
      sortOrder,
    ],
  )

  const isDirty = currentSnapshot !== initialSnapshotRef.current

  /** 초기화 + 드래프트 복구 시도 — 모달 오픈·대상 이벤트 변경마다 재실행 */
  useEffect(() => {
    if (!open) return

    setIsEdit(!!lifeEvent)
    setLifeEventId(lifeEvent?.id)

    const baseTitle = lifeEvent?.title ?? ''
    const baseCategory = (lifeEvent?.category ?? '') as
      | PersonLifeEventCategory
      | ''
    const baseDescription = descriptionToEditorValue(lifeEvent?.description)
    const baseStart = lifeEvent?.startDate
      ? lifeEvent.startDate.slice(0, 10)
      : ''
    const baseEnd = lifeEvent?.endDate ? lifeEvent.endDate.slice(0, 10) : ''
    const baseStartPrec = (lifeEvent?.startDatePrecision ??
      'day') as DatePrecision
    const baseEndPrec = (lifeEvent?.endDatePrecision ?? 'day') as DatePrecision
    const baseSort = lifeEvent?.sortOrder ?? ''

    // 드래프트 확인: 대상 레코드 updatedAt 이후 저장된 드래프트만 유효
    let restoredFromDraft = false
    try {
      const raw = localStorage.getItem(
        draftKey(personId, lifeEvent?.id, tabIdRef.current),
      )
      if (raw) {
        const draft = JSON.parse(raw) as DraftPayload
        const recordStamp = lifeEvent?.updatedAt
          ? new Date(lifeEvent.updatedAt).getTime()
          : 0
        if (draft.savedAt > recordStamp) {
          setTitle(draft.title)
          setCategory(draft.category)
          setDescription(draft.description)
          setStartDate(draft.startDate)
          setEndDate(draft.endDate)
          setStartPrecision(draft.startPrecision)
          setEndPrecision(draft.endPrecision)
          setSortOrder('')
          restoredFromDraft = true
        }
      }
    } catch {
      /* 파싱 실패 시 드래프트 무시 */
    }

    if (!restoredFromDraft) {
      setTitle(baseTitle)
      setCategory(baseCategory)
      setDescription(baseDescription)
      setStartDate(baseStart)
      setEndDate(baseEnd)
      setStartPrecision(baseStartPrec)
      setEndPrecision(baseEndPrec)
      setSortOrder(baseSort as number | '')
    }
    setTitleTouched(false)
    setShowAdvanced(false)
    setDraftRestoredFlash(restoredFromDraft)

    // 초기 스냅샷 저장 — dirty 비교 기준
    initialSnapshotRef.current = JSON.stringify({
      title: baseTitle,
      category: baseCategory,
      description: baseDescription,
      startDate: baseStart,
      endDate: baseEnd,
      startPrecision: baseStartPrec,
      endPrecision: baseEndPrec,
      sortOrder: baseSort as number | '',
    })
  }, [open, lifeEvent, personId])

  /** 드래프트 자동 저장 — dirty일 때만, 길이 비례 debounce(2~5초)
      길이가 짧으면 직렬화·localStorage 비용이 작아 빠르게,
      5000자 가까이 차면 매 2초 직렬화가 누적되니 5초까지 늘림. */
  useEffect(() => {
    if (!open || !isDirty) return
    if (draftDebounceRef.current !== null) {
      window.clearTimeout(draftDebounceRef.current)
    }
    const len = description.length
    const debounceMs =
      len < 1000 ? 2000 : len < 3000 ? 3000 : len < 5000 ? 4000 : 5000
    draftDebounceRef.current = window.setTimeout(() => {
      try {
        const payload: DraftPayload = {
          title,
          category,
          description,
          startDate,
          endDate,
          startPrecision,
          endPrecision,
          savedAt: Date.now(),
        }
        localStorage.setItem(
          draftKey(personId, lifeEventId, tabIdRef.current),
          JSON.stringify(payload),
        )
      } catch {
        /* 저장 용량 초과 등 무시 */
      }
    }, debounceMs)
    return () => {
      if (draftDebounceRef.current !== null) {
        window.clearTimeout(draftDebounceRef.current)
      }
    }
  }, [
    open,
    isDirty,
    title,
    category,
    description,
    startDate,
    endDate,
    startPrecision,
    endPrecision,
    personId,
    lifeEventId,
  ])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(
        draftKey(personId, lifeEventId, tabIdRef.current),
      )
    } catch {
      /* 무시 */
    }
  }, [personId, lifeEventId])

  /** dirty면 확인 다이얼로그, 아니면 바로 닫기 */
  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmCloseOpen(true)
    } else {
      clearDraft()
      onClose()
    }
  }, [isDirty, clearDraft, onClose])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, requestClose])

  const accent = useMemo(() => {
    if (!category) return null
    return PERSON_LIFE_EVENT_CATEGORY_COLOR[category]
  }, [category])

  /** RichTextEditor는 HTML을 반환 — 태그 제외한 가시 텍스트 길이로 판정·표시 */
  const descVisibleLength = useMemo(
    () => getVisibleTextLength(description),
    [description],
  )
  const descLenLevel: 'muted' | 'warn' =
    descVisibleLength >= DESCRIPTION_SOFT_LIMIT ? 'warn' : 'muted'

  const titleError = titleTouched && title.trim().length === 0
  const dateError =
    startDate && endDate && new Date(endDate) < new Date(startDate)
      ? '종료일은 시작일 이후여야 합니다.'
      : ''

  /** 시작일이 출생 이전 / 사망 이후면 경고 — 저장은 허용하되 알림 (timeline에서
      자동 필터되어 안 보일 수 있음을 사용자에게 미리 알림) */
  const dateRangeWarning = useMemo(() => {
    if (!startDate) return ''
    const start = new Date(startDate).getTime()
    if (Number.isNaN(start)) return ''
    if (birthDate) {
      const birth = new Date(birthDate).getTime()
      if (!Number.isNaN(birth) && start < birth) {
        return '시작일이 인물 출생 이전입니다 — 타임라인에 표시되지 않을 수 있습니다.'
      }
    }
    if (deathDate) {
      const death = new Date(deathDate).getTime()
      if (!Number.isNaN(death) && start > death) {
        return '시작일이 인물 사망 이후입니다 — 타임라인에 표시되지 않을 수 있습니다.'
      }
    }
    return ''
  }, [startDate, birthDate, deathDate])

  /** 동일 제목+날짜 연보 중복 경고 (자기 자신 제외) — 저장은 허용 */
  const duplicateWarning = useMemo(() => {
    if (!title.trim() || !startDate) return ''
    const startKey = startDate.slice(0, 10)
    const existing = (existingLifeEvents ?? []).find(
      (le) =>
        le.id !== lifeEventId &&
        le.title.trim() === title.trim() &&
        le.startDate?.slice(0, 10) === startKey,
    )
    return existing
      ? '같은 제목·날짜 연보가 이미 있습니다 — 그래도 등록하시겠어요?'
      : ''
  }, [title, startDate, existingLifeEvents, lifeEventId])

  /** 시작일이 기존 재임·재위 기간에 포함되면 경고 — 같은 직위성 사실을 재임 기록으로
      이미 관리 중일 수 있음을 알림 (저장은 허용). 직책·임기는 재임 기록이 단일 출처. */
  const positionalOverlapWarning = useMemo(() => {
    if (!startDate) return ''
    const start = new Date(startDate).getTime()
    if (Number.isNaN(start)) return ''
    const records = [
      ...(existingTenures ?? []).map((t) => ({ ...t, kind: '재임' })),
      ...(existingReigns ?? []).map((r) => ({ ...r, kind: '재위' })),
    ]
    const hit = records.find((rec) => {
      if (!rec.startDate) return false
      const s = new Date(rec.startDate).getTime()
      if (Number.isNaN(s)) return false
      const e = rec.endDate
        ? new Date(rec.endDate).getTime()
        : Number.POSITIVE_INFINITY
      return start >= s && start <= e
    })
    if (!hit) return ''
    const label = hit.title?.trim() || '직위'
    return `이 시점은 ${hit.kind} 「${label}」 기간입니다 — 직책·임기는 재임 기록으로 관리되는지 확인하세요.`
  }, [startDate, existingTenures, existingReigns])

  /** 직위성 카테고리(정치·군사·외교·경력) 선택 시 — 재임 기록/경력 등록 권장 안내 (경고-only) */
  const positionalCategoryHint = useMemo(() => {
    if (!category) return ''
    return POSITIONAL_CATEGORIES.includes(category)
      ? '직책·임기·소속 같은 직위성 사실은 재임 기록 또는 경력으로 등록하면 타임라인에 자동 반영됩니다. 연보는 보조 서술로 활용하세요.'
      : ''
  }, [category])

  /** 자주 쓰는 카테고리 상위 3개 — 카테고리 그리드에서 첫 줄에 강조 표시
      (조회는 모달 열릴 때 1회로 충분) */
  const frequentCategories = useMemo<PersonLifeEventCategory[]>(() => {
    if (!open) return []
    const freq = loadCategoryFreq()
    return PERSON_LIFE_EVENT_CATEGORIES.slice()
      .filter((c) => (freq[c] ?? 0) > 0)
      .sort((a, b) => (freq[b] ?? 0) - (freq[a] ?? 0))
      .slice(0, 3)
  }, [open])

  const canSubmit =
    title.trim().length > 0 &&
    !dateError &&
    !submitting &&
    !deleting
  const disabledReason = submitting || deleting
    ? ''
    : title.trim().length === 0
      ? '제목을 입력하세요.'
      : dateError || ''

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
    queryClient.invalidateQueries({ queryKey: ['person-life-events', personId] })
  }

  /**
   * @param keepOpenForNext true면 저장 후 모달을 닫지 않고 새 항목 입력 폼으로 리셋.
   *   카테고리·precision은 유지(반복 패턴 가속), 제목·날짜·설명은 비움.
   */
  const handleSubmit = async (
    e: React.FormEvent,
    options?: { keepOpenForNext?: boolean },
  ) => {
    e.preventDefault()
    if (!canSubmit) {
      setTitleTouched(true)
      return
    }
    const keepOpenForNext = !!options?.keepOpenForNext
    setSubmitting(true)
    try {
      // RichTextEditor 빈 상태(`<p><br></p>` 등)는 save 시 null로 정규화
      const trimmedDescription = description.trim()
      const descriptionForSave =
        trimmedDescription && getVisibleTextLength(trimmedDescription) > 0
          ? trimmedDescription
          : null
      // 같은 시작일에 sortOrder가 비어 있는 경우 — 기존 항목 max+1로 자동 분배.
      // 사용자가 직접 sortOrder를 입력했으면 그 값을 우선.
      let sortForSave: number | null
      if (sortOrder !== '' && !Number.isNaN(Number(sortOrder))) {
        sortForSave = Number(sortOrder)
      } else if (startDate && (existingLifeEvents ?? []).length > 0) {
        const sameDay = (existingLifeEvents ?? []).filter(
          (le) =>
            le.id !== lifeEventId &&
            le.startDate?.slice(0, 10) === startDate.slice(0, 10),
        )
        if (sameDay.length > 0) {
          const maxSort = sameDay.reduce(
            (m, le) => Math.max(m, le.sortOrder ?? 0),
            -1,
          )
          sortForSave = maxSort + 1
        } else {
          sortForSave = null
        }
      } else {
        sortForSave = null
      }

      // 카테고리 사용 빈도 — "자주 쓰는 카테고리 상단" 정렬용
      if (category) bumpCategoryFreq(category)
      let savedId: string | undefined
      if (isEdit && lifeEventId) {
        const updated = await updatePersonLifeEvent(lifeEventId, {
          title: title.trim(),
          category: (category || null) as PersonLifeEventCategory | null,
          description: descriptionForSave,
          startDate: startDate || null,
          startDatePrecision: startDate ? startPrecision : null,
          endDate: endDate || null,
          endDatePrecision: endDate ? endPrecision : null,
          sortOrder: sortForSave,
        })
        savedId = updated?.id ?? lifeEventId
        notify.success('연보가 수정되었습니다.')
      } else {
        const created = await createPersonLifeEvent({
          personId,
          title: title.trim(),
          category: (category || undefined) as PersonLifeEventCategory | undefined,
          description: descriptionForSave ?? undefined,
          startDate: startDate || undefined,
          startDatePrecision: startDate ? startPrecision : undefined,
          endDate: endDate || undefined,
          endDatePrecision: endDate ? endPrecision : undefined,
          sortOrder: sortForSave ?? undefined,
        })
        savedId = created?.id
        notify.success('연보가 등록되었습니다.')
      }
      clearDraft()
      invalidate()
      onSuccess?.(savedId)
      if (keepOpenForNext) {
        // 새 항목 입력으로 전환 — id·제목·날짜·설명만 비움
        setIsEdit(false)
        setLifeEventId(undefined)
        setTitle('')
        setStartDate('')
        setEndDate('')
        setDescription('')
        setSortOrder('')
        setTitleTouched(false)
        initialSnapshotRef.current = JSON.stringify({
          title: '',
          category,
          description: '',
          startDate: '',
          endDate: '',
          startPrecision,
          endPrecision,
          sortOrder: '' as number | '',
        })
        // 다음 입력 빠르게 시작하도록 제목에 포커스
        setTimeout(() => {
          const titleInput = document.querySelector<HTMLInputElement>(
            'input[name="person-life-event-title"]',
          )
          titleInput?.focus()
        }, 50)
      } else {
        onClose()
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : '저장에 실패했습니다.'
      notify.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!lifeEventId || deleting) return
    setConfirmDeleteOpen(false)
    setDeleting(true)
    try {
      await deletePersonLifeEvent(lifeEventId)
      notify.success('연보가 삭제되었습니다.')
      clearDraft()
      invalidate()
      onSuccess?.()
      onClose()
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : '삭제에 실패했습니다.'
      notify.error(message)
    } finally {
      setDeleting(false)
    }
  }

  /** "복제하여 새로 만들기": 현재 편집 중인 연보의 메타만 복사, id·날짜·설명은 비움 */
  const handleDuplicate = () => {
    setIsEdit(false)
    setLifeEventId(undefined)
    setStartDate('')
    setEndDate('')
    setDescription('')
    setSortOrder('')
    setTitleTouched(false)
    // title·category·precision은 유지 — 반복 패턴 입력 가속
    initialSnapshotRef.current = '' // 복제 후는 기본적으로 dirty
    clearDraft()
    notify.success('복제 모드 — 날짜·설명만 새로 입력하세요.')
  }

  if (!open) return null

  const formId = 'person-life-event-form'

  return (
    <ModalOverlay onClick={requestClose}>
      <ModalBox
        $maxWidth="760px"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-life-event-form-title"
      >
        <AccentStripe $color={accent?.base ?? null} />
        <ModalHeader>
          <div>
            <ModalTitle id="person-life-event-form-title">
              {isEdit ? '연보 수정' : '새 연보'}
            </ModalTitle>
            <ModalSubtitle>
              인물이 이 해에 무엇을 했는지 자유 서술로 기록하세요.
            </ModalSubtitle>
          </div>
          {isEdit && (
            <HeaderActionBtn
              type="button"
              onClick={handleDuplicate}
              title="복제하여 새로 만들기"
              aria-label="복제하여 새로 만들기"
            >
              <FiCopy size={15} strokeWidth={2.2} />
              <span>복제</span>
            </HeaderActionBtn>
          )}
          <ModalCloseButton type="button" onClick={requestClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            // Ctrl/⌘+Enter: 저장 후 닫기 / +Shift: 저장 후 다음 항목 입력
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              if (!canSubmit) return
              handleSubmit(e as unknown as React.FormEvent, {
                keepOpenForNext: e.shiftKey,
              })
              return
            }
            // Alt+1~9: 카테고리 빠른 선택 (텍스트 입력 중에도 동작)
            if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
              const idx = Number(e.key) - 1
              const target = PERSON_LIFE_EVENT_CATEGORIES[idx]
              if (target) {
                e.preventDefault()
                setCategory((cur) => (cur === target ? '' : target))
              }
            }
          }}
        >
          <ModalBody>
            {draftRestoredFlash && (
              <DraftBanner>
                <span>
                  <FiRotateCcw size={13} strokeWidth={2.2} />
                  이전 작성 내용을 복구했어요.
                </span>
                <DraftBannerBtn
                  type="button"
                  onClick={() => {
                    // 복구 버린다 — 원본 값으로 되돌리고 드래프트 삭제
                    clearDraft()
                    if (lifeEvent) {
                      setTitle(lifeEvent.title)
                      setCategory(
                        (lifeEvent.category ?? '') as
                          | PersonLifeEventCategory
                          | '',
                      )
                      setDescription(descriptionToEditorValue(lifeEvent.description))
                      setStartDate(
                        lifeEvent.startDate
                          ? lifeEvent.startDate.slice(0, 10)
                          : '',
                      )
                      setEndDate(
                        lifeEvent.endDate ? lifeEvent.endDate.slice(0, 10) : '',
                      )
                      setStartPrecision(
                        (lifeEvent.startDatePrecision as DatePrecision) ?? 'day',
                      )
                      setEndPrecision(
                        (lifeEvent.endDatePrecision as DatePrecision) ?? 'day',
                      )
                      setSortOrder(lifeEvent.sortOrder ?? '')
                    } else {
                      setTitle('')
                      setCategory('')
                      setDescription('')
                      setStartDate('')
                      setEndDate('')
                      setStartPrecision('day')
                      setEndPrecision('day')
                      setSortOrder('')
                    }
                    setDraftRestoredFlash(false)
                  }}
                >
                  원래대로
                </DraftBannerBtn>
              </DraftBanner>
            )}

            {/* 제목 */}
            <Field>
              <Label>
                제목 <Required>*</Required>
              </Label>
              <TitleInput
                type="text"
                name="person-life-event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                placeholder="예: 파리 유학, 「종의 기원」 출간, 엘바섬 유배"
                maxLength={200}
                aria-invalid={titleError}
                autoFocus
              />
              {titleError && <FieldError>제목을 입력하세요.</FieldError>}
            </Field>

            {/* 기간 */}
            <DateField>
              <Label>기간</Label>
              <DateRangeField
                startValue={startDate}
                endValue={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                startPlaceholder="시작"
                endPlaceholder="종료 (단일 시점이면 비움)"
                renderControlOnly
                startPickerTitle="시작일"
                endPickerTitle="종료일"
              />
              <PrecisionRow>
                <PrecisionGroup>
                  <PrecisionLabel>시작</PrecisionLabel>
                  <Segmented>
                    {DATE_PRECISIONS.map((p) => (
                      <SegmentedBtn
                        key={p}
                        type="button"
                        $active={startPrecision === p}
                        disabled={!startDate}
                        onClick={() => setStartPrecision(p)}
                      >
                        {PRECISION_LABEL[p]}
                      </SegmentedBtn>
                    ))}
                  </Segmented>
                </PrecisionGroup>
                <PrecisionGroup>
                  <PrecisionLabel>종료</PrecisionLabel>
                  <Segmented>
                    {DATE_PRECISIONS.map((p) => (
                      <SegmentedBtn
                        key={p}
                        type="button"
                        $active={endPrecision === p}
                        disabled={!endDate}
                        onClick={() => setEndPrecision(p)}
                      >
                        {PRECISION_LABEL[p]}
                      </SegmentedBtn>
                    ))}
                  </Segmented>
                </PrecisionGroup>
              </PrecisionRow>
              {dateError && <FieldError>{dateError}</FieldError>}
              {!dateError && dateRangeWarning && (
                <FieldWarning>{dateRangeWarning}</FieldWarning>
              )}
              {!dateError && duplicateWarning && (
                <FieldWarning>{duplicateWarning}</FieldWarning>
              )}
              {!dateError && positionalOverlapWarning && (
                <FieldWarning>{positionalOverlapWarning}</FieldWarning>
              )}
            </DateField>

            {/* 카테고리 — roving tabindex 패턴: ←→로 이동, Enter/Space로 선택 */}
            <Field>
              <Label>
                카테고리
                <CategoryHint>Alt+1~9로 빠른 선택</CategoryHint>
              </Label>
              {/* 자주 쓰는 카테고리 상단 — localStorage 빈도 기준 상위 3개 */}
              {frequentCategories.length > 0 && (
                <FrequentCategoryRow>
                  {frequentCategories.map((c) => {
                    const Icon = CATEGORY_ICON[c]
                    const color = PERSON_LIFE_EVENT_CATEGORY_COLOR[c]
                    const active = category === c
                    return (
                      <CategoryChip
                        key={`freq-${c}`}
                        type="button"
                        $active={active}
                        $color={color.base}
                        $soft={color.soft}
                        onClick={() => setCategory(active ? '' : c)}
                        title="자주 쓰는 카테고리"
                      >
                        <Icon size={14} strokeWidth={2.2} />
                        <span>{PERSON_LIFE_EVENT_CATEGORY_LABEL[c]}</span>
                        <FreqStar>★</FreqStar>
                      </CategoryChip>
                    )
                  })}
                </FrequentCategoryRow>
              )}
              <CategoryGrid
                role="radiogroup"
                aria-label="카테고리"
                onKeyDown={(e) => {
                  // Alt+1~9 빠른 선택 (그리드 포커스됐을 때)
                  if (e.altKey && /^[1-9]$/.test(e.key)) {
                    const idx = Number(e.key) - 1
                    const target = PERSON_LIFE_EVENT_CATEGORIES[idx]
                    if (target) {
                      e.preventDefault()
                      setCategory(category === target ? '' : target)
                    }
                  }
                }}
              >
                {PERSON_LIFE_EVENT_CATEGORIES.map((c, idx) => {
                  const Icon = CATEGORY_ICON[c]
                  const color = PERSON_LIFE_EVENT_CATEGORY_COLOR[c]
                  const active = category === c
                  // 현재 선택된 항목이 없으면 첫 칩을 포커서블로 (roving tabindex 진입점)
                  const hasSelection = !!category
                  const tabIndex = hasSelection
                    ? active
                      ? 0
                      : -1
                    : idx === 0
                      ? 0
                      : -1
                  return (
                    <CategoryChip
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      tabIndex={tabIndex}
                      $active={active}
                      $color={color.base}
                      $soft={color.soft}
                      onClick={() => setCategory(active ? '' : c)}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'ArrowRight' ||
                          e.key === 'ArrowDown' ||
                          e.key === 'ArrowLeft' ||
                          e.key === 'ArrowUp'
                        ) {
                          e.preventDefault()
                          const dir =
                            e.key === 'ArrowRight' || e.key === 'ArrowDown'
                              ? 1
                              : -1
                          const next =
                            (idx + dir + PERSON_LIFE_EVENT_CATEGORIES.length) %
                            PERSON_LIFE_EVENT_CATEGORIES.length
                          setCategory(PERSON_LIFE_EVENT_CATEGORIES[next])
                          // 포커스 이동 — roving tabindex
                          const parent = e.currentTarget.parentElement
                          const btn = parent?.querySelectorAll<HTMLButtonElement>(
                            'button[role="radio"]',
                          )[next]
                          btn?.focus()
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setCategory(active ? '' : c)
                        }
                      }}
                    >
                      <Icon size={14} strokeWidth={2.2} />
                      <span>{PERSON_LIFE_EVENT_CATEGORY_LABEL[c]}</span>
                    </CategoryChip>
                  )
                })}
              </CategoryGrid>
              {positionalCategoryHint && (
                <CategoryHintBox>{positionalCategoryHint}</CategoryHintBox>
              )}
            </Field>

            {/* 고급 설정 — sortOrder. 기본은 접힘 */}
            <AdvancedToggle
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? '− 고급 설정 접기' : '+ 고급 설정'}
            </AdvancedToggle>
            {showAdvanced && (
              <Field>
                <Label>정렬 순서 (같은 날짜 연보가 여러 개일 때)</Label>
                <SortOrderInput
                  type="number"
                  value={sortOrder}
                  onChange={(e) => {
                    const v = e.target.value
                    setSortOrder(v === '' ? '' : Number(v))
                  }}
                  placeholder="0 (낮을수록 먼저)"
                  step={1}
                />
              </Field>
            )}

            {/* 설명 — 가장 긴 필드를 하단에 배치해서 스크롤 시 다른 필드가 시야에서 사라지지 않도록 */}
            <Field>
              <LabelRow>
                <Label as="span">상세 설명</Label>
                <DescCount $level={descLenLevel}>
                  {descVisibleLength.toLocaleString()}자
                </DescCount>
              </LabelRow>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                showTitle={false}
                placeholder="배경·맥락·인용 등 자유 서술 (선택). Ctrl/⌘+Enter 로 저장"
                onImageUpload={createRichTextImageUploader('persons')}
                /* 모달 본문 내에서 본문만 내부 스크롤되도록 — Toolbar가 항상 보임 */
                maxHeight="50vh"
              />
              {descVisibleLength >= DESCRIPTION_SOFT_LIMIT && (
                <DescHint>
                  내용이 길어지고 있어요. biography(전기)나 별도 사건으로
                  분리할지 검토해보세요.
                </DescHint>
              )}
            </Field>
          </ModalBody>

          <ModalFooter>
            {isEdit && (
              <DeleteBtn
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting || submitting}
              >
                {deleting ? '삭제 중…' : '삭제'}
              </DeleteBtn>
            )}
            <Spacer />
            <CancelBtn
              type="button"
              onClick={requestClose}
              disabled={submitting || deleting}
            >
              취소
            </CancelBtn>
            {/* 새 항목 등록 모드일 때만 노출 — 수정 모드는 의미 없음 */}
            {!isEdit && (
              <SaveAndAddBtn
                type="button"
                disabled={!canSubmit}
                onClick={(e) =>
                  handleSubmit(e as unknown as React.FormEvent, {
                    keepOpenForNext: true,
                  })
                }
                title={
                  canSubmit
                    ? '저장하고 새로 입력 (Ctrl+Shift+Enter)'
                    : disabledReason || undefined
                }
              >
                저장 후 추가
              </SaveAndAddBtn>
            )}
            <SaveBtn
              type="submit"
              disabled={!canSubmit}
              $accent={accent?.base ?? null}
              form={formId}
              title={disabledReason || undefined}
            >
              {submitting ? '저장 중…' : isEdit ? '수정 저장' : '등록'}
            </SaveBtn>
          </ModalFooter>
        </form>
      </ModalBox>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="연보 삭제"
        message={
          <>
            이 연보 기록을 <strong>삭제</strong>하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <ConfirmDialog
        isOpen={confirmCloseOpen}
        title="변경사항 버리기"
        message="저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?"
        confirmLabel="버리고 닫기"
        cancelLabel="계속 편집"
        danger
        onConfirm={() => {
          setConfirmCloseOpen(false)
          clearDraft()
          onClose()
        }}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    </ModalOverlay>
  )
}

// ────── styled ──────
const AccentStripe = styled.div<{ $color: string | null }>`
  height: 4px;
  background: ${({ $color }) =>
    $color ? `linear-gradient(90deg, ${$color}, ${$color}88)` : 'transparent'};
  transition: background 0.25s;
`

const HeaderActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const DraftBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e0e7ff' : '#3730a3')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.22)'};
  & > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

const DraftBannerBtn = styled.button`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)'};
  border-radius: 999px;
  cursor: pointer;
  color: inherit;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.24)'
        : 'rgba(99,102,241,0.14)'};
  }
`

const FieldError = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 4px;
`

const FieldWarning = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 6px 10px;
  margin-top: 4px;
  letter-spacing: -0.005em;
`

const AdvancedToggle = styled.button`
  align-self: flex-start;
  background: transparent;
  border: none;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`


const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const DateField = styled(Field)`
  gap: 10px;
`

const Label = styled.label`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.tertiary : '#64748b'};
`

const Required = styled.span`
  color: #ef4444;
  text-transform: none;
`

const inputReset = css`
  width: 100%;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.14);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#94a3b8'};
  }
`

const TitleInput = styled.input`
  ${inputReset}
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  padding: 14px 18px;

  &[aria-invalid='true'] {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }
`

const SortOrderInput = styled.input`
  ${inputReset}
  max-width: 200px;
`

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`

const DescCount = styled.span<{ $level: 'muted' | 'warn' }>`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $level, theme }) =>
    $level === 'warn' ? '#d97706' : theme.colors.text.tertiary};
`

const DescHint = styled.div`
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 8px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
`

const CategoryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const FrequentCategoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  margin-bottom: 6px;
`

const FreqStar = styled.span`
  font-size: 10px;
  color: #f59e0b;
  margin-left: 2px;
`

const CategoryHint = styled.span`
  margin-left: 8px;
  font-size: 10px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 직위성 카테고리 선택 시 재임/경력 등록을 권하는 정보성 안내 (경고-amber와 구분되는 indigo 톤) */
const CategoryHintBox = styled.div`
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.005em;
  padding: 8px 10px;
  border-radius: 8px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.07)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'};
`

const CategoryChip = styled.button<{
  $active: boolean
  $color: string
  $soft: string
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
  white-space: nowrap;
  ${({ $active, $color, $soft, theme }) =>
    $active
      ? css`
          background: ${$soft};
          color: ${$color};
          border: 1px solid ${$color}66;
          box-shadow: 0 0 0 3px ${$color}1f;
        `
      : css`
          background: ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.04)'
            : '#f1f5f9'};
          color: ${theme.mode === 'dark'
            ? theme.colors.text.secondary
            : '#475569'};
          border: 1px solid transparent;
          &:hover {
            background: ${theme.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : '#e2e8f0'};
          }
        `}

  &:active {
    transform: scale(0.97);
  }
`

const PrecisionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const PrecisionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const PrecisionLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Segmented = styled.div`
  display: inline-flex;
  width: 100%;
  padding: 3px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'transparent'};
`

const SegmentedBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  border: none;
  padding: 7px 6px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.3)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#e0e7ff'
        : '#4338ca'
      : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode === 'light'
      ? '0 1px 2px rgba(15,23,42,0.08)'
      : 'none'};
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const Spacer = styled.div`
  flex: 1;
`

const baseBtn = css`
  padding: 11px 20px;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.1s;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`

const SaveBtn = styled.button<{ $accent: string | null }>`
  ${baseBtn}
  background: ${({ $accent }) => $accent ?? '#6366f1'};
  color: #fff;
  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
`

const SaveAndAddBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, 0.35);
  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.55);
  }
`

const CancelBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.secondary : '#475569'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }
`

const DeleteBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: #dc2626;
  padding: 11px 14px;
  &:hover:not(:disabled) {
    background: #fef2f2;
  }
`
