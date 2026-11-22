/**
 * 정당 소속·당직 등록·수정 모달 — 정당 지면(정당 고정·인물 고르기)과 인물 지면(인물 고정·정당 고르기)이 같은 모달을 쓴다.
 *
 * 두 지면이 다른 폼을 쓰면 한쪽이 구조화 기간(연도만·기원전)을 모르는 채 덮어쓴다 — 실제로 인물 지면의 옛 폼은
 * 날짜를 'YYYY-MM-DD'로만 다뤄, 정당 지면에서 '1921년'으로 넣은 기간을 1921-01-01 일 정밀로 바꿔 저장했다.
 * 설계: docs/political-party-model-review.md §4.6 (B3)
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { usePersons } from '@/entities/person/api'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  type PartyMembershipLeadershipTier,
  type PartyMembershipRoleCategory,
  createPartyMembership,
  getPoliticalParties,
  updatePartyMembership,
} from '@/shared/api/election'
import {
  EMPTY_PERIOD_DATE,
  type PeriodDateFormValue,
  isPeriodFormInverted,
  periodDateFormError,
  periodDateFormValue,
  structuredInputOf,
} from '@/shared/lib/party-dates'
import {
  PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS,
  PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS,
  PARTY_OFFICE_KIND_OPTIONS,
  type PartyOfficeKindValue,
} from '@/shared/lib/party-membership-labels'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import * as FormS from '@/widgets/country/country-detail/ui/military-unit-form/styles'

import { CheckRow, ModalFooter, PeriodPair } from './party-sidecar-parts'

/** 수정할 행 — 정당 지면 목록 행과 인물 지면 목록 행 둘 다 이 모양을 채운다 */
export interface PartyMembershipEditable {
  id: string
  personId: string
  partyId?: string | null
  roleCategory?: string | null
  leadershipTier?: string | null
  officeKind?: string | null
  officeOrdinal?: number | null
  isFounder?: boolean
  roleTitle?: string | null
  notes?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
  /** 구조화 칸이 없던 옛 응답 — AD1000+ 거울 */
  startDate?: string | Date | null
  endDate?: string | Date | null
  person?: {
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    country?: { defaultNameDisplayOrder?: string | null } | null
  } | null
  party?: { id: string; name: string } | null
}

export type PartyMembershipAnchor =
  /** 정당 지면 — 정당 고정, 인물을 고른다 */
  | { kind: 'party'; partyId: string }
  /** 인물 지면 — 인물 고정, 정당을 고른다(국가가 있으면 그 국가 정당 먼저) */
  | { kind: 'person'; personId: string; countryId?: string | null }

