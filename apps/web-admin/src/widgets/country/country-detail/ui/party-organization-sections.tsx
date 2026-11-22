/**
 * 정당 상세 — 「산하·연계 조직」: 지도 기구·청년단·준군사조직·기관지·국제 조직(B3, docs/political-party-model-review.md §4.7).
 *
 * 이름 문자열이 아니라 조직 또는 군부대에 잇는다. 목록에 없으면 그 자리에서 조직을 만든다(유형은 역할에서,
 * 국가는 정당에서) — 기관지 편집장 경력·청년단 지도자·부대 지휘관이 같은 엔티티에 걸리게.
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import { ORGANIZATION_TYPE_LABEL, type OrganizationType } from '@/shared/api/organizations'
import {
  PARTY_ORGANIZATION_ROLE_OPTIONS,
  type CreatePartyOrganizationInput,
  type PartyOrganizationCandidate,
  type PartyOrganizationLinkDto,
  type PartyOrganizationRole,
  labelPartyOrganizationRole,
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
import { pathKeys } from '@/shared/router'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
import * as FormS from './military-unit-form/styles'
import {
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

const organizationsKey = (partyId: string) => ['political-parties', partyId, 'organizations'] as const

function targetName(link: PartyOrganizationLinkDto): string {
  return link.organization?.name ?? link.militaryUnit?.name ?? '—'
}

export function PartyOrganizationsBlock({ partyId }: { partyId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; link: PartyOrganizationLinkDto } | null>(null)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: organizationsKey(partyId),
    queryFn: () => politicalPartyApi.getOrganizations(partyId),
  })

  const deleteMut = useMutation({
    mutationFn: (linkId: string) => politicalPartyApi.deleteOrganizationLink(partyId, linkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationsKey(partyId) })
      notify.success('연결을 풀었습니다. 조직·부대는 그대로 남습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  /** 서버가 역할 순 → 시작 순으로 준다 — 같은 역할끼리 묶는다 */
  const groups = useMemo(() => {
    const byRole: Array<{ role: PartyOrganizationRole; rows: PartyOrganizationLinkDto[] }> = []
    for (const link of data) {
      const last = byRole[byRole.length - 1]
      if (last && last.role === link.role) last.rows.push(link)
      else byRole.push({ role: link.role, rows: [link] })
    }
    return byRole
  }, [data])

  const openTarget = (link: PartyOrganizationLinkDto) => {
    if (link.organization) navigate(`/organizations?selected=${encodeURIComponent(link.organization.id)}`)
    else if (link.militaryUnit) navigate(pathKeys.militaryUnitDetail(link.militaryUnit.id))
  }

  return (
    <PartyDetailDescSection aria-label="산하·연계 조직">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>산하·연계 조직</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          조직 잇기
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>
          지도 기구·청년 조직·준군사조직·기관지·국제 조직을 기간과 함께 잇습니다. 목록에 없는 조직은 그 자리에서 만듭니다.
        </PartyDescEmptyHint>
      ) : (
        <FactList>
          {groups.map((group) => (
            <FactGroup key={group.role}>
              <FactGroupLabel>{labelPartyOrganizationRole(group.role)}</FactGroupLabel>
              {group.rows.map((link) => {
                const period = formatPeriodLabel(link)
                const typeLabel = link.organization
                  ? ORGANIZATION_TYPE_LABEL[link.organization.type as OrganizationType] ?? link.organization.type
                  : '군부대'
                const altName = link.organization?.localName ?? link.militaryUnit?.nameEn ?? null
                return (
                  <FactRow key={link.id}>
                    <FactMain>
                      <span className="title">
                        <TargetLink type="button" onClick={() => openTarget(link)}>
                          {targetName(link)}
                        </TargetLink>
                      </span>
                      {altName ? <span className="period">{altName}</span> : null}
                      <FactBadge>{typeLabel}</FactBadge>
                      {period ? <span className="period strong">{period}</span> : null}
                    </FactMain>
                    {link.note ? <FactNote>{link.note}</FactNote> : null}
                    <FactActions>
                      <IconBtn type="button" aria-label={`${targetName(link)} 고치기`} onClick={() => setModal({ mode: 'edit', link })}>
                        <FiEdit2 size={13} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        aria-label={`${targetName(link)} 연결 풀기`}
                        disabled={deleteMut.isPending}
                        onClick={async () => {
                          const approved = await confirm({
                            title: '연결 풀기',
                            message: `「${targetName(link)}」(${labelPartyOrganizationRole(link.role)}) 연결을 풀까요? 조직·부대 자체는 남습니다.`,
                            confirmLabel: '풀기',
                            danger: true,
                          })
                          if (approved) deleteMut.mutate(link.id)
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
        <PartyOrganizationFormModal
          key={modal.mode === 'edit' ? modal.link.id : 'new'}
          partyId={partyId}
          initial={modal.mode === 'edit' ? modal.link : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: organizationsKey(partyId) })
            setModal(null)
          }}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

type TargetChoice =
  | { kind: 'organization'; id: string; name: string }
  | { kind: 'militaryUnit'; id: string; name: string }
  | { kind: 'new'; name: string }

export function PartyOrganizationFormModal({
  partyId,
  initial,
  onClose,
  onSaved,
}: {
  partyId: string
  initial?: PartyOrganizationLinkDto
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<PartyOrganizationRole>(initial?.role ?? 'GOVERNING_ORGAN')
  const [targetKind, setTargetKind] = useState<'organization' | 'militaryUnit'>(
    initial?.militaryUnitId ? 'militaryUnit' : 'organization',
  )
  const [query, setQuery] = useState('')
  const [choice, setChoice] = useState<TargetChoice | null>(null)
  const [newLocalName, setNewLocalName] = useState('')
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const debounced = useDebouncedValue(query, 200)

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ['political-parties', partyId, 'organization-candidates', targetKind, debounced.trim()],
    queryFn: () => politicalPartyApi.getOrganizationCandidates(partyId, { query: debounced, target: targetKind }),
    enabled: !initial,
    staleTime: 20_000,
  })

  const trimmed = query.trim()
  const exactExists = candidates.some((candidate) => candidate.name === trimmed)
  const roleHint = PARTY_ORGANIZATION_ROLE_OPTIONS.find((option) => option.value === role)?.hint ?? ''

  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem =
    !initial && !choice
      ? '필수: 잇을 조직·부대'
      : startError
        ? `시작: ${startError}`
        : endError
          ? `끝: ${endError}`
          : inverted
            ? '끝이 시작보다 앞설 수 없습니다.'
            : null

  const saveMut = useMutation({
    mutationFn: async () => {
      const period = { start: structuredInputOf(start), end: structuredInputOf(end), note: note.trim() || null }
      if (initial) return politicalPartyApi.updateOrganizationLink(partyId, initial.id, { role, ...period })
      const body: CreatePartyOrganizationInput = { role, ...period }
      if (choice?.kind === 'organization') body.organizationId = choice.id
      else if (choice?.kind === 'militaryUnit') body.militaryUnitId = choice.id
      else if (choice?.kind === 'new') body.newOrganization = { name: choice.name, localName: newLocalName.trim() || null }
      return politicalPartyApi.createOrganizationLink(partyId, body)
    },
    onSuccess: () => {
      notify.success(initial ? '연결을 고쳤습니다.' : choice?.kind === 'new' ? `「${choice.name}」 조직을 만들어 이었습니다.` : '조직을 이었습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const candidateMeta = (candidate: PartyOrganizationCandidate) =>
    candidate.kind === 'organization'
      ? [ORGANIZATION_TYPE_LABEL[candidate.type as OrganizationType] ?? candidate.type, candidate.localName].filter(Boolean).join(' · ')
      : [candidate.nameEn, candidate.establishedDate?.slice(0, 4)].filter(Boolean).join(' · ')

  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      trapFocus={false}
      title={initial ? '산하·연계 조직 고치기' : '산하·연계 조직 잇기'}
      maxWidth="min(780px, 96vw)"
    >
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-org-what-title">
          <FormS.FormGroupTitle id="party-org-what-title">무엇을·어떤 자리로</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-org-role">역할</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="party-org-role" value={role} onChange={(event) => setRole(event.target.value as PartyOrganizationRole)}>
                {PARTY_ORGANIZATION_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelectNative>
              {roleHint ? <EventFormS.Hint>{roleHint}</EventFormS.Hint> : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">
              대상 {!initial ? <EventFormS.Required>*</EventFormS.Required> : null}
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              {initial ? (
                <strong>
                  {targetName(initial)} <FactBadge>{initial.organization ? '조직' : '군부대'}</FactBadge>
                </strong>
              ) : (
                <>
                  <KindToggle role="radiogroup" aria-label="대상 종류">
                    {(['organization', 'militaryUnit'] as const).map((kind) => (
                      <KindBtn
                        key={kind}
                        type="button"
                        role="radio"
                        aria-checked={targetKind === kind}
                        $active={targetKind === kind}
                        onClick={() => {
                          setTargetKind(kind)
                          setChoice(null)
                        }}
                      >
                        {kind === 'organization' ? '조직' : '군부대'}
                      </KindBtn>
                    ))}
                  </KindToggle>
                  {choice ? (
                    <ChosenRow>
                      <strong>{choice.name}</strong>
                      <FactBadge>{choice.kind === 'new' ? '새로 만들 조직' : choice.kind === 'organization' ? '조직' : '군부대'}</FactBadge>
                      <PartyDescOutlineBtn type="button" onClick={() => setChoice(null)}>
                        다시 고르기
                      </PartyDescOutlineBtn>
                    </ChosenRow>
                  ) : (
                    <>
                      <EventFormS.Input
                        aria-label="조직·부대 찾기"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={targetKind === 'organization' ? '이름·약칭·현지어 — 예: 발릴라' : '부대 이름 — 예: 검은 셔츠단'}
                        autoComplete="off"
                      />
                      <CandidateList role="listbox" aria-label="후보">
                        {candidates.map((candidate) => (
                          <CandidateRow
                            key={candidate.id}
                            role="option"
                            aria-selected={false}
                            onClick={() => setChoice({ kind: candidate.kind, id: candidate.id, name: candidate.name })}
                          >
                            <span className="name">{candidate.name}</span>
                            <span className="meta">{candidateMeta(candidate)}</span>
                          </CandidateRow>
                        ))}
                        {targetKind === 'organization' && trimmed && !exactExists ? (
                          <CandidateRow role="option" aria-selected={false} onClick={() => setChoice({ kind: 'new', name: trimmed })}>
                            <span className="create">
                              <FiPlus size={13} aria-hidden /> 「{trimmed}」을 새 조직으로 만들어 잇기
                            </span>
                          </CandidateRow>
                        ) : null}
                        {candidates.length === 0 && !trimmed && !isFetching ? (
                          <EmptyCandidates>
                            {targetKind === 'organization' ? '등록된 조직이 없습니다 — 이름을 쳐서 새로 만드세요.' : '등록된 군부대가 없습니다.'}
                          </EmptyCandidates>
                        ) : null}
                      </CandidateList>
                    </>
                  )}
                  {choice?.kind === 'new' ? (
                    <>
                      <EventFormS.Input
                        aria-label="새 조직 현지어 이름"
                        value={newLocalName}
                        onChange={(event) => setNewLocalName(event.target.value)}
                        placeholder="현지어 이름(선택) — 예: Opera Nazionale Balilla"
                        autoComplete="off"
                        style={{ marginTop: 8 }}
                      />
                      <EventFormS.Hint>유형은 역할에서, 국가는 이 정당에서 정합니다. 자세한 정보는 조직 지면에서 채웁니다.</EventFormS.Hint>
                    </>
                  ) : null}
                </>
              )}
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
        <FormS.FormGroupSection aria-labelledby="party-org-when-title">
          <FormS.FormGroupTitle id="party-org-when-title">언제</FormS.FormGroupTitle>
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
            <EventFormS.FormLabel htmlFor="party-org-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-org-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 1928년 국가 기관(헌법 기구)이 되었다"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saveMut.isPending} onClose={onClose} onSubmit={() => !problem && saveMut.mutate()} />
    </RegisterModal>
  )
}

const TargetLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const KindToggle = styled.div`
  display: inline-flex;
  gap: 4px;
  margin-bottom: 8px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
`

const KindBtn = styled.button<{ $active: boolean }>`
  padding: 5px 14px;
  border: none;
  border-radius: 7px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  background: ${({ theme, $active }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)') : 'transparent'};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`

const ChosenRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CandidateList = styled.div`
  margin-top: 6px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
`

const CandidateRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 7px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)')};
  }
  .name {
    font-size: 13.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .create {
    grid-column: 1 / -1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
  }
`

const EmptyCandidates = styled.div`
  padding: 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
