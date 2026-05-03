/**
 * ISO 코드별 인물 이름 표기 순서 추론.
 *
 * - 동양식(성→이름) 사용 국가: 한·중·일·베트남·대만·홍콩·마카오·몽골 등
 *   (HK/MO/VN은 영문 표기도 흔함 — 사용자가 자동 추론값을 덮어쓸 수 있도록 UI에서 명시)
 * - 그 외는 서양식(이름→성)
 */
const ASIAN_NAME_ORDER_ISO_CODES = new Set<string>([
  'KR',
  'KP',
  'JP',
  'CN',
  'TW',
  'HK',
  'MO',
  'VN',
  'MN',
])

export type NameDisplayOrder = 'korean' | 'western'

/** ISO 코드(대문자 가정)로 기본 표기 순서 추론. 빈 코드면 undefined */
export function inferNameOrderFromIso(
  isoCode: string | null | undefined,
): NameDisplayOrder | undefined {
  const code = (isoCode ?? '').trim().toUpperCase()
  if (!code) return undefined
  return ASIAN_NAME_ORDER_ISO_CODES.has(code) ? 'korean' : 'western'
}

/**
 * ISO 3166-1 alpha-2 코드 → 국기 이모지 (regional indicator unicode 변환).
 * - 'KR' → '🇰🇷'
 * - 잘못된 입력(2자 미만, 알파벳 외)은 빈 문자열
 * - 3자 코드(alpha-3)는 미지원 — 빈 문자열
 */
export function isoCodeToFlagEmoji(
  isoCode: string | null | undefined,
): string {
  const code = (isoCode ?? '').trim().toUpperCase()
  if (code.length !== 2) return ''
  if (!/^[A-Z]{2}$/.test(code)) return ''
  // Regional Indicator Symbol Letter A = U+1F1E6
  const REGIONAL_INDICATOR_A = 0x1f1e6
  const A = 'A'.charCodeAt(0)
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (code.charCodeAt(0) - A),
    REGIONAL_INDICATOR_A + (code.charCodeAt(1) - A),
  )
}
