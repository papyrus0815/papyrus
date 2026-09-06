/**
 * 눈금이 딱 떨어지면서 **막대에 바짝 붙는** 축 최대치.
 *
 * 10의 거듭제곱으로만 올림하면 데이터가 축을 못 채운다 — 인구 피라미드의 2,383만이
 * 3,000만이 되어 좌우로 죽은 폭이 26%씩 남았던 게 그 경우다. 눈금을 5칸으로 나눠
 * 떨어지는 폭(1·2·2.5·5 × 10ⁿ)을 **먼저** 고르면 2,383만 → 2,500만이라 낭비가 5%로 준다.
 *
 * 교역 규모 막대와 인구 피라미드가 같이 쓴다 — 둘 다 "숫자 그대로의 축"이 필요하다.
 */
export function niceAxis(max: number): { max: number; step: number } {
  if (max <= 0) return { max: 1, step: 1 }
  const rough = max / 5
  const base = Math.pow(10, Math.floor(Math.log10(rough)))
  const mantissa = [1, 2, 2.5, 5, 10].find(
    (candidate) => rough <= candidate * base + 1e-9,
  ) as number
  const step = mantissa * base
  return { max: Math.ceil(max / step - 1e-9) * step, step }
}

/** 0 · step · 2step … max — 축 아래 적을 눈금 값 */
export function axisTicks(axis: { max: number; step: number }): number[] {
  const ticks: number[] = []
  for (let value = 0; value <= axis.max + 1e-9; value += axis.step) {
    ticks.push(Math.round(value * 1e6) / 1e6)
  }
  return ticks
}
