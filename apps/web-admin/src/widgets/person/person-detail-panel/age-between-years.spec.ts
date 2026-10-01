import { ageBetweenYears } from './helpers'

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
