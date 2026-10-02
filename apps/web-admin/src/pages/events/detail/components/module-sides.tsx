import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { toParticipants, participantKey } from '@/entities/event/model'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { RADIUS } from '@/pages/events/ledger/styles/ledger-tokens'
import { type EventSide, syncEventSides, toSideInputs } from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys } from '../use-event-detail'
import { InlineSelect, InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'

interface ModuleSidesProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

/** 새 진영 색 — 첫 두 진영은 대립(파랑·빨강), 그다음은 구별되는 색 */
const SIDE_PALETTE = ['#1d4ed8', '#b91c1c', '#047857', '#7c3aed', '#b45309']

const PARTICIPATION_LABEL: Record<string, string> = {
  FULL: '전면',
  LIMITED: '제한',
  INDIRECT: '간접',
  NON_COMBATANT: '비전투',
}

function formatPoint(point: { era: 'BC' | 'AD'; year: number; month: number | null } | null): string | null {
  if (!point) return null
  const year = point.era === 'BC' ? `기원전 ${point.year}` : String(point.year)
  return point.month ? `${year}.${point.month}` : year
}

/**
 * 진영(D1) — '누가 어느 편이었나'.
 *
 * 진영 자체(이름·설명·순서)는 진영 API로 저장하고, 나라·인물이 어느 편인지는 **참여국 줄·참여 인물
 * 줄의 sideId**로 저장한다(사건 수정 patch → 되돌리기 가능). 같은 나라를 진영과 참여국에 두 번
 * 적지 않는다 — 여기서 고르는 나라는 이미 이 사건의 참여국이다.
 */
export function ModuleSides({ event, onPatch }: ModuleSidesProps) {
  const queryClient = useQueryClient()
  const sides = useMemo(() => event.sides ?? [], [event.sides])
  const [busy, setBusy] = useState(false)

  const participants = useMemo(
    () => toParticipants(event.relatedCountries, event.relatedHistoricalCountries),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  /** 참여국 key → 표시 정보(이름·현재 진영) */
  const participantInfo = useMemo(() => {
    const byKey = new Map<string, { name: string; sideId: string | null }>()
    for (const country of event.relatedCountries ?? []) {
      byKey.set(participantKey({ countryId: country.id }), { name: country.name, sideId: country.sideId ?? null })
    }
    for (const country of event.relatedHistoricalCountries ?? []) {
      byKey.set(participantKey({ historicalCountryId: country.id }), {
        name: country.name,
        sideId: country.sideId ?? null,
      })
    }
    return byKey
  }, [event.relatedCountries, event.relatedHistoricalCountries])

  const persons = useMemo(() => event.relatedPersons ?? [], [event.relatedPersons])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.observations(event.id) }),
    ])
  }

  const saveSides = async (next: ReturnType<typeof toSideInputs>, successMessage?: string) => {
    setBusy(true)
    try {
      await syncEventSides(event.id, next)
      await refresh()
      if (successMessage) notify.success(successMessage)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '진영을 저장하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  const addSide = () => {
    const name = `진영 ${sides.length + 1}`
    void saveSides([
      ...toSideInputs(sides),
      { name, level: 'COALITION', color: SIDE_PALETTE[sides.length % SIDE_PALETTE.length] },
    ])
  }

  const renameSide = (side: EventSide, name: string) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === side.name) return
    void saveSides(toSideInputs(sides).map((input) => (input.id === side.id ? { ...input, name: trimmed } : input)))
  }

  const describeSide = (side: EventSide, description: string) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id ? { ...input, description: description.trim() || null } : input,
      ),
    )
  }

  const removeSide = async (side: EventSide) => {
    const memberCount = side.participants.length + side.persons.length
    const ok = await confirm({
      title: `'${side.name}' 진영을 지울까요?`,
      message:
        `소속 ${memberCount}곳은 진영만 풀리고 사건에는 그대로 남습니다. ` +
        '이 진영에 기록된 병력·사상자 수치는 함께 지워집니다.',
      confirmLabel: '진영 지우기',
      danger: true,
    })
    if (!ok) return
    void saveSides(
      toSideInputs(sides).filter((input) => input.id !== side.id),
      `'${side.name}' 진영을 지웠습니다`,
    )
  }

  /** 참여국을 진영에 넣거나(sideId) 뺀다(null) — 다른 진영에 있었다면 옮겨진다 */
  const assignCountry = (key: string, sideId: string | null) => {
    onPatch({
      relatedCountries: participants.map((participant) =>
        participantKey(participant) === key ? { ...participant, sideId } : participant,
      ),
    } as UpdateEventDto)
  }

  const assignPerson = (personId: string, sideId: string | null) => {
    onPatch({
      relatedPersons: persons.map((person) => ({
        personId: person.personId,
        role: person.role ?? undefined,
        note: person.note ?? undefined,
        ...(person.personId === personId ? { sideId } : {}),
      })),
    } as UpdateEventDto)
  }

  const unassignedCountries = participants.filter(
    (participant) => !participantInfo.get(participantKey(participant))?.sideId,
  )

  return (
    <S.Section id="module-sides" aria-busy={busy}>
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.sides} />
          진영
        </S.SectionTitle>
        {sides.length > 0 && <S.SectionSubtitle>{sides.length}개 진영</S.SectionSubtitle>}
      </S.SectionHeader>

      <SideGrid>
        {sides.map((side) => {
          const countryOptions = participants
            .filter((participant) => participantInfo.get(participantKey(participant))?.sideId !== side.id)
            .map((participant) => {
              const info = participantInfo.get(participantKey(participant))
              const elsewhere = info?.sideId ? sides.find((other) => other.id === info.sideId)?.name : null
              return {
                value: participantKey(participant),
                label: elsewhere ? `${info?.name ?? ''} (${elsewhere}에서 옮김)` : (info?.name ?? ''),
              }
            })
          const personOptions = persons
            .filter((person) => person.sideId !== side.id)
            .map((person) => ({
              value: person.personId,
              label: person.person ? getPersonDisplayName({ ...person.person, name: person.person.name ?? '' }, true) : person.personId,
            }))
          return (
            <SideCard key={side.id} $color={side.color ?? '#64748b'}>
              <SideHead>
                <SideName>
                  <InlineText value={side.name} onSave={(next) => renameSide(side, next)} as="span" />
                </SideName>
                <RemoveButton type="button" onClick={() => void removeSide(side)} aria-label={`${side.name} 진영 지우기`}>
                  <FiX />
                </RemoveButton>
              </SideHead>

              <MemberList aria-label={`${side.name} 소속 국가`}>
                {side.participants.map((member) => {
                  const key = member.historicalCountryId
                    ? participantKey({ historicalCountryId: member.historicalCountryId })
                    : participantKey({ countryId: member.countryId })
                  const join = formatPoint(member.join)
                  const withdraw = formatPoint(member.withdraw)
                  return (
                    <Member key={member.participantId}>
                      <MemberName>{member.name}</MemberName>
                      {member.participation && member.participation !== 'FULL' && (
                        <MemberTag>{PARTICIPATION_LABEL[member.participation] ?? member.participation}</MemberTag>
                      )}
                      {(join || withdraw) && (
                        <MemberMeta title={[member.joinReason, member.withdrawReason].filter(Boolean).join(' / ')}>
                          {join ? `${join} 가담` : ''}
                          {join && withdraw ? ' · ' : ''}
                          {withdraw ? `${withdraw} 이탈` : ''}
                        </MemberMeta>
                      )}
                      <MemberRemove
                        type="button"
                        onClick={() => assignCountry(key, null)}
                        aria-label={`${member.name}을(를) 진영에서 빼기`}
                      >
                        <FiX />
                      </MemberRemove>
                    </Member>
                  )
                })}
                {side.persons.map((member) => (
                  <Member key={member.personEventId} $person>
                    <MemberName>{[member.name, member.surname].filter(Boolean).join(' ')}</MemberName>
                    <MemberRemove
                      type="button"
                      onClick={() => assignPerson(member.personId, null)}
                      aria-label={`${member.name}을(를) 진영에서 빼기`}
                    >
                      <FiX />
                    </MemberRemove>
                  </Member>
                ))}
                {side.participants.length + side.persons.length === 0 && (
                  <EmptyLine>아직 소속이 없습니다 — 이 사건의 참여국·인물에서 고르세요</EmptyLine>
                )}
              </MemberList>

              <Pickers>
                {countryOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={countryOptions}
                    onSave={(key) => assignCountry(key, side.id)}
                    placeholder="국가 넣기"
                    label={`${side.name}에 넣을 참여국`}
                  />
                )}
                {personOptions.length > 0 && (
                  <InlineSelect
                    value=""
                    options={personOptions}
                    onSave={(personId) => assignPerson(personId, side.id)}
                    placeholder="인물 넣기"
                    label={`${side.name}에 넣을 인물`}
                  />
                )}
              </Pickers>

              <SideDescription>
                <InlineText
                  value={side.description ?? ''}
                  onSave={(next) => describeSide(side, next)}
                  placeholder="진영 설명"
                  multiline
                  multilineEnter
                />
              </SideDescription>
            </SideCard>
          )
        })}
      </SideGrid>

      {sides.length > 0 && unassignedCountries.length > 0 && (
        <Unassigned>
          진영 미지정 참여국:{' '}
          {unassignedCountries
            .map((participant) => participantInfo.get(participantKey(participant))?.name)
            .filter(Boolean)
            .join(' · ')}
        </Unassigned>
      )}

      <AddSideButton type="button" onClick={addSide} disabled={busy}>
        <FiPlus /> 진영 추가
      </AddSideButton>
    </S.Section>
  )
}

const SideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 16px;
`

const SideCard = styled.section<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)')};
  border-top: 3px solid ${({ $color }) => $color};
  min-width: 0;
`

const SideHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const SideName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
`

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

const MemberList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Member = styled.li<{ $person?: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-size: ${({ $person }) => ($person ? '12.5px' : '13.5px')};
  color: ${({ theme, $person }) => ($person ? theme.colors.text.secondary : theme.colors.text.primary)};
`

const MemberName = styled.span`
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
`

const MemberTag = styled.span`
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)')};
`

const MemberMeta = styled.span`
  flex-shrink: 0;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MemberRemove = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;

  li:hover > &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const EmptyLine = styled.li`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Pickers = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12.5px;
`

const SideDescription = styled.div`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-line;
`

const Unassigned = styled.p`
  margin: 12px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AddSideButton = styled.button`
  align-self: flex-start;
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)')};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`
