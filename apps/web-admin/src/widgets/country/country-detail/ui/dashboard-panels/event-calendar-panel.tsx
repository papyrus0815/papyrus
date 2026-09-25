import { useMemo, useState } from 'react'

import styled, { css } from 'styled-components'

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
function parseDate(
  date: string,
): { year: number; month: number; day: number } | null {
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
  const daysInMonth = Math.round((next.getTime() - first.getTime()) / 86400000)
  return { startWeekday: first.getDay(), daysInMonth }
}

function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = month - 1 + delta
  return {
    year: year + Math.floor(zeroBased / 12),
    month: (((zeroBased % 12) + 12) % 12) + 1,
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
      else
        months.set(monthKey, {
          year: parsed.year,
          month: parsed.month,
          count: 1,
        })
    }
    return {
      byDay: map,
      monthsWithEvents: [...months.values()].sort((left, right) =>
        left.year !== right.year
          ? right.year - left.year
          : right.month - left.month,
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

  /** 이 달에 있었던 사건 — 날짜순. 오른쪽 목록과 칸이 같은 자료를 두 번 쓴다 */
  const monthEvents = useMemo(() => {
    const rows: Array<{ day: number; event: CalendarEventItem }> = []
    for (let day = 1; day <= daysInMonth; day += 1) {
      for (const event of byDay.get(keyOf(current.year, current.month, day)) ??
        []) {
        rows.push({ day, event })
      }
    }
    return rows
  }, [byDay, current.year, current.month, daysInMonth])

  /** 사건 있는 달 색인 — 연도(최신 먼저) → 그 해의 달들(1월부터) */
  const yearIndex = useMemo(() => {
    const byYear = new Map<number, Array<{ month: number; count: number }>>()
    for (const entry of monthsWithEvents) {
      const list = byYear.get(entry.year) ?? []
      list.push({ month: entry.month, count: entry.count })
      byYear.set(entry.year, list)
    }
    return [...byYear.entries()].map(([year, months]) => ({
      year,
      months: months.sort((left, right) => left.month - right.month),
    }))
  }, [monthsWithEvents])

  const hasIndex = yearIndex.length > 0

  return (
    <Frame>
      <Root $withSide={hasIndex}>
        <Main>
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
            사건이 있는 바로 앞·뒤 달로 건너뛴다(멀리 가는 길은 오른쪽 색인이 맡는다).
          */}
            <JumpGroup>
              {olderMonth && (
                <Jump
                  type="button"
                  title="사건이 있는 이전 달"
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
                  title="사건이 있는 다음 달"
                  onClick={() =>
                    goMonth({ year: newerMonth.year, month: newerMonth.month })
                  }
                >
                  {newerMonth.year}.{newerMonth.month} →
                </Jump>
              )}
            </JumpGroup>
          </Head>

          <Grid
            role="grid"
            aria-label={`${current.year}년 ${current.month}월 사건 달력`}
          >
            {WEEKDAYS.map((label, index) => (
              <Weekday key={label} $tone={toneOf(index)}>
                {label}
              </Weekday>
            ))}
            {cells.map((day, index) => {
              if (day == null)
                return <EmptyCell key={`pad-${index}`} aria-hidden />
              const dayKey = keyOf(current.year, current.month, day)
              const dayEvents = byDay.get(dayKey) ?? []
              const weekday = (startWeekday + day - 1) % 7
              const shown = dayEvents.slice(0, 2)
              return (
                <DayCell key={dayKey} $has={dayEvents.length > 0}>
                  <DayNumber
                    $tone={toneOf(weekday)}
                    $has={dayEvents.length > 0}
                  >
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
        </Main>

        {/*
        오른쪽 칸 — 이 달의 목록과 사건 있는 달 색인.

        달력만 두면 두 가지를 못 한다. ⑴ 칸 안 제목은 두 줄에서 잘려 '무슨 일'을 끝까지
        못 읽고, ⑵ 사건이 세기에 걸쳐 흩어져 있어 '어느 달에 사건이 있는지'를 한 달씩
        넘겨 봐야 알았다. 목록은 제목을 온전히 적고, 색인은 사건 있는 달을 한눈에 깔아
        한 번에 건너가게 한다.
      */}
        {hasIndex && (
          <Side>
            <SideBlock>
              <SideTitle>
                {current.year}년 {current.month}월의 사건
              </SideTitle>
              {monthEvents.length > 0 ? (
                <Agenda>
                  {monthEvents.map(({ day, event }) => (
                    <AgendaItem key={event.id}>
                      <AgendaButton
                        type="button"
                        onClick={() => onSelectEvent(event.id)}
                      >
                        <AgendaDay>{day}일</AgendaDay>
                        <AgendaTitle>{event.title}</AgendaTitle>
                      </AgendaButton>
                    </AgendaItem>
                  ))}
                </Agenda>
              ) : (
                <SideEmpty>
                  이 달에는 날짜가 알려진 사건이 없습니다. 아래에서 사건이 있는
                  달로 건너가세요.
                </SideEmpty>
              )}
            </SideBlock>

            <SideBlock>
              <SideTitle>사건이 있는 달</SideTitle>
              <YearList>
                {yearIndex.map(({ year, months }) => (
                  <YearRow key={year}>
                    <YearLabel>{year}</YearLabel>
                    <MonthChips>
                      {months.map(({ month, count }) => {
                        const active =
                          year === current.year && month === current.month
                        return (
                          <MonthChip
                            key={month}
                            type="button"
                            $active={active}
                            aria-pressed={active}
                            aria-label={`${year}년 ${month}월 사건 ${count}건`}
                            onClick={() => goMonth({ year, month })}
                          >
                            {month}월
                            {count > 1 && (
                              <MonthChipCount>{count}</MonthChipCount>
                            )}
                          </MonthChip>
                        )
                      })}
                    </MonthChips>
                  </YearRow>
                ))}
              </YearList>
            </SideBlock>
          </Side>
        )}
      </Root>
    </Frame>
  )
}

type DayTone = 'sunday' | 'saturday' | 'weekday'

/** 일요일 빨강·토요일 파랑 — 국내 달력의 관례를 따른다 */
function toneOf(weekday: number): DayTone {
  if (weekday === 0) return 'sunday'
  if (weekday === 6) return 'saturday'
  return 'weekday'
}

const dayInk = (tone: DayTone, isDark: boolean, fallback: string) => {
  if (tone === 'sunday') return isDark ? '#f87171' : '#dc2626'
  if (tone === 'saturday') return isDark ? '#60a5fa' : '#2563eb'
  return fallback
}

/*
 * 달력 + 오른쪽 칸. 뷰포트가 아니라 이 그릇 폭으로 가른다(대시보드 칼럼 폭은 화면 폭과
 * 다르다) — 컨테이너와 격자는 다른 엘리먼트여야 쿼리가 걸린다.
 */
const Frame = styled.div`
  container: calendar / inline-size;
  width: 100%;
`

const Root = styled.div<{ $withSide: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px 28px;
  width: 100%;

  ${({ $withSide }) =>
    $withSide &&
    css`
      @container calendar (min-width: 880px) {
        grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
      }
    `}
`

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const MonthNav = styled.button`
  appearance: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 17px;
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
  min-width: 112px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MonthCount = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.14);
`

/* 달 넘기기 옆에 붙인다 — 폭이 넓어지자 오른쪽 끝으로 밀려 1,250px 떨어져 있었다 */
const JumpGroup = styled.span`
  display: inline-flex;
  gap: 6px;
  margin-left: 4px;
`

const Jump = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

/*
 * 격자 — 칸마다 상자를 두르지 않는다. 35칸이 각자 테두리를 두르면 대개 비어 있는 달에서
 * 격자 자체가 지면의 주인공이 됐다. 주(週)를 가르는 가로 실선 하나로 충분하다.
 */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  column-gap: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const Weekday = styled.span<{ $tone: DayTone }>`
  display: flex;
  align-items: center;
  padding: 0 6px 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $tone, theme }) =>
    dayInk($tone, theme.mode === 'dark', theme.colors.text.tertiary)};
`

/*
 * 칸 높이 — 제목 두 줄(line-clamp 2)과 날짜가 들어가는 만큼만.
 * 96px일 땐 사건 한 건짜리 달도 격자가 600px를 먹어 캘린더 한 장이 한 화면이었다.
 */
const CELL_MIN_HEIGHT = 68

const cellBase = css`
  min-height: ${CELL_MIN_HEIGHT}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EmptyCell = styled.span`
  ${cellBase}
`

const DayCell = styled.div<{ $has: boolean }>`
  ${cellBase}
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 4px 6px;
  min-width: 0;
`

const DayNumber = styled.span<{ $tone: DayTone; $has: boolean }>`
  padding-left: 2px;
  font-size: 12px;
  font-weight: ${({ $has }) => ($has ? 800 : 600)};
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) =>
    dayInk($tone, theme.mode === 'dark', theme.colors.text.tertiary)};
  opacity: ${({ $has, $tone }) => ($has || $tone === 'weekday' ? 1 : 0.7)};
`

/** 칸 안의 사건 한 줄 — 누르면 그 사건으로 */
const DayEvent = styled.button`
  appearance: none;
  display: block;
  width: 100%;
  padding: 3px 6px 3px 7px;
  border: none;
  border-left: 2px solid #f59e0b;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.14);
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: keep-all;

  &:hover {
    background: rgba(245, 158, 11, 0.26);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

const DayMore = styled.span`
  padding-left: 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
`

const Footnote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ─── 오른쪽 칸 ─────────────────────────────────────────────────────── */

const Side = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
`

const SideBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SideTitle = styled.h3`
  margin: 0;
  font-size: 12.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Agenda = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const AgendaItem = styled.li`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const AgendaButton = styled.button`
  appearance: none;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 8px 6px;
  border: none;
  border-radius: 6px;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

const AgendaDay = styled.span`
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
`

const AgendaTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const SideEmpty = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 연도가 많으면 칸이 길어진다 — 달력 높이쯤에서 스크롤로 접는다 */
const YearList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
`

const YearRow = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: baseline;
  gap: 8px;
`

const YearLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MonthChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const MonthChip = styled.button<{ $active: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'rgba(245, 158, 11, 0.55)' : theme.colors.border.light};
  background: ${({ $active }) =>
    $active ? 'rgba(245, 158, 11, 0.16)' : 'transparent'};
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? 'rgba(245, 158, 11, 0.22)' : theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

const MonthChipCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
