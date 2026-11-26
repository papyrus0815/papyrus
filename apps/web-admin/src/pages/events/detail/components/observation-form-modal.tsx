import {
  type RefObject,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiColumns,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import styled, { type DefaultTheme } from 'styled-components'

import {
  ESTIMATE_METHOD_HINT,
  ESTIMATE_METHOD_LABEL,
  ESTIMATE_ROLE_HINT,
  ESTIMATE_ROLE_LABEL,
  SOURCE_KIND_CHOICES,
  SOURCE_KIND_LABEL,
  SOURCE_TIER_LABEL,
} from '@/entities/evidence/lib/evidence-labels'
import {
  formatObservationExact,
  formatObservationValue,
  observationExtent,
  unitSuffixOf,
} from '@/entities/evidence/lib/format-observation'
import { parseQuickObservationInput } from '@/entities/evidence/lib/parse-quick-observation'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import { getAllCurrencies } from '@/shared/api/currencies'
import {
  type CitationInput,
  createObservation,
  type EstimateMethod,
  type EstimateRole,
  listMetricDefinitions,
  type MetricDefinition,
  type Observation,
  type ObservationSubjectType,
  searchSources,
  type SourceKind,
  type SourceTier,
  type StructuredPointInput,
  updateObservation,
} from '@/shared/api/evidence'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import { eventKeys, eventObservationsQueryOptions } from '../use-event-detail'

export interface ObservationSubjectOption {
  subjectType: ObservationSubjectType
  subjectId: string
  label: string
  color: string | null
}

interface ObservationFormModalProps {
  eventId: string
  subjects: ObservationSubjectOption[]
  /** 지표 상자 맨 위 '자주 쓰는 지표'(카테고리 추천) — 카탈로그에 없는 키는 건너뛴다 */
  suggestedMetricKeys?: string[]
  /** 새 수치의 첫 대상 유형 — 해당 유형이 없으면 목록 첫 항목(사건 전체) */
  preferredSubjectType?: ObservationSubjectType
  /** null이면 새 수치 */
  initial: Observation | null
  /** 새 수치의 대상·지표를 미리 고른다 — 비교표의 빈 칸('+ 추가')에서 열 때(그 진영·그 지표) */
  presetSubject?: { subjectType: ObservationSubjectType; subjectId: string } | null
  presetMetricKey?: string | null
  /** 열릴 때 '여러 지표 한 번에 기록' 모드로 시작할지 여부 */
  initialBatchMode?: boolean
  onClose: () => void
  subjectLabelOf: (observation: Observation) => string
}

type ValueMode = 'single' | 'range' | 'atLeast'
type EntryMode = 'single' | 'batch'
type LayoutMode = 'split' | 'single'

interface BatchRowDraft {
  metricKey: string
  raw: string
  approx: boolean
  qualifier: string
}

const LAYOUT_STORAGE_KEY = 'papyrus:observation-register-layout'
const LEAVE_CONFIRM_MESSAGE = '저장하지 않은 변경 사항이 있습니다. 닫으시겠습니까?'
const RESET_CONFIRM_MESSAGE = '입력 중인 수치 내용을 초기화하고 처음 상태로 되돌리시겠습니까?'

const FORM_SECTION_LINKS = [
  { id: 'obs-form-group-core', label: '대상 · 수치' },
  { id: 'obs-form-group-source', label: '출처 · 근거' },
  { id: 'obs-form-group-details', label: '세부 설정' },
] as const

function readInitialLayoutMode(): LayoutMode {
  if (typeof window === 'undefined') return 'split'
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    return saved === 'single' ? 'single' : 'split'
  } catch {
    return 'split'
  }
}

const DOMAIN_LABEL: Record<string, string> = {
  human: '인명 피해',
  military: '군사',
  civilian: '민간',
  society: '사회·치안',
  economy: '경제',
  demography: '인구',
  territory: '영토',
  disaster: '재해',
  politics: '정치',
}

const DEFAULT_BATCH_FALLBACK_KEYS = [
  'human.deaths',
  'human.wounded',
  'society.participants',
  'society.arrested',
] as const

const SUBJECT_GROUP_LABEL: Partial<Record<ObservationSubjectType, string>> = {
  EVENT: '사건 전체',
  EVENT_SIDE: '진영',
  EVENT_PARTICIPANT: '참여국',
  EVENT_SIDE_UNIT: '투입 부대',
}

const VALUE_MODES: ReadonlyArray<{ value: ValueMode; label: string }> = [
  { value: 'single', label: '단일 값' },
  { value: 'range', label: '범위 (하한~상한)' },
  { value: 'atLeast', label: '~이상' },
]

const SOURCE_KIND_OPTIONS = SOURCE_KIND_CHOICES.map((value) => ({
  value,
  label: SOURCE_KIND_LABEL[value],
}))

/** 추천 지표 칩 상한 */
const SUGGESTED_CHIP_LIMIT = 8

const subjectKey = (option: { subjectType: string; subjectId: string }) =>
  `${option.subjectType}:${option.subjectId}`

function initialMode(observation: Observation | null): ValueMode {
  if (!observation) return 'single'
  if (observation.atLeast) return 'atLeast'
  if (observation.low != null && observation.high != null) return 'range'
  return 'single'
}

function pointToFields(point: Observation['start']) {
  return {
    era: point?.era ?? 'AD',
    year: point ? String(point.year) : '',
    month: point?.month ? String(point.month) : '',
    day: point?.day ? String(point.day) : '',
  }
}

function fieldsToPoint(fields: ReturnType<typeof pointToFields>): StructuredPointInput | null {
  if (!fields.year.trim()) return null
  return {
    era: fields.era as 'BC' | 'AD',
    year: Number(fields.year),
    month: fields.month ? Number(fields.month) : null,
    day: fields.day ? Number(fields.day) : null,
  }
}

/** 숫자 칸 — 쉼표·공백은 허용하고 지운다('637,000'). 비면 null */
function cleanNumber(raw: string): string | null {
  const stripped = raw.replace(/[,\s]/g, '')
  return stripped === '' ? null : stripped
}

const isNumeric = (raw: string | null) => raw === null || Number.isFinite(Number(raw))

const withCommas = (raw: string | null | undefined) =>
  raw == null || raw === '' || !Number.isFinite(Number(raw))
    ? (raw ?? '')
    : Number(raw).toLocaleString('en-US', { maximumFractionDigits: 6 })

/**
 * 수치 기록·수정 모달 — 사건 등록 모달(EventRegisterModal)과 동일한 RegisterModal 셸·2단 분할·스티키 푸터 문법.
 *
 * - 좌측 열: [대상 · 수치](필수) + [세부 설정](단서 · 추정 성격 · 측정 시점 · 메모)
 * - 우측 열: 실시간 표시·타 진영 비례 비교 미리보기 + [출처 · 근거](등록 출처 검색 / 새 출처 직접 입력)
 * - 하단 고정 푸터: 누락 필수 항목 점프 버튼, 단축키 안내(⌘↵ 저장 · ⇧⌘↵ 기록 후 계속), 연속 기록 지원
 */
