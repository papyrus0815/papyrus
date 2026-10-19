import { groupByPhase, phaseOf } from './collection-development.lib'

const ww1 = { startDate: '1914-07-28', startDatePrecision: 'day', endDate: '1918-11-11', endDatePrecision: 'day' }

describe('phaseOf', () => {
  it('개전 전 7월 위기는 시작 이전', () => {
    expect(phaseOf({ startDate: '1914-06-28T00:00:00.000Z', startDatePrecision: 'day' }, ww1)).toBe('before')
  })

  it('기간 안은 기간 중, 시작 당일도 기간 중', () => {
    expect(phaseOf({ startDate: '1916-02-21', startDatePrecision: 'day' }, ww1)).toBe('during')
    expect(phaseOf({ startDate: '1914-07-28', startDatePrecision: 'day' }, ww1)).toBe('during')
  })

  it('종료 뒤는 끝난 뒤', () => {
    expect(phaseOf({ startDate: '1919-06-28', startDatePrecision: 'day' }, ww1)).toBe('after')
  })

  it('거친 정밀도에서 비교 — 연도만 아는 1700년은 1700-02-22 시작과 같은 해라 기간 중', () => {
    const northernWar = { startDate: '1700-02-22', startDatePrecision: 'day', endDate: '1721-09-10' }
    expect(phaseOf({ startDate: '1700-01-01', startDatePrecision: 'year' }, northernWar)).toBe('during')
    expect(phaseOf({ startDate: '1699-01-01', startDatePrecision: 'year' }, northernWar)).toBe('before')
  })

  it('월 정밀도 — 1914년 7월은 7.28 시작과 같은 달이라 기간 중', () => {
    expect(phaseOf({ startDate: '1914-07-01', startDatePrecision: 'month' }, ww1)).toBe('during')
  })

  it('BC 날짜도 부호 연도로 비교한다', () => {
    const war = { startDate: '-0431-01-01', startDatePrecision: 'year', endDate: '-0404-01-01', endDatePrecision: 'year' }
    expect(phaseOf({ startDate: '-0433-01-01', startDatePrecision: 'year' }, war)).toBe('before')
    expect(phaseOf({ startDate: '-0415-01-01', startDatePrecision: 'year' }, war)).toBe('during')
  })

  it('날짜 없는 하위는 날짜 미상, 상위 날짜가 없으면 전부 기간 중', () => {
    expect(phaseOf({}, ww1)).toBe('undated')
    expect(phaseOf({ startDate: '1900-01-01' }, {})).toBe('during')
  })
})

describe('groupByPhase', () => {
  it('구획 순서는 이전 → 중 → 뒤 → 미상, 빈 구획은 빠진다', () => {
    const groups = groupByPhase(
      [
        { id: 'a', startDate: '1914-06-28' },
        { id: 'b', startDate: '1914-08-04' },
        { id: 'c' },
      ],
      ww1,
    )
    expect(groups.map((group) => [group.phase, group.items.map((item) => item.id)])).toEqual([
      ['before', ['a']],
      ['during', ['b']],
      ['undated', ['c']],
    ])
  })
})
