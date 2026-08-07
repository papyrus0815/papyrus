/**
 * 필터 **축별 술어** — `matchesEvent`와 옵션 건수(facet)의 단일 출처.
 * FSD: features/event-filters/model
 *
 * ## 왜 별도 파일인가 (검토 IA-13 · IA-12)
 *
 * 옵션 우측의 건수("이걸 고르면 몇 건")와 빈 상태의 drop-one-out 카운트
 * ("이 축을 풀면 몇 건")는 둘 다 **'한 축만 빼고 나머지를 전부 적용한' 술어**를 필요로 한다.
 * 그 판정을 `useEventFilters` 안의 클로저에 두면 소비처마다 같은 로직을 복제하게 되고,
 * 복제된 술어는 반드시 언젠가 본판과 갈린다(세기 축이 이미 그렇게 두 벌로 갈려 있었다 —
 * `century-span.ts` 주석 참고). 그래서 축을 **이름으로 지목해 켜고 끌 수 있는** 형태로
 * 여기 한 곳에 모으고, `matchesEvent`는 "아무 축도 빼지 않은 호출"이 된다.
 *
 * ## 축 목록
 * 카테고리 · 국가 · 대륙 · 세기 · 키워드 · 북마크 여섯. 북마크는 사후 filter가 아니라
 * 다른 축과 같은 레인에 있으므로(검토 IA-7/DATA-10) 여기 포함된다.
 * 정렬·계층 토글은 '표시 옵션'이라 축이 아니다.
 */
import type { CenturyFilter } from '@/entities/event/model'
// 값(런타임) import는 배럴이 아니라 types 모듈에서 직접 — 배럴은 useEvents → api.service를
// 끌고 오고 그 안의 `import.meta`가 jest(ts-jest CJS) 컴파일을 막는다.
import { CENTURY_UNKNOWN } from '@/entities/event/model/types'
import { FILTER_ALL } from '@/features/event-list/lib'

import { eventSpansCentury, isCenturyUnknown } from './century-span'

/**
 * 술어가 실제로 읽는 필드만 구조적으로 좁힌 표면.
 * `HistoricalEvent`를 직접 받으면 features → pages 역방향 import가 되고,
 * 테스트도 거대한 픽스처를 만들어야 한다(`century-span.ts`의 `CenturySpannable`과 같은 규약).
 */
export interface FilterableEvent {
  id: string
  title?: string
  description?: string
  categoryId?: string | null
  location?: string | null
  keywords?: string[] | null
  startDate?: string | null
  endDate?: string | null
  relatedCountries?: ReadonlyArray<{ id: string }> | null
  relatedHistoricalCountries?: ReadonlyArray<{ id: string }> | null
}

export type FilterAxisKey =
  | 'category'
  | 'country'
  | 'continent'
  | 'century'
  | 'keyword'
  | 'bookmark'

/** 축 열거의 단일 출처 — 새 축을 추가하면 건수·drop-one-out이 자동으로 따라온다. */
export const FILTER_AXIS_KEYS = [
  'category',
  'country',
  'continent',
  'century',
  'keyword',
  'bookmark',
] as const satisfies readonly FilterAxisKey[]

/**
 * 술어 평가에 필요한 값 묶음. 전부 `useEventFilters`가 만들어 넣는다 —
 * 이 모듈은 상태를 갖지 않으므로 훅 밖(테스트·건수 계산)에서도 같은 판정을 재현할 수 있다.
 */
export interface FilterAxisContext {
  selectedCategory: typeof FILTER_ALL | string
  selectedCountry: typeof FILTER_ALL | string
  selectedContinent: typeof FILTER_ALL | string
  selectedCentury: CenturyFilter
  /** 이미 trim + 소문자화된 검색어. 빈 문자열이면 축이 꺼진 것. */
  normalizedKeyword: string
  /** null이면 '북마크만'이 꺼진 상태 */
  bookmarkGate: ReadonlySet<string> | null
  /** country.id → continentId */
  countryContinentMap: ReadonlyMap<string, string>
  /** 현대 국가 id → 브리지로 연결된 역사국가 id 집합 */
  linkedHistoricalIdsByModernId: ReadonlyMap<string, ReadonlySet<string>>
  /** event.id → 소문자 검색 건초더미(사전 계산) */
  searchHaystackById: ReadonlyMap<string, string>
}

