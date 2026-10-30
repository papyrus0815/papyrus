import {
  comparePersons,
  contextScore,
  headlineOffice,
  lifeSpanLabel,
  matchesQuery,
  type PickerPerson,
  searchHaystack,
  signedYear,
} from './person-picker.lib'

const person = (over: Record<string, unknown> & { id: string }): PickerPerson =>
  ({
    name: over.id,
    surname: null,
    middleName: null,
    nameDisplayOrder: null,
    originalName: null,
    regnalName: null,
    templeName: null,
    birthEra: 'AD',
    birthYear: null,
    deathEra: 'AD',
    deathYear: null,
    floruitEra: null,
    floruitStartYear: null,
    floruitEndYear: null,
    countryId: null,
    historicalCountryId: null,
    country: null,
    isAlive: false,
    ...over,
  }) as unknown as PickerPerson

describe('인물 고르기 — 표시', () => {
  it('생몰 · 기원전 · 활동기 폴백', () => {
    expect(lifeSpanLabel(person({ id: 'a', birthYear: 1769, deathYear: 1849 }))).toBe('1769 ~ 1849')
    expect(lifeSpanLabel(person({ id: 'b', birthEra: 'BC', birthYear: 100, deathEra: 'BC', deathYear: 44 }))).toBe(
      '기원전 100 ~ 기원전 44',
    )
    expect(
      lifeSpanLabel(person({ id: 'c', floruitEra: 'AD', floruitStartYear: 1850, floruitEndYear: 1870 } as never)),
    ).toBe('활동 1850 ~ 1870')
    expect(lifeSpanLabel(person({ id: 'd' }))).toBeNull()
  })
  it('대표 직위 — 재위 먼저, 나라·직함·왕명', () => {
    const attila = person({
      id: 'attila',
      sovereignReigns: [
        { positionDefinition: { title: '국왕' }, historicalCountry: { name: '훈 제국' }, regnalName: '아틸라' },
      ],
    } as never)
    expect(headlineOffice(attila)).toBe('훈 제국 국왕 아틸라')
    expect(headlineOffice(person({ id: 'none' }))).toBeNull()
  })
  it('기원전 천문 연도', () => {
    expect(signedYear('BC', 44)).toBe(-43)
    expect(signedYear('AD', 1)).toBe(1)
  })
})

describe('인물 고르기 — 검색·순위', () => {
  it('낱말이 모두 들어 있으면 — 원어 이름으로도', () => {
    const napoleon = person({ id: 'n', name: '나폴레옹', surname: '보나파르트', originalName: 'Napoléon Bonaparte' } as never)
    expect(matchesQuery(searchHaystack(napoleon), '나폴 보나')).toBe(true)
    expect(matchesQuery(searchHaystack(napoleon), 'napoléon')).toBe(true)
    expect(matchesQuery(searchHaystack(napoleon), '나폴 루이')).toBe(false)
  })
  it('맥락 — 기간이 겹치면 2, 관련 나라면 1', () => {
    const context = { fromYear: 1853, toYear: 1856, countryIds: ['ru'] }
    expect(contextScore(person({ id: 'nicholas', birthYear: 1796, deathYear: 1855, historicalCountryId: 'ru' }), context)).toBe(3)
    expect(contextScore(person({ id: 'later', birthYear: 1900, deathYear: 1950, historicalCountryId: 'ru' }), context)).toBe(1)
    expect(contextScore(person({ id: 'unknown' }), context)).toBe(0)
    expect(contextScore(person({ id: 'x', birthYear: 1800 }), null)).toBe(0)
  })
  it('관련순 — 점수 내림차순, 같으면 이름순', () => {
    const context = { fromYear: 1853, toYear: 1856 }
    const list = [
      person({ id: '가', birthYear: 1900, deathYear: 1950 }),
      person({ id: '나', birthYear: 1800, deathYear: 1860 }),
    ]
    expect(list.sort(comparePersons('relevance', context)).map((item) => item.id)).toEqual(['나', '가'])
  })
})
