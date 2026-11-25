import {
  buildCabinetListMarkers,
  type CabinetListMarkerInput,
  buildCabinetTerritoryLegendEntries,
  buildCabinetTerritoryOrdinalMap,
  cabinetTimelineHeaderYearRange,
  effectiveMonarchTenuresForCabinetTimeline,
  isSovereignMonarchTenureForCabinetTimeline,
  lineColorForCabinetHeadPositionBadge,
  resolveCabinetEffectiveDates,
  resolveReignEraLineForCabinetHead,
  shouldHideCabinetFromExecutiveTimeline,
  sovereignLegendPersonLabelFromMonarchTenure,
  territoryKeyFromCabinet,
  territoryKeyFromHead,
} from './cabinets-section.helpers'

describe('territoryKeyFromHead', () => {
  it('현대국가와 역사국가가 모두 있으면 현대국가를 우선한다', () => {
    expect(
      territoryKeyFromHead({
        historicalCountryId: 'abc-1',
        countryId: 'modern',
      }),
    ).toBe('c:modern')
  })

  it('역사국가만 있으면 h: 접두어', () => {
    expect(
      territoryKeyFromHead({
        historicalCountryId: 'abc-1',
        countryId: null,
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
  it('행정부명이 달라도 같은 국가면 같은 키다', () => {
    expect(
      territoryKeyFromCabinet({
        name: ' 제1기 ',
        headTenure: {
          countryId: 'c1',
          historicalCountryId: null,
        },
      }),
    ).toBe('c:c1')
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
  it('재위 왕호(regnalName)가 있으면 인물 본명보다 우선', () => {
    expect(
      sovereignLegendPersonLabelFromMonarchTenure(
        {
          regnalName: '비토리오 에마누엘레 2세',
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

  it('군주직(isMonarchical) 행이면 직함 없어도 군주 후보', () => {
    expect(
      isSovereignMonarchTenureForCabinetTimeline({
        isMonarchical: true,
        startDate: '1840-01-01',
      } as any),
    ).toBe(true)
  })
})

describe('effectiveMonarchTenuresForCabinetTimeline', () => {
  it('군주 테이블 행과 겹치는 legacy 군주 재임은 한 번만', () => {
    const sovereign = {
      id: 'sr-1',
      isMonarchical: true,
      personId: 'p1',
      startDate: '1840-06-07',
      endDate: '1861-01-02',
      positionDefinition: { title: '국왕' },
    } as any
    const legacyDup = {
      id: 't-1',
      isMonarchical: false,
      personId: 'p1',
      startDate: '1840-06-07',
      endDate: '1861-01-02',
      positionType: 'HEAD_OF_STATE',
      positionDefinition: { title: '프로이센 국왕' },
    } as any
    const out = effectiveMonarchTenuresForCabinetTimeline([sovereign, legacyDup])
    expect(out.map((x) => x.id)).toEqual(['sr-1'])
  })

  it('군주 테이블 행이 없으면 legacy 군주 재임 유지', () => {
    const legacy = {
      id: 't-1',
      positionType: 'HEAD_OF_STATE',
      positionDefinition: { title: 'King' },
      startDate: '1840-01-01',
    } as any
    expect(effectiveMonarchTenuresForCabinetTimeline([legacy]).map((x) => x.id)).toEqual([
      't-1',
    ])
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

  it('황제·차르여도 명시적 내각 명칭·각료·친정 표기가 있으면 숨기지 않음', () => {
    expect(
      shouldHideCabinetFromExecutiveTimeline(
        {
          positionType: 'HEAD_OF_STATE',
          positionDefinition: { title: '황제' },
        } as any,
        { name: '강희제 친정 내각' },
      ),
    ).toBe(false)
    expect(
      shouldHideCabinetFromExecutiveTimeline({
        positionType: 'HEAD_OF_STATE',
        title: '황제(친정)',
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

describe('개각 내각(cabinet.startDate 우선) 및 연호·연도 범위 계산', () => {
  it('resolveCabinetEffectiveDates: 개각 내각의 고유 출범·종료일이 수반 전체 임기보다 우선한다', () => {
    expect(
      resolveCabinetEffectiveDates({
        startDate: '2019-09-11',
        endDate: '2020-09-16',
        headTenure: {
          startDate: '2012-12-26',
          endDate: '2020-09-16',
        } as any,
      }),
    ).toEqual({
      startDate: '2019-09-11',
      endDate: '2020-09-16',
    })
  })

  it('resolveReignEraLineForCabinetHead: 개각 내각 출범일(cabinetStartDateOverride) 기준으로 군주 연호를 매칭한다', () => {
    const pmHead = {
      id: 'pm-abe',
      countryId: 'jp',
      positionType: 'HEAD_OF_GOVERNMENT',
      startDate: '2012-12-26',
      endDate: '2020-09-16',
    } as any

    const monarchs = [
      {
        id: 'emp-heisei',
        countryId: 'jp',
        isMonarchical: true,
        startDate: '1989-01-07',
        endDate: '2019-04-30',
        regnalEras: [
          {
            eraName: '헤이세이',
            startEra: 'AD',
            startYear: 1989,
            startMonth: 1,
            startDay: 8,
            endEra: 'AD',
            endYear: 2019,
            endMonth: 4,
            endDay: 30,
          },
        ],
      },
      {
        id: 'emp-reiwa',
        countryId: 'jp',
        isMonarchical: true,
        startDate: '2019-05-01',
        endDate: null,
        regnalEras: [
          {
            eraName: '레이와',
            startEra: 'AD',
            startYear: 2019,
            startMonth: 5,
            startDay: 1,
            endEra: null,
            endYear: null,
          },
        ],
      },
    ] as any[]

    const scope = {
      kind: 'modern' as const,
      modernCountryId: 'jp',
      linkedHistoricalCountryIds: [],
    }

    expect(
      resolveReignEraLineForCabinetHead(pmHead, monarchs, scope, '2012-12-26'),
    ).toContain('헤이세이')
    expect(
      resolveReignEraLineForCabinetHead(pmHead, monarchs, scope, '2019-09-11'),
    ).toContain('레이와')
  })

  it('cabinetTimelineHeaderYearRange: 개각 내각만 필터링되었을 때 해당 내각의 고유 연도 범위를 반환한다', () => {
    const range = cabinetTimelineHeaderYearRange([
      {
        startDate: '2019-09-11',
        endDate: '2020-09-16',
        headTenure: {
          positionType: 'HEAD_OF_GOVERNMENT',
          startDate: '2012-12-26',
          endDate: '2020-09-16',
        } as any,
      },
    ])
    expect(range).toEqual({ minY: 2019, maxY: 2020 })
  })
})

describe('buildCabinetListMarkers — 행 사이 표지', () => {
  const baseRow = (
    id: string,
    overrides: Partial<CabinetListMarkerInput>,
  ): CabinetListMarkerInput => ({
    id,
    polityKey: '일본 제국',
    polityLabel: '일본 제국',
    reignKey: null,
    reignLabel: null,
    positionKey: '내각총리대신',
    ordinal: null,
    startSignedYear: null,
    endSignedYear: null,
    ...overrides,
  })

  it('같은 정치체·직함에서 대수가 건너뛰면 미등록 구간과 연도를 표지로 단다(오름·내림 정렬 모두)', () => {
    const older = baseRow('a', { ordinal: 10, startSignedYear: 1900, endSignedYear: 1901 })
    const newer = baseRow('b', { ordinal: 43, startSignedYear: 1945, endSignedYear: 1945 })
    const asc = buildCabinetListMarkers([older, newer]).get('b')
    expect(asc).toEqual([
      {
        kind: 'gap',
        key: 'gap-b',
        label: '제11~42대 미등록 (32대)',
        detail: '1901–1945 · 44년',
      },
    ])
    const desc = buildCabinetListMarkers([newer, older]).get('a')
    expect(desc?.[0]).toMatchObject({ kind: 'gap', label: '제11~42대 미등록 (32대)' })
  })

  it('대수가 이어지거나 직함이 다르면 공백 표지를 달지 않는다', () => {
    const markers = buildCabinetListMarkers([
      baseRow('a', { ordinal: 1, startSignedYear: 1885, endSignedYear: 1888 }),
      baseRow('b', { ordinal: 2, startSignedYear: 1888, endSignedYear: 1889 }),
      baseRow('c', { ordinal: 9, positionKey: '대통령', startSignedYear: 1950 }),
    ])
    expect(markers.size).toBe(0)
  })

  it('대수가 없으면 10년 이상 빈 자리만 기록 없음으로 표시한다', () => {
    const markers = buildCabinetListMarkers([
      baseRow('a', { startSignedYear: 1900, endSignedYear: 1905 }),
      baseRow('b', { startSignedYear: 1910, endSignedYear: 1912 }),
      baseRow('c', { startSignedYear: 1930, endSignedYear: 1931 }),
    ])
    expect(markers.get('b')).toBeUndefined()
    expect(markers.get('c')).toEqual([
      { kind: 'gap', key: 'gap-c', label: '1912–1930 기록 없음', detail: '18년' },
    ])
  })

  it('정치체·군주 표지는 둘 이상일 때만, 바뀌는 자리에만 단다', () => {
    const markers = buildCabinetListMarkers([
      baseRow('a', { ordinal: 45, reignKey: 'showa', reignLabel: '쇼와' }),
      baseRow('b', { ordinal: 46, polityKey: '일본국', polityLabel: '일본국', reignKey: 'showa', reignLabel: '쇼와' }),
      baseRow('c', { ordinal: 47, polityKey: '일본국', polityLabel: '일본국', reignKey: 'showa', reignLabel: '쇼와' }),
    ])
    expect(markers.get('a')).toEqual([{ kind: 'polity', key: 'polity-a', label: '일본 제국' }])
    expect(markers.get('b')).toEqual([{ kind: 'polity', key: 'polity-b', label: '일본국' }])
    expect(markers.get('c')).toBeUndefined()
  })
})
