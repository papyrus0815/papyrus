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

  const [subject, setSubject] = useState(initial ? subjectKey(initial) : subjectKey(subjects[0]))
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

  const metric = metrics.find((candidate) => candidate.key === metricKey) ?? null
  const metricsByDomain = useMemo(() => {
    const groups = new Map<string, typeof metrics>()
    for (const candidate of metrics) groups.set(candidate.domain, [...(groups.get(candidate.domain) ?? []), candidate])
    return [...groups.entries()]
  }, [metrics])

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
      <Form
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          void submit()
        }}
      >
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
                <Input $narrow inputMode="numeric" placeholder="년" value={fields.year} onChange={(change) => setFields({ ...fields, year: change.target.value })} aria-label={`${label} 연도`} />
                <Input $narrow inputMode="numeric" placeholder="월" value={fields.month} onChange={(change) => setFields({ ...fields, month: change.target.value })} aria-label={`${label} 월`} />
                <Input $narrow inputMode="numeric" placeholder="일" value={fields.day} onChange={(change) => setFields({ ...fields, day: change.target.value })} aria-label={`${label} 일`} />
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
                {sourceResults.map((source) => (
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
              <Input $narrow inputMode="numeric" placeholder="발행연도" value={newSource.publishedYear} onChange={(change) => setNewSource({ ...newSource, publishedYear: change.target.value })} aria-label="발행연도" />
              <Input placeholder="URL" value={newSource.url} onChange={(change) => setNewSource({ ...newSource, url: change.target.value })} aria-label="URL" />
            </Inline>
          )}
          <Inline>
            <Input placeholder="위치 — p. 123, §4" value={locator} onChange={(change) => setLocator(change.target.value)} aria-label="출처 안의 위치" />
            <Input placeholder="근거 구절(원문 인용)" value={quote} onChange={(change) => setQuote(change.target.value)} aria-label="근거 구절" />
          </Inline>
        </Fieldset>

        <Actions>
          <Button type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" $primary disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </Actions>
      </Form>
    </Modal>
  )
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
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

const Input = styled.input<{ $narrow?: boolean }>`
  ${controlStyle}
  flex: ${({ $narrow }) => ($narrow ? '0 0 72px' : '1 1 140px')};
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

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
