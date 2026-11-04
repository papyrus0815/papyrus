import {
  assignPhases,
  datedPhases,
  phaseReach,
  phaseReachLabel,
  childStartKey,
  formatPhasePoint,
  parsePhasePoint,
  phaseRangeLabel,
  type EventPhase,
} from './event-phase.lib'

const phase = (id: string, order: number, start: [number, number?, number?], end?: [number, number?, number?]): EventPhase => ({
  id,
  title: id,
  order,
  startEra: 'AD',
  startYear: start[0],
  startMonth: start[1] ?? null,
  startDay: start[2] ?? null,
  endEra: end ? 'AD' : null,
  endYear: end?.[0] ?? null,
  endMonth: end?.[1] ?? null,
  endDay: end?.[2] ?? null,
})

// 입법의회기 1~3국면
const phases = [phase('p1', 0, [1791, 10], [1792, 3]), phase('p2', 1, [1792, 4], [1792, 7]), phase('p3', 2, [1792, 8], [1792, 9])]
const day = (id: string, iso: string, extra: Partial<{ phaseId: string }> = {}) => ({
  id,
  startDate: `${iso}T00:00:00.000Z`,
  startDatePrecision: 'day',
  ...extra,
})

describe('assignPhases', () => {
  it('시작일이 든 국면으로 자동 배정 — 경계의 월말·월초도', () => {
    const result = assignPhases(phases, [
      day('opening', '1791-10-01'),
      day('girondin', '1792-03-10'),
      day('guillotine', '1792-04-25'),
      day('patrie', '1792-07-11'),
      day('august10', '1792-08-10'),
      day('dissolve', '1792-09-20'),
    ])
    expect([...result.values()].map((value) => value.phaseId)).toEqual(['p1', 'p1', 'p2', 'p2', 'p3', 'p3'])
    expect(result.get('opening')?.manual).toBe(false)
  })
  it('손 지정이 날짜보다 우선, 목록에 없는 국면 id는 무시', () => {
    const result = assignPhases(phases, [
      day('brunswick', '1792-07-25', { phaseId: 'p3' }),
      day('stray', '1792-07-25', { phaseId: 'gone' }),
    ])
    expect(result.get('brunswick')).toEqual({ phaseId: 'p3', manual: true })
    expect(result.get('stray')).toEqual({ phaseId: 'p2', manual: false })
  })
  it('국면 밖이면 null, 끝을 비운 국면은 다음 국면 전까지', () => {
    const open = [phase('a', 0, [1792, 1]), phase('b', 1, [1792, 6])]
    const result = assignPhases(open, [day('x', '1792-05-31'), day('y', '1792-06-01'), day('z', '1791-12-31')])
    expect(result.get('x')?.phaseId).toBe('a')
    expect(result.get('y')?.phaseId).toBe('b')
    expect(result.get('z')?.phaseId).toBeNull()
  })
  it('연도만 아는 사건은 그해 한가운데로', () => {
    expect(childStartKey({ id: 'y', startDate: '1792-01-01T00:00:00.000Z', startDatePrecision: 'year' })).toBe(17920701)
  })
})

describe('기간 입력·표기', () => {
  it('여러 표기를 읽는다', () => {
    expect(parsePhasePoint('1791.10')).toEqual({ era: 'AD', year: 1791, month: 10, day: null })
    expect(parsePhasePoint('1792-08-10')).toEqual({ era: 'AD', year: 1792, month: 8, day: 10 })
    expect(parsePhasePoint('1792년 8월 10일')).toEqual({ era: 'AD', year: 1792, month: 8, day: 10 })
    expect(parsePhasePoint('기원전 49')).toEqual({ era: 'BC', year: 49, month: null, day: null })
    expect(parsePhasePoint('')).toBeNull()
    expect(parsePhasePoint('1792.13')).toBeUndefined()
    expect(parsePhasePoint('언젠가')).toBeUndefined()
  })
  it('표기는 입력의 역', () => {
    expect(formatPhasePoint('AD', 1791, 10, null)).toBe('1791.10')
    expect(formatPhasePoint('BC', 49, null, null)).toBe('기원전 49')
    expect(phaseRangeLabel(phases[0])).toBe('1791.10–1792.3')
  })
})

describe('datedPhases', () => {
  it('국면을 시간축 날짜 꼴로 — 빈 끝은 다음 국면 시작까지, 월만 적은 끝은 그달 말일', () => {
    const open = [phase('a', 0, [1792, 2]), phase('b', 1, [1792, 9], [1792, 12])]
    expect(datedPhases(open).map((item) => [item.position, item.startDate, item.startDatePrecision, item.endDate])).toEqual([
      [1, '1792-02-01', 'month', '1792-09-01'],
      [2, '1792-09-01', 'month', '1792-12-31'],
    ])
    expect(datedPhases([phase('c', 0, [1792, 2], [1792, 2])])[0].endDate).toBe('1792-02-29')
  })
})

describe('phaseReach', () => {
  const span = (id: string, start: string, end: string) => ({
    id,
    startDate: `${start}T00:00:00.000Z`,
    startDatePrecision: 'day',
    endDate: `${end}T00:00:00.000Z`,
    endDatePrecision: 'day',
  })
  it('여러 국면에 걸치면 시작 국면–끝 국면', () => {
    expect(phaseReachLabel(phaseReach(phases, span('war', '1792-04-20', '1797-10-17')))).toBe('2–3국면')
    expect(phaseReachLabel(phaseReach(phases, span('crisis', '1792-06-01', '1792-06-30')))).toBe('2국면')
  })
  it('국면 밖은 전·후로 나눈다, 손 지정은 그 하나', () => {
    expect(phaseReachLabel(phaseReach(phases, span('early', '1789-05-05', '1791-09-30')))).toBe('국면 전')
    expect(phaseReachLabel(phaseReach(phases, span('late', '1792-10-01', '1793-06-02')))).toBe('국면 후')
    expect(phaseReachLabel(phaseReach(phases, { ...span('manual', '1792-04-20', '1797-10-17'), phaseId: 'p3' }))).toBe('3국면')
  })
})
