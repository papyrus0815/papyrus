/**
 * URL 검색 파라미터 → 카탈로그 상태 (순수 함수)
 *
 * ## 왜 별도 함수인가 (검토 배치 4 · 근인 4)
 *
 * 이 페이지는 14개 파라미터를 URL에 싣는, 사실상 'URL이 상태 저장소'인 화면이다.
 * 그런데 예전엔 **읽는 곳이 둘**이었다 — `useState` lazy initializer(4개만)와
 * `useCatalogUrlSync`의 URL→state effect(전부). 두 경로가 서로 다른 검증을 갖고
 * 있어서 다음이 동시에 성립했다:
 *
 *  - 마운트 첫 커밋에서 state가 URL보다 뒤처져, 상태→URL effect가 **아직 반영되지 않은
 *    기본값으로 URL을 덮어써** 딥링크 필터 5개를 지웠다가 다음 커밋에 복구했다(URL-5).
 *  - `size`·`dir`·`view`만 화이트리스트를 통과하고 `cat`·`country`·`continent`·
 *    `century`·`sort`는 무검증이라 `?century=0`·`?century=5.5`·`?sort=recentlyAdded`가
 *    전부 상태가 됐다(URL-1 · URL-2/DATA-11 · URL-3).
 *
 * 그래서 **파싱과 검증을 이 파일 하나로 모으고**, initializer와 effect가 같은 함수를
 * 쓴다. 새 파라미터를 추가할 때도 여기만 고치면 두 경로가 자동으로 같아진다.
 *
 * ⚠️ 순수 함수 계약 — `searchParams` 외의 입력을 읽지 말 것(하나 예외: `viewMode`는
 * 디바이스 폭에 따른 기본값이 있어 `resolveDefaultViewMode`가 matchMedia를 본다).
 *
 * ⚠️ 값(런타임) import는 배럴(`@/entities/event/model`)이 아니라 `.../model/types`에서
 * 직접 한다 — 배럴은 `useEvents → api.service`를 끌고 오고 그 안의 `import.meta`가
 * ts-jest(CJS) 컴파일을 깨뜨려 이 파일을 쓰는 spec이 통째로 실행 불가가 된다.
 */
import type { CenturyFilter } from '@/entities/event/model'
import { CENTURY_UNKNOWN } from '@/entities/event/model/types'
import {
  FILTER_ALL,
  SORT_OPTIONS,
  type SortOption,
  type ViewMode,
} from '@/features/event-list/lib'
import {
  parseTimelineWindow,
  type TimelineWindow,
} from '@/widgets/event-timeline/model/timeline-model'

import { isExplicitViewMode, resolveDefaultViewMode } from './resolve-default-view-mode'

/** URL에 노출하는 유효 page size — 그 외 값은 기본(100)으로 폴백 */
export const VALID_PAGE_SIZES = [20, 50, 100]
export const DEFAULT_PAGE_SIZE = 100

export const DEFAULT_SORT: SortOption = SORT_OPTIONS.RECENT
export const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc'

/**
 * 세기 축의 허용 범위. 21세기(현재)를 넘는 값과 0세기는 존재하지 않는다 —
 * 역사 연표에 0년이 없으므로 0세기도 없다.
 */
const MAX_CENTURY_MAGNITUDE = 21

/** 정렬 화이트리스트 — 상수 정의에서 파생시켜 옵션이 늘어도 여기가 뒤처지지 않게 한다 */
const VALID_SORT_OPTIONS: string[] = Object.values(SORT_OPTIONS)

export interface CatalogUrlState {
  /** `q` — 항상 trim된 값. 공백만 있는 검색어는 아무 것도 좁히지 않으므로 빈 문자열과 같다 */
  keyword: string
  selectedEventId: string | null
  bookmarksOnly: boolean
  /**
   * `anchors=1` — 최상위(앵커) 사건만. 자손이 하나라도 있는 루트만 남겨 모수를
   * 167 → 20으로 줄인다. 자식 행을 지우는 축이 아니라 **루트 선별 축**이므로,
   * 앵커를 펼치면 하위 사건은 그대로 보인다.
   */
  anchorsOnly: boolean
  /**
   * `anchor=<id>` — 이 사건과 그 자손으로 **모수를 좁힌다**(펼침이 아니라 모수 축소).
   * 앵커 자신이 상위를 가진 사건이어도 이 화면에서는 최상위로 그려진다(isRenderRoot).
   */
  anchorId: string | null
  selectedCategory: string
  selectedCountry: string
  selectedContinent: string
  selectedCentury: CenturyFilter
  pageSize: number
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  showFlatView: boolean
  viewMode: ViewMode
  /**
   * URL이 뷰를 **명시**했는가(검토 URL-12).
   *
   * 예전엔 상태→URL이 `view`를 항상 기록해서, 디바이스가 추론한 기본값(모바일 LIST)이
   * 사용자 선택처럼 링크에 실렸다. 그 링크를 데스크톱에서 열면 타임라인 대신 목록이 뜨고,
   * 반대로 모바일 폴백('타임라인은 터치로 거의 조작 불가')도 무력화된다.
   */
  viewExplicit: boolean
  /**
   * `tlw` — 타임라인 시간 창(`c19`·`c-1`·`d1871`·`u`). 없거나 무효면 전체(null).
   * v3의 레인 축(`lane`)은 v4 재설계에서 폐지 — 구 URL의 `lane`은 무시되고
   * 첫 상태→URL write에서 정리된다.
   */
  timelineWindow: TimelineWindow | null
  /** `hide` — 타임라인에서 숨긴 카테고리 **이름** 집합 */
  hiddenTimelineCategories: Set<string>
}