export function ObservationFormModal({
  eventId,
  subjects,
  suggestedMetricKeys = [],
  preferredSubjectType,
  initial,
  presetSubject = null,
  presetMetricKey = null,
  initialBatchMode = false,
  onClose,
  subjectLabelOf,
}: ObservationFormModalProps) {
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const metricSelectRef = useRef<HTMLSelectElement | null>(null)
  const valueInputRef = useRef<HTMLInputElement | null>(null)
  const currencySelectRef = useRef<HTMLSelectElement | null>(null)
  const newSourceTitleRef = useRef<HTMLInputElement | null>(null)
  const subjectButtonRef = useRef<HTMLButtonElement | null>(null)

  const focusValueFirst = Boolean(initial) || Boolean(presetMetricKey)

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(readInitialLayoutMode)
  const [activeSectionId, setActiveSectionId] = useState<string>(FORM_SECTION_LINKS[0].id)
  const [isDirty, setIsDirty] = useState(false)

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next: LayoutMode = prev === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
      } catch {
        // storage disabled
      }
      return next
    })
  }, [])

  const { data: metrics = [] } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: listMetricDefinitions,
    staleTime: 10 * 60_000,
  })

  const defaultSubjectValue = useMemo(() => {
    if (initial) return subjectKey(initial)
    if (presetSubject) return subjectKey(presetSubject)
    const preferred = subjects.find((option) => option.subjectType === preferredSubjectType)
    return subjectKey(preferred ?? subjects[0])
  }, [initial, presetSubject, preferredSubjectType, subjects])

  const [subject, setSubject] = useState(defaultSubjectValue)
  const [entryMode, setEntryMode] = useState<EntryMode>(() =>
    !initial && initialBatchMode ? 'batch' : 'single',
  )
  const [metricKey, setMetricKey] = useState(initial?.metric.key ?? presetMetricKey ?? '')
  const [metricFilter, setMetricFilter] = useState('')
  const [mode, setMode] = useState<ValueMode>(initialMode(initial))
  const [value, setValue] = useState(withCommas(initial?.value))
  const [low, setLow] = useState(withCommas(initial?.low))
  const [high, setHigh] = useState(withCommas(initial?.high))
  const [approx, setApprox] = useState(initial?.approx ?? true)
  const [qualifier, setQualifier] = useState(initial?.qualifier ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [estimateRole, setEstimateRole] = useState<EstimateRole | ''>(initial?.estimateRole ?? '')
  const [method, setMethod] = useState<EstimateMethod | ''>(initial?.method ?? '')
  const [currencyCode, setCurrencyCode] = useState(initial?.currency?.code ?? '')
  const [start, setStart] = useState(pointToFields(initial?.start ?? null))
  const [end, setEnd] = useState(pointToFields(initial?.end ?? null))
  const [batchRows, setBatchRows] = useState<BatchRowDraft[]>([])
  const [batchAddKey, setBatchAddKey] = useState('')

  const [sourceMode, setSourceMode] = useState<'search' | 'new'>('search')
  const [sourceQuery, setSourceQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [pickedSourceId, setPickedSourceId] = useState<string | null>(null)
  const [newSource, setNewSource] = useState({
    kind: 'BOOK' as SourceKind,
    tier: '' as SourceTier | '',
    title: '',
    authors: '',
    publishedYear: '',
    url: '',
  })
  const [locator, setLocator] = useState('')
  const [quote, setQuote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(sourceQuery.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [sourceQuery])

  const { data: sourceResults = [] } = useQuery({
    queryKey: ['sources', debouncedQuery],
    queryFn: () => searchSources(debouncedQuery),
    enabled: sourceMode === 'search',
    staleTime: 30_000,
  })

  const selectableSources = useMemo(
    () => sourceResults.filter((source) => source.kind !== 'LEGACY_UNVERIFIED'),
    [sourceResults],
  )

  const subjectGroups = useMemo(() => {
    const groups = new Map<ObservationSubjectType, ObservationSubjectOption[]>()
    for (const option of subjects) {
      groups.set(option.subjectType, [...(groups.get(option.subjectType) ?? []), option])
    }
    return [...groups.entries()]
  }, [subjects])

  const currentSubject = subjects.find((option) => subjectKey(option) === subject) ?? null
  const isPoliticalPartySubject =
    (initial?.subjectType ?? currentSubject?.subjectType) === 'POLITICAL_PARTY'

  /** 사건·진영·참여국 모달에서는 정당 전용 지표(의석 수 = CHAMBER 필수 등)를 숨겨 400 오류와 혼란을 막는다 */
  const availableMetrics = useMemo(
    () =>
      metrics.filter((candidate) => {
        if (initial?.metric.key === candidate.key) return true
        if (isPoliticalPartySubject) return true
        if (candidate.dimension === 'CHAMBER') return false
        if (candidate.key.startsWith('party.')) return false
        return true
      }),
    [metrics, initial?.metric.key, isPoliticalPartySubject],
  )

  const metric = availableMetrics.find((candidate) => candidate.key === metricKey) ?? null
  const isMoneyMetric = metric?.valueKind === 'MONEY'

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: getAllCurrencies,
    enabled: isMoneyMetric,
    staleTime: 5 * 60_000,
  })

  const suggestedMetrics = useMemo(
    () =>
      suggestedMetricKeys
        .flatMap((key) => availableMetrics.filter((candidate) => candidate.key === key))
        .slice(0, SUGGESTED_CHIP_LIMIT),
    [availableMetrics, suggestedMetricKeys],
  )

  /* 일괄 입력 행 초기화 — 추천 지표(없으면 보편 인명·규모 기본 지표) 중 비금액 지표를 기본 행으로 세운다 */
  useEffect(() => {
    if (availableMetrics.length === 0 || batchRows.length > 0) return
    const seedKeys =
      suggestedMetricKeys.length > 0
        ? suggestedMetricKeys
        : [...DEFAULT_BATCH_FALLBACK_KEYS]
    const initialRows = seedKeys
      .map((key) => availableMetrics.find((candidate) => candidate.key === key))
      .filter(
        (candidate): candidate is MetricDefinition =>
          Boolean(candidate) && candidate.valueKind !== 'MONEY',
      )
      .slice(0, 6)
      .map((candidate) => ({
        metricKey: candidate.key,
        raw: '',
        approx: true,
        qualifier: '',
      }))
    if (initialRows.length > 0) {
      setBatchRows(initialRows)
    }
  }, [availableMetrics, batchRows.length, suggestedMetricKeys])

  const metricsByDomain = useMemo(() => {
    const groups = new Map<string, MetricDefinition[]>()
    for (const candidate of availableMetrics) {
      groups.set(candidate.domain, [...(groups.get(candidate.domain) ?? []), candidate])
    }
    return [...groups.entries()]
  }, [availableMetrics])

  const quickFilteredMetrics = useMemo(() => {
    const query = metricFilter.trim().toLowerCase()
    if (!query) return []
    return availableMetrics
      .filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(query) ||
          candidate.key.toLowerCase().includes(query) ||
          (DOMAIN_LABEL[candidate.domain] ?? candidate.domain).toLowerCase().includes(query),
      )
      .slice(0, 8)
  }, [metricFilter, availableMetrics])

  const [subjectLevel, setSubjectLevel] = useState<ObservationSubjectType>(
    () => currentSubject?.subjectType ?? subjects[0]?.subjectType ?? 'EVENT',
  )
  const levelOptions = subjectGroups.find(([type]) => type === subjectLevel)?.[1] ?? []

  const switchLevel = (type: ObservationSubjectType) => {
    setSubjectLevel(type)
    setIsDirty(true)
    const options = subjectGroups.find(([candidate]) => candidate === type)?.[1] ?? []
    if (!options.some((option) => subjectKey(option) === subject) && options[0]) {
      setSubject(subjectKey(options[0]))
    }
  }

  /* ── 값 계산 & 실시간 미리보기 (단일 값 칸에 '3~4', '50여', '1,000+'를 바로 적어도 자동 해석) ── */
  const singleQuickParsed = useMemo(() => {
    if (mode !== 'single' || !value.trim()) return null
    const looksLikeShorthand = /[~–—+]|이상|여|^약\s|^추산\s|^추정\s/.test(value.trim())
    return looksLikeShorthand ? parseQuickObservationInput(value, approx) : null
  }, [mode, value, approx])

  const numbers =
    mode === 'single' && singleQuickParsed?.ok
      ? singleQuickParsed.data
      : {
          value: mode === 'atLeast' ? null : cleanNumber(value),
          low: mode === 'single' ? null : cleanNumber(low),
          high: mode === 'range' ? cleanNumber(high) : null,
          atLeast: mode === 'atLeast',
          approx,
        }
  const numbersValid =
    singleQuickParsed && !singleQuickParsed.ok
      ? false
      : isNumeric(numbers.value) && isNumeric(numbers.low) && isNumeric(numbers.high)
  const hasNumber =
    numbers.value !== null || numbers.low !== null || numbers.high !== null
  const rangeIncomplete =
    mode === 'range' &&
    hasNumber &&
    (numbers.low === null || numbers.high === null)
  const rangeReversed =
    numbers.low !== null &&
    numbers.high !== null &&
    numbersValid &&
    Number(numbers.low) > Number(numbers.high)
  const pointOutOfRange =
    mode === 'range' &&
    numbersValid &&
    numbers.value !== null &&
    ((numbers.low !== null && Number(numbers.value) < Number(numbers.low)) ||
      (numbers.high !== null && Number(numbers.value) > Number(numbers.high)))

  const isBatch = entryMode === 'batch' && !initial
  const parsedBatchItems = useMemo(
    () =>
      batchRows
        .map((row) => {
          const def = availableMetrics.find((candidate) => candidate.key === row.metricKey)
          if (!def) return null
          const trimmed = row.raw.trim()
          if (!trimmed) {
            return { row, metric: def, filled: false as const, parsed: null }
          }
          const parsed = parseQuickObservationInput(trimmed, row.approx)
          return { row, metric: def, filled: true as const, parsed }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [batchRows, availableMetrics],
  )
  const filledBatchItems = parsedBatchItems.filter((item) => item.filled)
  const invalidBatchItem = filledBatchItems.find(
    (item) => item.parsed && !item.parsed.ok,
  )

  const previewTarget = metric
    ? {
        ...numbers,
        metric,
        currency: currencyCode.trim()
          ? { code: currencyCode.trim(), name: currencyCode.trim(), symbol: '' }
          : null,
      }
    : null
  const preview =
    previewTarget && hasNumber && numbersValid
      ? formatObservationValue(previewTarget)
      : ''
  const previewExact =
    previewTarget && hasNumber && numbersValid
      ? formatObservationExact({ ...previewTarget, approx: false })
      : ''
  const unit = metric ? unitSuffixOf({ metric, currency: null }) : ''

  const citationDraft = (): CitationInput | null => {
    const extra = { locator: locator.trim() || null, quote: quote.trim() || null }
    if (sourceMode === 'search') {
      return pickedSourceId ? { sourceId: pickedSourceId, ...extra } : null
    }
    if (!newSource.title.trim()) return null
    return {
      source: {
        kind: newSource.kind,
        title: newSource.title.trim(),
        authors: newSource.authors.trim() || null,
        publishedYear: newSource.publishedYear ? Number(newSource.publishedYear) : null,
        url: newSource.url.trim() || null,
        tier: newSource.tier || null,
      },
      ...extra,
    }
  }
  const citation = citationDraft()
  const newSourceTouched = Boolean(
    newSource.authors.trim() || newSource.publishedYear.trim() || newSource.url.trim(),
  )

  const blocker = isBatch
    ? filledBatchItems.length === 0
      ? '기록할 수치를 하나 이상 입력해 주세요'
      : invalidBatchItem && invalidBatchItem.parsed && !invalidBatchItem.parsed.ok
        ? `${invalidBatchItem.metric.name}: ${invalidBatchItem.parsed.error}`
        : sourceMode === 'new' && !newSource.title.trim() && newSourceTouched
          ? '새 출처의 제목을 입력해 주세요'
          : null
    : !metric
      ? '지표를 선택해 주세요'
      : !numbersValid
        ? singleQuickParsed && !singleQuickParsed.ok
          ? singleQuickParsed.error
          : '값은 숫자로 입력해 주세요 (쉼표·범위 3~4 허용)'
        : !hasNumber
          ? '수치를 입력해 주세요'
          : rangeIncomplete
            ? '범위의 하한과 상한을 모두 입력해 주세요'
            : rangeReversed
              ? '범위의 하한이 상한보다 큽니다'
              : pointOutOfRange
                ? '대표값은 범위의 하한과 상한 사이여야 합니다'
                : isMoneyMetric && !currencyCode.trim()
                  ? '금액 지표에는 통화 선택이 필요합니다'
                  : sourceMode === 'new' && !newSource.title.trim() && newSourceTouched
                    ? '새 출처의 제목을 입력해 주세요'
                    : null

  const withoutSource = !initial && !citation

  const { data: eventObservations = [] } = useQuery(
    eventObservationsQueryOptions(eventId),
  )

  const comparisons = useMemo(() => {
    if (!metric) return []
    const currentKey = initial ? subjectKey(initial) : subject
    const currentType = initial?.subjectType ?? currentSubject?.subjectType
    return eventObservations
      .filter(
        (entry) =>
          entry.metric.key === metric.key &&
          entry.id !== initial?.id &&
          subjectKey(entry) !== currentKey &&
          entry.subjectType === currentType,
      )
      .map((entry) => {
        const option = subjects.find(
          (candidate) => subjectKey(candidate) === subjectKey(entry),
        )
        return option
          ? {
              id: entry.id,
              option,
              entry,
              center: observationExtent(entry)?.center ?? null,
            }
          : null
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, 4)
  }, [eventObservations, metric, initial, subject, subjects, currentSubject])

  const currentCenter =
    previewTarget && hasNumber && numbersValid
      ? (observationExtent(previewTarget)?.center ?? null)
      : null
  const compareMax = Math.max(
    currentCenter ?? 0,
    ...comparisons.map((row) => row.center ?? 0),
  )

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    const section = document.getElementById(sectionId)
    if (!section) return
    const leftPane = document.getElementById('obs-form-split-left')
    const rightPane = document.getElementById('obs-form-split-right')
    if (sectionId === 'obs-form-group-source' && rightPane) {
      section.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      return
    }
    if (sectionId === 'obs-form-group-core' && leftPane) {
      leftPane.scrollTo?.({ top: 0, behavior: 'smooth' })
      leftPane.scrollTop = 0
      return
    }
    section.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFormScroll = useCallback((scrollEvent: UIEvent<HTMLDivElement>) => {
    const target = scrollEvent.target as HTMLElement | null
    if (target?.id === 'obs-form-split-right') {
      setActiveSectionId((prev) =>
        prev === 'obs-form-group-source' ? prev : 'obs-form-group-source',
      )
      return
    }
    if (target?.id === 'obs-form-split-left') {
      const leftRect = target.getBoundingClientRect()
      const detailsEl = document.getElementById('obs-form-group-details')
      const nextId =
        detailsEl && detailsEl.getBoundingClientRect().top <= leftRect.top + 110
          ? 'obs-form-group-details'
          : 'obs-form-group-core'
      setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
      return
    }
    const container = scrollEvent.currentTarget
    const threshold = container.getBoundingClientRect().top + 110
    let currentId: string = FORM_SECTION_LINKS[0].id
    for (const item of FORM_SECTION_LINKS) {
      const sectionEl = document.getElementById(item.id)
      if (sectionEl && sectionEl.getBoundingClientRect().top <= threshold) {
        currentId = item.id
      }
    }
    setActiveSectionId((prev) => (prev === currentId ? prev : currentId))
  }, [])

  const focusFirstMissingField = useCallback(() => {
    if (!metric) {
      scrollToSection('obs-form-group-core')
      metricSelectRef.current?.focus()
      return
    }
    if (!numbersValid || !hasNumber || rangeReversed) {
      scrollToSection('obs-form-group-core')
      valueInputRef.current?.focus()
      return
    }
    if (isMoneyMetric && !currencyCode.trim()) {
      scrollToSection('obs-form-group-core')
      currencySelectRef.current?.focus()
      return
    }
    if (sourceMode === 'new' && !newSource.title.trim() && newSourceTouched) {
      scrollToSection('obs-form-group-source')
      newSourceTitleRef.current?.focus()
    }
  }, [
    currencyCode,
    hasNumber,
    isMoneyMetric,
    metric,
    newSource.title,
    newSourceTouched,
    numbersValid,
    rangeReversed,
    scrollToSection,
    sourceMode,
  ])

  const requestClose = useCallback(async () => {
    if (saving) return
    if (
      isDirty &&
      !(await confirm({ title: '확인', message: LEAVE_CONFIRM_MESSAGE }))
    ) {
      return
    }
    onClose()
  }, [isDirty, onClose, saving])

  const handleReset = useCallback(async () => {
    if (saving) return
    if (
      isDirty &&
      !(await confirm({ title: '초기화 확인', message: RESET_CONFIRM_MESSAGE }))
    ) {
      return
    }
    setSubject(defaultSubjectValue)
    setMetricKey(presetMetricKey ?? '')
    setMetricFilter('')
    setMode('single')
    setValue('')
    setLow('')
    setHigh('')
    setApprox(true)
    setQualifier('')
    setNote('')
    setEstimateRole('')
    setMethod('')
    setCurrencyCode('')
    setStart(pointToFields(null))
    setEnd(pointToFields(null))
    setPickedSourceId(null)
    setSourceQuery('')
    setNewSource({
      kind: 'BOOK',
      tier: '',
      title: '',
      authors: '',
      publishedYear: '',
      url: '',
    })
    setLocator('')
    setQuote('')
    setIsDirty(false)
    scrollToSection('obs-form-group-core')
  }, [defaultSubjectValue, isDirty, presetMetricKey, saving, scrollToSection])

  const submitObservation = useCallback(
    async (keepOpenAfterSave: boolean) => {
      if (isBatch) {
        if (blocker || filledBatchItems.length === 0) {
          notify.error(blocker ?? '기록할 수치를 하나 이상 입력해 주세요')
          scrollToSection('obs-form-group-core')
          return
        }
        const target = subjects.find((option) => subjectKey(option) === subject)!
        setSaving(true)
        try {
          let sharedSourceId: string | null = null
          for (const [idx, item] of filledBatchItems.entries()) {
            if (!item.parsed || !item.parsed.ok) continue
            const rowCitations: CitationInput[] =
              idx === 0
                ? citation
                  ? [citation]
                  : []
                : sharedSourceId
                  ? [
                      {
                        sourceId: sharedSourceId,
                        locator: locator.trim() || null,
                        quote: quote.trim() || null,
                      },
                    ]
                  : citation
                    ? [citation]
                    : []
            const created = await createObservation({
              subjectType: target.subjectType,
              subjectId: target.subjectId,
              metricKey: item.metric.key,
              ...item.parsed.data,
              qualifier: item.row.qualifier.trim() || null,
              note: note.trim() || null,
              estimateRole: estimateRole || null,
              method: method || null,
              start: fieldsToPoint(start),
              end: fieldsToPoint(end),
              citations: rowCitations,
            })
            if (idx === 0) {
              sharedSourceId = created.citations?.[0]?.source?.id ?? null
            }
          }

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: eventKeys.observations(eventId) }),
            queryClient.invalidateQueries({ queryKey: eventKeys.sideUnits(eventId) }),
            ...(sourceMode === 'new' && citation
              ? [queryClient.invalidateQueries({ queryKey: ['sources'] })]
              : []),
          ])

          if (keepOpenAfterSave) {
            notify.success(
              `수치 ${filledBatchItems.length}건을 기록했습니다. 다음 대상 수치를 이어서 입력할 수 있습니다.`,
            )
            if (sourceMode === 'new' && sharedSourceId) {
              setSourceMode('search')
              setPickedSourceId(sharedSourceId)
              setNewSource({
                kind: 'BOOK',
                tier: '',
                title: '',
                authors: '',
                publishedYear: '',
                url: '',
              })
            }
            if (levelOptions.length > 1) {
              const currentIdx = levelOptions.findIndex(
                (option) => subjectKey(option) === subject,
              )
              const nextOption =
                levelOptions[currentIdx + 1] ?? levelOptions[0]
              if (nextOption && subjectKey(nextOption) !== subject) {
                setSubject(subjectKey(nextOption))
              }
            }
            setBatchRows((prev) =>
              prev.map((row) => ({ ...row, raw: '', qualifier: '' })),
            )
            setIsDirty(false)
            return
          }

          notify.success(`수치 ${filledBatchItems.length}건을 한 번에 기록했습니다`)
          setIsDirty(false)
          onClose()
        } catch (error) {
          notify.error(error instanceof Error ? error.message : '저장하지 못했습니다')
        } finally {
          setSaving(false)
        }
        return
      }

      if (blocker || !metric) {
        notify.error(blocker ?? '지표를 선택해 주세요')
        focusFirstMissingField()
        return
      }
      const common = {
        metricKey: metric.key,
        ...numbers,
        qualifier: qualifier.trim() || null,
        note: note.trim() || null,
        estimateRole: estimateRole || null,
        method: method || null,
        currencyCode: isMoneyMetric ? currencyCode.trim() || null : null,
        start: fieldsToPoint(start),
        end: fieldsToPoint(end),
      }
      setSaving(true)
      try {
        let createdSourceId: string | null = null
        if (initial) {
          const keep = initial.citations.map((existing) => ({
            sourceId: existing.source.id,
            locator: existing.locator,
            quote: existing.quote,
            note: existing.note,
          }))
          await updateObservation(initial.id, {
            ...common,
            ...(citation ? { citations: [...keep, citation] } : {}),
          })
        } else {
          const target = subjects.find((option) => subjectKey(option) === subject)!
          const created = await createObservation({
            subjectType: target.subjectType,
            subjectId: target.subjectId,
            ...common,
            citations: citation ? [citation] : [],
          })
          createdSourceId = created.citations?.[0]?.source?.id ?? null
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: eventKeys.observations(eventId) }),
          queryClient.invalidateQueries({ queryKey: eventKeys.sideUnits(eventId) }),
          ...(sourceMode === 'new' && citation
            ? [queryClient.invalidateQueries({ queryKey: ['sources'] })]
            : []),
        ])

        if (keepOpenAfterSave && !initial) {
          notify.success('수치를 기록했습니다. 다음 대상·수치를 이어서 입력할 수 있습니다.')
          /* 방금 새 출처를 등록했으면 다음 연속 입력에서는 해당 출처를 그대로 유지 */
          if (sourceMode === 'new' && createdSourceId) {
            setSourceMode('search')
            setPickedSourceId(createdSourceId)
            setNewSource({
              kind: 'BOOK',
              tier: '',
              title: '',
              authors: '',
              publishedYear: '',
              url: '',
            })
          }
          /* 같은 층에 아직 기록되지 않은 다음 진영·참여국이 있으면 자동으로 넘긴다 */
          if (levelOptions.length > 1) {
            const currentIdx = levelOptions.findIndex(
              (option) => subjectKey(option) === subject,
            )
            const recordedKeys = new Set(
              eventObservations
                .filter((obs) => obs.metric.key === metric.key)
                .map((obs) => subjectKey(obs)),
            )
            recordedKeys.add(subject)
            const nextUnrecorded = levelOptions.find(
              (option, idx) =>
                idx > currentIdx && !recordedKeys.has(subjectKey(option)),
            ) ?? levelOptions.find((option) => !recordedKeys.has(subjectKey(option)))
            if (nextUnrecorded) {
              setSubject(subjectKey(nextUnrecorded))
            }
          }
          setValue('')
          setLow('')
          setHigh('')
          setQualifier('')
          setNote('')
          setLocator('')
          setQuote('')
          setIsDirty(false)
          window.requestAnimationFrame(() => valueInputRef.current?.focus())
          return
        }

        notify.success(initial ? '수치를 수정했습니다' : '수치를 기록했습니다')
        setIsDirty(false)
        onClose()
      } catch (error) {
        notify.error(error instanceof Error ? error.message : '저장하지 못했습니다')
      } finally {
        setSaving(false)
      }
    },
    [
      blocker,
      citation,
      currencyCode,
      end,
      estimateRole,
      eventId,
      eventObservations,
      filledBatchItems,
      focusFirstMissingField,
      initial,
      isBatch,
      isMoneyMetric,
      levelOptions,
      locator,
      metric,
      method,
      note,
      numbers,
      onClose,
      qualifier,
      queryClient,
      quote,
      scrollToSection,
      sourceMode,
      start,
      subject,
      subjects,
    ],
  )

  /** 모달 안 어디서든 Cmd/Ctrl + Enter로 저장, Cmd/Ctrl + Shift + Enter로 기록 후 계속 */
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if ((keyEvent.metaKey || keyEvent.ctrlKey) && keyEvent.key === 'Enter') {
        if (keyEvent.defaultPrevented || saving || Boolean(blocker)) return
        keyEvent.preventDefault()
        void submitObservation(Boolean(keyEvent.shiftKey && !initial))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [blocker, initial, saving, submitObservation])

  const subjectName = initial
    ? subjectLabelOf(initial)
    : (currentSubject?.label ?? '')
  const detailBadges = [
    qualifier.trim() ? '단서' : '',
    estimateRole ? ESTIMATE_ROLE_LABEL[estimateRole] : '',
    method ? ESTIMATE_METHOD_LABEL[method] : '',
    start.year.trim() || end.year.trim() ? '시점' : '',
    note.trim() ? '메모' : '',
  ].filter(Boolean)

  const summary = isBatch
    ? [
        subjectName,
        filledBatchItems.length > 0 ? `${filledBatchItems.length}개 지표` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : [subjectName, metric?.name, preview].filter(Boolean).join(' · ')
  const pickedSource =
    selectableSources.find((source) => source.id === pickedSourceId) ?? null
  const previewSource: {
    title: string
    tier: SourceTier | null
    unverified: boolean
  } | null =
    sourceMode === 'search' && pickedSource
      ? { title: pickedSource.title, tier: pickedSource.tier, unverified: false }
      : sourceMode === 'new' && newSource.title.trim()
        ? {
            title: newSource.title.trim(),
            tier: newSource.tier || null,
            unverified: false,
          }
        : initial?.citations[0]
          ? {
              title: initial.citations[0].source.title,
              tier: initial.citations[0].source.tier,
              unverified: initial.citations.every(
                (existing) => existing.source.kind === 'LEGACY_UNVERIFIED',
              ),
            }
          : null

  const coreReady = isBatch
    ? filledBatchItems.length > 0 && !invalidBatchItem
    : Boolean(metric) &&
      hasNumber &&
      numbersValid &&
      !rangeIncomplete &&
      !rangeReversed &&
      !pointOutOfRange
  const sourceCount =
    (initial?.citations.length ?? 0) + (citation ? 1 : 0)
  const accentColor = currentSubject?.color ?? undefined

  /* ───────────────────────── 그룹 1: 대상 · 수치 ───────────────────────── */
  const coreGroup = (
    <FormGroup
      id="obs-form-group-core"
      aria-labelledby="obs-form-group-core-title"
    >
      <FormGroupTitle id="obs-form-group-core-title" $accent={accentColor}>
        <span>대상 · 수치</span>
        {!initial && (
          <EntryModeToggleWrap role="group" aria-label="기록 방식 선택">
            <RoleChipGroup>
              <RoleChipBtn
                type="button"
                $active={entryMode === 'single'}
                onClick={() => setEntryMode('single')}
              >
                단건 기록
              </RoleChipBtn>
              <RoleChipBtn
                type="button"
                $active={entryMode === 'batch'}
                onClick={() => setEntryMode('batch')}
              >
                여러 지표 한 번에
              </RoleChipBtn>
            </RoleChipGroup>
          </EntryModeToggleWrap>
        )}
        {!isBatch && preview && metric && (
          <FormGroupSummaryBadge>
            {metric.name} · {preview}
          </FormGroupSummaryBadge>
        )}
        {isBatch && filledBatchItems.length > 0 && (
          <FormGroupSummaryBadge>
            입력 {filledBatchItems.length}건
          </FormGroupSummaryBadge>
        )}
      </FormGroupTitle>

      {/* 대상 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          기록 대상<EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          {initial ? (
            <SelectedSubjectBadge>
              {currentSubject?.color && (
                <ColorSwatch style={{ background: currentSubject.color }} aria-hidden />
              )}
              <span>{subjectName}</span>
              <SubjectTypeTag>
                {SUBJECT_GROUP_LABEL[initial.subjectType] ?? initial.subjectType}
              </SubjectTypeTag>
            </SelectedSubjectBadge>
          ) : (
            <SubjectStack>
              {subjectGroups.length > 1 && (
                <RoleChipGroup role="group" aria-label="기록 대상 범위">
                  {subjectGroups.map(([type, options]) => (
                    <RoleChipBtn
                      key={type}
                      type="button"
                      $active={subjectLevel === type}
                      onClick={() => switchLevel(type)}
                    >
                      {SUBJECT_GROUP_LABEL[type] ?? type}
                      {type !== 'EVENT' && (
                        <ChipCount>{options.length}</ChipCount>
                      )}
                    </RoleChipBtn>
                  ))}
                </RoleChipGroup>
              )}
              {subjectLevel !== 'EVENT' && (
                <PillGrid role="group" aria-label={SUBJECT_GROUP_LABEL[subjectLevel] ?? '대상 선택'}>
                  {levelOptions.map((option) => {
                    const selected = subject === subjectKey(option)
                    return (
                      <ChoicePill
                        key={subjectKey(option)}
                        ref={selected ? subjectButtonRef : undefined}
                        type="button"
                        $selected={selected}
                        $tint={option.color}
                        aria-pressed={selected}
                        onClick={() => {
                          setSubject(subjectKey(option))
                          setIsDirty(true)
                        }}
                      >
                        {option.color && (
                          <ColorSwatch
                            style={{ background: option.color }}
                            aria-hidden
                          />
                        )}
                        <span>{option.label}</span>
                        {selected && <FiCheck size={13} aria-hidden />}
                      </ChoicePill>
                    )
                  })}
                </PillGrid>
              )}
            </SubjectStack>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {isBatch ? (
        <EventFormS.FormRow>
          <EventFormS.FormLabel as="div">
            일괄 수치<EventFormS.Required>*</EventFormS.Required>
          </EventFormS.FormLabel>
          <EventFormS.FormField>
            <EventFormS.Hint style={{ marginBottom: 8 }}>
              값이 있는 줄만 저장됩니다. <strong>3~4</strong>(범위), <strong>50</strong>(단일),{' '}
              <strong>1,000+</strong>(~이상) 형식을 그대로 적을 수 있습니다.
            </EventFormS.Hint>
            <BatchRowsList role="group" aria-label="여러 지표 빠른 입력">
              {parsedBatchItems.map(({ row, metric: rowMetric, filled, parsed }) => {
                const rowUnit = unitSuffixOf({ metric: rowMetric, currency: null })
                const rowError = filled && parsed && !parsed.ok ? parsed.error : null
                const rowPreview =
                  filled && parsed && parsed.ok
                    ? formatObservationValue({
                        ...parsed.data,
                        metric: rowMetric,
                        currency: null,
                      })
                    : ''
                return (
                  <BatchMetricCard
                    key={row.metricKey}
                    $filled={filled && !rowError}
                    $invalid={Boolean(rowError)}
                  >
                    <BatchMetricTop>
                      <BatchMetricLabel title={rowMetric.definition ?? undefined}>
                        <strong>{rowMetric.name}</strong>
                        {rowUnit && <small>({rowUnit})</small>}
                      </BatchMetricLabel>
                      {rowPreview && (
                        <BatchPreviewPill>{rowPreview}</BatchPreviewPill>
                      )}
                      <ApproxChip
                        type="button"
                        $active={row.approx}
                        aria-pressed={row.approx}
                        onClick={() => {
                          setBatchRows((prev) =>
                            prev.map((candidate) =>
                              candidate.metricKey === row.metricKey
                                ? { ...candidate, approx: !candidate.approx }
                                : candidate,
                            ),
                          )
                          setIsDirty(true)
                        }}
                      >
                        {row.approx && <FiCheck size={11} aria-hidden />}
                        약
                      </ApproxChip>
                    </BatchMetricTop>
                    <BatchInputRow>
                      <EventFormS.Input
                        value={row.raw}
                        onChange={(changeEvent) => {
                          const nextVal = changeEvent.target.value
                          setBatchRows((prev) =>
                            prev.map((candidate) =>
                              candidate.metricKey === row.metricKey
                                ? { ...candidate, raw: nextVal }
                                : candidate,
                            ),
                          )
                          setIsDirty(true)
                        }}
                        placeholder="예: 3~4 · 50 · 1,000+"
                        aria-label={`${rowMetric.name} 수치`}
                      />
                      <EventFormS.Input
                        value={row.qualifier}
                        onChange={(changeEvent) => {
                          const nextQual = changeEvent.target.value
                          setBatchRows((prev) =>
                            prev.map((candidate) =>
                              candidate.metricKey === row.metricKey
                                ? { ...candidate, qualifier: nextQual }
                                : candidate,
                            ),
                          )
                          setIsDirty(true)
                        }}
                        placeholder="단서 (선택 — 예: 시위대 측 · 부상 후 사망 포함)"
                        aria-label={`${rowMetric.name} 단서`}
                      />
                    </BatchInputRow>
                    {rowError && (
                      <EventFormS.ErrorMessage role="alert">
                        {rowError}
                      </EventFormS.ErrorMessage>
                    )}
                  </BatchMetricCard>
                )
              })}
            </BatchRowsList>

            <BatchAddMetricRow>
              <FormSelectNative
                aria-label="일괄 입력에 다른 지표 행 추가"
                value={batchAddKey}
                onChange={(changeEvent) => {
                  const nextKey = changeEvent.target.value
                  if (!nextKey) return
                  if (!batchRows.some((item) => item.metricKey === nextKey)) {
                    setBatchRows((prev) => [
                      ...prev,
                      { metricKey: nextKey, raw: '', approx: true, qualifier: '' },
                    ])
                  }
                  setBatchAddKey('')
                }}
              >
                <option value="">+ 다른 지표 행 추가…</option>
                {metricsByDomain.map(([domain, group]) => {
                  const remaining = group.filter(
                    (candidate) =>
                      candidate.valueKind !== 'MONEY' &&
                      !batchRows.some((existing) => existing.metricKey === candidate.key),
                  )
                  if (remaining.length === 0) return null
                  return (
                    <optgroup key={domain} label={DOMAIN_LABEL[domain] ?? domain}>
                      {remaining.map((candidate) => (
                        <option key={candidate.key} value={candidate.key}>
                          {candidate.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </FormSelectNative>
            </BatchAddMetricRow>
          </EventFormS.FormField>
        </EventFormS.FormRow>
      ) : (
        <>
      {/* 지표 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="obs-metric-select">
          지표<EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          {suggestedMetrics.length > 0 && (
            <PillGrid role="group" aria-label="추천 지표">
              {suggestedMetrics.map((candidate) => {
                const selected = metricKey === candidate.key
                return (
                  <ChoicePill
                    key={candidate.key}
                    type="button"
                    $selected={selected}
                    aria-pressed={selected}
                    onClick={() => {
                      setMetricKey(candidate.key)
                      setMetricFilter('')
                      setIsDirty(true)
                    }}
                  >
                    <span>{candidate.name}</span>
                    {selected && <FiCheck size={13} aria-hidden />}
                  </ChoicePill>
                )
              })}
            </PillGrid>
          )}

          <MetricSelectGrid>
            <FormSelectNative
              id="obs-metric-select"
              ref={metricSelectRef}
              value={metricKey}
              aria-label="전체 지표 목록에서 선택"
              onChange={(changeEvent) => {
                setMetricKey(changeEvent.target.value)
                setIsDirty(true)
              }}
            >
              <option value="">
                {suggestedMetrics.length > 0
                  ? '전체 지표 목록에서 선택…'
                  : '기록할 지표를 선택하세요…'}
              </option>
              {metricsByDomain.map(([domain, group]) => (
                <optgroup key={domain} label={DOMAIN_LABEL[domain] ?? domain}>
                  {group.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {candidate.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </FormSelectNative>

            <QuickFilterAnchor>
              <EventFormS.Input
                type="search"
                value={metricFilter}
                onChange={(changeEvent) => setMetricFilter(changeEvent.target.value)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter' && quickFilteredMetrics[0]) {
                    keyEvent.preventDefault()
                    setMetricKey(quickFilteredMetrics[0].key)
                    setMetricFilter('')
                    setIsDirty(true)
                  }
                }}
                placeholder="지표명 빠른 검색 (예: 사망자, 부상자, 병력)"
                aria-label="지표 빠른 검색"
              />
              {metricFilter.trim() && (
                <QuickFilterDropdown role="listbox" aria-label="지표 검색 결과">
                  {quickFilteredMetrics.length === 0 ? (
                    <QuickFilterEmpty>
                      ‘{metricFilter.trim()}’에 해당하는 지표가 없습니다.
                    </QuickFilterEmpty>
                  ) : (
                    quickFilteredMetrics.map((candidate) => (
                      <QuickFilterItem
                        key={candidate.key}
                        type="button"
                        $active={metricKey === candidate.key}
                        onClick={() => {
                          setMetricKey(candidate.key)
                          setMetricFilter('')
                          setIsDirty(true)
                        }}
                      >
                        <span>{candidate.name}</span>
                        <small>{DOMAIN_LABEL[candidate.domain] ?? candidate.domain}</small>
                      </QuickFilterItem>
                    ))
                  )}
                </QuickFilterDropdown>
              )}
            </QuickFilterAnchor>
          </MetricSelectGrid>

          {metric?.definition && (
            <EventFormS.Hint>{metric.definition}</EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {/* 수치 입력 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          수치 입력<EventFormS.Required>*</EventFormS.Required>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <ValueModeToolbar>
            <RoleChipGroup role="group" aria-label="값 입력 형태">
              {VALUE_MODES.map((option) => (
                <RoleChipBtn
                  key={option.value}
                  type="button"
                  $active={mode === option.value}
                  onClick={() => {
                    if (option.value === 'range' && mode === 'single') {
                      /* 단일 값 칸에 적어 둔 숫자가 대표값으로 남아 하한·상한과 범위 충돌(400)하는 것을 방지 */
                      const parsedRange = parseQuickObservationInput(value, approx)
                      if (parsedRange.ok && parsedRange.data.low && parsedRange.data.high) {
                        setLow(withCommas(parsedRange.data.low))
                        setHigh(withCommas(parsedRange.data.high))
                      }
                      setValue('')
                    }
                    setMode(option.value)
                    setIsDirty(true)
                  }}
                >
                  {option.label}
                </RoleChipBtn>
              ))}
            </RoleChipGroup>

            <ApproxChip
              type="button"
              $active={approx}
              aria-pressed={approx}
              onClick={() => {
                setApprox((current) => !current)
                setIsDirty(true)
              }}
            >
              {approx && <FiCheck size={12} aria-hidden />}
              약(근사값)
            </ApproxChip>
          </ValueModeToolbar>

          {mode === 'single' && (
            <SingleValueWrap>
              <NumberField
                label=""
                unit={unit}
                value={value}
                allowShorthand
                onChange={(next) => {
                  setValue(next)
                  setIsDirty(true)
                }}
                placeholder="예: 50 · 3~4 · 1,000+"
                inputRef={valueInputRef}
              />
            </SingleValueWrap>
          )}

          {mode === 'range' && (
            <RangeValueGrid>
              <NumberField
                label="하한 *"
                unit={unit}
                value={low}
                onChange={(next) => {
                  setLow(next)
                  setIsDirty(true)
                }}
                placeholder="예: 3"
                inputRef={valueInputRef}
              />
              <NumberField
                label="상한 *"
                unit={unit}
                value={high}
                onChange={(next) => {
                  setHigh(next)
                  setIsDirty(true)
                }}
                placeholder="예: 4"
              />
              <NumberField
                label="대표값 (선택)"
                unit={unit}
                value={value}
                onChange={(next) => {
                  setValue(next)
                  setIsDirty(true)
                }}
                placeholder="비워 두면 중앙값 사용"
              />
            </RangeValueGrid>
          )}

          {mode === 'atLeast' && (
            <SingleValueWrap>
              <NumberField
                label="최소 하한 *"
                unit={unit}
                suffix="이상"
                value={low}
                onChange={(next) => {
                  setLow(next)
                  setIsDirty(true)
                }}
                placeholder="예: 10,000"
                inputRef={valueInputRef}
              />
            </SingleValueWrap>
          )}

          {(!numbersValid || rangeIncomplete || rangeReversed || pointOutOfRange) && (
            <EventFormS.ErrorMessage role="alert">
              {!numbersValid
                ? singleQuickParsed && !singleQuickParsed.ok
                  ? singleQuickParsed.error
                  : '수치는 숫자 또는 범위(예: 3~4)로 입력해 주세요'
                : rangeIncomplete
                  ? '범위의 하한과 상한을 모두 입력해 주세요'
                  : rangeReversed
                    ? '범위의 하한이 상한보다 클 수 없습니다'
                    : '대표값은 범위의 하한과 상한 사이여야 합니다'}
            </EventFormS.ErrorMessage>
          )}

          {isMoneyMetric && (
            <CurrencyRow>
              <FormSelectNative
                ref={currencySelectRef}
                aria-label="통화 선택"
                value={currencyCode}
                onChange={(changeEvent) => {
                  setCurrencyCode(changeEvent.target.value)
                  setIsDirty(true)
                }}
              >
                <option value="">통화 선택 *</option>
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name} ({currency.code})
                  </option>
                ))}
              </FormSelectNative>
              <EventFormS.Input
                value={currencyCode}
                onChange={(changeEvent) => {
                  setCurrencyCode(changeEvent.target.value.toUpperCase())
                  setIsDirty(true)
                }}
                placeholder="직접 입력 (예: USD, GBP, H-TAEL)"
                aria-label="통화 코드 직접 입력"
              />
            </CurrencyRow>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>
        </>
      )}
    </FormGroup>
  )

  /* ───────────────────────── 그룹 2: 세부 설정 ───────────────────────── */
  const detailsGroup = (
    <FormGroup
      id="obs-form-group-details"
      aria-labelledby="obs-form-group-details-title"
    >
      <FormGroupTitle id="obs-form-group-details-title">
        <span>세부 설정</span>
        <OptionalTag>(선택)</OptionalTag>
        {detailBadges.length > 0 && (
          <FormGroupSummaryBadge>{detailBadges.join(' · ')}</FormGroupSummaryBadge>
        )}
      </FormGroupTitle>

      {/* 단서 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="obs-qualifier">
          범위 · 단서<OptionalTag>(선택)</OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Input
            id="obs-qualifier"
            value={qualifier}
            onChange={(changeEvent) => {
              setQualifier(changeEvent.target.value)
              setIsDirty(true)
            }}
            placeholder="예: 질병 사망 별도 · 정규군 기준 · 보헤미아 전선 한정"
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {/* 추정의 성격 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          추정 성격<OptionalTag>(선택)</OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <SubOptionRow>
            <SubOptionLabel>추정 지위</SubOptionLabel>
            <RoleChipGroup role="group" aria-label="추정치 지위">
              <RoleChipBtn
                type="button"
                $active={estimateRole === ''}
                onClick={() => {
                  setEstimateRole('')
                  setIsDirty(true)
                }}
              >
                구분 없음
              </RoleChipBtn>
              {(Object.keys(ESTIMATE_ROLE_LABEL) as EstimateRole[]).map((roleKey) => (
                <RoleChipBtn
                  key={roleKey}
                  type="button"
                  $active={estimateRole === roleKey}
                  title={ESTIMATE_ROLE_HINT[roleKey]}
                  onClick={() => {
                    setEstimateRole(roleKey)
                    setIsDirty(true)
                  }}
                >
                  {ESTIMATE_ROLE_LABEL[roleKey]}
                </RoleChipBtn>
              ))}
            </RoleChipGroup>
          </SubOptionRow>

          <SubOptionRow>
            <SubOptionLabel>산정 방식</SubOptionLabel>
            <PillGrid role="group" aria-label="산정 방식">
              <ChoicePill
                type="button"
                $selected={method === ''}
                $compact
                onClick={() => {
                  setMethod('')
                  setIsDirty(true)
                }}
              >
                미상
              </ChoicePill>
              {(Object.keys(ESTIMATE_METHOD_LABEL) as EstimateMethod[]).map((methodKey) => (
                <ChoicePill
                  key={methodKey}
                  type="button"
                  $selected={method === methodKey}
                  $compact
                  title={ESTIMATE_METHOD_HINT[methodKey]}
                  onClick={() => {
                    setMethod(methodKey)
                    setIsDirty(true)
                  }}
                >
                  {ESTIMATE_METHOD_LABEL[methodKey]}
                </ChoicePill>
              ))}
            </PillGrid>
          </SubOptionRow>

          {(estimateRole || method) && (
            <EventFormS.Hint>
              {estimateRole ? ESTIMATE_ROLE_HINT[estimateRole] : ''}
              {estimateRole && method ? ' · ' : ''}
              {method ? `${ESTIMATE_METHOD_LABEL[method]}: ${ESTIMATE_METHOD_HINT[method]}` : ''}
            </EventFormS.Hint>
          )}
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {/* 측정 시점 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel as="div">
          측정 시점<OptionalTag>(선택)</OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <PointFieldList>
            {(
              [
                ['시작', start, setStart],
                ['종료', end, setEnd],
              ] as const
            ).map(([pointLabel, fields, setFields]) => (
              <PointFieldItem key={pointLabel} role="group" aria-label={`${pointLabel} 시점`}>
                <SubOptionLabel>{pointLabel}</SubOptionLabel>
                <RoleChipGroup role="group" aria-label={`${pointLabel} 기원`}>
                  {(['AD', 'BC'] as const).map((era) => (
                    <RoleChipBtn
                      key={era}
                      type="button"
                      $active={fields.era === era}
                      onClick={() => {
                        setFields({ ...fields, era })
                        setIsDirty(true)
                      }}
                    >
                      {era === 'AD' ? '서기' : '기원전'}
                    </RoleChipBtn>
                  ))}
                </RoleChipGroup>
                <DateNumberInput
                  inputMode="numeric"
                  placeholder="연도"
                  value={fields.year}
                  onChange={(changeEvent) => {
                    setFields({ ...fields, year: changeEvent.target.value })
                    setIsDirty(true)
                  }}
                  aria-label={`${pointLabel} 연도`}
                  $wide
                />
                <DateNumberInput
                  inputMode="numeric"
                  placeholder="월"
                  value={fields.month}
                  onChange={(changeEvent) => {
                    setFields({ ...fields, month: changeEvent.target.value })
                    setIsDirty(true)
                  }}
                  aria-label={`${pointLabel} 월`}
                />
                <DateNumberInput
                  inputMode="numeric"
                  placeholder="일"
                  value={fields.day}
                  onChange={(changeEvent) => {
                    setFields({ ...fields, day: changeEvent.target.value })
                    setIsDirty(true)
                  }}
                  aria-label={`${pointLabel} 일`}
                />
              </PointFieldItem>
            ))}
          </PointFieldList>
        </EventFormS.FormField>
      </EventFormS.FormRow>

      {/* 해설 · 메모 */}
      <EventFormS.FormRow>
        <EventFormS.FormLabel htmlFor="obs-note">
          해설 · 메모<OptionalTag>(선택)</OptionalTag>
        </EventFormS.FormLabel>
        <EventFormS.FormField>
          <EventFormS.Textarea
            id="obs-note"
            rows={3}
            value={note}
            onChange={(changeEvent) => {
              setNote(changeEvent.target.value)
              setIsDirty(true)
            }}
            placeholder="산정 기준이나 사료 간 차이를 기록합니다 (예: 프로이센 공식 전사 기준이며 오스트리아 측 집계는 포로를 포함해 더 크다)"
          />
        </EventFormS.FormField>
      </EventFormS.FormRow>
    </FormGroup>
  )

  /* ───────────────────────── 미리보기 배너 + 그룹 3: 출처 · 근거 ───────────────────────── */
  const previewCard = (
    <PreviewCard $accent={accentColor} aria-label="표시 미리보기">
      <PreviewHeaderRow>
        <PreviewEyebrow>표시 미리보기</PreviewEyebrow>
        <PreviewSourcePill
          $verified={Boolean(previewSource && !previewSource.unverified)}
        >
          {previewSource && !previewSource.unverified ? (
            <>
              <FiCheckCircle size={12} aria-hidden />
              {previewSource.tier ? SOURCE_TIER_LABEL[previewSource.tier] : '출처 연결됨'}
            </>
          ) : (
            <>
              <FiAlertCircle size={12} aria-hidden />
              출처 미기재
            </>
          )}
        </PreviewSourcePill>
      </PreviewHeaderRow>

      <PreviewSubjectRow>
        <ColorSwatch
          style={{ background: accentColor ?? 'var(--obs-fallback-accent)' }}
          aria-hidden
        />
        <span>{subjectName || '대상 미선택'}</span>
        <span className="sep">·</span>
        <span className={isBatch ? 'metric' : metric ? 'metric' : 'pending'}>
          {isBatch
            ? filledBatchItems.length > 0
              ? `일괄 기록 ${filledBatchItems.length}건`
              : '기록할 지표의 값을 입력하세요'
            : (metric?.name ?? '지표를 선택하세요')}
        </span>
      </PreviewSubjectRow>

      {isBatch ? (
        filledBatchItems.length > 0 ? (
          <BatchPreviewSummaryList aria-live="polite">
            {filledBatchItems.map(({ row, metric: rowMetric, parsed }) => {
              const formatted =
                parsed && parsed.ok
                  ? formatObservationValue({
                      ...parsed.data,
                      metric: rowMetric,
                      currency: null,
                    })
                  : '형식 확인 필요'
              return (
                <li key={row.metricKey}>
                  <span className="mname">{rowMetric.name}</span>
                  <strong className="mval">{formatted}</strong>
                  {row.qualifier.trim() && (
                    <small className="mqual">{row.qualifier.trim()}</small>
                  )}
                </li>
              )
            })}
          </BatchPreviewSummaryList>
        ) : (
          <PreviewValueRow>
            <strong className="value pending">
              좌측에서 사망자·부상자 등 값을 입력하면 한 번에 미리보기로 표시됩니다
            </strong>
          </PreviewValueRow>
        )
      ) : (
        <PreviewValueRow>
          <strong className={preview ? 'value' : 'value pending'} aria-live="polite">
            {preview || (metric ? '수치를 입력하면 여기에 표시됩니다' : '—')}
          </strong>
          {previewExact && previewExact !== preview && (
            <span className="exact">정확히 {previewExact}</span>
          )}
        </PreviewValueRow>
      )}

      {(estimateRole || method || qualifier.trim()) && (
        <PreviewMetaTags>
          {estimateRole && (
            <span className="tag primary">{ESTIMATE_ROLE_LABEL[estimateRole]}</span>
          )}
          {method && <span className="tag">{ESTIMATE_METHOD_LABEL[method]}</span>}
          {qualifier.trim() && <span className="qualifier">{qualifier.trim()}</span>}
        </PreviewMetaTags>
      )}

      {note.trim() && <PreviewNoteText>{note.trim()}</PreviewNoteText>}

      {previewSource && (
        <PreviewSourceLine>
          <FiBookOpen size={12} aria-hidden />
          <span>{previewSource.title}</span>
          {locator.trim() && <small>{locator.trim()}</small>}
        </PreviewSourceLine>
      )}

      {comparisons.length > 0 && (
        <CompareBox aria-label="같은 지표의 다른 대상 값 비교">
          <CompareCaption>
            같은 사건 내 {metric?.name} 비교
          </CompareCaption>
          {currentCenter !== null && (
            <CompareRow $color={accentColor} $current>
              <span className="name">{subjectName}</span>
              <span className="track">
                <span
                  className="bar"
                  style={{
                    width: `${compareMax > 0 ? Math.max(3, (currentCenter / compareMax) * 100) : 0}%`,
                  }}
                />
              </span>
              <span className="amount">{preview}</span>
            </CompareRow>
          )}
          {comparisons.map((row) => (
            <CompareRow key={row.id} $color={row.option.color ?? undefined}>
              <span className="name">{row.option.label}</span>
              <span className="track">
                <span
                  className="bar"
                  style={{
                    width: `${
                      compareMax > 0 && row.center !== null
                        ? Math.max(3, (row.center / compareMax) * 100)
                        : 0
                    }%`,
                  }}
                />
              </span>
              <span className="amount">{formatObservationValue(row.entry)}</span>
            </CompareRow>
          ))}
        </CompareBox>
      )}
    </PreviewCard>
  )

  const sourceGroup = (
    <FormGroup
      id="obs-form-group-source"
      aria-labelledby="obs-form-group-source-title"
    >
      <FormGroupTitle id="obs-form-group-source-title">
        <span>출처 · 근거</span>
        <OptionalTag>(선택 — 비우면 미검증으로 기록)</OptionalTag>
        {sourceCount > 0 && (
          <FormGroupSummaryBadge>인용 {sourceCount}</FormGroupSummaryBadge>
        )}
      </FormGroupTitle>

      {initial && initial.citations.length > 0 && (
        <ExistingCitationList aria-label="기존 연결 출처">
          {initial.citations.map((existing) => {
            const isLegacyUnverified =
              existing.source.kind === 'LEGACY_UNVERIFIED'
            return (
              <ExistingCitationCard key={existing.id}>
                <FiBookOpen size={14} aria-hidden />
                <div className="body">
                  <strong>{existing.source.title}</strong>
                  {existing.locator && <span>{existing.locator}</span>}
                </div>
                {isLegacyUnverified ? (
                  <TierBadge $warning>미검증</TierBadge>
                ) : (
                  existing.source.tier && (
                    <TierBadge>{SOURCE_TIER_LABEL[existing.source.tier]}</TierBadge>
                  )
                )}
              </ExistingCitationCard>
            )
          })}
        </ExistingCitationList>
      )}

      <SourceModeHeader>
        <RoleChipGroup role="group" aria-label="출처 입력 방식">
          <RoleChipBtn
            type="button"
            $active={sourceMode === 'search'}
            onClick={() => setSourceMode('search')}
          >
            등록된 출처 검색
          </RoleChipBtn>
          <RoleChipBtn
            type="button"
            $active={sourceMode === 'new'}
            onClick={() => setSourceMode('new')}
          >
            새 출처 직접 입력
          </RoleChipBtn>
        </RoleChipGroup>
        {sourceMode === 'search' && pickedSource && (
          <ClearPickedBtn
            type="button"
            onClick={() => {
              setPickedSourceId(null)
              setIsDirty(true)
            }}
          >
            선택 해제
          </ClearPickedBtn>
        )}
      </SourceModeHeader>

      {sourceMode === 'search' ? (
        <SourceSearchStack>
          <SearchInputWrap>
            <FiSearch size={14} aria-hidden />
            <input
              type="search"
              value={sourceQuery}
              onChange={(changeEvent) => setSourceQuery(changeEvent.target.value)}
              placeholder="사료 · 서적 · 논문 제목이나 저자, 연도로 검색"
              aria-label="등록된 출처 검색"
            />
            {sourceQuery && (
              <SearchClearBtn
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setSourceQuery('')}
              >
                <FiX size={14} />
              </SearchClearBtn>
            )}
          </SearchInputWrap>

          <SourceCardList role="listbox" aria-label="출처 검색 결과">
            {selectableSources.length === 0 ? (
              <SourceEmptyBox>
                <span>
                  {debouncedQuery
                    ? `‘${debouncedQuery}’에 일치하는 등록 출처가 없습니다.`
                    : '아직 검색할 등록 출처가 없습니다.'}
                </span>
                <EventFormS.AddButton
                  type="button"
                  onClick={() => {
                    if (sourceQuery.trim()) {
                      setNewSource((current) => ({
                        ...current,
                        title: current.title || sourceQuery.trim(),
                      }))
                    }
                    setSourceMode('new')
                  }}
                >
                  <FiPlus size={14} />
                  {sourceQuery.trim()
                    ? `‘${sourceQuery.trim()}’ 제목으로 새 출처 입력`
                    : '새 출처 직접 입력하기'}
                </EventFormS.AddButton>
              </SourceEmptyBox>
            ) : (
              selectableSources.map((source) => {
                const selected = pickedSourceId === source.id
                return (
                  <SourceCardItem
                    key={source.id}
                    role="option"
                    tabIndex={0}
                    aria-selected={selected}
                    $selected={selected}
                    onClick={() => {
                      setPickedSourceId((current) =>
                        current === source.id ? null : source.id,
                      )
                      setIsDirty(true)
                    }}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                        keyEvent.preventDefault()
                        setPickedSourceId((current) =>
                          current === source.id ? null : source.id,
                        )
                        setIsDirty(true)
                      }
                    }}
                  >
                    <span className="check" aria-hidden>
                      {selected && <FiCheck size={12} />}
                    </span>
                    <span className="info">
                      <span className="title">{source.title}</span>
                      <span className="meta">
                        {[
                          source.authors,
                          source.publishedYear,
                          SOURCE_KIND_LABEL[source.kind],
                        ]
                          .filter((part) => part != null && part !== '')
                          .join(' · ')}
                      </span>
                    </span>
                    {source.tier && (
                      <TierBadge>{SOURCE_TIER_LABEL[source.tier]}</TierBadge>
                    )}
                  </SourceCardItem>
                )
              })
            )}
          </SourceCardList>
        </SourceSearchStack>
      ) : (
        <NewSourceFields>
          <NewSourceField $full>
            <FieldSubLabel htmlFor="obs-new-source-title">
              출처 제목<EventFormS.Required>*</EventFormS.Required>
            </FieldSubLabel>
            <EventFormS.Input
              id="obs-new-source-title"
              ref={newSourceTitleRef}
              value={newSource.title}
              onChange={(changeEvent) => {
                setNewSource({ ...newSource, title: changeEvent.target.value })
                setIsDirty(true)
              }}
              placeholder="예: 프로이센 참모본부 공식 전사 (1867)"
            />
          </NewSourceField>

          <NewSourceField>
            <FieldSubLabel htmlFor="obs-new-source-authors">저자 · 기관</FieldSubLabel>
            <EventFormS.Input
              id="obs-new-source-authors"
              value={newSource.authors}
              onChange={(changeEvent) => {
                setNewSource({ ...newSource, authors: changeEvent.target.value })
                setIsDirty(true)
              }}
              placeholder="예: 대몰트케 · 통계청"
            />
          </NewSourceField>

          <NewSourceField>
            <FieldSubLabel htmlFor="obs-new-source-year">발행연도</FieldSubLabel>
            <EventFormS.Input
              id="obs-new-source-year"
              inputMode="numeric"
              value={newSource.publishedYear}
              onChange={(changeEvent) => {
                setNewSource({
                  ...newSource,
                  publishedYear: changeEvent.target.value,
                })
                setIsDirty(true)
              }}
              placeholder="예: 1867"
            />
          </NewSourceField>

          <NewSourceField>
            <FieldSubLabel htmlFor="obs-new-source-kind">문헌 종류</FieldSubLabel>
            <FormSelectNative
              id="obs-new-source-kind"
              value={newSource.kind}
              onChange={(changeEvent) => {
                setNewSource({
                  ...newSource,
                  kind: changeEvent.target.value as SourceKind,
                })
                setIsDirty(true)
              }}
            >
              {SOURCE_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelectNative>
          </NewSourceField>

          <NewSourceField $spanTwo>
            <FieldSubLabel htmlFor="obs-new-source-url">원문 · 참조 URL</FieldSubLabel>
            <EventFormS.Input
              id="obs-new-source-url"
              type="url"
              value={newSource.url}
              onChange={(changeEvent) => {
                setNewSource({ ...newSource, url: changeEvent.target.value })
                setIsDirty(true)
              }}
              placeholder="https://…"
            />
          </NewSourceField>

          <NewSourceField $full>
            <FieldSubLabel as="span">사료 등급</FieldSubLabel>
            <RoleChipGroup role="group" aria-label="사료 등급">
              {(['', 'PRIMARY', 'SECONDARY', 'TERTIARY'] as const).map((tier) => (
                <RoleChipBtn
                  key={tier || 'none'}
                  type="button"
                  $active={newSource.tier === tier}
                  onClick={() => {
                    setNewSource({ ...newSource, tier })
                    setIsDirty(true)
                  }}
                >
                  {tier ? SOURCE_TIER_LABEL[tier] : '미분류'}
                </RoleChipBtn>
              ))}
            </RoleChipGroup>
          </NewSourceField>
        </NewSourceFields>
      )}

      {/* 인용 세부 위치 · 원문 구절 */}
      <CitationExtrasGrid>
        <NewSourceField>
          <FieldSubLabel htmlFor="obs-locator">
            쪽수 · 위치<OptionalTag>(선택)</OptionalTag>
          </FieldSubLabel>
          <EventFormS.Input
            id="obs-locator"
            value={locator}
            onChange={(changeEvent) => {
              setLocator(changeEvent.target.value)
              setIsDirty(true)
            }}
            placeholder="예: p. 123 · 제2권 §4"
          />
        </NewSourceField>
        <NewSourceField>
          <FieldSubLabel htmlFor="obs-quote">
            근거 원문 구절<OptionalTag>(선택)</OptionalTag>
          </FieldSubLabel>
          <EventFormS.Input
            id="obs-quote"
            value={quote}
            onChange={(changeEvent) => {
              setQuote(changeEvent.target.value)
              setIsDirty(true)
            }}
            placeholder="사료에 적힌 수치 문장 그대로 인용"
          />
        </NewSourceField>
      </CitationExtrasGrid>
    </FormGroup>
  )

  return (
    <RegisterModal
      isOpen
      onClose={() => {
        void requestClose()
      }}
      title={initial ? '수치 수정' : '수치 기록'}
      headerActions={
        <HeaderActionsBar>
          {subjectName && (
            <HeaderContextBadge
              type="button"
              onClick={() => scrollToSection('obs-form-group-core')}
              title={`기록 대상: ${subjectName}`}
            >
              {accentColor && (
                <ColorSwatch style={{ background: accentColor }} aria-hidden />
              )}
              <HeaderContextBadgeText>
                {subjectName}
                {metric ? ` · ${metric.name}` : ''}
              </HeaderContextBadgeText>
            </HeaderContextBadge>
          )}

          <SectionJumpNav aria-label="수치 폼 섹션 이동">
            {FORM_SECTION_LINKS.map((item) => {
              const isActive = activeSectionId === item.id
              const badgeText =
                item.id === 'obs-form-group-core'
                  ? coreReady
                    ? '✓'
                    : null
                  : item.id === 'obs-form-group-source'
                    ? sourceCount > 0
                      ? String(sourceCount)
                      : null
                    : detailBadges.length > 0
                      ? String(detailBadges.length)
                      : null
              return (
                <SectionJumpBtn
                  key={item.id}
                  type="button"
                  $active={isActive}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => scrollToSection(item.id)}
                >
                  <span>{item.label}</span>
                  {badgeText && (
                    <SectionJumpBadge $done={badgeText === '✓'} aria-hidden>
                      {badgeText}
                    </SectionJumpBadge>
                  )}
                </SectionJumpBtn>
              )
            })}
          </SectionJumpNav>

          <LayoutModeToggleBtn
            type="button"
            $active={layoutMode === 'split'}
            aria-pressed={layoutMode === 'split'}
            onClick={toggleLayoutMode}
            title={
              layoutMode === 'split'
                ? '좌우 2단 분할 보기 중 (클릭 시 1단 세로 보기로 전환)'
                : '1단 세로 보기 중 (클릭 시 좌우 2단 분할 보기로 전환)'
            }
          >
            <FiColumns size={13} />
            <span>{layoutMode === 'split' ? '2단 분할' : '1단 보기'}</span>
          </LayoutModeToggleBtn>

          {!initial && isDirty && !saving && (
            <HeaderResetBtn
              type="button"
              onClick={() => {
                void handleReset()
              }}
            >
              초기화
            </HeaderResetBtn>
          )}
        </HeaderActionsBar>
      }
      maxWidth={
        layoutMode === 'split' ? 'min(1260px, 96vw)' : 'min(940px, 96vw)'
      }
      minHeight="620px"
      height={layoutMode === 'split' ? '86vh' : undefined}
      fullBleedOnMobile
      closeOnEsc={!saving}
      closeOnOverlayClick={!saving}
      initialFocusRef={focusValueFirst ? valueInputRef : subjectButtonRef}
    >
      <FormScrollArea
        ref={scrollContainerRef}
        $layoutMode={layoutMode}
        onScroll={handleFormScroll}
        onScrollCapture={handleFormScroll}
      >
        <EventFormS.FormSection>
          {layoutMode === 'split' ? (
            <SplitColumnsGrid>
              <SplitColumnLeft id="obs-form-split-left">
                {coreGroup}
                {detailsGroup}
              </SplitColumnLeft>
              <SplitColumnRight id="obs-form-split-right">
                {previewCard}
                {sourceGroup}
              </SplitColumnRight>
            </SplitColumnsGrid>
          ) : (
            <SingleColumnStack>
              {previewCard}
              {coreGroup}
              {sourceGroup}
              {detailsGroup}
            </SingleColumnStack>
          )}
        </EventFormS.FormSection>
      </FormScrollArea>

      <PersonRegisterModalStickyFooter>
        <FooterHint $warning={Boolean(blocker)}>
          {blocker ? (
            <FooterJumpButton
              type="button"
              onClick={focusFirstMissingField}
              title="클릭하면 해당 필수 입력 칸으로 이동합니다"
            >
              <span>필수 입력: {blocker}</span>
              <span aria-hidden>→</span>
            </FooterJumpButton>
          ) : (
            <FooterReadyGroup>
              <FooterReadyBadge>
                {summary}
                {withoutSource ? ' · 출처 미기재' : ''}
              </FooterReadyBadge>
              <FooterShortcutItem>
                <FooterKbd>⌘↵</FooterKbd>
                <span>저장</span>
              </FooterShortcutItem>
              {!initial && (
                <FooterShortcutItem>
                  <FooterKbd>⇧⌘↵</FooterKbd>
                  <span>기록 후 계속</span>
                </FooterShortcutItem>
              )}
            </FooterReadyGroup>
          )}
        </FooterHint>

        <FooterActions>
          <PersonRegisterModalCancelBtn
            type="button"
            onClick={() => {
              void requestClose()
            }}
            disabled={saving}
          >
            취소
          </PersonRegisterModalCancelBtn>

          {!initial && (
            <PersonRegisterModalCancelBtn
              type="button"
              disabled={saving || Boolean(blocker)}
              title="저장 후 창을 닫지 않고 같은 지표·출처로 다음 진영·참여국 수치를 이어서 기록합니다 (단축키: ⌘/Ctrl + Shift + Enter)"
              onClick={() => {
                void submitObservation(true)
              }}
            >
              기록 후 계속
            </PersonRegisterModalCancelBtn>
          )}

          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={saving || Boolean(blocker)}
            title={
              blocker ??
              '단축키: ⌘/Ctrl + Enter'
            }
            onClick={() => {
              void submitObservation(false)
            }}
          >
            {saving
              ? '저장 중...'
              : initial
                ? '수정 완료'
                : isBatch && filledBatchItems.length > 0
                  ? `${filledBatchItems.length}건 한 번에 기록`
                  : '수치 기록'}
          </PersonRegisterModalPrimaryBtn>
        </FooterActions>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

