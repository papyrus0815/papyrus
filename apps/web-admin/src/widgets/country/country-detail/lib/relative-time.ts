/**
 * 사건 기간 포맷 (startDate ~ endDate)
 * 예: "1950.6.25", "1950.6.25 ~ 1953.7.27"
 */
export function formatEventPeriod(
  startDate?: string | null,
  endDate?: string | null,
): string {
  const fmt = (s: string) => {
    try {
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return s
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const day = d.getDate()
      return `${y}.${m}.${day}`
    } catch {
      return s
    }
  }
  const start = startDate?.trim()
  const end = endDate?.trim()
  if (start && end && start !== end) return `${fmt(start)} ~ ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return ''
}

/**
 * 상대 시간 포맷 (몇 분 전, 몇 시간 전, n일 전, 1주일 전)
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMs / 3_600_000)
    const diffDays = Math.floor(diffMs / 86_400_000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return '1주일 전'
  } catch {
    return ''
  }
}
