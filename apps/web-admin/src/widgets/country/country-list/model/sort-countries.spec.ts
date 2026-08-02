/**
 * compareBySort — 국가 목록 정렬 비교자(F3).
 * 핵심: 검색 합류로 현대·역사가 섞여도 UI의 정렬 선택과 실제 순서가 어긋나지 않아야 하며,
 * 인구·면적이 없는 항목(역사 국가 등)은 조용히 앞으로 끼지 않고 끝으로 밀린다.
 */
import type { UnifiedCountry } from '@/entities/country/model/unified-types'

import { compareBySort } from './sort-countries'

function modern(
  name: string,
  fields: Partial<UnifiedCountry> = {},
): UnifiedCountry {
  return { id: name, name, type: 'modern', ...fields }
}

function historical(name: string): UnifiedCountry {
  // 역사 국가는 population·areaSqKm가 없다
  return { id: name, name, type: 'historical' }
}

describe('compareBySort — 이름순', () => {
  it('한국어 로케일 이름 오름차순', () => {
    const list = [modern('나라'), modern('가나'), modern('다라')]
    const sorted = [...list].sort(compareBySort('name'))
    expect(sorted.map((country) => country.name)).toEqual([
      '가나',
      '나라',
      '다라',
    ])
  })
})

describe('compareBySort — 인구순', () => {
  it('인구 내림차순, 문자열 인구도 숫자로 비교', () => {
    const list = [
      modern('소국', { population: 1000 }),
      modern('대국', { population: '9000000' }),
      modern('중국', { population: 500000 }),
    ]
    const sorted = [...list].sort(compareBySort('population'))
    expect(sorted.map((country) => country.name)).toEqual([
      '대국',
      '중국',
      '소국',
    ])
  })

  it('인구가 없는 항목(역사 국가)은 끝으로 밀리고 이름순 tiebreak', () => {
    const list = [
      historical('나중조'),
      modern('유인구국', { population: 100 }),
      historical('가중조'),
    ]
    const sorted = [...list].sort(compareBySort('population'))
    expect(sorted.map((country) => country.name)).toEqual([
      '유인구국', // 인구 있는 현대 국가가 먼저
      '가중조', // 인구 없는 항목끼리는 이름순
      '나중조',
    ])
  })
})

describe('compareBySort — 면적순', () => {
  it('면적 내림차순, 면적 없는 항목은 끝으로', () => {
    const list = [
      historical('무면적국'),
      modern('소면적국', { areaSqKm: 100 }),
      modern('대면적국', { areaSqKm: 9000 }),
    ]
    const sorted = [...list].sort(compareBySort('area'))
    expect(sorted.map((country) => country.name)).toEqual([
      '대면적국',
      '소면적국',
      '무면적국',
    ])
  })
})
