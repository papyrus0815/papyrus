import { buildSideMetricRows, formatRate, lossRate } from './side-metrics.lib'

const obs = (id: string, side: string, key: string, value: string | null, extra: Partial<{ low: string; high: string; atLeast: boolean; subjectType: string }> = {}) => ({
  id,
  subjectType: extra.subjectType ?? 'EVENT_SIDE',
  subjectId: side,
  metric: { key, name: key },
  value,
  low: extra.low ?? null,
  high: extra.high ?? null,
  atLeast: extra.atLeast ?? false,
})

describe('buildSideMetricRows', () => {
  it('지표 행 × 진영 칸 — 처음 나온 순서, 진영 아닌 대상·모르는 진영은 뺀다', () => {
    const rows = buildSideMetricRows(
      [
        obs('1', 'A', 'military.personnel', '1200000'),
        obs('2', 'B', 'military.personnel', '900000'),
        obs('3', 'A', 'military.wounded', '89700'),
        obs('4', 'P1', 'military.personnel', '50000', { subjectType: 'EVENT_PARTICIPANT' }),
        obs('5', 'GONE', 'military.wounded', '1'),
      ],
      ['A', 'B'],
    )
    expect(rows.map((row) => row.key)).toEqual(['military.personnel', 'military.wounded'])
    expect(rows[0].cells.get('B')?.map((item) => item.id)).toEqual(['2'])
    expect(rows[1].cells.has('B')).toBe(false)
  })

  it('같은 진영·같은 지표가 여럿이면 한 칸에 모은다', () => {
    const rows = buildSideMetricRows(
      [obs('1', 'A', 'military.personnel', '1'), obs('2', 'A', 'military.personnel', '2')],
      ['A'],
    )
    expect(rows[0].cells.get('A')).toHaveLength(2)
  })
})

describe('lossRate', () => {
  it('손실 합계 ÷ 동원 병력 — 손실 지표는 우선순위대로 하나', () => {
    const rows = buildSideMetricRows(
      [
        obs('1', 'B', 'military.personnel', '900000'),
        obs('2', 'B', 'military.deaths_unspecified', '138800'),
        obs('3', 'B', 'military.casualties_total', '756000'),
      ],
      ['B'],
    )
    const result = lossRate(rows, 'B')!
    expect(result.lossName).toBe('military.casualties_total')
    expect(formatRate(result.rate)).toBe('84%')
  })

  it('범위 값은 가운데로 나눈다', () => {
    const rows = buildSideMetricRows(
      [obs('1', 'A', 'military.personnel', '1000'), obs('2', 'A', 'military.killed_in_action', null, { low: '40', high: '60' })],
      ['A'],
    )
    expect(formatRate(lossRate(rows, 'A')!.rate)).toBe('5.0%')
  })

  it('동원이 없거나, 값이 여럿이거나, ~이상이면 내지 않는다', () => {
    const noPersonnel = buildSideMetricRows([obs('1', 'A', 'military.casualties_total', '10')], ['A'])
    expect(lossRate(noPersonnel, 'A')).toBeNull()
    const twoPersonnel = buildSideMetricRows(
      [
        obs('1', 'A', 'military.personnel', '100'),
        obs('2', 'A', 'military.personnel', '200'),
        obs('3', 'A', 'military.casualties_total', '10'),
      ],
      ['A'],
    )
    expect(lossRate(twoPersonnel, 'A')).toBeNull()
    const atLeast = buildSideMetricRows(
      [obs('1', 'A', 'military.personnel', '100'), obs('2', 'A', 'military.casualties_total', null, { low: '10', atLeast: true })],
      ['A'],
    )
    expect(lossRate(atLeast, 'A')).toBeNull()
  })
})
