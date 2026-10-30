import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiHash,
  FiSearch,
  FiTarget,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

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
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
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
import { Modal } from '@/shared/ui/modal/modal'
import { ModalBody, ModalFooter } from '@/shared/ui/modal/modal.styles'
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
  onClose: () => void
  subjectLabelOf: (observation: Observation) => string
}

type ValueMode = 'single' | 'range' | 'atLeast'

const DOMAIN_LABEL: Record<string, string> = {
  military: '군사',
  civilian: '민간',
  economy: '경제',
  society: '사회',
  demography: '인구',
  territory: '영토',
  disaster: '재해',
}

const SUBJECT_GROUP_LABEL: Partial<Record<ObservationSubjectType, string>> = {
  EVENT: '사건',
  EVENT_SIDE: '진영',
  EVENT_PARTICIPANT: '참여국',
}

const VALUE_MODES: Array<{ value: ValueMode; label: string }> = [
  { value: 'single', label: '하나의 값' },
  { value: 'range', label: '범위' },
  { value: 'atLeast', label: '~이상' },
]

const SOURCE_KIND_OPTIONS = SOURCE_KIND_CHOICES.map((value) => ({ value, label: SOURCE_KIND_LABEL[value] }))

/** 추천 지표 칩 상한 — 넘치면 '다른 지표' 상자로 */
const SUGGESTED_CHIP_LIMIT = 8

const subjectKey = (option: { subjectType: string; subjectId: string }) => `${option.subjectType}:${option.subjectId}`

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

/** 숫자 칸 — 쉼표·공백은 허용하고 지운다('637,000'). 비면 null, 숫자가 아니면 NaN 표지 */
function cleanNumber(raw: string): string | null {
  const stripped = raw.replace(/[,\s]/g, '')
  return stripped === '' ? null : stripped
}
const isNumeric = (raw: string | null) => raw === null || Number.isFinite(Number(raw))
/** 저장된 값을 읽기 좋게 — '637000' → '637,000'(쉼표는 저장 때 지운다) */
const withCommas = (raw: string | null | undefined) =>
  raw == null || raw === '' || !Number.isFinite(Number(raw))
    ? (raw ?? '')
    : Number(raw).toLocaleString('en-US', { maximumFractionDigits: 6 })

/**
 * 수치 입력 — 1 무엇을(대상·지표) · 2 값(형태·숫자·단서·추정의 성격·시점·설명) · 3 근거(출처 필수).
 *
 * 예전엔 입력 8개가 같은 무게로 한 줄씩 쌓여 무엇부터 채울지 안 읽혔고, 대상은 select 안에 숨어 있었으며,
 * 값은 '637000' 원문만 보여 화면에 어떻게 찍힐지 저장해야 알았다. 이제 단계를 면으로 나누고, 고르는 것은
 * 칩으로 펼치고, 값은 표에 찍힐 표기('약 63.7만명')를 입력하는 자리에서 바로 보인다.
 * 출처 없이는 저장되지 않는다(서버도 같은 규칙을 강제한다).
 */
