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
 * 상대 시간 포맷 (몇 분 전, 몇 시간 전, n일 전, n주 전, n개월 전, n년 전)
 *
 * 예전엔 7일이 넘으면 무엇이든 '1주일 전'으로 잘랐다. 실제 기록은 몇 주~몇 달 전에
 * 들어온 것이 대부분이라 최근 활동 피드 열 줄이 전부 '1주일 전'이 됐고, 그게 사실도
 * 아니었다(21일 전 → '1주일 전'). 상한을 없애고 단위를 올린다.
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (!Number.isFinite(diffMs)) return ''
    // 미래 시각(시계 오차·잘못된 데이터)은 '방금 전'으로 수렴시킨다
    if (diffMs < 0) return '방금 전'
    const diffMins = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMs / 3_600_000)
    const diffDays = Math.floor(diffMs / 86_400_000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
    return `${Math.floor(diffDays / 365)}년 전`
  } catch {
    return ''
  }
}
