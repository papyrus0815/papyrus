import {
  type AtlasCountryInput,
  type AtlasEventInput,
  buildEdges,
  buildNodes,
  busiestYear,
  isFrontLineEvent,
  normalizeCountries,
  normalizeRulers,
  pickEraHeadline,
  resolveModernToHistorical,
} from './atlas-model'

const countryInputs: AtlasCountryInput[] = [
  {
    id: 'prussia',
    name: '프로이센 왕국',
    latitude: 52.5,
    longitude: 13.4,
    startEra: 'AD',
    startYear: 1701,
    endEra: 'AD',
    endYear: 1918,
    parentModernCountryIds: ['de'],
  },
  {
    id: 'austria',
    name: '합스부르크 군주국',
    latitude: 48.2,
    longitude: 16.4,
    startEra: 'AD',
    startYear: 1526,
    endEra: 'AD',
    endYear: 1804,
  },
  {
    id: 'russia',
    name: '러시아 제국',
    latitude: 59.9,
    longitude: 30.3,
    startEra: 'AD',
    startYear: 1721,
    endEra: 'AD',
    endYear: 1917,
  },
  {
    id: 'britain',
    name: '그레이트브리튼 왕국',
    latitude: 51.5,
    longitude: -0.1,
    startEra: 'AD',
    startYear: 1707,
    endEra: 'AD',
    endYear: 1800,
    parentModernCountryIds: ['gb'],
  },
  {
    id: 'empire-de',
    name: '독일 제국',
    latitude: 52.5,
    longitude: 13.4,
    startEra: 'AD',
    startYear: 1871,
    endEra: 'AD',
    endYear: 1918,
    parentModernCountryIds: ['de'],
  },
  {
    id: 'rome',
    name: '로마 제국',
    latitude: 41.9,
    longitude: 12.5,
    startEra: 'BC',
    startYear: 27,
    endEra: 'AD',
    endYear: 476,
  },
  {
    id: 'no-coords',
    name: '좌표 없음',
    latitude: null,
    longitude: null,
    startYear: 1700,
  },
]
const countries = normalizeCountries(countryInputs)

describe('normalizeCountries', () => {
  it('좌표 없는 나라는 지도에 못 올리므로 뺀다', () => {
    expect(countries.map((country) => country.id)).not.toContain('no-coords')
  })

  it('BC 존속 연도는 음수', () => {
    expect(countries.find((country) => country.id === 'rome')?.startYear).toBe(
      -27,
    )
  })
})

describe('normalizeRulers', () => {
  it('구조화 축이 있으면 ISO보다 우선 (BC 둔갑 방지)', () => {
    const [entry] = normalizeRulers(
      [
        {
          id: 'aug',
          personId: 'p1',
          historicalCountryId: 'rome',
          startEra: 'BC',
          startYear: 27,
          startDate: '0027-01-16T00:00:00.000Z',
          endEra: 'AD',
          endYear: 14,
          endDate: '0014-08-19T00:00:00.000Z',
        },
      ],
      true,
    )
    expect(entry!.ruler.startYear).toBe(-27)
    expect(entry!.ruler.endYear).toBe(14)
  })

  it('구조화 축이 없으면 ISO 연도, 끝이 없으면 재임 중(null)', () => {
    const [entry] = normalizeRulers(
      [
        {
          id: 'f2',
          personId: 'p2',
          historicalCountryId: 'prussia',
          regnalName: '프리드리히 2세',
          startDate: '1740-05-31T00:00:00.000Z',
        },
      ],
      true,
    )
    expect(entry!.ruler.startYear).toBe(1740)
    expect(entry!.ruler.endYear).toBeNull()
    expect(entry!.ruler.name).toBe('프리드리히 2세')
  })

  it('재임은 직위 유형으로 국가원수/정부수반을 가른다', () => {
    const [entry] = normalizeRulers(
      [
        {
          id: 't1',
          personId: 'p3',
          historicalCountryId: 'britain',
          positionDefinition: {
            positionType: 'HEAD_OF_GOVERNMENT',
            title: '총리',
          },
          startDate: '1757-06-29T00:00:00.000Z',
          endDate: '1762-05-26T00:00:00.000Z',
          person: { name: '뉴캐슬 공작' },
        },
      ],
      false,
    )
    expect(entry!.ruler.kind).toBe('HEAD_OF_GOVERNMENT')
    expect(entry!.ruler.title).toBe('총리')
  })
})

