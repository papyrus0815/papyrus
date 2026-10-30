import {
  buildMemberCells,
  buildSideMetricRows,
  formatRate,
  lossRate,
  memberSum,
  alternativesOf,
  representativeOf,
  sumMismatch,
} from './side-metrics.lib'

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

describe('진영 칸 아래 나라 몫', () => {
  const entry = (sideId: string, participant: string, value: string, atLeast = false) => ({
    id: `${participant}-${value}`,
    subjectType: 'EVENT_PARTICIPANT',
    subjectId: participant,
    metric: { key: 'military.personnel', name: '동원 병력' },
    value,
    low: null,
    high: null,
    atLeast,
    sideId,
  })
  const participants = new Map([
    ['p-prussia', { sideId: 'prussia', name: '프로이센 왕국' }],
    ['p-italy', { sideId: 'prussia', name: '이탈리아 왕국' }],
    ['p-saxony', { sideId: 'austria', name: '작센 왕국' }],
  ])
  it('지표 → 진영 → 나라로 묶고, 진영 밖 나라는 뺀다', () => {
    const cells = buildMemberCells(
      [entry('prussia', 'p-prussia', '437000'), entry('prussia', 'p-italy', '200000'), entry('x', 'p-unknown', '1')],
      participants,
    )
    expect(cells.get('military.personnel')?.get('prussia')?.map((member) => member.name)).toEqual([
      '프로이센 왕국',
      '이탈리아 왕국',
    ])
    expect(cells.get('military.personnel')?.has('x')).toBe(false)
  })
  it("합은 나라마다 하나씩·'이상' 없을 때만, 5% 넘게 어긋나면 차이", () => {
    const members = buildMemberCells([entry('prussia', 'p-prussia', '437000'), entry('prussia', 'p-italy', '200000')], participants)
      .get('military.personnel')!
      .get('prussia')!
    expect(memberSum(members)).toBe(637000)
    expect(sumMismatch(637000, 637000)).toBeNull()
    expect(sumMismatch(600000, 535000)).toBe(65000)
    const withFloor = buildMemberCells([entry('austria', 'p-saxony', '24000', true)], participants)
      .get('military.personnel')!
      .get('austria')!
    expect(memberSum(withFloor)).toBeNull()
  })
})

describe('representativeOf — 경합 추정치', () => {
  const role = (id: string, estimateRole: string | null) => ({ ...obs(id, 'A', 'military.personnel', '1'), estimateRole })

  it('하나면 그것, 여럿이면 채택이 정확히 하나일 때만', () => {
    expect(representativeOf([role('1', null)])?.id).toBe('1')
    expect(representativeOf([role('1', 'ALTERNATIVE'), role('2', 'PREFERRED')])?.id).toBe('2')
    expect(representativeOf([role('1', null), role('2', null)])).toBeNull()
    expect(representativeOf([role('1', 'PREFERRED'), role('2', 'PREFERRED')])).toBeNull()
  })

  it('대안 목록은 대표가 정해졌을 때만 — 아니면 전부 나란히', () => {
    expect(alternativesOf([role('1', 'ALTERNATIVE'), role('2', 'PREFERRED')]).map((item) => item.id)).toEqual(['1'])
    expect(alternativesOf([role('1', null), role('2', null)])).toEqual([])
  })

  it('나라 합도 채택 추정치로 낸다', () => {
    const member = (name: string, value: string, estimateRole: string | null) => ({
      name,
      observation: { ...obs(name + value, 'P', 'military.personnel', value), estimateRole },
    })
    expect(memberSum([member('작센', '100', 'PREFERRED'), member('작센', '300', 'ALTERNATIVE'), member('바이에른', '50', null)])).toBe(150)
  })
})
