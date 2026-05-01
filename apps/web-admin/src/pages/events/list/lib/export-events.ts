/**
 * 현재 필터/검색 결과를 JSON 파일로 내보내기.
 *
 * - source: 노드 순회 결과(이벤트 또는 null의 배열). null은 스킵.
 * - 빈 결과거나 SSR 환경이면 무시.
 */
import type { HistoricalEvent } from '../../create/events.types'

export function exportEventsAsJson(source: Array<HistoricalEvent | null>) {
  if (typeof document === 'undefined') return
  const events = source.filter((e): e is HistoricalEvent => !!e)
  if (events.length === 0) return

  const content = JSON.stringify(events, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `events-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
