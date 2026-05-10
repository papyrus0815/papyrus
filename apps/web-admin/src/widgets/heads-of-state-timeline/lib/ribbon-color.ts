/**
 * 같은 국가는 어떤 행에 들어가도 같은 ribbon 색을 갖도록 countryId 해시 → 팔레트 인덱스로 매핑.
 */

const RIBBON_COLORS = [
  '#94a3b8',
  '#a78bfa',
  '#f97316',
  '#10b981',
  '#0ea5e9',
  '#ec4899',
  '#fbbf24',
  '#22d3ee',
]

function hash(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

export function ribbonColorFor(kind: 'COUNTRY' | 'HISTORICAL', countryId: string): string {
  const idx = hash(`${kind}:${countryId}`) % RIBBON_COLORS.length
  return RIBBON_COLORS[idx]!
}
