import type { EventOverviewNode } from '@/shared/api/event-overview'

import {
  aggregateContextLinks,
  aggregateDeployedWeapons,
  aggregateMilitaryUnits,
  aggregatePersons,
  buildCountryMatrix,
  buildWarDeclarationFlow,
  axisTicks,
  BREAK_PCT,
  brokenAxis,
  buildGantt,
  collectionGroups,
  compareOutline,
  outlineNumbers,
  groupRuns,
  inGroupFilter,
  SINGLES_GROUP_KEY,
  chooseLabelPlace,
  overlapsPeriod,
  parsePeriodParam,
  periodParam,
  typeBreakdown,
  checkNode,
  checkScore,
  coverageGaps,
  missingRootCountries,
  rootCountriesPayload,
  coverageRatio,
  emptyCountByColumn,
  orderedDescendants,
  roleTone,
  timeHistogram,
} from './event-overview.lib'

const node = (over: Partial<EventOverviewNode> & { id: string }): EventOverviewNode => ({
  title: over.id,
  description: null,
  parentEventId: 'root',
  depth: 1,
  startDate: null,
  startDatePrecision: null,
  endDate: null,
  endDatePrecision: null,
  location: null,
  locationLatitude: null,
  locationLongitude: null,
  locationNote: null,
  domain: 'OTHER',
  type: null,
  kind: 'SINGLE',
  countries: [],
  persons: [],
  sides: [],
  metrics: [],
  sectionCount: 0,
  imageCount: 0,
  hasBackground: false,
  hasAftermath: false,
  phaseId: null,
  phases: [],
  ...over,
})

const root = node({
  id: 'root',
  title: '1차세계대전',
  parentEventId: null,
  depth: 0,
  startDate: '1914-07-28T00:00:00.000Z',
  endDate: '1918-11-11T00:00:00.000Z',
  countries: [
    { key: 'h:de', id: 'de', kind: 'historical', name: '독일 제국', flagEmoji: null, role: 'INITIATOR', sideId: null },
  ],
})

const sarajevo = node({
  id: 'sarajevo',
  title: '사라예보 암살',
  startDate: '1914-06-28T00:00:00.000Z',
  domain: 'POLITICS',
  type: 'ATTACK',
  countries: [
    { key: 'h:at', id: 'at', kind: 'historical', name: '오스트리아-헝가리', flagEmoji: null, role: 'TARGET', sideId: null },
    { key: 'h:rs', id: 'rs', kind: 'historical', name: '세르비아', flagEmoji: null, role: 'INITIATOR', sideId: null },
  ],
  description: '대공 암살',
})
const marne = node({
  id: 'marne',
  title: '마른 전투',
  startDate: '1914-09-05T00:00:00.000Z',
  endDate: '1914-09-12T00:00:00.000Z',
  domain: 'MILITARY',
  type: 'BATTLE',
  countries: [
    { key: 'h:de', id: 'de', kind: 'historical', name: '독일 제국', flagEmoji: null, role: 'PARTICIPANT', sideId: null },
    { key: 'h:at', id: 'at', kind: 'historical', name: '오스트리아-헝가리', flagEmoji: null, role: 'PARTICIPANT', sideId: null },
  ],
  persons: [
    { personId: 'p1', name: '헬무트', surname: '몰트케', middleName: null, nameDisplayOrder: null, defaultNameDisplayOrder: null, profileImageUrl: null, role: '참모총장', sideId: null },
  ],
})
const undated = node({ id: 'undated', title: '날짜 모름' })
const grandchild = node({
  id: 'grand',
  title: '마른 1일차',
  parentEventId: 'marne',
  depth: 2,
  startDate: '1914-09-05T00:00:00.000Z',
  startDatePrecision: 'month',
  persons: [
    { personId: 'p1', name: '헬무트', surname: '몰트케', middleName: null, nameDisplayOrder: null, defaultNameDisplayOrder: null, profileImageUrl: null, role: null, sideId: null },
  ],
})
const descendants = [marne, undated, sarajevo, grandchild]

