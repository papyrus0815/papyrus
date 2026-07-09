import { useEffect } from 'react'

import type { PositionTypeCategory } from '../lib/normalize-tenures'
import type { PinnedRow, YearRange } from './types'
import { rowsToPinsParam } from './use-heads-of-state-timeline-state'

/**
 * 페이지 상태(range·pins·year)를 URL search params에 동기화한다.
 * `replaceState`만 사용해 history 스택을 더럽히지 않고, 사용자가 주소창을 복사하면 그 시점의 비교를 그대로 공유 가능.
 *
 * 진입 시 URL 파라미터는 timeline-state-hook이 이미 한 번 읽어 초기 상태로 반영했으므로,
 * 이 훅은 그저 "변경 시 URL을 따라가게" 만드는 단방향 sink.
 */
const ALL_CATEGORIES: PositionTypeCategory[] = [
  'MONARCH',
  'PRESIDENT',
  'PM',
  'POPE',
  'OTHER',
]

export function useTimelineUrlSync(opts: {
  range: YearRange
  rows: PinnedRow[]
  highlightYear: number | null
  categoryFilter: PositionTypeCategory[]
  isAllCategoriesEnabled: boolean
  /**
   * URL `?pins=` 적용이 끝나기 전(true) 동안 sink를 보류 — 이 훅이 병합 전
   * 보드 상태로 URL을 덮어써 딥링크의 pins가 리로드·복사에서 소실되는 것 방지.
   */
  suspend?: boolean
}) {
  const { range, rows, highlightYear, categoryFilter, isAllCategoriesEnabled, suspend } = opts

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (suspend) return
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
    // 전체 활성이면 URL 생략 — 기본값과 동일
    if (isAllCategoriesEnabled) {
      next.delete('cat')
    } else {
      // 짧게: 활성된 것만 카테고리 첫 글자로 (M=MONARCH, P=PRESIDENT, R=PM, O=POPE, X=OTHER)
      const codes = categoryFilter.map((c) => CAT_CODE[c]).join('')
      next.set('cat', codes || '_')
    }

    const newSearch = next.toString()
    if (url.search.replace(/^\?/, '') === newSearch) return
    const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ''}${url.hash}`
    window.history.replaceState(window.history.state, '', newUrl)
  }, [
    range.startYear,
    range.endYear,
    rows,
    highlightYear,
    categoryFilter,
    isAllCategoriesEnabled,
    suspend,
  ])
}

const CAT_CODE: Record<PositionTypeCategory, string> = {
  MONARCH: 'M',
  PRESIDENT: 'P',
  PM: 'R',
  POPE: 'O',
  OTHER: 'X',
}

/** URL `?cat=MPR` 같은 코드를 카테고리 배열로 — 전체면 ALL_CATEGORIES, 빈 슬래시 `_`이면 빈 배열 */
export function readCategoriesFromUrl(): PositionTypeCategory[] | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('cat')
    if (raw == null) return null
    if (raw === '_') return []
    const reverse: Record<string, PositionTypeCategory> = {
      M: 'MONARCH',
      P: 'PRESIDENT',
      R: 'PM',
      O: 'POPE',
      X: 'OTHER',
    }
    const out: PositionTypeCategory[] = []
    for (const ch of raw) {
      const c = reverse[ch.toUpperCase()]
      if (c && !out.includes(c)) out.push(c)
    }
    return out.length > 0 ? out : ALL_CATEGORIES
  } catch {
    return null
  }
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
