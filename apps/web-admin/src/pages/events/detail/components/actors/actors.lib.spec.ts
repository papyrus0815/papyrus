import { makeSideRootOf } from '../hero-countries.lib'
import {
  countrySideMapOf,
  delegationKeyOf,
  effectivePersonSide,
  formatPointShort,
  groupDelegations,
  isCrossSidePerson,
  parseCompactPoint,
} from './actors.lib'

describe('대표단 묶기', () => {
  const rows = [
    { id: 'jp', isHistorical: true },
    { id: 'us', isHistorical: false },
  ]
  it('참여 국가로 나라 줄 밑에 — 순서 유지, 목록에 없는 나라·미지정은 따로', () => {
    const persons = [
      { name: '요시다', historicalCountryId: 'jp' },
      { name: '애치슨', countryId: 'us' },
      { name: '이치마다', historicalCountryId: 'jp' },
      { name: '그로미코', historicalCountryId: 'su' },
      { name: '미상' },
    ]
    const { byCountry, unassigned } = groupDelegations(rows, persons)
    expect(byCountry.get('h:jp')?.map((person) => person.name)).toEqual(['요시다', '이치마다'])
    expect(byCountry.get('m:us')?.map((person) => person.name)).toEqual(['애치슨'])
    expect(unassigned.map((person) => person.name)).toEqual(['그로미코', '미상'])
  })
  it('현대·역사가 같은 id여도 섞이지 않는다', () => {
    expect(delegationKeyOf({ countryId: 'x' })).toBe('m:x')
    expect(delegationKeyOf({ historicalCountryId: 'x' })).toBe('h:x')
  })
})

describe('parseCompactPoint — 가담·이탈 시점 한 줄 파싱', () => {
  it('연·연월·연월일과 기원전 표기를 파싱하고 빈 문자열은 null을 돌려준다', () => {
    expect(parseCompactPoint('   ')).toBeNull()
    expect(parseCompactPoint('1917')).toEqual({
      era: 'AD',
      year: 1917,
      month: null,
      day: null,
      precision: 'year',
    })
    expect(parseCompactPoint('1917.4')).toEqual({
      era: 'AD',
      year: 1917,
      month: 4,
      day: null,
      precision: 'month',
    })
    expect(parseCompactPoint('1918-03-03')).toEqual({
      era: 'AD',
      year: 1918,
      month: 3,
      day: 3,
      precision: 'day',
    })
    expect(parseCompactPoint('기원전 44.3')).toEqual({
      era: 'BC',
      year: 44,
      month: 3,
      day: null,
      precision: 'month',
    })
    expect(formatPointShort({ era: 'AD', year: 1918, month: 3, day: 3 })).toBe('1918.3.3')
  })

  it('잘못된 월·일·문자열은 invalid를 돌려준다', () => {
    expect(parseCompactPoint('1917.13')).toBe('invalid')
    expect(parseCompactPoint('알수없음')).toBe('invalid')
  })
})

describe('인물의 실효 진영(따로 정한 진영 ?? 소속국 진영)', () => {
  /* 베를린 1월 봉기 — 바이마르(과도정부 측) 사람인데 리프크네히트는 봉기 측 */
  const countrySideByKey = countrySideMapOf(
    [{ id: 'gb', sideId: 'side-uk' }],
    [
      { id: 'weimar', sideId: 'side-gov' },
      { id: 'neutral', sideId: null },
    ],
  )
  const sideRootOf = makeSideRootOf([
    { id: 'side-gov', name: '과도정부 측' },
    { id: 'side-gov-freikorps', name: '자유군단', parentSideId: 'side-gov' },
    { id: 'side-rebel', name: '봉기 측' },
    { id: 'side-uk', name: '영국 측' },
  ])

  it('인물 진영이 비어 있으면 소속국 진영을 따른다', () => {
    expect(effectivePersonSide({ countryId: 'gb' }, countrySideByKey)).toEqual({
      sideId: 'side-uk',
      source: 'country',
      countrySideId: 'side-uk',
    })
  })

  it('따로 정한 진영이 소속국 진영보다 앞선다', () => {
    expect(
      effectivePersonSide({ historicalCountryId: 'weimar', sideId: 'side-rebel' }, countrySideByKey),
    ).toEqual({ sideId: 'side-rebel', source: 'own', countrySideId: 'side-gov' })
  })

  it('소속국도 진영이 없으면 진영 밖', () => {
    expect(effectivePersonSide({ historicalCountryId: 'neutral' }, countrySideByKey).sideId).toBeNull()
    expect(effectivePersonSide({}, countrySideByKey).sideId).toBeNull()
  })

  it('소속국과 다른 편 — 맨 위 진영이 다를 때만', () => {
    expect(
      isCrossSidePerson({ historicalCountryId: 'weimar', sideId: 'side-rebel' }, countrySideByKey, sideRootOf),
    ).toBe(true)
    /* 하위 진영(자유군단)은 같은 편 */
    expect(
      isCrossSidePerson(
        { historicalCountryId: 'weimar', sideId: 'side-gov-freikorps' },
        countrySideByKey,
        sideRootOf,
      ),
    ).toBe(false)
    expect(isCrossSidePerson({ historicalCountryId: 'weimar' }, countrySideByKey, sideRootOf)).toBe(false)
    /* 소속국이 이 사건 참여국이 아니면 대표단에 들 일이 없다 */
    expect(isCrossSidePerson({ countryId: 'fr', sideId: 'side-rebel' }, countrySideByKey, sideRootOf)).toBe(false)
  })
})
