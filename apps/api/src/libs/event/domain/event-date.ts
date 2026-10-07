/**
 * 응답용 날짜 문자열 재구성. 저장 DateTime이 있으면 기존 동작 보존(toISOString),
 * 없으면 구조화 필드로 ISO(음수=BC) 재구성. 둘 다 없으면 null.
 */
export function formatEventDate(
  date: Date | string | null | undefined,
  era: 'BC' | 'AD' | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
): string | null {
  if (date) {
    if (typeof (date as Date).toISOString === 'function') return (date as Date).toISOString()
    return date as string // 이미 문자열로 들어온 경우
  }
  if (year == null) return null
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month ?? 1).padStart(2, '0')
  const dd = String(day ?? 1).padStart(2, '0')
  return `${era === 'BC' ? '-' : ''}${yyyy}-${mm}-${dd}`
}
