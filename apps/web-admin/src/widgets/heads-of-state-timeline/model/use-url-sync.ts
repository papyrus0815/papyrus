import { useEffect } from 'react'

import type { PinnedRow, YearRange } from './types'
import { rowsToPinsParam } from './use-heads-of-state-timeline-state'

/**
 * 페이지 상태(range·pins·year)를 URL search params에 동기화한다.
 * `replaceState`만 사용해 history 스택을 더럽히지 않고, 사용자가 주소창을 복사하면 그 시점의 비교를 그대로 공유 가능.
 *
 * 진입 시 URL 파라미터는 timeline-state-hook이 이미 한 번 읽어 초기 상태로 반영했으므로,
 * 이 훅은 그저 "변경 시 URL을 따라가게" 만드는 단방향 sink.
 */
export function useTimelineUrlSync(opts: {
  range: YearRange
  rows: PinnedRow[]
  highlightYear: number | null
}) {
  const { range, rows, highlightYear } = opts

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const next = url.searchParams

    if (rows.length > 0) {
      next.set('pins', rowsToPinsParam(rows))
    } else {
      next.delete('pins')
    }
    next.set('range', `${range.startYear}-${range.endYear}`)
    if (highlightYear != null) {
      next.set('year', String(highlightYear))
    } else {
      next.delete('year')
    }

    const newSearch = next.toString()
    if (url.search.replace(/^\?/, '') === newSearch) return
    const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ''}${url.hash}`
    window.history.replaceState(window.history.state, '', newUrl)
  }, [range.startYear, range.endYear, rows, highlightYear])
}

/** URL을 클립보드로 복사. 실패 시 `prompt`로 fallback. 결과 메시지 반환 */
export async function copyShareUrl(): Promise<{ ok: boolean; message: string }> {
  if (typeof window === 'undefined') return { ok: false, message: '브라우저에서만 가능' }
  const url = window.location.href
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return { ok: true, message: '링크가 복사되었습니다' }
    }
  } catch {
    // fallthrough
  }
  try {
    window.prompt('복사하세요', url)
    return { ok: true, message: '링크 표시됨 — 직접 복사하세요' }
  } catch {
    return { ok: false, message: '복사 실패' }
  }
}
