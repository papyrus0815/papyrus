import {
  type BridgeCountry,
  accessionMarkers,
  type OfficeHoldingRow,
  describeHeads,
  eventWindow,
  formatHeadPoint,
  headsForCountry,
  isHeadOfStateRow,
} from './contemporary-heads.lib'

const person = (id: string, name: string, extra: Partial<NonNullable<OfficeHoldingRow['person']>> = {}) => ({
  id,
  name,
  ...extra,
})

const row = (over: Partial<OfficeHoldingRow> & { id: string; personId: string }): OfficeHoldingRow => ({
  positionType: 'HEAD_OF_STATE',
  positionDefinition: { title: '황제', positionType: 'HEAD_OF_STATE', isMonarchical: true },
  ...over,
})

const RUSSIA = 'h-russia'
const crimea = eventWindow({ startDate: '1853-10-16', endDate: '1856-03-30' })!

const nicholas1 = row({
  id: 'r1',
  personId: 'p-n1',
  historicalCountryId: RUSSIA,
  regnalName: '니콜라이 1세',
  startDate: '1825-12-19',
  endDate: '1855-03-02',
  person: person('p-n1', '니콜라이'),
})
const alexander2 = row({
  id: 'r2',
  personId: 'p-a2',
  historicalCountryId: RUSSIA,
  regnalName: '알렉산드르 2세',
  startDate: '1855-03-02',
  endDate: '1881-03-13',
  person: person('p-a2', '알렉산드르'),
})

describe('headsForCountry', () => {
  it('사건 시작 시점 국가원수와 기간 중 교체를 낸다(크림 전쟁 러시아)', () => {
    const heads = headsForCountry({ kind: 'H', id: RUSSIA }, [alexander2, nicholas1], crimea)
    expect(heads.atStart?.name).toBe('니콜라이 1세')
    expect(heads.changes.map((change) => change.name)).toEqual(['알렉산드르 2세'])
    expect(formatHeadPoint(heads.changes[0])).toBe('1855.3')
  })

  it('정부수반은 국가원수 줄에 넣지 않는다', () => {
    const premier = row({
      id: 'g1',
      personId: 'p-pm',
      historicalCountryId: RUSSIA,
      positionType: 'HEAD_OF_GOVERNMENT',
      positionDefinition: { title: '총리', positionType: 'HEAD_OF_GOVERNMENT', isMonarchical: false },
      startDate: '1853-01-01',
      endDate: '1856-01-01',
      person: person('p-pm', '총리'),
    })
    expect(isHeadOfStateRow(premier)).toBe(false)
    const heads = headsForCountry({ kind: 'H', id: RUSSIA }, [premier, nicholas1], crimea)
    expect(heads.atStart?.name).toBe('니콜라이 1세')
  })

  it('왕호가 없으면 인물 표시명, 직함은 직위 정의 이름', () => {
    const poincare = row({
      id: 'f1',
      personId: 'p-poincare',
      historicalCountryId: 'h-fr3',
      positionDefinition: { title: '대통령', positionType: 'HEAD_OF_STATE', isMonarchical: false },
      startDate: '1913-02-18',
      endDate: '1920-02-18',
      person: person('p-poincare', '레몽', { surname: '푸앵카레', nameDisplayOrder: 'western' }),
    })
    const ww1 = eventWindow({ startDate: '1914-07-28', endDate: '1918-11-11' })!
    const heads = headsForCountry({ kind: 'H', id: 'h-fr3' }, [poincare], ww1)
    expect(heads.atStart?.title).toBe('대통령')
    expect(heads.atStart?.name).toContain('푸앵카레')
  })

  it('같은 사람이 이어 맡은 기록은 교체로 세지 않는다', () => {
    const second = row({ ...nicholas1, id: 'r1b', startDate: '1854-01-01', endDate: '1855-03-02' })
    const heads = headsForCountry({ kind: 'H', id: RUSSIA }, [nicholas1, second, alexander2], crimea)
    expect(heads.changes.map((change) => change.name)).toEqual(['알렉산드르 2세'])
  })

  it('끝 날짜가 없고 사망일도 모르면 즉위한 해까지만 — 먼 훗날 사건의 수장이 되지 않는다', () => {
    const open = row({
      id: 'o1',
      personId: 'p-old',
      historicalCountryId: 'h-joseon',
      startYear: 1418,
      startEra: 'AD',
      person: person('p-old', '세종'),
    })
    const modern = eventWindow({ startDate: '1950-06-25' })!
    expect(headsForCountry({ kind: 'H', id: 'h-joseon' }, [open], modern).atStart).toBeNull()
  })

  it('현대 국가 카드는 그 해에 이어지는 역사 국가의 수장을 찾되, 따로 카드가 있는 역사 국가는 건너뛴다', () => {
    const victoria = row({
      id: 'v1',
      personId: 'p-v',
      historicalCountryId: 'h-ukgbi',
      regnalName: '빅토리아',
      positionDefinition: { title: '국왕', positionType: 'HEAD_OF_STATE', isMonarchical: true },
      startDate: '1837-06-20',
      endDate: '1901-01-22',
      person: person('p-v', '빅토리아'),
    })
    const bridge: BridgeCountry[] = [
      { id: 'h-ukgbi', startYear: 1801, endYear: 1922, parentModernCountryIds: ['c-uk'] },
      { id: 'h-england', startYear: 927, endYear: 1707, parentModernCountryIds: ['c-uk'] },
    ]
    const opium = eventWindow({ startDate: '1839-09-04', endDate: '1842-08-29' })!
    expect(headsForCountry({ kind: 'C', id: 'c-uk' }, [victoria], opium, bridge).atStart?.name).toBe('빅토리아')
    expect(
      headsForCountry({ kind: 'C', id: 'c-uk' }, [victoria], opium, bridge, new Set(['h-ukgbi'])).atStart,
    ).toBeNull()
  })

  it('BC 연도도 부호 연도로 견준다', () => {
    const caesar = row({
      id: 'c1',
      personId: 'p-c',
      historicalCountryId: 'h-rome',
      startEra: 'BC',
      startYear: 49,
      endEra: 'BC',
      endYear: 44,
      person: person('p-c', '카이사르'),
    })
    const window = { startKey: -46 * 10000 + 101, endKey: -46 * 10000 + 1231, startYear: -46 }
    const heads = headsForCountry({ kind: 'H', id: 'h-rome' }, [caesar], window)
    expect(heads.atStart?.name).toBe('카이사르')
    expect(formatHeadPoint({ startYear: -49, startMonth: null })).toBe('기원전 49')
  })

  it('툴팁은 시작 시점과 교체를 모두 적는다', () => {
    const heads = headsForCountry({ kind: 'H', id: RUSSIA }, [nicholas1, alexander2], crimea)
    expect(describeHeads(heads)).toBe('니콜라이 1세 (황제) — 사건 시작 시점\n1855.3 알렉산드르 2세 (황제)')
  })
})

