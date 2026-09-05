import { useMemo, useState } from 'react'

import styled from 'styled-components'

import type { CalendarEventItem } from '../../model/use-country-dashboard-stats'

export interface EventCalendarPanelProps {
  events: CalendarEventItem[]
  /** 날짜 칸의 사건을 누르면 — 사건 상세로 */
  onSelectEvent: (eventId: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

interface YearMonth {
  year: number
  month: number
}

/** 'YYYY-MM-DD' → {year, month, day}. BC('-')는 달력에 올리지 않는다 */
function parseDate(date: string): { year: number; month: number; day: number } | null {
  const matched = /^(\d{1,6})-(\d{2})-(\d{2})$/.exec(date)
  if (!matched) return null
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  }
}

const keyOf = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** 그 달 1일의 요일(0=일)과 일수 — 100년 미만 연도도 안전하게 */
function monthShape(year: number, month: number) {
  const first = new Date(2000, month - 1, 1)
  first.setFullYear(year)
  const next = new Date(2000, month, 1)
  next.setFullYear(month === 12 ? year + 1 : year)
  const daysInMonth = Math.round(
    (next.getTime() - first.getTime()) / 86400000,
  )
  return { startWeekday: first.getDay(), daysInMonth }
}

function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = month - 1 + delta
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  }
}

/**
 * 사건 캘린더 — 한 달을 펴고 그 달에 있던 사건을 날짜 칸에 찍는다.
 *
 * 이 지면의 사건은 세기 단위로 흩어져 있어(미국 41건이 18~21세기) 오늘 달을 열면
 * 대개 빈 격자다. 그래서 **사건이 있는 달**에서 시작하고, 위쪽에 '사건 있는 달'만
 * 추린 이동 단추를 둔다 — 빈 달을 몇 번씩 넘기게 만들지 않는다.
 *
 * 연도만 아는 사건(실측 330건 중 43건)은 서버가 `01-01`로 채워 보낸다. 그걸 1월 1일에
 * 찍으면 거짓이라, `isDayKnown=false`인 사건은 칸에 올리지 않고 아래에 따로 센다.
 */