/**
 * 검색 대상 필드를 하나로 이어 붙인 소문자 문자열.
 *
 * ⚠️ 필드 경계는 `\n`으로 구분한다. 그냥 이어 붙이면 제목 끝 + 설명 시작을 가로지르는
 * 가짜 매치가 난다(텍스트 입력엔 개행을 넣을 수 없으므로 구분자로 안전하다).
 */
export function buildKeywordHaystack(event: FilterableEvent): string {
  return [
    event.title ?? '',
    event.description ?? '',
    event.location ?? '',
    ...(event.keywords ?? []),
  ]
    .join('\n')
    .toLowerCase()
}

/** 단일 축 판정 — 축이 '전체'(미적용)면 항상 true다. */
export function matchesFilterAxis(
  event: FilterableEvent,
  axis: FilterAxisKey,
  context: FilterAxisContext,
): boolean {
  switch (axis) {
    case 'category':
      return (
        context.selectedCategory === FILTER_ALL ||
        event.categoryId === context.selectedCategory
      )

    /**
     * 검색 대상 필드 — 제목·설명·`location`(자유 텍스트 지명)·키워드.
     * 표시·JSON 내보내기까지 되는 필드가 검색에는 없어서, 화면에 '뫼즈'라고 적힌
     * 사건을 '뫼즈'로 찾을 수 없었다(검토 GAP-11/DATA-16).
     * 맵에 없는 사건(이론상 없음 — 소비처가 모두 같은 events에서 온다)은 그 자리에서
     * 만들어 판정만 정확히 한다.
     */
    case 'keyword':
      return (
        context.normalizedKeyword.length === 0 ||
        (
          context.searchHaystackById.get(event.id) ??
          buildKeywordHaystack(event)
        ).includes(context.normalizedKeyword)
      )

    /**
     * 세기 — **구간 겹침**이다(검토 DATA-1/IA-4). 시작·끝 두 점만 비교하면
     * 3세기에 시작해 7세기에 끝난 사건이 5세기 검색에서 사라진다.
     * 판정은 `century-span.ts` 하나에 있고 `availableCenturies`도 그것을 쓴다.
     */
    case 'century':
      return (
        context.selectedCentury === FILTER_ALL ||
        (context.selectedCentury === CENTURY_UNKNOWN
          ? isCenturyUnknown(event)
          : eventSpansCentury(event, context.selectedCentury))
      )

    /**
     * 국가 — 현대 id를 고르면 **브리지로 연결된 역사국가 태그도 합류**한다.
     * 서버 `GET /events`와 같은 소속 정의를 쓰기 위한 것으로, 이게 없으면
     * 국가 상세와 카탈로그가 같은 국가에 대해 다른 사건 집합을 낸다.
     */
    case 'country': {
      if (context.selectedCountry === FILTER_ALL) return true
      if (
        event.relatedCountries?.some(
          (related) => related.id === context.selectedCountry,
        )
      ) {
        return true
      }
      const linked = context.linkedHistoricalIdsByModernId.get(
        context.selectedCountry,
      )
      return (
        event.relatedHistoricalCountries?.some(
          (related) =>
            related.id === context.selectedCountry || linked?.has(related.id),
        ) ?? false
      )
    }

    /**
     * 대륙 필터 — relatedCountries(현대)만 고려. 역사적 국가는 직접
     * continentId가 없어 v1에서는 제외(향후 HistoricalCountryModernCountry
     * 조인으로 보강 가능).
     */
    case 'continent':
      return (
        context.selectedContinent === FILTER_ALL ||
        (event.relatedCountries?.some(
          (related) =>
            context.countryContinentMap.get(related.id) ===
            context.selectedContinent,
        ) ??
          false)
      )

    /** 북마크 — 다른 축과 동등한 술어. gate가 null이면 이 축은 꺼져 있다. */
    case 'bookmark':
      return context.bookmarkGate === null || context.bookmarkGate.has(event.id)

    default:
      return true
  }
}

/**
 * 전 축 판정. `skipAxis`를 주면 **그 축만 빼고** 나머지를 전부 적용한다 —
 * 옵션 건수(검토 IA-13)와 빈 상태 drop-one-out(검토 IA-12)이 쓰는 형태다.
 */
export function matchesAllFilterAxes(
  event: FilterableEvent,
  context: FilterAxisContext,
  skipAxis?: FilterAxisKey,
): boolean {
  for (const axis of FILTER_AXIS_KEYS) {
    if (axis === skipAxis) continue
    if (!matchesFilterAxis(event, axis, context)) return false
  }
  return true
}
