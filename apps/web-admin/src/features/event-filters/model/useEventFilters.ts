/**
 * Event Filters Feature - Filter Logic Hook
 * FSD: features/event-filters/model
 */
import { useMemo, useState } from 'react'

import type { CenturyFilter, FilterChip } from '@/entities/event/model'
// 값(런타임) import는 배럴이 아니라 types 모듈에서 직접 — 배럴은 useEvents → api.service를
// 끌고 오고 그 안의 `import.meta`가 jest(ts-jest CJS) 컴파일을 막는다.
import { CENTURY_UNKNOWN } from '@/entities/event/model/types'
import {
  FILTER_ALL,
  SORT_OPTIONS,
  type SortOption,
} from '@/features/event-list/lib'
import type { ContinentResponseDto } from '@/shared/api/continents'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { dateSortKey, isoYearSpan } from '@/shared/lib/iso-date'

import type { HistoricalEvent } from '../../../pages/events/create/events.types'
import { formatCenturyLabel } from '../../../pages/events/utils/events.utils'

import {
  buildKeywordHaystack,
  matchesAllFilterAxes,
  type FilterAxisContext,
} from './axis-predicates'
import { listEventCenturies } from './century-span'
import {
  buildFilterOptionCounts,
  type FilterOptionCounts,
} from './option-facets'
import {
  READY_REFERENCE_STATE,
  resolveFilterValueLabel,
  type FilterReferenceState,
} from './reference-label'

/**
 * 마운트 시 필터 상태의 **시드**(검토 URL-5).
 *
 * URL이 이 페이지의 상태 저장소인데 이 훅의 7개 축은 항상 기본값으로 시작했다.
 * 그래서 마운트 첫 커밋에서 상태→URL effect가 *아직 반영 전인* 기본값으로 URL을
 * 덮어써 딥링크 필터를 지웠다가 다음 커밋에 복구했다. 페이지가 URL 파서로 만든
 * 값을 여기로 넘기면 첫 커밋부터 `state === URL`이 된다.
 *
 * ⚠️ `useState` initializer에만 쓰이므로 **첫 렌더 이후 변경은 무시**된다.
 * 마운트 후의 URL 변화는 `useCatalogUrlSync`의 URL→state effect가 담당한다.
 */
export interface EventFilterInitialState {
  selectedCategory?: string
  selectedCountry?: string
  selectedContinent?: string
  selectedCentury?: CenturyFilter
  keyword?: string
  sortBy?: SortOption
  sortDirection?: 'asc' | 'desc'
  showFlatView?: boolean
}

/** 북마크 축 — 다른 필터와 같은 레인에 합류시키기 위한 입력(검토 IA-7/DATA-10) */
export interface EventFilterOptions {
  /** '북마크만' 모드 */
  bookmarksOnly?: boolean
  /** 북마크된 사건 id 집합(브라우저 로컬) */
  bookmarks?: ReadonlySet<string>
  /** URL에서 읽어 온 초기 필터 값 — 첫 렌더에만 적용 */
  initial?: EventFilterInitialState
  /**
   * 참조 데이터(카테고리·국가·대륙) 로드 상태 — 칩 라벨의 폴백 문구를 원인별로
   * 가르는 데 쓴다(검토 GAP-5). 미전달 시 전부 'ready'로 본다.
   */
  referenceState?: FilterReferenceState
}

/**
 * countries / historicalCountries는 `filterSummaryChips`의 국가명 lookup에 사용.
 * 미전달 시 events에서 fallback으로 찾으나 비용이 N(events) — 가능하면 전달 권장.
 * historicalCountries는 추가로 **국가 브리지 역인덱스**(현대 → 연결 역사국가)의 원천이다.
 *
 * continents는 (1) 칩 라벨 lookup (2) 대륙 필터 시 country.id → continentId 조인용.
 * 역사적 국가는 continentId가 없어 v1에서는 대륙 필터 활성 시 제외된다.
 */