/** 정제된 테두리형 수치 입력 컴포넌트 — 단위 배지 일체형 */
function NumberField({
  label,
  unit,
  value,
  onChange,
  placeholder,
  suffix,
  allowShorthand = false,
  inputRef,
}: {
  label: string
  unit: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  suffix?: string
  allowShorthand?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const invalid = allowShorthand
    ? Boolean(value.trim()) && !parseQuickObservationInput(value).ok
    : !isNumeric(cleanNumber(value))
  const unitText = [unit, suffix].filter(Boolean).join(' ')
  return (
    <NumberFieldWrap>
      {label && <FieldSubLabel as="span">{label}</FieldSubLabel>}
      <NumberInputShell $invalid={invalid}>
        <input
          ref={inputRef}
          inputMode={allowShorthand ? 'text' : 'decimal'}
          value={value}
          onChange={(changeEvent) => onChange(changeEvent.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-label={label || '수치 값'}
        />
        {unitText && <NumberUnitBadge>{unitText}</NumberUnitBadge>}
      </NumberInputShell>
    </NumberFieldWrap>
  )
}

/* ───────────────────────── 사건 등록 모달과 통일된 스타일 ───────────────────────── */

const HeaderActionsBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  margin-right: 4px;

  @media (max-width: 768px) {
    display: none;
  }
`

const HeaderContextBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 240px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.12)'};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const HeaderContextBadgeText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SectionJumpNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SectionJumpBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff'};
    outline: none;
  }
`

const SectionJumpBadge = styled.span<{ $done?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.colors.primary};
`

const LayoutModeToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.35)'
          : 'rgba(99, 102, 241, 0.28)'
        : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : theme.colors.primary
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

  @media (max-width: 1180px) {
    display: none;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const HeaderResetBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.28)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'};
    outline: none;
  }
`

const FormScrollArea = styled(PersonRegisterModalFormScroll)<{
  $layoutMode: LayoutMode
}>`
  --obs-fallback-accent: ${({ theme }) => theme.colors.primary};
  overflow-x: hidden;

  ${({ $layoutMode }) =>
    $layoutMode === 'split'
      ? `
    @media (min-width: 1180px) {
      overflow-y: hidden;
      padding: 22px 28px;
    }
  `
      : ''}
`

const splitPaneScrollStyles = ({ theme }: { theme: DefaultTheme }) => `
  min-width: 0;
  overflow-x: hidden;

  @media (min-width: 1180px) {
    max-height: calc(86vh - 156px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 40px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: ${theme.colors.border.default};
      border-radius: 2px;
    }
  }
`

const SplitColumnsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.95fr);
  gap: 0;
  align-items: start;
  width: 100%;
  min-width: 0;

  @media (min-width: 1180px) {
    ${EventFormS.FormRow} {
      grid-template-columns: 108px minmax(0, 1fr);
      gap: 16px;
    }
  }

  @media (max-width: 1179px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`

const SplitColumnLeft = styled.div`
  ${splitPaneScrollStyles}

  @media (min-width: 1180px) {
    padding-left: 2px;
    padding-right: 26px;
  }
`

const SplitColumnRight = styled.div`
  ${splitPaneScrollStyles}
  display: flex;
  flex-direction: column;
  gap: 22px;

  @media (min-width: 1180px) {
    padding-left: 26px;
    padding-right: 2px;
    border-left: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};
  }
`

const SingleColumnStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const FormGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 8px;

  & + & {
    margin-top: 20px;
    padding-top: 4px;
  }

  > ${EventFormS.FormRow} {
    padding: 10px 0;
    border-bottom: none;
  }
`

const FormGroupTitle = styled.h3<{ $accent?: string }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin: 0 0 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: ${({ $accent, theme }) => $accent ?? theme.colors.primary};
  }
`

const FormGroupSummaryBadge = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.2)'};
`

const OptionalTag = styled.span`
  margin-left: 4px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => EventFormS.getC(theme).text.muted};
`

/* ─── 칩 · 세그먼트 컨트롤 (EventRegisterModal ParticipantRoleChipGroup · CategoryCard 통일) ─── */

const SubjectStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`

const RoleChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2.5px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
`

const RoleChipBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.activeLight
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PillGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`

const ChoicePill = styled.button<{
  $selected: boolean
  $tint?: string | null
  $compact?: boolean
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: ${({ $compact }) => ($compact ? '29px' : '34px')};
  padding: ${({ $compact }) => ($compact ? '0 10px' : '0 13px')};
  border-radius: 999px;
  border: 1px solid
    ${({ $selected, $tint, theme }) =>
      $selected
        ? $tint ?? theme.colors.primary
        : EventFormS.getC(theme).border.default};
  background: ${({ $selected, $tint, theme }) =>
    $selected
      ? `color-mix(in srgb, ${$tint ?? theme.colors.primary} ${theme.mode === 'dark' ? 22 : 10}%, transparent)`
      : EventFormS.getC(theme).background.content};
  color: ${({ $selected, $tint, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? theme.colors.text.primary
        : `color-mix(in srgb, ${$tint ?? theme.colors.primary} 82%, #0f172a)`
      : theme.colors.text.primary};
  box-shadow: ${({ $selected, theme }) =>
    theme.mode === 'dark'
      ? 'none'
      : $selected
        ? '0 1px 2px rgba(79, 70, 229, 0.12)'
        : '0 1px 2px rgba(15, 23, 42, 0.02)'};
  font: inherit;
  font-size: ${({ $compact }) => ($compact ? '12px' : '13px')};
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.14s ease, background 0.14s ease, color 0.14s ease;

  &:hover {
    border-color: ${({ $selected, $tint, theme }) =>
      $selected
        ? $tint ?? theme.colors.primary
        : EventFormS.getC(theme).border.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const ColorSwatch = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
`

const SelectedSubjectBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.default};
  background: ${({ theme }) => EventFormS.getC(theme).background.section};
  font-size: 13.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubjectTypeTag = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
`

/* ─── 지표 선택 & 빠른 검색 ─── */

const MetricSelectGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const QuickFilterAnchor = styled.div`
  position: relative;
  min-width: 0;
`

const QuickFilterDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1e2028' : '#ffffff'};
  box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.16);
`

const QuickFilterItem = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'
      : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  text-align: left;
  cursor: pointer;

  small {
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  }
`

const QuickFilterEmpty = styled.div`
  padding: 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── 수치 입력 컨트롤 ─── */

const ValueModeToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`

const ApproxChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : EventFormS.getC(theme).border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.08)'
      : EventFormS.getC(theme).background.content};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease, color 0.14s ease;
