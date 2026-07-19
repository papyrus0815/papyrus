/**
 * country-period 포맷터·비교기 테스트 — BC 부호 연도·종료 미상·혼재 정렬 경계.
 * 정렬 케이스는 DB 실데이터(로마 계열 4국)를 그대로 쓴다.
 */
import {
  compareByCountryStart,
  describeLifespanMismatch,
  formatCountryPeriod,
  formatCountryYear,
  getCountryDurationYears,
  getCountryYearRange,
  signedYearFromIsoLike,
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

describe('signedYearFromIsoLike', () => {
  it('AD는 양수', () => {
    expect(signedYearFromIsoLike('1950-01-01')).toBe(1950)
    expect(signedYearFromIsoLike('1392-07-17')).toBe(1392)
  })

  it('앞의 -는 BC(음수)', () => {
    expect(signedYearFromIsoLike('-0753-01-01')).toBe(-753)
    expect(signedYearFromIsoLike('-27-12-31')).toBe(-27)
  })

  it('빈 값·미상은 null', () => {
    expect(signedYearFromIsoLike('')).toBeNull()
    expect(signedYearFromIsoLike(null)).toBeNull()
    expect(signedYearFromIsoLike(undefined)).toBeNull()
  })
})

describe('describeLifespanMismatch', () => {
  const JOSEON = { startEra: 'AD', startYear: 1392, endEra: 'AD', endYear: 1897 }

  it('AD 국가: 존속 안이면 null', () => {
    expect(describeLifespanMismatch(JOSEON, 1500)).toBeNull()
    expect(describeLifespanMismatch(JOSEON, 1392)).toBeNull()
    expect(describeLifespanMismatch(JOSEON, 1897)).toBeNull()
  })

  it('AD 국가: 종료 이후는 경고', () => {
    expect(describeLifespanMismatch(JOSEON, 1950)).toBe('존속 기간(1392년 – 1897년) 밖입니다')
  })

  it('AD 국가: 시작 이전은 경고', () => {
    expect(describeLifespanMismatch(JOSEON, 1000)).toBe('존속 기간(1392년 – 1897년) 밖입니다')
  })

  it('기록 연도 미상이면 판정 안 함(null)', () => {
    expect(describeLifespanMismatch(JOSEON, null)).toBeNull()
    expect(describeLifespanMismatch(JOSEON, undefined)).toBeNull()
  })

  it('BC 전용 국가 + AD 기록(재위·재임): 비교 불가라 경고 안 함', () => {
    // 로마 공화국 BC509–BC27, 재위 startDate는 AD only(blockBc) → 소음 방지 위해 무경고
    const romanRepublic = { startEra: 'BC', startYear: 509, endEra: 'BC', endYear: 27 }
    expect(describeLifespanMismatch(romanRepublic, 1500)).toBeNull()
  })

  it('BC→AD 횡단 국가 + AD 기록: AD 종료 경계만 비교', () => {
    // 로마 제국 BC27–AD395
    const romanEmpire = { startEra: 'BC', startYear: 27, endEra: 'AD', endYear: 395 }
    expect(describeLifespanMismatch(romanEmpire, 100)).toBeNull() // 안
    expect(describeLifespanMismatch(romanEmpire, 500)).toBe('존속 기간(기원전 27년 – 395년) 밖입니다')
  })

  it('종료 미상(열린 구간)이면 시작 경계만 비교', () => {
    const openEnded = { startEra: 'AD', startYear: 1000 }
    expect(describeLifespanMismatch(openEnded, 1500)).toBeNull() // 종료 모름 → 상한 미판정
    expect(describeLifespanMismatch(openEnded, 800)).toBe('존속 기간(1000년 – 미상) 밖입니다')
  })

  it('recordSupportsBc=true(사건): BC 경계도 유의미하게 비교', () => {
    // 로마 제국 BC27–AD395, 사건은 BC 담을 수 있음
    const romanEmpire = { startEra: 'BC', startYear: 27, endEra: 'AD', endYear: 395 }
    // BC 100(-100)은 건국(BC27) 이전 → 경고
    expect(describeLifespanMismatch(romanEmpire, -100, { recordSupportsBc: true })).toBe(
      '존속 기간(기원전 27년 – 395년) 밖입니다',
    )
    // BC 10(-10)은 존속 안 → null
    expect(describeLifespanMismatch(romanEmpire, -10, { recordSupportsBc: true })).toBeNull()
    // BC 전용 국가에 AD 사건도 경고(사건은 부호 전 구간 비교)
    const romanRepublic = { startEra: 'BC', startYear: 509, endEra: 'BC', endYear: 27 }
    expect(describeLifespanMismatch(romanRepublic, 1500, { recordSupportsBc: true })).toBe(
      '존속 기간(기원전 509년 – 기원전 27년) 밖입니다',
    )
  })

  it('존속기간 전부 미상이면 판정 안 함(null)', () => {
    expect(describeLifespanMismatch({}, 1500)).toBeNull()
  })
})
