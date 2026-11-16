import { countCountryScopedPositions } from './count-country-scoped-positions'

describe('countCountryScopedPositions', () => {
  it('전역(global) 및 범용(isGeneric) 직위를 제외하고 현재 현대국가·연결된 과거국가 전용 직위만 집계한다', () => {
    const definitions = [
      {
        id: 'global-minister',
        title: '외무장관',
        positionType: 'CABINET_MINISTER',
        scopes: [],
        administrationDepartmentId: null,
        organizationId: null,
      },
      {
        id: 'generic-scoped',
        title: '대통령',
        positionType: 'HEAD_OF_STATE',
        isGeneric: true,
        scopes: [{ countryId: 'kr', historicalCountryId: null }],
      },
      {
        id: 'kr-modern-pm',
        title: '대한민국 국무총리',
        positionType: 'HEAD_OF_GOVERNMENT',
        scopes: [{ countryId: 'kr', historicalCountryId: null }],
      },
      {
        id: 'joseon-yeongeuijeong',
        title: '영의정',
        positionType: 'HEAD_OF_GOVERNMENT',
        scopes: [{ countryId: null, historicalCountryId: 'hc-joseon' }],
      },
      {
        id: 'dept-scoped-ijo',
        title: '이조판서',
        positionType: 'CABINET_MINISTER',
        scopes: [],
        administrationDepartmentId: 'dept-ijo',
        administrationDepartment: {
          id: 'dept-ijo',
          name: '이조',
          countryId: null,
          historicalCountryId: 'hc-joseon',
        },
      },
      {
        id: 'other-country-only',
        title: '독일 연방총리',
        positionType: 'HEAD_OF_GOVERNMENT',
        scopes: [{ countryId: 'de', historicalCountryId: null }],
      },
    ] as any[]

    const koreaCountry = {
      id: 'kr',
      type: 'modern' as const,
      name: '대한민국',
      historicalCountries: [{ id: 'hc-joseon', name: '조선' }],
    } as any

    expect(countCountryScopedPositions(definitions, koreaCountry)).toBe(3)
  })

  it('복합 역사국가 조회 시 구성국(constituentPolities) 스코프 직위까지 함께 집계한다', () => {
    const definitions = [
      {
        id: 'german-empire-chancellor',
        title: '제국재상',
        positionType: 'HEAD_OF_GOVERNMENT',
        scopes: [{ countryId: null, historicalCountryId: 'hc-german-empire' }],
      },
      {
        id: 'prussia-minister-president',
        title: '프로이센 총리',
        positionType: 'HEAD_OF_GOVERNMENT',
        scopes: [{ countryId: null, historicalCountryId: 'hc-prussia' }],
      },
    ] as any[]

    const germanEmpire = {
      id: 'hc-german-empire',
      type: 'historical' as const,
      name: '독일 제국',
    } as any

    expect(
      countCountryScopedPositions(definitions, germanEmpire, [
        { id: 'hc-prussia' },
      ]),
    ).toBe(2)
  })
})