`

const SingleValueWrap = styled.div`
  max-width: 340px;
`

const RangeValueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const NumberFieldWrap = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

const FieldSubLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NumberInputShell = styled.div<{ $invalid: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ $invalid, theme }) =>
      $invalid
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.02)'};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:focus-within) {
    border-color: ${({ $invalid, theme }) =>
      $invalid ? theme.colors.alert.danger.fg : '#cbd5e1'};
  }

  &:focus-within {
    border-color: ${({ $invalid, theme }) =>
      $invalid ? theme.colors.alert.danger.fg : theme.colors.primary};
    box-shadow: ${({ $invalid, theme }) =>
      $invalid ? theme.colors.focusRing.danger : theme.colors.focusRing.primary};
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      font-size: 14px;
      font-weight: 400;
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const NumberUnitBadge = styled.span`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CurrencyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

/* ─── 세부 설정 (추정 성격 · 측정 시점) ─── */

const SubOptionRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
`

const SubOptionLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const PointFieldList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PointFieldItem = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const DateNumberInput = styled(EventFormS.Input)<{ $wide?: boolean }>`
  width: ${({ $wide }) => ($wide ? '78px' : '56px')};
  height: 32px;
  padding: 0 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
`

/* ─── 우측 미리보기 카드 (ParticipantRow 톤) ─── */

const PreviewCard = styled.section<{ $accent?: string }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};
  border-left: 3px solid ${({ $accent, theme }) => $accent ?? theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.04)'};
`

const PreviewHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const PreviewEyebrow = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PreviewSourcePill = styled.span<{ $verified: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
  color: ${({ $verified, theme }) =>
    $verified
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'};
  background: ${({ $verified, theme }) =>
    $verified
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.16)'
        : 'rgba(16, 185, 129, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.12)'};
`

const PreviewSubjectRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  .sep {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .metric {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .pending {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PreviewValueRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;

  .value {
    font-size: 24px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .value.pending {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .exact {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PreviewMetaTags = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;

  .tag {
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  }
  .tag.primary {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
  }
  .qualifier {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PreviewNoteText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const PreviewSourceLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px dashed ${({ theme }) => EventFormS.getC(theme).border.light};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  small {
    flex-shrink: 0;
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CompareBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => EventFormS.getC(theme).border.light};
`

const CompareCaption = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CompareRow = styled.div<{ $color?: string; $current?: boolean }>`
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: ${({ $current }) => ($current ? 700 : 500)};
    color: ${({ $current, theme }) =>
      $current ? theme.colors.text.primary : theme.colors.text.secondary};
  }
  .track {
    height: 7px;
    border-radius: 999px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)'};
    overflow: hidden;
  }
  .bar {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: ${({ $color, theme }) => $color ?? theme.colors.primary};
    opacity: ${({ $current }) => ($current ? 1 : 0.55)};
    transition: width 0.2s ease;
  }
  .amount {
    font-weight: ${({ $current }) => ($current ? 700 : 600)};
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* ─── 출처 · 근거 ─── */

const ExistingCitationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
`

const ExistingCitationCard = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};
  background: ${({ theme }) => EventFormS.getC(theme).background.section};
  color: ${({ theme }) => theme.colors.text.secondary};

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;

    strong {
      font-size: 13px;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.text.primary};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    span {
      flex-shrink: 0;
      font-size: 12px;
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const SourceModeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`

const ClearPickedBtn = styled.button`
  border: none;
  background: transparent;
  padding: 2px 4px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    text-decoration: underline;
  }
