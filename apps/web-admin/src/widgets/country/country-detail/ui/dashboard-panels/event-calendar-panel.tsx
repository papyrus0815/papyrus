import { useEffect, useMemo, useState } from 'react'

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

/** 'YYYY-MM-DD' 또는 '-YYYY-MM-DD'(BC) → {year, month, day} */
function parseDate(
  date: string,
): { year: number; month: number; day: number } | null {
  const matched = /^(-?\d{1,6})-(\d{2})-(\d{2})/.exec(date.trim())
  if (!matched) return null
  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  }
}

function formatCalYear(year: number, withSuffix = true): string {
  if (year < 0)
    return withSuffix ? `BC ${Math.abs(year)}년` : `BC ${Math.abs(year)}`
  return withSuffix ? `${year}년` : String(year)
}

const keyOf = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** 그 달 1일의 요일(0=일)과 일수 — 100년 미만·기원전(음수) 연도도 안전하게 */
function monthShape(year: number, month: number) {
  // BC 연도(-1 등)에서 12월→다음해 1월이 JS Date 연도 0을 가로질러 어긋나는 것을 막기 위해
  // 천문 연도(1 BC = 0, 2 BC = -1)로 환산해 요일·일수를 계산한다.
  const astroYear = year < 0 ? year + 1 : year
  const first = new Date(2000, month - 1, 1)
  first.setFullYear(astroYear)
  const next = new Date(2000, month, 1)
  next.setFullYear(month === 12 ? astroYear + 1 : astroYear)
  const daysInMonth = Math.round((next.getTime() - first.getTime()) / 86400000)
  return { startWeekday: first.getDay(), daysInMonth }
}

