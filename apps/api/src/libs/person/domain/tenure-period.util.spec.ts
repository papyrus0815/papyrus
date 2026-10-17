import { periodKey, tenurePeriodColumns } from './tenure-period.util'

describe('tenurePeriodColumns', () => {
  it('일 정밀도 — UTC 날짜 부분과 키', () => {
    const columns = tenurePeriodColumns({
      startDate: new Date('1888-03-09T16:00:00.000Z'),
      startDatePrecision: null,
      endDate: new Date('1888-06-15T16:00:00.000Z'),
    })
    expect(columns).toEqual({
      startEra: 'AD',
      startYear: 1888,
      startMonth: 3,
      startDay: 9,
      startKey: 18880309,
      endEra: 'AD',
      endYear: 1888,
      endMonth: 6,
      endDay: 15,
      endKey: 18880615,
    })
  })

  it('연 정밀도 — 월·일을 비우고 키는 시작 1월 1일·끝 12월 31일', () => {
    const columns = tenurePeriodColumns({
      startDate: new Date('1867-01-01T15:45:56.000Z'),
      startDatePrecision: 'year',
      endDate: new Date('1874-01-01T15:45:56.000Z'),
    })
    expect(columns.startMonth).toBeNull()
    expect(columns.startDay).toBeNull()
    expect(columns.startKey).toBe(18670101)
    expect(columns.endMonth).toBeNull()
    expect(columns.endKey).toBe(18741231)
  })

  it('월 정밀도 — 일만 비움', () => {
    const columns = tenurePeriodColumns({
      startDate: new Date('1914-08-01T00:00:00.000Z'),
      startDatePrecision: 'month',
    })
    expect(columns).toMatchObject({ startMonth: 8, startDay: null, startKey: 19140801 })
  })

  it('재임 중(종료 없음)이면 끝 칸이 전부 비어 있다', () => {
    const columns = tenurePeriodColumns({ startDate: new Date('2022-05-10T00:00:00.000Z') })
    expect(columns).toMatchObject({ endEra: null, endYear: null, endKey: null })
  })
})

describe('periodKey', () => {
  it('BC는 음수 — 이른 해가 더 작다', () => {
    const bc45 = periodKey({ era: 'BC', year: 45, month: 12, day: 31 }, 'end')
    const bc44 = periodKey({ era: 'BC', year: 44, month: 3, day: 15 }, 'start')
    const ad14 = periodKey({ era: 'AD', year: 14, month: null, day: null }, 'start')
    expect(bc45).toBeLessThan(bc44)
    expect(bc44).toBeLessThan(ad14)
  })
})
