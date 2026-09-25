import {
  type ReignMarker,
  type SovereignReignTimelineItem,
  formatReignSpan,
  interleaveReignMarkers,
  planReignMarkers,
  reignAccessionYears,
  groupReignEntries,
  toReignMarkers,
} from './reign-markers'

const JOSEON = 'hc-joseon'
const personName = (person: { name: string }) => person.name

const reign = (
  overrides: Partial<SovereignReignTimelineItem>,
): SovereignReignTimelineItem => ({
  id: 'r',
  personId: 'p',
  historicalCountryId: JOSEON,
  historicalCountry: { id: JOSEON, name: '조선' },
  person: { id: 'p', name: '이도' },
  ...overrides,
})

const marker = (
  id: string,
  startYear: number,
  endYear: number | null,
  month = 1,
  day = 1,
): ReignMarker => ({
  id,
  personId: id,
  name: id,
  countryName: '조선',
  startKey: startYear * 10000 + month * 100 + day,
  startYear,
  endYear,
})

describe('toReignMarkers', () => {
  it('목록에 나온 국가의 재위만 남기고 즉위순으로 정렬한다', () => {
    const markers = toReignMarkers(
      [
        reign({ id: 'munjong', startDate: '1450-02-22T00:00:00.000Z' }),
        reign({
          id: 'sejong',
          regnalName: '세종',
          startDate: '1418-08-10T00:00:00.000Z',
          endDate: '1450-02-17T00:00:00.000Z',
        }),
        reign({ id: 'other', historicalCountryId: 'hc-ming' }),
      ],
      new Set([JOSEON]),
      personName,
    )
    expect(markers.map((item) => item.id)).toEqual(['sejong', 'munjong'])
    expect(markers[0].name).toBe('세종')
    expect(markers[0].countryName).toBe('조선')
    expect(formatReignSpan(markers[0])).toBe('1418–1450')
  })

  it('나라·이름·기간이 같은 재위는 인물 행이 달라도 한 번만 싣는다', () => {
    const markers = toReignMarkers(
      [
        reign({
          id: 'dup-a',
          personId: 'person-a',
          regnalName: '세종',
          startDate: '1418-08-10T00:00:00.000Z',
          endDate: '1450-02-17T00:00:00.000Z',
        }),
        reign({
          id: 'dup-b',
          personId: 'person-b',
          regnalName: '세종',
          startDate: '1418-08-10T00:00:00.000Z',
          endDate: '1450-02-17T00:00:00.000Z',
        }),
        // 기간이 다르면(복위 등) 별개 재위로 남는다
        reign({
          id: 'restored',
          personId: 'person-a',
          regnalName: '세종',
          startDate: '1451-01-01T00:00:00.000Z',
        }),
      ],
      new Set([JOSEON]),
      personName,
    )
    expect(markers.map((item) => item.id)).toEqual(['dup-a', 'restored'])
  })

  it('표시명 폴백: 레거시 왕명(notes) → 묘호 → 인물 이름', () => {
    const [fromNotes, fromTemple, fromName] = toReignMarkers(
      [
        reign({ id: 'a', startYear: 1400, notes: '왕명: 정종' }),
        reign({
          id: 'b',
          startYear: 1401,
          person: { id: 'p', name: '이방원', templeName: '태종' },
        }),
        reign({ id: 'c', startYear: 1402 }),
      ],
      new Set([JOSEON]),
      personName,
    )
    expect(fromNotes.name).toBe('정종')
    expect(fromTemple.name).toBe('태종')
    expect(fromName.name).toBe('이도')
  })

  it('BC 재위는 구조화 축을 쓰고, 퇴위 미상이면 사망일로 닫는다', () => {
    const [qin] = toReignMarkers(
      [
        reign({
          id: 'qin',
          startEra: 'BC',
          startYear: 221,
          startDatePrecision: 'year',
          person: {
            id: 'p',
            name: '영정',
            isAlive: false,
            deathEra: 'BC',
            deathDate: '-0210-01-01',
            deathDatePrecision: 'year',
          },
        }),
      ],
      new Set([JOSEON]),
      personName,
    )
    expect(qin.startYear).toBe(-221)
    expect(qin.endYear).toBe(-210)
    expect(formatReignSpan(qin)).toBe('BC 221–BC 210')
  })

  it('같은 해에 끝난 재위는 연도 하나로 쓴다', () => {
    expect(formatReignSpan(marker('friedrich', 1888, 1888))).toBe('1888')
    expect(formatReignSpan(marker('current', 1952, null))).toBe('1952–')
  })

  it('즉위일을 모르거나 목록 국가가 없으면 비운다', () => {
    expect(toReignMarkers([reign({})], new Set([JOSEON]), personName)).toEqual([])
    expect(
      toReignMarkers([reign({ startYear: 1418 })], new Set(), personName),
    ).toEqual([])
  })
})

