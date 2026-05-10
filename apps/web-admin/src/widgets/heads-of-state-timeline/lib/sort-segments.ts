import type { PinnedSegment } from '../model/types'

/**
 * 한 행 내 segment를 시간순으로 정렬해 사이드바 chip·타임라인 라벨 일관성을 맞춘다.
 * - 역사 국가는 lifespanStartYear 기준
 * - 현대 국가(lifespan 없음)는 항상 마지막에 둠 — "조선 → 대한제국 → 대한민국" 흐름과 동일
 * - 둘 다 미상이면 추가순 유지
 */
export function sortSegmentsChronologically<T extends PinnedSegment>(
  segments: T[],
): T[] {
  return [...segments].sort((a, b) => {
    const ay = a.lifespanStartYear
    const by = b.lifespanStartYear
    if (ay == null && by == null) return 0
    if (ay == null) return 1
    if (by == null) return -1
    return ay - by
  })
}
