/**
 * 필터 **옵션 건수(facet)**와 **drop-one-out 카운트** — 옵션 모집단이 참조 DB가 아니라
 * '내 데이터'를 반영하게 만드는 계산.
 * FSD: features/event-filters/model
 *
 * ## 왜 필요한가 (검토 IA-13 · IA-12 · IA-2)
 *
 * 예전 필터 바에는 **모집단 규약이 두 개** 있었다 — 세기 옵션만 로드된 사건에서 파생되고
 * 카테고리·국가·대륙은 참조 DB를 통째로 뱉었다. 그래서 사건이 한 건도 없는 국가 263개가
 * 옵션에 그대로 서 있고, 무엇을 고르면 결과가 있는지는 눌러 봐야만 알 수 있었다.
 * 국가 축은 그 위에 절단(창 50개)까지 걸려, **첫 화면의 역사국가가 구조적으로 0개**였다.
 *
 * 여기서 만드는 두 숫자가 그 셋을 한꺼번에 푼다.
 *  - `category`/`country`/`continent`/`century` 맵 = "이 옵션을 고르면 몇 건인가"
 *    → 옵션 우측 회색 숫자 + **정렬 키**(빈도 내림차순이면 첫 화면이 곧 내 데이터다)
 *  - `dropOneOut` = "이 축을 풀면 몇 건이 되는가" → 0건 빈 상태에서 범인을 지목한다
 *
 * ## 모수 규약
 *
 * 세는 대상은 **자기 자신이 조건을 만족하는 사건**이다(문맥 부모 제외). 이는 헤더의
 * '조건 일치 N건'(`matchedCount` = `matchedOnlyHierarchy.length`)과 같은 모수라,
 * "해제 시 37건"을 눌렀을 때 헤더 숫자가 37이 된다. 접힘(③④)은 어느 쪽에도 영향이 없다.
 *
 * ## 왜 '그 축만 뺀' 게이트인가
 *
 * 단순히 "이 국가로 태그된 사건 수"를 세면, 다른 축이 걸린 상태에서 그 숫자를 믿고 골랐다가
 * 0건을 받는다. 반대로 전 축을 적용해 세면 현재 선택된 옵션 말고는 전부 0이 된다.
 * 답은 **자기 축만 빼고 나머지를 적용**하는 것 — 그게 정확히 "이걸 고르면 몇 건"이다.
 */
import { listEventCenturies } from './century-span'
import {
  FILTER_AXIS_KEYS,
  matchesAllFilterAxes,
  type FilterableEvent,
  type FilterAxisContext,
  type FilterAxisKey,
} from './axis-predicates'

export interface FilterOptionCounts {
  /** categoryId → 건수 */
  category: ReadonlyMap<string, number>
  /** 국가 id → 건수. 현대·역사 id가 한 맵에 있고 브리지 합류가 반영돼 있다. */
  country: ReadonlyMap<string, number>
  /** continentId → 건수 */
  continent: ReadonlyMap<string, number>
  /** 세기(부호 포함) → 건수 */
  century: ReadonlyMap<number, number>
  /** 세기 축의 '연도 미상' 건수 */
  centuryUnknown: number
  /** 축을 하나씩 풀었을 때의 건수(검토 IA-12) */
  dropOneOut: Readonly<Record<FilterAxisKey, number>>
  /** 좁히는 축이 하나도 없을 때의 건수 = 로드된 사건 수 */
  unfiltered: number
}

const EMPTY_COUNT_MAP = new Map<never, number>()

/** 아직 계산할 데이터가 없을 때의 중립값 — 소비처가 옵셔널 체이닝을 하지 않게 한다. */
export const EMPTY_FILTER_OPTION_COUNTS: FilterOptionCounts = {
  category: EMPTY_COUNT_MAP as ReadonlyMap<string, number>,
  country: EMPTY_COUNT_MAP as ReadonlyMap<string, number>,
  continent: EMPTY_COUNT_MAP as ReadonlyMap<string, number>,
  century: EMPTY_COUNT_MAP as ReadonlyMap<number, number>,
  centuryUnknown: 0,
  dropOneOut: {
    category: 0,
    country: 0,
    continent: 0,
    century: 0,
    keyword: 0,
    bookmark: 0,
  },
  unfiltered: 0,
}

