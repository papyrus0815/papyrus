/**
 * 입력 편의용 숫자↔문자열 변환 — 인라인 편집 행(주가·시가총액 등)에서 number 필드를
 * 문자열 state로 다루다가 커밋 시 number로 되돌린다.
 *
 * (기업 연혁·주가 모듈이 byte-identical 헬퍼를 각자 정의하던 것을 단일 출처로 통합.)
 */

/** number|null → 표시/입력용 문자열. null/undefined는 빈 문자열. */
export const numToStr = (value: number | null): string =>
  value != null ? String(value) : ''

/** 입력 문자열 → number|null. 공백·비수치는 null, 천단위 콤마는 허용. */
export const strToNum = (text: string): number | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

/** 표시용 천단위 콤마. 정수는 콤마만, 소수는 최대 4자리. */
export const formatGrouped = (value: number): string =>
  value.toLocaleString('ko-KR', { maximumFractionDigits: 4 })

/**
 * 한국식 단위 압축(조·억·만) — 큰 금액(시가총액 등)을 한눈에. 예 2300000000000 → '2.3조'.
 * 1만 미만은 그대로 콤마 표기. 음수도 부호 보존.
 */
export const formatCompactKo = (value: number): string => {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const units: [number, string][] = [
    [1e12, '조'],
    [1e8, '억'],
    [1e4, '만'],
  ]
  for (const [base, label] of units) {
    if (abs >= base) {
      const scaled = abs / base
      // 1000 이상이면 정수, 아니면 소수 1~2자리(불필요한 .0 제거).
      const text =
        scaled >= 100
          ? Math.round(scaled).toLocaleString('ko-KR')
          : scaled
              .toFixed(scaled >= 10 ? 1 : 2)
              .replace(/\.?0+$/, '')
      return `${sign}${text}${label}`
    }
  }
  return formatGrouped(value)
}

/**
 * 읽기 표시용 포맷터 — InlineText `formatRead` prop에 그대로 넘긴다(raw 문자열을 받아
 * 표시 문자열 반환, 편집 진입 시엔 호출 측이 raw를 유지). 수치가 아니면 원문 그대로.
 */
export const readGrouped = (raw: string): string => {
  const num = strToNum(raw)
  return num != null ? formatGrouped(num) : raw
}
export const readCompactKo = (raw: string): string => {
  const num = strToNum(raw)
  return num != null ? formatCompactKo(num) : raw
}