describe('planReignMarkers', () => {
  const groups = [
    { century: 15, years: [1443, 1453] },
    { century: 16, years: [1592] },
  ]

  it('즉위 해에 연 그룹이 있으면 그 안에', () => {
    const plan = planReignMarkers([marker('m', 1443, 1450)], groups, 'asc')
    expect(plan.inYear.get(1443)?.map((item) => item.id)).toEqual(['m'])
  })

  it('공백 구간의 즉위는 다음에 표시되는 연 그룹 앞 — 방향에 따라 다르다', () => {
    const munjong = marker('munjong', 1450, 1452)
    expect(
      planReignMarkers([munjong], groups, 'asc').beforeYear.get(1453),
    ).toEqual([munjong])
    expect(
      planReignMarkers(
        [munjong],
        [
          { century: 16, years: [1592] },
          { century: 15, years: [1453, 1443] },
        ],
        'desc',
      ).beforeYear.get(1443),
    ).toEqual([munjong])
  })

  it('다음 그룹이 세기 첫 해이고 즉위가 다른 세기면 세기 머리글 앞', () => {
    // 16세기에 사건이 하나도 없다 — 16세기 즉위를 17세기 머리글 아래에 두면 오독된다.
    const seonjo = marker('seonjo', 1567, 1608)
    const plan = planReignMarkers(
      [seonjo],
      [
        { century: 15, years: [1443] },
        { century: 17, years: [1620] },
      ],
      'asc',
    )
    expect(plan.beforeCentury.get(17)).toEqual([seonjo])
    expect(plan.beforeYear.size).toBe(0)

    // 같은 세기면 세기 머리글 뒤, 연 머리글 앞
    expect(planReignMarkers([seonjo], groups, 'asc').beforeYear.get(1592)).toEqual([
      seonjo,
    ])
  })

  it('목록 범위 밖은 버리되, 첫 사건 시점에 재위 중인 군주는 남긴다', () => {
    const sejong = marker('sejong', 1418, 1450)
    const taejo = marker('taejo', 1392, 1398)
    const late = marker('late', 1700, 1720)
    const plan = planReignMarkers([sejong, taejo, late], groups, 'asc')
    // 같은 15세기라 세기 머리글 뒤, 1443년 머리글 앞
    expect(plan.beforeYear.get(1443)).toEqual([sejong])
    expect(plan.inYear.size + plan.beforeCentury.size + plan.trailing.length).toBe(0)

    const descPlan = planReignMarkers(
      [sejong],
      [
        { century: 16, years: [1592] },
        { century: 15, years: [1453, 1443] },
      ],
      'desc',
    )
    expect(descPlan.trailing).toEqual([sejong])
  })
})

describe('interleaveReignMarkers', () => {
  const rows = [
    { id: 'jan', key: 14430101 },
    { id: 'child', key: null },
    { id: 'dec', key: 14431230 },
  ]
  const sejong = marker('m', 1443, null, 8, 10)
  const ids = (entries: ReturnType<typeof interleaveReignMarkers<(typeof rows)[number]>>) =>
    entries.map((entry) =>
      entry.kind === 'row'
        ? entry.item.id
        : `👑${entry.markers.map((item) => item.id).join('+')}`,
    )

  it('오름차순: 즉위일 이후 첫 최상위 행 앞', () => {
    expect(
      ids(
        interleaveReignMarkers(rows, [sejong], {
          direction: 'asc',
          chronological: true,
          rowStartKey: (row) => row.key,
        }),
      ),
    ).toEqual(['jan', 'child', '👑m', 'dec'])
  })

  it('내림차순: 즉위일 이전 첫 최상위 행 앞', () => {
    const descRows = [rows[2], rows[0], rows[1]]
    expect(
      ids(
        interleaveReignMarkers(descRows, [sejong], {
          direction: 'desc',
          chronological: true,
          rowStartKey: (row) => row.key,
        }),
      ),
    ).toEqual(['dec', '👑m', 'jan', 'child'])
  })

  it('같은 자리에 연달아 오는 즉위는 한 줄로 묶는다', () => {
    expect(
      ids(
        interleaveReignMarkers(rows, [marker('a', 1443, null, 3, 1), sejong], {
          direction: 'asc',
          chronological: true,
          rowStartKey: (row) => row.key,
        }),
      ),
    ).toEqual(['jan', 'child', '👑a+m', 'dec'])
  })

  it('시간순이 아닌 정렬이면 그룹 맨 앞', () => {
    expect(
      ids(
        interleaveReignMarkers(rows, [sejong], {
          direction: 'asc',
          chronological: false,
          rowStartKey: (row) => row.key,
        }),
      ),
    ).toEqual(['👑m', 'jan', 'child', 'dec'])
  })
})

describe('reignAccessionYears', () => {
  it('목록 범위 안 즉위 연도 — 첫 사건 때 재위 중인 군주는 남긴다', () => {
    const years = reignAccessionYears(
      [
        marker('taejong', 1400, 1418),
        marker('sejong', 1418, 1450),
        marker('sejo', 1455, 1468),
        marker('late', 1700, 1720),
      ],
      { min: 1433, max: 1597 },
    )
    expect(years).toEqual([1418, 1455])
  })
})

describe('groupReignEntries', () => {
  it('같은 이름·기간의 여러 나라 재위를 한 항목으로 묶고 나라만 모은다', () => {
    const germany = {
      ...marker('wilhelm-de', 1888, 1918),
      name: 'Wilhelm',
      countryName: '독일 제국',
    }
    const prussia = {
      ...marker('wilhelm-pr', 1888, 1918),
      name: 'Wilhelm',
      countryName: '프로이센 왕국',
    }
    const other = {
      ...marker('friedrich', 1888, 1888),
      name: 'Friedrich',
      countryName: '독일 제국',
    }
    const entries = groupReignEntries([germany, prussia, other])
    expect(entries).toHaveLength(2)
    expect(entries[0].marker.id).toBe('wilhelm-de')
    expect(entries[0].countryNames).toEqual(['독일 제국', '프로이센 왕국'])
    expect(entries[1].countryNames).toEqual(['독일 제국'])
  })
})