describe('accessionMarkers', () => {
  const window = { fromKey: 18531016, toKey: 18560330, year: 1853 }
  it('기간 안 즉위를 선대와 함께 낸다', () => {
    const markers = accessionMarkers({ rows: [nicholas1, alexander2], targets: [{ kind: 'H', id: RUSSIA }], window })
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({ name: '알렉산드르 2세', verb: '즉위', predecessor: '니콜라이 1세', startDate: '1855-03-02' })
  })
  it('같은 날 그 사람 이름이 든 하위 사건이 있으면 세우지 않는다', () => {
    const markers = accessionMarkers({
      rows: [nicholas1, alexander2],
      targets: [{ kind: 'H', id: RUSSIA }],
      window,
      existingEvents: [{ title: '니콜라이 1세 사망과 알렉산드르 2세 즉위', startDate: '1855-03-02', startDatePrecision: 'day' }],
    })
    expect(markers).toHaveLength(0)
  })
  it('같은 사람이 같은 날 여러 나라에 오르면 한 표지, 대통령은 취임', () => {
    const prussia = row({ ...alexander2, id: 'w1', personId: 'p-w', historicalCountryId: 'h-pr', regnalName: '빌헬름 1세', historicalCountry: { id: 'h-pr', name: '프로이센 왕국' } })
    const confed = row({ ...prussia, id: 'w2', historicalCountryId: 'h-nd', historicalCountry: { id: 'h-nd', name: '북독일 연방' } })
    const president = row({
      id: 'pr1',
      personId: 'p-pres',
      historicalCountryId: 'h-fr',
      startDate: '1855-01-01',
      startDatePrecision: 'day',
      positionDefinition: { title: '대통령', positionType: 'HEAD_OF_STATE', isMonarchical: false },
      person: person('p-pres', '대통령'),
    })
    const markers = accessionMarkers({
      rows: [prussia, confed, president],
      targets: [
        { kind: 'H', id: 'h-pr' },
        { kind: 'H', id: 'h-nd' },
        { kind: 'H', id: 'h-fr' },
      ],
      window,
    })
    expect(markers.map((marker) => [marker.name, marker.verb, marker.countries.join('·')])).toEqual([
      ['대통령', '취임', ''],
      ['빌헬름 1세', '즉위', '프로이센 왕국·북독일 연방'],
    ])
  })
  it('구간 밖 즉위는 내지 않는다', () => {
    expect(accessionMarkers({ rows: [nicholas1, alexander2], targets: [{ kind: 'H', id: RUSSIA }], window: { fromKey: 18600101, toKey: 18700101, year: 1860 } })).toEqual([])
  })
})
