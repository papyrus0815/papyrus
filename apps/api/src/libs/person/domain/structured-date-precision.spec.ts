import {
  applyDatePrecision,
  mapStructuredDateInput,
  structuredDateKey,
  toSignedDateString,
} from './structured-date.util'

describe('연보·국가 소속 구조화 날짜', () => {
  it('기원전 ISO를 구조화로 읽고 DATETIME은 비운다', () => {
    const parsed = mapStructuredDateInput(null, '-0044-03-15')
    expect(parsed).toMatchObject({ era: 'BC', year: 44, month: 3, day: 15, date: null })
  })

  it('정밀도 year/month면 그 아래 단위를 비우고 DATETIME도 맞춰 다시 만든다', () => {
    const yearOnly = applyDatePrecision(mapStructuredDateInput(null, '1773-09-01'), 'year')
    expect(yearOnly).toMatchObject({ year: 1773, month: null, day: null, precision: 'year' })
    expect(yearOnly.date?.toISOString()).toBe('1773-01-01T00:00:00.000Z')
    const monthOnly = applyDatePrecision(mapStructuredDateInput(null, '1773-09-17'), 'month')
    expect(monthOnly).toMatchObject({ month: 9, day: null })
  })

  it('서기 1000년 이전은 DATETIME을 채우지 않는다(손상 방지)', () => {
    const early = applyDatePrecision(mapStructuredDateInput(null, '0476-09-04'), 'day')
    expect(early).toMatchObject({ era: 'AD', year: 476, date: null })
  })

  it('응답용 부호 날짜 문자열 — 모르는 월·일은 01', () => {
    expect(toSignedDateString('BC', 44, 3, 15)).toBe('-0044-03-15')
    expect(toSignedDateString('AD', 1773, null, null)).toBe('1773-01-01')
    expect(toSignedDateString('AD', null, null, null)).toBeNull()
  })

  it('비교 키는 기원전이 서기보다 앞선다', () => {
    const bc = structuredDateKey('BC', 44, 3, 15)!
    const ad = structuredDateKey('AD', 14, 8, 19)!
    expect(bc).toBeLessThan(ad)
    expect(structuredDateKey('BC', 100, null, null)!).toBeLessThan(bc)
  })
})