describe('buildGantt', () => {
  const gantt = buildGantt(root, descendants)

  it('트리 순(자식 날짜순, 바로 아래 손자)으로 줄을 세우고, 날짜 없는 사건은 따로 둔다', () => {
    expect(gantt.rows.map((row) => row.node.id)).toEqual(['sarajevo', 'marne', 'grand'])
    expect(gantt.undated.map((item) => item.id)).toEqual(['undated'])
    expect(orderedDescendants(gantt).map((item) => item.id)).toEqual([
      'sarajevo',
      'marne',
      'grand',
      'undated',
    ])
  })

  it('번호는 1부터, 손자는 바로 위 사건 제목을 단다', () => {
    expect(gantt.rows.map((row) => row.number)).toEqual([1, 2, 3])
    expect(gantt.rows[2].parentTitle).toBe('마른 전투')
    expect(gantt.rows[0].parentTitle).toBeNull()
  })

  it('상위 기간보다 먼저 시작한 하위(사라예보)도 축 안에 들어온다', () => {
    for (const row of gantt.rows) {
      expect(row.leftPct).toBeGreaterThanOrEqual(0)
      expect(row.leftPct + row.widthPct).toBeLessThanOrEqual(100.0001)
    }
    expect(gantt.parentBand?.leftPct).toBeGreaterThan(gantt.rows[0].leftPct)
  })

  it('기본 축은 하위 범위에 맞춘다 — 상위 4년 중 3개월에 몰린 하위가 축을 채운다', () => {
    const lastEnd = Math.max(...gantt.rows.map((row) => row.leftPct + row.widthPct))
    expect(lastEnd).toBeGreaterThan(90)
    // 상위 띠는 축 끝에서 잘린다
    expect((gantt.parentBand?.leftPct ?? 0) + (gantt.parentBand?.widthPct ?? 0)).toBeLessThanOrEqual(100.0001)
  })

  it('상위 기간 전체 축에서는 하위가 앞쪽에 몰린다', () => {
    const whole = buildGantt(root, descendants, 'parent')
    const lastEnd = Math.max(...whole.rows.map((row) => row.leftPct + row.widthPct))
    expect(lastEnd).toBeLessThan(20)
  })

  it('월 정밀도는 불확실 구간', () => {
    expect(gantt.rows[2].uncertain).toBe(true)
    expect(gantt.rows[0].isPoint).toBe(true)
  })
})

describe('연도만 아는 사건(정밀도 NULL 1월 1일 자리 표시)', () => {
  const yearOnly = node({
    id: 'y',
    title: '반란',
    startDate: '0974-01-01',
    endDate: '0974-12-31',
  })
  /* 같은 시대의 상위 — 1차대전 밑에 974년 사건을 두면 '동떨어진 하위'로 빠진다 */
  const ottonian = node({ id: 'r974', parentEventId: null, depth: 0, startDate: '0973-05-07', endDate: '0983-12-07' })
  it('라벨은 연도만, 막대는 불확실 구간, 점검은 일부', () => {
    const gantt = buildGantt(ottonian, [yearOnly])
    expect(gantt.rows[0].dateLabel).toBe('974')
    expect(gantt.rows[0].uncertain).toBe(false)
    expect(checkNode(yearOnly).date).toBe('partial')
  })
})

describe('buildCountryMatrix', () => {
  const matrix = buildCountryMatrix(root, descendants)

  it('하위 사건에 많이 나오는 나라부터, 상위에서의 배역도 함께', () => {
    expect(matrix.map((country) => country.name)).toEqual([
      '오스트리아-헝가리',
      '독일 제국',
      '세르비아',
    ])
    expect(matrix[0].eventCount).toBe(2)
    expect(matrix[1].rootRole).toBe('INITIATOR')
    expect(matrix[0].roleByEvent.get('sarajevo')).toBe('TARGET')
  })

  it('배역 12종을 넷으로 접는다', () => {
    expect(roleTone('INITIATOR')).toBe('lead')
    expect(roleTone('VICTIM')).toBe('target')
    expect(roleTone('DISSOLVED')).toBe('statehood')
    expect(roleTone(null)).toBe('neutral')
  })
})

describe('상위 기간 표시', () => {
  it('하위가 모두 상위 기간 안이고 상위가 축보다 넓으면 띠를 그리지 않는다(모든 줄이 회색일 뿐)', () => {
    const inside = node({ id: 'inside', startDate: '1915-03-01T00:00:00.000Z', endDate: '1915-06-01T00:00:00.000Z' })
    const gantt = buildGantt(root, [inside])
    expect(gantt.parentBand).toBeNull()
    expect(gantt.parentEdges).toEqual([])
  })

  it('상위 기간 전체 축에서는 띠를 그린다', () => {
    const inside = node({ id: 'inside', startDate: '1915-03-01T00:00:00.000Z' })
    expect(buildGantt(root, [inside], 'parent').parentBand).not.toBeNull()
  })

  it('축 안에 드는 상위 시작은 날짜 표지로 준다', () => {
    const before = node({ id: 'before', startDate: '1914-06-28T00:00:00.000Z' })
    const wideRoot = { ...root, endDate: '1914-08-15T00:00:00.000Z' }
    const after = node({ id: 'after', startDate: '1914-12-01T00:00:00.000Z' })
    const gantt = buildGantt(wideRoot, [before, after])
    expect(gantt.parentEdges.map((edge) => edge.label)).toEqual([
      '상위 시작 1914.7.28',
      '상위 끝 1914.8.15',
    ])
  })
})

