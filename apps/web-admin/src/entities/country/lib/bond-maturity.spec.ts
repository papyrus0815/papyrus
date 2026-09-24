import {
  BOND_MATURITIES,
  bondMaturityLabel,
  compareBondMaturity,
  formatBasisPoints,
  formatYield,
  pickBenchmarkMaturity,
} from './bond-maturity'

describe('compareBondMaturity', () => {
  it('알파벳순이 아니라 만기 길이순으로 세운다', () => {
    /* 문자열 정렬이면 Y1 < Y10 < Y15 < Y2 가 되어 곡선의 가로축이 뒤엉킨다 */
    const sorted = ['Y10', 'M3', 'Y2', 'Y1', 'PERPETUAL' as const].sort(
      compareBondMaturity as never,
    )
    expect(sorted).toEqual(['M3', 'Y1', 'Y2', 'Y10', 'PERPETUAL'])
  })

  it('선언 순서 자체가 이미 짧은 만기부터다', () => {
    const years = BOND_MATURITIES.map((meta) => meta.years)
    expect([...years].sort((left, right) => left - right)).toEqual(years)
  })
})

describe('pickBenchmarkMaturity', () => {
  it('10년물이 있으면 10년물', () => {
    expect(pickBenchmarkMaturity(['M3', 'Y10', 'Y30'])).toBe('Y10')
  })

  it('없으면 10년에 가장 가까운 만기', () => {
    expect(pickBenchmarkMaturity(['M3', 'Y7', 'Y30'])).toBe('Y7')
  })

  it('거리가 같으면 짧은 쪽 — 자료가 더 촘촘한 구간이라서', () => {
    expect(pickBenchmarkMaturity(['Y5', 'Y15'])).toBe('Y5')
  })

  it('아무것도 없으면 null (없는 만기를 지어내지 않는다)', () => {
    expect(pickBenchmarkMaturity([])).toBeNull()
  })
})

describe('표기', () => {
  it('수익률은 소수 둘째 자리 — 시장 관행', () => {
    expect(formatYield(4.5)).toBe('4.50%')
    expect(formatYield(-0.126)).toBe('-0.13%')
  })

  it('변화폭은 %p가 아니라 bp로 적어 수익률과 섞이지 않게 한다', () => {
    expect(formatBasisPoints(0.7)).toBe('+70bp')
    expect(formatBasisPoints(-0.35)).toBe('-35bp')
    expect(formatBasisPoints(0)).toBe('0bp')
  })

  it('만기 이름', () => {
    expect(bondMaturityLabel('M3')).toBe('3개월')
    expect(bondMaturityLabel('PERPETUAL')).toBe('영구채')
  })
})
