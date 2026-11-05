import {
  ageBetweenYears,
  deriveTenureFallbackLabel,
  getAgeAtDate,
} from './helpers'

describe('ageBetweenYears — 향년(만 나이)', () => {
  it('연도만 알면 연도 차이', () => {
    expect(ageBetweenYears(1900, 'AD', 1956, 'AD')).toBe(56)
  })

  it('생일 전에 죽었으면 한 살 적다 — 카이사르(BC 100.7.12 ~ BC 44.3.15)는 55세', () => {
    const monthDay = { birthMonth: 7, birthDay: 12, deathMonth: 3, deathDay: 15 }
    expect(ageBetweenYears(100, 'BC', 44, 'BC', monthDay)).toBe(55)
  })

  it('같은 달이면 일로 판단, 생일 당일은 나이를 먹은 것', () => {
    expect(ageBetweenYears(1900, 'AD', 1950, 'AD', { birthMonth: 5, birthDay: 20, deathMonth: 5, deathDay: 19 })).toBe(49)
    expect(ageBetweenYears(1900, 'AD', 1950, 'AD', { birthMonth: 5, birthDay: 20, deathMonth: 5, deathDay: 20 })).toBe(50)
  })

  it('BC→AD는 0년이 없다 — BC 1 → AD 1은 1세', () => {
    expect(ageBetweenYears(1, 'BC', 1, 'AD')).toBe(1)
  })

  it('한쪽 월이 없으면 보정하지 않는다', () => {
    expect(ageBetweenYears(1900, 'AD', 1950, 'AD', { birthMonth: 7, deathMonth: null })).toBe(50)
  })
})

describe('getAgeAtDate — 정밀도(year/month/day) 인지 만 나이', () => {
  it('연(year) 정밀도는 합성 01-01 때문에 2~12월생 나이를 1세 차감하지 않는다', () => {
    expect(getAgeAtDate(1638, 9, 5, '1643-01-01', 'AD', 'year')).toBe(5)
    expect(getAgeAtDate(1638, 9, 5, '1643-05-14', 'AD', 'day')).toBe(4)
  })

  it('월(month) 정밀도는 같은 달일 때 합성 01일 때문에 1세 차감하지 않는다', () => {
    expect(getAgeAtDate(1900, 5, 20, '1950-05-01', 'AD', 'month')).toBe(50)
    expect(getAgeAtDate(1900, 5, 20, '1950-04-01', 'AD', 'month')).toBe(49)
  })
})

describe('deriveTenureFallbackLabel — 기원전(BC) 부호 보존', () => {
  it('기원전 재위 구간을 역전 없이 기원전으로 표기한다', () => {
    expect(
      deriveTenureFallbackLabel([
        {
          kind: 'reign',
          data: { startDate: '-0221-01-01', endDate: '-0210-07-01' },
        },
      ]),
    ).toBe('재위 기원전 221년 ~ 기원전 210년')
  })

  it('기원전→기원후 교차 재위 구간도 정확히 표기한다', () => {
    expect(
      deriveTenureFallbackLabel([
        {
          kind: 'reign',
          data: { startDate: '-0027-01-16', endDate: '0014-08-19' },
        },
      ]),
    ).toBe('재위 기원전 27년 ~ 14년')
  })
})
