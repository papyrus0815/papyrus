import { formatSpanLabel, layoutTimeline, toAxisSpan } from './development-timeline.lib'

describe('toAxisSpan', () => {
  it('일 정밀도 하루는 점', () => {
    const span = toAxisSpan({ id: 'a', title: 'a', startDate: '1870-09-01T00:00:00.000Z' })!
    expect(span.isPoint).toBe(true)
    expect(span.from).toBeCloseTo(1870 + 8 / 12, 5)
  })

  it('연 정밀도는 그 해 전체를 덮는 불확실 구간', () => {
    const span = toAxisSpan({ id: 'a', title: 'a', startDate: '1002-01-01', startDatePrecision: 'year' })!
    expect(span).toMatchObject({ from: 1002, to: 1003, isPoint: false, uncertain: true })
  })

  it('BC↔AD를 천문 연도 한 축에 — 기원전 1년 다음이 서기 1년', () => {
    const bc = toAxisSpan({ id: 'b', title: 'b', startDate: '-0001-01-01', startDatePrecision: 'year' })!
    const ad = toAxisSpan({ id: 'c', title: 'c', startDate: '0001-01-01', startDatePrecision: 'year' })!
    expect(ad.from - bc.from).toBe(1)
  })

  it('날짜가 없으면 null', () => {
    expect(toAxisSpan({ id: 'a', title: 'a' })).toBeNull()
  })
})

describe('layoutTimeline', () => {
  const parent = { id: 'p', title: '보불전쟁', startDate: '1870-07-19', endDate: '1871-05-10' }

  it('겹치는 항목은 레인을 나누고, 멀리 떨어진 항목은 같은 레인을 쓴다', () => {
    const layout = layoutTimeline(parent, [
      { id: 'sedan', title: '스당 전투', startDate: '1870-09-01', endDate: '1870-09-02' },
      { id: 'paris', title: '파리 포위', startDate: '1870-09-19', endDate: '1871-01-28' },
      { id: 'frankfurt', title: '프랑크푸르트 조약', startDate: '1871-05-10' },
    ])!
    const lane = (id: string) => layout.items.find((item) => item.id === id)!.lane
    expect(lane('sedan')).toBe(0)
    expect(lane('paris')).toBe(1)
    expect(lane('frankfurt')).toBe(0)
    expect(layout.ticks.length).toBeGreaterThan(1)
  })

  it('하위 사건에 날짜가 하나도 없으면 null', () => {
    expect(layoutTimeline(parent, [{ id: 'x', title: 'x' }])).toBeNull()
  })
})

describe('formatSpanLabel', () => {
  it('정밀도대로, BC는 기원전', () => {
    expect(formatSpanLabel({ id: 'a', title: 'a', startDate: '1870-09-01', endDate: '1870-09-02' })).toBe(
      '1870.9.1 ~ 1870.9.2',
    )
    expect(formatSpanLabel({ id: 'a', title: 'a', startDate: '-0216-08-02', startDatePrecision: 'month' })).toBe(
      '기원전 216.8',
    )
  })
})
