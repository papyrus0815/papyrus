/**
 * 목록(LIST) 뷰의 세기›연도 그룹핑 — **목록 위젯과 페이지가 공유하는 단일 출처**.
 *
 * 예전엔 이 계산이 EventCompactList 안에만 있었고 세기·연도 접힘도 위젯 로컬 state였다.
 * 그래서 페이지는 "지금 화면에 어떤 행이 보이는지"를 알 수 없었고, 드로어의 이전/다음이
 * 접힌 밴드 안의 행까지 순회해 ↑↓ 키(렌더된 행에서만 이동)와 결과가 갈렸다(검토 INT-4).
 * 그룹핑을 순수 함수로 빼서 페이지가 같은 기준으로 '보이는 행'을 계산할 수 있게 한다.
 */
import { getCentury, parseIsoDateParts } from '@/shared/lib/iso-date'

import type { FlattenedHierarchyItem } from './useEventHierarchy'

export interface YearBuckets {
  /** 정렬 방향이 적용된 연도 순서 */
  allYears: number[]
  /** 연도 → 그 버킷에 귀속된 행들(원래 순서 유지) */
  eventsByYear: Map<number, FlattenedHierarchyItem[]>
  /** 세기 → 그 세기의 depth 0 사건 수 */
  centuryCount: Map<number, number>
  /** 연도를 전혀 확정할 수 없는 행 — '연도 미상' 섹션 */
  unknownItems: FlattenedHierarchyItem[]
  /** 행 id → 귀속 연도. 미상은 null. 페이지가 밴드 접힘 판정에 쓴다. */
  bucketYearById: Map<string, number | null>
}

/**
 * 평탄화된 행들을 연도 버킷에 담는다.
 *
 * 귀속 규칙: 최상위는 자기 연도 우선, 자식은 직전 최상위(부모) 연도 우선.
 * 어느 쪽도 없으면 자기 연도로 폴백하고, 그래도 없으면 '연도 미상'.
 * ⚠️ 절대 드롭하지 않는다 — 예전엔 year가 null이면 조용히 사라져
 * 날짜 완전 미상 사건과 부모 없이 남은 자식이 화면에서 통째로 없어졌다.
 */
export function buildYearBuckets(
  items: FlattenedHierarchyItem[],
  sortDirection: 'asc' | 'desc',
): YearBuckets {
  const eventYears = new Set<number>()
  const eventsByYear = new Map<number, FlattenedHierarchyItem[]>()
  const unknownItems: FlattenedHierarchyItem[] = []
  const centuryCount = new Map<number, number>()
  const bucketYearById = new Map<string, number | null>()
  let lastTopLevelYear: number | null = null

  items.forEach((item) => {
    // BC·고대 날짜 안전 파싱(네이티브 Date 금지).
    const parsedYear = parseIsoDateParts(item.node.period.start)?.year ?? null
    if (item.depth === 0 && parsedYear !== null) {
      lastTopLevelYear = parsedYear
    }
    const bucketYear =
      item.depth === 0
        ? (parsedYear ?? lastTopLevelYear)
        : (lastTopLevelYear ?? parsedYear)

    if (bucketYear === null) {
      bucketYearById.set(item.node.id, null)
      unknownItems.push(item)
      return
    }
    bucketYearById.set(item.node.id, bucketYear)
    // depth 무관하게 add — 부모 없이 자식 연도로 버킷팅한 경우에도 버킷이 존재해야
    // 렌더 루프가 그 연도를 순회한다.
    eventYears.add(bucketYear)
    if (!eventsByYear.has(bucketYear)) eventsByYear.set(bucketYear, [])
    eventsByYear.get(bucketYear)!.push(item)
    // getCentury(year)로 BC 음수 세기까지 정합(1950 → 20세기).
    if (item.depth === 0) {
      const centuryOfBucket = getCentury(bucketYear)
      centuryCount.set(
        centuryOfBucket,
        (centuryCount.get(centuryOfBucket) ?? 0) + 1,
      )
    }
  })

  const sortedYears = Array.from(eventYears).sort((yearA, yearB) => yearA - yearB)
  const allYears =
    sortDirection === 'desc' ? [...sortedYears].reverse() : sortedYears

  return { allYears, eventsByYear, centuryCount, unknownItems, bucketYearById }
}

/**
 * 세기 → 그 세기에 속한 연도들. 렌더 트리를 `CenturySection > YearSection > 행`으로
 * 만들기 위한 그룹핑이며, sticky containing block을 그룹 단위로 한정하는 근거가 된다.
 */
export function groupYearsByCentury(
  allYears: number[],
): Array<{ century: number; years: number[] }> {
  const groups: Array<{ century: number; years: number[] }> = []
  for (const year of allYears) {
    const century = getCentury(year)
    const last = groups[groups.length - 1]
    if (last && last.century === century) last.years.push(year)
    else groups.push({ century, years: [year] })
  }
  return groups
}

/**
 * 세기·연도 밴드 접힘까지 반영해 **실제로 렌더되는 행**만 원래 순서대로 남긴다.
 * ↑↓ 키 내비게이션(DOM 렌더 행 기준)과 드로어 이전/다음이 같은 집합을 보게 하는 것이 목적.
 */
export function selectVisibleRows(
  items: FlattenedHierarchyItem[],
  buckets: YearBuckets,
  collapsedYears: Set<number>,
  collapsedCenturies: Set<number>,
): FlattenedHierarchyItem[] {
  if (collapsedYears.size === 0 && collapsedCenturies.size === 0) return items
  return items.filter((item) => {
    const year = buckets.bucketYearById.get(item.node.id)
    // '연도 미상' 섹션은 접기 대상이 아니다 — 항상 렌더된다.
    if (year === null || year === undefined) return true
    if (collapsedCenturies.has(getCentury(year))) return false
    return !collapsedYears.has(year)
  })
}
