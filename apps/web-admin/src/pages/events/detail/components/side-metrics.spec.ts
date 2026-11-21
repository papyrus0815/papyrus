import {
  buildMemberCells,
  buildSideMetricRows,
  buildUnitCells,
  formatRate,
  lossRate,
  memberSum,
  alternativesOf,
  comparableOf,
  lossCompositions,
  orderSideMetricRows,
  representativeOf,
  sideLossOf,
  sideSizeOf,
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

  it('봉기·진압처럼 human.deaths_total·human.executed 및 society.participants로 기록된 진영도 손실률을 계산한다', () => {
    const rows = buildSideMetricRows(
      [
        obs('1', 'rebels', 'society.participants', '3000'),
        obs('2', 'rebels', 'human.deaths_total', '156'),
      ],
      ['rebels'],
    )
    const result = lossRate(rows, 'rebels')!
    expect(result.lossName).toBe('human.deaths_total')
    expect(formatRate(result.rate)).toBe('5.2%')
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

describe('buildUnitCells — 진영 산하 부대별 측정값', () => {
  it('EVENT_SIDE_UNIT 측정값을 진영별로 묶고 합산·오차를 검증한다', () => {
    const unitSide = new Map([
      ['su-north', { sideId: 'axis', name: '북부집단군' }],
      ['su-center', { sideId: 'axis', name: '중부집단군' }],
    ])
    const cells = buildUnitCells(
      [
        obs('u1', 'su-north', 'military.personnel', '655000', { subjectType: 'EVENT_SIDE_UNIT' }),
        obs('u2', 'su-center', 'military.personnel', '1308000', { subjectType: 'EVENT_SIDE_UNIT' }),
      ],
      unitSide,
    )
    const axisUnits = cells.get('military.personnel')?.get('axis') ?? []
    expect(axisUnits.map((entry) => entry.name)).toEqual(['북부집단군', '중부집단군'])
    expect(memberSum(axisUnits)).toBe(1963000)
  })
})

describe('comparableOf — 해설·그래프 배수·참여 요약판의 공용 판정', () => {
  it("'~이상'·대표 없는 여러 값·0은 비교하지 않는다", () => {
    expect(comparableOf([obs('1', 'A', 'military.deaths_total', null, { low: '300000', atLeast: true })])).toBeNull()
    expect(comparableOf([obs('1', 'A', 'k', '520'), obs('2', 'A', 'k', null, { low: '1000', high: '2000' })])).toBeNull()
    expect(comparableOf([obs('1', 'A', 'k', '0')])).toBeNull()
    expect(comparableOf([obs('1', 'A', 'k', null, { low: '700000', high: '900000' })])?.value).toBe(800000)
  })
})

describe('sideSizeOf — 진영 규모', () => {
  it('병력 → 참여 인원 순, 진영 값이 없으면 나라 합', () => {
    const observations = [
      obs('1', 'A', 'military.personnel', '3000'),
      obs('2', 'B', 'society.participants', null, { low: '3000', high: '10000' }),
      obs('3', 'P1', 'military.personnel', '400', { subjectType: 'EVENT_PARTICIPANT' }),
      obs('4', 'P2', 'military.personnel', '600', { subjectType: 'EVENT_PARTICIPANT' }),
    ]
    const rows = buildSideMetricRows(observations, ['A', 'B', 'C'])
    const members = buildMemberCells(
      observations,
      new Map([
        ['P1', { sideId: 'C', name: '갑' }],
        ['P2', { sideId: 'C', name: '을' }],
      ]),
    )
    expect(sideSizeOf(rows, members, 'A')).toMatchObject({ metricKey: 'military.personnel', value: 3000, derived: false })
    expect(sideSizeOf(rows, members, 'B')).toMatchObject({ metricKey: 'society.participants', value: 6500 })
    expect(sideSizeOf(rows, members, 'C')).toMatchObject({ value: 1000, derived: true })
  })
})

describe('orderSideMetricRows', () => {
  it('규모 → 손실 합계 → 나머지(원래 순서 유지)', () => {
    const order = orderSideMetricRows(
      ['military.deaths_unspecified', 'military.wounded', 'military.casualties_total', 'military.personnel'].map(
        (key) => ({ key }),
      ),
    )
    expect(order.map((row) => row.key)).toEqual([
      'military.personnel',
      'military.casualties_total',
      'military.deaths_unspecified',
      'military.wounded',
    ])
  })
})

describe('lossCompositions — 손실 구성', () => {
  it('보불전쟁 프랑스 측 — 네 몫, 기록된 합계와 5% 넘게 어긋나면 차이', () => {
    const rows = buildSideMetricRows(
      [
        obs('1', 'FR', 'military.deaths_unspecified', '138800'),
        obs('2', 'FR', 'military.wounded', '143000'),
        obs('3', 'FR', 'military.missing', '41000'),
        obs('4', 'FR', 'military.captured', '474000'),
        obs('5', 'FR', 'military.casualties_total', '756000'),
        obs('6', 'DE', 'military.deaths_unspecified', '44700'),
        obs('7', 'DE', 'military.wounded', '89700'),
        obs('8', 'DE', 'military.casualties_total', '139000'),
      ],
      ['DE', 'FR'],
    )
    const [germany, france] = lossCompositions(rows, ['DE', 'FR'])
    expect(france.parts.map((part) => part.key)).toEqual(['deaths', 'wounded', 'missing', 'captured'])
    expect(france.sum).toBe(796800)
    expect(france.mismatch).toBe(756000 - 796800)
    expect(germany.parts).toHaveLength(2)
  })

  it("질병 사망까지 든 '군 총사망'은 몫이 아니다 · 몫이 하나뿐인 진영끼리는 쌓지 않는다", () => {
    const rows = buildSideMetricRows(
      [obs('1', 'A', 'military.deaths_total', '450000'), obs('2', 'B', 'military.combat_deaths', '70000')],
      ['A', 'B'],
    )
    expect(lossCompositions(rows, ['A', 'B'])).toEqual([])
  })
})

describe('lossRate — 어느 규모로 나눴는가', () => {
  it('병력이 없으면 참여 인원, sizeKey로 알린다', () => {
    const rows = buildSideMetricRows(
      [obs('1', 'B', 'society.participants', '10000'), obs('2', 'B', 'human.deaths_total', '156')],
      ['B'],
    )
    expect(lossRate(rows, 'B')).toMatchObject({ sizeKey: 'society.participants' })
  })

  it('진영 직접 값이 없어도 나라 합(memberCells)과 부대 합(unitCells)으로 규모·손실·손실률을 낸다', () => {
    const observations = [
      obs('u1', 'su-north', 'military.personnel', '600000', { subjectType: 'EVENT_SIDE_UNIT' }),
      obs('u2', 'su-south', 'military.personnel', '400000', { subjectType: 'EVENT_SIDE_UNIT' }),
      obs('p1', 'part-1', 'military.casualties_total', '120000', { subjectType: 'EVENT_PARTICIPANT' }),
      obs('p2', 'part-2', 'military.casualties_total', '80000', { subjectType: 'EVENT_PARTICIPANT' }),
    ]
    const rows = buildSideMetricRows(observations, ['axis'])
    const members = buildMemberCells(
      observations,
      new Map([
        ['part-1', { sideId: 'axis', name: '독일국' }],
        ['part-2', { sideId: 'axis', name: '루마니아 왕국' }],
      ]),
    )
    const units = buildUnitCells(
      observations,
      new Map([
        ['su-north', { sideId: 'axis', name: '북부집단군' }],
        ['su-south', { sideId: 'axis', name: '남부집단군' }],
      ]),
    )
    expect(sideSizeOf(rows, members, 'axis', units)).toMatchObject({
      value: 1000000,
      derived: true,
      derivedFrom: 'unit',
    })
    expect(sideLossOf(rows, members, 'axis', units)).toMatchObject({
      value: 200000,
      derived: true,
      derivedFrom: 'country',
    })
    const derivedRate = lossRate(rows, 'axis', members, units)!
    expect(formatRate(derivedRate.rate)).toBe('20%')
    expect(derivedRate.derived).toBe(true)
  })
})