function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = month - 1 + delta
  const yearDelta = Math.floor(zeroBased / 12)
  let nextYear = year + yearDelta
  // 역사 연도 표기에는 0년이 없으므로 BC 1년(-1) ↔ AD 1년(1) 경계를 건너뛴다
  if (year < 0 && nextYear >= 0) nextYear += 1
  else if (year > 0 && nextYear <= 0) nextYear -= 1
  return {
    year: nextYear,
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
  const [viewMode, setViewMode] = useState<'calendar' | 'ledger'>('calendar')
  const [ledgerExpanded, setLedgerExpanded] = useState(false)

  /** 날짜별 사건 — 일자를 아는 것만 */
  const { byDay, monthsWithEvents, allDatedEvents, yearOnlyCount } =
    useMemo(() => {
      const map = new Map<string, CalendarEventItem[]>()
      const months = new Map<string, YearMonth & { count: number }>()
      const datedRows: Array<{
        year: number
        month: number
        day: number
        event: CalendarEventItem
      }> = []
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
        datedRows.push({
          year: parsed.year,
          month: parsed.month,
          day: parsed.day,
          event,
        })
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
      datedRows.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        if (a.month !== b.month) return b.month - a.month
        return b.day - a.day
      })
      return {
        byDay: map,
        monthsWithEvents: [...months.values()].sort((left, right) =>
          left.year !== right.year
            ? right.year - left.year
            : right.month - left.month,
        ),
        allDatedEvents: datedRows,
        yearOnlyCount: yearOnly,
      }
    }, [events])

  /* 오늘이 아니라 **사건이 있는 가장 최근 달**에서 연다 — 빈 격자로 시작하지 않는다 */
  const [cursor, setCursor] = useState<YearMonth | null>(null)

  /* 국가 전환 등으로 사건 목록이 바뀌면 이전 국가에서 고른 달 커서를 초기화한다 */
  useEffect(() => {
    setCursor((prev) => {
      if (!prev) return null
      const exists = monthsWithEvents.some(
        (entry) => entry.year === prev.year && entry.month === prev.month,
      )
      return exists ? prev : null
    })
  }, [monthsWithEvents])

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
  const datedEventCount = events.length - yearOnlyCount
  const peakMonth = useMemo(() => {
    if (monthsWithEvents.length === 0) return null
    return monthsWithEvents.reduce(
      (best, entry) => (entry.count > best.count ? entry : best),
      monthsWithEvents[0],
    )
  }, [monthsWithEvents])
  const yearRangeLabel = useMemo(() => {
    if (yearIndex.length === 0) return '—'
    const latestY = yearIndex[0].year
    const earliestY = yearIndex[yearIndex.length - 1].year
    if (latestY === earliestY) return formatCalYear(latestY)
    return `${formatCalYear(earliestY, false)} – ${formatCalYear(latestY)}`
  }, [yearIndex])

  return (
    <Frame>
      <HeadlineStrip>
        <HeadlineCell>
          <HeadlineLabel>일자 확인 사건</HeadlineLabel>
          <HeadlineValue>
            {datedEventCount.toLocaleString('ko-KR')}
            <HeadlineUnit>건</HeadlineUnit>
          </HeadlineValue>
          <HeadlineSub>
            전체 {events.length.toLocaleString('ko-KR')}건 중 월·일 파악
          </HeadlineSub>
        </HeadlineCell>
        <HeadlineCell>
          <HeadlineLabel>분포 범위</HeadlineLabel>
          <HeadlineValue>{yearRangeLabel}</HeadlineValue>
          <HeadlineSub>
            {yearIndex.length}개 연도 · {monthsWithEvents.length}개 달에 분포
          </HeadlineSub>
        </HeadlineCell>
        <HeadlineCell>
          <HeadlineLabel>최다 사건 집중 월</HeadlineLabel>
          {peakMonth ? (
            <HeadlineActionBtn
              type="button"
              onClick={() =>
                goMonth({ year: peakMonth.year, month: peakMonth.month })
              }
              title="클릭하여 해당 달로 이동"
            >
              {formatCalYear(peakMonth.year)} {peakMonth.month}월 (
              {peakMonth.count}건)
            </HeadlineActionBtn>
          ) : (
            <HeadlineValue>—</HeadlineValue>
          )}
          <HeadlineSub>
            {peakMonth
              ? '클릭 시 해당 달 격자로 즉시 이동'
              : '일자 확인 사건 기준'}
          </HeadlineSub>
        </HeadlineCell>
        <HeadlineCell>
          <HeadlineLabel>연도만 아는 사건</HeadlineLabel>
          <HeadlineValue>
            {yearOnlyCount.toLocaleString('ko-KR')}
            <HeadlineUnit>건</HeadlineUnit>
          </HeadlineValue>
          <HeadlineSub>
            {yearOnlyCount > 0
              ? '특정 월·일 미상으로 달력 격자 제외'
              : '모든 사건의 월·일 확인됨'}
          </HeadlineSub>
        </HeadlineCell>
      </HeadlineStrip>

      <ViewToolbarRow>
        <ViewToolbarHint>
          {viewMode === 'calendar'
            ? '월간 격자와 우측 연도·월 색인으로 날짜별 사건을 탐색합니다'
            : `월·일이 확인된 사건 ${allDatedEvents.length.toLocaleString('ko-KR')}건을 최신 일자순 2열 원장으로 표시합니다`}
        </ViewToolbarHint>
        <ViewToggleGroup role="group" aria-label="사건 캘린더 보기 방식">
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'calendar'}
            onClick={() => setViewMode('calendar')}
          >
            월간 달력
          </ViewToggleBtn>
          <ViewToggleBtn
            type="button"
            $active={viewMode === 'ledger'}
            onClick={() => setViewMode('ledger')}
          >
            전체 사건 원장 ({allDatedEvents.length})
          </ViewToggleBtn>
        </ViewToggleGroup>
      </ViewToolbarRow>

      {viewMode === 'ledger' ? (
        <LedgerWrap>
          <LedgerGrid role="table" aria-label="일자 확인 사건 전체 원장">
            {(ledgerExpanded
              ? allDatedEvents
              : allDatedEvents.slice(0, 16)
            ).map(({ year, month, day, event }) => (
              <LedgerCell key={`${event.id}-${year}-${month}-${day}`}>
                <LedgerRowButton
                  type="button"
                  onClick={() => onSelectEvent(event.id)}
                >
                  <LedgerDateBadge>
                    {formatCalYear(year)} {month}월 {day}일
                  </LedgerDateBadge>
                  <LedgerEventTitle title={event.title}>
                    {event.title}
                  </LedgerEventTitle>
                  <LedgerGoMonthBtn
                    as="span"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      goMonth({ year, month })
                      setViewMode('calendar')
                    }}
                    title="이 달 달력으로 이동"
                  >
                    달력 ›
                  </LedgerGoMonthBtn>
                </LedgerRowButton>
              </LedgerCell>
            ))}
          </LedgerGrid>
          {allDatedEvents.length > 16 && (
            <LedgerMoreBtn
              type="button"
              onClick={() => setLedgerExpanded((prev) => !prev)}
            >
              {ledgerExpanded
                ? '접기'
                : `사건 ${(allDatedEvents.length - 16).toLocaleString('ko-KR')}건 더 보기`}
            </LedgerMoreBtn>
          )}
        </LedgerWrap>
      ) : (
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
              {formatCalYear(current.year)} {current.month}월
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
                  ← {formatCalYear(olderMonth.year, false)}.{olderMonth.month}
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
                  {formatCalYear(newerMonth.year, false)}.{newerMonth.month} →
                </Jump>
              )}
            </JumpGroup>
          </Head>

          <Grid
            role="grid"
            aria-label={`${formatCalYear(current.year)} ${current.month}월 사건 달력`}
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
                      <DayEventText>{event.title}</DayEventText>
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
                {formatCalYear(current.year)} {current.month}월의 사건
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
                    <YearLabel>{formatCalYear(year, false)}</YearLabel>
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
                            aria-label={`${formatCalYear(year)} ${month}월 사건 ${count}건`}
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
      )}
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
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const HeadlineStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ViewToolbarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
`

const ViewToolbarHint = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ViewToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 7px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ViewToggleBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  padding: 3px 9px;
  border: none;
  border-radius: 5px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
`

const LedgerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const LedgerCell = styled.div`
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 760px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const LedgerRowButton = styled.button`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const LedgerDateBadge = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const LedgerEventTitle = styled.span`
  font-size: 13px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LedgerGoMonthBtn = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  padding: 2px 6px;
  border-radius: 4px;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const LedgerMoreBtn = styled.button`
  align-self: flex-start;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const HeadlineCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  min-width: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-right: none;
  }

  @media (max-width: 820px) {
    &:nth-child(2n) {
      border-right: none;
    }
    &:nth-child(-n + 2) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const HeadlineLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadlineValue = styled.span`
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeadlineUnit = styled.span`
  margin-left: 2px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadlineActionBtn = styled.button`
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const HeadlineSub = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
const CELL_MIN_HEIGHT = 56
/**
 * 사건이 없는 칸 — 날짜 숫자만 들어갈 높이. 주(행) 높이는 그 주에서 가장 큰 칸이 정하므로,
 * 사건이 하나도 없는 주만 얇아진다. 68px 고정일 땐 사건 2건짜리 달(1914년 8월)도 다섯 주가
 * 모두 68px라 격자의 80%가 빈 칸이었다.
 */
const EMPTY_CELL_MIN_HEIGHT = 28

const cellBase = css`
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EmptyCell = styled.span`
  ${cellBase}
  min-height: ${EMPTY_CELL_MIN_HEIGHT}px;
`

const DayCell = styled.div<{ $has: boolean }>`
  ${cellBase}
  min-height: ${({ $has }) => ($has ? CELL_MIN_HEIGHT : EMPTY_CELL_MIN_HEIGHT)}px;
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
  padding: 4px 6px 4px 7px;
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

  &:hover {
    background: rgba(245, 158, 11, 0.26);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

/*
 * line-clamp + overflow: hidden을 padding이 있는 버튼 자신에게 걸면
 * 하단 padding 영역(3px)에 3번째 줄의 머리 부분이 잘린 채 비친다(체코공화국 NATO 가입 등).
 * 안쪽 텍스트 스팬에서 줄바꿈을 자른다.
 */
const DayEventText = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: keep-all;
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

  @container calendar (min-width: 880px) {
    padding-left: 24px;
    border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  }
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
  max-height: 240px;
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