export function EventCalendarPanel({
  events,
  onSelectEvent,
}: EventCalendarPanelProps) {
  /** 날짜별 사건 — 일자를 아는 것만 */
  const { byDay, monthsWithEvents, yearOnlyCount } = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>()
    const months = new Map<string, YearMonth & { count: number }>()
    let yearOnly = 0
    for (const event of events) {
      if (!event.isDayKnown) {
        yearOnly += 1
        continue
      }
      const parsed = parseDate(event.date)
      if (!parsed) {
        yearOnly += 1
        continue
      }
      const dayKey = keyOf(parsed.year, parsed.month, parsed.day)
      const bucket = map.get(dayKey)
      if (bucket) bucket.push(event)
      else map.set(dayKey, [event])

      const monthKey = `${parsed.year}-${parsed.month}`
      const monthEntry = months.get(monthKey)
      if (monthEntry) monthEntry.count += 1
      else months.set(monthKey, { year: parsed.year, month: parsed.month, count: 1 })
    }
    return {
      byDay: map,
      monthsWithEvents: [...months.values()].sort((left, right) =>
        left.year !== right.year ? right.year - left.year : right.month - left.month,
      ),
      yearOnlyCount: yearOnly,
    }
  }, [events])

  /* 오늘이 아니라 **사건이 있는 가장 최근 달**에서 연다 — 빈 격자로 시작하지 않는다 */
  const [cursor, setCursor] = useState<YearMonth | null>(null)
  const current: YearMonth =
    cursor ??
    (monthsWithEvents[0]
      ? { year: monthsWithEvents[0].year, month: monthsWithEvents[0].month }
      : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

  const { startWeekday, daysInMonth } = monthShape(current.year, current.month)
  const cells: Array<number | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const monthIndex = monthsWithEvents.findIndex(
    (entry) => entry.year === current.year && entry.month === current.month,
  )
  /* 목록은 최신순이라 '이전 사건'이 뒤쪽이다 */
  const olderMonth =
    monthIndex >= 0 ? monthsWithEvents[monthIndex + 1] : monthsWithEvents[0]
  const newerMonth = monthIndex > 0 ? monthsWithEvents[monthIndex - 1] : null

  const monthCount = monthsWithEvents.find(
    (entry) => entry.year === current.year && entry.month === current.month,
  )?.count

  const goMonth = (next: YearMonth) => setCursor(next)

  return (
    <Root>
      <Head>
        <MonthNav
          type="button"
          aria-label="이전 달"
          onClick={() => goMonth(shiftMonth(current, -1))}
        >
          ‹
        </MonthNav>
        <MonthTitle>
          {current.year}년 {current.month}월
        </MonthTitle>
        <MonthNav
          type="button"
          aria-label="다음 달"
          onClick={() => goMonth(shiftMonth(current, 1))}
        >
          ›
        </MonthNav>
        {monthCount != null && <MonthCount>{monthCount}건</MonthCount>}

        {/*
          빈 달을 한 칸씩 넘기게 두면 18세기 사건을 보러 가는 데 3,000번을 눌러야 한다.
          사건이 있는 달로 바로 건너뛴다.
        */}
        <JumpGroup>
          {olderMonth && (
            <Jump
              type="button"
              onClick={() =>
                goMonth({ year: olderMonth.year, month: olderMonth.month })
              }
            >
              ← {olderMonth.year}.{olderMonth.month}
            </Jump>
          )}
          {newerMonth && (
            <Jump
              type="button"
              onClick={() =>
                goMonth({ year: newerMonth.year, month: newerMonth.month })
              }
            >
              {newerMonth.year}.{newerMonth.month} →
            </Jump>
          )}
        </JumpGroup>
      </Head>

      <Grid role="grid" aria-label={`${current.year}년 ${current.month}월 사건 달력`}>
        {WEEKDAYS.map((label, index) => (
          <Weekday key={label} $weekend={index === 0 || index === 6}>
            {label}
          </Weekday>
        ))}
        {cells.map((day, index) => {
          if (day == null) return <EmptyCell key={`pad-${index}`} aria-hidden />
          const dayKey = keyOf(current.year, current.month, day)
          const dayEvents = byDay.get(dayKey) ?? []
          const weekday = (startWeekday + day - 1) % 7
          const shown = dayEvents.slice(0, 3)
          return (
            <DayCell
              key={dayKey}
              $has={dayEvents.length > 0}
              $weekend={weekday === 0 || weekday === 6}
            >
              <DayNumber $weekend={weekday === 0 || weekday === 6}>
                {day}
              </DayNumber>
              {/*
                제목을 칸 안에 넣는다. 점만 찍으면 "여기 뭔가 있다"까지만 말하고,
                무슨 일이 있었는지는 한 번 더 눌러야 나온다 — 달력을 보는 이유가 그건데.
              */}
              {shown.map((event) => (
                <DayEvent
                  key={event.id}
                  type="button"
                  title={event.title}
                  onClick={() => onSelectEvent(event.id)}
                >
                  {event.title}
                </DayEvent>
              ))}
              {dayEvents.length > shown.length && (
                <DayMore>+{dayEvents.length - shown.length}건</DayMore>
              )}
            </DayCell>
          )
        })}
      </Grid>

      {yearOnlyCount > 0 && (
        <Footnote>
          연도만 아는 사건 {yearOnlyCount}건은 날짜 칸에 올리지 않았습니다
        </Footnote>
      )}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const MonthNav = styled.button`
  appearance: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 18px;
  line-height: 1;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }
`

const MonthTitle = styled.span`
  min-width: 128px;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MonthCount = styled.span`
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: #b45309;
  background: rgba(245, 158, 11, 0.16);
`

/* 달 넘기기 옆에 붙인다 — 폭이 넓어지자 오른쪽 끝으로 밀려 1,250px 떨어져 있었다 */
const JumpGroup = styled.span`
  display: inline-flex;
  gap: 8px;
  margin-left: 6px;
`

const Jump = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  padding: 5px 10px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

/** 폭을 꽉 채우는 월 격자 — 칸이 넓어야 제목이 들어간다 */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
`

const Weekday = styled.span<{ $weekend: boolean }>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 4px;
  height: 22px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ $weekend, theme }) =>
    $weekend ? '#be123c' : theme.colors.text.tertiary};
`

const EmptyCell = styled.span`
  min-height: 96px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.012)' : 'rgba(15,23,42,0.012)'};
`

const DayCell = styled.div<{ $has: boolean; $weekend: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 96px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid
    ${({ $has, theme }) =>
      $has ? 'rgba(245, 158, 11, 0.30)' : theme.colors.border.light};
  background: ${({ $has, theme }) =>
    $has ? 'rgba(245, 158, 11, 0.07)' : theme.colors.background.primary};
`

const DayNumber = styled.span<{ $weekend: boolean }>`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ $weekend, theme }) =>
    $weekend ? 'rgba(190, 18, 60, 0.75)' : theme.colors.text.tertiary};
`

/** 칸 안의 사건 한 줄 — 누르면 그 사건으로 */
const DayEvent = styled.button`
  appearance: none;
  display: block;
  width: 100%;
  padding: 4px 7px;
  border: none;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.22);
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  &:hover {
    background: rgba(245, 158, 11, 0.36);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

const DayMore = styled.span`
  padding-left: 4px;
  font-size: 10.5px;
  font-weight: 700;
  color: #b45309;
`

const Footnote = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
