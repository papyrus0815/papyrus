import { MAX_LANES, computeLifeTimeline } from './life-timeline.lib'

const base = { isDeceased: true, nowYear: 2026 }

describe('computeLifeTimeline', () => {
  it('기록이 하나도 날짜가 없으면 그리지 않는다(null)', () => {
    expect(
      computeLifeTimeline({
        ...base,
        records: [{ key: 'tenure-1', family: 'office', title: 'A' }],
        birthYear: 1852,
        deathYear: 1931,
      }),
    ).toBeNull()
  })

  it('축은 출생~사망, 막대는 그 안의 비율', () => {
    const layout = computeLifeTimeline({
      ...base,
      records: [
        {
          key: 'tenure-1',
          family: 'office',
          title: '총사령관',
          startDate: '1911-07-01',
          endDate: '1916-12-01',
        },
      ],
      birthYear: 1852,
      deathYear: 1931,
    })!
    expect(layout.from).toBe(1852)
    expect(layout.to).toBe(1932)
    expect(layout.bars[0].x0).toBeGreaterThan(0.7)
    expect(layout.bars[0].x1).toBeLessThan(0.82)
    expect(layout.bars[0].endYear).toBe(1916)
  })

  it('겹치는 구간은 다른 레인, 이어지는 구간은 같은 레인', () => {
    const layout = computeLifeTimeline({
      ...base,
      records: [
        { key: 'a', family: 'office', title: 'A', startDate: '1900-01-01', endDate: '1903-01-01' },
        { key: 'b', family: 'office', title: 'B', startDate: '1903-01-01', endDate: '1905-01-01' },
        { key: 'c', family: 'noble', title: 'C', startDate: '1901-01-01', endDate: '1910-01-01' },
      ],
      birthYear: 1880,
      deathYear: 1930,
    })!
    const laneOf = (key: string) => layout.bars.find((bar) => bar.key === key)!.lane
    expect(laneOf('a')).toBe(laneOf('b'))
    expect(laneOf('c')).not.toBe(laneOf('a'))
    expect(layout.laneCount).toBe(2)
  })

  it('레인은 상한에서 멈추고 넘치는 구간은 마지막 레인에 겹친다', () => {
    const records = Array.from({ length: 7 }, (_unused, index) => ({
      key: `r${index}`,
      family: 'office' as const,
      title: `R${index}`,
      startDate: '1900-01-01',
      endDate: '1910-01-01',
    }))
    const layout = computeLifeTimeline({ ...base, records, birthYear: 1880, deathYear: 1950 })!
    expect(layout.laneCount).toBe(MAX_LANES)
    expect(Math.max(...layout.bars.map((bar) => bar.lane))).toBe(MAX_LANES - 1)
  })

  it('종료일 없는 생존자의 구간은 현재까지 열린 막대', () => {
    const layout = computeLifeTimeline({
      records: [{ key: 'a', family: 'office', title: '대통령', startDate: '2017-01-20' }],
      birthYear: 1946,
      deathYear: null,
      isDeceased: false,
      nowYear: 2026,
    })!
    expect(layout.bars[0].open).toBe(true)
    expect(layout.bars[0].x1).toBe(1)
  })

  it('눈금은 축 안에서 4~8개', () => {
    const layout = computeLifeTimeline({
      ...base,
      records: [{ key: 'a', family: 'reign', title: '왕', startDate: '1643-05-14', endDate: '1715-09-01' }],
      birthYear: 1638,
      deathYear: 1715,
    })!
    expect(layout.ticks.length).toBeGreaterThanOrEqual(4)
    expect(layout.ticks.length).toBeLessThanOrEqual(8)
    expect(layout.ticks.every((tick) => tick.x >= 0 && tick.x <= 1)).toBe(true)
  })

  it('기원전 인물 — 음수 연도 축', () => {
    const layout = computeLifeTimeline({
      ...base,
      records: [{ key: 'a', family: 'office', title: '집정관', startDate: '-0059-01-01', endDate: '-0058-01-01' }],
      birthYear: -100,
      deathYear: -44,
    })!
    expect(layout.from).toBe(-100)
    expect(layout.bars[0].x0).toBeGreaterThan(0.7)
  })
})