function bump<KeyType>(map: Map<KeyType, number>, key: KeyType): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

export function buildFilterOptionCounts(
  events: readonly FilterableEvent[],
  context: FilterAxisContext,
): FilterOptionCounts {
  const category = new Map<string, number>()
  const country = new Map<string, number>()
  const continent = new Map<string, number>()
  const century = new Map<number, number>()
  let centuryUnknown = 0
  const dropOneOut: Record<FilterAxisKey, number> = {
    category: 0,
    country: 0,
    continent: 0,
    century: 0,
    keyword: 0,
    bookmark: 0,
  }

  /**
   * 역사국가 id → 그 국가를 계보로 품는 현대 국가 id들. 국가 축 술어의 **역방향**이다.
   *
   * 술어는 "선택한 현대 id가 이 사건의 역사국가 태그를 품는가"를 묻지만, 건수는
   * "이 사건이 어떤 현대 id의 건수를 올리는가"를 물어야 한다. 정방향 맵으로 그걸 구하려면
   * 국가 334개 × 사건 전량을 곱해야 해서, 한 번 뒤집어 사건당 태그 수에 비례하게 만든다.
   */
  const modernIdsByHistoricalId = new Map<string, string[]>()
  for (const [
    modernId,
    historicalIds,
  ] of context.linkedHistoricalIdsByModernId) {
    for (const historicalId of historicalIds) {
      const bucket = modernIdsByHistoricalId.get(historicalId)
      if (bucket) bucket.push(modernId)
      else modernIdsByHistoricalId.set(historicalId, [modernId])
    }
  }

  for (const event of events) {
    /**
     * 축 하나를 뺀 판정 6벌을 **한 번만** 계산해 재사용한다 —
     * drop-one-out과 옵션 건수가 정확히 같은 게이트를 쓰므로 두 번 돌 이유가 없다.
     */
    const passesWithout = {} as Record<FilterAxisKey, boolean>
    for (const axis of FILTER_AXIS_KEYS) {
      const passes = matchesAllFilterAxes(event, context, axis)
      passesWithout[axis] = passes
      if (passes) dropOneOut[axis] += 1
    }

    if (passesWithout.category && event.categoryId) {
      bump(category, event.categoryId)
    }

    if (passesWithout.country) {
      // 한 사건이 같은 국가를 두 경로(직접 태그 + 브리지)로 가리켜도 1건이다.
      const counted = new Set<string>()
      for (const related of event.relatedCountries ?? []) {
        if (counted.has(related.id)) continue
        counted.add(related.id)
        bump(country, related.id)
      }
      for (const related of event.relatedHistoricalCountries ?? []) {
        if (!counted.has(related.id)) {
          counted.add(related.id)
          bump(country, related.id)
        }
        for (const modernId of modernIdsByHistoricalId.get(related.id) ?? []) {
          if (counted.has(modernId)) continue
          counted.add(modernId)
          bump(country, modernId)
        }
      }
    }

    if (passesWithout.continent) {
      const counted = new Set<string>()
      for (const related of event.relatedCountries ?? []) {
        const continentId = context.countryContinentMap.get(related.id)
        if (!continentId || counted.has(continentId)) continue
        counted.add(continentId)
        bump(continent, continentId)
      }
    }

    if (passesWithout.century) {
      const centuries = listEventCenturies(event)
      if (centuries.length === 0) centuryUnknown += 1
      else for (const value of centuries) bump(century, value)
    }
  }

  return {
    category,
    country,
    continent,
    century,
    centuryUnknown,
    dropOneOut,
    unfiltered: events.length,
  }
}