describe('resolveModernToHistorical', () => {
  it('그해 존속하던 연결 역사국가로 보낸다', () => {
    expect(resolveModernToHistorical('de', 1756, countries)).toBe('prussia')
  })

  it('후보가 여럿이면 늦게 생긴(더 구체적인) 쪽', () => {
    expect(resolveModernToHistorical('de', 1900, countries)).toBe('empire-de')
  })

  it('수장이 있는 쪽을 먼저', () => {
    expect(
      resolveModernToHistorical('de', 1900, countries, new Set(['prussia'])),
    ).toBe('prussia')
  })

  it('그해 연결 국가가 없으면 null', () => {
    expect(resolveModernToHistorical('de', 1650, countries)).toBeNull()
  })
})

describe('buildNodes', () => {
  const rulers = normalizeRulers(
    [
      {
        id: 'r1',
        personId: 'fritz',
        historicalCountryId: 'prussia',
        regnalName: '프리드리히 2세',
        startEra: 'AD',
        startYear: 1740,
        endEra: 'AD',
        endYear: 1786,
      },
      {
        id: 'r2',
        personId: 'maria',
        historicalCountryId: 'austria',
        regnalName: '마리아 테레지아',
        startEra: 'AD',
        startYear: 1740,
        endEra: 'AD',
        endYear: 1780,
      },
      {
        id: 'r3',
        personId: 'george',
        countryId: 'gb',
        regnalName: '조지 2세',
        startEra: 'AD',
        startYear: 1727,
        endEra: 'AD',
        endYear: 1760,
      },
      {
        id: 'r4',
        personId: 'fritz',
        historicalCountryId: 'prussia',
        regnalName: '프리드리히 2세(중복)',
        startEra: 'AD',
        startYear: 1740,
        endEra: 'AD',
        endYear: 1786,
      },
    ],
    true,
  )

  it('그해 수장이 있는 나라만 핀', () => {
    const ids = buildNodes(countries, rulers, 1756).map(
      (node) => node.country.id,
    )
    expect(ids).toEqual(
      expect.arrayContaining(['prussia', 'austria', 'britain']),
    )
    expect(ids).not.toContain('russia')
  })

  it('관계선에 걸린 나라는 수장이 없어도 핀', () => {
    const ids = buildNodes(countries, rulers, 1756, new Set(['russia'])).map(
      (node) => node.country.id,
    )
    expect(ids).toContain('russia')
  })

  it('현대국가 FK 재위는 그해 역사국가 핀에 얹힌다', () => {
    const britain = buildNodes(countries, rulers, 1756).find(
      (node) => node.country.id === 'britain',
    )
    expect(britain?.rulers.map((ruler) => ruler.name)).toEqual(['조지 2세'])
  })

  it('같은 인물은 한 핀에 한 번', () => {
    const prussia = buildNodes(countries, rulers, 1756).find(
      (node) => node.country.id === 'prussia',
    )
    expect(prussia?.rulers).toHaveLength(1)
  })

  it('존속 전 연도에는 핀이 없다', () => {
    expect(buildNodes(countries, rulers, 1650)).toHaveLength(0)
  })
})

