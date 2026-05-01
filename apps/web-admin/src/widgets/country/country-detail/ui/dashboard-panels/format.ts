/**
 * 국가 상세 대시보드 공용 포매터.
 */

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function parsePopulation(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === '') return null
  const n =
    typeof value === 'string'
      ? Number(String(value).replace(/,/g, ''))
      : Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function formatPopulation(
  value: string | number | null | undefined,
): string {
  const n = parsePopulation(value)
  return n == null ? '—' : Math.floor(n).toLocaleString('ko-KR')
}

export function formatAreaValue(
  value: number | string | null | undefined,
): string {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('ko-KR')
}

export function formatStartDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}.${m}.${day}`
}

export function formatTenure(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
  if (days < 30) return `재임 ${days}일째`
  if (days < 365) return `재임 ${Math.floor(days / 30)}개월째`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return months > 0
    ? `재임 ${years}년 ${months}개월째`
    : `재임 ${years}년째`
}

export function formatDDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const today = startOfDay(new Date()).getTime()
  const target = startOfDay(d).getTime()
  const days = Math.round((target - today) / 86400000)
  if (days === 0) return 'D-DAY'
  return `D-${days}`
}

export function formatDaysAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const today = startOfDay(new Date()).getTime()
  const target = startOfDay(d).getTime()
  const days = Math.round((today - target) / 86400000)
  if (days === 0) return '오늘'
  if (days < 30) return `${days}일 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}

/** 정당 분포용 별도 팔레트 — 카테고리(brand) 색과 의도적으로 다른 톤 */
const PARTY_PALETTE = [
  '#1d4ed8',
  '#dc2626',
  '#15803d',
  '#a16207',
  '#7e22ce',
] as const

export function defaultPartyColor(i: number): string {
  return PARTY_PALETTE[i % PARTY_PALETTE.length] as string
}

export function getPersonInitial(name: string | null | undefined): string {
  if (!name) return '·'
  const trimmed = String(name).trim()
  if (!trimmed) return '·'
  // 한글이면 첫 글자, 영문이면 대문자.
  return trimmed[0]?.toUpperCase() ?? '·'
}