describe('달력 눈금 — 한 달 미만 간격은 1·15일(또는 1·8·15·22일)', () => {
  it('석 달 축은 반월 눈금, 1월 1일은 연도', () => {
    const low = 1914 + 5 / 12 // 1914.6.1
    const high = 1914 + 8 / 12 // 1914.9.1
    const labels = axisTicks(low, high).map((tick) => tick.label)
    expect(labels).toEqual(['6.1', '6.15', '7.1', '7.15', '8.1', '8.15', '9.1'])
    expect(axisTicks(1913.95, 1914.1).map((tick) => tick.label)).toContain('1914')
  })

  it('양 끝 눈금은 안쪽으로 붙인다(가운데 정렬이면 잘린다)', () => {
    const gantt = buildGantt(root, descendants)
    const aligns = gantt.ticks.map((tick) => tick.align)
    for (const tick of gantt.ticks) {
      if (tick.pct < 4) expect(tick.align).toBe('start')
      else if (tick.pct > 96) expect(tick.align).toBe('end')
      else expect(tick.align).toBe('center')
    }
    expect(aligns.length).toBeGreaterThan(0)
  })
})

describe('시기 거르기', () => {
  it('URL 값 왕복과 잘못된 값 거르기', () => {
    const period = { from: 1914.5, to: 1914.5833 }
    expect(parsePeriodParam(periodParam(period))).toEqual(period)
    expect(parsePeriodParam('abc')).toBeNull()
    expect(parsePeriodParam('2_1')).toBeNull()
  })

  it('그 시기에 걸쳐 있으면 걸린다 — 끝나는 날 다음 칸에는 안 걸린다', () => {
    const july = { from: 1914.5, to: 1914 + 7 / 12 }
    expect(overlapsPeriod({ from: 1914.4, to: 1914.55 }, july)).toBe(true)
    expect(overlapsPeriod({ from: 1914.4, to: 1914.5 }, july)).toBe(false)
    expect(overlapsPeriod({ from: 1914.6, to: 1914.7 }, july)).toBe(false)
  })
})

describe('chooseLabelPlace — 날짜 라벨은 픽셀로 판정', () => {
  const label = '1914.7.28 ~ 1914.8.4'
  it('오른쪽에 자리가 있으면 오른쪽', () => {
    expect(chooseLabelPlace({ leftPct: 10, widthPct: 5, trackPx: 600, label, uncertain: false })).toBe('right')
  })
  it('78% 안이어도 남은 픽셀이 모자라면 왼쪽 — 예전 % 기준은 여기서 넘쳤다', () => {
    expect(chooseLabelPlace({ leftPct: 70, widthPct: 8, trackPx: 420, label, uncertain: false })).toBe('left')
  })
  it('양쪽이 모자라면 채운 막대 안, 점선 막대는 안에 넣지 않는다', () => {
    expect(chooseLabelPlace({ leftPct: 2, widthPct: 96, trackPx: 600, label, uncertain: false })).toBe('inside')
    expect(chooseLabelPlace({ leftPct: 2, widthPct: 96, trackPx: 600, label, uncertain: true })).not.toBe('inside')
  })
  it('어디에도 안 들어가면 트랙 끝에 붙인 칩 — 여유 큰 쪽으로 보내 트랙 밖으로 잘리지 않는다', () => {
    expect(chooseLabelPlace({ leftPct: 30, widthPct: 40, trackPx: 300, label, uncertain: true })).toBe('pinned')
    expect(chooseLabelPlace({ leftPct: 40, widthPct: 20, trackPx: 300, label, uncertain: false })).toBe('pinned')
  })
})

