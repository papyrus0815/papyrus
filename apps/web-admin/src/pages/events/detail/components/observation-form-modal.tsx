import { useEffect, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import {
  type CitationInput,
  createObservation,
  listMetricDefinitions,
  type Observation,
  type ObservationSubjectType,
  searchSources,
  type SourceKind,
  type StructuredPointInput,
  updateObservation,
} from '@/shared/api/evidence'
import { Modal } from '@/shared/ui/modal/modal'
import { ModalBody, ModalFooter } from '@/shared/ui/modal/modal.styles'
import { notify } from '@/shared/ui/toast'

import { eventKeys } from '../use-event-detail'

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

const SOURCE_KIND_OPTIONS: Array<{ value: SourceKind; label: string }> = [
  { value: 'BOOK', label: '단행본' },
  { value: 'ARTICLE', label: '논문' },
  { value: 'NEWS', label: '기사' },
  { value: 'OFFICIAL', label: '공식 발표' },
  { value: 'DATASET', label: '통계·데이터셋' },
  { value: 'ARCHIVE', label: '1차 사료' },
  { value: 'WEBSITE', label: '웹 문서' },
  { value: 'OTHER', label: '기타' },
]

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

/**
 * 수치 입력 — 지표·값(점/범위/이상)·단서·시점·**출처(필수)**.
 * 출처 없이는 저장되지 않는다(서버도 같은 규칙을 강제한다).
 */
export function ObservationFormModal({
  eventId,
  subjects,
  suggestedMetricKeys = [],
  preferredSubjectType,
  initial,
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
    const preferred = subjects.find((option) => option.subjectType === preferredSubjectType)
    return subjectKey(preferred ?? subjects[0])
  })
  const [metricKey, setMetricKey] = useState(initial?.metric.key ?? '')
  const [mode, setMode] = useState<ValueMode>(initialMode(initial))
  const [value, setValue] = useState(initial?.value ?? '')
  const [low, setLow] = useState(initial?.low ?? '')
  const [high, setHigh] = useState(initial?.high ?? '')
  const [approx, setApprox] = useState(initial?.approx ?? true)
  const [qualifier, setQualifier] = useState(initial?.qualifier ?? '')
  const [currencyCode, setCurrencyCode] = useState(initial?.currency?.code ?? '')
  const [start, setStart] = useState(pointToFields(initial?.start ?? null))
  const [end, setEnd] = useState(pointToFields(initial?.end ?? null))

  /* 출처 — 기존 검색 또는 새로 입력. 수정 모드에서는 '새 인용 추가'일 때만 보낸다 */
  const [sourceMode, setSourceMode] = useState<'search' | 'new'>('search')
  const [sourceQuery, setSourceQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [pickedSourceId, setPickedSourceId] = useState<string | null>(null)
  const [newSource, setNewSource] = useState({ kind: 'BOOK' as SourceKind, title: '', authors: '', publishedYear: '', url: '' })
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

  /**
   * 고를 수 있는 출처 — 시드 이관용 '출처 미기재' 묶음(LEGACY_UNVERIFIED)은 뺀다. 그건 출처가 아니라
   * '출처 없음'의 표지라, 새 수치에 고르면 출처 필수 규칙을 우회해 미검증 값이 계속 쌓였다(72/72 미검증).
   */
  const selectableSources = sourceResults.filter((source) => source.kind !== 'LEGACY_UNVERIFIED')

  const metric = metrics.find((candidate) => candidate.key === metricKey) ?? null
  /* 추천 지표는 맨 위 묶음으로 빼고, 아래 분야별 묶음에서는 뺀다(같은 값이 두 번 보이지 않게). */
  const suggestedMetrics = useMemo(
    () =>
      suggestedMetricKeys.flatMap((key) => metrics.filter((candidate) => candidate.key === key)),
    [metrics, suggestedMetricKeys],
  )
  const metricsByDomain = useMemo(() => {
    const suggestedKeys = new Set(suggestedMetrics.map((candidate) => candidate.key))
    const groups = new Map<string, typeof metrics>()
    for (const candidate of metrics) {
      if (suggestedKeys.has(candidate.key)) continue
      groups.set(candidate.domain, [...(groups.get(candidate.domain) ?? []), candidate])
    }
    return [...groups.entries()]
  }, [metrics, suggestedMetrics])

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
      },
      ...extra,
    }
  }

  const submit = async () => {
    if (!metric) {
      notify.error('지표를 고르세요')
      return
    }
    const citation = citationDraft()
    if (!initial && !citation) {
      notify.error('출처가 필요합니다 — 기존 출처를 고르거나 새 출처의 제목을 적으세요')
      return
    }
    const numbers = {
      value: mode === 'single' ? value || null : mode === 'range' ? value || null : null,
      low: mode === 'single' ? null : low || null,
      high: mode === 'range' ? high || null : null,
      atLeast: mode === 'atLeast',
      approx,
    }
    const common = {
      metricKey: metric.key,
      ...numbers,
      qualifier: qualifier.trim() || null,
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

  return (
    <Modal isOpen onClose={onClose} title={initial ? '수치 고치기' : '수치 기록'} size="wide">
      {/* 본문·바닥줄은 공용 ModalBody·ModalFooter — 예전엔 Form을 바로 넣어 입력칸이 모달 가장자리에
          붙고(여백 0) 저장 버튼이 아래 테두리에 걸쳤다 */}
      <Form
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          void submit()
        }}
      >
        <ModalBody>
          <Field>
            <Label htmlFor="obs-subject">대상</Label>
            {initial ? (
              <Static>{subjectLabelOf(initial)}</Static>
            ) : (
              <Select id="obs-subject" value={subject} onChange={(change) => setSubject(change.target.value)}>
                {subjects.map((option) => (
                  <option key={subjectKey(option)} value={subjectKey(option)}>
                    {option.subjectType === 'EVENT_SIDE' ? `진영 · ${option.label}` : option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field>
            <Label htmlFor="obs-metric">지표</Label>
            <Select id="obs-metric" value={metricKey} onChange={(change) => setMetricKey(change.target.value)}>
              <option value="">고르세요</option>
              {suggestedMetrics.length > 0 && (
                <optgroup label="자주 쓰는 지표">
                  {suggestedMetrics.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {candidate.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {metricsByDomain.map(([domain, group]) => (
                <optgroup key={domain} label={DOMAIN_LABEL[domain] ?? domain}>
                  {group.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {candidate.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {metric?.definition && <Hint>{metric.definition}</Hint>}
          </Field>

          <Field>
            <Label as="span">값</Label>
            <ModeRow role="radiogroup" aria-label="값 형태">
              {(
                [
                  ['single', '하나의 값'],
                  ['range', '범위'],
                  ['atLeast', '~이상'],
                ] as const
              ).map(([key, label]) => (
                <ModeOption key={key}>
                  <input type="radio" name="obs-mode" checked={mode === key} onChange={() => setMode(key)} />
                  {label}
                </ModeOption>
              ))}
              <ModeOption>
                <input type="checkbox" checked={approx} onChange={(change) => setApprox(change.target.checked)} />
                약(근사)
              </ModeOption>
            </ModeRow>
            <Inline>
              {mode === 'single' && (
                <Input inputMode="decimal" placeholder="예: 44700" value={value} onChange={(change) => setValue(change.target.value)} aria-label="값" />
              )}
              {mode === 'range' && (
                <>
                  <Input inputMode="decimal" placeholder="하한" value={low} onChange={(change) => setLow(change.target.value)} aria-label="하한" />
                  <span>~</span>
                  <Input inputMode="decimal" placeholder="상한" value={high} onChange={(change) => setHigh(change.target.value)} aria-label="상한" />
                  <Input inputMode="decimal" placeholder="대표값(선택)" value={value} onChange={(change) => setValue(change.target.value)} aria-label="대표값" />
                </>
              )}
              {mode === 'atLeast' && (
                <Input inputMode="decimal" placeholder="하한 — 예: 1000" value={low} onChange={(change) => setLow(change.target.value)} aria-label="하한" />
              )}
              {metric?.valueKind === 'MONEY' && (
                <Input placeholder="통화 코드 (GBP · H-TAEL …)" value={currencyCode} onChange={(change) => setCurrencyCode(change.target.value)} aria-label="통화 코드" />
              )}
            </Inline>
          </Field>

          <Field>
            <Label htmlFor="obs-qualifier">단서</Label>
            <Input id="obs-qualifier" placeholder="예: 질병 사망 별도 · 보헤미아 전선 기준" value={qualifier} onChange={(change) => setQualifier(change.target.value)} />
          </Field>

          <Field>
            <Label as="span">시점 (선택)</Label>
            <Inline>
              {([['시작', start, setStart], ['끝', end, setEnd]] as const).map(([label, fields, setFields]) => (
                <PointGroup key={label}>
                  <span>{label}</span>
                  <Select value={fields.era} onChange={(change) => setFields({ ...fields, era: change.target.value as 'BC' | 'AD' })} aria-label={`${label} 기원`}>
                    <option value="AD">서기</option>
                    <option value="BC">기원전</option>
                  </Select>
                  <Input $narrow data-narrow inputMode="numeric" placeholder="년" value={fields.year} onChange={(change) => setFields({ ...fields, year: change.target.value })} aria-label={`${label} 연도`} />
                  <Input $narrow data-narrow inputMode="numeric" placeholder="월" value={fields.month} onChange={(change) => setFields({ ...fields, month: change.target.value })} aria-label={`${label} 월`} />
                  <Input $narrow data-narrow inputMode="numeric" placeholder="일" value={fields.day} onChange={(change) => setFields({ ...fields, day: change.target.value })} aria-label={`${label} 일`} />
                </PointGroup>
              ))}
            </Inline>
          </Field>

          <Fieldset>
            <legend>{initial ? '출처 추가 (선택)' : '출처 (필수)'}</legend>
            {initial && initial.citations.length > 0 && (
              <ExistingSources>
                {initial.citations.map((citation) => (
                  <li key={citation.id}>
                    {citation.source.title}
                    {citation.locator ? ` · ${citation.locator}` : ''}
                    {citation.source.kind === 'LEGACY_UNVERIFIED' ? ' (미검증)' : ''}
                  </li>
                ))}
              </ExistingSources>
            )}
            <ModeRow role="radiogroup" aria-label="출처 입력 방식">
              <ModeOption>
                <input type="radio" name="obs-source-mode" checked={sourceMode === 'search'} onChange={() => setSourceMode('search')} />
                등록된 출처
              </ModeOption>
              <ModeOption>
                <input type="radio" name="obs-source-mode" checked={sourceMode === 'new'} onChange={() => setSourceMode('new')} />
                새 출처
              </ModeOption>
            </ModeRow>
            {sourceMode === 'search' ? (
              <>
                <Input placeholder="제목·저자·ISBN 검색" value={sourceQuery} onChange={(change) => setSourceQuery(change.target.value)} aria-label="출처 검색" />
                <SourceList role="listbox" aria-label="출처 검색 결과">
                  {selectableSources.length === 0 && (
                    <NoSources>등록된 출처가 없습니다 — ‘새 출처’로 책·기사·웹 문서를 적어 주세요.</NoSources>
                  )}
                  {selectableSources.map((source) => (
                    <SourceOption
                      key={source.id}
                      role="option"
                      aria-selected={pickedSourceId === source.id}
                      $selected={pickedSourceId === source.id}
                      onClick={() => setPickedSourceId(source.id)}
                    >
                      {source.title}
                      {source.authors ? ` — ${source.authors}` : ''}
                      {source.publishedYear ? ` (${source.publishedYear})` : ''}
                    </SourceOption>
                  ))}
                </SourceList>
              </>
            ) : (
              <Inline>
                <Select value={newSource.kind} onChange={(change) => setNewSource({ ...newSource, kind: change.target.value as SourceKind })} aria-label="출처 종류">
                  {SOURCE_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input placeholder="제목" value={newSource.title} onChange={(change) => setNewSource({ ...newSource, title: change.target.value })} aria-label="출처 제목" />
                <Input placeholder="저자·기관" value={newSource.authors} onChange={(change) => setNewSource({ ...newSource, authors: change.target.value })} aria-label="저자" />
                <Input $narrow data-narrow inputMode="numeric" placeholder="발행연도" value={newSource.publishedYear} onChange={(change) => setNewSource({ ...newSource, publishedYear: change.target.value })} aria-label="발행연도" />
                <Input placeholder="URL" value={newSource.url} onChange={(change) => setNewSource({ ...newSource, url: change.target.value })} aria-label="URL" />
              </Inline>
            )}
            <Inline>
              <Input placeholder="위치 — p. 123, §4" value={locator} onChange={(change) => setLocator(change.target.value)} aria-label="출처 안의 위치" />
              <Input placeholder="근거 구절(원문 인용)" value={quote} onChange={(change) => setQuote(change.target.value)} aria-label="근거 구절" />
            </Inline>
          </Fieldset>

        </ModalBody>
        <ModalFooter>
          <Button type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" $primary disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

/* 폼이 본문(스크롤)과 바닥줄을 함께 감싼다 — 모달 높이 안에서 본문만 스크롤되도록 min-height 0 */
const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Fieldset = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)')};

  legend {
    padding: 0 4px;
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Label = styled.label`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Static = styled.div`
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const controlStyle = `
  min-height: 34px;
  padding: 6px 10px;
  font: inherit;
  font-size: 13px;
`

const Select = styled.select`
  ${controlStyle}
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)')};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
`

/*
 * flex는 가로 줄(Inline) 안에서만 — 세로로 쌓이는 Field 안에서 'flex: 1 1 140px'가 **높이 140px**로
 * 먹어 단서·출처 검색 한 줄 입력이 거대한 상자로 보였다.
 */
const Input = styled.input<{ $narrow?: boolean }>`
  ${controlStyle}
  flex: ${({ $narrow }) => ($narrow ? '0 0 72px' : '0 0 auto')};
  min-width: 0;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)')};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
`

const Inline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  > ${Input}:not([data-narrow]) {
    flex: 1 1 140px;
  }
`

const NoSources = styled.li`
  padding: 6px 2px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PointGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
`

const ModeOption = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`

const ExistingSources = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SourceList = styled.ul`
  max-height: 160px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
`

const SourceOption = styled.li<{ $selected: boolean }>`
  padding: 6px 8px;
  border-radius: ${RADIUS.XS};
  font-size: 13px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ $selected, theme }) =>
    $selected ? (theme.mode === 'dark' ? 'rgba(96,165,250,0.18)' : 'rgba(37,99,235,0.10)') : 'transparent'};

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
`

const Button = styled.button<{ $primary?: boolean }>`
  padding: 7px 16px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme, $primary }) => ($primary ? theme.colors.primary : theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)')};
  background: ${({ theme, $primary }) => ($primary ? theme.colors.primary : 'transparent')};
  color: ${({ theme, $primary }) => ($primary ? '#fff' : theme.colors.text.primary)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`
