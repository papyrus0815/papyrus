import {
  eventRangeKeys,
  findOverlappingReign,
  formatReignSpan,
  toReignPeriods,
} from './reign-periods'

describe('toReignPeriods', () => {
  it('DATETIME 즉위·퇴위일로 기간을 만든다', () => {
    const [period] = toReignPeriods([
      {
        id: 'r1',
        startDate: '1418-08-10T00:00:00.000Z',
        endDate: '1450-02-17T00:00:00.000Z',
      },
    ])
    expect(period.startKey).toBe(14180810)
    expect(period.endKey).toBe(14500217)
    expect(formatReignSpan(period)).toBe('1418–1450')
  })

  it('BC 재위는 구조화 축을 쓴다(startDate NULL)', () => {
    const [period] = toReignPeriods([
      {
        id: 'r1',
        startDate: null,
        startEra: 'BC',
        startYear: 221,
        startDatePrecision: 'year',
        endEra: 'BC',
        endYear: 210,
        endDatePrecision: 'year',
      },
    ])
    expect(period.startKey).toBe(-221 * 10000 + 101)
    expect(period.endKey).toBe(-210 * 10000 + 1231)
    expect(formatReignSpan(period)).toBe('BC 221–BC 210')
  })

  it('퇴위일이 없으면 사망일로 닫는다', () => {
    const [period] = toReignPeriods(
      [{ id: 'r1', startDate: '1400-01-01T00:00:00.000Z', startDatePrecision: 'year' }],
      { isAlive: false, deathYear: 1422, deathEra: 'AD', deathDatePrecision: 'year' },
    )
    expect(period.endKey).toBe(14221231)
  })

  it('현직이면 열린 구간', () => {
    const [period] = toReignPeriods(
      [{ id: 'r1', startDate: '2022-09-08T00:00:00.000Z' }],
      { isAlive: true },
    )
    expect(period.endKey).toBe(Number.POSITIVE_INFINITY)
    expect(formatReignSpan(period)).toBe('2022–')
  })

  it('즉위일을 모르면 제외', () => {
    expect(toReignPeriods([{ id: 'r1' }])).toEqual([])
  })
})

describe('findOverlappingReign', () => {
  const periods = toReignPeriods([
    {
      id: 'sejong',
      startDate: '1418-08-10T00:00:00.000Z',
      endDate: '1450-02-17T00:00:00.000Z',
    },
  ])

  it('재위 중 사건을 잡는다', () => {
    const range = eventRangeKeys({
      start: '1443-12-30',
      startPrecision: 'day',
    })
    expect(findOverlappingReign(range, periods)?.id).toBe('sejong')
  })

  it('연도만 아는 사건은 그 해 전체로 본다 — 즉위 연도 사건도 포함', () => {
    const range = eventRangeKeys({ start: '1418-01-01', startPrecision: 'year' })
    expect(findOverlappingReign(range, periods)?.id).toBe('sejong')
  })

  it('재위 이전 사건은 제외', () => {
    const range = eventRangeKeys({
      start: '1418-03-01',
      end: '1418-05-01',
      startPrecision: 'day',
      endPrecision: 'day',
    })
    expect(findOverlappingReign(range, periods)).toBeNull()
  })

  it('재위 이전에 시작해 재위 중에 끝난 사건도 겹침', () => {
    const range = eventRangeKeys({
      start: '1410-03-01',
      end: '1420-05-01',
      startPrecision: 'day',
      endPrecision: 'day',
    })
    expect(findOverlappingReign(range, periods)?.id).toBe('sejong')
  })

  it('BC 사건', () => {
    const bcPeriods = toReignPeriods([
      { id: 'qin', startEra: 'BC', startYear: 221, endEra: 'BC', endYear: 210 },
    ])
    const inside = eventRangeKeys({ start: '-0213-01-01', startPrecision: 'year' })
    const outside = eventRangeKeys({ start: '-0230-01-01', startPrecision: 'year' })
    expect(findOverlappingReign(inside, bcPeriods)?.id).toBe('qin')
    expect(findOverlappingReign(outside, bcPeriods)).toBeNull()
  })

  it('날짜 미상 사건은 판정하지 않는다', () => {
    expect(findOverlappingReign(eventRangeKeys({ start: '' }), periods)).toBeNull()
  })
})