describe('분포', () => {
  it('하위 사건의 세부 분야를 많은 순으로 — 색은 그 세부에서 가장 많은 분야', () => {
    expect(typeBreakdown(descendants)).toEqual([
      { key: 'NONE', label: '세부 없음', count: 2, domain: 'OTHER' },
      { key: 'ATTACK', label: '암살·테러·학살', count: 1, domain: 'POLITICS' },
      { key: 'BATTLE', label: '전투·작전', count: 1, domain: 'MILITARY' },
    ])
  })

  it('넉 달 이하는 주 단위 칸 — 월 단위면 석 달에 몰린 묶음이 막대 3개뿐이었다', () => {
    const bins = timeHistogram(buildGantt(root, descendants))
    // 1914.6.28 ~ 9월(월 정밀도) — 주 칸 14개 안팎
    expect(bins.length).toBeGreaterThanOrEqual(13)
    expect(bins[0].label).toMatch(/^6\.\d+$/)
    expect(bins.reduce((sum, bin) => sum + bin.started, 0)).toBe(3)
    expect(bins[0].started).toBe(1)
  })

  it('넉 달을 넘으면 월 단위 칸', () => {
    const december = node({ id: 'dec', startDate: '1914-12-24T00:00:00.000Z' })
    const bins = timeHistogram(buildGantt(root, [sarajevo, marne, december]))
    expect(bins.map((bin) => bin.label)).toEqual([
      '1914.6',
      '1914.7',
      '1914.8',
      '1914.9',
      '1914.10',
      '1914.11',
      '1914.12',
    ])
    expect(bins.map((bin) => bin.started)).toEqual([1, 0, 0, 1, 0, 0, 1])
  })

  it('거르기가 걸리면 걸린 사건만 따로 센다(전체는 그대로)', () => {
    const december = node({ id: 'dec', startDate: '1914-12-24T00:00:00.000Z' })
    const bins = timeHistogram(buildGantt(root, [sarajevo, marne, december]), new Set(['marne']))
    expect(bins.map((bin) => bin.active)).toEqual([1, 0, 0, 1, 0, 0, 1])
    expect(bins.map((bin) => bin.matchedActive)).toEqual([0, 0, 0, 1, 0, 0, 0])
    expect(bins.map((bin) => bin.matchedStarted)).toEqual([0, 0, 0, 1, 0, 0, 0])
  })

  it('긴 사건은 걸친 칸마다 진행 중으로 센다 — 시작한 칸 하나에만 잡히지 않게', () => {
    const loan = node({ id: 'loan', startDate: '1888-12-10T00:00:00.000Z', endDate: '1914-07-28T00:00:00.000Z' })
    const visit = node({ id: 'visit', startDate: '1896-10-05T00:00:00.000Z' })
    const bins = timeHistogram(buildGantt(root, [loan, visit]))
    const at1896 = bins.find((bin) => bin.label === '1896')
    expect(at1896).toMatchObject({ label: '1896', started: 1, active: 2 })
    expect(bins.find((bin) => bin.label === '1910')?.active).toBe(1)
  })
})

describe('인물·점검', () => {
  it('같은 인물을 사건별로 모은다', () => {
    const persons = aggregatePersons([root, ...descendants])
    expect(persons).toHaveLength(1)
    expect(persons[0].events.map((event) => event.id)).toEqual(['marne', 'grand'])
  })

  it('월 정밀도 날짜는 부분, 날짜 없음은 빈 칸', () => {
    expect(checkNode(grandchild).date).toBe('partial')
    expect(checkNode(undated).date).toBe('empty')
    expect(checkNode(sarajevo).description).toBe('full')
  })

  it('열별 빈 칸 수와 충실도', () => {
    expect(emptyCountByColumn(descendants).countries).toBe(2)
    const ratio = coverageRatio([sarajevo])
    // 암살 — 진영은 해당 없음, 수치(사상자)는 선택 기록이라 칸에 든다 — 날짜·개요·참여국 = 3/9
    expect(ratio).toBeCloseTo(3 / 9)
  })
})

describe('배치 B — 점검 신호', () => {
  it('기록 칸은 세부·분야가 다루는지로 — 최후통첩(외교 › 선언·통첩)엔 수치·진영 해당 없음, 전투엔 빈 칸, 값이 있으면 무관하게 채움', () => {
    const ultimatum = node({ id: 'u', type: 'DECLARATION', domain: 'DIPLOMACY' })
    expect(checkNode(ultimatum).metrics).toBe('na')
    expect(checkNode(ultimatum).sides).toBe('na')
    expect(checkNode(marne).metrics).toBe('empty')
    expect(checkNode(marne).sides).toBe('empty')
    const withMetric = node({
      id: 'm',
      type: 'DECLARATION',
      metrics: [
        { metricKey: 'k', metricName: '배상금', unit: null, value: 1, low: null, high: null, approx: false, atLeast: false, scope: 'EVENT', scopeLabel: null },
      ],
    })
    expect(checkNode(withMetric).metrics).toBe('full')
    expect(checkScore(checkNode(sarajevo)).applicable).toBe(9)
    // 같은 법령이라도 군사 분야(함대법)는 수치를 권한다 — 세부가 수치를 정하지 않으면 분야가 정한다
    expect(checkNode(node({ id: 'law', type: 'LAW_POLICY', domain: 'MILITARY' })).metrics).toBe('empty')
    expect(checkNode(node({ id: 'law2', type: 'CREATION', domain: 'CULTURE' })).metrics).toBe('na')
  })

  it('상위 기간 밖 하위 — 개전 전 사라예보는 기간 전', () => {
    const gantt = buildGantt(root, descendants)
    expect(gantt.rows.find((row) => row.node.id === 'sarajevo')?.outside).toBe('before')
    expect(gantt.rows.find((row) => row.node.id === 'marne')?.outside).toBeNull()
  })

  it('상위 기간 중 하위가 덮지 않는 구간 — 1차대전처럼 첫 두 달만 있으면 나머지가 공백', () => {
    const gaps = coverageGaps(root, descendants)
    expect(gaps).toHaveLength(1)
    // 손자가 '1914년 9월'(월 정밀도)이라 9월 전체를 덮는다 — 공백은 10월부터
    expect(gaps[0].label).toBe('1914.10 ~ 1918.11')
    expect(gaps[0].share).toBeGreaterThan(0.9)
  })

  it('하위가 상위 기간을 고르게 덮으면 공백 없음', () => {
    const covering = node({
      id: 'all',
      startDate: '1914-07-28T00:00:00.000Z',
      endDate: '1918-11-11T00:00:00.000Z',
    })
    expect(coverageGaps(root, [covering])).toEqual([])
  })
})

