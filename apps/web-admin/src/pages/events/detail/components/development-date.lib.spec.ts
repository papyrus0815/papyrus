import { compactRowDate, compactStartText, shortSpanText } from './development-date.lib'

const day = (iso: string, end?: string) => ({
  startDate: iso,
  startDatePrecision: 'day',
  endDate: end ?? null,
  endDatePrecision: end ? 'day' : null,
})
const text = (result: ReturnType<typeof compactRowDate>) =>
  result ? `${result.yearText ?? ''}|${result.rest}` : null

describe('compactRowDate — 앞 행과 같은 부분은 생략', () => {
  it('첫 행은 연도부터 전부, 해가 같으면 연도를 뺀다', () => {
    expect(text(compactRowDate(day('1789-05-05T00:00:00.000Z'), null))).toBe(
      '1789|.5.5',
    )
    expect(
      text(
        compactRowDate(
          day('1789-06-17T00:00:00.000Z'),
          day('1789-05-05T00:00:00.000Z'),
        ),
      ),
    ).toBe('|6.17')
  })

  it('해가 바뀌면 연도를 다시 굵게', () => {
    expect(
      text(
        compactRowDate(
          day('1790-02-13T00:00:00.000Z'),
          day('1789-10-21T00:00:00.000Z'),
        ),
      ),
    ).toBe('1790|.2.13')
  })

  it('같은 날이면 시각만, 시각이 없으면 같은 날', () => {
    const before = day('1941-06-22T03:15:00.000Z')
    expect(text(compactRowDate(day('1941-06-22T07:15:00.000Z'), before))).toBe(
      '|07:15',
    )
    expect(
      text(
        compactRowDate(
          day('1941-06-22T03:15:00.000Z', '1941-06-22T21:00:00.000Z'),
          before,
        ),
      ),
    ).toBe('|03:15 ~ 21:00')
    expect(text(compactRowDate(day('1941-06-22T00:00:00.000Z'), before))).toBe(
      '|같은 날',
    )
    expect(
      text(
        compactRowDate(
          day('1914-06-28T00:00:00.000Z', '1914-07-25T00:00:00.000Z'),
          day('1914-06-28T00:00:00.000Z'),
        ),
      ),
    ).toBe('|6.28 ~ 7.25')
  })

  it('끝은 시작과 견준다 — 같은 해면 연도 없이, 해를 넘으면 전부', () => {
    expect(
      text(
        compactRowDate(
          day('1789-07-20T00:00:00.000Z', '1789-08-06T00:00:00.000Z'),
          null,
        ),
      ),
    ).toBe('1789|.7.20 ~ 8.6')
    expect(
      text(
        compactRowDate(
          day('1941-06-21T23:30:00.000Z', '1941-06-22T00:30:00.000Z'),
          null,
        ),
      ),
    ).toBe('1941|.6.21 23:30 ~ 6.22 00:30')
    expect(
      text(
        compactRowDate(
          day('1939-09-01T00:00:00.000Z', '1945-05-09T00:00:00.000Z'),
          null,
        ),
      ),
    ).toBe('1939|.9.1 ~ 1945.5.9')
  })

  it('정밀도 없는 1월 1일은 연도만, 기원전은 기원전', () => {
    expect(
      text(compactRowDate({ startDate: '1002-01-01T00:00:00.000Z' }, null)),
    ).toBe('1002|')
    expect(
      text(
        compactRowDate(
          { startDate: '-0044-03-15T00:00:00.000Z', startDatePrecision: 'day' },
          null,
        ),
      ),
    ).toBe('기원전 44|.3.15')
  })

  it('날짜가 없으면 null', () => {
    expect(compactRowDate({ startDate: null }, null)).toBeNull()
  })
})

describe('정밀도 없는 1일 ~ 말일 = 월만 아는 기간', () => {
  const raw = (start: string, end: string) => ({ startDate: `${start}T00:00:00.000Z`, endDate: `${end}T00:00:00.000Z` })
  const text = (result: ReturnType<typeof compactRowDate>) => (result ? `${result.yearText ?? ''}|${result.rest}` : null)
  it('세 하인리히 전쟁 — 지어낸 일자 대신 월', () => {
    expect(text(compactRowDate(raw('0976-01-01', '0976-07-31'), null))).toBe('976|.1 ~ 7월')
    expect(text(compactRowDate(raw('0976-08-01', '0977-09-30'), null))).toBe('976|.8 ~ 977.9')
    expect(text(compactRowDate(raw('0976-07-01', '0976-12-31'), raw('0976-01-01', '0976-07-31')))).toBe('|7월 ~ 12월')
  })
  it('1월 1일 ~ 12월 31일은 여전히 연도만, 명시한 day는 그대로, 시작이 1일이 아니면 그대로', () => {
    expect(text(compactRowDate(raw('0974-01-01', '0974-12-31'), null))).toBe('974|')
    expect(
      text(compactRowDate({ ...raw('1914-07-01', '1914-07-31'), startDatePrecision: 'day', endDatePrecision: 'day' }, null)),
    ).toBe('1914|.7.1 ~ 7.31')
    expect(text(compactRowDate(raw('0978-03-29', '0978-03-31'), null))).toBe('978|.3.29 ~ 3.31')
  })
  it('윤년 2월 말일', () => {
    expect(text(compactRowDate(raw('1916-02-01', '1916-02-29'), null))).toBe('1916|.2')
  })
  it('목차 표지는 시작만, 판정은 행 전체로', () => {
    expect(compactStartText(raw('0976-07-01', '0976-12-31'), raw('0976-01-01', '0976-07-31'))).toBe('7월')
  })
  it('머리 부제 — 각자의 정밀도 그대로', () => {
    expect(shortSpanText([raw('0974-01-01', '0974-12-31'), raw('0978-04-01', '0978-12-31')])).toBe('974 ~ 978.12')
  })
})
