/**
 * 정당 상세 — 「관계」: 자매 정당·위성정당·계파·공동 교섭단체(B6, docs/political-party-model-review.md §4.6).
 *
 * 계보(전신·후신)는 「전신·후신」, 선거 한 번의 연합은 선거 상세 — 여기는 '나란히 있던 사이'.
 * 한 행을 두 정당이 함께 본다: 어느 쪽에서 걸어도 같은 행이고, 화면은 이 정당 입장으로 읽는다
 * (갑 정당에서 '위성정당 을'이면 을 정당에서는 '모당 갑').
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  type PartyLinkDto,
  type PartyLinkInput,
  type PartyLinkPartySummary,
  type PoliticalPartyLinkKind,
  SYMMETRIC_PARTY_LINK_KINDS,
  politicalPartyApi,
} from '@/shared/api/political-party'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
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
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import {
  FactActions,
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

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
import * as FormS from './military-unit-form/styles'
import { PartyCitationButton } from './party-citations'
import { partyKeys } from '@/widgets/political-party/party-query-keys'

const linksKey = partyKeys.links

type LinkRole = PartyLinkDto['role']

/** 이 정당 입장의 관계 선택지 — 종류 × 자리 */
export const PARTY_LINK_CHOICES: { value: string; kind: PoliticalPartyLinkKind; role: LinkRole; label: string; group: string }[] = [
  { value: 'SISTER_PARTY', kind: 'SISTER_PARTY', role: 'peer', label: '자매 정당', group: '자매 정당' },
  { value: 'SATELLITE_OF:superior', kind: 'SATELLITE_OF', role: 'superior', label: '상대가 이 정당의 위성정당', group: '위성정당' },
  { value: 'SATELLITE_OF:subordinate', kind: 'SATELLITE_OF', role: 'subordinate', label: '이 정당이 상대의 위성정당', group: '모당 — 이 정당이 그 위성' },
  { value: 'FACTION_OF:superior', kind: 'FACTION_OF', role: 'superior', label: '상대가 이 정당 안의 계파', group: '당내 계파' },
  { value: 'FACTION_OF:subordinate', kind: 'FACTION_OF', role: 'subordinate', label: '이 정당이 상대 안의 계파', group: '상위 정당 — 이 정당이 그 계파' },
  { value: 'PARLIAMENTARY_UNION', kind: 'PARLIAMENTARY_UNION', role: 'peer', label: '공동 교섭단체·원내 연합', group: '공동 교섭단체' },
  { value: 'OTHER', kind: 'OTHER', role: 'peer', label: '기타 관계', group: '기타 관계' },
]

export function partyLinkChoiceOf(kind: PoliticalPartyLinkKind, role: LinkRole) {
  return (
    PARTY_LINK_CHOICES.find((choice) => choice.kind === kind && (SYMMETRIC_PARTY_LINK_KINDS.has(kind) || choice.role === role)) ??
    PARTY_LINK_CHOICES[PARTY_LINK_CHOICES.length - 1]
  )
}

function partyPlace(party: PartyLinkPartySummary): string {
  return party.historicalCountry?.name ?? party.country?.name ?? ''
}