describe('배치 D — 상위에 하위 참여국 걸기', () => {
  it('하위에만 나오는 나라를 많이 나오는 순으로', () => {
    const missing = missingRootCountries(root, descendants)
    // 독일은 상위에 이미 있다
    expect(missing.map((country) => [country.name, country.eventCount])).toEqual([
      ['오스트리아-헝가리', 2],
      ['세르비아', 1],
    ])
  })

  it('PUT 본문 — 기존 줄은 키만(배역·설명 보존), 새 나라는 참여국, 배역 없는 합류 줄은 뺀다', () => {
    const withMerged = {
      ...root,
      countries: [
        ...root.countries,
        // 사건 본체 역사국가 칸에서 합류한 줄 — 관계표 줄이 아니다
        { key: 'h:body', id: 'body', kind: 'historical' as const, name: '본체', flagEmoji: null, role: null, sideId: null },
      ],
    }
    const payload = rootCountriesPayload(withMerged, missingRootCountries(root, descendants))
    expect(payload).toEqual([
      { historicalCountryId: 'de' },
      { historicalCountryId: 'at', role: 'PARTICIPANT' },
      { historicalCountryId: 'rs', role: 'PARTICIPANT' },
    ])
  })
})

describe('접은 축 — 빈 구간이 축의 30% 이상이면 좁은 틈으로', () => {
  const early = node({ id: 'early', startDate: '1690-01-01T00:00:00.000Z', endDate: '1692-01-01T00:00:00.000Z' })
  const late = node({ id: 'late', startDate: '1746-01-01T00:00:00.000Z', endDate: '1748-01-01T00:00:00.000Z' })
  const company = node({ id: 'company', parentEventId: null, depth: 0, startDate: '1600-12-31T00:00:00.000Z' })

  it('동인도회사처럼 56년이 비면 틈 하나로 접고, 막대가 축을 나눠 쓴다', () => {
    const gantt = buildGantt(company, [early, late])
    expect(gantt.breaks).toHaveLength(1)
    expect(gantt.breaks[0].label).toContain('하위 없음')
    const [first, second] = gantt.rows
    // 접지 않으면 각 막대가 3%대 — 접으면 남은 폭을 둘이 나눠 40% 넘게
    expect(first.widthPct).toBeGreaterThan(30)
    expect(second.leftPct + second.widthPct).toBeLessThanOrEqual(100.001)
    expect(second.leftPct - (first.leftPct + first.widthPct)).toBeCloseTo(BREAK_PCT, 0)
  })

  it('접힌 틈 안에는 눈금을 매기지 않는다', () => {
    const gantt = buildGantt(company, [early, late])
    const breakPct = gantt.breaks[0].pct
    expect(gantt.ticks.every((tick) => Math.abs(tick.pct - breakPct) >= BREAK_PCT)).toBe(true)
    expect(gantt.ticks.length).toBeGreaterThanOrEqual(2)
  })

  it("'상위 기간 전체'는 공백을 보려고 고르는 보기라 접지 않는다", () => {
    expect(buildGantt(company, [early, late], 'parent').breaks).toEqual([])
  })

  it('조각 선형 — 양 끝은 0·100, 틈 앞뒤로 단조 증가', () => {
    const toPct = brokenAxis(0, 100, [{ from: 20, to: 80 }])
    expect(toPct(0)).toBeCloseTo(0)
    expect(toPct(100)).toBeCloseTo(100)
    expect(toPct(80) - toPct(20)).toBeCloseTo(BREAK_PCT)
    expect(toPct(10)).toBeLessThan(toPct(20))
    expect(toPct(90)).toBeGreaterThan(toPct(80))
  })
})

