import { formatEventDate, parseEventDate } from './event-date'

describe('parseEventDate / formatEventDate', () => {
  it('일(day) 정밀도 ISO 문자열에 포함된 시각(시·분·초)을 UTC DateTime에 보존한다', () => {
    const parsed = parseEventDate('1950-06-25T04:00:00.000Z', 'day')
    expect(parsed).toEqual({
      date: new Date(Date.UTC(1950, 5, 25, 4, 0, 0)),
      era: 'AD',
      year: 1950,
      month: 6,
      day: 25,
    })
    expect(
      formatEventDate(
        parsed?.date,
        parsed?.era,
        parsed?.year,
        parsed?.month,
        parsed?.day,
      ),
    ).toBe('1950-06-25T04:00:00.000Z')
  })

  it('시각이 없는 YYYY-MM-DD 입력은 UTC 자정(00:00:00.000Z)으로 파싱한다', () => {
    const parsed = parseEventDate('1950-06-25')
    expect(parsed?.date?.toISOString()).toBe('1950-06-25T00:00:00.000Z')
  })

  it('year 또는 month 정밀도이면 시각이 들어와도 자정(00:00:00.000Z)으로 정규화한다', () => {
    const yearPrecision = parseEventDate('1950-06-25T14:30:00.000Z', 'year')
    expect(yearPrecision?.date?.toISOString()).toBe('1950-06-25T00:00:00.000Z')

    const monthPrecision = parseEventDate('1950-06-25T14:30:00.000Z', 'month')
    expect(monthPrecision?.date?.toISOString()).toBe('1950-06-25T00:00:00.000Z')
  })

  it('BC(음수 연도)와 AD 1000년 이전은 date=null로 두고 구조화 필드를 채운다', () => {
    const bc = parseEventDate('-0044-03-15T00:00:00.000Z')
    expect(bc).toEqual({
      date: null,
      era: 'BC',
      year: 44,
      month: 3,
      day: 15,
    })
    expect(formatEventDate(bc?.date, bc?.era, bc?.year, bc?.month, bc?.day)).toBe(
      '-0044-03-15',
    )
  })
})
