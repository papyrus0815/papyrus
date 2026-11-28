import type { PersonResponseDto } from '@/shared/api/persons'

import { buildPersonSearchOptions, estimateBirthAnchor } from './relation-search-options'

const person = (id: string, name: string, birthYear: number | null) =>
  ({ id, name, birthYear, birthEra: 'AD' }) as unknown as PersonResponseDto

describe('estimateBirthAnchor — 생몰 미상 인물의 가족 후보 기준 연도', () => {
  it('본인 출생연도가 있으면 그대로(추정 아님)', () => {
    expect(estimateBirthAnchor(1868, { father: person('f', '아버지', 1845) })).toEqual({ year: 1868, basis: null })
  })

  it('없으면 아버지 +30, 아버지가 미상이면 어머니 +30', () => {
    expect(estimateBirthAnchor(null, { father: person('f', 'A', 1845) })).toEqual({ year: 1875, basis: '아버지' })
    expect(
      estimateBirthAnchor(null, { father: person('f', 'A', null), mother: person('m', 'B', 1847) }),
    ).toEqual({ year: 1877, basis: '어머니' })
  })

  it('부모가 없으면 배우자와 동갑, 아무도 없으면 null', () => {
    expect(estimateBirthAnchor(null, { spouses: [null, person('s', 'C', 1872)] })).toEqual({ year: 1872, basis: '배우자' })
    expect(estimateBirthAnchor(undefined, {})).toBeNull()
  })
})

describe('buildPersonSearchOptions — 추정 기준이면 묶음 제목에 밝힌다', () => {
  it("배우자 후보 묶음이 '같은 세대 인물 · 아버지 기준 추정'", () => {
    const options = buildPersonSearchOptions([person('a', '알릭스', 1872), person('b', '먼 사람', 1700)], {
      excludeIds: [],
      anchorBirthYear: 1875,
      anchorBasis: '아버지',
      kind: 'spouse',
    })
    expect(options.map((option) => [option.value, option.group])).toEqual([
      ['a', '같은 세대 인물 · 아버지 기준 추정'],
      ['b', '그 밖의 인물'],
    ])
  })
})
