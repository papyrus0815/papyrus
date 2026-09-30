import {
  inferParticipationCountries,
  resolveOfficesAtEvent,
} from './person-participation'

/** 헬퍼가 실제로 부르는 조회만 흉내 낸 최소 fake */
function fakeDb(data: {
  event?: {
    historicalCountryId: string | null
    countryRelations: Array<{ countryId: string | null; historicalCountryId: string | null }>
  } | null
  persons?: Array<{ id: string; countryId: string | null; historicalCountryId: string | null }>
  bridges?: Array<{ historicalCountryId: string; modernCountryId: string }>
  reigns?: unknown[]
  tenures?: unknown[]
}) {
  return {
    event: { findUnique: jest.fn(async () => data.event ?? null) },
    person: { findMany: jest.fn(async () => data.persons ?? []) },
    historicalCountryModernCountry: {
      findMany: jest.fn(async () => data.bridges ?? []),
    },
    sovereignReign: { findMany: jest.fn(async () => data.reigns ?? []) },
    governmentPositionTenure: { findMany: jest.fn(async () => data.tenures ?? []) },
  } as never
}

describe('inferParticipationCountries — 참여 자격 국가 추론', () => {
  it('역사국 국적이 참여국이면 그 역사국, 현대국 국적이 참여국이면 그 현대국', async () => {
    const db = fakeDb({
      event: {
        historicalCountryId: null,
        countryRelations: [
          { countryId: 'c-us', historicalCountryId: null },
          { countryId: null, historicalCountryId: 'h-joseon' },
        ],
      },
      persons: [
        { id: 'p1', countryId: 'c-us', historicalCountryId: null },
        { id: 'p2', countryId: 'c-kr', historicalCountryId: 'h-joseon' },
      ],
    })
    const result = await inferParticipationCountries(db, 'E', ['p1', 'p2'])
    expect(result.get('p1')).toEqual({ countryId: 'c-us', historicalCountryId: null })
    expect(result.get('p2')).toEqual({ countryId: null, historicalCountryId: 'h-joseon' })
  })

  it('주 무대 역사국도 참여국으로 본다', async () => {
    const db = fakeDb({
      event: { historicalCountryId: 'h-russia', countryRelations: [] },
      persons: [{ id: 'p1', countryId: null, historicalCountryId: 'h-russia' }],
    })
    const result = await inferParticipationCountries(db, 'E', ['p1'])
    expect(result.get('p1')?.historicalCountryId).toBe('h-russia')
  })

  it('현대국 국적 → 브리지로 이어진 역사 참여국이 딱 하나면 그 역사국', async () => {
    const db = fakeDb({
      event: {
        historicalCountryId: null,
        countryRelations: [{ countryId: null, historicalCountryId: 'h-russian-empire' }],
      },
      persons: [{ id: 'p1', countryId: 'c-russia', historicalCountryId: null }],
      bridges: [{ historicalCountryId: 'h-russian-empire', modernCountryId: 'c-russia' }],
    })
    const result = await inferParticipationCountries(db, 'E', ['p1'])
    expect(result.get('p1')).toEqual({ countryId: null, historicalCountryId: 'h-russian-empire' })
  })

  it('브리지 후보가 둘 이상이면 모호하므로 비워 둔다', async () => {
    const db = fakeDb({
      event: {
        historicalCountryId: null,
        countryRelations: [
          { countryId: null, historicalCountryId: 'h-a' },
          { countryId: null, historicalCountryId: 'h-b' },
        ],
      },
      persons: [{ id: 'p1', countryId: 'c-x', historicalCountryId: null }],
      bridges: [
        { historicalCountryId: 'h-a', modernCountryId: 'c-x' },
        { historicalCountryId: 'h-b', modernCountryId: 'c-x' },
      ],
    })
    const result = await inferParticipationCountries(db, 'E', ['p1'])
    expect(result.get('p1')).toEqual({ countryId: null, historicalCountryId: null })
  })
})

describe('resolveOfficesAtEvent — 사건 당시 직위', () => {
  const tenure = (start: string, end: string | null, title: string) => ({
    personId: 'p1',
    startDate: new Date(start),
    endDate: end ? new Date(end) : null,
    title,
    positionDefinition: null,
    country: { name: '미국' },
    historicalCountry: null,
  })

  it('사건 날짜와 겹치는 재임만 — 연도만 아는 사건은 그해 전체와 겹침을 본다', async () => {
    const db = fakeDb({
      tenures: [
        tenure('1993-01-20T00:00:00Z', '2001-01-20T00:00:00Z', '대통령'),
        tenure('1979-01-01T00:00:00Z', '1981-01-01T00:00:00Z', '아칸소 주지사'),
      ],
    })
    const result = await resolveOfficesAtEvent(db, { startYear: 1999, startEra: 'AD' }, ['p1'])
    expect(result.get('p1')).toEqual(['미국 대통령'])
  })

  it('끝이 없는 재임은 진행 중으로 본다', async () => {
    const db = fakeDb({ tenures: [tenure('2020-01-01T00:00:00Z', null, '총리')] })
    const result = await resolveOfficesAtEvent(db, { startYear: 2025 }, ['p1'])
    expect(result.get('p1')).toEqual(['미국 총리'])
  })

  it('기원전 재위는 구조화 날짜로 비교한다', async () => {
    const db = fakeDb({
      reigns: [
        {
          personId: 'p1',
          startEra: 'BC', startYear: 27, startMonth: null, startDay: null, startDate: null,
          endEra: 'AD', endYear: 14, endMonth: null, endDay: null, endDate: null,
          regnalName: '아우구스투스',
          positionDefinition: { title: '황제' },
          country: null,
          historicalCountry: { name: '로마 제국' },
        },
      ],
    })
    const result = await resolveOfficesAtEvent(db, { startEra: 'BC', startYear: 9 }, ['p1'])
    expect(result.get('p1')).toEqual(['로마 제국 황제 아우구스투스'])
  })

  it('사건 날짜를 모르면 아무것도 붙이지 않는다', async () => {
    const db = fakeDb({ tenures: [tenure('1993-01-20T00:00:00Z', null, '대통령')] })
    const result = await resolveOfficesAtEvent(db, {}, ['p1'])
    expect(result.size).toBe(0)
  })
})
