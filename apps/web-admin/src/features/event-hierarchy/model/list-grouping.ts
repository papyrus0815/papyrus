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
  /** 세기 → 그 세기의 '그룹 단위' 사건 수(부모가 목록에 없는 행) */
  centuryCount: Map<number, number>
  /** 연도 → 그 해의 '그룹 단위' 사건 수. 연 헤더 카운트의 모수 */
  yearRootCount: Map<number, number>
  /** 연도를 전혀 확정할 수 없는 행 — '연도 미상' 섹션 */
  unknownItems: FlattenedHierarchyItem[]
  /** 행 id → 귀속 연도. 미상은 null. 페이지가 밴드 접힘 판정에 쓴다. */
  bucketYearById: Map<string, number | null>
  /**
   * 시각 헤더를 렌더하지 않는 연도 — 그 해에 행이 **하나뿐**인 버킷.
   * 모수는 `baselineItems`(계층 접힘 이전)다 — 아래 ⚠️와 옵션 주석 참고.
   *
   * 실측: 연 그룹 88개 중 50개(57%)가 1행짜리다. 이들이 63px 헤더 + 45px 행 = 108px를
   * 사건 한 건에 쓰고 그중 58%가 크롬이며, 아래 유일한 행은 자기 날짜를 이미 갖고 있다
   * (연 그룹과 같은 해면 월·일만 보이므로 헤더를 지우면 연도를 되살려 줘야 한다).
   *
   * ⚠️ 헤더가 없다는 것은 **접기 토글도 없다**는 뜻이다. 그래서 이 연도들은
   * 연 단위 접힘의 대상에서 제외해야 한다 — 아니면 되돌릴 수단 없이 행이 사라진다.
   * `selectVisibleRows`와 렌더가 **둘 다** 이 집합을 봐야 하고, 한쪽만 보면
   * DOM에는 행이 있는데 ↑↓·드로어 이전/다음 모수에서는 빠지는 회귀가 난다.
   */
  headerlessYears: Set<number>
  /**
   * 표시 순서상 **직전 연도 그룹과의 공백**. 연도 → 공백 정보.
   *
   * 실측: 연 그룹 88개의 경계 87개 중 1년 간격은 29개뿐이고 **18개가 10년 이상**,
   * 최대 203년(1205→1002)이며 **12세기는 통째로 결번**이다. 그런데 모든 경계가
   * 동일한 여백으로 그려져, 사용자가 스크롤 거리로 시간 흐름을 읽을 때
   * '연속된 해'와 '기록이 없는 200년'이 완전히 같아 보인다.
   * 데이터의 가장 중요한 사실 중 하나인 **공백**이 화면에서 사라지는 것이다.
   */
  yearGapBefore: Map<number, YearGap>
}

export interface YearGap {
  /** 직전 표시 연도와의 절대 연차 */
  years: number
  /**
   * 이 공백이 통째로 건너뛴 세기들. 있으면 연차 대신 이 이름을 라벨한다 —
   * '203년 기록 없음'보다 '12세기 기록 없음'이 연대기에서 훨씬 잘 읽힌다.
   */
  missingCenturies: number[]
}

export interface BuildYearBucketsOptions {
  /**
   * 계층 보기인가(기본 true). **평면 보기(`flat=1`)에서는 false를 넘겨야 한다.**
   *
   * 평면 모드도 `parentNodeId`를 그대로 싣기 때문에 부모 귀속 규칙이 그대로 걸렸다.
   * 그런데 평면은 배열을 전역 재정렬하므로 '부모가 먼저 처리돼 있다'는 이 함수의
   * 전방 1패스 전제가 깨지고, **자식이 배열에서 부모보다 앞에 오면 귀속이 뒤집힌다** —
   * 실측: 정렬 방향 화살표 한 번에 67행이 다른 연 밴드로 옮겨 가고 밴드 수가 111↔94로
   * 널뛰었다(검토 IDX-8). 평면에는 계층이 없으니 자기 연도만 쓰면 순서 의존이 사라진다.
   */
  hierarchy?: boolean
  /**
   * 헤더리스·공백 판정의 **모수** — 계층 접힘(하위 접기) *이전*의 행 집합.
   *
   * 생략하면 `items`를 그대로 쓴다. 페이지는 `visibleFlattenedHierarchy`(접힘 이전)를
   * 넘긴다. 이유는 두 가지다.
   * ⑴ 헤더리스(1행짜리 연도)는 접기 토글이 없다는 뜻인데, 접힘 *이후* 행 수로 판정하면
   *    '하위 접기' 한 번에 3행짜리 연도가 1행이 되면서 헤더와 토글이 통째로 사라지고
   *    접어 뒀던 행이 되살아났다(실측: 시각 연 헤더 38→28, 연도 10개에서 동시 발생).
   * ⑵ 공백 표지('N년 기록 없음')는 **기록의 존재 여부**를 주장하므로, 접혀서 안 보일 뿐
   *    엄연히 있는 사건을 없다고 말하면 안 된다.
   */
  baselineItems?: FlattenedHierarchyItem[]
}

