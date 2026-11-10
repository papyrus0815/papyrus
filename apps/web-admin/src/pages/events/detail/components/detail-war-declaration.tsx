/**
 * 선전포고 당사국 구도 — "어느 나라가 어느 나라에 전쟁을 선포했는가".
 *
 * 선전포고(WAR_DECLARATION) 사건의 참여국 역할 '선포국(INITIATOR)' ──▶ '대상국(TARGET)'을
 * 인포그래픽 보드와 당사국 원장으로 보여 준다. 별도 테이블을 두지 않고 정본 참여국 관계
 * (EventCountryRelation.role)를 그대로 읽고 고친다(DetailStatehood와 같은 설계).
 *
 * 상위 전쟁(parentEvent)이 연결되어 있으면 그 전쟁 상세·조망(선전포고·참전 흐름)으로 바로
 * 건너갈 수 있는 연결 고리를 함께 보여 준다.
 */
import { type DragEvent, useState } from 'react'

import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type UpdateEventDto } from '@/shared/api/events'
import { formatCountryYearShort } from '@/shared/lib/country-period'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

export type WarDeclarationRole = 'INITIATOR' | 'TARGET'

export interface WarDeclarationEntry {
  id: string
  name: string
  flagEmoji?: string | null
  role: WarDeclarationRole
  roleDescription: string | null
  note: string | null
  historical: boolean
}

interface DetailWarDeclarationProps {
  event: EventDetail
  /** 선전포고 세부 유형인가 — 역할이 아직 비어 있어도 안내와 배정 보드를 세운다 */
  expectWarDeclaration: boolean
  onCountryClick: (countryId: string) => void
  onPatch?: (patch: UpdateEventDto) => void
}

const ROLE_LABEL: Record<WarDeclarationRole, string> = {
  INITIATOR: '선포국',
  TARGET: '대상국',
}

export function warDeclarationEntries(event: EventDetail): WarDeclarationEntry[] {
  const pickRole = (role: unknown): WarDeclarationRole | null =>
    role === 'INITIATOR' || role === 'TARGET' ? role : null
  const entries: WarDeclarationEntry[] = []
  for (const country of event.relatedHistoricalCountries ?? []) {
    const role = pickRole(country.role)
    if (role) {
      entries.push({
        id: country.id,
        name: country.name,
        role,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        historical: true,
      })
    }
  }
  for (const country of event.relatedCountries ?? []) {
    const role = pickRole(country.role)
    if (role) {
      entries.push({
        id: country.id,
        name: country.name,
        flagEmoji: country.flagEmoji ?? null,
        role,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        historical: false,
      })
    }
  }
  return entries.sort((left, right) =>
    left.role === right.role ? 0 : left.role === 'INITIATOR' ? -1 : 1,
  )
}

function formatDeclarationDateLabel(
  startDate: string | null | undefined,
  precision: string | null | undefined,
): string {
  const parts = parseIsoDateParts(startDate ?? null)
  if (!parts) return '선전포고'
  const yearLabel = formatCountryYearShort(parts.year) ?? `${parts.year}년`
  if (precision === 'year') return yearLabel
  if (precision === 'month') return `${yearLabel} ${parts.month}월`
  return `${yearLabel} ${parts.month}월 ${parts.day}일`
}

