import {
  buildCabinetTerritoryLegendEntries,
  buildCabinetTerritoryOrdinalMap,
  isSovereignMonarchTenureForCabinetTimeline,
  lineColorForCabinetHeadPositionBadge,
  shouldHideCabinetFromExecutiveTimeline,
  sovereignLegendPersonLabelFromMonarchTenure,
  territoryKeyFromCabinet,
  territoryKeyFromHead,
} from './cabinets-section.helpers'

describe('territoryKeyFromHead', () => {
  it('역사국가 ID가 있으면 h: 접두어', () => {
    expect(
      territoryKeyFromHead({
        historicalCountryId: 'abc-1',
        countryId: 'modern',
      }),
    ).toBe('h:abc-1')
  })

  it('역사국가만 없고 현대국가면 c: 접두어', () => {
    expect(
      territoryKeyFromHead({
        historicalCountryId: null,
        countryId: 'modern-x',
      }),
    ).toBe('c:modern-x')
  })
})

describe('territoryKeyFromCabinet', () => {
  it('행정부명이 있으면 base에 덧붙인다', () => {
    expect(
      territoryKeyFromCabinet({
        name: ' 제1기 ',
        headTenure: {
          countryId: 'c1',
          historicalCountryId: null,
        },
      }),
    ).toBe('c:c1|name:제1기')
  })
})

describe('buildCabinetTerritoryOrdinalMap', () => {
  it('서로 다른 키마다 0부터 순번', () => {
    const m = buildCabinetTerritoryOrdinalMap([
      {
        headTenure: { historicalCountryId: 'h1', countryId: null },
      },
      {
        headTenure: { historicalCountryId: 'h2', countryId: null },
      },
    ])
    expect(m.get('h:h1')).toBe(0)
    expect(m.get('h:h2')).toBe(1)
  })
})

describe('buildCabinetTerritoryLegendEntries', () => {
  it('고유 소속마다 한 줄이고, 시작일이 빠른 국가가 먼저(동일 시 라벨)', () => {
    const ord = buildCabinetTerritoryOrdinalMap([
      { headTenure: { historicalCountryId: 'b', countryId: null } },
      { headTenure: { historicalCountryId: 'a', countryId: null } },
    ])
    const entries = buildCabinetTerritoryLegendEntries(
      [
        {
          headTenure: {
            historicalCountryId: 'b',
            historicalCountry: { id: 'b', name: '나라B' },
          },
        },
        {
          headTenure: {
            historicalCountryId: 'a',
            historicalCountry: { id: 'a', name: '나라A' },
          },
        },
      ],
      '한국',
      ord,
      {
        historicalCountries: [
          { id: 'a', startYear: 1000, startEra: 'AD' },
          { id: 'b', startYear: 2000, startEra: 'AD' },
        ],
      },
    )
    expect(entries).toHaveLength(2)
    expect(entries[0].label).toContain('나라A')
    expect(entries[1].label).toContain('나라B')
  })
})

describe('sovereignLegendPersonLabelFromMonarchTenure', () => {
  it('notes의 왕명이 있으면 인물 본명보다 우선', () => {
    expect(
      sovereignLegendPersonLabelFromMonarchTenure(
        {
          notes: '왕명: 비토리오 에마누엘레 2세',
          person: { name: '사보이아', surname: '비토리오 에마누엘레' },
          startDate: '1849-01-01',
        } as any,
        '1852-01-01',
      ),
    ).toBe('비토리오 에마누엘레 2세')
  })
})

describe('isSovereignMonarchTenureForCabinetTimeline', () => {
  it('국왕 직함(유럽 군주)도 행정부 타임라인 군주 겹침 판별에 포함', () => {
    expect(
      isSovereignMonarchTenureForCabinetTimeline({
        positionType: 'HEAD_OF_STATE',
        positionDefinition: { title: '사르데냐-피에몬테 왕국 국왕' },
      } as any),
    ).toBe(true)
  })

  it('King 등 영문 직함도 포함', () => {
    expect(
      isSovereignMonarchTenureForCabinetTimeline({
        positionType: 'HEAD_OF_STATE',
        positionDefinition: { title: 'King of Sardinia' },
      } as any),
    ).toBe(true)
  })

  it('총리는 제외', () => {
    expect(
      isSovereignMonarchTenureForCabinetTimeline({
        positionType: 'HEAD_OF_GOVERNMENT',
        positionDefinition: { title: '총리' },
      } as any),
    ).toBe(false)
  })
})

describe('shouldHideCabinetFromExecutiveTimeline', () => {
  it('천황·황제 등 의례적 원수 수반 행정부는 타임라인에서 숨김', () => {
    expect(
      shouldHideCabinetFromExecutiveTimeline({
        positionType: 'HEAD_OF_STATE',
        positionDefinition: { title: '일본국 천황' },
      } as any),
    ).toBe(true)
  })

  it('국왕·King 수반 행정부(직접 통치)는 타임라인에 표시', () => {
    expect(
      shouldHideCabinetFromExecutiveTimeline({
        positionType: 'HEAD_OF_STATE',
        positionDefinition: { title: '프로이센 국왕' },
      } as any),
    ).toBe(false)
    expect(
      shouldHideCabinetFromExecutiveTimeline({
        positionType: 'HEAD_OF_STATE',
        positionDefinition: { title: 'King of Prussia' },
      } as any),
    ).toBe(false)
  })

  it('HEAD_OF_GOVERNMENT는 숨기지 않음', () => {
    expect(
      shouldHideCabinetFromExecutiveTimeline({
        positionType: 'HEAD_OF_GOVERNMENT',
        positionDefinition: { title: '천황' },
      } as any),
    ).toBe(false)
  })
})

describe('lineColorForCabinetHeadPositionBadge', () => {
  const def = '#64748b'

  it('직위 정의 id가 같으면 색도 같다', () => {
    const a = lineColorForCabinetHeadPositionBadge(
      { positionDefinitionId: 'uuid-1' },
      def,
    )
    const b = lineColorForCabinetHeadPositionBadge(
      { positionDefinitionId: 'uuid-1' },
      def,
    )
    expect(a).toBe(b)
    expect(a).toMatch(/^#/)
  })

  it('직함 문자열만 있을 때 동일 문자열이면 동일 색', () => {
    const a = lineColorForCabinetHeadPositionBadge(
      { definitionTitle: '국무총리' },
      def,
    )
    const b = lineColorForCabinetHeadPositionBadge(
      { tenureTitle: '국무총리' },
      def,
    )
    expect(a).toBe(b)
  })

  it('id·직함이 모두 없으면 기본색', () => {
    expect(lineColorForCabinetHeadPositionBadge({}, def)).toBe(def)
  })
})
