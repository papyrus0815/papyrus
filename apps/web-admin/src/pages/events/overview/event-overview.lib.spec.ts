import type { EventOverviewNode } from '@/shared/api/event-overview'

import {
  aggregatePersons,
  buildCountryMatrix,
  buildGantt,
  categoryBreakdown,
  checkNode,
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
  category: null,
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
  category: { id: 'c1', name: '외교' },
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
  category: { id: 'c2', name: '전쟁/군사' },
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

describe('분포', () => {
  it('카테고리는 많은 순, 없으면 미분류', () => {
    expect(categoryBreakdown(descendants)).toEqual([
      { label: '미분류', count: 2 },
      { label: '외교', count: 1 },
      { label: '전쟁/군사', count: 1 },
    ])
  })

  it('짧은 기간은 월 단위 칸', () => {
    const bins = timeHistogram(buildGantt(root, descendants))
    expect(bins.map((bin) => bin.label)).toEqual(['1914.6', '1914.7', '1914.8', '1914.9'])
    expect(bins.map((bin) => bin.count)).toEqual([1, 0, 0, 2])
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
    // 날짜·개요·참여국 = 3/9
    expect(ratio).toBeCloseTo(3 / 9)
  })
})