export function DetailWarDeclaration({
  event,
  expectWarDeclaration,
  onCountryClick,
  onPatch,
}: DetailWarDeclarationProps) {
  const entries = warDeclarationEntries(event)
  const initiatorEntries = entries.filter((entry) => entry.role === 'INITIATOR')
  const targetEntries = entries.filter((entry) => entry.role === 'TARGET')
  const otherParticipants = [
    ...(event.relatedHistoricalCountries ?? [])
      .filter((country) => country.role !== 'INITIATOR' && country.role !== 'TARGET')
      .map((country) => ({ id: country.id, name: country.name, historical: true })),
    ...(event.relatedCountries ?? [])
      .filter((country) => country.role !== 'INITIATOR' && country.role !== 'TARGET')
      .map((country) => ({ id: country.id, name: country.name, historical: false })),
  ]

  const [dragCountry, setDragCountry] = useState<{ id: string; historical: boolean } | null>(null)
  const [dragOverRole, setDragOverRole] = useState<WarDeclarationRole | null>(null)
  const [showAllParticipants, setShowAllParticipants] = useState(false)

  const QUICK_ASSIGN_CAP = 4
  const visibleParticipants = showAllParticipants
    ? otherParticipants
    : otherParticipants.slice(0, QUICK_ASSIGN_CAP)
  const hiddenParticipantCount = otherParticipants.length - visibleParticipants.length

  const assignDeclarationRole = (
    target: { id: string; historical: boolean },
    nextRole: WarDeclarationRole | 'PARTICIPANT',
  ) => {
    if (!onPatch) return
    onPatch({
      relatedCountriesPatch: [
        {
          ...(target.historical
            ? { historicalCountryId: target.id }
            : { countryId: target.id }),
          role: nextRole,
        },
      ],
    })
  }

  const encodeDragPayload = (item: { id: string; historical: boolean }) =>
    `${item.historical ? 'h' : 'c'}:${item.id}`
  const decodeDragPayload = (raw: string): { id: string; historical: boolean } | null => {
    if (raw.startsWith('h:')) return { id: raw.slice(2), historical: true }
    if (raw.startsWith('c:')) return { id: raw.slice(2), historical: false }
    return null
  }

  const handleDropToRole = (dragEvent: DragEvent<HTMLElement>, targetRole: WarDeclarationRole) => {
    dragEvent.preventDefault()
    const payload = dragCountry ?? decodeDragPayload(dragEvent.dataTransfer.getData('text/plain'))
    setDragCountry(null)
    setDragOverRole(null)
    if (!payload) return
    assignDeclarationRole(payload, targetRole)
  }

  if (!expectWarDeclaration) return null

  const dateLabel = formatDeclarationDateLabel(event.startDate, event.startDatePrecision)
  const entriesWithContext = entries.filter(
    (entry) => Boolean(entry.roleDescription?.trim() || entry.note?.trim()),
  )

  return (
    <S.Section id="war-declaration">
      <S.SectionHeader>
        <S.SectionTitle>선전포고 당사국</S.SectionTitle>
        {entries.length > 0 && (
          <S.SectionSubtitle>
            선포 {initiatorEntries.length}곳 → 대상 {targetEntries.length}곳
          </S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {event.parentEvent && (
        <ParentWarBanner>
          <ParentWarLabel>상위 전쟁</ParentWarLabel>
          <ParentWarTitleLink to={pathKeys.events.detail(event.parentEvent.id)}>
            {event.parentEvent.title}
          </ParentWarTitleLink>
          <ParentWarOverviewLink
            to={`${pathKeys.events.detail(event.parentEvent.id)}?tab=survey&sv=participants`}
          >
            전쟁 참전 흐름 조망 →
          </ParentWarOverviewLink>
        </ParentWarBanner>
      )}

      <DeclarationBoard role="region" aria-label="선전포고 당사국 흐름 인포그래픽">
        <DeclarationGrid>
          <DeclarationLane
            $dragOver={dragOverRole === 'INITIATOR'}
            data-declaration-lane="INITIATOR"
            onDragOver={(dragEvent) => {
              if (!onPatch) return
              dragEvent.preventDefault()
              if (dragOverRole !== 'INITIATOR') setDragOverRole('INITIATOR')
            }}
            onDragLeave={(dragEvent) => {
              if (
                !dragEvent.currentTarget.contains(
                  dragEvent.relatedTarget as globalThis.Node | null,
                )
              ) {
                setDragOverRole((current) => (current === 'INITIATOR' ? null : current))
              }
            }}
            onDrop={(dragEvent) => handleDropToRole(dragEvent, 'INITIATOR')}
          >
            <DeclarationLaneHead $initiator>
              <span>선포국 · 개전 주도</span>
              <span>{initiatorEntries.length}곳</span>
            </DeclarationLaneHead>
            {initiatorEntries.length > 0 ? (
              <DeclarationPillList>
                {initiatorEntries.map((entry) => (
                  <DeclarationPill
                    key={entry.id}
                    $initiator
                    draggable={Boolean(onPatch)}
                    onDragStart={(dragEvent) => {
                      const item = { id: entry.id, historical: entry.historical }
                      setDragCountry(item)
                      dragEvent.dataTransfer.effectAllowed = 'move'
                      dragEvent.dataTransfer.setData('text/plain', encodeDragPayload(item))
                    }}
                    onDragEnd={() => {
                      setDragCountry(null)
                      setDragOverRole(null)
                    }}
                  >
                    <DeclarationPillName
                      type="button"
                      onClick={() => onCountryClick(entry.id)}
                    >
                      {entry.flagEmoji ? `${entry.flagEmoji} ` : ''}
                      {entry.name}
                    </DeclarationPillName>
                    {onPatch && (
                      <>
                        <DeclarationPillFlip
                          type="button"
                          onClick={() => assignDeclarationRole(entry, 'TARGET')}
                          title="대상국으로 역할 전환"
                          aria-label={`${entry.name} 대상국으로 역할 전환`}
                        >
                          ⇄
                        </DeclarationPillFlip>
                        <DeclarationPillClear
                          type="button"
                          onClick={() => assignDeclarationRole(entry, 'PARTICIPANT')}
                          title="선포국 역할 해제"
                          aria-label={`${entry.name} 선포국 역할 해제`}
                        >
                          ×
                        </DeclarationPillClear>
                      </>
                    )}
                  </DeclarationPill>
                ))}
              </DeclarationPillList>
            ) : (
              <DeclarationEmpty>
                {onPatch
                  ? '나라를 이리로 끌어 놓으면 선포국(주도국)으로 지정'
                  : '선포국 미지정'}
              </DeclarationEmpty>
            )}
          </DeclarationLane>

          <DeclarationArrow aria-hidden>──▶</DeclarationArrow>

          <DeclarationCenterNode>
            <DeclarationCenterKicker>{dateLabel}</DeclarationCenterKicker>
            <DeclarationCenterTitle>{event.title}</DeclarationCenterTitle>
          </DeclarationCenterNode>

          <DeclarationArrow aria-hidden>──▶</DeclarationArrow>

          <DeclarationLane
            $dragOver={dragOverRole === 'TARGET'}
            data-declaration-lane="TARGET"
            onDragOver={(dragEvent) => {
              if (!onPatch) return
              dragEvent.preventDefault()
              if (dragOverRole !== 'TARGET') setDragOverRole('TARGET')
            }}
            onDragLeave={(dragEvent) => {
              if (
                !dragEvent.currentTarget.contains(
                  dragEvent.relatedTarget as globalThis.Node | null,
                )
              ) {
                setDragOverRole((current) => (current === 'TARGET' ? null : current))
              }
            }}
            onDrop={(dragEvent) => handleDropToRole(dragEvent, 'TARGET')}
          >
            <DeclarationLaneHead $initiator={false}>
              <span>대상국 · 피선포</span>
              <span>{targetEntries.length}곳</span>
            </DeclarationLaneHead>
            {targetEntries.length > 0 ? (
              <DeclarationPillList>
                {targetEntries.map((entry) => (
                  <DeclarationPill
                    key={entry.id}
                    $initiator={false}
                    draggable={Boolean(onPatch)}
                    onDragStart={(dragEvent) => {
                      const item = { id: entry.id, historical: entry.historical }
                      setDragCountry(item)
                      dragEvent.dataTransfer.effectAllowed = 'move'
                      dragEvent.dataTransfer.setData('text/plain', encodeDragPayload(item))
                    }}
                    onDragEnd={() => {
                      setDragCountry(null)
                      setDragOverRole(null)
                    }}
                  >
                    <DeclarationPillName
                      type="button"
                      onClick={() => onCountryClick(entry.id)}
                    >
                      {entry.flagEmoji ? `${entry.flagEmoji} ` : ''}
                      {entry.name}
                    </DeclarationPillName>
                    {onPatch && (
                      <>
                        <DeclarationPillFlip
                          type="button"
                          onClick={() => assignDeclarationRole(entry, 'INITIATOR')}
                          title="선포국으로 역할 전환"
                          aria-label={`${entry.name} 선포국으로 역할 전환`}
                        >
                          ⇄
                        </DeclarationPillFlip>
                        <DeclarationPillClear
                          type="button"
                          onClick={() => assignDeclarationRole(entry, 'PARTICIPANT')}
                          title="대상국 역할 해제"
                          aria-label={`${entry.name} 대상국 역할 해제`}
                        >
                          ×
                        </DeclarationPillClear>
                      </>
                    )}
                  </DeclarationPill>
                ))}
              </DeclarationPillList>
            ) : (
              <DeclarationEmpty>
                {onPatch ? '나라를 이리로 끌어 놓으면 대상국으로 지정' : '대상국 미지정'}
              </DeclarationEmpty>
            )}
          </DeclarationLane>
        </DeclarationGrid>

        {onPatch && otherParticipants.length > 0 && (
          <QuickAssignBar aria-label="참여국 선포국·대상국 빠른 지정">
            <QuickAssignLabel>참여국 빠른 배정</QuickAssignLabel>
            {visibleParticipants.map((participant) => (
              <QuickAssignChip
                key={`${participant.historical ? 'h' : 'c'}:${participant.id}`}
                draggable
                onDragStart={(dragEvent) => {
                  setDragCountry(participant)
                  dragEvent.dataTransfer.effectAllowed = 'move'
                  dragEvent.dataTransfer.setData('text/plain', encodeDragPayload(participant))
                }}
                onDragEnd={() => {
                  setDragCountry(null)
                  setDragOverRole(null)
                }}
              >
                <span>⠿ {participant.name}</span>
                <QuickAssignBtn
                  type="button"
                  $initiator
                  onClick={() => assignDeclarationRole(participant, 'INITIATOR')}
                >
                  + 선포국
                </QuickAssignBtn>
                <QuickAssignBtn
                  type="button"
                  $initiator={false}
                  onClick={() => assignDeclarationRole(participant, 'TARGET')}
                >
                  + 대상국
                </QuickAssignBtn>
              </QuickAssignChip>
            ))}
            {otherParticipants.length > QUICK_ASSIGN_CAP && (
              <QuickAssignMoreBtn
                type="button"
                onClick={() => setShowAllParticipants((previous) => !previous)}
              >
                {showAllParticipants ? '접기' : `+${hiddenParticipantCount}개국 더 보기`}
              </QuickAssignMoreBtn>
            )}
          </QuickAssignBar>
        )}
      </DeclarationBoard>

      {entries.length === 0 ? (
        <S.HelperText>
          전쟁을 선포한 나라를 참여국 역할 ‘주도국(선포국)’으로, 선포를 받은 상대 나라를
          ‘대상국’으로 지정하면 선전포고 방향과 국가별 선전포고 이력이 자동으로 연결됩니다.{' '}
          <ActorsLink href="#actors">참여국 편집으로</ActorsLink>
        </S.HelperText>
      ) : (
        entriesWithContext.length > 0 && (
          <Rows>
            {entriesWithContext.map((entry) => (
              <Row key={`${entry.role}:${entry.id}`}>
                <Head>
                  <RoleTag $initiator={entry.role === 'INITIATOR'}>
                    {ROLE_LABEL[entry.role]}
                  </RoleTag>
                  <CountryButton type="button" onClick={() => onCountryClick(entry.id)}>
                    {entry.name}
                  </CountryButton>
                </Head>
                {entry.roleDescription && <ContextText>{entry.roleDescription}</ContextText>}
                {entry.note && <NoteText>{entry.note}</NoteText>}
              </Row>
            ))}
          </Rows>
        )
      )}
    </S.Section>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const buttonReset = `
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
`

const ParentWarBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  font-size: 12.5px;
`

const ParentWarLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${metaText};
`

const ParentWarTitleLink = styled(Link)`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const ParentWarOverviewLink = styled(Link)`
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const DeclarationBoard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.02)'};
`

const DeclarationGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(130px, 0.85fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;

  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const DeclarationLane = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed
    ${({ theme, $dragOver }) =>
      $dragOver ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $dragOver }) =>
    $dragOver
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.02)'
        : 'rgba(255,255,255,0.75)'};
  transition: border-color 0.14s, background 0.14s;
`

const DeclarationLaneHead = styled.div<{ $initiator: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const DeclarationPillList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const DeclarationPill = styled.span<{ $initiator: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $initiator }) =>
      $initiator ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;
`

const DeclarationPillName = styled.button`
  ${buttonReset}
  font-weight: 600;
  color: inherit;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const DeclarationPillFlip = styled.button`
  ${buttonReset}
  font-size: 11.5px;
  line-height: 1;
  color: ${metaText};
  opacity: 0.75;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DeclarationPillClear = styled.button`
  ${buttonReset}
  font-size: 13px;
  line-height: 1;
  color: ${metaText};
  opacity: 0.75;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DeclarationEmpty = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const DeclarationArrow = styled.span`
  align-self: center;
  font-size: 12px;
  font-weight: 700;
  color: ${metaText};

  @media (max-width: 680px) {
    display: none;
  }
`

const DeclarationCenterNode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  text-align: center;
`

const DeclarationCenterKicker = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const DeclarationCenterTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
`

const QuickAssignBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const QuickAssignLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${metaText};
`

const QuickAssignChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;
`

const QuickAssignBtn = styled.button<{ $initiator: boolean }>`
  ${buttonReset}
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $initiator }) =>
    $initiator
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.06)'};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccent(theme.mode) : theme.colors.text.secondary};

  &:hover {
    opacity: 0.85;
  }
`

const QuickAssignMoreBtn = styled.button`
  ${buttonReset}
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ActorsLink = styled.a`
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
`

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 2px;
  }

  &:last-child {
    border-bottom: none;
  }
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
`

const RoleTag = styled.span<{ $initiator: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $initiator }) =>
    $initiator ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
`

const CountryButton = styled.button`
  ${buttonReset}
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const ContextText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NoteText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};
`
