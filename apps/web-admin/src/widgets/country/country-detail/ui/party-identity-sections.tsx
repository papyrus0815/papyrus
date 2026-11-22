/**
 * 정당 상세 — 정체성 곁가지: 「이름」(개명 이력·원어·번역·통칭·약칭)과 「법적 지위」(합법·유일 합법·불법화·강제 해산).
 * 설계: docs/political-party-model-review.md §4.2·4.4 (B1)
 *
 * 대표 표기(명칭·약칭·현지어)는 정당 본체 칸 — 정당 정보 수정에서 고친다. 여기는 '시간과 언어에 따라 달라지는 이름'.
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiStar, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import { getLaws } from '@/shared/api/election'
import {
  POLITICAL_PARTY_ALIAS_TYPE_OPTIONS,
  POLITICAL_PARTY_LEGAL_STATUS_OPTIONS,
  type PoliticalPartyAliasDto,
  type PoliticalPartyAliasInput,
  type PoliticalPartyAliasType,
  type PoliticalPartyLegalStatusDto,
  type PoliticalPartyLegalStatusInput,
  type PoliticalPartyLegalStatusKind,
  labelPoliticalPartyAliasType,
  labelPoliticalPartyLegalStatus,
  politicalPartyApi,
} from '@/shared/api/political-party'
import {
  EMPTY_PERIOD_DATE,
  type PeriodDateFormValue,
  formatPeriodLabel,
  isPeriodFormInverted,
  periodDateFormError,
  periodDateFormValue,
  structuredInputOf,
} from '@/shared/lib/party-dates'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalFormScroll,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
import { LinkedEventPickerField } from './linked-event-picker-field'
import * as FormS from './military-unit-form/styles'
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
  PeriodPair,
} from '@/widgets/political-party/party-sidecar-parts'

const ALIAS_TYPE_ORDER: PoliticalPartyAliasType[] = POLITICAL_PARTY_ALIAS_TYPE_OPTIONS.map((option) => option.value)

/** 자주 쓰는 언어 — 칸은 자유 입력(ISO 639), 이건 제안 목록 */
const LANGUAGE_SUGGESTIONS = [
  ['ko', '한국어'],
  ['en', '영어'],
  ['it', '이탈리아어'],
  ['de', '독일어'],
  ['fr', '프랑스어'],
  ['ja', '일본어'],
  ['zh', '중국어'],
  ['ru', '러시아어'],
  ['es', '스페인어'],
  ['la', '라틴어'],
] as const

const aliasesKey = (partyId: string) => ['political-parties', partyId, 'aliases'] as const
const legalStatusesKey = (partyId: string) => ['political-parties', partyId, 'legal-statuses'] as const

// ─── 이름 ──────────────────────────────────────────────────────────────────

