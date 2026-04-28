/**
 * Pivot 공통 유틸 — 5개 피벗(time/country/category/person/quality)에 흩어져있던
 * startYear·그룹핑·정렬 로직을 한 곳으로 모은다.
 *
 * 모든 함수는 순수: useMemo 안에서 안전하게 호출 가능.
 */
import type { HistoricalEvent } from '@/entities/event/model'

/** 사건의 시작 연도. 비정상 날짜는 null. */
export const startYearOf = (evt: HistoricalEvent): number | null => {
  if (!evt.startDate) return null
  const date = new Date(evt.startDate)
  return Number.isNaN(date.getTime()) ? null : date.getFullYear()
}

/** items를 keyFn으로 그룹핑. 중복 key는 같은 배열에 push. */
export function groupBy<T, K>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }
  return map
}

/** 사건 배열을 시간순(오름차순)으로 정렬한 새 배열을 반환. */
export const sortByStartYearAsc = (
  events: readonly HistoricalEvent[],
): HistoricalEvent[] =>
  [...events].sort(
    (first, second) => (startYearOf(first) ?? 0) - (startYearOf(second) ?? 0),
  )

/** events.length 내림차순 정렬용 비교자 — 카드/그룹 정렬에 사용. */
export const byEventCountDesc = <T extends { events: { length: number } }>(
  first: T,
  second: T,
): number => second.events.length - first.events.length