export function PartyLinksBlock({ partyId, partyName }: { partyId: string; partyName: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: PartyLinkDto } | null>(null)
  const { data: links = [], isLoading } = useQuery({
    queryKey: linksKey(partyId),
    queryFn: () => politicalPartyApi.getLinks(partyId),
  })
  /** 관계는 상대 정당 화면에도 보인다 — 상대 쪽 캐시도 함께 */
  const invalidate = (otherPartyId?: string) => {
    void queryClient.invalidateQueries({ queryKey: linksKey(partyId) })
    if (otherPartyId) void queryClient.invalidateQueries({ queryKey: linksKey(otherPartyId) })
  }
  const saveMut = useMutation({
    mutationFn: ({ linkId, body }: { linkId?: string; body: PartyLinkInput }) =>
      linkId ? politicalPartyApi.updateLink(partyId, linkId, body) : politicalPartyApi.createLink(partyId, body),
    onSuccess: (_row, variables) => {
      invalidate(variables.body.otherPartyId)
      setModal(null)
      notify.success(variables.linkId ? '관계를 고쳤습니다.' : '관계를 추가했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const deleteMut = useMutation({
    mutationFn: (row: PartyLinkDto) => politicalPartyApi.deleteLink(partyId, row.id),
    onSuccess: (_void, row) => {
      invalidate(row.otherPartyId)
      notify.success('관계를 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const groups = useMemo(() => {
    const order = PARTY_LINK_CHOICES.map((choice) => choice.group)
    const byGroup = new Map<string, PartyLinkDto[]>()
    for (const row of links) {
      const group = partyLinkChoiceOf(row.kind, row.role).group
      byGroup.set(group, [...(byGroup.get(group) ?? []), row])
    }
    return [...byGroup.entries()].sort(([left], [right]) => order.indexOf(left) - order.indexOf(right))
  }, [links])

  return (
    <PartyDetailDescSection aria-label="정당 관계">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>정당 관계</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          관계 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : groups.length === 0 ? (
        <PartyDescEmptyHint>
          자매 정당·위성정당·당내 계파·공동 교섭단체처럼 나란히 있던 사이를 남깁니다. 전신·후신(계보)은 아래 「전신·후신」에서.
        </PartyDescEmptyHint>
      ) : (
        <FactList>
          {groups.map(([group, rows]) => (
            <FactGroup key={group}>
              <FactGroupLabel>{group}</FactGroupLabel>
              {rows.map((row) => {
                const period = formatPeriodLabel(row)
                const place = partyPlace(row.otherParty)
                const choice = partyLinkChoiceOf(row.kind, row.role)
                return (
                  <FactRow key={row.id}>
                    <FactMain>
                      {row.otherParty.brandColor ? (
                        <Swatch style={{ background: row.otherParty.brandColor }} aria-hidden />
                      ) : null}
                      <span className="title">{row.otherParty.name}</span>
                      {place ? <span className="period">{place}</span> : null}
                      <span className="period strong">{period || '기간 미상'}</span>
                    </FactMain>
                    {row.note ? <FactNote>{row.note}</FactNote> : null}
                    <FactActions>
                      <PartyCitationButton
                        partyId={partyId}
                        targetType="PARTY_LINK"
                        targetId={row.id}
                        subject={`${choice.group} · ${row.otherParty.name}`}
                      />
                      <IconBtn type="button" aria-label={`${row.otherParty.name} 관계 고치기`} onClick={() => setModal({ mode: 'edit', row })}>
                        <FiEdit2 size={13} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        aria-label={`${row.otherParty.name} 관계 지우기`}
                        disabled={deleteMut.isPending}
                        onClick={async () => {
                          const approved = await confirm({
                            title: '관계 지우기',
                            message: `「${partyName}」–「${row.otherParty.name}」 ${choice.group} 관계를 지울까요? 상대 정당 화면에서도 사라집니다.`,
                            confirmLabel: '지우기',
                            danger: true,
                          })
                          if (approved) deleteMut.mutate(row)
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
        <PartyLinkFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          partyId={partyId}
          partyName={partyName}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          saving={saveMut.isPending}
          onClose={() => setModal(null)}
          onSubmit={(body) => saveMut.mutate({ linkId: modal.mode === 'edit' ? modal.row.id : undefined, body })}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

export function PartyLinkFormModal({
  partyId,
  partyName,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  partyId: string
  partyName: string
  initial?: PartyLinkDto
  saving: boolean
  onClose: () => void
  onSubmit: (body: PartyLinkInput) => void
}) {
  const [choiceValue, setChoiceValue] = useState(() =>
    initial ? partyLinkChoiceOf(initial.kind, initial.role).value : PARTY_LINK_CHOICES[0].value,
  )
  const choice = PARTY_LINK_CHOICES.find((candidate) => candidate.value === choiceValue) ?? PARTY_LINK_CHOICES[0]
  const [other, setOther] = useState<PartyLinkPartySummary | null>(initial?.otherParty ?? null)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const { data: candidates = [] } = useQuery({
    queryKey: ['political-parties', partyId, 'link-candidates', debounced.trim()],
    queryFn: () => politicalPartyApi.getLinkCandidates(partyId, debounced.trim()),
    enabled: other == null,
    staleTime: 30_000,
  })
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem = !other
    ? '필수: 상대 정당'
    : startError
      ? `시작: ${startError}`
      : endError
        ? `끝: ${endError}`
        : inverted
          ? '끝이 시작보다 앞설 수 없습니다.'
          : null
  const sentence = other ? describeLink(choice.kind, choice.role, partyName, other.name) : null

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '정당 관계 고치기' : '정당 관계 추가'} maxWidth="min(760px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-link-title">
          <FormS.FormGroupTitle id="party-link-title">어떤 사이</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-link-kind">
              관계 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="party-link-kind" value={choiceValue} onChange={(event) => setChoiceValue(event.target.value)}>
                {PARTY_LINK_CHOICES.map((candidate) => (
                  <option key={candidate.value} value={candidate.value}>
                    {candidate.label}
                  </option>
                ))}
              </FormSelectNative>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">
              상대 정당 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              {other ? (
                <ChosenParty>
                  {other.brandColor ? <Swatch style={{ background: other.brandColor }} aria-hidden /> : null}
                  <span className="name">{other.name}</span>
                  {partyPlace(other) ? <span className="meta">{partyPlace(other)}</span> : null}
                  <ClearBtn type="button" aria-label="상대 정당 다시 고르기" onClick={() => setOther(null)}>
                    <FiX size={13} />
                  </ClearBtn>
                </ChosenParty>
              ) : (
                <>
                  <EventFormS.Input
                    aria-label="상대 정당 찾기"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="정당 이름·약칭·별칭 — 나라 무관"
                    autoFocus
                  />
                  <CandidateList role="listbox" aria-label="상대 정당 후보">
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        role="option"
                        aria-selected={false}
                        tabIndex={0}
                        className="row"
                        onClick={() => setOther(candidate)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setOther(candidate)
                          }
                        }}
                      >
                        {candidate.brandColor ? <Swatch style={{ background: candidate.brandColor }} aria-hidden /> : null}
                        <span className="name">{candidate.name}</span>
                        {partyPlace(candidate) ? <span className="meta">{partyPlace(candidate)}</span> : null}
                      </div>
                    ))}
                    {candidates.length === 0 ? <p className="empty">맞는 정당이 없습니다 — 먼저 정당을 등록하세요.</p> : null}
                  </CandidateList>
                </>
              )}
              {sentence ? <EventFormS.Hint>{sentence}</EventFormS.Hint> : null}
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
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-link-note">
              맥락<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-link-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 비례대표 전용 위성정당, 총선 후 합당"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter
        problem={problem}
        saving={saving}
        onClose={onClose}
        onSubmit={() =>
          !problem &&
          other &&
          onSubmit({
            otherPartyId: other.id,
            kind: choice.kind,
            ...(choice.role === 'peer' ? {} : { role: choice.role }),
            start: structuredInputOf(start),
            end: structuredInputOf(end),
            note: note.trim() || null,
          })
        }
      />
    </RegisterModal>
  )
}

/** 저장 전 확인 문장 — 방향을 헷갈리지 않게 */
export function describeLink(kind: PoliticalPartyLinkKind, role: LinkRole, selfName: string, otherName: string): string {
  const [junior, senior] = role === 'subordinate' ? [selfName, otherName] : [otherName, selfName]
  switch (kind) {
    case 'SISTER_PARTY':
      return `「${selfName}」와 「${otherName}」는 자매 정당`
    case 'PARLIAMENTARY_UNION':
      return `「${selfName}」와 「${otherName}」는 공동 교섭단체·원내 연합`
    case 'SATELLITE_OF':
      return `「${junior}」는 「${senior}」의 위성정당`
    case 'FACTION_OF':
      return `「${junior}」는 「${senior}」 안의 계파`
    default:
      return `「${selfName}」와 「${otherName}」 사이의 관계`
  }
}

const Swatch = styled.span`
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  align-self: center;
`

const ChosenParty = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;

  .name {
    font-size: 13.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ClearBtn = styled.button`
  margin-left: auto;
  display: inline-flex;
  padding: 5px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CandidateList = styled.div`
  margin-top: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;

  .row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
  }
  .row:hover,
  .row:focus-visible {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)')};
    outline: none;
  }
  .name {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .empty {
    margin: 0;
    padding: 7px 10px;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
