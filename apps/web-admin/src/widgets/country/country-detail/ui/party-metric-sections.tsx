/**
 * 정당 상세 — 「수치」: 당원 수·지부 수·재정을 시점별로, 출처와 함께(B5, docs/political-party-model-review.md §4.9).
 *
 * 정당 전용 표가 아니라 근거 도메인의 측정값(subjectType=POLITICAL_PARTY)이다 — 범위·근사·채택/대안/논쟁·산출 방식·
 * 인용을 사건 측정값과 같은 규약으로 담는다. 당 공식 발표와 연구자 추산이 갈리면 두 줄을 나란히(채택·대안).
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { ESTIMATE_METHOD_LABEL, ESTIMATE_ROLE_LABEL } from '@/entities/evidence/lib/evidence-labels'
import { formatObservationExact, isUnverified } from '@/entities/evidence/lib/format-observation'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import { chamberApi, chamberKeys, chamberLabel, chamberSeatsAt, labelChamberRole } from '@/shared/api/chamber'
import { getAllCurrencies } from '@/shared/api/currencies'
import {
  type CreateObservationInput,
  type EstimateMethod,
  type EstimateRole,
  type Observation,
  createObservation,
  deleteObservation,
  listMetricDefinitions,
  listSubjectObservations,
  updateObservation,
} from '@/shared/api/evidence'
import {
  EMPTY_PERIOD_DATE,
  type PeriodDateFormValue,
  formatPartialDate,
  periodDateFormError,
  periodDateFormValue,
  structuredInputOf,
} from '@/shared/lib/party-dates'
import { partialDateFromStructured } from '@/shared/lib/partial-date-string'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { PeriodDateField } from '@/shared/ui/period-date-field/period-date-field'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import { type CitationDraft, CitationListEditor, citationDraftsOf, citationInputsOf } from '@/widgets/evidence/citation-list-editor'
import {
  CheckRow,
  FactActions,
  FactBadge,
  FactGroup,
  FactGroupLabel,
  FactList,
  FactMain,
  FactNote,
  FactRow,
  IconBtn,
  ModalFooter,
} from '@/widgets/political-party/party-sidecar-parts'

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
import * as FormS from './military-unit-form/styles'
import { partyKeys } from '@/widgets/political-party/party-query-keys'

const PARTY_METRIC_DOMAIN = 'politics'
const observationsKey = partyKeys.observations

function pointLabel(observation: Observation): string {
  const start = observation.start
    ? formatPartialDate(partialDateFromStructured(observation.start.year, observation.start.month, observation.start.day, observation.start.era))
    : ''
  const end = observation.end
    ? formatPartialDate(partialDateFromStructured(observation.end.year, observation.end.month, observation.end.day, observation.end.era))
    : ''
  if (start && end) return `${start} ~ ${end}`
  return start || end || '시점 미상'
}

const pointKey = (observation: Observation) =>
  observation.start == null
    ? Number.POSITIVE_INFINITY
    : (observation.start.era === 'BC' ? -observation.start.year : observation.start.year) * 10000 +
      (observation.start.month ?? 1) * 100 +
      (observation.start.day ?? 1)

/** 원 후보를 어느 나라에서 찾나 — 현대 국가면 연결된 역사 국가의 원까지(왕국 대의원·파시스트 시기 원) */
export type ChamberScope = { countryId?: string | null; historicalCountryId?: string | null }

/** '400석 / 400석 · 대의원' — 측정 시점의 정원이 있으면 분모로 */
export function seatsOfLabel(observation: Observation): string | null {
  if (!observation.chamber) return null
  const year = observation.start ? (observation.start.era === 'BC' ? -observation.start.year : observation.start.year) : null
  const total = chamberSeatsAt(observation.chamber.sizes, year)
  return `${total != null ? `정원 ${total.toLocaleString('ko-KR')}석 · ` : ''}${observation.chamber.name}`
}

