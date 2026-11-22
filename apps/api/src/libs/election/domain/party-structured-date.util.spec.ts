import { BadRequestException } from '@nestjs/common'

import {
  assertStructuredRangeOrder,
  parseStructuredDateInput,
  structuredDateData,
  structuredDateFromLegacyIso,
  structuredDateMirror,
  structuredDateSigned,
} from './party-structured-date.util'

describe('정당 구조화 날짜', () => {
  it('일 정밀 — 거울 DATETIME까지', () => {
    const columns = parseStructuredDateInput({ era: 'AD', year: 1921, month: 11, day: 9 }, '창당일')
    expect(columns).toEqual({ era: 'AD', year: 1921, month: 11, day: 9, precision: 'day' })
    expect(structuredDateMirror(columns)?.toISOString().slice(0, 10)).toBe('1921-11-09')
    expect(structuredDateSigned(columns)).toBe('1921-11-09')
  })

  it('기원전 연 정밀 — 거울은 비운다(드라이버 손상 방지)', () => {
    const columns = parseStructuredDateInput({ era: 'BC', year: 133 }, '창당일')
    expect(columns.precision).toBe('year')
    expect(structuredDateMirror(columns)).toBeNull()
    expect(structuredDateSigned(columns)).toBe('-0133-01-01')
  })

  it('1575년 분당 — 1000년 이후라 거울을 채운다', () => {
    const columns = parseStructuredDateInput({ era: 'AD', year: 1575 }, '창당일')
    expect(structuredDateMirror(columns)?.getUTCFullYear()).toBe(1575)
  })

  it('없는 날짜·월 없는 일·범위 밖 연도는 400', () => {
    expect(() => parseStructuredDateInput({ era: 'AD', year: 1921, month: 2, day: 30 }, '창당일')).toThrow(BadRequestException)
    expect(() => parseStructuredDateInput({ era: 'AD', year: 1921, day: 9 }, '창당일')).toThrow(BadRequestException)
    expect(() => parseStructuredDateInput({ era: 'AD', year: 0 }, '창당일')).toThrow(BadRequestException)
    expect(() => parseStructuredDateInput({ era: 'XX' as 'AD', year: 1921 }, '창당일')).toThrow(BadRequestException)
  })

  it('윤년 — 1900-02-29는 없고 2000-02-29는 있다', () => {
    expect(() => parseStructuredDateInput({ era: 'AD', year: 1900, month: 2, day: 29 }, 'x')).toThrow(BadRequestException)
    expect(parseStructuredDateInput({ era: 'AD', year: 2000, month: 2, day: 29 }, 'x').day).toBe(29)
  })

  it('null은 빈 칸(지우기)', () => {
    expect(structuredDateData('founded', parseStructuredDateInput(null, 'x'))).toEqual({
      foundedEra: null,
      foundedYear: null,
      foundedMonth: null,
      foundedDay: null,
      foundedPrecision: null,
    })
  })

  it('레거시 ISO(구 클라이언트) → 일 정밀', () => {
    expect(structuredDateFromLegacyIso('1921-11-09T12:00:00.000Z', '창당일')).toMatchObject({
      era: 'AD',
      year: 1921,
      month: 11,
      day: 9,
      precision: 'day',
    })
  })

  it('역전 검사 — 같은 해의 연 정밀 끝은 역전이 아니다, 기원전 끝이 서기 시작보다 앞이면 역전', () => {
    const start = parseStructuredDateInput({ era: 'AD', year: 1920, month: 3, day: 15 }, 'x')
    expect(() =>
      assertStructuredRangeOrder(start, parseStructuredDateInput({ era: 'AD', year: 1920 }, 'x'), '역전'),
    ).not.toThrow()
    expect(() =>
      assertStructuredRangeOrder(
        parseStructuredDateInput({ era: 'AD', year: 10 }, 'x'),
        parseStructuredDateInput({ era: 'BC', year: 10 }, 'x'),
        '역전',
      ),
    ).toThrow(BadRequestException)
  })
})
