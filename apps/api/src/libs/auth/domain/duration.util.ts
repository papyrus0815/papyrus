const UNIT_MS: Record<string, number> = {
  'ms': 1,
  's': 1000,
  'm': 60 * 1000,
  'h': 60 * 60 * 1000,
  'd': 24 * 60 * 60 * 1000,
  'w': 7 * 24 * 60 * 60 * 1000,
  'y': 365.25 * 24 * 60 * 60 * 1000,
}

/**
 * JWT `expiresIn` 표기('15m', '7d', '3600')를 밀리초로 바꾼다 — 쿠키 maxAge와 DB 만료시각이
 * 토큰 자체의 만료와 같은 값을 쓰게 하려는 것. 숫자(또는 단위 없는 숫자 문자열)는
 * jsonwebtoken과 같이 초로 읽는다. 해석할 수 없으면 null.
 */
export function parseDurationMs(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value * 1000 : null
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = (match[2] ?? 's').toLowerCase()
  const ms = amount * UNIT_MS[unit]
  return ms > 0 ? Math.round(ms) : null
}
