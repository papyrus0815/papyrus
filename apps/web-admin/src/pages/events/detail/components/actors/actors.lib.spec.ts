import { delegationKeyOf, groupDelegations } from './actors.lib'

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