describe('묶음별 — 직계 중 아래가 있거나 묶음 종류면 묶음', () => {
  const war = node({ id: 'war', title: '세르비아 전쟁', kind: 'COLLECTION', startDate: '1876-06-30T00:00:00.000Z' })
  const battle = node({ id: 'battle', parentEventId: 'war', depth: 2, startDate: '1876-07-01T00:00:00.000Z' })
  const peace = node({ id: 'peace', parentEventId: 'war', depth: 2, startDate: '1877-02-28T00:00:00.000Z' })
  const lone = node({ id: 'lone', startDate: '1875-07-09T00:00:00.000Z' })
  const emptyCollection = node({ id: 'empty', kind: 'COLLECTION' })
  const all = [lone, war, battle, peace, emptyCollection]
  const gantt = buildGantt(root, all)
  const ordered = orderedDescendants(gantt)
  const grouping = collectionGroups(ordered, gantt)

  it('묶음과 그 아래, 개별 직계를 가른다 — 아래가 빈 묶음 종류도 묶음', () => {
    expect(grouping.groups.map((group) => group.id)).toEqual(['war', 'empty'])
    expect(grouping.groups[0].memberIds).toEqual(['battle', 'peace'])
    expect(grouping.singleIds).toEqual(['lone'])
    expect(grouping.groupIdOf.get('battle')).toBe('war')
    expect(grouping.groupIdOf.get('war')).toBe('war')
  })

  it('묶음 기간은 묶음과 아래 전부 — 날짜가 없으면 null', () => {
    expect(grouping.groups[0].spanLabel).toBe('1876.6 ~ 1877.2')
    expect(grouping.groups[1].span).toBeNull()
  })

  it('거르기: 묶음 id는 그 묶음 전부, singles는 묶음 밖 직계', () => {
    expect(inGroupFilter(grouping, 'peace', 'war')).toBe(true)
    expect(inGroupFilter(grouping, 'lone', 'war')).toBe(false)
    expect(inGroupFilter(grouping, 'lone', SINGLES_GROUP_KEY)).toBe(true)
    expect(inGroupFilter(grouping, 'battle', SINGLES_GROUP_KEY)).toBe(false)
  })

  it('연속 구간 — 같은 묶음이 이어지면 한 구간', () => {
    expect(groupRuns(['lone', 'war', 'battle', 'peace'], grouping)).toEqual([
      { groupId: null, start: 0, length: 1 },
      { groupId: 'war', start: 1, length: 3 },
    ])
  })
})

describe('개요 번호 — 1 아래는 1-1', () => {
  it('직계는 1·2, 그 아래는 부모 번호-순번, 더 아래는 한 마디 더', () => {
    const war = node({ id: 'war' })
    const battle = node({ id: 'battle', parentEventId: 'war', depth: 2 })
    const day = node({ id: 'day', parentEventId: 'battle', depth: 3 })
    const peace = node({ id: 'peace', parentEventId: 'war', depth: 2 })
    const lone = node({ id: 'lone' })
    const numbers = outlineNumbers([war, battle, day, peace, lone], 'root')
    expect([...numbers.values()]).toEqual(['1', '1-1', '1-1-1', '1-2', '2'])
  })
  it('정렬은 마디마다 숫자로 — 3 < 3-1 < 3-2 < 10', () => {
    expect(['10', '3-2', '3', '3-1'].sort(compareOutline)).toEqual(['3', '3-1', '3-2', '10'])
  })
})

it('2~6년 하위는 분기 칸 — 연 단위면 3년이 막대 4개뿐이었다', () => {
  const early = node({ id: 'early', startDate: '1875-07-09T00:00:00.000Z' })
  const late = node({ id: 'late', startDate: '1878-06-13T00:00:00.000Z' })
  const bins = timeHistogram(buildGantt(root, [early, late]))
  expect(bins.length).toBeGreaterThan(10)
  expect(bins[0].label).toBe('1875년 3분기')
})

describe('상위 기간과 동떨어진 하위', () => {
  it('연도 오타(1989)는 축에서 빼고 따로 둔다 — 축이 백 년 늘지 않는다', () => {
    const typo = node({
      id: 'typo',
      title: '연도 오타',
      parentEventId: 'root',
      depth: 1,
      startDate: '2014-07-01T00:00:00.000Z',
      endDate: '2014-07-01T00:00:00.000Z',
    })
    const gantt = buildGantt(root, [...descendants, typo])
    expect(gantt.farOff.map((entry) => entry.node.id)).toEqual(['typo'])
    expect(gantt.rows.some((row) => row.node.id === 'typo')).toBe(false)
    expect(gantt.domain[1]).toBeLessThan(1920)
  })
  it('몇 주 앞선 전사(사라예보)는 동떨어지지 않았다', () => {
    expect(buildGantt(root, descendants).farOff).toEqual([])
  })
})