export function PartyNamesBlock({ partyId }: { partyId: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; alias: PoliticalPartyAliasDto } | null>(
    null,
  )
  const { data = [], isLoading, isError } = useQuery({
    queryKey: aliasesKey(partyId),
    queryFn: () => politicalPartyApi.getAliases(partyId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: aliasesKey(partyId) })
    void queryClient.invalidateQueries({ queryKey: ['political-parties', 'detail', partyId] })
  }

  const saveMut = useMutation({
    mutationFn: (payload: { aliasId?: string; body: PoliticalPartyAliasInput }) =>
      payload.aliasId
        ? politicalPartyApi.updateAlias(partyId, payload.aliasId, payload.body)
        : politicalPartyApi.createAlias(partyId, payload.body),
    onSuccess: (_row, variables) => {
      invalidate()
      setModal(null)
      notify.success(variables.aliasId ? '이름을 고쳤습니다.' : '이름을 추가했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: (aliasId: string) => politicalPartyApi.deleteAlias(partyId, aliasId),
    onSuccess: () => {
      invalidate()
      notify.success('이름을 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const grouped = useMemo(() => {
    const byType = new Map<PoliticalPartyAliasType, PoliticalPartyAliasDto[]>()
    data.forEach((alias) => {
      const bucket = byType.get(alias.type)
      if (bucket) bucket.push(alias)
      else byType.set(alias.type, [alias])
    })
    return ALIAS_TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
      type,
      rows: [...(byType.get(type) ?? [])].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)),
    }))
  }, [data])

  return (
    <PartyDetailDescSection aria-label="이름">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>이름</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          이름 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : isError ? (
        <PartyDescEmptyHint>이름 목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : grouped.length === 0 ? (
        <PartyDescEmptyHint>
          개명 이력(기간별 공식명)·원어명·번역명·통칭을 넣으면 시기·언어마다 달랐던 이름이 남습니다. 대표 표기(명칭·약칭·현지어)는
          정당 정보 수정에서 고칩니다.
        </PartyDescEmptyHint>
      ) : (
        <FactList>
          {grouped.map((group) => (
            <FactGroup key={group.type}>
              <FactGroupLabel>{labelPoliticalPartyAliasType(group.type)}</FactGroupLabel>
              {group.rows.map((alias) => {
                const period = formatPeriodLabel(alias)
                return (
                  <FactRow key={alias.id}>
                    <FactMain>
                      <span className="title">
                        {alias.isPrimary ? (
                          <FiStar size={12} aria-label="대표" className="primary" />
                        ) : null}
                        {alias.name}
                      </span>
                      {alias.languageCode ? <FactBadge title="언어">{alias.languageCode}</FactBadge> : null}
                      {period ? <span className="period">{period}</span> : null}
                    </FactMain>
                    {alias.note ? <FactNote>{alias.note}</FactNote> : null}
                    <FactActions>
                      <IconBtn type="button" aria-label={`${alias.name} 고치기`} onClick={() => setModal({ mode: 'edit', alias })}>
                        <FiEdit2 size={13} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        aria-label={`${alias.name} 지우기`}
                        disabled={deleteMut.isPending}
                        onClick={async () => {
                          const approved = await confirm({
                            title: '이름 지우기',
                            message: `「${alias.name}」(${labelPoliticalPartyAliasType(alias.type)})을 지울까요?`,
                            confirmLabel: '지우기',
                            danger: true,
                          })
                          if (approved) deleteMut.mutate(alias.id)
                        }}
                      >
                        <FiTrash2 size={13} />
                      </IconBtn>
                    </FactActions>
                  </FactRow>
                )
              })}
            </FactGroup>
          ))}
        </FactList>
      )}
      {modal ? (
        <PartyAliasFormModal
          key={modal.mode === 'edit' ? modal.alias.id : 'new'}
          initial={modal.mode === 'edit' ? modal.alias : undefined}
          saving={saveMut.isPending}
          onClose={() => setModal(null)}
          onSubmit={(body) =>
            saveMut.mutate({ aliasId: modal.mode === 'edit' ? modal.alias.id : undefined, body })
          }
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

export function PartyAliasFormModal({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: PoliticalPartyAliasDto
  saving: boolean
  onClose: () => void
  onSubmit: (body: PoliticalPartyAliasInput) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<PoliticalPartyAliasType>(initial?.type ?? 'OFFICIAL')
  const [languageCode, setLanguageCode] = useState(initial?.languageCode ?? '')
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false)
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial
      ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay)
      : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [note, setNote] = useState(initial?.note ?? '')

  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const languageValid = languageCode.trim() === '' || /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(languageCode.trim())
  const problem = !name.trim()
    ? '필수: 이름'
    : startError
      ? `시작: ${startError}`
      : endError
        ? `끝: ${endError}`
        : inverted
          ? '끝이 시작보다 앞설 수 없습니다.'
          : !languageValid
            ? '언어 코드는 ko·en·it처럼 ISO 639 형식'
            : null
  const typeHint = POLITICAL_PARTY_ALIAS_TYPE_OPTIONS.find((option) => option.value === type)?.hint ?? ''

  const submit = () => {
    if (problem || saving) return
    onSubmit({
      name: name.trim(),
      type,
      languageCode: languageCode.trim() || null,
      isPrimary,
      start: structuredInputOf(start),
      end: structuredInputOf(end),
      note: note.trim() || null,
    })
  }

  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      trapFocus={false}
      title={initial ? '정당 이름 고치기' : '정당 이름 추가'}
      maxWidth="min(720px, 96vw)"
    >
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-alias-basic-title">
          <FormS.FormGroupTitle id="party-alias-basic-title">표기</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-alias-name">
              이름 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormS.TitleInput
                id="party-alias-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                aria-required
                autoFocus
                placeholder="예: National Fascist Party"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-alias-type">유형</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative
                id="party-alias-type"
                value={type}
                onChange={(event) => setType(event.target.value as PoliticalPartyAliasType)}
              >
                {POLITICAL_PARTY_ALIAS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelectNative>
              {typeHint ? <EventFormS.Hint>{typeHint}</EventFormS.Hint> : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-alias-language">
              언어<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="party-alias-language"
                list="party-alias-language-options"
                value={languageCode}
                onChange={(event) => setLanguageCode(event.target.value)}
                placeholder="ko · en · it · de …"
                autoComplete="off"
                aria-invalid={!languageValid || undefined}
              />
              <datalist id="party-alias-language-options">
                {LANGUAGE_SUGGESTIONS.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </datalist>
              <CheckRow>
                <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
                이 유형·언어의 대표 이름 (켜면 같은 유형·언어의 다른 대표는 꺼집니다)
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>

        <FormS.FormGroupSection aria-labelledby="party-alias-period-title">
          <FormS.FormGroupTitle id="party-alias-period-title">쓰인 기간</FormS.FormGroupTitle>
          <PeriodPair
            start={start}
            end={end}
            onStart={setStart}
            onEnd={setEnd}
            startError={startError}
            endError={endError}
            inverted={inverted}
            startLabel="쓰기 시작"
            endLabel="쓰기 끝"
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-alias-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-alias-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: '국민·민족 파시스트당'이라는 번역도 드물게 쓰인다"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saving} onClose={onClose} onSubmit={submit} />
    </RegisterModal>
  )
}

// ─── 법적 지위 ─────────────────────────────────────────────────────────────

export function PartyLegalStatusBlock({
  partyId,
  countryId,
  historicalCountryId,
}: {
  partyId: string
  countryId?: string
  historicalCountryId?: string
}) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; row: PoliticalPartyLegalStatusDto } | null
  >(null)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: legalStatusesKey(partyId),
    queryFn: () => politicalPartyApi.getLegalStatuses(partyId),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: legalStatusesKey(partyId) })

  const saveMut = useMutation({
    mutationFn: (payload: { statusId?: string; body: PoliticalPartyLegalStatusInput }) =>
      payload.statusId
        ? politicalPartyApi.updateLegalStatus(partyId, payload.statusId, payload.body)
        : politicalPartyApi.createLegalStatus(partyId, payload.body),
    onSuccess: (_row, variables) => {
      invalidate()
      setModal(null)
      notify.success(variables.statusId ? '법적 지위를 고쳤습니다.' : '법적 지위를 추가했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: (statusId: string) => politicalPartyApi.deleteLegalStatus(partyId, statusId),
    onSuccess: () => {
      invalidate()
      notify.success('법적 지위 기록을 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <PartyDetailDescSection aria-label="법적 지위">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>법적 지위</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          지위 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : isError ? (
        <PartyDescEmptyHint>법적 지위를 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>
          합법·유일 합법 정당·불법화·망명·강제 해산처럼 체제 안에서 이 정당이 놓였던 자리를 기간별로 남깁니다. 근거 법령·계기
          사건을 함께 이을 수 있습니다.
        </PartyDescEmptyHint>
      ) : (
        <FactList>
          {data.map((row) => {
            const period = formatPeriodLabel(row)
            return (
              <FactRow key={row.id}>
                <FactMain>
                  <StatusBadge $status={row.status}>{labelPoliticalPartyLegalStatus(row.status)}</StatusBadge>
                  {period ? <span className="period strong">{period}</span> : <span className="period">기간 미상</span>}
                </FactMain>
                {row.law || row.event ? (
                  <FactNote>
                    {[row.law ? `근거 법령 · ${row.law.name}` : null, row.event ? `계기 사건 · ${row.event.title}` : null]
                      .filter(Boolean)
                      .join('   ')}
                  </FactNote>
                ) : null}
                {row.note ? <FactNote>{row.note}</FactNote> : null}
                <FactActions>
                  <IconBtn type="button" aria-label="법적 지위 고치기" onClick={() => setModal({ mode: 'edit', row })}>
                    <FiEdit2 size={13} />
                  </IconBtn>
                  <IconBtn
                    type="button"
                    aria-label="법적 지위 지우기"
                    disabled={deleteMut.isPending}
                    onClick={async () => {
                      const approved = await confirm({
                        title: '법적 지위 지우기',
                        message: `「${labelPoliticalPartyLegalStatus(row.status)}${period ? ` · ${period}` : ''}」기록을 지울까요?`,
                        confirmLabel: '지우기',
                        danger: true,
                      })
                      if (approved) deleteMut.mutate(row.id)
                    }}
                  >
                    <FiTrash2 size={13} />
                  </IconBtn>
                </FactActions>
              </FactRow>
            )
          })}
        </FactList>
      )}
      {modal ? (
        <PartyLegalStatusFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          countryId={countryId}
          historicalCountryId={historicalCountryId}
          saving={saveMut.isPending}
          onClose={() => setModal(null)}
          onSubmit={(body) => saveMut.mutate({ statusId: modal.mode === 'edit' ? modal.row.id : undefined, body })}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

export function PartyLegalStatusFormModal({
  initial,
  countryId,
  historicalCountryId,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: PoliticalPartyLegalStatusDto
  countryId?: string
  historicalCountryId?: string
  saving: boolean
  onClose: () => void
  onSubmit: (body: PoliticalPartyLegalStatusInput) => void
}) {
  const [status, setStatus] = useState<PoliticalPartyLegalStatusKind>(initial?.status ?? 'LEGAL')
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial
      ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay)
      : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? false)
  const [lawId, setLawId] = useState(initial?.lawId ?? '')
  const [eventId, setEventId] = useState(initial?.eventId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  const lawParams: Record<string, string> | null = historicalCountryId
    ? { historicalCountryId }
    : countryId
      ? { countryId }
      : null
  const { data: laws = [] } = useQuery({
    queryKey: ['laws', historicalCountryId ? `h:${historicalCountryId}` : countryId ? `c:${countryId}` : ''],
    queryFn: () => getLaws(lawParams ?? {}),
    enabled: Boolean(lawParams),
  })
  const sortedLaws = useMemo(() => [...laws].sort((left, right) => left.name.localeCompare(right.name, 'ko')), [laws])

  const startError = periodDateFormError(start)
  const endError = isCurrent ? null : periodDateFormError(end)
  const inverted = !isCurrent && isPeriodFormInverted(start, end)
  const problem = startError
    ? `시작: ${startError}`
    : endError
      ? `끝: ${endError}`
      : inverted
        ? '끝이 시작보다 앞설 수 없습니다.'
        : null
  const statusHint = POLITICAL_PARTY_LEGAL_STATUS_OPTIONS.find((option) => option.value === status)?.hint ?? ''

  const submit = () => {
    if (problem || saving) return
    onSubmit({
      status,
      start: structuredInputOf(start),
      end: isCurrent ? null : structuredInputOf(end),
      isCurrent,
      lawId: lawId || null,
      eventId: eventId || null,
      note: note.trim() || null,
    })
  }

  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      trapFocus={false}
      title={initial ? '법적 지위 고치기' : '법적 지위 추가'}
      maxWidth="min(760px, 96vw)"
    >
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-legal-basic-title">
          <FormS.FormGroupTitle id="party-legal-basic-title">지위·기간</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-legal-status">지위</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative
                id="party-legal-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as PoliticalPartyLegalStatusKind)}
              >
                {POLITICAL_PARTY_LEGAL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelectNative>
              {statusHint ? <EventFormS.Hint>{statusHint}</EventFormS.Hint> : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <PeriodPair
            start={start}
            end={end}
            onStart={setStart}
            onEnd={setEnd}
            startError={startError}
            endError={endError}
            inverted={inverted}
            startLabel="시작"
            endLabel="끝"
            endDisabled={isCurrent}
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">지속</EventFormS.FormLabel>
            <EventFormS.FormField>
              <CheckRow>
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(event) => {
                    setIsCurrent(event.target.checked)
                    if (event.target.checked) setEnd({ ...EMPTY_PERIOD_DATE })
                  }}
                />
                지금도 이 지위 — 끝을 비워 둡니다(끝을 모르는 것과 구분)
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>

        <FormS.FormGroupSection aria-labelledby="party-legal-basis-title">
          <FormS.FormGroupTitle id="party-legal-basis-title">근거</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-legal-law">
              근거 법령<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="party-legal-law" value={lawId} onChange={(event) => setLawId(event.target.value)}>
                <option value="">{sortedLaws.length > 0 ? `법령 선택 (${sortedLaws.length}건)…` : '이 국가에 등록된 법령 없음'}</option>
                {sortedLaws.map((law) => (
                  <option key={law.id} value={law.id}>
                    {law.name}
                  </option>
                ))}
              </FormSelectNative>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-legal-event">
              계기 사건<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <LinkedEventPickerField
                inputId="party-legal-event"
                value={eventId}
                initialTitle={initial?.event?.title ?? null}
                nearYear={start.year != null ? (start.era === 'BC' ? -start.year : start.year) : null}
                onChange={setEventId}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-legal-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-legal-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 1926년 파시스트 법으로 다른 정당 해산, 1928년 선거법으로 단일 명부"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saving} onClose={onClose} onSubmit={submit} />
    </RegisterModal>
  )
}

// ─── 스타일 ────────────────────────────────────────────────────────────────










/** 지위별 색 — 합법(초록) · 일당 지위(남색) · 금지·해산(빨강) · 지하·망명(주황) · 정지·기타(회색) */
const STATUS_RGB: Record<string, string> = {
  LEGAL: '22, 163, 74',
  SOLE_LEGAL: '67, 56, 202',
  RULING_STATE_PARTY: '109, 40, 217',
  BANNED: '220, 38, 38',
  CONSTITUTIONALLY_DISSOLVED: '185, 28, 28',
  UNDERGROUND: '217, 119, 6',
  IN_EXILE: '234, 88, 12',
  SUSPENDED: '100, 116, 139',
  OTHER: '100, 116, 139',
}

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $status, theme }) => `rgba(${STATUS_RGB[$status] ?? STATUS_RGB.OTHER}, ${theme.mode === 'dark' ? 0.22 : 0.12})`};
  color: ${({ $status, theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : `rgb(${STATUS_RGB[$status] ?? STATUS_RGB.OTHER})`};
`