export function PartyMetricsBlock({ partyId, chamberScope }: { partyId: string; chamberScope: ChamberScope }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: Observation } | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: observationsKey(partyId),
    queryFn: () => listSubjectObservations('POLITICAL_PARTY', partyId),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteObservation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: observationsKey(partyId) })
      notify.success('수치를 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  /** 지표별 — 시점 순 */
  const groups = useMemo(() => {
    const byMetric = new Map<string, { name: string; rows: Observation[] }>()
    for (const observation of data) {
      const group = byMetric.get(observation.metric.key) ?? { name: observation.metric.name, rows: [] }
      group.rows.push(observation)
      byMetric.set(observation.metric.key, group)
    }
    return [...byMetric.entries()].map(([key, group]) => ({
      key,
      name: group.name,
      rows: [...group.rows].sort((left, right) => pointKey(left) - pointKey(right)),
    }))
  }, [data])

  return (
    <PartyDetailDescSection aria-label="수치">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>수치</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          수치 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : groups.length === 0 ? (
        <PartyDescEmptyHint>
          당원 수·지부 수·재정을 시점별로 출처와 함께 남깁니다. 공식 발표와 연구자 추산이 갈리면 두 줄을 채택·대안으로 나란히.
        </PartyDescEmptyHint>
      ) : (
        <FactList>
          {groups.map((group) => (
            <FactGroup key={group.key}>
              <FactGroupLabel>{group.name}</FactGroupLabel>
              {group.rows.map((observation) => (
                <FactRow key={observation.id}>
                  <FactMain>
                    <span className="title">{formatObservationExact(observation)}</span>
                    {seatsOfLabel(observation) ? <span className="period">{seatsOfLabel(observation)}</span> : null}
                    <span className="period strong">{pointLabel(observation)}</span>
                    {observation.estimateRole ? <FactBadge>{ESTIMATE_ROLE_LABEL[observation.estimateRole]}</FactBadge> : null}
                    {observation.method ? <span className="period">{ESTIMATE_METHOD_LABEL[observation.method]}</span> : null}
                    {isUnverified(observation) ? (
                      <UnverifiedBadge>출처 미검증</UnverifiedBadge>
                    ) : (
                      <span className="period">출처 {observation.citations.length}</span>
                    )}
                  </FactMain>
                  {observation.qualifier ? <FactNote>{observation.qualifier}</FactNote> : null}
                  {observation.note ? <FactNote>{observation.note}</FactNote> : null}
                  <FactActions>
                    <IconBtn type="button" aria-label={`${group.name} 고치기`} onClick={() => setModal({ mode: 'edit', row: observation })}>
                      <FiEdit2 size={13} />
                    </IconBtn>
                    <IconBtn
                      type="button"
                      aria-label={`${group.name} 지우기`}
                      disabled={deleteMut.isPending}
                      onClick={async () => {
                        const approved = await confirm({
                          title: '수치 지우기',
                          message: `${group.name} ${formatObservationExact(observation)}(${pointLabel(observation)})을 지울까요? 출처 인용도 함께 지워집니다.`,
                          confirmLabel: '지우기',
                          danger: true,
                        })
                        if (approved) deleteMut.mutate(observation.id)
                      }}
                    >
                      <FiTrash2 size={13} />
                    </IconBtn>
                  </FactActions>
                </FactRow>
              ))}
            </FactGroup>
          ))}
        </FactList>
      )}
      {modal ? (
        <PartyObservationFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          partyId={partyId}
          chamberScope={chamberScope}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: observationsKey(partyId) })
            setModal(null)
          }}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/
const cleanNumber = (raw: string) => raw.replace(/[,\s]/g, '')