/** 한 행의 버킷 귀속 결과 — 본 패스와 모수 패스가 같은 규칙을 쓰도록 뽑아 둔다. */
interface BucketAssignment {
  item: FlattenedHierarchyItem
  bucketYear: number | null
  isGroupRoot: boolean
}

/**
 * 귀속 패스 — `buildYearBuckets`의 본 계산과 `baselineItems` 모수 계산이 **같은 규칙**을
 * 쓰게 하는 단일 출처. 두 패스가 갈리면 헤더리스 판정과 렌더가 어긋난다.
 */
function assignBuckets(
  rows: FlattenedHierarchyItem[],
  filteringActive: boolean,
  hierarchy: boolean,
): {
  assigned: BucketAssignment[]
  bucketYearById: Map<string, number | null>
  /** 행들이 **자기 날짜로** 주장하는 연도 전부 — 공백 표지의 진실 판정에 쓴다. */
  ownYears: Set<number>
} {
  const bucketYearById = new Map<string, number | null>()
  const ownYears = new Set<number>()
  const assigned: BucketAssignment[] = []

  /** 이 목록에 실제로 존재하는 노드 id — '내 부모가 화면에 있는가' 판정용. */
  const presentIds = new Set(rows.map((item) => item.node.id))

  rows.forEach((item) => {
    // BC·고대 날짜 안전 파싱(네이티브 Date 금지).
    const parsedYear = parseIsoDateParts(item.node.period.start)?.year ?? null
    if (parsedYear !== null) ownYears.add(parsedYear)
    const parentPresent =
      hierarchy &&
      item.parentNodeId !== null &&
      presentIds.has(item.parentNodeId)

    /**
     * 버킷 귀속 — **실제 부모**를 따른다(검토 IA-2).
     *
     * 예전엔 '배열에서 직전 depth 0 항목이 곧 내 부모'라는 위치 휴리스틱이었다:
     *   depth 0 ? parsedYear ?? lastTopLevelYear : lastTopLevelYear ?? parsedYear
     * ⑴ 북마크 필터가 부모만 제거해도 자식의 depth는 남으므로 그 불변식이 깨져,
     *    976년 자식이 '20세기 › 1990년' 헤더 아래 렌더되면서 행은 '976'을 주장했다.
     * ⑵ 날짜 미상 최상위 행이 직전 연도로 흡수돼 그 해·세기 카운트를 부풀렸고,
     *    미상 정렬 키가 NEGATIVE_INFINITY라 정렬 방향 토글 한 번에 '연도 미상' 섹션과
     *    가장 오래된 연도 그룹을 오갔다.
     *
     * 그래서 depth 0은 자기 연도만 쓰고(없으면 자연히 '연도 미상'), 자식은 **부모의 버킷**을
     * 따른다. DFS 선순회라 부모 항목이 항상 먼저 처리돼 있어 한 번의 전방 패스로 풀린다.
     * 부모가 목록에 없으면 자기 연도로 폴백한다.
     *
     * ⚠️ **필터 중에는 예외**다(검토 DATA-9). 세기 필터는 행의 *자기* 날짜로 판정하는데
     * 버킷은 부모를 따르므로, '19세기' 칩을 걸어 놓고 그 행이 '18세기 › 1789년' 헤더 아래
     * 놓이는 모순이 생겼다(살아있는 부모·자식 시작 세기 불일치 13쌍). 필터가 걸려 있고
     * 그 행 자신이 조건을 만족하면(= 사용자가 이 행을 보려고 필터를 건 것) 자기 연도로
     * 귀속시켜 칩·헤더·행 토큰이 같은 시점을 말하게 한다. 문맥용 부모 행(isMatch=false)은
     * 계속 계보를 따른다.
     */
    const parentBucket = parentPresent
      ? bucketYearById.get(item.parentNodeId!)
      : undefined
    const prefersOwnYear =
      !parentPresent || (filteringActive && item.isMatch && parsedYear !== null)
    const bucketYear = prefersOwnYear
      ? (parsedYear ?? parentBucket)
      : (parentBucket ?? parsedYear)

    /**
     * 이 행이 이 그룹의 *단위*인가 — 부모가 **같은 버킷에 없으면** true.
     * 연·세기 헤더 카운트의 모수다. depth로만 세면 부모 없이 남은 자식이 어디에도 안 세어져
     * '1건' 헤더 아래 2행이 보이거나 '976년 0'처럼 0건 헤더가 나온다.
     * 위 예외로 자기 연도에 떨어진 매칭 자식도 그 해에서는 스스로 그룹 단위다.
     */
    const isGroupRoot = !parentPresent || bucketYear !== parentBucket
    const resolved =
      bucketYear === null || bucketYear === undefined ? null : bucketYear

    bucketYearById.set(item.node.id, resolved)
    assigned.push({ item, bucketYear: resolved, isGroupRoot })
  })

  return { assigned, bucketYearById, ownYears }
}

