/**
 * 현재 필터/검색 결과를 JSON · Markdown 파일로 내보내기.
 *
 * - source: 노드 순회 결과(이벤트 또는 null의 배열). null은 스킵.
 * - 빈 결과거나 SSR 환경이면 무시.
 */
import type { HistoricalEvent } from '../../create/events.types'

export function exportEvents(
  source: Array<HistoricalEvent | null>,
  format: 'json' | 'markdown',
) {
  if (typeof document === 'undefined') return
  const events = source.filter((e): e is HistoricalEvent => !!e)
  if (events.length === 0) return

  let content: string
  let mime: string
  let ext: string
  if (format === 'json') {
    content = JSON.stringify(events, null, 2)
    mime = 'application/json;charset=utf-8'
    ext = 'json'
  } else {
    const lines: string[] = ['# 사건 목록', '']
    for (const e of events) {
      const period = [e.startDate, e.endDate].filter(Boolean).join(' ~ ')
      lines.push(`## ${e.title}`)
      if (period) lines.push(`*${period}*`)
      if (e.category) lines.push(`_분류: ${e.category}_`)
      lines.push('')
    }
    content = lines.join('\n')
    mime = 'text/markdown;charset=utf-8'
    ext = 'md'
  }
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `events-${new Date().toISOString().slice(0, 10)}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