describe('buildEdges', () => {
  const sevenYearsWar: AtlasEventInput = {
    id: 'e7',
    title: '7년 전쟁',
    startDate: '1756-05-17T00:00:00.000Z',
    endDate: '1763-02-15T00:00:00.000Z',
    category: { name: '군사' },
    type: 'WAR',
    relatedHistoricalCountries: [
      { id: 'prussia', role: 'PARTICIPANT', sideId: 'sideA' },
      { id: 'austria', role: 'PARTICIPANT', sideId: 'sideB' },
      {
        id: 'russia',
        role: 'PARTICIPANT',
        sideId: 'sideB',
        withdraw: { era: 'AD', year: 1762 },
      },
    ],
    relatedCountries: [{ id: 'gb', role: 'PARTICIPANT', sideId: 'sideA' }],
  }

  it('진영이 다르면 교전, 같으면 동맹', () => {
    const edges = buildEdges([sevenYearsWar], [], countries, 1757)
    const wars = edges
      .filter((edge) => edge.kind === 'war')
      .map((edge) => `${edge.aId}-${edge.bId}`)
    const allies = edges
      .filter((edge) => edge.kind === 'ally')
      .map((edge) => `${edge.aId}-${edge.bId}`)
    expect(wars).toEqual(
      expect.arrayContaining([
        'austria-prussia',
        'prussia-russia',
        'austria-britain',
        'britain-russia',
      ]),
    )
    expect(allies).toEqual(
      expect.arrayContaining(['britain-prussia', 'austria-russia']),
    )
  })

  it('이탈한 뒤에는 선에서 빠진다', () => {
    const edges = buildEdges([sevenYearsWar], [], countries, 1763)
    expect(
      edges.some((edge) => edge.aId === 'russia' || edge.bId === 'russia'),
    ).toBe(false)
  })

  it('사건 기간 밖이면 선이 없다', () => {
    expect(buildEdges([sevenYearsWar], [], countries, 1755)).toHaveLength(0)
  })

  it('진영이 없으면 전쟁 분류에서만 역할로 추론', () => {
    const roleWar: AtlasEventInput = {
      id: 'e2',
      title: '러시아-튀르크 전쟁',
      startDate: '1768-01-01T00:00:00.000Z',
      endDate: '1774-01-01T00:00:00.000Z',
      category: { name: '군사' },
      type: 'WAR',
      relatedHistoricalCountries: [
        { id: 'russia', role: 'INITIATOR' },
        { id: 'austria', role: 'TARGET' },
      ],
    }
    const treatyEvent: AtlasEventInput = {
      ...roleWar,
      id: 'e3',
      category: { name: '외교' },
      type: 'TREATY',
    }
    expect(buildEdges([roleWar], [], countries, 1770)).toHaveLength(1)
    expect(buildEdges([treatyEvent], [], countries, 1770)).toHaveLength(0)
  })

  it('동맹 조약은 서명~만료 사이에만', () => {
    const treaty = {
      id: 't1',
      name: '웨스트민스터 협약',
      type: 'ALLIANCE',
      signDate: '1756-01-16T00:00:00.000Z',
      expiryDate: '1762-01-01T00:00:00.000Z',
      signatories: [{ historicalCountryId: 'prussia' }, { countryId: 'gb' }],
    }
    expect(buildEdges([], [treaty], countries, 1758)).toEqual([
      expect.objectContaining({
        kind: 'ally',
        aId: 'britain',
        bId: 'prussia',
        source: 'treaty',
      }),
    ])
    expect(buildEdges([], [treaty], countries, 1763)).toHaveLength(0)
  })

  it('현대국가 서명국은 그해 수장이 있는 역사국가로 간다', () => {
    const twoBritains = normalizeCountries([
      ...countryInputs,
      {
        id: 'empire-gb',
        name: '대영제국',
        latitude: 51.5,
        longitude: -0.1,
        startEra: 'AD',
        startYear: 1750,
        endEra: 'AD',
        endYear: 1950,
        parentModernCountryIds: ['gb'],
      },
    ])
    const treaty = {
      id: 't3',
      name: '동맹',
      type: 'ALLIANCE',
      signDate: '1760-01-01T00:00:00.000Z',
      signatories: [{ countryId: 'gb' }, { historicalCountryId: 'prussia' }],
    }
    expect(buildEdges([], [treaty], twoBritains, 1770)[0]?.aId).toBe(
      'empire-gb',
    )
    expect(
      buildEdges([], [treaty], twoBritains, 1770, new Set(['britain']))[0]?.aId,
    ).toBe('britain')
  })

  it('같은 쌍이 교전이면서 동맹이면 교전만 남는다', () => {
    const treaty = {
      id: 't2',
      name: '옛 동맹',
      type: 'ALLIANCE',
      signDate: '1740-01-01T00:00:00.000Z',
      signatories: [
        { historicalCountryId: 'prussia' },
        { historicalCountryId: 'austria' },
      ],
    }
    const edges = buildEdges([sevenYearsWar], [treaty], countries, 1757)
    const pair = edges.filter(
      (edge) => edge.aId === 'austria' && edge.bId === 'prussia',
    )
    expect(pair).toEqual([expect.objectContaining({ kind: 'war' })])
  })
})