describe('동떨어짐 기준', () => {
  it('짧은 상위의 수십 년 뒤 후일담은 그대로, 끝을 모르는 상위는 뒤쪽을 따지지 않는다', () => {
    const duchy = node({ id: 'duchy', parentEventId: null, depth: 0, startDate: '0867-01-01', endDate: '0870-12-31' })
    const later = node({ id: 'later', startDate: '0895-01-01' })
    expect(buildGantt(duchy, [later]).farOff).toEqual([])
    const open = node({ id: 'open', parentEventId: null, depth: 0, startDate: '1600-12-31T00:00:00.000Z' })
    const century = node({ id: 'century', startDate: '1765-08-12T00:00:00.000Z' })
    expect(buildGantt(open, [century]).farOff).toEqual([])
  })
})

describe('간트 축 확대 — 고른 시기를 축 전체로', () => {
  it('시기 밖 사건은 offWindow, 안의 사건은 0~100% 안에 선다 — 순서·번호는 그대로', () => {
    const full = buildGantt(root, descendants)
    // 1914년 8월 1일 ~ 12월 31일 — 사라예보(6.28)는 밖, 마른(9.5)은 안
    const zoomed = buildGantt(root, descendants, 'children', { from: 1914 + 7 / 12, to: 1915 })
    const sarajevo = zoomed.rows.find((row) => row.node.id === 'sarajevo')!
    const marne = zoomed.rows.find((row) => row.node.id === 'marne')!
    expect(sarajevo.offWindow).toBe('before')
    expect(marne.offWindow).toBeNull()
    expect(marne.leftPct).toBeGreaterThan(0)
    expect(marne.leftPct).toBeLessThan(100)
    expect(zoomed.rows.map((row) => row.node.id)).toEqual(full.rows.map((row) => row.node.id))
    expect(zoomed.domain).toEqual([1914 + 7 / 12, 1915])
    expect(full.rows.every((row) => row.offWindow === null)).toBe(true)
  })
})