/**
 * 평탄화된 행들을 연도 버킷에 담는다.
 *
 * 귀속 규칙: 최상위는 자기 연도 우선, 자식은 직전 최상위(부모) 연도 우선.
 * 어느 쪽도 없으면 자기 연도로 폴백하고, 그래도 없으면 '연도 미상'.
 * ⚠️ 절대 드롭하지 않는다 — 예전엔 year가 null이면 조용히 사라져
 * 날짜 완전 미상 사건과 부모 없이 남은 자식이 화면에서 통째로 없어졌다.
 *
 * @param filteringActive 내용을 좁히는 필터가 걸려 있는가(`useEventFilters.hasNarrowingFilters`).
 *   true면 **매칭된 행은 자기 연도 버킷에 귀속**된다 — 위 주석 참고(검토 DATA-9).
 *   ⚠️ 페이지와 목록 위젯이 **같은 값**을 넘겨야 한다. 다르면 '보이는 행' 판정이
 *   DOM과 갈려 ↑↓·드로어 이전/다음이 화면에 없는 행을 순회한다.
 */
export function buildYearBuckets(
  items: FlattenedHierarchyItem[],
  sortDirection: 'asc' | 'desc',
  filteringActive = false,
  { hierarchy = true, baselineItems }: BuildYearBucketsOptions = {},
): YearBuckets {
  const eventYears = new Set<number>()
  const eventsByYear = new Map<number, FlattenedHierarchyItem[]>()
  const unknownItems: FlattenedHierarchyItem[] = []
  const centuryCount = new Map<number, number>()
  const yearRootCount = new Map<number, number>()

  const { assigned, bucketYearById, ownYears } = assignBuckets(
    items,
    filteringActive,
    hierarchy,
  )

  assigned.forEach(({ item, bucketYear, isGroupRoot }) => {
    if (bucketYear === null) {
      unknownItems.push(item)
      return
    }
    // depth 무관하게 add — 부모 없이 자기 연도로 버킷팅된 경우에도 버킷이 존재해야
    // 렌더 루프가 그 연도를 순회한다.
    eventYears.add(bucketYear)
    if (!eventsByYear.has(bucketYear)) eventsByYear.set(bucketYear, [])
    eventsByYear.get(bucketYear)!.push(item)
    // getCentury(year)로 BC 음수 세기까지 정합(1950 → 20세기).
    if (isGroupRoot) {
      const centuryOfBucket = getCentury(bucketYear)
      centuryCount.set(
        centuryOfBucket,
        (centuryCount.get(centuryOfBucket) ?? 0) + 1,
      )
      yearRootCount.set(bucketYear, (yearRootCount.get(bucketYear) ?? 0) + 1)
    }
  })

  const sortedYears = Array.from(eventYears).sort((yearA, yearB) => yearA - yearB)
  const allYears =
    sortDirection === 'desc' ? [...sortedYears].reverse() : sortedYears

  /**
   * 헤더리스·공백의 모수는 **계층 접힘 이전**이다(옵션 주석 참고).
   * 모수를 따로 주지 않으면 지금 행들이 곧 모수다.
   */
  const baseline =
    baselineItems && baselineItems !== items
      ? assignBuckets(baselineItems, filteringActive, hierarchy)
      : null
  const baselineRowCount = new Map<number, number>()
  ;(baseline?.assigned ?? assigned).forEach(({ bucketYear }) => {
    if (bucketYear === null) return
    baselineRowCount.set(bucketYear, (baselineRowCount.get(bucketYear) ?? 0) + 1)
  })

  const headerlessYears = new Set<number>()
  eventsByYear.forEach((_rows, year) => {
    if ((baselineRowCount.get(year) ?? 0) === 1) headerlessYears.add(year)
  })

  /**
   * 공백 계산은 **표시 순서** 기준이다(정렬 방향이 이미 적용된 allYears).
   * 방향과 무관하게 절대 연차를 쓰므로 오름/내림 어느 쪽에서도 같은 공백이 같게 읽힌다.
   *
   * ⚠️ 판정 기준은 밴드 목록이 아니라 행들이 **자기 날짜로 주장하는 연도**다(검토 IDX-6).
   * 자식이 부모 밴드로 흡수되면 그 자식의 연도는 `allYears`에서 사라진다 — 실측 115종 중
   * 25종이 그렇게 사라졌고, 그 빈자리를 이 계산이 '공백'으로 읽어 **10년 이상 표지 18개 중
   * 8개가 거짓**이 됐다("977년과 965년 사이 12년 기록 없음" — 실제로는 976·974·968·966에
   * 6건이 있다). 사이에 실제 기록이 하나라도 있으면 표지도 여백도 만들지 않는다.
   */
  const coveredYears = Array.from(baseline?.ownYears ?? ownYears).sort(
    (yearA, yearB) => yearA - yearB,
  )
  /** `lower < year < upper`인 기록 연도가 하나라도 있는가 (정렬된 배열 이분 탐색). */
  const hasRecordBetween = (lower: number, upper: number): boolean => {
    let low = 0
    let high = coveredYears.length
    while (low < high) {
      const mid = (low + high) >> 1
      if (coveredYears[mid] <= lower) low = mid + 1
      else high = mid
    }
    return low < coveredYears.length && coveredYears[low] < upper
  }

  const yearGapBefore = new Map<number, YearGap>()
  for (let index = 1; index < allYears.length; index += 1) {
    const previous = allYears[index - 1]
    const current = allYears[index]
    const lower = Math.min(previous, current)
    const upper = Math.max(previous, current)
    if (hasRecordBetween(lower, upper)) continue
    const missingCenturies: number[] = []
    // 0세기는 존재하지 않는다(기원전 1세기 다음이 1세기).
    for (
      let century = getCentury(lower) + 1;
      century < getCentury(upper);
      century += 1
    ) {
      if (century !== 0) missingCenturies.push(century)
    }
    yearGapBefore.set(current, {
      years: Math.abs(previous - current),
      missingCenturies,
    })
  }

  return {
    allYears,
    eventsByYear,
    centuryCount,
    yearRootCount,
    unknownItems,
    bucketYearById,
    headerlessYears,
    yearGapBefore,
  }
}

