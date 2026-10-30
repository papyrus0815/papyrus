import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { toParticipants, participantKey } from '@/entities/event/model'
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import { type EventSide, type SideOutcome, syncEventSides, toSideInputs } from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { PersonPickerModal } from '@/shared/ui/person-picker'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys } from '../use-event-detail'
import { InlineSelect, InlineText } from './inline'
import { MODULE_COLOR } from './module-colors'
import { SIDE_PALETTE, withSideColors } from './side-colors'
import { SIDE_OUTCOME_OPTIONS } from './side-outcome'

interface ModuleSidesProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}

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
  /* 표시용 색 — 저장된 색이 없으면 순서대로 팔레트(저장값 불변) */
  const coloredSides = useMemo(() => withSideColors(sides), [sides])
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

  /**
   * 인물 넣기 — 예전엔 **이 사건의 참여 인물** 중에서만 고를 수 있어, 사건에 없는 지휘관은 넣을 길이 없었다
   * (진영 설명 10개가 전부 '지휘관(인물 연결 대기): …'를 글로 적고 있었고, 진영 소속 인물은 0명).
   * 전체 인물에서 찾되 이 사건의 참여 인물을 맨 위에 고정하고, 사건에 없던 인물은 참여 인물로 함께 넣는다.
   */
  const [personPickerSide, setPersonPickerSide] = useState<EventSide | null>(null)

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

  /** 결과·결과 단서 — 결과를 비우면 단서도 함께 비운다(무엇에 대한 단서인지 잃는다) */
  const setOutcome = (side: EventSide, patch: { outcome?: SideOutcome | null; outcomeNote?: string | null }) => {
    void saveSides(
      toSideInputs(sides).map((input) =>
        input.id === side.id
          ? { ...input, ...patch, ...(patch.outcome === null ? { outcomeNote: null } : {}) }
          : input,
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
    const known = persons.some((person) => person.personId === personId)
    onPatch({
      relatedPersons: [
        ...persons.map((person) => ({
          personId: person.personId,
          role: person.role ?? undefined,
          note: person.note ?? undefined,
          ...(person.personId === personId ? { sideId } : {}),
        })),
        /* 사건에 없던 인물 — 참여 인물로 들이면서 바로 이 진영에 */
        ...(known || !sideId ? [] : [{ personId, sideId }]),
      ],
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
        {/* 제목이 이미 '진영' — '2개 진영'은 같은 말을 두 번 한다 */}
        {sides.length > 0 && <S.SectionSubtitle>{sides.length}</S.SectionSubtitle>}
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
          return (
            <SideCard key={side.id}>
              <SideHead $color={coloredSides.find((colored) => colored.id === side.id)?.color ?? SIDE_PALETTE[0]}>
                <SideName>
                  <InlineText value={side.name} onSave={(next) => renameSide(side, next)} as="span" />
                </SideName>
                <RemoveButton type="button" onClick={() => void removeSide(side)} aria-label={`${side.name} 진영 지우기`}>
                  <FiX />
                </RemoveButton>
              </SideHead>

              <OutcomeRow aria-label={`${side.name}의 결과`}>
                <OutcomeLabel>결과</OutcomeLabel>
                <InlineSelect
                  value={side.outcome ?? ''}
                  options={SIDE_OUTCOME_OPTIONS}
                  onSave={(next) => setOutcome(side, { outcome: (next || null) as SideOutcome | null })}
                  placeholder="미정"
                  label={`${side.name} 결과`}
                />
                {side.outcome && (
                  <OutcomeNote>
                    <InlineText
                      value={side.outcomeNote ?? ''}
                      onSave={(next) => setOutcome(side, { outcomeNote: next.trim() || null })}
                      placeholder="단서 — 예: 전략적 승리, 전술적 패배"
                      as="span"
                    />
                  </OutcomeNote>
                )}
              </OutcomeRow>

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
                <PersonPickButton type="button" onClick={() => setPersonPickerSide(side)}>
                  인물 넣기
                </PersonPickButton>
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
        /* 진영 밖 참여국 — 예전엔 읽기만 하는 글줄이라, 넣으려면 진영 카드마다 '국가 넣기'를 열어 찾아야 했다.
           이름을 누르면 그 자리에서 진영을 고른다 */
        <Unassigned aria-label="진영 미지정 참여국">
          <UnassignedLabel>진영 미지정</UnassignedLabel>
          {unassignedCountries.map((participant) => {
            const key = participantKey(participant)
            const name = participantInfo.get(key)?.name ?? ''
            return (
              <UnassignedChip key={key}>
                <InlineSelect
                  value=""
                  options={sides.map((side) => ({ value: side.id, label: `${side.name}에 넣기` }))}
                  onSave={(sideId) => assignCountry(key, sideId)}
                  placeholder={name}
                  label={`${name}의 진영`}
                  clearable={false}
                />
              </UnassignedChip>
            )
          })}
        </Unassigned>
      )}

      <AddSideButton type="button" onClick={addSide} disabled={busy}>
        <FiPlus /> 진영 추가
      </AddSideButton>

      {personPickerSide && (
        /* 인물 목록은 고르기 모달이 스스로 받는다(앱 전역 캐시 공유) */
        <PersonPickerModal
          onSelect={(personId) => assignPerson(personId, personPickerSide.id)}
          onClose={() => setPersonPickerSide(null)}
          excludeIds={personPickerSide.persons.map((member) => member.personId)}
          excludeReason="이미 이 진영"
          pinnedIds={persons.map((person) => person.personId)}
          title={`${personPickerSide.name}에 넣을 인물`}
        />
      )}
    </S.Section>
  )
}

const SideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 16px;
`

/**
 * 진영 카드 — 선 없이 면으로(참여 탭과 같은 문법). 진영 색은 위 테두리가 아니라 머리 띠의 옅은 바탕으로.
 */
const SideCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px 14px;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.03)')};
  overflow: hidden;
  min-width: 0;
`

const SideHead = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 -16px;
  padding: 10px 12px 10px 16px;
  background: ${({ $color, theme }) => `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 18 : 10}%, transparent)`};
  &::before {
    content: '';
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${({ $color }) => $color};
  }
  > :first-child {
    flex: 1;
  }
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

/** 결과 줄 — 머리 띠 바로 아래. 진영의 '끝'을 이름 다음으로 읽게 */
const OutcomeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  font-size: 13px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
`

const OutcomeLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OutcomeNote = styled.span`
  flex: 1 1 140px;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
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
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
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

const Unassigned = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 12px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const UnassignedLabel = styled.span`
  font-weight: 600;
  margin-right: 2px;
`

/** 진영을 고를 수 있는 이름 칩 — 무채 면(아직 어느 진영 색도 아니다) */
const UnassignedChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  color: ${({ theme }) => theme.colors.text.primary};

  /* 인라인 피커의 빈 값 자리표시(기울임·흐림)를 칩 안에선 평범한 이름처럼 */
  [data-empty='true'] {
    font-style: normal;
    color: inherit;
  }
`

const AddSideButton = styled.button`
  align-self: flex-start;
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
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

/** '인물 넣기' — 옆의 '국가 넣기'(인라인 피커 자리표시)와 같은 목소리의 글자 버튼 */
const PersonPickButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 2px;
  }
`
