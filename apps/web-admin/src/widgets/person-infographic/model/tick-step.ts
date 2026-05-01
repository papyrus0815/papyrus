/**
 * 차트 축 눈금 간격 선택 (1, 2, 5, 10, 20, 50, 100 …).
 * 대략 N개 눈금이 나오도록 target = range / N 을 받음.
 */
export function pickTickStep(target: number): number {
  const exp = Math.floor(Math.log10(Math.max(1, target)))
  const base = Math.pow(10, exp)
  const norm = target / base
  let mult = 1
  if (norm > 5) mult = 10
  else if (norm > 2) mult = 5
  else if (norm > 1) mult = 2
  return mult * base
}
