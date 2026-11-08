import { buildEraAxis, centuryOf, decadeIndex, decadeMidYear, packLanes } from './era-strip.lib'

describe('시대 띠 축', () => {
  it('세기 번호 — 0년 없는 부호 연도', () => {
    expect(centuryOf(1914)).toBe(20)
    expect(centuryOf(1900)).toBe(19)
    expect(centuryOf(-44)).toBe(-1)
    expect(centuryOf(-101)).toBe(-2)
  })

  it('사건 있는 세기는 같은 폭, 빈 세기 구간은 좁은 틈 하나', () => {
    const axis = buildEraAxis([450, 1789, 1914, 2025])!
    const kinds = axis.slots.map((slot) => `${slot.kind}:${slot.century}`)
    expect(kinds).toEqual(['century:5', 'gap:5', 'century:18', 'gap:18', 'century:20', 'century:21'])
    const centuries = axis.slots.filter((slot) => slot.kind === 'century')
    expect(new Set(centuries.map((slot) => slot.width.toFixed(4))).size).toBe(1)
    expect(axis.slots.find((slot) => slot.kind === 'gap')!.skipped).toBe(12)
  })

  it('BC와 AD가 이어지면 틈이 없다 — BC 1세기 다음은 AD 1세기', () => {
    const axis = buildEraAxis([-44, 14])!
    expect(axis.slots.map((slot) => slot.kind)).toEqual(['century', 'century'])
    expect(axis.toPct(-44)).toBeLessThan(axis.toPct(14))
  })

  it('세기 안에서는 연도에 비례, 없는 세기는 앞 칸 끝에 붙는다', () => {
    const axis = buildEraAxis([1701, 1914])!
    const eighteenth = axis.slots[0]
    expect(axis.toPct(1751)).toBeCloseTo(eighteenth.left + eighteenth.width / 2, 5)
    expect(axis.toPct(1850)).toBeCloseTo(eighteenth.left + eighteenth.width, 5)
  })

  it('10년 칸과 그 가운데 해', () => {
    expect(decadeIndex(1914)).toBe(1)
    expect(decadeMidYear(20, 1)).toBe(1916)
    expect(decadeIndex(-44)).toBe(5)
    expect(decadeMidYear(-1, 5)).toBe(-45)
  })

  it('겹치는 막대는 다음 줄로', () => {
    const packed = packLanes(
      [
        { left: 10, right: 30 },
        { left: 20, right: 40 },
        { left: 35, right: 50 },
      ],
      3,
    )
    expect(packed.map((item) => item.lane)).toEqual([0, 1, 0])
  })
})
