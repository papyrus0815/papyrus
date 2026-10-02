import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { decimalToString, normalizeObservationValue } from './observation-value'
import {
  assertPointOrder,
  columnsToPoint,
  normalizePoint,
  parseLegacyIsoPoint,
  pointSortKey,
  pointToLegacyDateTime,
} from '../../shared/structured-point'

describe('normalizePoint', () => {
  it('채워진 칸에서 정밀도를 파생한다', () => {
    expect(normalizePoint({ era: 'AD', year: 1453 }, 'start').precision).toBe('year')
    expect(normalizePoint({ era: 'AD', year: 1453, month: 5 }, 'start').precision).toBe('month')
    expect(normalizePoint({ era: 'AD', year: 1453, month: 5, day: 29 }, 'start').precision).toBe('day')
  })

  it('BC와 서기 1~99년을 그대로 담는다(DATETIME 둔갑 없음)', () => {
    expect(normalizePoint({ era: 'BC', year: 216, month: 8, day: 2 }, 'start')).toEqual({
      era: 'BC',
      year: 216,
      month: 8,
      day: 2,
      precision: 'day',
    })
    expect(normalizePoint({ era: 'AD', year: 44 }, 'start').year).toBe(44)
  })

  it('잘못된 조합은 400', () => {
    expect(() => normalizePoint({ era: 'AD', year: 0 }, 'start')).toThrow(BadRequestException)
    expect(() => normalizePoint({ era: 'AD', year: -5 }, 'start')).toThrow(BadRequestException)
    expect(() => normalizePoint({ era: 'AD', year: 1900, day: 3 }, 'start')).toThrow(BadRequestException)
    expect(() => normalizePoint({ era: 'AD', year: 1900, month: 2, day: 29 }, 'start')).toThrow(
      BadRequestException,
    )
    expect(normalizePoint({ era: 'AD', year: 2000, month: 2, day: 29 }, 'start').day).toBe(29)
  })

  it('BC 연도는 앞선 시점으로 정렬된다', () => {
    const bc = normalizePoint({ era: 'BC', year: 44 }, 'start')
    const ad = normalizePoint({ era: 'AD', year: 44 }, 'start')
    expect(pointSortKey(bc)).toBeLessThan(pointSortKey(ad))
  })

  it('끝이 시작보다 이르면 400, 끝만 있어도 400', () => {
    const start = normalizePoint({ era: 'AD', year: 1870, month: 7 }, 'start')
    const before = normalizePoint({ era: 'AD', year: 1870, month: 6 }, 'end')
    expect(() => assertPointOrder(start, before)).toThrow(BadRequestException)
    expect(() => assertPointOrder(null, before)).toThrow(BadRequestException)
    expect(() => assertPointOrder(start, start)).not.toThrow()
  })

  it('칼럼 → 시점 왕복', () => {
    expect(columnsToPoint({ era: null, year: null, month: null, day: null })).toBeNull()
    expect(columnsToPoint({ era: 'AD', year: 1453, month: 5, day: null })?.precision).toBe('month')
  })
})

describe('normalizeObservationValue', () => {
  it("'약 18,000~20,000' — 쉼표를 허용하고 범위로 담는다", () => {
    const result = normalizeObservationValue({ low: '18,000', high: '20000', approx: true })
    expect(decimalToString(result.low)).toBe('18000')
    expect(decimalToString(result.high)).toBe('20000')
    expect(result.value).toBeNull()
    expect(result.approx).toBe(true)
  })

  it('금액·소수 자릿수를 잃지 않는다', () => {
    const big = normalizeObservationValue({ value: '45000000000000' })
    expect(decimalToString(big.value)).toBe('45000000000000')
    const rate = normalizeObservationValue({ value: '4.125' })
    expect(decimalToString(rate.value)).toBe('4.125')
  })

  it('값이 하나도 없으면 400', () => {
    expect(() => normalizeObservationValue({})).toThrow(BadRequestException)
  })

  it('범위 모순은 400', () => {
    expect(() => normalizeObservationValue({ low: '10', high: '5' })).toThrow(BadRequestException)
    expect(() => normalizeObservationValue({ value: '3', low: '5' })).toThrow(BadRequestException)
    expect(() => normalizeObservationValue({ value: '30', high: '20' })).toThrow(BadRequestException)
    expect(() => normalizeObservationValue({ low: '1000', high: '2000', atLeast: true })).toThrow(
      BadRequestException,
    )
  })

  it('숫자가 아니면 400', () => {
    expect(() => normalizeObservationValue({ value: '약 14만' })).toThrow(BadRequestException)
  })

  it("'1,000 이상'", () => {
    const result = normalizeObservationValue({ low: '1,000', atLeast: true })
    expect(result.atLeast).toBe(true)
    expect(result.low).toEqual(new Prisma.Decimal(1000))
  })
})

describe('레거시 날짜 변환', () => {
  it('ISO 문자열을 손으로 파싱한다 — BC 둔갑 없음', () => {
    expect(parseLegacyIsoPoint('1870-07-19T07:52:58.000Z', 'start')).toMatchObject({ era: 'AD', year: 1870, month: 7, day: 19 })
    expect(parseLegacyIsoPoint('0382-10-03', 'start')).toMatchObject({ era: 'AD', year: 382 })
    expect(parseLegacyIsoPoint('-0044-03-15', 'start')).toMatchObject({ era: 'BC', year: 45 })
  })

  it('DATETIME 사본은 AD 1000+ 완전한 날짜만', () => {
    expect(pointToLegacyDateTime(normalizePoint({ era: 'AD', year: 1870, month: 7, day: 19 }, 's'))?.toISOString()).toBe('1870-07-19T00:00:00.000Z')
    expect(pointToLegacyDateTime(normalizePoint({ era: 'AD', year: 382, month: 10, day: 3 }, 's'))).toBeNull()
    expect(pointToLegacyDateTime(normalizePoint({ era: 'AD', year: 1870 }, 's'))).toBeNull()
    expect(pointToLegacyDateTime(normalizePoint({ era: 'BC', year: 44, month: 3, day: 15 }, 's'))).toBeNull()
  })
})