/**
 * 공백 크기 → 그룹 앞 추가 여백(px).
 *
 * 로그 스케일 같은 연속 함수를 쓰지 않는다 — 픽셀로 연차를 정확히 읽을 수 있다는
 * **거짓 정밀도**를 주기 때문이다. 라벨이 정확한 숫자를 말하고, 여백은 '더 크다'는
 * 순서 정보만 싣는 4단 계단이면 충분하다.
 */
export function gapSpacingPx(gapYears: number): number {
  if (gapYears <= 1) return 0
  if (gapYears < 10) return 4
  if (gapYears < 50) return 12
  if (gapYears < 100) return 20
  return 28
}

/** 공백 라벨 — 통째로 빠진 세기가 있으면 그 이름을, 없으면 연차를 말한다. */
export function formatGapLabel(gap: YearGap): string | null {
  if (gap.years < 10) return null
  if (gap.missingCenturies.length > 0) {
    const names = gap.missingCenturies
      .map((century) =>
        century < 0 ? `기원전 ${Math.abs(century)}세기` : `${century}세기`,
      )
      .reverse()
    const label =
      names.length <= 2 ? names.join('·') : `${names[0]}~${names[names.length - 1]}`
    return `${label} 기록 없음`
  }
  return `${gap.years}년 기록 없음`
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
 * 그룹 목록이 **실제로 그리는 순서**로 행을 재배열한다.
 *
 * ## 왜 필요한가
 * 그룹 렌더는 배열 순서가 아니라 `allYears → eventsByYear[year]` 순으로 돌고
 * '연도 미상' 섹션을 맨 끝에 붙인다. 그런데 드로어 '이전/다음'은
 * `selectVisibleRows`가 돌려준 **배열 순서**의 인덱스로 움직인다. 두 순서가 갈리면
 * ↑↓(DOM 순서)와 드로어 이전/다음이 서로 다른 방향으로 이동한다 —
 * 집합은 같은데 순서만 다르므로 "다음인데 위로 갔다"가 된다.
 *
 * 예전엔 자식이 항상 부모 버킷을 따라가 서브트리가 배열에서도 연속이라 두 순서가
 * 우연히 같았지만, ⑴ 필터 중 매칭 행이 자기 연도로 옮겨 가고(`buildYearBuckets`의
 * `filteringActive`, 검토 DATA-9) ⑵ 기간순 정렬처럼 배열 순서가 연도 순서와 다른
 * 정렬이 있으면 어긋난다. 그래서 순서를 렌더 쪽에 맞춘다.
 *
 * ⚠️ 이 순서는 `event-compact-list`의 grouped 렌더 순서와 **정확히 같아야** 한다.
 * (세기 그룹은 `groupYearsByCentury(allYears)`라 결국 `allYears` 순서와 동일하다.)
 * 그룹이 꺼진 목록(`grouped=false`)은 배열 순서를 그대로 그리므로 이 함수를 쓰지 않는다.
 */
export function orderRowsForRender(
  items: FlattenedHierarchyItem[],
  buckets: YearBuckets,
): FlattenedHierarchyItem[] {
  const ordered: FlattenedHierarchyItem[] = []
  for (const year of buckets.allYears) {
    const rows = buckets.eventsByYear.get(year)
    if (rows) ordered.push(...rows)
  }
  ordered.push(...buckets.unknownItems)
  /**
   * 방어 — 모든 행은 연도 버킷이나 '연도 미상' 중 하나에 반드시 담긴다(buildYearBuckets 계약).
   * 그래도 수가 어긋나면 재배열이 행을 잃었다는 뜻이므로 원본을 그대로 돌려준다.
   * 순서가 어긋나는 것보다 행이 사라지는 쪽이 훨씬 나쁘다.
   */
  return ordered.length === items.length ? ordered : items
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
    /**
     * 헤더 없는 연도(1행짜리)는 연 단위 접힘의 대상이 아니다 — 접기 토글 자체가
     * 화면에 없으므로 접히면 되돌릴 수단이 없다.
     * ⚠️ 이 분기는 렌더(event-compact-list)와 **정확히 같아야** 한다. 한쪽만 고치면
     * DOM에는 행이 보이는데 ↑↓ 내비와 드로어 이전/다음 모수에서는 빠진다.
     * 세기 단위 접힘은 그대로 적용된다 — 세기 헤더는 항상 있기 때문이다.
     */
    if (buckets.headerlessYears.has(year)) return true
    return !collapsedYears.has(year)
  })
}
