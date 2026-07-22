/**
 * iso-date 헬퍼 단위 테스트 — BC(음수 연도)·경계·미상 케이스 집중.
 * 사건 리스트 정렬/세기 그룹이 의존하는 load-bearing 유틸이라 회귀 방지가 중요.
 */
import {
  centuryYearRange,
  compareByDate,
  dateSortKey,
  formatCenturyLabel,
  formatDateWithPrecision,
  getCentury,
  getCenturyFromIso,
  getDecade,
  isoDaySpan,
  isoYearSpan,
  parseIsoDateParts,
  stepCentury,
} from './iso-date'

describe('parseIsoDateParts', () => {
  it('AD 날짜를 TZ 무관하게 파싱', () => {
    expect(parseIsoDateParts('2024-07-04T00:00:00.000Z')).toMatchObject({
      year: 2024,
      month: 7,
      day: 4,
    })
  })

  it('BC(음수) 날짜의 부호를 보존', () => {
    expect(parseIsoDateParts('-0044-03-15')).toMatchObject({
      year: -44,
      month: 3,
      day: 15,
    })
  })

  it('빈/널/파싱불가는 null', () => {
    expect(parseIsoDateParts('')).toBeNull()
    expect(parseIsoDateParts(null)).toBeNull()
    expect(parseIsoDateParts(undefined)).toBeNull()
    expect(parseIsoDateParts('not-a-date')).toBeNull()
  })
})

describe('getCentury', () => {
  it('양수 연도 — ceil 기반', () => {
    expect(getCentury(1)).toBe(1)
    expect(getCentury(100)).toBe(1) // 100년 = 1세기
    expect(getCentury(101)).toBe(2)
    expect(getCentury(1900)).toBe(19) // 끝자리 00 정합 (floor+1의 20과 다름)
    expect(getCentury(1901)).toBe(20)
    expect(getCentury(2000)).toBe(20)
    expect(getCentury(2001)).toBe(21)
  })

  it('BC(음수)·연도0 — 음수 세기', () => {
    expect(getCentury(-1)).toBe(-1) // 1 BC = 기원전 1세기
    expect(getCentury(-44)).toBe(-1) // 44 BC = 기원전 1세기
    expect(getCentury(-100)).toBe(-1) // 100 BC = 기원전 1세기
    expect(getCentury(-101)).toBe(-2) // 101 BC = 기원전 2세기
    expect(getCentury(0)).toBe(-1) // 연도 0 ≈ 1 BC
  })
})

describe('centuryYearRange — getCentury의 역함수 (toYear 배타)', () => {
  it('AD 세기 경계', () => {
    expect(centuryYearRange(16)).toEqual({ fromYear: 1501, toYear: 1601 })
    expect(centuryYearRange(1)).toEqual({ fromYear: 1, toYear: 101 })
    expect(centuryYearRange(20)).toEqual({ fromYear: 1901, toYear: 2001 })
  })

  it('BC 세기 경계 (음수 세기)', () => {
    expect(centuryYearRange(-1)).toEqual({ fromYear: -100, toYear: 0 })
    expect(centuryYearRange(-2)).toEqual({ fromYear: -200, toYear: -100 })
  })

  it('범위 내 모든 연도가 getCentury로 되돌아감 (왕복 정합)', () => {
    for (const century of [16, 1, -1, -2]) {
      const { fromYear, toYear } = centuryYearRange(century)
      expect(getCentury(fromYear)).toBe(century)
      expect(getCentury(toYear - 1)).toBe(century)
    }
  })
})

describe('stepCentury — 0세기 건너뛰기', () => {
  it('AD/BC 내부 이동', () => {
    expect(stepCentury(16, 1)).toBe(17)
    expect(stepCentury(16, -1)).toBe(15)
    expect(stepCentury(-2, 1)).toBe(-1)
  })

  it('-1세기 ↔ 1세기 경계에서 0을 건너뜀', () => {
    expect(stepCentury(-1, 1)).toBe(1)
    expect(stepCentury(1, -1)).toBe(-1)
  })
})

describe('formatCenturyLabel', () => {
  it('AD/BC 라벨', () => {
    expect(formatCenturyLabel(16)).toBe('16세기')
    expect(formatCenturyLabel(-1)).toBe('기원전 1세기')
  })
})

