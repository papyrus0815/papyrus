/**
 * 국가 피커 공용 검색·시대힌트 유틸 테스트 (F19②·F42).
 * 핵심 계약: 검색은 영문명까지, 힌트는 **정렬만** 바꾸고 절대 제외하지 않는다.
 */
import {
  boostByHintYearRange,
  filterCountriesByQuery,
  formatHintYearRange,
  isHintYearRangeUsable,
  matchesCountryQuery,
  matchesHintYearRange,
  normalizeCountryQuery,
} from './country-picker-filter'

const holyRoman = {
  id: 'hre',
  name: '신성 로마 제국',
  enName: 'Holy Roman Empire',
  startEra: 'AD',
  startYear: 962,
  endEra: 'AD',
  endYear: 1806,
}
const prussia = {
  id: 'prussia',
  name: '프로이센',
  enName: 'Kingdom of Prussia',
  startEra: 'AD',
  startYear: 1701,
  endEra: 'AD',
  endYear: 1918,
}
const romanKingdom = {
  id: 'roman-kingdom',
  name: '로마 왕국',
  enName: 'Roman Kingdom',
  startEra: 'BC',
  startYear: 753,
  endEra: 'BC',
  endYear: 509,
}
const unknownPeriod = {
  id: 'unknown',
  name: '기록 미상국',
  startYear: null,
  endYear: null,
}

describe('검색 스펙 통일(F19②)', () => {
  it('영문명으로 찾을 수 있다 — 피커마다 0건이던 문제', () => {
    expect(
      matchesCountryQuery(holyRoman, normalizeCountryQuery('  Holy Roman  ')),
    ).toBe(true)
    expect(matchesCountryQuery(prussia, 'prussia')).toBe(true)
  })

  it('현지명·ISO 코드도 최소 공통 스펙에 포함된다', () => {
    const korea = {
      name: '대한민국',
      localName: '한국',
      isoCode: 'KR',
      startYear: null,
    }
    expect(matchesCountryQuery(korea, '한국')).toBe(true)
    expect(matchesCountryQuery(korea, 'kr')).toBe(true)
  })

  it('호출부가 준 대륙명으로도 매칭된다', () => {
    expect(matchesCountryQuery(prussia, '유럽')).toBe(false)
    expect(matchesCountryQuery(prussia, '유럽', '유럽')).toBe(true)
  })

  it('검색어가 비면 원본 배열을 그대로 돌려준다(참조 유지)', () => {
    const list = [holyRoman, prussia]
    expect(filterCountriesByQuery(list, '   ')).toBe(list)
  })

  it('일치하지 않는 항목은 제외된다', () => {
    expect(filterCountriesByQuery([holyRoman, prussia], 'prussia')).toEqual([
      prussia,
    ])
  })
})

describe('시대 힌트(F42)', () => {
  it('경계가 하나도 없으면 힌트를 쓰지 않는다', () => {
    expect(isHintYearRangeUsable(undefined)).toBe(false)
    expect(isHintYearRangeUsable({ startYear: null, endYear: null })).toBe(false)
    expect(isHintYearRangeUsable({ startYear: 1550 })).toBe(true)
  })

  it('생몰년과 존속기간이 겹치면 일치', () => {
    const hint = { startYear: 1712, endYear: 1786 } // 프리드리히 2세
    expect(matchesHintYearRange(prussia, hint)).toBe(true)
    expect(matchesHintYearRange(holyRoman, hint)).toBe(true)
    expect(matchesHintYearRange(romanKingdom, hint)).toBe(false)
  })

  it('BC 인물은 BC 국가와 겹친다 — 부호 연도 비교', () => {
    const hint = { startYear: -700, endYear: -650 }
    expect(matchesHintYearRange(romanKingdom, hint)).toBe(true)
    expect(matchesHintYearRange(prussia, hint)).toBe(false)
  })

  it('존속기간 정보가 전혀 없으면 부스트 대상이 아니다(제외는 아님)', () => {
    expect(matchesHintYearRange(unknownPeriod, { startYear: 1550 })).toBe(false)
  })

  it('겹치는 국가를 앞으로만 옮기고 아무것도 버리지 않는다', () => {
    const list = [romanKingdom, unknownPeriod, prussia, holyRoman]
    const boosted = boostByHintYearRange(list, {
      startYear: 1712,
      endYear: 1786,
    })
    expect(boosted).toHaveLength(list.length)
    expect(boosted.map((country) => country.id)).toEqual([
      'prussia',
      'hre',
      'roman-kingdom',
      'unknown',
    ])
  })

  it('힌트가 없으면 순서를 건드리지 않는다', () => {
    const list = [romanKingdom, prussia]
    expect(boostByHintYearRange(list, undefined)).toBe(list)
  })

  it('일치가 하나도 없으면 원본 배열을 그대로 둔다', () => {
    const list = [romanKingdom]
    expect(boostByHintYearRange(list, { startYear: 1900 })).toBe(list)
  })

  it('힌트 범위 라벨 — 한쪽만 알면 이후/이전으로 표기', () => {
    expect(formatHintYearRange({ startYear: -100, endYear: -44 })).toBe(
      'BC 100–BC 44',
    )
    expect(formatHintYearRange({ startYear: 1550 })).toBe('1550 이후')
    expect(formatHintYearRange({ endYear: 1610 })).toBe('1610 이전')
    expect(formatHintYearRange(null)).toBe('')
  })
})
