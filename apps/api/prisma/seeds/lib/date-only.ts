/**
 * 날짜만 뜻하는 Date를 '가장 가까운 UTC 자정'으로 — 재임 기간 칸과 같은 규칙(DB 트리거 trg_tenure_period_derive_*).
 *
 * 시드는 `new Date(Date.UTC(y, m - 1, d))`(로컬 자정)로 날짜를 만든다. 로스앤젤레스면 08:00Z, 서울이면 전날 15:00Z가 된다.
 * DB는 이제 UTC 자정만 담으므로, where의 날짜 조건을 그대로 넘기면 '이미 있음'을 못 찾아 재실행마다 중복 행이 생긴다.
 */
export function nearestUtcMidnight(date: Date): Date {
  const shifted = new Date(date.getTime() + 12 * 60 * 60 * 1000)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
}

const DATE_KEYS = new Set(['startDate', 'endDate'])
const OPERATORS = new Set(['equals', 'gt', 'gte', 'lt', 'lte', 'not'])

function normalizeCondition(value: any): any {
  if (value instanceof Date) return nearestUtcMidnight(value)
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return value
  const out: Record<string, any> = {}
  for (const [key, inner] of Object.entries(value)) {
    out[key] = OPERATORS.has(key) ? normalizeCondition(inner) : inner
  }
  return out
}

/** where 안의 startDate·endDate 조건(AND/OR/NOT 안쪽까지)을 가장 가까운 UTC 자정으로 */
export function normalizeDateWhere(where: any): any {
  if (Array.isArray(where)) return where.map(normalizeDateWhere)
  if (where == null || typeof where !== 'object' || where instanceof Date) return where
  const out: Record<string, any> = {}
  for (const [key, inner] of Object.entries(where)) {
    if (DATE_KEYS.has(key)) out[key] = normalizeCondition(inner)
    else if (key === 'AND' || key === 'OR' || key === 'NOT') out[key] = normalizeDateWhere(inner)
    else out[key] = inner
  }
  return out
}