describe('getCenturyFromIso', () => {
  it('ISO → 세기, 미상은 null', () => {
    expect(getCenturyFromIso('1950-01-01')).toBe(20)
    expect(getCenturyFromIso('-0044-03-15')).toBe(-1)
    expect(getCenturyFromIso('')).toBeNull()
    expect(getCenturyFromIso(null)).toBeNull()
  })
})

describe('getDecade', () => {
  it('연대 시작 연도', () => {
    expect(getDecade(1995)).toBe(1990)
    expect(getDecade(2000)).toBe(2000)
    expect(getDecade(-44)).toBe(-50)
  })
})

describe('dateSortKey & compareByDate', () => {
  it('정수 키로 BC→AD 순서 보존', () => {
    const bc = dateSortKey('-0044-03-15')!
    const ad = dateSortKey('1950-01-01')!
    expect(bc).toBeLessThan(ad)
  })

  it('미상(null)은 오름차순 비교에서 항상 뒤로', () => {
    expect(dateSortKey('')).toBeNull()
    // a가 미상 → b보다 뒤(양수)
    expect(compareByDate('', '1950-01-01', 'asc')).toBeGreaterThan(0)
    // b가 미상 → a가 앞(음수)
    expect(compareByDate('1950-01-01', '', 'asc')).toBeLessThan(0)
  })

  it('같은 연도 내 월/일 순서', () => {
    expect(compareByDate('1950-01-01', '1950-12-31', 'asc')).toBeLessThan(0)
    expect(compareByDate('1950-12-31', '1950-01-01', 'asc')).toBeGreaterThan(0)
  })

  it('내림차순은 부호 반전(미상 제외)', () => {
    expect(compareByDate('1950-01-01', '1960-01-01', 'desc')).toBeGreaterThan(0)
  })
})

describe('isoYearSpan', () => {
  it('AD 기간', () => {
    expect(isoYearSpan('1939-09-01', '1945-09-02')).toBe(6)
  })

  it('BC→AD 횡단 기간', () => {
    expect(isoYearSpan('-0050-01-01', '0050-01-01')).toBe(100)
  })

  it('end 없거나 파싱 불가면 0', () => {
    expect(isoYearSpan('1939-09-01', undefined)).toBe(0)
    expect(isoYearSpan('', '1945-01-01')).toBe(0)
  })
})

describe('isoDaySpan', () => {
  it('AD 일수', () => {
    expect(isoDaySpan('2024-01-01', '2024-01-11')).toBe(10)
  })

  it('BC(음수) 동일 시대 일수 — 네이티브 Date NaN 회귀 방지', () => {
    // new Date('-0220-01-01')은 Invalid Date(NaN)라 일수 계산이 깨졌었다.
    expect(isoDaySpan('-0220-01-01', '-0220-01-11')).toBe(10)
  })

  it('순서 무관(절댓값)', () => {
    expect(isoDaySpan('2024-01-11', '2024-01-01')).toBe(10)
  })

  it('BC→AD 횡단도 유한 양수', () => {
    const span = isoDaySpan('-0050-01-01', '0050-01-01')
    expect(span).not.toBeNull()
    expect(span as number).toBeGreaterThan(36000) // ~100년
  })

  it('end 없거나 파싱 불가면 null', () => {
    expect(isoDaySpan('2024-01-01', undefined)).toBeNull()
    expect(isoDaySpan('', '2024-01-01')).toBeNull()
  })
})

describe('formatDateWithPrecision — BC(음수 연도) 기원전 표기 (P3-4)', () => {
  it('BC 연도를 "기원전 N년"으로 표기(하위 카드 "-44년" 회귀 방지)', () => {
    expect(formatDateWithPrecision('-0044-03-15', 'year')).toBe('기원전 44년')
    expect(formatDateWithPrecision('-0044-03-15', 'month')).toBe('기원전 44년 3월')
    expect(formatDateWithPrecision('-0044-03-15', 'day')).toBe(
      '기원전 44년 3월 15일',
    )
  })

  it('AD 연도는 접두 없이 그대로', () => {
    expect(formatDateWithPrecision('1789-07-14', 'day')).toBe('1789년 7월 14일')
    expect(formatDateWithPrecision('1789-07-14', 'year')).toBe('1789년')
  })

  it('precision 미지정은 day로 간주', () => {
    expect(formatDateWithPrecision('-0044-03-15')).toBe('기원전 44년 3월 15일')
  })
})