export const useEventFilters = (
  events: HistoricalEvent[],
  dbCategories: EventCategoryDto[],
  countries: CountryResponseDto[] = [],
  historicalCountries: HistoricalCountryResponseDto[] = [],
  continents: ContinentResponseDto[] = [],
  options: EventFilterOptions = {},
) => {
  /**
   * 북마크는 **다른 축과 같은 술어 레인**에 있다(검토 IA-7/DATA-10).
   *
   * 예전엔 평탄화가 끝난 뒤 행 단위로 걸렀다. 그래서 '하위 접기' + '북마크만'을
   * 겹치면 북마크한 자식은 접힘으로 잘리는데 그 자식을 펼칠 부모 행은 북마크 필터에
   * 이미 사라져 **되살릴 셰브론이 화면에 없었고**, 부모 없이 남은 자식은 depth만 남은
   * 고아 행이 됐다. 술어에 넣으면 평탄화가 '매칭 자손을 가진 부모'를 문맥 행으로
   * 남겨 두 증상이 함께 사라진다.
   */
  const {
    bookmarksOnly = false,
    bookmarks,
    initial,
    referenceState = READY_REFERENCE_STATE,
  } = options
  /**
   * 북마크만 모드가 아닐 때는 `bookmarks` 참조 변화를 술어 deps에서 끊는다 —
   * 아니면 북마크 토글 한 번이 `matchesEvent` → 트리 전체 재평탄화를 유발한다.
   */
  const bookmarkGate = bookmarksOnly ? (bookmarks ?? null) : null
  // ===== 필터 상태 =====
  // 초기값은 URL 시드(`initial`) → 없으면 기본값. lazy initializer라 첫 렌더에만 읽는다.
  const [selectedCategory, setSelectedCategory] = useState<
    typeof FILTER_ALL | string
  >(() => initial?.selectedCategory ?? FILTER_ALL)
  const [keyword, setKeyword] = useState(() => initial?.keyword ?? '')
  const [sortBy, setSortBy] = useState<SortOption>(
    () => initial?.sortBy ?? SORT_OPTIONS.RECENT,
  )
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    () => initial?.sortDirection ?? 'desc',
  )
  const [selectedCentury, setSelectedCentury] = useState<CenturyFilter>(
    () => initial?.selectedCentury ?? FILTER_ALL,
  )
  const [selectedCountry, setSelectedCountry] = useState<
    typeof FILTER_ALL | string
  >(() => initial?.selectedCountry ?? FILTER_ALL)
  const [selectedContinent, setSelectedContinent] = useState<
    typeof FILTER_ALL | string
  >(() => initial?.selectedContinent ?? FILTER_ALL)
  const [showFlatView, setShowFlatView] = useState(
    () => initial?.showFlatView ?? false,
  )

  /**
   * country.id → continentId lookup. 대륙 필터를 cheap하게 적용하기 위해
   * countries 참조 데이터에서 한 번만 빌드. 미해결(대륙 없음/null) 국가는 키 부재.
   */
  const countryContinentMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const country of countries) {
      if (country.continentId) map.set(country.id, country.continentId)
    }
    return map
  }, [countries])

  /**
   * 현대 국가 id → 브리지로 연결된 역사국가 id 집합 (검토 DATA-4/IA-3).
   *
   * 서버 `GET /events`는 국가 필터에 브리지 계보를 합류시키는데(대한민국 → 조선,
   * `country-scope.util.ts`) 카탈로그 술어는 id 정확 일치라, 같은 '대한민국'을 골라도
   * 국가 상세와 카탈로그가 다른 집합을 냈다(실측 델타: 독일 76·러시아 65·오스트리아 48건).
   * 사용자는 그걸 항상 "카탈로그가 사건을 누락한다"로 읽는다.
   *
   * 즉시안은 이 역인덱스다 — `GET /historical-countries`가 이미
   * `parentModernCountryIds`를 실어 보내므로(controller가 `modernConnections`를 매핑)
   * 추가 왕복도 페이로드 증가도 0이다. 정본은 서버 위임(보류 `PERF-1`).
   *
   * ⚠️ 방향은 **현대 → 역사** 한쪽뿐이다. 서버도 역사국가 id로 필터할 땐 확장하지
   * 않으므로(브리지 조회가 빈 배열) 여기서도 역방향을 만들지 않는다.
   */
  const linkedHistoricalIdsByModernId = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const historical of historicalCountries) {
      for (const modernId of historical.parentModernCountryIds ?? []) {
        const linked = map.get(modernId)
        if (linked) linked.add(historical.id)
        else map.set(modernId, new Set([historical.id]))
      }
    }
    return map
  }, [historicalCountries])

  // ===== 사용 가능한 필터 옵션 =====
  /**
   * 세기 옵션 — 술어와 **같은 헬퍼**로 파생한다. 시작·끝 두 점만 넣던 시절엔
   * 3~7세기 사건이 4·5·6세기 옵션을 만들지 않아, 그 세기를 고를 방법 자체가 없었다.
   */
  const availableCenturies = useMemo(() => {
    const centuries = new Set<number>()
    events.forEach((event) => {
      for (const century of listEventCenturies(event)) centuries.add(century)
    })
    return Array.from(centuries).sort(
      (centuryA, centuryB) => centuryA - centuryB,
    )
  }, [events])

  // ===== 필터링된 이벤트 =====
  const trimmedKeyword = keyword.trim()
  const normalizedKeyword = trimmedKeyword.toLowerCase()

  /**
   * 사건 id → **소문자 검색 건초더미**(검토 PERF-5).
   *
   * 예전엔 술어가 호출될 때마다 `title.toLowerCase()`·`description.toLowerCase()` …로
   * 새 문자열을 4벌씩 만들었다. 술어는 한 사건에 대해 여러 번 불리므로(루트 선별 →
   * 평탄화 → 숨김 자식 카운트) 검색어가 걸린 상태의 조작 한 번이 수천~수만 회의
   * 문자열 복사를 유발했다. 소문자화는 **events에만 의존**하니 여기서 한 번만 한다.
   *
   * ⚠️ 필드 경계는 `\n`으로 구분한다. 그냥 이어 붙이면 제목 끝 + 설명 시작을 가로지르는
   * 가짜 매치가 난다(텍스트 입력엔 개행을 넣을 수 없으므로 구분자로 안전하다).
   */
  const searchHaystackById = useMemo(() => {
    const map = new Map<string, string>()
    for (const event of events) {
      map.set(event.id, buildKeywordHaystack(event))
    }
    return map
  }, [events])

  /**
   * parentEventId → 직계 자식 맵. events에만 의존하므로 필터(카테고리·키워드·세기)
   * 변경 시 재구축되지 않도록 filteredEvents에서 분리한다.
   */
  const childrenByParent = useMemo(() => {
    const map = new Map<string, HistoricalEvent[]>()
    for (const event of events) {
      if (!event.parentEventId) continue
      const siblings = map.get(event.parentEventId)
      if (siblings) siblings.push(event)
      else map.set(event.parentEventId, [event])
    }
    return map
  }, [events])

  /**
   * 내용을 좁히는 필터가 하나라도 걸려 있는가.
   * (정렬·계층 토글은 '표시 옵션'이라 여기 포함하지 않는다.)
   *
   * 이 플래그가 false면 평탄화 단계는 자식 필터링을 건너뛴다 — 불필요한 술어
   * 호출을 없애고, "필터가 없는데 자식이 사라지는" 상황도 원천 차단한다.
   *
   * 북마크도 여기 포함된다 — 내용을 좁히는 축이므로 다른 5축과 같은 취급을 받아야
   * 평탄화가 문맥 부모를 남긴다(검토 IA-7/DATA-10).
   */
  const hasNarrowingFilters =
    selectedCategory !== FILTER_ALL ||
    selectedCountry !== FILTER_ALL ||
    selectedContinent !== FILTER_ALL ||
    selectedCentury !== FILTER_ALL ||
    normalizedKeyword.length > 0 ||
    bookmarksOnly

  /**
   * 축 술어가 읽는 값 묶음 — `matchesEvent`와 옵션 건수(facet)가 **같은 객체**를 본다.
   *
   * 이 한 겹이 없으면 "옵션 우측 숫자"와 "실제 결과"가 서로 다른 술어에서 나오게 되고,
   * 그건 사용자에게 거짓말하는 카운트다(검토 IA-13).
   */
  const axisContext = useMemo<FilterAxisContext>(
    () => ({
      selectedCategory,
      selectedCountry,
      selectedContinent,
      selectedCentury,
      normalizedKeyword,
      bookmarkGate,
      countryContinentMap,
      linkedHistoricalIdsByModernId,
      searchHaystackById,
    }),
    [
      selectedCategory,
      selectedCountry,
      selectedContinent,
      selectedCentury,
      normalizedKeyword,
      bookmarkGate,
      countryContinentMap,
      linkedHistoricalIdsByModernId,
      searchHaystackById,
    ],
  )

  /**
   * 단일 사건이 현재 필터를 모두 만족하는가 — 루트·자식 공통 술어.
   *
   * 평탄화 단계(useEventHierarchy)에도 넘겨 **자식에까지 필터를 적용**한다.
   * 예전엔 이 술어가 루트 선별에만 쓰이고 자식은 무필터로 전개돼, '전쟁'으로
   * 필터해도 매칭된 부모 밑의 '외교' 자식이 그대로 섞여 나왔다(검토 TF-8/DATA-6).
   */
  const matchesEvent = useMemo(() => {
    /**
     * 술어 결과 캐시 — **소비처 전체가 공유한다**(검토 PERF-5).
     *
     * 한 사건은 ⑴ 루트 선별(`filteredEvents`) ⑵ 평탄화의 노드 판정 ⑶ 부모의 '숨긴 자식'
     * 카운트에서 각각 평가된다. 예전엔 캐시가 평탄화 훅 안에만 있어 ⑴과 ⑵·⑶이 서로의
     * 결과를 못 봤고, 같은 사건을 두 벌로 계산했다.
     *
     * ⚠️ 캐시 수명 = 이 memo의 수명이다. dep인 `axisContext`가 **모든 필터 축 +
     * 북마크 게이트 + 건초더미(=events)**를 덮으므로, 축이 하나라도 바뀌면 캐시째
     * 버려진다. 새 축을 술어에 추가하면 반드시 `axisContext`에도 넣을 것.
     */
    const cache = new Map<string, boolean>()

    /**
     * 판정 자체는 `axis-predicates.ts`가 한다 — 옵션 건수(facet)·drop-one-out이
     * **같은 함수**를 쓰기 위해서다. 여기 남는 건 캐시 한 겹뿐이다.
     */
    const matches = (event: HistoricalEvent): boolean => {
      const cached = cache.get(event.id)
      if (cached !== undefined) return cached
      const result = matchesAllFilterAxes(event, axisContext)
      cache.set(event.id, result)
      return result
    }
    return matches
  }, [axisContext])

  const filteredEvents = useMemo(() => {
    /**
     * 자식 사건도 검색·필터 대상에 포함 — 자식만 매칭돼도 그 *루트*를 결과에 남긴다.
     * (이전엔 부모만 평가해, 자식 제목으로 검색하면 그 사건이 통째로 사라졌다. 자식은
     *  루트 펼침으로 도달하므로 루트를 살리면 계층에서 자연히 노출됨.)
     * 출력은 여전히 루트만 — downstream(hierarchy/flatten)이 의존하는 계약을 유지.
     */
    const matchesSelfOrDescendant = (event: HistoricalEvent): boolean => {
      if (matchesEvent(event)) return true
      const kids = childrenByParent.get(event.id)
      return kids ? kids.some(matchesSelfOrDescendant) : false
    }

    return events
      .filter((event) => !event.parentEventId)
      .filter(matchesSelfOrDescendant)
  }, [events, childrenByParent, matchesEvent])

  /**
   * ===== 옵션 건수 + drop-one-out (검토 IA-13 · IA-12 · IA-2) =====
   *
   * "이 옵션을 고르면 몇 건" / "이 축을 풀면 몇 건". 필터 바의 **옵션 모집단 규약을
   * 통일**하는 값이다 — 예전엔 세기만 로드된 사건에서 파생되고 나머지 3축은 참조 DB를
   * 통째로 뱉어, 한 필터 바 안에서 축마다 다른 규약이 돌고 있었다.
   *
   * 비용은 사건당 축 6벌 판정이라 오늘 규모(261건)에서 왕복 한 번보다 훨씬 싸고,
   * deps가 `axisContext`(=필터 축 전체)라 필터를 만질 때만 다시 돈다.
   */
  const optionCounts = useMemo<FilterOptionCounts>(
    () => buildFilterOptionCounts(events, axisContext),
    [events, axisContext],
  )

  // ===== 이벤트 정렬 =====
  const sortedEvents = useMemo(() => {
    const eventsCopy = [...filteredEvents]

    // BC(음수 연도)·미상 날짜를 안정 정렬하기 위해 네이티브 Date 대신 정수 키를 쓴다.
    // 미상(키 null)은 항상 맨 끝(NEGATIVE_INFINITY)로 보내 NaN 비교의 무작위성을 제거.
    const startKey = (e: HistoricalEvent) =>
      dateSortKey(e.startDate) ?? Number.NEGATIVE_INFINITY

    const sorted = eventsCopy.sort((eventA, eventB) => {
      let comparison = 0

      switch (sortBy) {
        case 'duration':
          // stats.durationInYears는 transformer가 항상 0으로 채워 무의미 →
          // start~end 연 단위 기간으로 직접 계산(BC 지원).
          comparison =
            isoYearSpan(eventA.startDate, eventA.endDate) -
            isoYearSpan(eventB.startDate, eventB.endDate)
          break
        case 'created': {
          // 등록 시각 — 값이 없으면 가장 오래된 것으로 취급해 뒤로 민다.
          const createdKey = (event: HistoricalEvent) => {
            const raw = (event as { createdAt?: string | null }).createdAt
            const time = raw ? Date.parse(raw) : NaN
            return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
          }
          comparison = createdKey(eventA) - createdKey(eventB)
          break
        }
        case 'recent':
        default:
          comparison = startKey(eventA) - startKey(eventB)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredEvents, sortBy, sortDirection])

  // ===== 필터 칩 생성 =====
  /**
   * 칩 라벨 — 국가명 lookup은 reference data(countries / historicalCountries)에서
   * O(N_country)로 한 번. 이전엔 events 풀스캔(N_events × M_relatedCountries)이라
   * 사건이 늘면 비례해서 무거워졌고, useMemo도 안 걸려 매 렌더 반복됨.
   */
  const filterSummaryChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []

    if (selectedCategory !== FILTER_ALL) {
      /**
       * 폴백 문구는 **트리거와 같은 함수**가 만든다(검토 URL-1/IA-16/DATA-17).
       * 로딩 중('불러오는 중')·조회 실패('이름 조회 실패')·미해결('알 수 없음')을
       * 구분하지 않으면, 정상 딥링크의 로딩 구간이 '깨진 필터'처럼 보인다(GAP-5).
       */
      const name = resolveFilterValueLabel(
        dbCategories.find((cat) => cat.id === selectedCategory)?.name,
        referenceState.category,
      )
      chips.push({
        key: 'category',
        label: `카테고리 · ${name}`,
        onClear: () => setSelectedCategory(FILTER_ALL),
      })
    }

    if (selectedCountry !== FILTER_ALL) {
      const modern = countries.find(
        (country) => country.id === selectedCountry,
      )
      const historical = !modern
        ? historicalCountries.find((country) => country.id === selectedCountry)
        : undefined
      const name = resolveFilterValueLabel(
        modern?.name ?? historical?.name,
        referenceState.country,
      )
      /**
       * 브리지가 실제로 결과를 넓히고 있으면 칩이 그 사실을 말한다 —
       * '대한민국'만 적어 두면 조선 시대 사건이 왜 나오는지 설명이 없다(검토 DATA-4/IA-3).
       */
      const linkedCount =
        linkedHistoricalIdsByModernId.get(selectedCountry)?.size ?? 0
      chips.push({
        key: 'country',
        label:
          linkedCount > 0
            ? `국가 · ${name}(연결 역사국가 포함)`
            : `국가 · ${name}`,
        onClear: () => setSelectedCountry(FILTER_ALL),
      })
    }

    if (selectedContinent !== FILTER_ALL) {
      const name = resolveFilterValueLabel(
        continents.find((continent) => continent.id === selectedContinent)
          ?.name,
        referenceState.continent,
      )
      chips.push({
        key: 'continent',
        label: `대륙 · ${name}`,
        onClear: () => setSelectedContinent(FILTER_ALL),
      })
    }

    if (selectedCentury !== FILTER_ALL) {
      chips.push({
        key: 'century',
        label: `세기 · ${
          selectedCentury === CENTURY_UNKNOWN
            ? '연도 미상'
            : formatCenturyLabel(selectedCentury)
        }`,
        onClear: () => setSelectedCentury(FILTER_ALL),
      })
    }

    if (trimmedKeyword.length > 0) {
      chips.push({
        key: 'keyword',
        label: `검색어 · ${trimmedKeyword}`,
        onClear: () => setKeyword(''),
      })
    }

    return chips
  }, [
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    trimmedKeyword,
    dbCategories,
    countries,
    historicalCountries,
    continents,
    linkedHistoricalIdsByModernId,
    referenceState,
  ])

  const hasActiveFilters = filterSummaryChips.length > 0

  /**
   * ===== 필터 초기화 — **좁히는 축만** (검토 URL-7) =====
   *
   * 예전엔 여기서 정렬(`sortBy`·`sortDirection`)까지 되돌렸다. 같은 파일의
   * `hasNarrowingFilters`가 "정렬·계층 토글은 '표시 옵션'이라 포함하지 않는다"고
   * 선언해 놓고, 초기화만 그 선언을 어겼다 — 사용자는 '기간순 오름차순'으로 훑던
   * 중에 필터 하나를 풀려다 정렬까지 잃었고, 그 사실은 어디에도 고지되지 않았다.
   *
   * 이 함수의 범위는 `hasNarrowingFilters`의 정의와 **정확히 같다**(북마크·타임라인
   * 축·밴드 접힘은 이 훅 밖의 상태라 페이지의 `handleResetAll`이 잇는다).
   * 새 축을 추가하면 두 곳을 함께 고칠 것.
   */
  const handleResetFilters = () => {
    setSelectedCategory(FILTER_ALL)
    setKeyword('')
    setSelectedCentury(FILTER_ALL)
    setSelectedCountry(FILTER_ALL)
    setSelectedContinent(FILTER_ALL)
  }

  return {
    // 상태
    selectedCategory,
    keyword,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
    selectedContinent,
    showFlatView,

    // 세터
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedContinent,
    setShowFlatView,

    // 계산된 값
    availableCenturies,
    /** 옵션 우측 건수·정렬 키·빈 상태 drop-one-out의 단일 출처(검토 IA-13/IA-12) */
    optionCounts,
    filteredEvents,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,
    /** 평탄화 단계가 자식에도 필터를 적용하도록 노출하는 술어 */
    matchesEvent,
    hasNarrowingFilters,

    // 액션
    handleResetFilters,
  }
}