describe('busiestYear', () => {
  it('동시 재임이 가장 많은 해', () => {
    const rulers = normalizeRulers(
      [
        {
          id: 'a',
          personId: 'a',
          startEra: 'AD',
          startYear: 1700,
          endEra: 'AD',
          endYear: 1760,
        },
        {
          id: 'b',
          personId: 'b',
          startEra: 'AD',
          startYear: 1740,
          endEra: 'AD',
          endYear: 1786,
        },
        {
          id: 'c',
          personId: 'c',
          startEra: 'AD',
          startYear: 1750,
          endEra: 'AD',
          endYear: 1755,
        },
      ],
      true,
    )
    expect(busiestYear(rulers, 1600, 1800)).toBe(1750)
  })
})

describe('isFrontLineEvent', () => {
  const base = {
    id: 'x',
    title: '사건',
    startDate: '1900-01-01T00:00:00.000Z',
    category: { name: '군사' },
    type: 'WAR',
  }

  it('진영이 둘 이상이면 전선', () => {
    expect(
      isFrontLineEvent({
        ...base,
        category: { name: '외교' },
        relatedHistoricalCountries: [
          { id: 'a', sideId: 's1' },
          { id: 'b', sideId: 's2' },
        ],
      }),
    ).toBe(true)
  })

  it('전쟁 분류 + 공격·방어 역할이면 전선', () => {
    expect(
      isFrontLineEvent({
        ...base,
        relatedHistoricalCountries: [
          { id: 'a', role: 'INITIATOR' },
          { id: 'b', role: 'TARGET' },
        ],
      }),
    ).toBe(true)
  })

  it('참여국만 있고 진영·역할이 비면 선을 못 긋는다', () => {
    expect(
      isFrontLineEvent({
        ...base,
        relatedHistoricalCountries: [
          { id: 'a', role: 'PARTICIPANT' },
          { id: 'b', role: 'PARTICIPANT' },
        ],
      }),
    ).toBe(false)
  })
})

describe('칭호 등급', () => {
  it('국가 유형에서 파생 — 제국=황제, 왕국=국왕, 없으면 기타', () => {
    const [empire, kingdom, unknown] = normalizeCountries([
      { id: 'e', name: '제국', latitude: 1, longitude: 1, stateType: 'EMPIRE' },
      {
        id: 'k',
        name: '왕국',
        latitude: 1,
        longitude: 1,
        stateType: 'KINGDOM',
      },
      { id: 'u', name: '미상', latitude: 1, longitude: 1 },
    ])
    expect(empire!.rank).toBe('EMPEROR')
    expect(kingdom!.rank).toBe('KING')
    expect(unknown!.rank).toBe('OTHER')
  })
})

describe('pickEraHeadline', () => {
  const war: AtlasEventInput = {
    id: 'war',
    title: '7년 전쟁',
    startDate: '1756-05-17T00:00:00.000Z',
    endDate: '1763-02-15T00:00:00.000Z',
    category: { name: '군사' },
    type: 'WAR',
    relatedHistoricalCountries: [
      { id: 'prussia', sideId: 'a' },
      { id: 'austria', sideId: 'b' },
    ],
  }
  const battle: AtlasEventInput = {
    ...war,
    id: 'battle',
    title: '로스바흐 전투',
    parentEventId: 'war',
    startDate: '1757-11-05T00:00:00.000Z',
    endDate: '1757-11-05T00:00:00.000Z',
  }
  const culture: AtlasEventInput = {
    id: 'culture',
    title: '백과전서 간행',
    startDate: '1757-01-01T00:00:00.000Z',
    category: { name: '문화' },
  }

  it('전선을 긋는 장기 전쟁이 대표, 하위 사건은 제외', () => {
    const headline = pickEraHeadline([culture, battle, war], 1757)
    expect(headline.primary?.event.id).toBe('war')
    expect(headline.primary).toMatchObject({ startYear: 1756, endYear: 1763 })
    expect(headline.others.map((item) => item.event.id)).toEqual(['culture'])
  })

  it('그해에 걸친 사건이 없으면 null', () => {
    expect(pickEraHeadline([war], 1700).primary).toBeNull()
  })
})
