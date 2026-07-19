/**
 * country-period 포맷터·비교기 테스트 — BC 부호 연도·종료 미상·혼재 정렬 경계.
 * 정렬 케이스는 DB 실데이터(로마 계열 4국)를 그대로 쓴다.
 */
import {
  compareByCountryStart,
  formatCountryPeriod,
  formatCountryYear,
  getCountryDurationYears,
  getCountryYearRange,
  toSignedYear,
} from './country-period'

const ROMAN_KINGDOM = { name: '로마 왕국', startEra: 'BC', startYear: 753, endEra: 'BC', endYear: 509 }
const ROMAN_REPUBLIC = { name: '로마 공화국', startEra: 'BC', startYear: 509, endEra: 'BC', endYear: 27 }
const ROMAN_EMPIRE = { name: '로마 제국', startEra: 'BC', startYear: 27, endEra: 'AD', endYear: 395 }
const GERMANIA = { name: '게르마니아', startEra: 'BC', startYear: 100, endEra: 'AD', endYear: 500 }

describe('toSignedYear', () => {
  it('BC는 음수, AD·미지정은 양수', () => {
    expect(toSignedYear('BC', 753)).toBe(-753)
    expect(toSignedYear('AD', 1392)).toBe(1392)
    expect(toSignedYear(null, 1392)).toBe(1392)
  })

  it('연도 미상은 0이 아니라 null (BC 1년과 충돌 방지)', () => {
    expect(toSignedYear('BC', null)).toBeNull()
    expect(toSignedYear('AD', undefined)).toBeNull()
  })
})

describe('getCountryYearRange', () => {
  it('BC→AD 횡단 범위', () => {
    expect(getCountryYearRange(ROMAN_EMPIRE)).toEqual({ start: -27, end: 395 })
  })

  it('양쪽 미상이면 null 쌍', () => {
    expect(getCountryYearRange({})).toEqual({ start: null, end: null })
  })
})

describe('formatCountryYear', () => {
  it('BC 접두', () => {
    expect(formatCountryYear(-753)).toBe('기원전 753년')
    expect(formatCountryYear(1392)).toBe('1392년')
    expect(formatCountryYear(null)).toBeNull()
  })
})

describe('formatCountryPeriod', () => {
  it('BC 구간', () => {
    expect(formatCountryPeriod(ROMAN_KINGDOM)).toBe('기원전 753년 – 기원전 509년')
  })

  it('BC→AD 횡단', () => {
    expect(formatCountryPeriod(ROMAN_EMPIRE)).toBe('기원전 27년 – 395년')
  })

  it("종료 미상은 '현재'가 아니라 '미상'", () => {
    expect(formatCountryPeriod({ startEra: 'BC', startYear: 100 })).toBe('기원전 100년 – 미상')
  })

  it('시작 미상', () => {
    expect(formatCountryPeriod({ endEra: 'AD', endYear: 476 })).toBe('미상 – 476년')
  })

  it('양쪽 미상이면 빈 문자열(기본)', () => {
    expect(formatCountryPeriod({})).toBe('')
    expect(formatCountryPeriod({}, { emptyText: '연대 미상' })).toBe('연대 미상')
  })

  it('short 변형', () => {
    expect(formatCountryPeriod(ROMAN_KINGDOM, { variant: 'short' })).toBe('BC 753–BC 509')
  })
})

describe('getCountryDurationYears', () => {
  it('BC→AD 횡단도 정확', () => {
    expect(getCountryDurationYears(ROMAN_EMPIRE)).toBe(422)
  })

  it('BC끼리', () => {
    expect(getCountryDurationYears(ROMAN_KINGDOM)).toBe(244)
  })

  it('한쪽 미상이면 null', () => {
    expect(getCountryDurationYears({ startEra: 'BC', startYear: 100 })).toBeNull()
  })
})

describe('compareByCountryStart', () => {
  it('BC끼리는 큰 숫자가 먼저', () => {
    expect([ROMAN_REPUBLIC, ROMAN_KINGDOM].sort(compareByCountryStart).map((country) => country.name)).toEqual([
      '로마 왕국',
      '로마 공화국',
    ])
  })

  it('BC↔AD 혼재 실데이터 4국 시간순', () => {
    const sorted = [ROMAN_EMPIRE, GERMANIA, ROMAN_REPUBLIC, ROMAN_KINGDOM]
      .sort(compareByCountryStart)
      .map((country) => country.name)
    expect(sorted).toEqual(['로마 왕국', '로마 공화국', '게르마니아', '로마 제국'])
  })

  it('시작 미상은 뒤로', () => {
    const sorted = [{ name: '미상국', startYear: null }, ROMAN_KINGDOM].sort(compareByCountryStart).map((country) => country.name)
    expect(sorted).toEqual(['로마 왕국', '미상국'])
  })

  it('시작이 같으면 종료로 tie-break', () => {
    const shorter = { name: '짧음', startEra: 'BC', startYear: 500, endEra: 'BC', endYear: 400 }
    const longer = { name: '김', startEra: 'BC', startYear: 500, endEra: 'AD', endYear: 100 }
    expect([longer, shorter].sort(compareByCountryStart).map((country) => country.name)).toEqual(['짧음', '김'])
  })
})
