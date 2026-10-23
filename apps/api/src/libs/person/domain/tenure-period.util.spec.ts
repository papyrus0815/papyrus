import { edgeFromInput, periodColumnsFromEdges, periodKey, truncateEdge } from './tenure-period.util'

describe('periodKey', () => {
  it('BC는 음수 — 이른 해가 더 작다', () => {
    const bc45 = periodKey({ era: 'BC', year: 45, month: 12, day: 31 }, 'end')
    const bc44 = periodKey({ era: 'BC', year: 44, month: 3, day: 15 }, 'start')
    const ad14 = periodKey({ era: 'AD', year: 14, month: null, day: null }, 'start')
    expect(bc45).toBeLessThan(bc44)
    expect(bc44).toBeLessThan(ad14)
  })
})

describe('edgeFromInput · periodColumnsFromEdges', () => {
  it('구조화 BC 입력 — DATETIME은 비우고 키는 음수', () => {
    const start = edgeFromInput({ era: 'BC', year: 27, month: 1, day: 16 }, null, null)
    const columns = periodColumnsFromEdges(start, null)
    expect(columns).toMatchObject({ startEra: 'BC', startYear: 27, startDate: null, startKey: -270000 + 116 })
    expect(columns.endKey).toBeNull()
  })

  it('레거시 ISO + 연 정밀도 — 월·일을 자르고 DATETIME은 1월 1일', () => {
    const start = edgeFromInput(null, '1740-05-31', 'year')
    const columns = periodColumnsFromEdges(start, edgeFromInput(null, '1786-08-17', null))
    expect(columns).toMatchObject({
      startYear: 1740,
      startMonth: null,
      startDatePrecision: 'year',
      startKey: 17400101,
      endMonth: 8,
      endDay: 17,
      endKey: 17860817,
    })
    expect(columns.startDate?.toISOString()).toBe('1740-01-01T00:00:00.000Z')
  })

  it('AD 1000 미만은 DATETIME을 비운다 (서기 100년 미만 손상 방지)', () => {
    expect(periodColumnsFromEdges(edgeFromInput(null, '0768-10-09', null), null).startDate).toBeNull()
  })

  it('입력이 없으면 끝값도 없다', () => {
    expect(edgeFromInput(null, null, null)).toBeNull()
  })
})

describe('truncateEdge', () => {
  const edge = { era: 'BC' as const, year: 27, month: 1, day: 16 }
  it('정밀도로 자른다 — DATETIME이 없는 BC 끝값도 저장값에서 바로', () => {
    expect(truncateEdge(edge, 'year')).toEqual({ era: 'BC', year: 27, month: null, day: null })
    expect(truncateEdge(edge, 'month')).toEqual({ era: 'BC', year: 27, month: 1, day: null })
    expect(truncateEdge(edge, null)).toEqual(edge)
  })
})
