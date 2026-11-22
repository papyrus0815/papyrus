/**
 * 정당 상세 — 「이념·스펙트럼」: 이념 카탈로그 연결(대표·순서·내건 시기·메모)과 스펙트럼 기간(좌경화·우경화).
 * 설계: docs/political-party-model-review.md §4.3 (B2)
 */
import React, { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiStar, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import { labelIdeologyCategory } from '@/shared/api/ideology'
import {
  POLITICAL_POSITION_COLOR,
  POLITICAL_POSITION_LABEL,
  type PartyIdeologyLinkDto,
  type PartyIdeologyLinkInput,
  type PartyPositionPeriodDto,
  type PartyPositionPeriodInput,
  type PoliticalPosition,
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
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import { IdeologyFormModal } from '@/widgets/ideology/ideology-form-modal'
import { type IdeologyChip, IdeologyPicker } from '@/widgets/ideology/ideology-picker'

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
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
import { POSITION_TONE_OPTIONS, ToneChipGroup } from './politics-form/politics-form-parts'
import { PartyCitationButton } from './party-citations'

const ideologiesKey = (partyId: string) => ['political-parties', partyId, 'ideologies'] as const
const positionPeriodsKey = (partyId: string) => ['political-parties', partyId, 'position-periods'] as const

export function PartyIdeologyBlock({ partyId }: { partyId: string }) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [linkModal, setLinkModal] = useState<PartyIdeologyLinkDto | null>(null)
  const [catalogEditId, setCatalogEditId] = useState<string | null>(null)
  const [periodModal, setPeriodModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: PartyPositionPeriodDto } | null>(
    null,
  )

  const { data: links = [], isLoading } = useQuery({
    queryKey: ideologiesKey(partyId),
    queryFn: () => politicalPartyApi.getIdeologies(partyId),
  })
  const { data: periods = [] } = useQuery({
    queryKey: positionPeriodsKey(partyId),
    queryFn: () => politicalPartyApi.getPositionPeriods(partyId),
  })

  /** 이념 연결이 바뀌면 정당 목록·상세의 표시 캐시도 바뀐다 */
  const invalidateParty = () => {
    void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
  }

  const setMut = useMutation({
    mutationFn: (ideologyIds: string[]) => politicalPartyApi.setIdeologies(partyId, ideologyIds),
    onSuccess: () => {
      invalidateParty()
      setPickerOpen(false)
      notify.success('이념을 고쳤습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const linkMut = useMutation({
    mutationFn: (payload: { linkId: string; body: PartyIdeologyLinkInput }) =>
      politicalPartyApi.updateIdeologyLink(partyId, payload.linkId, payload.body),
    onSuccess: () => {
      invalidateParty()
      setLinkModal(null)
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const unlinkMut = useMutation({
    mutationFn: (linkId: string) => politicalPartyApi.deleteIdeologyLink(partyId, linkId),
    onSuccess: () => invalidateParty(),
    onError: (err: Error) => notify.error(err.message),
  })
  const periodSaveMut = useMutation({
    mutationFn: (payload: { periodId?: string; body: PartyPositionPeriodInput }) =>
      payload.periodId
        ? politicalPartyApi.updatePositionPeriod(partyId, payload.periodId, payload.body)
        : politicalPartyApi.createPositionPeriod(partyId, payload.body),
    onSuccess: (_row, variables) => {
      invalidateParty()
      setPeriodModal(null)
      notify.success(variables.body.isCurrent ? '스펙트럼 기간을 저장했습니다 — 대표 스펙트럼도 맞췄습니다.' : '스펙트럼 기간을 저장했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const periodDeleteMut = useMutation({
    mutationFn: (periodId: string) => politicalPartyApi.deletePositionPeriod(partyId, periodId),
    onSuccess: () => invalidateParty(),
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <PartyDetailDescSection aria-label="이념·스펙트럼">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>이념·스펙트럼</PartyDescSectionLabel>
        <HeaderActions>
          <PartyDescOutlineBtn type="button" onClick={() => setPickerOpen(true)}>
            <FiEdit2 size={14} />
            이념 고르기
          </PartyDescOutlineBtn>
          <PartyDescOutlineBtn type="button" onClick={() => setPeriodModal({ mode: 'create' })}>
            <FiPlus size={14} />
            스펙트럼 기간
          </PartyDescOutlineBtn>
        </HeaderActions>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : (
        <FactList>
          <FactGroup>
            <FactGroupLabel>{links.length > 0 ? `이념·노선 · ${links.length}개` : '이념·노선'}</FactGroupLabel>
            {links.length === 0 ? (
              <PartyDescEmptyHint>
                이념 목록에서 고릅니다. 같은 이념을 쓰는 다른 정당과 이어지고, 내건 시기·메모를 따로 남길 수 있습니다.
              </PartyDescEmptyHint>
            ) : (
              links.map((link) => {
                const period = formatPeriodLabel(link)
                return (
                  <FactRow key={link.id}>
                    <FactMain>
                      <span className="title">
                        {link.isPrimary ? <FiStar size={12} aria-label="대표" className="primary" /> : null}
                        <CatalogNameBtn type="button" title="이념 목록에서 고치기" onClick={() => setCatalogEditId(link.ideology.id)}>
                          {link.ideology.name}
                        </CatalogNameBtn>
                      </span>
                      {link.ideology.category !== 'IDEOLOGY' ? (
                        <FactBadge>{labelIdeologyCategory(link.ideology.category)}</FactBadge>
                      ) : null}
                      {link.ideology.parent ? <span className="period">⊂ {link.ideology.parent.name}</span> : null}
                      {link.ideology.englishName ? <span className="period">{link.ideology.englishName}</span> : null}
                      {period ? <span className="period strong">{period}</span> : null}
                    </FactMain>
                    {link.note ? <FactNote>{link.note}</FactNote> : null}
                    <FactActions>
                      <PartyCitationButton partyId={partyId} targetType="PARTY_IDEOLOGY" targetId={link.id} subject={`이념 · ${link.ideology.name}`} />
                      <IconBtn type="button" aria-label={`${link.ideology.name} 시기·메모`} onClick={() => setLinkModal(link)}>
                        <FiEdit2 size={13} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        aria-label={`${link.ideology.name} 빼기`}
                        disabled={unlinkMut.isPending}
                        onClick={async () => {
                          const approved = await confirm({
                            title: '이념 빼기',
                            message: `「${link.ideology.name}」을 이 정당에서 뺄까요? 이념 목록에는 남습니다.`,
                            confirmLabel: '빼기',
                            danger: true,
                          })
                          if (approved) unlinkMut.mutate(link.id)
                        }}
                      >
                        <FiTrash2 size={13} />
                      </IconBtn>
                    </FactActions>
                  </FactRow>
                )
              })
            )}
          </FactGroup>
          <FactGroup>
            <FactGroupLabel>스펙트럼 기간</FactGroupLabel>
            {periods.length === 0 ? (
              <PartyDescEmptyHint>
                시기마다 스펙트럼이 달랐다면(좌경화·우경화) 기간으로 남깁니다. 지속 중인 기간을 저장하면 대표 스펙트럼도 맞춰집니다.
              </PartyDescEmptyHint>
            ) : (
              periods.map((row) => {
                const period = formatPeriodLabel(row)
                return (
                  <FactRow key={row.id}>
                    <FactMain>
                      <PositionBadge $color={POLITICAL_POSITION_COLOR[row.position]}>
                        {POLITICAL_POSITION_LABEL[row.position]}
                      </PositionBadge>
                      <span className="period strong">{period || '기간 미상'}</span>
                    </FactMain>
                    {row.note ? <FactNote>{row.note}</FactNote> : null}
                    <FactActions>
                      <PartyCitationButton partyId={partyId} targetType="PARTY_POSITION_PERIOD" targetId={row.id} subject={`스펙트럼 · ${POLITICAL_POSITION_LABEL[row.position]}${period ? ` · ${period}` : ''}`} />
                      <IconBtn type="button" aria-label="스펙트럼 기간 고치기" onClick={() => setPeriodModal({ mode: 'edit', row })}>
                        <FiEdit2 size={13} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        aria-label="스펙트럼 기간 지우기"
                        disabled={periodDeleteMut.isPending}
                        onClick={async () => {
                          const approved = await confirm({
                            title: '스펙트럼 기간 지우기',
                            message: `「${POLITICAL_POSITION_LABEL[row.position]}${period ? ` · ${period}` : ''}」을 지울까요? 대표 스펙트럼은 그대로입니다.`,
                            confirmLabel: '지우기',
                            danger: true,
                          })
                          if (approved) periodDeleteMut.mutate(row.id)
                        }}
                      >
                        <FiTrash2 size={13} />
                      </IconBtn>
                    </FactActions>
                  </FactRow>
                )
              })
            )}
          </FactGroup>
        </FactList>
      )}

      {pickerOpen ? (
        <PartyIdeologyPickModal
          initial={links.map((link) => ({ id: link.ideology.id, name: link.ideology.name, category: link.ideology.category }))}
          saving={setMut.isPending}
          onClose={() => setPickerOpen(false)}
          onSubmit={(chips) => setMut.mutate(chips.map((chip) => chip.id))}
        />
      ) : null}
      {linkModal ? (
        <PartyIdeologyLinkModal
          key={linkModal.id}
          link={linkModal}
          saving={linkMut.isPending}
          onClose={() => setLinkModal(null)}
          onSubmit={(body) => linkMut.mutate({ linkId: linkModal.id, body })}
        />
      ) : null}
      {catalogEditId ? <IdeologyFormModal ideologyId={catalogEditId} onClose={() => setCatalogEditId(null)} /> : null}
      {periodModal ? (
        <PartyPositionPeriodModal
          key={periodModal.mode === 'edit' ? periodModal.row.id : 'new'}
          initial={periodModal.mode === 'edit' ? periodModal.row : undefined}
          saving={periodSaveMut.isPending}
          onClose={() => setPeriodModal(null)}
          onSubmit={(body) =>
            periodSaveMut.mutate({ periodId: periodModal.mode === 'edit' ? periodModal.row.id : undefined, body })
          }
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

function PartyIdeologyPickModal({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial: IdeologyChip[]
  saving: boolean
  onClose: () => void
  onSubmit: (chips: IdeologyChip[]) => void
}) {
  const [chips, setChips] = useState<IdeologyChip[]>(initial)
  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title="이념 고르기" maxWidth="min(680px, 96vw)" minHeight="420px">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-ideology-pick-title">
          <FormS.FormGroupTitle id="party-ideology-pick-title">이념·노선</FormS.FormGroupTitle>
          <IdeologyPicker inputId="party-ideology-pick" value={chips} onChange={setChips} />
          <EventFormS.Hint style={{ marginTop: 8 }}>
            첫 칩이 대표입니다. 빠진 이념은 연결이 풀리고, 남는 이념의 내건 시기·메모는 그대로 둡니다.
          </EventFormS.Hint>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={null} saving={saving} onClose={onClose} onSubmit={() => onSubmit(chips)} />
    </RegisterModal>
  )
}

function PartyIdeologyLinkModal({
  link,
  saving,
  onClose,
  onSubmit,
}: {
  link: PartyIdeologyLinkDto
  saving: boolean
  onClose: () => void
  onSubmit: (body: PartyIdeologyLinkInput) => void
}) {
  const [isPrimary, setIsPrimary] = useState(link.isPrimary)
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    periodDateFormValue(link.startEra, link.startYear, link.startMonth, link.startDay),
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() => periodDateFormValue(link.endEra, link.endYear, link.endMonth, link.endDay))
  const [note, setNote] = useState(link.note ?? '')
  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem = startError ? `시작: ${startError}` : endError ? `끝: ${endError}` : inverted ? '끝이 시작보다 앞설 수 없습니다.' : null
  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={`「${link.ideology.name}」 시기·메모`} maxWidth="min(720px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-ideology-link-title">
          <FormS.FormGroupTitle id="party-ideology-link-title">이 정당에서</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">대표</EventFormS.FormLabel>
            <EventFormS.FormField>
              <CheckRow>
                <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
                대표 이념 (켜면 다른 이념의 대표 표시는 꺼집니다)
              </CheckRow>
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
            startLabel="내건 시작"
            endLabel="버린 때"
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-ideology-link-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-ideology-link-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 1919년 강령에서는 공화주의, 1922년 이후 군주제 용인"
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
          onSubmit({ isPrimary, start: structuredInputOf(start), end: structuredInputOf(end), note: note.trim() || null })
        }
      />
    </RegisterModal>
  )
}

export function PartyPositionPeriodModal({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: PartyPositionPeriodDto
  saving: boolean
  onClose: () => void
  onSubmit: (body: PartyPositionPeriodInput) => void
}) {
  const [position, setPosition] = useState<PoliticalPosition | ''>(initial?.position ?? '')
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? false)
  const [note, setNote] = useState(initial?.note ?? '')
  const startError = periodDateFormError(start)
  const endError = isCurrent ? null : periodDateFormError(end)
  const inverted = !isCurrent && isPeriodFormInverted(start, end)
  const problem = !position
    ? '필수: 스펙트럼'
    : startError
      ? `시작: ${startError}`
      : endError
        ? `끝: ${endError}`
        : inverted
          ? '끝이 시작보다 앞설 수 없습니다.'
          : null
  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      trapFocus={false}
      title={initial ? '스펙트럼 기간 고치기' : '스펙트럼 기간 추가'}
      maxWidth="min(760px, 96vw)"
    >
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-position-period-title">
          <FormS.FormGroupTitle id="party-position-period-title">스펙트럼·기간</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div" id="party-position-period-label">
              스펙트럼 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <ToneChipGroup
                ariaLabelledBy="party-position-period-label"
                value={position}
                onChange={(next) => setPosition(next ?? '')}
                options={POSITION_TONE_OPTIONS}
              />
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
                지금도 이 스펙트럼 — 저장하면 정당의 대표 스펙트럼도 이 값으로 맞춥니다
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-position-period-note">
              근거·맥락<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-position-period-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 1990년대 제3의 길 노선으로 중도좌파"
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
          position &&
          onSubmit({
            position,
            start: structuredInputOf(start),
            end: isCurrent ? null : structuredInputOf(end),
            isCurrent,
            note: note.trim() || null,
          })
        }
      />
    </RegisterModal>
  )
}

const HeaderActions = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
`

const CatalogNameBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const PositionBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: ${({ $color }) => $color};
  }
`
