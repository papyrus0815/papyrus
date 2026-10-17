import { tenureProgressAt, tenureTotalYears, tenureYearAt } from './tenure-year'

describe('tenureYearAt', () => {
  const frederick = { startJulian: 1740.4, endJulian: 1786.6 }

  it('즉위한 해가 1년차', () => {
    expect(tenureYearAt(frederick, 1740)).toBe(1)
    expect(tenureYearAt(frederick, 1741)).toBe(2)
    expect(tenureYearAt(frederick, 1786)).toBe(47)
  })

  it('기간 밖이면 null', () => {
    expect(tenureYearAt(frederick, 1739)).toBeNull()
    expect(tenureYearAt(frederick, 1787)).toBeNull()
  })

  it('재임 중(끝 미정)은 상한 없이 센다', () => {
    expect(tenureYearAt({ startJulian: 2022.7, endJulian: null }, 2026)).toBe(5)
  })

  it('BC 연도도 정수 연차로 센다', () => {
    // BC 27 → BC 1 (음수 축은 floor가 더 작은 쪽으로 간다)
    expect(tenureYearAt({ startJulian: -27, endJulian: -1 }, -27)).toBe(1)
    expect(tenureYearAt({ startJulian: -27, endJulian: -1 }, -1)).toBe(27)
  })
})

describe('tenureProgressAt', () => {
  it('총 연수 대비 비율', () => {
    const bar = { startJulian: 1700, endJulian: 1709 }
    expect(tenureTotalYears(bar)).toBe(10)
    expect(tenureProgressAt(bar, 1704)).toBeCloseTo(0.5)
  })

  it('재임 중이면 진행률 없음', () => {
    expect(
      tenureProgressAt({ startJulian: 2000, endJulian: null }, 2010),
    ).toBeNull()
  })
})
