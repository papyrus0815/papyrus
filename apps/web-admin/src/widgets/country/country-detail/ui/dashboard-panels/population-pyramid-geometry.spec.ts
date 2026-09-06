import {
  barGeometry,
  barPath,
  markPath,
  niceAxis,
  symmetricTicks,
} from './population-pyramid-geometry'

describe('barGeometry', () => {
  // 리차트는 여성(양수) 막대를 x=축, width=+길이로 준다.
  it('여성 막대는 축이 왼쪽, 값 끝이 오른쪽', () => {
    expect(barGeometry(500, 120, 'female')).toEqual({
      zero: 500,
      valueEnd: 620,
      direction: 1,
      span: 120,
    })
  })

  // ⚠️ 회귀 방지: 음수 막대의 width를 음수로 받아도 축/값이 뒤집히면 안 된다.
  // (뒤집히면 축척이 음수가 되어 기준 연도 눈금이 통째로 사라졌었다)
  it('남성 막대는 width 부호와 무관하게 축이 오른쪽, 값 끝이 왼쪽', () => {
    const fromNegativeWidth = barGeometry(500, -120, 'male')
    const fromPositiveWidth = barGeometry(380, 120, 'male')
    expect(fromNegativeWidth).toEqual({
      zero: 500,
      valueEnd: 380,
      direction: -1,
      span: 120,
    })
    expect(fromPositiveWidth).toEqual(fromNegativeWidth)
  })
})

describe('barPath', () => {
  it('둥근 모서리는 값 끝에만 (축 쪽 두 점은 각지게 시작·종료)', () => {
    const path = barPath(100, 200, 10, 20, 4)
    expect(path.startsWith('M 100 10')).toBe(true)
    expect(path).toContain('L 100 30') // 축 쪽으로 되돌아오는 직선
    expect(path).toContain('A 4 4') // 값 끝의 라운드
    expect(path.endsWith('Z')).toBe(true)
  })

  it('막대가 모서리 반지름보다 짧으면 반지름을 줄여 뭉개지 않는다', () => {
    expect(barPath(100, 102, 0, 20, 4)).toContain('A 2 2')
  })
})

describe('markPath', () => {
  it('세로선 + 축 쪽으로 접힌 갈고리 (닫히지 않는다)', () => {
    expect(markPath(300, -1, 10, 24)).toBe('M 295 10 L 300 10 L 300 34 L 295 34')
    expect(markPath(300, 1, 10, 24)).toBe('M 305 10 L 300 10 L 300 34 L 305 34')
  })
})

describe('niceAxis', () => {
  it('최대 막대에 바짝 붙는 눈금을 고른다 (10의 거듭제곱 올림 금지)', () => {
    // 실데이터(미국 2024 30–39세 남성 2,383만) — 예전 규칙은 3,000만까지 벌렸다
    expect(niceAxis(23_829_928)).toEqual({ max: 25_000_000, step: 5_000_000 })
  })

  it('축 최대치는 항상 눈금 폭의 배수이고 데이터를 덮는다', () => {
    for (const max of [3, 97, 1_234, 45_000, 8_900_000, 123_456_789]) {
      const axis = niceAxis(max)
      expect(axis.max).toBeGreaterThanOrEqual(max)
      expect(Math.round(axis.max / axis.step)).toBeCloseTo(axis.max / axis.step)
      expect(axis.max / axis.step).toBeLessThanOrEqual(5)
    }
  })

  it('값이 없으면 무너지지 않는다', () => {
    expect(niceAxis(0)).toEqual({ max: 1, step: 1 })
  })
})

describe('symmetricTicks', () => {
  it('0을 반드시 지나고 좌우 대칭', () => {
    const ticks = symmetricTicks({ max: 25_000_000, step: 5_000_000 })
    expect(ticks).toContain(0)
    expect(ticks[0]).toBe(-25_000_000)
    expect(ticks[ticks.length - 1]).toBe(25_000_000)
    expect(ticks).toHaveLength(11)
  })
})
