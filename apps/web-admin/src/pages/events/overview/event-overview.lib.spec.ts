import type { EventOverviewNode } from '@/shared/api/event-overview'

import {
  aggregatePersons,
  buildCountryMatrix,
  axisTicks,
  buildGantt,
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
  it('라벨은 연도만, 막대는 불확실 구간, 점검은 일부', () => {
    const gantt = buildGantt(root, [yearOnly])
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
      metrics: [{ metricKey: 'k', metricName: '배상금', unit: null, value: 1, low: null, high: null, approx: false }],
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