`

const SourceSearchStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const SearchClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SourceCardList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 232px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SourceCardItem = styled.li<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : EventFormS.getC(theme).border.light};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.05)'
      : EventFormS.getC(theme).background.content};
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;

  &:hover {
    border-color: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : EventFormS.getC(theme).border.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  .check {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid
      ${({ $selected, theme }) =>
        $selected ? theme.colors.primary : EventFormS.getC(theme).border.default};
    background: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : 'transparent'};
    color: #ffffff;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 13px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const TierBadge = styled.span<{ $warning?: boolean }>`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
  color: ${({ $warning, theme }) =>
    $warning
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.secondary};
  background: ${({ $warning, theme }) =>
    $warning
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.16)'
        : 'rgba(245, 158, 11, 0.12)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#f1f5f9'};
`

const SourceEmptyBox = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 16px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => EventFormS.getC(theme).border.default};
  text-align: center;

  > span {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NewSourceFields = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => EventFormS.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafbfc'};

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const NewSourceField = styled.div<{ $full?: boolean; $spanTwo?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  grid-column: ${({ $full, $spanTwo }) =>
    $full ? '1 / -1' : $spanTwo ? 'span 2' : 'auto'};

  @media (max-width: 640px) {
    grid-column: 1 / -1;
  }
`

const CitationExtrasGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.4fr);
  gap: 10px;
  margin-top: 10px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

/* ─── Sticky Footer (EventRegisterModal 동일 규격) ─── */

const FooterHint = styled.div<{ $warning?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  min-width: 0;
  font-size: 12px;
  font-weight: ${({ $warning }) => ($warning ? 600 : 400)};
  line-height: 1.4;
  color: ${({ $warning, theme }) =>
    $warning ? theme.colors.text.secondary : theme.colors.text.tertiary};

  @media (max-width: 768px) {
    display: none;
  }
`

const FooterJumpButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.32)' : 'rgba(99, 102, 241, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.07)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.13)'};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

const FooterReadyGroup = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
`

const FooterReadyBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 380px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FooterShortcutItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FooterKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 19px;
  padding: 0 5px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
`

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`

const EntryModeToggleWrap = styled.div`
  margin-left: 8px;
`

const BatchRowsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const BatchMetricCard = styled.div<{ $filled?: boolean; $invalid?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ $invalid, $filled, theme }) =>
      $invalid
        ? theme.colors.alert.danger.fg
        : $filled
          ? theme.colors.primary
          : EventFormS.getC(theme).border.light};
  background: ${({ $filled, theme }) =>
    $filled
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.08)'
        : 'rgba(99, 102, 241, 0.03)'
      : EventFormS.getC(theme).background.content};
`

const BatchMetricTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const BatchMetricLabel = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin-right: auto;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};

  small {
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const BatchPreviewPill = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'};
`

const BatchInputRow = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 0.85fr) minmax(0, 1.15fr);
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const BatchAddMetricRow = styled.div`
  margin-top: 10px;
  max-width: 280px;
`

const BatchPreviewSummaryList = styled.ul`
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
  }

  .mname {
    min-width: 90px;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 600;
  }

  .mval {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .mqual {
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