/** 빈 문자열·공백만 있는 값은 '없음'과 같다 — `?cat=`이 '이름 없는 카테고리' 필터가 되면 결과가 0건이 된다 */
const readNonEmpty = (searchParams: URLSearchParams, key: string): string | null => {
  const raw = searchParams.get(key)
  if (raw === null) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** FILTER_ALL 기본을 갖는 id 축(카테고리·국가·대륙) 공통 파싱 */
const readIdFilter = (searchParams: URLSearchParams, key: string): string =>
  readNonEmpty(searchParams, key) ?? FILTER_ALL

/**
 * 세기 파라미터 검증(검토 URL-2/DATA-11).
 *
 * 예전엔 `Number.isFinite`만 봐서 `0`·`5.5`·`1e2`·`' '`가 전부 통과했다.
 * `Number(' ')`가 0이라 **공백 한 칸이 '0세기 필터'가 되어** 결과가 0건이 됐다.
 * 규칙: `unknown`(연도 미상 sentinel) 또는 부호 있는 정수이고, 0이 아니며, |c| ≤ 21.
 */
export const parseCenturyParam = (raw: string | null): CenturyFilter => {
  if (raw === null) return FILTER_ALL
  const value = raw.trim()
  if (value.length === 0) return FILTER_ALL
  if (value === CENTURY_UNKNOWN) return CENTURY_UNKNOWN
  // 지수·소수·부호 중복·전각 숫자를 문자열 단계에서 걷어낸다(Number()는 전부 통과시킨다).
  if (!/^-?\d+$/.test(value)) return FILTER_ALL
  const century = Number(value)
  if (!Number.isInteger(century)) return FILTER_ALL
  if (century === 0) return FILTER_ALL
  if (Math.abs(century) > MAX_CENTURY_MAGNITUDE) return FILTER_ALL
  return century
}

/** 정렬 파라미터 — `Object.values(SORT_OPTIONS)` 화이트리스트(검토 URL-3) */
export const parseSortParam = (raw: string | null): SortOption => {
  if (raw === null) return DEFAULT_SORT
  const value = raw.trim()
  return VALID_SORT_OPTIONS.includes(value)
    ? (value as SortOption)
    : DEFAULT_SORT
}

/** 페이지 크기 — 화이트리스트 밖이면 기본값 */
export const parsePageSizeParam = (raw: string | null): number => {
  const size = Number(raw)
  return VALID_PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE
}

/**
 * `hide` — 콤마로 구분한 카테고리 **이름** 목록.
 * 빈 토큰은 버려 `hide=`만 남은 URL이 '이름 없는 카테고리 숨김' 필터로 둔갑하지 않게 한다.
 */
export const parseHiddenCategoriesParam = (raw: string | null): Set<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  )

/**
 * 검색 파라미터 전체를 한 번에 해석한다.
 *
 * 검증에 실패한 값은 **조용히 기본값으로 낙하**시킨다. 그 다음 상태→URL 동기화가
 * 기본값인 키를 지우므로 잘못된 파라미터는 첫 커밋에서 URL에서도 사라진다 —
 * 이 함수가 따로 URL을 건드릴 필요가 없다(순수 함수 계약 유지).
 */
export function parseCatalogSearchParams(
  searchParams: URLSearchParams,
): CatalogUrlState {
  const viewParam = searchParams.get('view')
  const directionParam = searchParams.get('dir')

  return {
    keyword: (searchParams.get('q') ?? '').trim(),
    selectedEventId: readNonEmpty(searchParams, 'event'),
    bookmarksOnly: searchParams.get('bookmarks') === '1',
    anchorsOnly: searchParams.get('anchors') === '1',
    anchorId: readNonEmpty(searchParams, 'anchor'),
    selectedCategory: readIdFilter(searchParams, 'cat'),
    selectedCountry: readIdFilter(searchParams, 'country'),
    selectedContinent: readIdFilter(searchParams, 'continent'),
    selectedCentury: parseCenturyParam(searchParams.get('century')),
    pageSize: parsePageSizeParam(searchParams.get('size')),
    sortBy: parseSortParam(searchParams.get('sort')),
    sortDirection:
      directionParam === 'asc' || directionParam === 'desc'
        ? directionParam
        : DEFAULT_SORT_DIRECTION,
    showFlatView: searchParams.get('flat') === '1',
    viewMode: resolveDefaultViewMode(viewParam),
    viewExplicit: isExplicitViewMode(viewParam),
    timelineWindow: parseTimelineWindow(searchParams.get('tlw')),
    hiddenTimelineCategories: parseHiddenCategoriesParam(
      searchParams.get('hide'),
    ),
  }
}
