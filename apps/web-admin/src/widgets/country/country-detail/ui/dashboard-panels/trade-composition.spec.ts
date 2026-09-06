import {
  barRowsOf,
  buildComposition,
  shareOf,
  type CompositionItem,
} from './trade-composition'

const item = (over: Partial<CompositionItem>): CompositionItem => ({
  name: '무명',
  grain: 'COMMODITY',
  ...over,
})

describe('shareOf', () => {
  it('자료가 적어 준 비중이 먼저', () => {
    expect(shareOf(item({ sharePct: 5.7, value: 999 }), 100)).toBe(5.7)
  })

  it('금액만 있으면 그 해 총액으로 나눠 구한다 (같은 단위·배율)', () => {
    expect(shareOf(item({ value: 250 }), 1000)).toBe(25)
  })

  it('둘 다 없으면 0이 아니라 모른다 — 0은 "없었다"는 뜻이 된다', () => {
    expect(shareOf(item({}), 1000)).toBeNull()
    expect(shareOf(item({ value: 250 }), null)).toBeNull()
  })

  it('decimal이 문자열로 와도 읽는다 (SDK 응답)', () => {
    expect(shareOf(item({ sharePct: '4.10' }), null)).toBe(4.1)
  })
})

describe('barRowsOf', () => {
  it('같은 품목이 두 단면에 다 있으면 상대×품목 쪽을 뺀다 (이중 계상)', () => {
    const rows = barRowsOf([
      item({ name: '반도체', commodityId: 'c1' }),
      item({ name: '반도체', commodityId: 'c1', grain: 'PARTNER_COMMODITY' }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].grain).toBe('COMMODITY')
  })

  // 조선 1890은 일곱 줄이 모두 상대×품목이다 — 통째로 빼면 막대가 사라진다
  it('상대×품목만 있는 자료도 막대에 올린다', () => {
    const rows = barRowsOf([
      item({ name: '쌀', grain: 'PARTNER_COMMODITY' }),
      item({ name: '콩', grain: 'PARTNER_COMMODITY' }),
    ])
    expect(rows).toHaveLength(2)
  })

  it('상대국 단면은 품목 막대의 모수가 아니다', () => {
    expect(barRowsOf([item({ name: '캐나다', grain: 'PARTNER' })])).toHaveLength(0)
  })
})

describe('buildComposition', () => {
  // 미국 2024 수출 — 이 섹션에서 가장 크게 틀렸던 자리
  const usExports: CompositionItem[] = [
    item({ name: '원유', sharePct: 5.7, rootCategoryId: 'energy', rootCategoryName: '에너지·광물', rootCategoryColorKey: 'amber' }),
    item({ name: '석유제품', sharePct: 4.1, rootCategoryId: 'energy', rootCategoryName: '에너지·광물', rootCategoryColorKey: 'amber' }),
    item({ name: '천연가스', sharePct: 3.1, rootCategoryId: 'energy', rootCategoryName: '에너지·광물', rootCategoryColorKey: 'amber' }),
    item({ name: '항공기', sharePct: 5.0, rootCategoryId: 'transport', rootCategoryName: '운송장비' }),
    item({ name: '승용차', sharePct: 2.9, rootCategoryId: 'transport', rootCategoryName: '운송장비' }),
    item({ name: '의약품', sharePct: 4.6, rootCategoryId: 'chem', rootCategoryName: '화학·의약' }),
    item({ name: '반도체', sharePct: 2.9, rootCategoryId: 'elec', rootCategoryName: '전자·전기' }),
    item({ name: '콩', sharePct: 1.2, rootCategoryId: 'agri', rootCategoryName: '농산물' }),
    item({ name: '캐나다', grain: 'PARTNER', sharePct: 17.3 }),
  ]

  it('막대는 등록분을 100%로 늘이지 않는다 — 진짜 비중 그대로', () => {
    const result = buildComposition(usExports, 2065)
    expect(result.relative).toBe(false)
    expect(result.coverage).toBeCloseTo(29.5, 5)
    // 옛 막대는 이 값을 44%로 그렸다 (12.9 / 29.5)
    expect(result.slices[0].name).toBe('에너지·광물')
    expect(result.slices[0].pct).toBeCloseTo(12.9, 5)
  })

  it('큰 몫이 먼저 — 범례와 막대의 순서가 같다', () => {
    const result = buildComposition(usExports, 2065)
    expect(result.slices.map((slice) => slice.name)).toEqual([
      '에너지·광물',
      '운송장비',
      '화학·의약',
      '전자·전기',
      '농산물',
    ])
  })

  // 대영제국 1913 — 넷은 비중이 있고 '해운'은 없다
  it('일부만 비중을 알면 아는 값 그대로 그리고, 모르는 행 수를 따로 센다', () => {
    const result = buildComposition(
      [
        item({ name: '면직물', grain: 'PARTNER_COMMODITY', sharePct: 24, rootCategoryId: 'textile' }),
        item({ name: '석탄', sharePct: 10, rootCategoryId: 'energy' }),
        item({ name: '강철', sharePct: 7, rootCategoryId: 'metal' }),
        item({ name: '공작기계', sharePct: 6, rootCategoryId: 'machine' }),
        item({ name: '해운' }),
      ],
      null,
    )
    expect(result.relative).toBe(false)
    expect(result.coverage).toBe(47)
    expect(result.unknownCount).toBe(1)
    expect(result.slices.reduce((sum, slice) => sum + slice.pct, 0)).toBe(47)
  })

  it('비중을 아는 행이 하나도 없을 때만 등록분끼리의 비율로 되돌린다', () => {
    const result = buildComposition(
      [
        item({ name: '쌀', value: 40, rootCategoryId: 'agri' }),
        item({ name: '가죽', value: 10, rootCategoryId: 'leather' }),
      ],
      null, // 총액을 몰라 금액을 비중으로 못 바꾼다
    )
    expect(result.relative).toBe(true)
    expect(result.coverage).toBeNull()
    expect(result.unknownCount).toBe(2)
    expect(result.slices).toHaveLength(0)
  })

  it('합이 100을 넘는 어긋난 자료는 전체 대비로 말하지 않는다', () => {
    const result = buildComposition(
      [
        item({ name: 'A', sharePct: 70, rootCategoryId: 'a' }),
        item({ name: 'B', sharePct: 60, rootCategoryId: 'b' }),
      ],
      null,
    )
    expect(result.relative).toBe(true)
    expect(result.coverage).toBeNull()
    expect(result.slices[0].pct).toBeCloseTo((70 / 130) * 100, 5)
  })

  it('자료가 없으면 조각도 없다', () => {
    expect(buildComposition([], null)).toEqual({
      slices: [],
      coverage: null,
      unknownCount: 0,
      relative: true,
    })
  })
})