describe('buildWarDeclarationFlow — 선전포고 하위 사건 + 가담·이탈 시점', () => {
  it('WAR_DECLARATION 하위 사건을 시간순으로 모으고 선포국·대상국을 분리하며 상위 가담·이탈 시점을 정렬한다', () => {
    const warRoot = node({
      id: 'ww1',
      title: '제1차 세계대전',
      parentEventId: null,
      depth: 0,
      sides: [{ id: 'side-entente', name: '협상국', color: null }],
      countries: [
        {
          key: 'h:ru',
          id: 'ru',
          kind: 'historical',
          name: '러시아 제국',
          flagEmoji: null,
          role: 'PARTICIPANT',
          sideId: 'side-entente',
          join: { era: 'AD', year: 1914, month: 8, day: 1, precision: 'day' },
          joinReason: '독일의 선전포고',
          withdraw: { era: 'AD', year: 1918, month: 3, day: 3, precision: 'day' },
          withdrawReason: '브레스트-리토프스크 조약',
        },
      ],
    })
    const declLater = node({
      id: 'decl-2',
      title: '독일의 대러 선전포고',
      type: 'WAR_DECLARATION',
      domain: 'DIPLOMACY',
      startDate: '1914-08-01T00:00:00.000Z',
      startDatePrecision: 'day',
      countries: [
        { key: 'h:de', id: 'de', kind: 'historical', name: '독일 제국', flagEmoji: null, role: 'INITIATOR', sideId: null },
        { key: 'h:ru', id: 'ru', kind: 'historical', name: '러시아 제국', flagEmoji: null, role: 'TARGET', sideId: null },
      ],
    })
    const declEarlier = node({
      id: 'decl-1',
      title: '오스트리아-헝가리의 대세르비아 선전포고',
      type: 'WAR_DECLARATION',
      domain: 'DIPLOMACY',
      startDate: '1914-07-28T00:00:00.000Z',
      startDatePrecision: 'day',
      countries: [
        { key: 'h:at', id: 'at', kind: 'historical', name: '오스트리아-헝가리', flagEmoji: null, role: 'INITIATOR', sideId: null },
        { key: 'h:rs', id: 'rs', kind: 'historical', name: '세르비아 왕국', flagEmoji: null, role: 'TARGET', sideId: null },
      ],
    })

    const flow = buildWarDeclarationFlow(warRoot, [declLater, marne, declEarlier])
    expect(flow.declarations.map((item) => item.eventId)).toEqual(['decl-1', 'decl-2'])
    expect(flow.declarations[0].initiators.map((country) => country.name)).toEqual(['오스트리아-헝가리'])
    expect(flow.declarations[0].targets.map((country) => country.name)).toEqual(['세르비아 왕국'])
    expect(flow.milestones.map((milestone) => milestone.kind)).toEqual(['join', 'withdraw'])
    expect(flow.milestones[0].dateLabel).toBe('1914.8.1')
    expect(flow.milestones[0].sideName).toBe('협상국')
    expect(flow.milestones[1].reason).toBe('브레스트-리토프스크 조약')
  })

  it('aggregateMilitaryUnits는 하위 사건에 참전한 군사 부대를 출현 사건 수 순으로 집계한다', () => {
    const firstBattle = node({
      id: 'minsk',
      title: '민스크 포위전',
      sides: [
        {
          id: 'side-axis-1',
          name: '추축국',
          color: '#dc2626',
          outcome: 'DECISIVE_VICTORY',
          outcomeNote: null,
          deployedUnits: [
            {
              id: 'du-1',
              militaryUnitId: 'unit-pg2',
              name: '제2기갑집단',
              unitType: 'ARMY',
              branch: 'ARMOR',
              parentUnitId: null,
              role: 'SPEARHEAD',
              note: null,
              commanderName: '하인츠 구데리안',
            },
          ],
        },
      ],
    })
    const secondBattle = node({
      id: 'smolensk',
      title: '스몰렌스크 전투',
      sides: [
        {
          id: 'side-axis-2',
          name: '추축국',
          color: '#dc2626',
          outcome: 'TACTICAL_VICTORY',
          outcomeNote: null,
          deployedUnits: [
            {
              id: 'du-2',
              militaryUnitId: 'unit-pg2',
              name: '제2기갑집단',
              unitType: 'ARMY',
              branch: 'ARMOR',
              parentUnitId: null,
              role: 'MAIN_FORCE',
              note: null,
              commanderName: '하인츠 구데리안',
            },
            {
              id: 'du-3',
              militaryUnitId: 'unit-pg3',
              name: '제3기갑집단',
              unitType: 'ARMY',
              branch: 'ARMOR',
              parentUnitId: null,
              role: 'FLANK_SUPPORT',
              note: null,
              commanderName: '헤르만 호트',
            },
          ],
        },
      ],
    })
    const units = aggregateMilitaryUnits([firstBattle, secondBattle])
    expect(units).toHaveLength(2)
    expect(units[0].militaryUnitId).toBe('unit-pg2')
    expect(units[0].events).toHaveLength(2)
    expect(units[0].sideName).toBe('추축국')
    expect(units[1].militaryUnitId).toBe('unit-pg3')
    expect(units[1].events).toHaveLength(1)
  })

  it('aggregateContextLinks와 aggregateDeployedWeapons는 하위 사건의 7대 맥락과 투입 병기를 집계한다', () => {
    const firstBattle = node({
      id: 'smolensk',
      title: '스몰렌스크 전투',
      contextLinks: [
        {
          id: 'ctx-1',
          role: 'OBSTACLE',
          entityKind: 'CLIMATE',
          entityName: '라스푸티차',
          description: '추계 진흙탕으로 기동 지연',
          sideName: '추축국',
        },
      ],
      sides: [
        {
          id: 'side-axis-1',
          name: '추축국',
          color: '#dc2626',
          deployedWeapons: [
            {
              id: 'wp-1',
              assetKind: 'GROUND_VEHICLE',
              assetName: 'III호 전차',
              quantity: 450,
              note: '주력 중형전차',
            },
          ],
        },
      ],
    })
    const secondBattle = node({
      id: 'moscow',
      title: '모스크바 공방전',
      contextLinks: [
        {
          id: 'ctx-2',
          role: 'OBSTACLE',
          entityKind: 'CLIMATE',
          entityName: '라스푸티차',
          description: '10월 진흙탕으로 보급 마비',
          sideName: '추축국',
        },
      ],
      sides: [
        {
          id: 'side-axis-2',
          name: '추축국',
          color: '#dc2626',
          deployedWeapons: [
            {
              id: 'wp-2',
              assetKind: 'GROUND_VEHICLE',
              assetName: 'III호 전차',
              quantity: 320,
              note: null,
            },
          ],
        },
      ],
    })
    const contexts = aggregateContextLinks([firstBattle, secondBattle])
    expect(contexts).toHaveLength(1)
    expect(contexts[0].entityName).toBe('라스푸티차')
    expect(contexts[0].events).toHaveLength(2)

    const weapons = aggregateDeployedWeapons([firstBattle, secondBattle])
    expect(weapons).toHaveLength(1)
    expect(weapons[0].assetName).toBe('III호 전차')
    expect(weapons[0].events).toHaveLength(2)
  })
})
