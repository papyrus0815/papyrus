/** 정체(PoliticalSystem) 글자 칸의 원 이름을 원 카탈로그로 옮길 때 쓰는 해석 — B7 이관(prisma/seeds/chamber.backfill). */

/**
 * '서민원(House of Commons)' → 이름 '서민원' · 원어 'House of Commons'.
 * 괄호 안의 한국어 풀이는 버리고('서민원(하원)', '제2원(하원, Tweede Kamer)' → 원어 'Tweede Kamer'),
 * 연도 범위는 존속으로 돌려준다('자정원(1910~1912)').
 */
export function splitChamberLabel(raw: string): {
  name: string
  localName: string | null
  startYear: number | null
  endYear: number | null
} {
  const text = raw.trim()
  const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(text)
  if (!match || !match[1].trim()) return { name: text, localName: null, startYear: null, endYear: null }
  const inner = match[2].trim()
  const years = /^(\d{3,4})\s*[~–-]\s*(\d{3,4})$/.exec(inner)
  if (years) return { name: match[1].trim(), localName: null, startYear: Number(years[1]), endYear: Number(years[2]) }
  const latinParts = inner
    .split(/\s*,\s*/)
    .filter((part) => /[A-Za-zÀ-ÿĀ-žА-я]/.test(part))
  return { name: match[1].trim(), localName: latinParts.join(', ') || null, startYear: null, endYear: null }
}