export function ObservationFormModal({
  eventId,
  subjects,
  suggestedMetricKeys = [],
  preferredSubjectType,
  initial,
  presetSubject = null,
  presetMetricKey = null,
  onClose,
  subjectLabelOf,
}: ObservationFormModalProps) {
  const queryClient = useQueryClient()
  const { data: metrics = [] } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: listMetricDefinitions,
    staleTime: 10 * 60_000,
  })

  const [subject, setSubject] = useState(() => {
    if (initial) return subjectKey(initial)
    if (presetSubject) return subjectKey(presetSubject)
    const preferred = subjects.find((option) => option.subjectType === preferredSubjectType)
    return subjectKey(preferred ?? subjects[0])
  })
  const [metricKey, setMetricKey] = useState(initial?.metric.key ?? presetMetricKey ?? '')
  const [mode, setMode] = useState<ValueMode>(initialMode(initial))
  const [value, setValue] = useState(withCommas(initial?.value))
  const [low, setLow] = useState(withCommas(initial?.low))
  const [high, setHigh] = useState(withCommas(initial?.high))
  /**
   * 첫 포커스 — 고치기·'+ 추가'(대상·지표가 정해짐)는 값 칸으로. 그 밖은 모달 기본(첫 칸 = 대상).
   * 예전엔 늘 첫 칸에 떨어져, 값 하나 고치려 해도 대상·지표를 지나가야 했다.
   */
  const valueInputRef = useRef<HTMLInputElement>(null)
  const focusValueFirst = Boolean(initial) || Boolean(presetMetricKey)
  /** 그 밖엔 **고른** 대상 칩으로 — 모달 기본(DOM 첫 칸)은 '사건 전체'라, 고르지 않은 칩에 고리가 서 선택처럼 보였다 */
  const subjectInputRef = useRef<HTMLInputElement>(null)
  const [approx, setApprox] = useState(initial?.approx ?? true)
  const [qualifier, setQualifier] = useState(initial?.qualifier ?? '')
  /** 설명 — 이 숫자를 어떻게 읽어야 하나(산정 방식·학설 차이·왜 이 값인가). 비교표 칸 아래에 그대로 보인다 */
  const [note, setNote] = useState(initial?.note ?? '')
  /** 경합 추정치 지위·산정 방식 — '' = 지정 안 함 */
  const [estimateRole, setEstimateRole] = useState<EstimateRole | ''>(initial?.estimateRole ?? '')
  const [method, setMethod] = useState<EstimateMethod | ''>(initial?.method ?? '')
  const [currencyCode, setCurrencyCode] = useState(initial?.currency?.code ?? '')
  const [start, setStart] = useState(pointToFields(initial?.start ?? null))
  const [end, setEnd] = useState(pointToFields(initial?.end ?? null))

  /* 출처 — 기존 검색 또는 새로 입력. 수정 모드에서는 '새 인용 추가'일 때만 보낸다 */
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
  /**
   * 선택 칸 접기 — 필수(값·출처)만 펼쳐 두고 단서·추정의 성격·시점·설명, 위치·근거 구절은 접는다.
   * 이미 채운 게 있으면(고치기) 펼친 채로 연다 — 숨은 값을 모르고 지나치지 않게.
   */
  const [valueMoreOpen, setValueMoreOpen] = useState(
    () =>
      Boolean(initial?.qualifier || initial?.note || initial?.estimateRole || initial?.method || initial?.start || initial?.end),
  )
  const [citationMoreOpen, setCitationMoreOpen] = useState(false)

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

  /**
   * 고를 수 있는 출처 — 시드 이관용 '출처 미기재' 묶음(LEGACY_UNVERIFIED)은 뺀다. 그건 출처가 아니라
   * '출처 없음'의 표지라, 새 수치에 고르면 출처 필수 규칙을 우회해 미검증 값이 계속 쌓였다(72/72 미검증).
   */
  const selectableSources = sourceResults.filter((source) => source.kind !== 'LEGACY_UNVERIFIED')

  const metric = metrics.find((candidate) => candidate.key === metricKey) ?? null
  /* 추천 지표는 칩으로 펼치고, 나머지는 분야별 상자로(같은 값이 두 번 보이지 않게) */
  const suggestedMetrics = useMemo(
    () =>
      suggestedMetricKeys
        .flatMap((key) => metrics.filter((candidate) => candidate.key === key))
        .slice(0, SUGGESTED_CHIP_LIMIT),
    [metrics, suggestedMetricKeys],
  )
  const metricsByDomain = useMemo(() => {
    const suggestedKeys = new Set(suggestedMetrics.map((candidate) => candidate.key))
    const groups = new Map<string, MetricDefinition[]>()
    for (const candidate of metrics) {
      if (suggestedKeys.has(candidate.key)) continue
      groups.set(candidate.domain, [...(groups.get(candidate.domain) ?? []), candidate])
    }
    return [...groups.entries()]
  }, [metrics, suggestedMetrics])
  const metricInChips = suggestedMetrics.some((candidate) => candidate.key === metricKey)

  /** 대상 칩 묶음 — 사건 · 진영 · 참여국 */
  const subjectGroups = useMemo(() => {
    const groups = new Map<ObservationSubjectType, ObservationSubjectOption[]>()
    for (const option of subjects) groups.set(option.subjectType, [...(groups.get(option.subjectType) ?? []), option])
    return [...groups.entries()]
  }, [subjects])
  const currentSubject = subjects.find((option) => subjectKey(option) === subject) ?? null
  /**
   * 대상 층 — 사건 전체 · 진영 · 참여국 중 먼저 층을 고르고 그 층의 칩만 보인다.
   * 예전엔 세 묶음 칩 12개가 한꺼번에 펼쳐져 1단계가 화면 절반을 먹었다.
   */
  const [subjectLevel, setSubjectLevel] = useState<ObservationSubjectType>(
    () => currentSubject?.subjectType ?? subjects[0]?.subjectType ?? 'EVENT',
  )
  const levelOptions = subjectGroups.find(([type]) => type === subjectLevel)?.[1] ?? []
  const switchLevel = (type: ObservationSubjectType) => {
    setSubjectLevel(type)
    const options = subjectGroups.find(([candidate]) => candidate === type)?.[1] ?? []
    if (!options.some((option) => subjectKey(option) === subject) && options[0]) setSubject(subjectKey(options[0]))
  }

  /* ── 값 미리보기 — 표에 찍힐 표기를 입력하는 자리에서 ── */
  const numbers = {
    value: mode === 'atLeast' ? null : cleanNumber(value),
    low: mode === 'single' ? null : cleanNumber(low),
    high: mode === 'range' ? cleanNumber(high) : null,
    atLeast: mode === 'atLeast',
    approx,
  }
  const numbersValid = isNumeric(numbers.value) && isNumeric(numbers.low) && isNumeric(numbers.high)
  const hasNumber = numbers.value !== null || numbers.low !== null || numbers.high !== null
  const rangeReversed =
    numbers.low !== null && numbers.high !== null && numbersValid && Number(numbers.low) > Number(numbers.high)
  const previewTarget = metric
    ? {
        ...numbers,
        metric,
        currency: currencyCode.trim() ? { code: currencyCode.trim(), name: currencyCode.trim(), symbol: '' } : null,
      }
    : null
  const preview = previewTarget && hasNumber && numbersValid ? formatObservationValue(previewTarget) : ''
  /* 정확한 표기는 '약' 없이 — '정확히 약 637,000명'은 말이 안 된다 */
  const previewExact =
    previewTarget && hasNumber && numbersValid ? formatObservationExact({ ...previewTarget, approx: false }) : ''
  const unit = metric ? unitSuffixOf({ metric, currency: null }) : ''

  const citationDraft = (): CitationInput | null => {
    const extra = { locator: locator.trim() || null, quote: quote.trim() || null }
    if (sourceMode === 'search') return pickedSourceId ? { sourceId: pickedSourceId, ...extra } : null
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

  /** 저장을 막는 첫 사유 — 바닥줄에 그대로(누르고 나서 토스트로 알게 하지 않는다) */
  const blocker = !metric
    ? '지표를 고르세요'
    : !numbersValid
      ? '값은 숫자로 적어 주세요(쉼표는 괜찮습니다)'
      : !hasNumber
        ? '값을 적어 주세요'
        : rangeReversed
          ? '범위의 하한이 상한보다 큽니다'
          : metric.valueKind === 'MONEY' && !currencyCode.trim()
            ? '금액 지표에는 통화 코드가 필요합니다'
            : !initial && !citation
              ? '출처를 고르거나 새 출처의 제목을 적어 주세요'
              : null

  const submit = async () => {
    if (blocker || !metric) {
      notify.error(blocker ?? '지표를 고르세요')
      return
    }
    const common = {
      metricKey: metric.key,
      ...numbers,
      qualifier: qualifier.trim() || null,
      note: note.trim() || null,
      estimateRole: estimateRole || null,
      method: method || null,
      currencyCode: metric.valueKind === 'MONEY' ? currencyCode.trim() || null : null,
      start: fieldsToPoint(start),
      end: fieldsToPoint(end),
    }
    setSaving(true)
    try {
      if (initial) {
        const keep = initial.citations.map((existing) => ({
          sourceId: existing.source.id,
          locator: existing.locator,
          quote: existing.quote,
          note: existing.note,
        }))
        await updateObservation(initial.id, { ...common, ...(citation ? { citations: [...keep, citation] } : {}) })
      } else {
        const target = subjects.find((option) => subjectKey(option) === subject)!
        await createObservation({
          subjectType: target.subjectType,
          subjectId: target.subjectId,
          ...common,
          citations: [citation!],
        })
      }
      await queryClient.invalidateQueries({ queryKey: eventKeys.observations(eventId) })
      notify.success(initial ? '수치를 고쳤습니다' : '수치를 기록했습니다')
      onClose()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const subjectName = initial ? subjectLabelOf(initial) : (currentSubject?.label ?? '')
  /** 접힌 '더 적기'의 요약 — 무엇을 채웠나 */
  const valueExtras = [
    qualifier.trim() ? '단서' : '',
    estimateRole ? ESTIMATE_ROLE_LABEL[estimateRole] : '',
    method ? ESTIMATE_METHOD_LABEL[method] : '',
    start.year.trim() || end.year.trim() ? '시점' : '',
    note.trim() ? '설명' : '',
  ].filter(Boolean)
  const summary = [subjectName, metric?.name, preview].filter(Boolean).join(' · ')
  /** 미리보기의 출처 — 이번에 다는 것, 없으면 이미 달린 첫 출처 */
  const pickedSource = selectableSources.find((source) => source.id === pickedSourceId) ?? null
  const previewSource: { title: string; tier: SourceTier | null; unverified: boolean } | null =
    sourceMode === 'search' && pickedSource
      ? { title: pickedSource.title, tier: pickedSource.tier, unverified: false }
      : sourceMode === 'new' && newSource.title.trim()
        ? { title: newSource.title.trim(), tier: newSource.tier || null, unverified: false }
        : initial?.citations[0]
          ? {
              title: initial.citations[0].source.title,
              tier: initial.citations[0].source.tier,
              unverified: initial.citations.every((existing) => existing.source.kind === 'LEGACY_UNVERIFIED'),
            }
          : null

  /**
   * 견줄 값 — 같은 지표의 **다른 대상** 값(진영 먼저). 적는 숫자가 맞는 자릿수인지 곁에서 본다
   * (보오전쟁 동원 병력 63.7만을 적는데 오스트리아 측이 60만이면 같은 규모로 읽힌다).
   */
  const { data: eventObservations = [] } = useQuery(eventObservationsQueryOptions(eventId))
  const comparisons = useMemo(() => {
    if (!metric) return []
    const currentKey = initial ? subjectKey(initial) : subject
    /* 같은 층끼리만 — 진영 값 옆에 나라 몫이 서면 63.7만 대 1.9만처럼 단위가 다른 비교가 된다 */
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
        const option = subjects.find((candidate) => subjectKey(candidate) === subjectKey(entry))
        return option ? { id: entry.id, option, entry, center: observationExtent(entry)?.center ?? null } : null
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, 4)
  }, [eventObservations, metric, initial, subject, subjects, currentSubject])
  const currentCenter = previewTarget && hasNumber && numbersValid ? (observationExtent(previewTarget)?.center ?? null) : null
  const compareMax = Math.max(currentCenter ?? 0, ...comparisons.map((row) => row.center ?? 0))
  /** 단계 완료 — 머리 배지·진행 목록 */
  const stepDone = {
    what: Boolean(metric) && Boolean(subjectName),
    value: hasNumber && numbersValid && !rangeReversed,
    source: Boolean(initial) || Boolean(citation),
  }
  /** 강조색 — 고른 대상의 진영 색, 없으면 테마 기본 */
  const accent = currentSubject?.color ?? 'var(--obs-primary)'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial ? '수치 고치기' : '수치 기록'}
      subtitle="출처가 달린 숫자만 진영 비교·해설에 쓰입니다"
      maxWidth="1080px"
      initialFocusRef={focusValueFirst ? valueInputRef : subjectInputRef}
    >
      {/* 본문·바닥줄은 공용 ModalBody·ModalFooter — 예전엔 Form을 바로 넣어 입력칸이 모달 가장자리에
          붙고(여백 0) 저장 버튼이 아래 테두리에 걸쳤다 */}
      <Form
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          void submit()
        }}
      >
        <Body>
          {/* ── 1 무엇을 ── */}
          <Steps>
          <Step aria-labelledby="obs-step-what">
            <StepHeader
              id="obs-step-what"
              icon={<FiTarget />}
              title="무엇을"
              caption="어느 편의 어떤 수치인가"
              done={stepDone.what}
            />

            <Row>
              <RowLabel as="span">대상</RowLabel>
              {initial ? (
                <ChipStatic>
                  {currentSubject?.color && <Swatch style={{ background: currentSubject.color }} aria-hidden />}
                  {subjectName}
                </ChipStatic>
              ) : (
                <SubjectPicker>
                  {subjectGroups.length > 1 && (
                    <Segmented role="radiogroup" aria-label="대상 층">
                      {subjectGroups.map(([type, options]) => (
                        <Segment key={type} $active={subjectLevel === type}>
                          <input
                            type="radio"
                            name="obs-subject-level"
                            checked={subjectLevel === type}
                            onChange={() => switchLevel(type)}
                          />
                          {type === 'EVENT' ? '사건 전체' : (SUBJECT_GROUP_LABEL[type] ?? type)}
                          {type !== 'EVENT' && <SegmentCount>{options.length}</SegmentCount>}
                        </Segment>
                      ))}
                    </Segmented>
                  )}
                  {subjectLevel !== 'EVENT' && (
                    <ChipWrap role="radiogroup" aria-label={SUBJECT_GROUP_LABEL[subjectLevel] ?? '대상'}>
                      {levelOptions.map((option) => (
                        <Chip key={subjectKey(option)} $active={subject === subjectKey(option)} $tint={option.color}>
                          <input
                            type="radio"
                            name="obs-subject"
                            checked={subject === subjectKey(option)}
                            onChange={() => setSubject(subjectKey(option))}
                            ref={subject === subjectKey(option) ? subjectInputRef : undefined}
                          />
                          {option.color && <Swatch style={{ background: option.color }} aria-hidden />}
                          {option.label}
                        </Chip>
                      ))}
                    </ChipWrap>
                  )}
                </SubjectPicker>
              )}
            </Row>

            <Row>
              <RowLabel as="span">지표</RowLabel>
              <div>
                <ChipWrap role="radiogroup" aria-label="지표">
                  {suggestedMetrics.map((candidate) => (
                    <Chip key={candidate.key} $active={metricKey === candidate.key}>
                      <input
                        type="radio"
                        name="obs-metric"
                        checked={metricKey === candidate.key}
                        onChange={() => setMetricKey(candidate.key)}
                      />
                      {candidate.name}
                    </Chip>
                  ))}
                  {/* 추천에 없는 지표 — 칩 줄 끝의 칩 모양 상자. 고르면 그 이름이 칩처럼 강조된다 */}
                  <MetricSelect
                    value={metricInChips ? '' : metricKey}
                    $active={Boolean(metricKey) && !metricInChips}
                    onChange={(change) => setMetricKey(change.target.value)}
                    aria-label="다른 지표"
                  >
                    <option value="">{suggestedMetrics.length > 0 ? '다른 지표 ▾' : '지표 고르기 ▾'}</option>
                    {metricsByDomain.map(([domain, group]) => (
                      <optgroup key={domain} label={DOMAIN_LABEL[domain] ?? domain}>
                        {group.map((candidate) => (
                          <option key={candidate.key} value={candidate.key}>
                            {candidate.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </MetricSelect>
                </ChipWrap>
                {metric?.definition && <Hint>{metric.definition}</Hint>}
              </div>
            </Row>
          </Step>

          {/* ── 2 값 ── */}
          <Step aria-labelledby="obs-step-value">
            <StepHeader
              id="obs-step-value"
              icon={<FiHash />}
              title="값"
              caption="숫자 하나, 범위, 또는 ~이상"
              done={stepDone.value}
            />

            <ValueTop>
              <Segmented role="radiogroup" aria-label="값 형태">
                {VALUE_MODES.map((option) => (
                  <Segment key={option.value} $active={mode === option.value}>
                    <input
                      type="radio"
                      name="obs-mode"
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                    />
                    {option.label}
                  </Segment>
                ))}
              </Segmented>
              <Toggle $active={approx}>
                <input type="checkbox" checked={approx} onChange={(change) => setApprox(change.target.checked)} />
                {approx && <FiCheck aria-hidden />}약(근사값)
              </Toggle>
            </ValueTop>

            <ValueInputs>
              {mode === 'single' && (
                <NumberField label="" unit={unit} value={value} onChange={setValue} placeholder="예: 44,700" inputRef={valueInputRef} />
              )}
              {mode === 'range' && (
                <>
                  <NumberField label="하한" unit={unit} value={low} onChange={setLow} placeholder="18,000" inputRef={valueInputRef} />
                  <RangeDash aria-hidden>~</RangeDash>
                  <NumberField label="상한" unit={unit} value={high} onChange={setHigh} placeholder="20,000" />
                  <NumberField label="대표값 (선택)" unit={unit} value={value} onChange={setValue} placeholder="19,000" />
                </>
              )}
              {mode === 'atLeast' && (
                <NumberField label="하한" unit={unit} value={low} onChange={setLow} placeholder="예: 1,000" suffix="이상" inputRef={valueInputRef} />
              )}
              {metric?.valueKind === 'MONEY' && (
                <TextField $narrow>
                  <span>통화 코드</span>
                  <input
                    value={currencyCode}
                    onChange={(change) => setCurrencyCode(change.target.value.toUpperCase())}
                    placeholder="GBP · H-TAEL"
                  />
                </TextField>
              )}
            </ValueInputs>

            <Disclosure
              label="더 적기"
              hint="단서 · 추정의 성격 · 시점 · 설명"
              summary={valueExtras}
              open={valueMoreOpen}
              onToggle={() => setValueMoreOpen((current) => !current)}
            >
              <TextField>
                <span>단서</span>
                <input
                  value={qualifier}
                  onChange={(change) => setQualifier(change.target.value)}
                  placeholder="예: 질병 사망 별도 · 보헤미아 전선 기준"
                />
              </TextField>

              <SubBlock>
                <SubHead>
                  추정의 성격 <Optional>학설마다 값이 다르면 기준 하나를 ‘채택’으로</Optional>
                </SubHead>
                <ChoiceRow>
                  <ChoiceLabel>지위</ChoiceLabel>
                  <ChipWrap role="radiogroup" aria-label="추정치 지위">
                    <Chip $active={estimateRole === ''} $quiet>
                      <input type="radio" name="obs-role" checked={estimateRole === ''} onChange={() => setEstimateRole('')} />
                      값이 하나뿐
                    </Chip>
                    {(Object.keys(ESTIMATE_ROLE_LABEL) as EstimateRole[]).map((key) => (
                      <Chip key={key} $active={estimateRole === key} title={ESTIMATE_ROLE_HINT[key]}>
                        <input type="radio" name="obs-role" checked={estimateRole === key} onChange={() => setEstimateRole(key)} />
                        {ESTIMATE_ROLE_LABEL[key]}
                      </Chip>
                    ))}
                  </ChipWrap>
                </ChoiceRow>
                <ChoiceRow>
                  <ChoiceLabel>방식</ChoiceLabel>
                  <ChipWrap role="radiogroup" aria-label="산정 방식">
                    <Chip $active={method === ''} $quiet>
                      <input type="radio" name="obs-method" checked={method === ''} onChange={() => setMethod('')} />
                      모름
                    </Chip>
                    {(Object.keys(ESTIMATE_METHOD_LABEL) as EstimateMethod[]).map((key) => (
                      <Chip key={key} $active={method === key} title={ESTIMATE_METHOD_HINT[key]}>
                        <input type="radio" name="obs-method" checked={method === key} onChange={() => setMethod(key)} />
                        {ESTIMATE_METHOD_LABEL[key]}
                      </Chip>
                    ))}
                  </ChipWrap>
                </ChoiceRow>
                {(estimateRole || method) && (
                  <Hint>
                    {estimateRole ? ESTIMATE_ROLE_HINT[estimateRole] : ''}
                    {estimateRole && method ? ' · ' : ''}
                    {method ? `${ESTIMATE_METHOD_LABEL[method]}: ${ESTIMATE_METHOD_HINT[method]}` : ''}
                  </Hint>
                )}
              </SubBlock>

              <SubBlock>
                <SubHead>시점</SubHead>
                <PointRow>
                  {([['시작', start, setStart], ['끝', end, setEnd]] as const).map(([label, fields, setFields]) => (
                    <PointGroup key={label} role="group" aria-label={`${label} 시점`}>
                      <span className="label">{label}</span>
                      <MiniSegmented role="radiogroup" aria-label={`${label} 기원`}>
                        {(['AD', 'BC'] as const).map((era) => (
                          <Segment key={era} $active={fields.era === era} $small>
                            <input
                              type="radio"
                              name={`obs-era-${label}`}
                              checked={fields.era === era}
                              onChange={() => setFields({ ...fields, era })}
                            />
                            {era === 'AD' ? '서기' : '기원전'}
                          </Segment>
                        ))}
                      </MiniSegmented>
                      <DatePart inputMode="numeric" placeholder="년" value={fields.year} onChange={(change) => setFields({ ...fields, year: change.target.value })} aria-label={`${label} 연도`} $wide />
                      <DatePart inputMode="numeric" placeholder="월" value={fields.month} onChange={(change) => setFields({ ...fields, month: change.target.value })} aria-label={`${label} 월`} />
                      <DatePart inputMode="numeric" placeholder="일" value={fields.day} onChange={(change) => setFields({ ...fields, day: change.target.value })} aria-label={`${label} 일`} />
                    </PointGroup>
                  ))}
                </PointRow>
              </SubBlock>

              <TextField>
                <span>설명</span>
                <textarea
                  rows={3}
                  placeholder="이 숫자를 어떻게 읽어야 하나 — 예: 프로이센 공식 전사(戰史) 기준. 오스트리아 측 집계는 포로를 포함해 더 크다."
                  value={note}
                  onChange={(change) => setNote(change.target.value)}
                />
              </TextField>
            </Disclosure>
          </Step>

          {/* ── 3 근거 ── */}
          <Step aria-labelledby="obs-step-source">
            <StepHeader
              id="obs-step-source"
              icon={<FiBookOpen />}
              title="근거"
              caption={initial ? '출처를 더 달 수 있습니다(선택)' : '출처 없는 숫자는 기록하지 않습니다'}
              done={stepDone.source}
            />

            {initial && initial.citations.length > 0 && (
              <ExistingSources aria-label="달린 출처">
                {initial.citations.map((existing) => (
                  <li key={existing.id} data-unverified={existing.source.kind === 'LEGACY_UNVERIFIED' || undefined}>
                    <FiBookOpen aria-hidden />
                    <span className="title">{existing.source.title}</span>
                    {existing.locator && <span className="meta">{existing.locator}</span>}
                    {existing.source.kind === 'LEGACY_UNVERIFIED' && <span className="badge">미검증</span>}
                  </li>
                ))}
              </ExistingSources>
            )}

            <Segmented role="radiogroup" aria-label="출처 입력 방식">
              <Segment $active={sourceMode === 'search'}>
                <input type="radio" name="obs-source-mode" checked={sourceMode === 'search'} onChange={() => setSourceMode('search')} />
                등록된 출처
              </Segment>
              <Segment $active={sourceMode === 'new'}>
                <input type="radio" name="obs-source-mode" checked={sourceMode === 'new'} onChange={() => setSourceMode('new')} />새 출처
              </Segment>
            </Segmented>

            {sourceMode === 'search' ? (
              <>
                <SearchBox>
                  <FiSearch aria-hidden />
                  <input
                    placeholder="제목·저자·ISBN 검색"
                    value={sourceQuery}
                    onChange={(change) => setSourceQuery(change.target.value)}
                    aria-label="출처 검색"
                  />
                </SearchBox>
                <SourceList role="listbox" aria-label="출처 검색 결과">
                  {selectableSources.length === 0 && (
                    <NoSources>
                      {debouncedQuery ? '맞는 출처가 없습니다.' : '등록된 출처가 없습니다.'}{' '}
                      <TextButton type="button" onClick={() => setSourceMode('new')}>
                        새 출처로 적기
                      </TextButton>
                    </NoSources>
                  )}
                  {selectableSources.map((source) => (
                    <SourceOption
                      key={source.id}
                      role="option"
                      tabIndex={0}
                      aria-selected={pickedSourceId === source.id}
                      $selected={pickedSourceId === source.id}
                      onClick={() => setPickedSourceId((current) => (current === source.id ? null : source.id))}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                          keyEvent.preventDefault()
                          setPickedSourceId((current) => (current === source.id ? null : source.id))
                        }
                      }}
                    >
                      <span className="check" aria-hidden>
                        {pickedSourceId === source.id && <FiCheck />}
                      </span>
                      <span className="body">
                        <span className="title">{source.title}</span>
                        <span className="meta">
                          {[source.authors, source.publishedYear].filter((part) => part != null && part !== '').join(' · ') ||
                            SOURCE_KIND_LABEL[source.kind]}
                        </span>
                      </span>
                      {source.tier && <span className="tier">{SOURCE_TIER_LABEL[source.tier]}</span>}
                    </SourceOption>
                  ))}
                </SourceList>
              </>
            ) : (
              <NewSourceGrid>
                <TextField $span>
                  <span>제목</span>
                  <input
                    value={newSource.title}
                    onChange={(change) => setNewSource({ ...newSource, title: change.target.value })}
                    placeholder="예: 독일 전쟁 1866"
                  />
                </TextField>
                <TextField>
                  <span>저자·기관</span>
                  <input value={newSource.authors} onChange={(change) => setNewSource({ ...newSource, authors: change.target.value })} />
                </TextField>
                <TextField>
                  <span>발행연도</span>
                  <input
                    inputMode="numeric"
                    value={newSource.publishedYear}
                    onChange={(change) => setNewSource({ ...newSource, publishedYear: change.target.value })}
                  />
                </TextField>
                <TextField>
                  <span>종류</span>
                  <select value={newSource.kind} onChange={(change) => setNewSource({ ...newSource, kind: change.target.value as SourceKind })}>
                    {SOURCE_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </TextField>
                <TextField $span>
                  <span>URL</span>
                  <input value={newSource.url} onChange={(change) => setNewSource({ ...newSource, url: change.target.value })} />
                </TextField>
                <ChoiceRow $span>
                  <ChoiceLabel>등급</ChoiceLabel>
                  <ChipWrap role="radiogroup" aria-label="출처 등급">
                    {(['', 'PRIMARY', 'SECONDARY', 'TERTIARY'] as const).map((tier) => (
                      <Chip key={tier || 'none'} $active={newSource.tier === tier} $quiet={tier === ''}>
                        <input
                          type="radio"
                          name="obs-source-tier"
                          checked={newSource.tier === tier}
                          onChange={() => setNewSource({ ...newSource, tier })}
                        />
                        {tier ? SOURCE_TIER_LABEL[tier] : '미분류'}
                      </Chip>
                    ))}
                  </ChipWrap>
                </ChoiceRow>
              </NewSourceGrid>
            )}

            <Disclosure
              label="위치·근거 구절"
              hint="쪽수와 원문 인용"
              summary={[locator.trim(), quote.trim() ? '근거 구절' : ''].filter(Boolean)}
              open={citationMoreOpen}
              onToggle={() => setCitationMoreOpen((current) => !current)}
            >
              <CitationDetail>
                <TextField $narrow>
                  <span>위치</span>
                  <input value={locator} onChange={(change) => setLocator(change.target.value)} placeholder="p. 123 · §4" />
                </TextField>
                <TextField>
                  <span>근거 구절</span>
                  <input value={quote} onChange={(change) => setQuote(change.target.value)} placeholder="출처의 원문 그대로" />
                </TextField>
              </CitationDetail>
            </Disclosure>
          </Step>
          </Steps>

          {/* ── 미리보기 — 표에 찍힐 모습을 입력하는 동안 곁에 ── */}
          <Aside aria-label="미리보기">
            <PreviewCard style={{ ['--accent' as string]: accent }}>
              <span className="eyebrow">표에 이렇게 보입니다</span>
              <span className="subject">
                <Swatch style={{ background: accent }} aria-hidden />
                {subjectName || '대상'}
              </span>
              <span className={metric ? 'metric' : 'metric pending'}>{metric?.name ?? '지표를 고르세요'}</span>
              <strong className={preview ? 'value' : 'value pending'} aria-live="polite">
                {preview || (metric ? '값을 적어 주세요' : '—')}
              </strong>
              {previewExact && previewExact !== preview && <span className="exact">정확히 {previewExact}</span>}
              {(estimateRole || method || qualifier.trim()) && (
                <span className="tags">
                  {estimateRole && <span className="tag strong">{ESTIMATE_ROLE_LABEL[estimateRole]}</span>}
                  {method && <span className="tag">{ESTIMATE_METHOD_LABEL[method]}</span>}
                  {qualifier.trim() && <span className="qualifier">{qualifier.trim()}</span>}
                </span>
              )}
              {note.trim() && <span className="note">{note.trim()}</span>}
              {comparisons.length > 0 && (
                <Compare aria-label="같은 지표의 다른 값">
                  <span className="caption">같은 지표, 다른 {currentSubject?.subjectType === 'EVENT_PARTICIPANT' ? '나라' : '편'}</span>
                  {currentCenter !== null && (
                    <CompareRow $color={accent} $current>
                      <span className="name">{subjectName}</span>
                      <span className="track">
                        <span className="bar" style={{ width: `${compareMax > 0 ? (currentCenter / compareMax) * 100 : 0}%` }} />
                      </span>
                      <span className="amount">{preview}</span>
                    </CompareRow>
                  )}
                  {comparisons.map((row) => (
                    <CompareRow key={row.id} $color={row.option.color ?? 'var(--obs-neutral)'}>
                      <span className="name">{row.option.label}</span>
                      <span className="track">
                        <span
                          className="bar"
                          style={{ width: `${compareMax > 0 && row.center !== null ? (row.center / compareMax) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="amount">{formatObservationValue(row.entry)}</span>
                    </CompareRow>
                  ))}
                </Compare>
              )}
              <span className={!previewSource ? 'source missing' : previewSource.unverified ? 'source missing' : 'source'}>
                {previewSource && !previewSource.unverified ? <FiBookOpen aria-hidden /> : <FiAlertCircle aria-hidden />}
                <span className="title">{previewSource?.title ?? '출처 미정'}</span>
                {previewSource?.unverified && <span className="tier">미검증</span>}
                {previewSource?.tier && <span className="tier">{SOURCE_TIER_LABEL[previewSource.tier]}</span>}
              </span>
            </PreviewCard>

          </Aside>
        </Body>

        <Footer>
          <FooterSummary $blocked={Boolean(blocker)}>
            {blocker ? <FiAlertCircle aria-hidden /> : <FiCheckCircle aria-hidden />}
            <span>{blocker ?? summary}</span>
          </FooterSummary>
          <Button type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" $primary disabled={saving || Boolean(blocker)}>
            {saving ? '저장 중…' : initial ? '고치기' : '기록하기'}
          </Button>
        </Footer>
      </Form>
    </Modal>
  )
}

/** 단계 머리 — 아이콘 배지(끝나면 체크)·제목·설명 한 줄 */
function StepHeader({
  id,
  icon,
  title,
  caption,
  done,
}: {
  id: string
  icon: ReactNode
  title: string
  caption: string
  done: boolean
}) {
  return (
    <StepHead>
      <StepBadge $done={done} aria-hidden>
        {done ? <FiCheck /> : icon}
      </StepBadge>
      <span className="text">
        <span className="title" id={id}>
          {title}
        </span>
        <span className="caption">{caption}</span>
      </span>
    </StepHead>
  )
}

/** 선택 칸 묶음 — 접혀 있으면 한 줄(이름·안내·채운 것 요약), 누르면 펼친다 */
function Disclosure({
  label,
  hint,
  summary,
  open,
  onToggle,
  children,
}: {
  label: string
  hint: string
  summary: string[]
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <DisclosureBox $open={open}>
      <DisclosureButton type="button" aria-expanded={open} onClick={onToggle}>
        <FiChevronDown aria-hidden className="chevron" />
        <span className="label">{label}</span>
        {!open && summary.length > 0 ? (
          <span className="summary">
            {summary.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </span>
        ) : (
          <span className="hint">{hint}</span>
        )}
      </DisclosureButton>
      {open && <DisclosureBody>{children}</DisclosureBody>}
    </DisclosureBox>
  )
}

/** 숫자 입력 — 큰 글씨 + 단위 꼬리표('명'). 쉼표를 써도 된다 */
function NumberField({
  label,
  unit,
  value,
  onChange,
  placeholder,
  suffix,
  inputRef,
}: {
  label: string
  unit: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  suffix?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const invalid = !isNumeric(cleanNumber(value))
  return (
    <NumberBox $invalid={invalid}>
      {label && <span className="label">{label}</span>}
      <span className="control">
        <input
          inputMode="decimal"
          value={value}
          onChange={(change) => onChange(change.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-label={label || '값'}
          ref={inputRef}
        />
        {(unit || suffix) && <span className="unit">{[unit, suffix].filter(Boolean).join(' ')}</span>}
      </span>
    </NumberBox>
  )
}

/* ── styled — 선 없이 면으로(참여·진영 탭과 같은 문법) ── */

const fill = (mode: string, light: number, dark: number) =>
  mode === 'dark' ? `rgba(255,255,255,${dark})` : `rgba(15,23,42,${light})`

/** 입력 면 — 테두리 대신 채운 바탕, 포커스는 바깥 고리 */
const controlSurface = css`
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => fill(theme.mode, 0.05, 0.07)};
  font: inherit;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    opacity: 0.75;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 0;
  }
`

/** 고르기 칩·세그먼트의 숨은 라디오 — 키보드(화살표)는 네이티브 그대로, 모양만 칩 */
const hiddenInput = css`
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  /* 키보드 포커스만 고리 — 모달이 열리며 첫 칸에 주는 포커스에 마우스 사용자에게도 고리가 서던 것 */
  &:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

/* 폼이 본문(스크롤)과 바닥줄을 함께 감싼다 — 모달 높이 안에서 본문만 스크롤되도록 min-height 0 */
const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`

/** 본문 — 회색 바탕 위에 흰 단계 카드, 오른쪽에 미리보기(좁으면 위로) */
const Body = styled(ModalBody)`
  --obs-primary: ${({ theme }) => theme.colors.primary};
  --obs-neutral: #94a3b8;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 288px;
  align-items: start;
  gap: 20px;
  padding: 20px 24px 24px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0,0,0,0.18)' : '#f4f5f7')};

  @media (max-width: 920px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`

/** 단계 카드 — 선 대신 그림자로 바탕에서 띄운다 */
const Step = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px 20px;
  border-radius: 14px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.045)' : '#fff')};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15,23,42,0.05), 0 6px 20px -8px rgba(15,23,42,0.08)'};
`

const StepHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .title {
    font-size: 15px;
    font-weight: 750;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .caption {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 단계 배지 — 진행 중엔 강조색 옅은 면 + 아이콘, 끝나면 초록 체크 */
const StepBadge = styled.span<{ $done: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: ${({ $done, theme }) => ($done ? '#fff' : theme.colors.primary)};
  background: ${({ $done, theme }) =>
    $done
      ? theme.mode === 'dark'
        ? '#16a34a'
        : '#16a34a'
      : `color-mix(in srgb, ${theme.colors.primary} ${theme.mode === 'dark' ? 22 : 12}%, transparent)`};
  transition: background 0.2s;
  svg {
    width: 16px;
    height: 16px;
  }
`

const Optional = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 라벨 열 + 내용 — 넓으면 가로, 좁으면 위아래 */
const Row = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 6px 12px;
  align-items: start;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const RowLabel = styled.label`
  padding-top: 6px;
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SubjectPicker = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`

const SegmentCount = styled.span`
  margin-left: 5px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** 고르기 칩 — 고르면 강조색(대상은 진영 색) 옅은 면 + 같은 색 글자 */
const Chip = styled.label<{ $active: boolean; $quiet?: boolean; $tint?: string | null }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 650 : 500)};
  cursor: pointer;
  user-select: none;
  color: ${({ theme, $active, $quiet, $tint }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.text.primary
        : `color-mix(in srgb, ${$tint ?? theme.colors.primary} 78%, #0f172a)`
      : $quiet
        ? theme.colors.text.tertiary
        : theme.colors.text.secondary};
  background: ${({ theme, $active, $tint }) =>
    $active
      ? `color-mix(in srgb, ${$tint ?? theme.colors.primary} ${theme.mode === 'dark' ? 30 : 13}%, transparent)`
      : fill(theme.mode, 0.045, 0.06)};
  transition:
    background 0.12s,
    color 0.12s;

  &:hover {
    background: ${({ theme, $active, $tint }) =>
      $active
        ? `color-mix(in srgb, ${$tint ?? theme.colors.primary} ${theme.mode === 'dark' ? 30 : 13}%, transparent)`
        : fill(theme.mode, 0.08, 0.1)};
  }

  ${hiddenInput}
`

const ChipStatic = styled.span`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => fill(theme.mode, 0.07, 0.09)};
`

const Swatch = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
`

/** 다른 지표 — 칩과 같은 모양(알약)의 상자. 고른 상태면 칩처럼 강조색 */
const MetricSelect = styled.select<{ $active: boolean }>`
  appearance: none;
  /* 상자 폭을 고른 글자에 맞춘다 — 기본은 가장 긴 지표 이름 폭이라 '다른 지표'가 한 줄을 다 먹었다 */
  field-sizing: content;
  min-height: 30px;
  max-width: 100%;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 650 : 500)};
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.text.primary
        : `color-mix(in srgb, ${theme.colors.primary} 78%, #0f172a)`
      : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active
      ? `color-mix(in srgb, ${theme.colors.primary} ${theme.mode === 'dark' ? 30 : 13}%, transparent)`
      : fill(theme.mode, 0.045, 0.06)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const Hint = styled.p`
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ValueTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const Segmented = styled.div`
  align-self: flex-start;
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: ${({ theme }) => fill(theme.mode, 0.05, 0.07)};
`

const MiniSegmented = styled(Segmented)`
  align-self: center;
  padding: 2px;
  border-radius: 8px;
`

const Segment = styled.label<{ $active: boolean; $small?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: ${({ $small }) => ($small ? '3px 8px' : '5px 14px')};
  border-radius: ${({ $small }) => ($small ? '6px' : '8px')};
  font-size: ${({ $small }) => ($small ? '12px' : '13px')};
  font-weight: ${({ $active }) => ($active ? 650 : 500)};
  cursor: pointer;
  user-select: none;
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ theme, $active }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : theme.colors.background.primary) : 'transparent'};
  box-shadow: ${({ theme, $active }) => ($active && theme.mode !== 'dark' ? '0 1px 2px rgba(15,23,42,0.12)' : 'none')};

  ${hiddenInput}
`

const Toggle = styled(Chip)`
  svg {
    width: 13px;
    height: 13px;
  }
`

const ValueInputs = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
`

const NumberBox = styled.label<{ $invalid: boolean }>`
  flex: 1 1 150px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  .label {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .control {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 0 12px;
    border-radius: ${RADIUS.SM};
    background: ${({ theme, $invalid }) =>
      $invalid ? (theme.mode === 'dark' ? 'rgba(248,113,113,0.14)' : 'rgba(220,38,38,0.08)') : fill(theme.mode, 0.05, 0.07)};
  }

  .control:focus-within {
    outline: 2px solid ${({ theme, $invalid }) => ($invalid ? theme.colors.error : theme.colors.primary)};
  }

  input {
    flex: 1;
    min-width: 0;
    height: 44px;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 19px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};

    /* 고리는 상자(.control)가 — 입력 자체의 전역 고리와 겹쳐 두 겹이 됐다 */
    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }

    &::placeholder {
      font-weight: 400;
      color: ${({ theme }) => theme.colors.text.tertiary};
      opacity: 0.6;
    }
  }

  .unit {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const RangeDash = styled.span`
  padding-bottom: 12px;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TextField = styled.label<{ $narrow?: boolean; $span?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  /*
   * 가로 줄(CitationDetail·ValueInputs) 안에서만 늘어난다 — 세로로 쌓이는 단계 상자 안에서
   * 'flex: 1 1 220px'가 높이 220px로 먹어 단서 아래가 크게 비었다.
   */
  flex: none;
  width: ${({ $narrow }) => ($narrow ? '160px' : 'auto')};
  grid-column: ${({ $span }) => ($span ? '1 / -1' : 'auto')};

  > span {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input,
  select,
  textarea {
    ${controlSurface}
    width: 100%;
    box-sizing: border-box;
    min-height: 36px;
    padding: 8px 10px;
    font-size: 13.5px;
  }

  textarea {
    line-height: 1.55;
    resize: vertical;
  }
`

const SubBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SubHead = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ChoiceRow = styled.div<{ $span?: boolean }>`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  grid-column: ${({ $span }) => ($span ? '1 / -1' : 'auto')};
`

const ChoiceLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PointRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
`

const PointGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  .label {
    min-width: 24px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const DatePart = styled.input<{ $wide?: boolean }>`
  ${controlSurface}
  background: ${({ theme }) => fill(theme.mode, 0.035, 0.05)};
  width: ${({ $wide }) => ($wide ? '60px' : '40px')};
  height: 30px;
  padding: 0 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
`

const ExistingSources = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: ${RADIUS.SM};
    font-size: 13px;
    background: ${({ theme }) => fill(theme.mode, 0.04, 0.05)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    flex-shrink: 0;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .badge {
    flex-shrink: 0;
    margin-left: auto;
    padding: 0 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.16)')};
  }
`

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => fill(theme.mode, 0.05, 0.07)};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`

const SourceList = styled.ul`
  max-height: 210px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SourceOption = styled.li<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  cursor: pointer;
  background: ${({ $selected, theme }) => ($selected ? fill(theme.mode, 0.1, 0.13) : 'transparent')};

  &:hover {
    background: ${({ $selected, theme }) => ($selected ? fill(theme.mode, 0.1, 0.13) : fill(theme.mode, 0.045, 0.06))};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  .check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: #fff;
    background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : fill(theme.mode, 0.08, 0.1))};
    svg {
      width: 12px;
      height: 12px;
    }
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .title {
    font-size: 13.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .meta {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .tier {
    flex-shrink: 0;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => fill(theme.mode, 0.07, 0.09)};
  }
`

const NoSources = styled.li`
  padding: 10px 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TextButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`

/** 새 출처 — 제목 / 저자·발행연도·종류 / URL / 등급 */
const NewSourceGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px 170px;
  gap: 10px 12px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const CitationDetail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;

  > ${TextField} {
    flex: 1 1 220px;
  }
  > ${TextField}:first-child {
    flex: 0 1 160px;
  }
`

/** 바닥줄 — 왼쪽은 저장될 내용 요약 또는 저장을 막는 사유 */
const Footer = styled(ModalFooter)`
  align-items: center;
  /* 공용 바닥줄의 윗선 대신 — 본문과는 면(단계 상자)으로 이미 갈린다 */
  border-top: none;
`

const FooterSummary = styled.span<{ $blocked: boolean }>`
  flex: 1;
  min-width: 0;
  margin-right: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    color: ${({ $blocked, theme }) => ($blocked ? theme.colors.text.tertiary : '#16a34a')};
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  font-size: 12.5px;
  font-weight: ${({ $blocked }) => ($blocked ? 500 : 650)};
  color: ${({ theme, $blocked }) => ($blocked ? theme.colors.text.tertiary : theme.colors.text.primary)};
`

const Button = styled.button<{ $primary?: boolean }>`
  flex-shrink: 0;
  padding: 8px 18px;
  border: none;
  border-radius: ${RADIUS.SM};
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  color: ${({ theme, $primary }) => ($primary ? '#fff' : theme.colors.text.primary)};
  background: ${({ theme, $primary }) => ($primary ? theme.colors.primary : fill(theme.mode, 0.06, 0.08))};

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/* ── 미리보기 ── */

const Aside = styled.aside`
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 920px) {
    position: static;
    order: -1;
  }
`

/** 미리보기 카드 — 위 띠는 고른 대상의 진영 색(--accent) */
const PreviewCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 22px 20px 18px;
  border-radius: 14px;
  overflow: hidden;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff')};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(15,23,42,0.05), 0 10px 28px -10px rgba(15,23,42,0.14)'};

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 5px;
    background: var(--accent);
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 90px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent);
    pointer-events: none;
  }
  > * {
    position: relative;
    z-index: 1;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .subject {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 13px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .metric {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .value {
    margin-top: 4px;
    font-size: 30px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow-wrap: anywhere;
  }
  .pending {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .value.pending {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
  }
  .exact {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 6px;
    margin-top: 4px;
  }
  .tag {
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) => fill(theme.mode, 0.06, 0.09)};
  }
  .tag.strong {
    color: ${({ theme }) => theme.colors.text.primary};
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }
  .qualifier {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .note {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .source {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) => fill(theme.mode, 0.04, 0.05)};
    svg {
      flex-shrink: 0;
      width: 13px;
      height: 13px;
    }
    .title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tier {
      flex-shrink: 0;
      margin-left: auto;
      padding: 0 7px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 650;
      color: ${({ theme }) => theme.colors.text.primary};
      background: ${({ theme }) => fill(theme.mode, 0.07, 0.1)};
    }
  }
  .source.missing {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.14)')};
  }
`


/** 견줄 값 — 이름 · 막대 · 값 한 줄씩. 지금 적는 값은 굵게 */
const Compare = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;

  .caption {
    font-size: 11px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CompareRow = styled.div<{ $color: string; $current?: boolean }>`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: ${({ $current }) => ($current ? 700 : 500)};
    color: ${({ theme, $current }) => ($current ? theme.colors.text.primary : theme.colors.text.secondary)};
  }
  .track {
    height: 8px;
    border-radius: 4px;
    background: ${({ theme }) => fill(theme.mode, 0.05, 0.07)};
    overflow: hidden;
  }
  .bar {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: ${({ $color }) => $color};
    opacity: ${({ $current }) => ($current ? 1 : 0.55)};
    transition: width 0.25s ease;
  }
  .amount {
    font-weight: ${({ $current }) => ($current ? 750 : 600)};
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/* ── 접기 ── */

const DisclosureBox = styled.div<{ $open: boolean }>`
  margin: 0 -8px;
  border-radius: 10px;
  background: ${({ theme, $open }) => ($open ? fill(theme.mode, 0.025, 0.03) : 'transparent')};
`

const DisclosureButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => fill(theme.mode, 0.035, 0.05)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }

  .chevron {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    transform: rotate(-90deg);
    transition: transform 0.15s;
  }
  &[aria-expanded='true'] .chevron {
    transform: none;
  }
  .label {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .hint {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .summary > span {
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
    background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);
  }
`

const DisclosureBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 6px 8px 12px;
`