export function PartyObservationFormModal({
  partyId,
  chamberScope,
  initial,
  onClose,
  onSaved,
}: {
  partyId: string
  chamberScope: ChamberScope
  initial?: Observation
  onClose: () => void
  onSaved: () => void
}) {
  const { data: metrics = [] } = useQuery({ queryKey: ['metric-definitions'], queryFn: listMetricDefinitions, staleTime: 300_000 })
  const partyMetrics = metrics.filter((metric) => metric.domain === PARTY_METRIC_DOMAIN)
  const [metricKey, setMetricKey] = useState(initial?.metric.key ?? 'party.members')
  const metric = metrics.find((candidate) => candidate.key === metricKey)
  const isMoney = metric?.valueKind === 'MONEY'
  const { data: currencies = [] } = useQuery({ queryKey: ['currencies'], queryFn: getAllCurrencies, enabled: isMoney, staleTime: 300_000 })
  const needsChamber = metric?.dimension === 'CHAMBER'
  const { data: chambers = [] } = useQuery({
    queryKey: chamberKeys.list(chamberScope),
    queryFn: () => chamberApi.list(chamberScope),
    enabled: needsChamber && Boolean(chamberScope.countryId || chamberScope.historicalCountryId),
    staleTime: 60_000,
  })
  const [chamberId, setChamberId] = useState(initial?.chamber?.id ?? '')

  const [value, setValue] = useState(initial?.value ?? '')
  const [low, setLow] = useState(initial?.low ?? '')
  const [high, setHigh] = useState(initial?.high ?? '')
  const [approx, setApprox] = useState(initial?.approx ?? false)
  const [atLeast, setAtLeast] = useState(initial?.atLeast ?? false)
  const [currencyCode, setCurrencyCode] = useState(initial?.currency?.code ?? '')
  const [point, setPoint] = useState<PeriodDateFormValue>(() =>
    initial?.start ? periodDateFormValue(initial.start.era, initial.start.year, initial.start.month, initial.start.day) : { ...EMPTY_PERIOD_DATE },
  )
  const [qualifier, setQualifier] = useState(initial?.qualifier ?? '')
  const [estimateRole, setEstimateRole] = useState<EstimateRole | ''>(initial?.estimateRole ?? '')
  const [method, setMethod] = useState<EstimateMethod | ''>(initial?.method ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [citations, setCitations] = useState<CitationDraft[]>(() => citationDraftsOf(initial?.citations))

  const numbers = { value: cleanNumber(value), low: cleanNumber(low), high: cleanNumber(high) }
  const badNumber = Object.values(numbers).some((raw) => raw !== '' && !NUMBER_PATTERN.test(raw))
  const pointError = periodDateFormError(point)
  const citationResult = citationInputsOf(citations)
  const problem = !metricKey
    ? '필수: 지표'
    : !numbers.value && !numbers.low && !numbers.high
      ? '필수: 값(또는 범위)'
      : badNumber
        ? '값은 숫자만(쉼표 허용)'
        : isMoney && !currencyCode
          ? '필수: 통화'
          : needsChamber && !chamberId
            ? '필수: 원(院) — 의석은 어느 원의 것인지 정해야 합니다'
            : pointError
            ? `시점: ${pointError}`
            : citationResult.problem

  const saveMut = useMutation({
    mutationFn: () => {
      const start = structuredInputOf(point)
      const fields = {
        metricKey,
        value: numbers.value || null,
        low: numbers.low || null,
        high: numbers.high || null,
        approx,
        atLeast,
        currencyCode: isMoney ? currencyCode : null,
        chamberId: needsChamber ? chamberId : null,
        start: start ? { era: start.era, year: start.year, month: start.month ?? null, day: start.day ?? null } : null,
        qualifier: qualifier.trim() || null,
        estimateRole: estimateRole || null,
        method: method || null,
        note: note.trim() || null,
        citations: citationResult.inputs,
      }
      if (initial) return updateObservation(initial.id, fields)
      const body: CreateObservationInput = { subjectType: 'POLITICAL_PARTY', subjectId: partyId, ...fields }
      return createObservation(body)
    },
    onSuccess: () => {
      notify.success(initial ? '수치를 고쳤습니다.' : '수치를 추가했습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '수치 고치기' : '수치 추가'} maxWidth="min(800px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-metric-value-title">
          <FormS.FormGroupTitle id="party-metric-value-title">무엇을·얼마</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-metric-key">지표</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="party-metric-key" value={metricKey} onChange={(event) => setMetricKey(event.target.value)} disabled={Boolean(initial)}>
                {partyMetrics.map((candidate) => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate.name}
                  </option>
                ))}
              </FormSelectNative>
              {metric?.definition ? <EventFormS.Hint>{metric.definition}</EventFormS.Hint> : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">
              값 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <ValueGrid>
                <EventFormS.Input aria-label="값" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="값 — 6,000,000" />
                <EventFormS.Input aria-label="범위 하한" inputMode="decimal" value={low} onChange={(event) => setLow(event.target.value)} placeholder="범위 하한" />
                <EventFormS.Input aria-label="범위 상한" inputMode="decimal" value={high} onChange={(event) => setHigh(event.target.value)} placeholder="범위 상한" />
              </ValueGrid>
              <CheckLine>
                <CheckRow>
                  <input type="checkbox" checked={approx} onChange={(event) => setApprox(event.target.checked)} />약(근사값)
                </CheckRow>
                <CheckRow>
                  <input type="checkbox" checked={atLeast} onChange={(event) => setAtLeast(event.target.checked)} />
                  이상(하한만 앎)
                </CheckRow>
              </CheckLine>
              {needsChamber ? (
                <>
                  <FormSelectNative aria-label="원(院)" value={chamberId} onChange={(event) => setChamberId(event.target.value)} style={{ marginTop: 8 }}>
                    <option value="">원 선택 *</option>
                    {chambers.map((chamber) => (
                      <option key={chamber.id} value={chamber.id}>
                        {chamberLabel(chamber)} · {labelChamberRole(chamber.role)}
                        {chamber.historicalCountry?.name ? ` · ${chamber.historicalCountry.name}` : ''}
                      </option>
                    ))}
                  </FormSelectNative>
                  {chambers.length === 0 ? (
                    <EventFormS.Hint>이 나라에 등록된 원이 없습니다 — 정부·행정 → 정체·헌정의 「의회 — 원」에서 먼저 추가하세요.</EventFormS.Hint>
                  ) : null}
                </>
              ) : null}
              {isMoney ? (
                <FormSelectNative aria-label="통화" value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} style={{ marginTop: 8 }}>
                  <option value="">통화 선택 *</option>
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code})
                    </option>
                  ))}
                </FormSelectNative>
              ) : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">시점</EventFormS.FormLabel>
            <EventFormS.FormField>
              <PeriodDateField {...point} ariaLabel="시점" pickerTitle="시점 선택" error={Boolean(pointError)} onChange={setPoint} />
              {pointError ? <EventFormS.ErrorMessage role="alert">{pointError}</EventFormS.ErrorMessage> : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">추정의 자리</EventFormS.FormLabel>
            <EventFormS.FormField>
              <ValueGrid>
                <FormSelectNative aria-label="채택·대안" value={estimateRole} onChange={(event) => setEstimateRole(event.target.value as EstimateRole | '')}>
                  <option value="">하나뿐(구분 없음)</option>
                  {(Object.keys(ESTIMATE_ROLE_LABEL) as EstimateRole[]).map((role) => (
                    <option key={role} value={role}>
                      {ESTIMATE_ROLE_LABEL[role]}
                    </option>
                  ))}
                </FormSelectNative>
                <FormSelectNative aria-label="산출 방식" value={method} onChange={(event) => setMethod(event.target.value as EstimateMethod | '')}>
                  <option value="">산출 방식 미상</option>
                  {(Object.keys(ESTIMATE_METHOD_LABEL) as EstimateMethod[]).map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {ESTIMATE_METHOD_LABEL[candidate]}
                    </option>
                  ))}
                </FormSelectNative>
              </ValueGrid>
              <EventFormS.Input
                aria-label="단서"
                value={qualifier}
                onChange={(event) => setQualifier(event.target.value)}
                placeholder="단서 — 예: 당 공식 발표, 청년 조직 제외"
                style={{ marginTop: 8 }}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
        <FormS.FormGroupSection aria-labelledby="party-metric-source-title">
          <FormS.FormGroupTitle id="party-metric-source-title">출처</FormS.FormGroupTitle>
          <CitationListEditor value={citations} onChange={setCitations} />
          <EventFormS.Textarea
            aria-label="메모"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="메모(선택)"
            style={{ marginTop: 10 }}
          />
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saveMut.isPending} onClose={onClose} onSubmit={() => !problem && saveMut.mutate()} />
    </RegisterModal>
  )
}

const ValueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
`

const CheckLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
`

const UnverifiedBadge = styled.span`
  padding: 0 7px;
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