/** 구조화 칸이 없으면 거울 DATETIME('YYYY-MM-DD…')에서 */
function formValueOf(
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  mirror: string | Date | null | undefined,
): PeriodDateFormValue {
  if (year != null) return periodDateFormValue(era, year, month, day)
  const iso = mirror instanceof Date ? mirror.toISOString() : typeof mirror === 'string' ? mirror : ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return { ...EMPTY_PERIOD_DATE }
  return { era: 'AD', year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function PartyMembershipFormModal({
  anchor,
  initial,
  onClose,
  onSaved,
}: {
  anchor: PartyMembershipAnchor
  initial?: PartyMembershipEditable
  onClose: () => void
  onSaved: () => void
}) {
  const choosesPerson = anchor.kind === 'party'
  const { data: persons = [] } = usePersons()
  const { data: parties = [] } = useQuery({
    queryKey: ['political-parties', anchor.kind === 'person' ? (anchor.countryId ?? 'all') : 'unused'],
    queryFn: () =>
      getPoliticalParties(anchor.kind === 'person' && anchor.countryId ? { countryId: anchor.countryId } : undefined),
    enabled: anchor.kind === 'person',
  })

  const [personId, setPersonId] = useState(initial?.personId ?? (anchor.kind === 'person' ? anchor.personId : ''))
  const [partyId, setPartyId] = useState(
    initial?.partyId ?? initial?.party?.id ?? (anchor.kind === 'party' ? anchor.partyId : ''),
  )
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [roleCategory, setRoleCategory] = useState<PartyMembershipRoleCategory>(
    (initial?.roleCategory as PartyMembershipRoleCategory | undefined) ?? 'GENERAL_MEMBER',
  )
  const [officeKind, setOfficeKind] = useState<PartyOfficeKindValue | ''>((initial?.officeKind as PartyOfficeKindValue) ?? '')
  const [officeOrdinal, setOfficeOrdinal] = useState(initial?.officeOrdinal != null ? String(initial.officeOrdinal) : '')
  const [leadershipTier, setLeadershipTier] = useState<PartyMembershipLeadershipTier>(
    (initial?.leadershipTier as PartyMembershipLeadershipTier | undefined) ?? 'UNSPECIFIED',
  )
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? '')
  const [isFounder, setIsFounder] = useState(initial?.isFounder ?? false)
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial
      ? formValueOf(initial.startEra, initial.startYear, initial.startMonth, initial.startDay, initial.startDate)
      : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? formValueOf(initial.endEra, initial.endYear, initial.endMonth, initial.endDay, initial.endDate) : { ...EMPTY_PERIOD_DATE },
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const selectedPerson = useMemo(() => persons.find((person) => person.id === personId) ?? null, [persons, personId])
  const sortedParties = useMemo(() => [...parties].sort((left, right) => left.name.localeCompare(right.name, 'ko')), [parties])

  const isLeadership = roleCategory === 'LEADERSHIP'
  const ordinalNumber = officeOrdinal.trim() === '' ? null : Number(officeOrdinal)
  const ordinalInvalid = ordinalNumber != null && (!Number.isInteger(ordinalNumber) || ordinalNumber < 1)
  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem = !personId
    ? '필수: 인물'
    : !partyId
      ? '필수: 정당'
      : ordinalInvalid
        ? '대수는 1 이상의 정수'
        : startError
          ? `시작: ${startError}`
          : endError
            ? `끝: ${endError}`
            : inverted
              ? '끝이 시작보다 앞설 수 없습니다.'
              : null

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        roleCategory,
        leadershipTier: isLeadership ? leadershipTier : null,
        officeKind: isLeadership ? officeKind || null : null,
        officeOrdinal: isLeadership ? ordinalNumber : null,
        roleTitle: roleTitle.trim() || null,
        isFounder,
        start: structuredInputOf(start),
        end: structuredInputOf(end),
        notes: notes.trim() || null,
      }
      if (initial) return updatePartyMembership(initial.personId, initial.id, { ...body, partyId })
      return createPartyMembership(personId, { partyId, ...body })
    },
    onSuccess: () => {
      notify.success(initial ? '소속 기록을 고쳤습니다.' : '소속 기록을 추가했습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const fixedPersonName = initial?.person
    ? getPersonDisplayName({
        name: initial.person.name,
        surname: initial.person.surname,
        middleName: initial.person.middleName,
        nameDisplayOrder: initial.person.nameDisplayOrder ?? null,
        country: initial.person.country ?? null,
      })
    : null

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '소속·당직 고치기' : '소속·당직 추가'} maxWidth="min(780px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-membership-who-title">
          <FormS.FormGroupTitle id="party-membership-who-title">누가·어디서·무엇으로</FormS.FormGroupTitle>
          {choosesPerson ? (
            <EventFormS.FormRow>
              <EventFormS.FormLabel as="div">
                인물 <EventFormS.Required>*</EventFormS.Required>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                {initial ? (
                  <strong>{fixedPersonName ?? selectedPerson?.name ?? '—'}</strong>
                ) : (
                  <PersonSelectField
                    value={personId}
                    selectedPerson={selectedPerson}
                    persons={persons}
                    isModalOpen={personModalOpen}
                    onModalOpenChange={setPersonModalOpen}
                    onSelect={(id) => setPersonId(id)}
                    hint="내가 등록한 인물만 고를 수 있습니다."
                  />
                )}
              </EventFormS.FormField>
            </EventFormS.FormRow>
          ) : (
            <EventFormS.FormRow>
              <EventFormS.FormLabel htmlFor="party-membership-party">
                정당 <EventFormS.Required>*</EventFormS.Required>
              </EventFormS.FormLabel>
              <EventFormS.FormField>
                <FormSelectNative id="party-membership-party" value={partyId} onChange={(event) => setPartyId(event.target.value)}>
                  <option value="">정당 선택 ({sortedParties.length}곳)…</option>
                  {sortedParties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                      {party.shortName ? ` (${party.shortName})` : ''}
                    </option>
                  ))}
                </FormSelectNative>
                <EventFormS.Hint>목록에 없는 정당은 국가 상세의 정당 지면에서 먼저 등록합니다.</EventFormS.Hint>
              </EventFormS.FormField>
            </EventFormS.FormRow>
          )}
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-membership-role">역할</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative
                id="party-membership-role"
                value={roleCategory}
                onChange={(event) => setRoleCategory(event.target.value as PartyMembershipRoleCategory)}
              >
                {PARTY_MEMBERSHIP_ROLE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelectNative>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          {isLeadership ? (
            <EventFormS.FormRow>
              <EventFormS.FormLabel htmlFor="party-membership-office">당직</EventFormS.FormLabel>
              <EventFormS.FormField>
                <OfficeGrid>
                  <FormSelectNative
                    id="party-membership-office"
                    value={officeKind}
                    onChange={(event) => setOfficeKind(event.target.value as PartyOfficeKindValue | '')}
                  >
                    <option value="">당직 종류 —</option>
                    {PARTY_OFFICE_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.hint ? ` — ${option.hint}` : ''}
                      </option>
                    ))}
                  </FormSelectNative>
                  <EventFormS.Input
                    aria-label="대수"
                    inputMode="numeric"
                    value={officeOrdinal}
                    onChange={(event) => setOfficeOrdinal(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="제N대"
                    aria-invalid={ordinalInvalid || undefined}
                  />
                  <FormSelectNative
                    aria-label="지도부 위계"
                    value={leadershipTier}
                    onChange={(event) => setLeadershipTier(event.target.value as PartyMembershipLeadershipTier)}
                  >
                    {PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FormSelectNative>
                </OfficeGrid>
                <EventFormS.Hint>당직 종류는 정당끼리 같은 축(역대 서기장), 직함은 그 정당의 말(두체·Segretario).</EventFormS.Hint>
              </EventFormS.FormField>
            </EventFormS.FormRow>
          ) : null}
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-membership-title">
              직함<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="party-membership-title"
                value={roleTitle}
                onChange={(event) => setRoleTitle(event.target.value)}
                placeholder="예: 두체, Segretario del PNF, 최고위원"
                autoComplete="off"
              />
              <CheckRow>
                <input type="checkbox" checked={isFounder} onChange={(event) => setIsFounder(event.target.checked)} />
                창당 발기인
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
        <FormS.FormGroupSection aria-labelledby="party-membership-when-title">
          <FormS.FormGroupTitle id="party-membership-when-title">언제</FormS.FormGroupTitle>
          <PeriodPair
            start={start}
            end={end}
            onStart={setStart}
            onEnd={setEnd}
            startError={startError}
            endError={endError}
            inverted={inverted}
            startLabel={isLeadership ? '취임' : '입당'}
            endLabel={isLeadership ? '퇴임' : '탈당'}
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-membership-notes">
              비고<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea id="party-membership-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saveMut.isPending} onClose={onClose} onSubmit={() => !problem && saveMut.mutate()} />
    </RegisterModal>
  )
}

const OfficeGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 96px minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`
