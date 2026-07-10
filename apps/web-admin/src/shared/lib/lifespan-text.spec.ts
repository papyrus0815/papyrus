/**
 * lifespan-text 단일 포맷터 테스트 — BC(음수 부호 연도)·미상·circa 경계.
 */
import { formatLifespan, formatSignedYear } from './lifespan-text'

describe('formatSignedYear', () => {
  it('AD는 그대로, BC는 접두', () => {
    expect(formatSignedYear(1500)).toBe('1500')
    expect(formatSignedYear(-44)).toBe('BC 44')
  })
})

describe('formatLifespan', () => {
  it('둘 다 있는 기본형', () => {
    expect(formatLifespan({ birthYear: 1500, deathYear: 1558 })).toBe('1500–1558')
  })

  it('BC 생몰', () => {
    expect(formatLifespan({ birthYear: -100, deathYear: -44 })).toBe('BC 100–BC 44')
  })

  it('BC 출생 → AD 사망', () => {
    expect(formatLifespan({ birthYear: -4, deathYear: 30 })).toBe('BC 4–30')
  })

  it('circa(추정) 접두', () => {
    expect(
      formatLifespan({ birthYear: 1500, deathYear: 1558, birthApproximate: true }),
    ).toBe('약 1500–1558')
  })

  it('사망 미상 — 기본은 물음표, 생존 표시는 열림', () => {
    expect(formatLifespan({ birthYear: 1500, deathYear: null })).toBe('1500–?')
    expect(formatLifespan({ birthYear: 1950, deathYear: null, isAlive: true })).toBe(
      '1950–',
    )
  })

  it('출생 미상', () => {
    expect(formatLifespan({ birthYear: null, deathYear: 1558 })).toBe('?–1558')
  })

  it('둘 다 미상이면 빈 문자열 (미상 문구는 호출부 책임)', () => {
    expect(formatLifespan({ birthYear: null, deathYear: null })).toBe('')
  })
})
