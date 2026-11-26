/**
 * 빠른 수치 입력 파서 — 한 칸 문자열에서 단일 값 · 범위('3~4') · 하한('1,000+') · 근사('약 50', '50여')를 해석한다.
 *
 * 예:
 *  - '3~4' / '3 - 4' / '18,000~20,000' → { value: null, low: '3', high: '4', approx: true, atLeast: false }
 *  - '약 50' / '50여' / '50여 명'       → { value: '50', low: null, high: null, approx: true, atLeast: false }
 *  - '1,000+' / '1,000명 이상'          → { value: null, low: '1000', high: null, approx: false, atLeast: true }
 *  - '6' / '637,000'                    → { value: '637000', low: null, high: null, approx: defaultApprox, atLeast: false }
 */

export interface ParsedQuickObservation {
  value: string | null
  low: string | null
  high: string | null
  approx: boolean
  atLeast: boolean
}

const TRAILING_UNIT_RE = /\s*(?:명|척|대|문|발|기|회|곳|석|채|동|km²|㎢|%|pt)\s*$/i
const NUMBER_TOKEN_RE = /^-?\d{1,24}(?:\.\d{1,6})?$/

function normalizeNumericToken(token: string): string | null {
  const cleaned = token.replace(/[,\s]/g, '').replace(TRAILING_UNIT_RE, '')
  if (!cleaned || !NUMBER_TOKEN_RE.test(cleaned)) return null
  return cleaned
}

export function parseQuickObservationInput(
  raw: string,
  defaultApprox = false,
): { ok: true; data: ParsedQuickObservation } | { ok: false; error: string } {
  let text = raw.trim()
  if (!text) {
    return { ok: false, error: '수치를 입력해 주세요' }
  }

  let approx = defaultApprox
  let atLeast = false

  if (/^(?:약|추산|추정|대략)\s*/.test(text)) {
    approx = true
    text = text.replace(/^(?:약|추산|추정|대략)\s*/, '').trim()
  }

  if (/\s*이상$/.test(text) || /\+$/.test(text)) {
    atLeast = true
    text = text.replace(/(?:\s*이상|\+)$/, '').trim()
  }

  text = text.replace(TRAILING_UNIT_RE, '').trim()

  if (/여$/.test(text)) {
    approx = true
    text = text.replace(/여$/, '').trim()
  }

  // 범위: '3~4', '3 ~ 4', '18,000-20,000', '18,000–20,000' (앞 숫자가 음수가 아닌 일반 범위 구분자)
  const rangeMatch = text.match(/^(-?\d[\d,\s.]*)\s*(?:~|–|—|-)\s*(\d[\d,\s.]*)$/)
  if (rangeMatch) {
    if (atLeast) {
      return { ok: false, error: '범위(하한~상한)와 ‘이상’은 함께 쓸 수 없습니다' }
    }
    const low = normalizeNumericToken(rangeMatch[1])
    const high = normalizeNumericToken(rangeMatch[2])
    if (!low || !high) {
      return { ok: false, error: '범위는 숫자로 입력해 주세요 (예: 3~4, 18,000~20,000)' }
    }
    if (Number(low) > Number(high)) {
      return { ok: false, error: '범위의 하한이 상한보다 클 수 없습니다' }
    }
    return {
      ok: true,
      data: {
        value: null,
        low,
        high,
        approx,
        atLeast: false,
      },
    }
  }

  const single = normalizeNumericToken(text)
  if (!single) {
    return { ok: false, error: '숫자 또는 범위(예: 50, 3~4, 1,000+)로 입력해 주세요' }
  }

  if (atLeast) {
    return {
      ok: true,
      data: {
        value: null,
        low: single,
        high: null,
        approx,
        atLeast: true,
      },
    }
  }

  return {
    ok: true,
    data: {
      value: single,
      low: null,
      high: null,
      approx,
      atLeast: false,
    },
  }
}
