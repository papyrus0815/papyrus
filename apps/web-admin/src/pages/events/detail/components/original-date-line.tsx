/**
 * 원 사료 날짜 — 사료가 적은 역법·표기 그대로(장부 날짜 줄 아래).
 *
 * 장부 날짜는 그레고리력 환산값이라, 음력·율리우스력으로 적힌 사건(임진왜란·10월 혁명)은 사료와
 * 날짜가 어긋나 보였다. 원문을 함께 두면 '왜 날짜가 다른가'가 풀린다. 대부분의 사건엔 필요 없어
 * 비어 있으면 '원 사료 날짜' 추가 단추 하나만 둔다(빈 칸 두 개를 늘 세우지 않는다).
 */
import { useState } from 'react'

import { FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import { CALENDAR_OPTIONS, type CalendarSystem } from '@/entities/event/model/calendar-system'
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'

import { type EventDetail } from '../use-event-detail'
import { InlineSelect, InlineText } from './inline'

export function OriginalDateLine({
  event,
  onPatch,
}: {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
}) {
  const [adding, setAdding] = useState(false)
  const hasStart = Boolean(event.startCalendar || event.startDateOriginal)
  const hasEnd = Boolean(event.endCalendar || event.endDateOriginal)
  if (!hasStart && !hasEnd && !adding) {
    return (
      <AddButton type="button" onClick={() => setAdding(true)}>
        <FiPlus aria-hidden />
        원 사료 날짜
      </AddButton>
    )
  }
  const endPart = Boolean(event.endDate) || hasEnd
  return (
    <Block aria-label="원 사료 날짜">
      <Title>원 사료 날짜</Title>
      <Part
        label={endPart ? '시작' : null}
        calendar={event.startCalendar ?? null}
        original={event.startDateOriginal ?? null}
        onCalendar={(next) => onPatch({ startCalendar: next } as UpdateEventDto)}
        onOriginal={(next) => onPatch({ startDateOriginal: next } as UpdateEventDto)}
      />
      {endPart && (
        <Part
          label="끝"
          calendar={event.endCalendar ?? null}
          original={event.endDateOriginal ?? null}
          onCalendar={(next) => onPatch({ endCalendar: next } as UpdateEventDto)}
          onOriginal={(next) => onPatch({ endDateOriginal: next } as UpdateEventDto)}
        />
      )}
    </Block>
  )
}

function Part({
  label,
  calendar,
  original,
  onCalendar,
  onOriginal,
}: {
  label: string | null
  calendar: CalendarSystem | null
  original: string | null
  onCalendar: (next: CalendarSystem | null) => void
  onOriginal: (next: string) => void
}) {
  return (
    <PartLine>
      {label && <PartLabel>{label}</PartLabel>}
      <InlineSelect
        value={calendar ?? ''}
        options={CALENDAR_OPTIONS}
        onSave={(next) => onCalendar((next || null) as CalendarSystem | null)}
        placeholder="역법"
        label={`${label ?? ''} 역법`.trim()}
      />
      <OriginalText>
        <InlineText
          value={original ?? ''}
          /* 비우면 빈 문자열 — 서버가 null로 바꾼다 */
          onSave={(next) => onOriginal(next.trim())}
          placeholder="원문 표기 — 예: 선조 25년 4월 13일"
          label={`${label ?? ''} 원문 날짜`.trim()}
        />
      </OriginalText>
    </PartLine>
  )
}

const AddButton = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  margin-left: -8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  svg {
    width: 12px;
    height: 12px;
  }
  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
`

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.03)')};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Title = styled.span`
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 0;
`

const PartLabel = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OriginalText = styled.span`
  flex: 1 1 140px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`
