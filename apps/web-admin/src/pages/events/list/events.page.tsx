/**
 * Events Catalog Page
 * FSD: pages/events/list
 *
 * 조립(composition) 레이어. 비즈니스 로직은 features/entities, UI는 widgets/components,
 * 페이지 전용 훅은 ./hooks/* 에 위임한다.
 */
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import {
  type InfiniteData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { FiAlertTriangle, FiPlus, FiRefreshCw } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { transformEventsFromApi, useEvents } from '@/entities/event/model'
import type { FilterChip } from '@/entities/event/model'
import { getEventById, getEventsCount } from '@/shared/api/events'
import type { EventFetchError, EventResponseDto } from '@/shared/api/events'
import { eventKeys } from '@/pages/events/detail/use-event-detail'
import { useEventFilters } from '@/features/event-filters/model'
import {
  combineReferenceState,
  type FilterReferenceState,
  type ReferenceLoadState,
} from '@/features/event-filters/model/reference-label'
import {
  buildYearBuckets,
  isAnchorEvent,
  isTreeRoot,
  orderRowsForRender,
  selectMatchedRows,
  selectVisibleRows,
  useEventHierarchy,
} from '@/features/event-hierarchy/model'
import {
  FILTER_ALL,
  VIEW_MODES,
  type ViewMode,
} from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { useBookmarks } from '@/shared/hooks/use-bookmarks.hook'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useRecentEvents } from '@/shared/hooks/use-recent-events.hook'
import type { ListDensity } from '@/pages/events/styles/theme'
import { EventCompactList } from '@/widgets/event-list-compact/ui/event-compact-list'
import {
  EventTimeline,
  type TimelineWindow,
} from '@/widgets/event-timeline/ui/event-timeline'
import { describeWindow as describeTimelineWindow } from '@/widgets/event-timeline/model/timeline-model'
import { EventDetailPanel } from '@/widgets/event-list/ui/event-detail-panel'

/**
 * 신규 5개 뷰는 lazy import — 사용자가 그 모드를 한 번도 안 열면 코드 안 받음.
 * 특히 Map은 Leaflet/마커 클러스터 ~150KB.
 *
 * 각 모듈은 named export `Event*View`이므로 default 어댑터로 매핑.
 */
const EventMapView = lazy(() =>
  import('@/widgets/event-map-view/ui/event-map-view').then((m) => ({
    default: m.EventMapView,
  })),
)
const EventGridView = lazy(() =>
  import('@/widgets/event-grid-view/ui/event-grid-view').then((m) => ({
    default: m.EventGridView,
  })),
)
const EventDashboardView = lazy(() =>
  import('@/widgets/event-dashboard-view/ui/event-dashboard-view').then((m) => ({
    default: m.EventDashboardView,
  })),
)
const EventTreeView = lazy(() =>
  import('@/widgets/event-tree-view/ui/event-tree-view').then((m) => ({
    default: m.EventTreeView,
  })),
)
const EventGalleryView = lazy(() =>
  import('@/widgets/event-gallery-view/ui/event-gallery-view').then((m) => ({
    default: m.EventGalleryView,
  })),
)

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../create/events.types'
import * as Layout from '../styles/layout.styles'
import * as PageStyles from '../styles/list-page.styles'

import { CatalogDetailDrawer } from './components/catalog-detail-drawer'
import { CatalogEntityFilterModals } from './components/catalog-entity-filter-modals'
import { CatalogMainContent } from './components/catalog-main-content'
import { CatalogOverlayModals } from './components/catalog-overlay-modals'
import { CatalogToolbar } from './components/catalog-toolbar'
import { useCatalogEventIndex } from './hooks/use-catalog-event-index'
import { EventRegisterModal } from '@/widgets/event-form/ui/event-register-modal'
import type { EventParentPreset } from '@/widgets/event-form/ui/event-register-modal'
import { useEventRegisterModalUrl } from '@/widgets/event-form/model/use-event-register-modal-url'
import { useCatalogModals } from './hooks/use-catalog-modals'
import { useCatalogReferenceData } from './hooks/use-catalog-reference-data'
import {
  useCatalogListNavigation,
  useCatalogShortcuts,
} from './hooks/use-catalog-keyboard'
import { useCatalogUrlSync } from './hooks/use-catalog-url-sync'
import { exportEventsAsJson } from './lib/export-events'
import { parseCatalogSearchParams } from './lib/parse-catalog-search-params'
import {
  type PrunableEvent,
  pruneEventFromPages,
} from './lib/prune-deleted-event'

/** 집중(넓게) 보기 선택 영속 키 — 세션 간 유지. 모듈 스코프(렌더마다 재생성 회피). */
const WIDE_MODE_KEY = 'papyrus.events.wideMode'
/** 목록 밀도 선택 영속 키 — 세션 간 유지. */
const LIST_DENSITY_KEY = 'papyrus.events.listDensity'
const LIST_DENSITIES: ListDensity[] = ['compact', 'cozy', 'roomy']
/**
 * 타임라인 '카테고리 숨김'의 빈 값 — 모듈 스코프 고정 참조.
 * 매번 `new Set()`을 만들면 초기화·재설정이 위젯 memo를 통째로 무효화한다.
 */
const EMPTY_HIDDEN_CATEGORIES: ReadonlySet<string> = new Set<string>()

/**
 * (제거됨) EventsCatalogPageProps — `countryId`·`embed`.
 *
 * 두 prop이 useEvents 인자·쿼리키·헤더 분기·래퍼/FAB 분기까지 6곳에 흩어져 있었지만,
 * 이 컴포넌트를 쓰는 곳은 라우트 하나(`event-route.ts`: `Component: EventsCatalogPage`)뿐이고
 * react-router는 props를 넘기지 않는다 — 즉 **한 번도 실행된 적 없는 분기**였다(검토 CR-7).
 * 특히 embed 분기는 `PageScene`(fixed 높이) 대신 `EmbedWrapper`를 쓰는데 목록의 내부 스크롤이
 * PageScene 높이 체인에 의존하므로, 누군가 그 경로를 되살리면 곧바로 스크롤이 깨진다 —
 * 검증된 적 없는 레이아웃 계약이라 회귀를 사전에 알 수 없었다.
 *
 * ⚠️ 국가 상세는 이 페이지가 아니라 `useEvents`를 직접 호출하는 별도 위젯
 * (`widgets/country/country-detail/.../events-timeline-section.widget.tsx`)을 쓴다.
 * '사건 목록 구현이 둘'이라는 사실은 그대로이므로, 임베드가 다시 필요해지면
 * 죽은 분기를 되살리지 말고 두 구현의 통합부터 결정할 것.
 */
export const EventsCatalogPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  /**
   * ===== URL 시드 — **모든 상태의 초기값은 여기 하나에서 온다**(검토 URL-5) =====
   *
   * 예전엔 12개 파라미터 중 4개(`bookmarks`·`view`·`event`·`q`)만 initializer로 읽고
   * 나머지는 기본값으로 시작해 effect가 뒤늦게 반영했다. 그 결과 마운트 첫 커밋에서
   * 상태→URL effect가 *아직 갱신 전인* 기본값으로 URL을 다시 써 딥링크 필터 5개를
   * 지웠다가 다음 커밋에 복구했다(뒤로가기 히스토리에 그 중간 상태가 남았다).
   *
   * 파싱·검증은 `parseCatalogSearchParams` 하나에 있고, URL→state effect도 같은 함수를
   * 쓴다. 이 스냅샷은 **마운트 시점 고정**이다 — 이후 URL 변화는 effect가 담당한다.
   */
  const [initialUrlState] = useState(() =>
    parseCatalogSearchParams(searchParams),
  )

  // ===== 검색 / 페이지 상태 =====
  const [bookmarksOnly, setBookmarksOnly] = useState(
    initialUrlState.bookmarksOnly,
  )
  /**
   * '최상위(앵커) 사건만' — 자손이 있는 루트만 남긴다(모수 167 → 20).
   * 생존 루트의 88%가 자식 0인 단독 사건이라, 이 축이 없으면 앵커가 파묻힌다
   * (docs/event-root-designation-review.md).
   */
  const [anchorsOnly, setAnchorsOnly] = useState(initialUrlState.anchorsOnly)
  /**
   * 앵커 스코프 — 이 사건과 자손만 본다(`?anchor=<id>`). '한눈에 조망'의 실체.
   * 신규 지면이 아니라 **같은 카탈로그의 모수 축소**다 — 계층 지면이 이미 6개라
   * 일곱 번째를 만드는 것이 곧 근인 4의 악화이기 때문(검토 K2).
   */
  const [anchorId, setAnchorId] = useState<string | null>(
    initialUrlState.anchorId,
  )
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  // 기본 page size 100 — 타임라인 뷰가 한 번에 더 많은 사건을 보여주도록.
  // 사용자는 toolbar의 page size 컨트롤로 변경 가능.
  const [pageSize, setPageSize] = useState(initialUrlState.pageSize)

  // ===== 목록 밀도 =====
  // 세로 픽셀의 소유권을 사용자에게 넘긴다. 행 높이의 60%가 데이터가 아니라 여백과
  // 아이콘인데(45px 중 28px이 액션 버튼), 사용자가 '더 많이 보기'로 쓸 수 있는 레버가
  // '넓게'(세로 79px 회수) 하나뿐이었다.
  //
  // ⚠️ wideMode와 달리 뷰포트로 **자동 추정하지 않는다**. 밀도는 과업 의존적이라
  // (찾을 땐 조밀, 읽을 땐 편안) 사용자 선택이 우선이고, 자동 추정은 "왜 어제와 다르지"를 만든다.
  const [listDensity, setListDensity] = useState<ListDensity>(() => {
    if (typeof window === 'undefined') return 'cozy'
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('density')
      if (fromUrl && LIST_DENSITIES.includes(fromUrl as ListDensity)) {
        return fromUrl as ListDensity
      }
      const saved = window.localStorage.getItem(LIST_DENSITY_KEY)
      if (saved && LIST_DENSITIES.includes(saved as ListDensity)) {
        return saved as ListDensity
      }
    } catch {
      /* storage 비활성 — 기본값으로 */
    }
    return 'cozy'
  })
  const changeListDensity = useCallback((next: ListDensity) => {
    // 밀도 변경은 전 행의 높이를 바꾸므로 보고 있던 위치가 튄다.
    // 변경 **전** 뷰포트 상단에 걸친 첫 행을 기억해 두었다가 다시 그 자리로 돌린다.
    const scroller = document.querySelector('[data-list-scroller]')
    let anchorId: string | null = null
    if (scroller) {
      const top = scroller.getBoundingClientRect().top
      const rows = Array.from(scroller.querySelectorAll('[data-event-id]'))
      const firstVisible = rows.find(
        (row) => row.getBoundingClientRect().bottom > top,
      )
      anchorId = firstVisible?.getAttribute('data-event-id') ?? null
    }
    setListDensity(next)
    try {
      window.localStorage.setItem(LIST_DENSITY_KEY, next)
    } catch {
      /* storage 비활성 — 세션 내 변경만 동작 */
    }
    if (anchorId) {
      // 레이아웃이 새 밀도로 반영된 다음 프레임에 복귀. 높이 transition은 두지 않는다
      // (전 행이 동시에 움직이면 스크롤 앵커가 다시 어긋난다).
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-event-id="${anchorId}"]`)
          ?.scrollIntoView({ block: 'start', behavior: 'instant' })
      })
    }
  }, [])

  // ===== 집중(넓게) 보기 =====
  // 페이지 헤더·뷰 힌트·타임라인 미니맵을 접어 콘텐츠 본문에 세로 공간(~250px)을 양보.
  // 토글 1회로 켜고 끄며 선택은 localStorage에 영속(다음 방문에도 유지).
  const [wideMode, setWideMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = window.localStorage.getItem(WIDE_MODE_KEY)
      if (saved === '1') return true
      if (saved === '0') return false
      // 미설정(최초 방문) — 짧은 뷰포트(노트북류, < 860px)면 자동으로 집중 모드로
      // 시작해 첫 진입 가독성을 확보. 큰 모니터(≥ 860px)는 미니맵을 유지.
      // 사용자가 토글하면 '1'/'0'이 저장돼 이후엔 그 선택이 항상 우선.
      return window.innerHeight < 860
    } catch {
      return false
    }
  })
  const toggleWideMode = useCallback(() => {
    setWideMode((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(WIDE_MODE_KEY, next ? '1' : '0')
      } catch {
        /* storage 비활성 — 세션 내 토글만 동작 */
      }
      return next
    })
  }, [])

  // ===== 북마크 / 최근 본 =====
  const { bookmarks, toggleBookmark, removeBookmark } = useBookmarks()

  /**
   * 북마크 토글에 피드백 + 되돌리기를 붙인다(검토 INT-5).
   *
   * 훅은 Set 갱신과 localStorage 저장이 전부였다. 북마크는 서버에 없고 localStorage에만
   * 있어 다른 화면에 단서가 없는데, 특히 '북마크만' 모드에서는 해제 즉시 그 행이 배열에서
   * 빠져 **무엇을 지웠는지 알 방법이 없이 사라졌다**. 같은 저장소에 표준 notify가 이미 있고
   * 드로어 삭제는 확인·토스트를 모두 쓰므로 규약을 맞춘다.
   */
  const handleToggleBookmark = useCallback(
    (eventId: string) => {
      const wasBookmarked = bookmarks.has(eventId)
      toggleBookmark(eventId)
      notify.action(
        wasBookmarked ? '북마크를 해제했습니다' : '북마크에 추가했습니다',
        { label: '실행 취소', onClick: () => toggleBookmark(eventId) },
        { type: 'info' },
      )
    },
    [bookmarks, toggleBookmark],
  )
  const { recentEvents, addRecentEvent } = useRecentEvents()

  // ===== Entity: 사건 데이터 =====
  // useEvents는 React Query 무한 스크롤로 전환됨(a1b5b6f85).
  const {
    events,
    isLoading,
    isFetchingNextPage,
    isError,
    loadMoreFailed,
    hasMore,
    fetchMoreEvents,
    refetch: refetchEvents,
  } = useEvents({
    pageSize,
    // 정렬·세기 필터·계층 평탄화가 전부 클라이언트 전역이라, 일부 페이지만 로드된 채로
    // 정렬을 바꾸면 로드된 창 안에서만 재정렬된다(안 받은 페이지의 사건은 영영 안 나옴).
    // 특히 1000년 이전 사건은 start_date NULL → 서버 정렬상 맨 뒤로 밀려 마지막 페이지에
    // 몰리므로, 전체 페이지를 자동 소진해 전역 정렬/필터가 완전한 데이터를 보게 한다.
    autoLoadAll: true,
  })

  // ===== 권위 총개수 — 헤더 "전체 N건"이 *로드된 수*가 아닌 진짜 총량을 표시하도록 =====
  // 페이징 응답엔 total이 없어 별도 count 엔드포인트 조회(가벼운 count 쿼리). 실패 시 undefined.
  const { data: serverTotal } = useQuery({
    queryKey: eventKeys.count(),
    queryFn: () => getEventsCount(),
    staleTime: 30_000,
  })

  /**
   * ===== 참조 데이터 (카테고리·국가·대륙) =====
   *
   * 훅이 축별로 `{data, isLoading, isError, isSuccess, refetch}`를 돌려준다(검토 GAP-5).
   * 배열만 쓰던 시절엔 '잘못된 링크'·'아직 안 옴'·'영영 실패'가 화면상 완전히 같았다.
   */
  const reference = useCatalogReferenceData()
  const dbCategories = reference.categories.data
  const countries = reference.countries.data
  const historicalCountries = reference.historicalCountries.data
  const continents = reference.continents.data

  const toLoadState = (channel: {
    isLoading: boolean
    isError: boolean
  }): ReferenceLoadState =>
    channel.isLoading ? 'loading' : channel.isError ? 'error' : 'ready'

  /**
   * 축별 라벨 폴백 상태. 국가 축은 현대·역사 두 소스에서 이름을 찾으므로 둘을 합친다 —
   * 하나라도 로딩 중이면 '아직 모른다'가 정직하다.
   */
  const referenceState = useMemo<FilterReferenceState>(
    () => ({
      category: toLoadState(reference.categories),
      country: combineReferenceState(
        toLoadState(reference.countries),
        toLoadState(reference.historicalCountries),
      ),
      continent: toLoadState(reference.continents),
    }),
    // 원시 플래그만 보면 충분 — 채널 객체는 매 렌더 새로 만들어진다.
    [
      reference.categories.isLoading,
      reference.categories.isError,
      reference.countries.isLoading,
      reference.countries.isError,
      reference.historicalCountries.isLoading,
      reference.historicalCountries.isError,
      reference.continents.isLoading,
      reference.continents.isError,
    ],
  )

  const handleRetryReference = useCallback(
    (axis: keyof FilterReferenceState) => {
      if (axis === 'category') reference.categories.refetch()
      else if (axis === 'continent') reference.continents.refetch()
      else {
        // 국가 축은 두 소스를 함께 쓴다 — 실패한 쪽만 다시 부른다.
        if (reference.countries.isError) reference.countries.refetch()
        if (reference.historicalCountries.isError)
          reference.historicalCountries.refetch()
      }
    },
    [reference],
  )

  // ===== Feature: 필터 =====
  const {
    selectedCategory,
    sortBy,
    sortDirection,
    selectedCentury,
    selectedCountry,
    selectedContinent,
    showFlatView,
    setSelectedCategory,
    setKeyword,
    setSortBy,
    setSortDirection,
    setSelectedCentury,
    setSelectedCountry,
    setSelectedContinent,
    setShowFlatView,
    availableCenturies,
    optionCounts,
    sortedEvents,
    filterSummaryChips,
    hasActiveFilters,
    matchesEvent,
    hasNarrowingFilters,
    handleResetFilters,
  } = useEventFilters(
    events,
    dbCategories,
    countries,
    historicalCountries,
    continents,
    {
      // 북마크는 사후 filter가 아니라 **다른 축과 같은 술어 레인**에 있다(검토 IA-7/DATA-10).
      bookmarksOnly,
      // 앵커 축은 반대로 **루트 선별 단계 전용**이다 — 술어에 넣으면 앵커를 펼쳤을 때
      // 자손이 0인 자식 행이 전부 사라진다(useEventFilters의 anchorsOnly 주석 참고).
      anchorsOnly,
      scopeAnchorId: anchorId,
      bookmarks,
      // 필터 7축의 초기값도 URL에서 온다 — 첫 커밋부터 state === URL(검토 URL-5).
      initial: {
        selectedCategory: initialUrlState.selectedCategory,
        selectedCountry: initialUrlState.selectedCountry,
        selectedContinent: initialUrlState.selectedContinent,
        selectedCentury: initialUrlState.selectedCentury,
        keyword: initialUrlState.keyword,
        sortBy: initialUrlState.sortBy,
        sortDirection: initialUrlState.sortDirection,
        showFlatView: initialUrlState.showFlatView,
      },
      // 칩 라벨의 폴백 문구를 원인별로 가른다(검토 GAP-5).
      referenceState,
    },
  )

  // ===== Feature: 계층 / 직책 =====
  const {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    collapseAllChildren,
    expandAllChildren,
    flattenedHierarchy,
    // 훅의 matchedCount는 쓰지 않는다 — 아래에서 `matchedOnlyHierarchy.length`로
    // 같은 값을 얻고, 그 배열을 뷰·내보내기가 그대로 공유한다(모수 규약 ① 단일 출처).
  } = useEventHierarchy(
    sortedEvents,
    events,
    showFlatView,
    sortBy,
    sortDirection,
    // 자식에도 같은 필터를 적용 — 매칭된 부모 밑에 조건 밖 자식이 섞이던 문제 수정
    { matchesEvent, hasNarrowingFilters },
  )

  // ===== UI 상태 =====
  // 디폴트 viewMode 결정: URL 우선 → 모바일이면 LIST → 데스크톱이면 TIMELINE.
  // 타임라인은 가로 panning이 Space+드래그·Ctrl+휠뿐이라 터치 디바이스에서 사실상 비-인터랙티브 →
  // 첫 진입을 LIST로 두고, 사용자가 명시적으로 타임라인을 선택하면 그 선택은 URL로 보존됨.
  // useCatalogUrlSync도 동일 디폴트를 사용해야 첫 마운트 직후 force-overwrite를 피함.
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrlState.viewMode)
  /**
   * 사용자가 뷰를 **직접 골랐는가**(검토 URL-12).
   *
   * 예전엔 상태→URL이 `view`를 항상 기록했다. 그래서 모바일에서 만든 링크에는
   * 디바이스가 추론한 `view=list`가 사용자 선택처럼 실렸고, 데스크톱에서 열면
   * 타임라인 대신 목록이 떴다. 반대로 데스크톱 링크의 `view=timeline`은 모바일의
   * 'LIST 폴백'(타임라인은 터치로 사실상 조작 불가)을 무력화했다.
   * URL에 유효한 view가 있었거나 사용자가 스위처를 눌렀을 때만 true다.
   */
  const [viewExplicit, setViewExplicit] = useState(initialUrlState.viewExplicit)
  /**
   * 뷰 전환(시간↔카테고리↔타임라인 등)은 전체 pivot을 같은 events로 다시 그리는
   * *무거운 동기 재렌더*다(특히 가상화 안 된 뷰). 사용자 클릭은 startTransition으로
   * 비긴급 처리해 전환 중에도 버튼/UI가 멈추지 않게 한다. URL→state 동기화 경로는
   * 그대로 raw setViewMode를 사용한다.
   */
  const [, startViewTransition] = useTransition()
  const changeViewMode = useCallback((next: ViewMode) => {
    // 사용자의 명시적 선택 — 이때부터 URL이 view를 싣는다.
    setViewExplicit(true)
    startViewTransition(() => setViewMode(next))
  }, [])

  /**
   * ===== 타임라인 전용 축 — **페이지가 소유한다**(검토 GAP-4) =====
   *
   * 카테고리 숨김(`hide`)과 시간 창(`tlw`)은 위젯 지역 state로 두면 URL에도
   * 활성 칩에도 '전체 초기화'에도 없는 두 번째 상태 체계가 된다 — 카테고리 3개를
   * 숨겨 둔 채 하루 뒤에 돌아온 사용자에게는 그냥 "사건이 없는 화면"이고, 공유한
   * 링크는 상대에게 다른 화면을 보여준다. 상태를 여기로 올려 다른 축과 같은 규약을
   * 받게 한다. (v3의 레인 축 `lane`은 v4 재설계에서 레인 자체가 사라져 폐지 —
   * docs/event-timeline-redesign.md)
   *
   * ⚠️ 숨김 키는 **카테고리 이름**이다(타임라인이 `point.category` 문자열로 거른다).
   * id로 바꿔 페이지 카테고리 필터와 합치는 중기안은 다중 선택(보류 IA-10)에 종속되므로
   * 여기서는 하지 않는다.
   */
  const [timelineWindow, setTimelineWindow] = useState<TimelineWindow | null>(
    initialUrlState.timelineWindow,
  )
  const [hiddenTimelineCategories, setHiddenTimelineCategories] = useState<
    ReadonlySet<string>
  >(() =>
    // 빈 집합은 모듈 스코프 고정 참조를 재사용한다(위젯 memo 무효화 방지).
    initialUrlState.hiddenTimelineCategories.size > 0
      ? initialUrlState.hiddenTimelineCategories
      : EMPTY_HIDDEN_CATEGORIES,
  )
  const toggleHiddenTimelineCategory = useCallback((categoryKey: string) => {
    setHiddenTimelineCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryKey)) next.delete(categoryKey)
      else next.add(categoryKey)
      return next
    })
  }, [])
  const showAllTimelineCategories = useCallback(
    () => setHiddenTimelineCategories(EMPTY_HIDDEN_CATEGORIES),
    [],
  )
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialUrlState.selectedEventId,
  )
  /**
   * 직전 선택 id — 상세를 닫을 때 그 행으로 포커스를 되돌리기 위한 참조.
   * clearSelectedEvent를 안정 참조(deps 없음)로 유지하려고 ref를 쓴다.
   */
  const selectedEventIdRef = useRef<string | null>(selectedEventId)
  useEffect(() => {
    selectedEventIdRef.current = selectedEventId
  }, [selectedEventId])

  /** 키워드 디바운스 — 입력 자체는 즉시 반영(체감)하되 useEventFilters에 흘려보내는 값만 250ms로 묶음.
   * `isSearchPending`은 디바운스 idle 구간을 toolbar의 spinner로 노출 (UX: 적용됐는지 인지) */
  const [keywordInput, setKeywordInput] = useState(initialUrlState.keyword)
  const debouncedKeyword = useDebouncedValue(keywordInput, 250)
  const isSearchPending = debouncedKeyword !== keywordInput
  useEffect(() => {
    setKeyword(debouncedKeyword)
    // setKeyword는 useEventFilters 내부의 setter — 안정적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword])

  /**
   * 사건 등록 모달 — 이 페이지가 소유한다(useCatalogModals는 anyOverlayOpen에만 반영).
   * 열림은 `?eventForm=new`로 URL에 동기화 → 뒤로가기로 닫히고 새로고침에도 복원된다.
   */
  const {
    isOpen: createModalOpen,
    open: openCreateModal,
    close: closeCreateModal,
    onDirtyChange: onCreateFormDirtyChange,
  } = useEventRegisterModalUrl()

  /**
   * 트리 노드 '+ 하위 사건'이 채우는 상위 사건 프리셋 — **같은 등록 모달 인스턴스**를
   * initialParent만 다르게 연다(새 모달 표면 금지). 닫힘은 URL(뒤로가기)로도 오므로
   * onClose 훅킹이 아니라 열림 상태의 **열림→닫힘 전이**를 보고 클리어한다 — 프리셋이
   * 남으면 다음 일반 등록('새 사건' 버튼)까지 상위가 미리 채워진 채 열린다.
   * ⚠️ '닫혀 있으면 클리어'로 쓰면 안 된다: open()의 URL 반영이 transition 렌더로
   * 늦게 오면, 프리셋만 먼저 설정된 렌더에서 즉시 지워져 기능이 통째로 죽는다.
   */
  const [createParentPreset, setCreateParentPreset] =
    useState<EventParentPreset | null>(null)
  const handleCreateChildEvent = useCallback(
    (parent: EventParentPreset) => {
      setCreateParentPreset(parent)
      openCreateModal()
    },
    [openCreateModal],
  )
  const wasCreateModalOpenRef = useRef(false)
  useEffect(() => {
    if (wasCreateModalOpenRef.current && !createModalOpen) {
      setCreateParentPreset(null)
    }
    wasCreateModalOpenRef.current = createModalOpen
  }, [createModalOpen])

  // ===== 모달 상태 묶음 (스크롤 잠금 effect 포함) =====
  const {
    shortcutHelpOpen,
    setShortcutHelpOpen,
    closeShortcutHelp,
    openShortcutHelp,
    showCategoryModal,
    setShowCategoryModal,
    showCountryModal,
    setShowCountryModal,
    showSummaryModal,
    setShowSummaryModal,
    summaryEventId,
    openSummary,
    anyOverlayOpen,
    closeTopOverlay,
  } = useCatalogModals(createModalOpen)

  // ===== 사건 선택 시 최근 본 목록에 추가 =====
  useEffect(() => {
    if (selectedEventId) {
      addRecentEvent(selectedEventId)
    }
  }, [selectedEventId, addRecentEvent])

  // ===== id 기반 lookup map =====
  const { eventByIdMap, nodeIndexMap } = useCatalogEventIndex(events)

  /**
   * ===== lazy 사건 레지스트리 =====
   *
   * 목록 API는 루트만 페이징하므로 TREE 뷰 LazyBranch(GET /events/parent/:id)로
   * 불러온 손자 이하 사건은 eventByIdMap·nodeIndexMap에 없다. 레지스트리가 없으면
   * 그 행 클릭이 미발견 판정('사건을 찾을 수 없습니다')으로 오발동하고 선택까지
   * 해제된다. 트리 위젯이 byParent 응답을 올려보내면 **기존 목록과 같은 어댑터**
   * (transformEventsFromApi)로 변환해 id 기준 dedupe 병합한다 — 같은 데이터로
   * 다시 불려도 같은 키를 덮어쓸 뿐이라 무해하다.
   */
  const [lazyEventById, setLazyEventById] = useState<
    ReadonlyMap<string, HistoricalEvent>
  >(new Map())
  const handleLazyEventsLoaded = useCallback(
    (loadedEvents: EventResponseDto[]) => {
      if (loadedEvents.length === 0) return
      const transformed = transformEventsFromApi(
        loadedEvents as Parameters<typeof transformEventsFromApi>[0],
      )
      setLazyEventById((prev) => {
        const next = new Map(prev)
        for (const event of transformed) next.set(event.id, event)
        return next
      })
    },
    [],
  )

  // ===== URL ↔ 상태 동기화 =====
  useCatalogUrlSync({
    searchParams,
    setSearchParams,
    keywordInput,
    // URL에 실리는 검색어는 **디바운스를 통과한 값**이다(검토 PERF-11) — 키 입력마다
    // setSearchParams가 도는 것을 막고, `q`가 실제 적용된 검색어와 어긋나지 않게 한다.
    debouncedKeyword,
    selectedEventId,
    bookmarksOnly,
    anchorsOnly,
    anchorId,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
    viewExplicit,
    pageSize,
    timelineWindow,
    hiddenTimelineCategories,
    setKeywordInput,
    setSelectedEventId,
    setBookmarksOnly,
    setAnchorsOnly,
    setAnchorId,
    setSelectedCategory,
    setSelectedCountry,
    setSelectedContinent,
    setSelectedCentury,
    setSortBy,
    setSortDirection,
    setShowFlatView,
    setViewMode,
    setViewExplicit,
    setPageSize,
    setTimelineWindow,
    setHiddenTimelineCategories,
  })

  /**
   * ===== 미해결 참조 id 낙하 (검토 URL-1/IA-16/DATA-17) =====
   *
   * `?country=<삭제된 id>`는 지금까지 그대로 상태가 됐다. 트리거 라벨은 '국가'(= 필터
   * 없음과 같은 문자열)로 되돌아가고 결과는 0건이라, 사용자에게는 "필터를 안 걸었는데
   * 아무 것도 없는 화면"이었다. 이제 폴백 문구가 원인을 밝히고(위 referenceState),
   * 참조 로드가 **성공으로 끝난 뒤에도** 못 찾은 id는 조용히 남기지 않고 해제한다.
   *
   * ⚠️ 게이트는 반드시 `isSuccess`다. 로딩 중(빈 배열)에 돌면 정상 필터를 지운다.
   * 실패(`isError`)일 때도 지우지 않는다 — 그건 '없는 id'가 아니라 '모르는 상태'다.
   */
  useEffect(() => {
    if (
      reference.categories.isSuccess &&
      selectedCategory !== FILTER_ALL &&
      !dbCategories.some((category) => category.id === selectedCategory)
    ) {
      setSelectedCategory(FILTER_ALL)
      notify.warning('링크의 카테고리 필터를 찾을 수 없어 해제했습니다')
    }
  }, [
    reference.categories.isSuccess,
    dbCategories,
    selectedCategory,
    setSelectedCategory,
  ])

  useEffect(() => {
    // 국가는 현대·역사 두 목록 **모두** 도착한 뒤에 판정해야 한다(한쪽만 보고 지우면 오판).
    if (
      reference.countries.isSuccess &&
      reference.historicalCountries.isSuccess &&
      selectedCountry !== FILTER_ALL &&
      !countries.some((country) => country.id === selectedCountry) &&
      !historicalCountries.some((country) => country.id === selectedCountry)
    ) {
      setSelectedCountry(FILTER_ALL)
      notify.warning('링크의 국가 필터를 찾을 수 없어 해제했습니다')
    }
  }, [
    reference.countries.isSuccess,
    reference.historicalCountries.isSuccess,
    countries,
    historicalCountries,
    selectedCountry,
    setSelectedCountry,
  ])

  useEffect(() => {
    if (
      reference.continents.isSuccess &&
      selectedContinent !== FILTER_ALL &&
      !continents.some((continent) => continent.id === selectedContinent)
    ) {
      setSelectedContinent(FILTER_ALL)
      notify.warning('링크의 대륙 필터를 찾을 수 없어 해제했습니다')
    }
  }, [
    reference.continents.isSuccess,
    continents,
    selectedContinent,
    setSelectedContinent,
  ])

  /**
   * ===== `?event=<삭제된 id>` — 미발견 상태 (검토 URL-4) =====
   *
   * 예전엔 이 링크가 '사건 상세' 랜드마크를 점유한 채 '사건을 선택해주세요'를 띄웠고,
   * 그 분기에는 **닫기 어포던스가 하나도 없었다** — 데스크톱(≥1200px)은 백드롭도 없어
   * Esc 말고는 탈출로가 없다. 게다가 새로고침하면 같은 상태가 그대로 돌아왔다.
   *
   * 판정은 **자동 로드가 소진된 뒤에만** 한다(`autoLoadAll`이 페이지를 순차 소진하는
   * 동안에는 아직 안 온 것뿐일 수 있다). 확정되면 선택 state를 비워 URL `event` 키를
   * 떨어뜨리고, 패널은 `missingEventId`로 전용 상태를 렌더한다.
   */
  const [missingEventId, setMissingEventId] = useState<string | null>(null)
  /**
   * 사건 로드가 **정상적으로 끝났는가**. 실패(`isError`·`loadMoreFailed`)는 '없다'가
   * 아니라 '모른다'이므로 미발견으로 단정하지 않는다 — 재시도로 나타날 수 있다.
   */
  const eventsSettled =
    !isLoading &&
    !isFetchingNextPage &&
    !hasMore &&
    !isError &&
    !loadMoreFailed
  /**
   * 딥링크/새로고침 복원 — lazy 레지스트리는 세션 state라 리로드 후 비어 있다.
   * TREE에서 lazy 사건을 선택한 URL(?event=)을 새로고침·공유하면 목록 인덱스
   * 어디에도 없는 id가 들어오는데, 이를 곧장 미발견으로 확정하면 실재하는 사건이
   * '찾을 수 없습니다'로 둔갑하고 URL 키까지 떨어진다. 확정 전에 단건 조회로
   * 1회 확인하고, 성공하면 레지스트리에 등록해 기존 폴백 경로로 살린다.
   * 404만 '없음'으로 확정 — 그 외 실패는 '모른다'이므로 단정하지 않는다
   * (eventsSettled가 로드 실패를 미발견으로 안 치는 것과 같은 규약).
   */
  const lazyResolveTriedRef = useRef<Set<string>>(new Set())
  const lazyResolvePendingRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!selectedEventId) return
    // 새 선택이 들어오면 직전 미발견 상태는 즉시 걷는다 — 안 그러면 멀쩡한 사건을
    // 골랐는데 '찾을 수 없습니다'가 계속 덮고 있게 된다.
    if (missingEventId) setMissingEventId(null)
    if (!eventsSettled) return
    // lazy 레지스트리도 존재 근거다 — 트리에서 서버로 불러온 손자 이하는
    // 목록 인덱스에 없어도 실재하는 사건이다(미발견 오발동 방지).
    if (
      eventByIdMap.has(selectedEventId) ||
      nodeIndexMap.has(selectedEventId) ||
      lazyEventById.has(selectedEventId)
    ) {
      return
    }
    // 단건 확인이 진행 중이면 판정을 미룬다 — 여기서 확정하면 확인이 무의미해진다.
    if (lazyResolvePendingRef.current.has(selectedEventId)) return
    if (!lazyResolveTriedRef.current.has(selectedEventId)) {
      lazyResolveTriedRef.current.add(selectedEventId)
      lazyResolvePendingRef.current.add(selectedEventId)
      const requestedId = selectedEventId
      getEventById(requestedId)
        .then((dto) => {
          handleLazyEventsLoaded([dto])
        })
        .catch((error: EventFetchError) => {
          if (error.status !== 404) {
            // 일시 실패는 '없음'이 아니다 — 다음 판정 기회에 다시 확인한다.
            lazyResolveTriedRef.current.delete(requestedId)
            return
          }
          // 확인 중 선택이 바뀌었으면 낡은 결과로 현재 선택을 지우지 않는다.
          if (selectedEventIdRef.current !== requestedId) return
          setMissingEventId(requestedId)
          setSelectedEventId(null)
        })
        .finally(() => {
          lazyResolvePendingRef.current.delete(requestedId)
        })
      return
    }
    setMissingEventId(selectedEventId)
    setSelectedEventId(null)
  }, [
    selectedEventId,
    missingEventId,
    eventsSettled,
    eventByIdMap,
    nodeIndexMap,
    lazyEventById,
    handleLazyEventsLoaded,
  ])
  /** 미발견 전용 상태를 실제로 보여줄 것인가 — 선택이 다시 생겼으면 아니다 */
  const showMissingEvent = Boolean(missingEventId) && !selectedEventId

  // ===== 페이지네이션 핸들러 =====
  // pageSize state 변경만으로 react-query queryKey가 바뀌어 새 페이지로 자동 fetch됨
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
  }, [])

  /**
   * ════════ 모수 규약 (검토 배치 3) ════════
   *
   * 파이프라인은 네 단계다.
   *   ① 5축 술어(matchesEvent) → 평탄화가 계보 인지로 적용
   *   ② (없음 — 북마크는 ①에 합류했다)
   *   ③ 계층 접힘(isCollapsedAway)
   *   ④ 연·세기 밴드 접힘(selectVisibleRows)
   *
   * > `matchedCount`는 **①술어 직후**를 센다. `displayedCount`는 **④밴드 접힘 이후**를
   * > 센다. 그 사이 단계(②·③)는 **어느 카운트에도 영향을 주지 않는다.**
   * > 내보내기·6개 뷰는 ①의 `isMatch`를 존중한다.
   *
   * 두 숫자는 서로 다른 질문에 답한다 — 전자는 "조건에 맞는 사건이 몇 건인가",
   * 후자는 "지금 화면에 몇 행이 있는가". 예전엔 전자가 ③ 이후를 세어
   * 데이터도 조건도 그대로인데 '하위 접기'만으로 233 → 146으로 떨어졌다(검토 DATA-6).
   * ════════════════════════════════════════
   */

  /**
   * 필터를 통과한 **완전한 모집단**(접힘 무관) = 단계 ① 직후.
   *
   * 예전엔 여기서 북마크를 행 단위로 한 번 더 걸렀다. 그 사후 filter가
   * ⑴ 접기와 곱해져 '북마크한 자식은 접혀 있는데 펼칠 부모 행이 없는' 복구 불가 상태와
   * ⑵ 부모 없이 depth만 남은 고아 행을 만들었다(검토 IA-7/DATA-10).
   * 이제 북마크는 `matchesEvent`가 다른 축과 함께 판정하므로 이 지점에 단계가 없다.
   *
   * 이 배열은 목록·트리·JSON 내보내기가 공유한다 — 목록의 접기 조작이 다른 화면의
   * 데이터를 지우지 않으려면 모집단은 완전해야 한다(검토 CR-1).
   */
  const visibleFlattenedHierarchy = flattenedHierarchy

  /**
   * **①의 `isMatch`만 남긴 배열** — 집계·시각화 뷰가 받는 모집단(검토 GAP-1).
   *
   * 평탄화는 '매칭된 자손을 가진 부모'를 문맥 행으로 남긴다. 목록은 그 행을 흐리게
   * 강등해 구분하지만, 타임라인·지도·격자·통계·갤러리는 `isMatch`를 아예 읽지 않고
   * 데이터로 집계했다 — '전쟁'으로 좁힌 통계 뷰에 정치 막대가 그려졌다.
   *
   * ⚠️ 접힘으로 빼는 것과 **필터 불일치로 빼는 것은 다른 축**이다. CR-1이 지키려던
   * 계약(접기가 다른 화면의 데이터를 지우면 안 된다)은 그대로다 — 여기서 빠지는 것은
   * 접힌 행이 아니라 '조건을 만족하지 않는 행'이고, 필터를 풀면 즉시 돌아온다.
   * 트리 뷰만 예외로 완전한 배열을 받는다(구조 뷰라 문맥 부모를 빼면 매칭된 자식이
   * 통째로 사라진다 — 그 위젯이 자체적으로 강등·가지치기를 한다).
   *
   * ⚠️ 단순 `filter(isMatch)`가 아니라 `selectMatchedRows`를 쓴다 — 문맥 부모를 걷어내면
   * 남은 자식의 `depth`가 거짓이 되고, 이 뷰들은 전부 `depth !== 0`이면 건너뛰므로
   * '자식만 매칭'인 검색에서 화면이 통째로 비었다(그 함수 주석 참고).
   */
  const matchedOnlyHierarchy = useMemo(
    () =>
      hasNarrowingFilters
        ? selectMatchedRows(visibleFlattenedHierarchy, {
            flatView: showFlatView,
          })
        : visibleFlattenedHierarchy,
    [visibleFlattenedHierarchy, hasNarrowingFilters, showFlatView],
  )

  /**
   * **목록이 실제로 그리는 행**만 남긴 배열 — 접힌 조상 아래 행을 뺀다.
   * 목록 렌더·표시 카운트·드로어 이전/다음은 이 걸러진 배열을 쓴다.
   */
  const listRenderedHierarchy = useMemo(
    () => visibleFlattenedHierarchy.filter((item) => !item.isCollapsedAway),
    [visibleFlattenedHierarchy],
  )

  /**
   * 하위 사건이 지금 접혀 있는가 — **파생 추론이 아니라 실측**이다(검토 CTRL-8).
   *
   * 예전엔 툴바가 `expandedEventIds.size === 0`으로 판정했다. 그 집합은
   * ⑴ 첫 페이지가 도착하기 전에도 ⑵ 자식 보유 사건이 0건인 결과에서도 비어 있어,
   * 접을 것이 없는데도 버튼이 '하위 펼치기 · 눌림'으로 그려졌다가 목록이 채워지면
   * 뒤집혔다. 두 배열의 길이 차이는 '접혀서 화면에서 빠진 행이 실제로 있다'는
   * 관측값이고, 같은 식을 '전체 초기화'의 토스트 판정(:1254-1256)이 이미 쓰고 있다.
   */
  const childrenCollapsed =
    visibleFlattenedHierarchy.length !== listRenderedHierarchy.length
  const hasCollapsibleChildren = useMemo(
    () => visibleFlattenedHierarchy.some((item) => item.canExpand),
    [visibleFlattenedHierarchy],
  )

  /**
   * 헤더 '조건 일치 N건'의 모수 — **단계 ①(술어) 직후**(검토 DATA-6).
   *
   * `matchedOnlyHierarchy`는 필터가 없으면 원본과 같은 배열이므로 이 값은
   * "조건을 만족한 사건 수"를 정확히 말한다. 접기(③·④)는 이 숫자를 건드리지 않는다 —
   * 화면 행 수는 `displayedCount`(navigableItems.length)가 따로 말한다.
   */
  const matchedCount = matchedOnlyHierarchy.length

  /**
   * 세기·연도 밴드 접힘 — **페이지가 소유한다**.
   *
   * 예전엔 EventCompactList의 로컬 state였다. 그래서 ⑴ 뷰를 잠깐 바꿨다 돌아오면 위젯이
   * 언마운트돼 접기 작업이 통째로 사라졌고(이 페이지의 다른 상태는 URL·localStorage·
   * 페이지 훅에 전부 보존되는데 접힘만 예외였다), ⑵ 드로어의 이전/다음은 접힘을 몰라
   * 화면에 없는 사건으로 이동했다(검토 INT-4/INT-6).
   */
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(
    () => new Set(),
  )
  const [collapsedCenturies, setCollapsedCenturies] = useState<Set<number>>(
    () => new Set(),
  )
  const toggleYearCollapse = useCallback((year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }, [])
  const toggleCenturyCollapse = useCallback((century: number) => {
    setCollapsedCenturies((prev) => {
      const next = new Set(prev)
      if (next.has(century)) next.delete(century)
      else next.add(century)
      return next
    })
  }, [])

  /**
   * 목록이 세기›연도 그룹으로 묶이는가 — **페이지의 단일 변수**(검토 GAP-2).
   *
   * 이 값은 두 곳이 읽는다. ⑴ `EventCompactList`의 `grouped` prop(렌더)과
   * ⑵ 아래 `navigableItems`의 밴드 접힘 적용 여부(내비 모수)다. 예전엔 ⑴만 있고
   * ⑵는 `viewMode === LIST`만 봐서, '등록순' 정렬로 그룹이 꺼지면 위젯은 접힘을
   * 무시하고 전량 렌더하는데 페이지는 접힘을 계속 적용했다 — 화면에 보이는 행을
   * ↓키·드로어 '다음'이 건너뛰고, 그 행을 클릭하면 '조건 밖' 배너가 떴다.
   * (연/세기를 접어 둔 상태에서만 발현한다 — 접힘 집합이 비면 selectVisibleRows가
   *  원본을 그대로 돌려주기 때문이다.)
   *
   * ⚠️ 새 분기를 추가할 땐 반드시 이 변수를 읽을 것. 두 곳이 각자 판정하는 순간
   * 같은 회귀가 재발한다.
   */
  const listGrouped =
    viewMode === VIEW_MODES.LIST &&
    // '등록순'은 전역 순서 자체가 목적이라 연도 그룹이 켜져 있으면 화면이 전혀 안 바뀐다.
    sortBy !== 'created' &&
    // '하위 많은 순'도 마찬가지다 — 연도 그룹이 켜지면 정렬이 그룹 **내부**로 갇혀,
    // 자손 18건짜리 앵커가 1914년 밴드 안에서만 위로 가고 목록 전체에서는 그대로
    // 파묻힌다. 이 축의 목적 자체가 전역 순서이므로 그룹을 끈다.
    sortBy !== 'descendants'

  /**
   * 목록 그룹핑 — **이 페이지가 유일한 계산 지점**이다(검토 PERF-4).
   *
   * 결과는 `EventCompactList`에 `yearBuckets` prop으로 그대로 내려간다. 예전엔 위젯도
   * 같은 함수를 자기 입력으로 한 번 더 불렀고, 세 인자(행 배열·정렬 방향·`filteringActive`)를
   * 손으로 맞춰야 두 판정이 일치하는 구조였다 — 하나만 어긋나도 페이지의 navigableItems와
   * DOM 행이 다른 집합이 된다(검토 DATA-9). 이제 같은 객체를 공유하므로 어긋날 수 없다.
   */
  const yearBuckets = useMemo(
    () =>
      buildYearBuckets(listRenderedHierarchy, sortDirection, hasNarrowingFilters, {
        // 평면 보기에는 계층이 없다 — 부모 귀속을 끄지 않으면 정렬 방향 토글 한 번에
        // 67행이 다른 밴드로 옮겨 간다(검토 IDX-8).
        hierarchy: !showFlatView,
        // 헤더리스·공백 판정의 모수는 **하위 접힘 이전**이어야 한다(검토 IDX-6·IDX-9).
        baselineItems: visibleFlattenedHierarchy,
      }),
    [
      listRenderedHierarchy,
      visibleFlattenedHierarchy,
      sortDirection,
      hasNarrowingFilters,
      showFlatView,
    ],
  )

  /**
   * 화면에 실제로 렌더되는 행 — 목록에서는 계층 접힘 + 세기/연도 밴드 접힘을 모두 반영(단계 ④).
   * ↑↓ 키(DOM 렌더 행 기준)와 드로어 이전/다음, '조건 밖' 배너가 이 하나의 집합을 공유한다.
   *
   * 목록이 아닌 뷰에서는 **그 뷰에 넘긴 배열 그대로**여야 한다 — 아니면 화면에 보이는
   * 막대·카드를 클릭했는데 '조건 밖'이라고 하거나, 드로어 '다음'이 화면에 없는 사건으로
   * 건너뛴다(GAP-2와 같은 계열의 어긋남).
   */
  const activeViewItems =
    viewMode === VIEW_MODES.TREE
      ? // 트리만 문맥 부모를 포함한 완전한 배열을 렌더한다(위 GAP-1 주석 참고).
        visibleFlattenedHierarchy
      : matchedOnlyHierarchy
  const navigableItems = useMemo(
    () => {
      if (viewMode !== VIEW_MODES.LIST) return activeViewItems
      return listGrouped
        ? selectVisibleRows(
            /**
             * ⚠️ 그룹 목록의 DOM 순서는 배열 순서가 아니라 **연도 버킷 순서**다.
             * 드로어 '이전/다음'은 이 배열의 인덱스로 움직이므로, 재배열하지 않으면
             * ↑↓(DOM 순서)와 서로 다른 방향으로 이동한다. 필터 중 매칭 행이 자기 연도로
             * 옮겨 가면서(DATA-9) 두 순서가 실제로 갈리기 시작했다.
             */
            orderRowsForRender(listRenderedHierarchy, yearBuckets),
            yearBuckets,
            collapsedYears,
            collapsedCenturies,
          )
        : listRenderedHierarchy
    },
    [
      viewMode,
      activeViewItems,
      listGrouped,
      listRenderedHierarchy,
      yearBuckets,
      collapsedYears,
      collapsedCenturies,
    ],
  )

  /**
   * 목록의 **유일한 탭 정지점** — 위젯이 아니라 여기서 판정한다(검토 A11Y-1·A11Y-6).
   *
   * 후보 집합은 `navigableItems`, 즉 ↑↓·드로어 이전/다음과 **완전히 같은 집합**이다.
   * 위젯이 자체 판정하던 시절엔 그쪽이 계층 접힘만 아는 배열을 봐서, 행을 고른 뒤 그
   * 행이 든 밴드를 접으면 정지점이 0개가 됐다(Tab으로 목록 진입 자체가 불가).
   *
   * 선택 행이 접힘으로 사라졌을 때 **첫 행으로 되돌리지 않고 가장 가까운 조상**으로
   * 물러난다 — 1914년 자식 행을 보다 '하위 접기'를 누르면 진입점이 목록 맨 위로
   * 순간이동해, 보던 자리로 돌아가는 데 ↓를 70번 눌러야 했다(그때마다 드로어가 바뀐다).
   */
  const rovingTargetId = useMemo(() => {
    if (navigableItems.length === 0) return null
    const navigable = new Set(navigableItems.map((item) => item.node.id))
    if (selectedEventId && navigable.has(selectedEventId)) return selectedEventId
    if (selectedEventId) {
      const parentById = new Map(
        visibleFlattenedHierarchy.map((item) => [
          item.node.id,
          item.parentNodeId,
        ]),
      )
      let cursor = parentById.get(selectedEventId) ?? null
      // 계보는 유한하지만, 데이터가 순환이면 무한 루프가 되므로 방문 집합으로 막는다.
      const seen = new Set<string>()
      while (cursor && !seen.has(cursor)) {
        if (navigable.has(cursor)) return cursor
        seen.add(cursor)
        cursor = parentById.get(cursor) ?? null
      }
    }
    return navigableItems[0].node.id
  }, [navigableItems, selectedEventId, visibleFlattenedHierarchy])

  // ===== 키보드 단축키 + 리스트 네비게이션 =====
  /**
   * 상세 닫기 — **직전에 보던 행으로 포커스를 되돌린다**.
   *
   * 포커스 트랩·복귀는 모바일 drawer에서만 활성이라, 데스크톱에서 닫기를 누르면 드로어가
   * 언마운트되며 포커스가 document 최상단으로 떨어졌다. 그 상태에서 방금 보던 행으로
   * 돌아가려면 툴바·필터·정렬을 전부 Tab으로 통과해야 했다(검토 INT-8).
   * 행이 이미 사라졌으면(필터·삭제) 목록 컨테이너로 폴백한다.
   */
  const clearSelectedEvent = useCallback(() => {
    const previousId = selectedEventIdRef.current
    setSelectedEventId(null)
    // 미발견 상태(URL-4)도 같은 닫기 경로로 사라진다 — 탈출로를 두 개로 나누지 않는다.
    setMissingEventId(null)
    if (typeof window === 'undefined') return
    // 언마운트가 끝난 뒤에 옮겨야 포커스가 사라지는 노드로 가지 않는다.
    window.requestAnimationFrame(() => {
      const row = previousId
        ? document.querySelector<HTMLElement>(`[data-event-id="${previousId}"]`)
        : null
      const fallback = document.querySelector<HTMLElement>('[data-event-id]')
      ;(row ?? fallback)?.focus({ preventScroll: true })
    })
  }, [])
  useCatalogShortcuts({
    searchInputRef,
    setShortcutHelpOpen,
    closeTopOverlay,
    // 미발견 패널도 Esc로 닫힌다 — 데스크톱 컬럼은 백드롭이 없어 ✕와 Esc가 전부다(URL-4).
    selectedEventId: selectedEventId ?? (showMissingEvent ? missingEventId : null),
    clearSelectedEvent,
  })
  useCatalogListNavigation({
    setSelectedEventId,
    navigate,
    // 목록 뷰에서, 오버레이가 닫혀 있을 때만. 다른 뷰·모달 위에서는 리스너를 아예
    // 걸지 않아 브라우저 기본 키 동작(스크롤·select 조작)을 되돌려준다.
    enabled: viewMode === VIEW_MODES.LIST && !anyOverlayOpen,
    // ←/→ 트리 키가 부른다. 안정 참조(useCallback)라 리스너를 다시 걸지 않는다.
    toggleEventExpansion,
  })

  /**
   * 선택 → 스크롤의 **단일 지점**.
   *
   * 예전엔 키보드 ↑↓ 경로에만 scrollIntoView가 있어서, 드로어의 이전/다음·
   * `?event=` 딥링크·뷰 복귀로 선택이 바뀌면 화면 밖 행이 그대로 남았다(목록은
   * 가상화가 없어 전량 렌더되므로 선택 행이 뷰포트 밖일 확률이 높다).
   *
   * id마다 한 번만 스크롤한다. 딥링크 진입 시점엔 아직 그 행이 렌더 전일 수 있어
   * (autoLoadAll이 페이지를 소진하는 중) 목록 길이가 늘 때마다 다시 시도하고,
   * 찾은 순간에만 처리 완료로 표시한다.
   */
  const scrolledForIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedEventId) {
      scrolledForIdRef.current = null
      return
    }
    if (scrolledForIdRef.current === selectedEventId) return
    const frame = requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-event-id="${CSS.escape(selectedEventId)}"]`,
      )
      if (!element) return // 아직 렌더 전 — 목록이 더 로드되면 재시도
      scrolledForIdRef.current = selectedEventId
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      element.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        // 'nearest' — 이미 보이는 행을 클릭했을 때는 아무 것도 하지 않는다.
        block: 'nearest',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedEventId, visibleFlattenedHierarchy.length])

  // ===== Pagination: 스크롤 감지 =====
  // 임계값을 고정 300px → viewport 비율로. 모바일 600px 화면에서 300px 임계는 한 화면의 절반 →
  // 너무 일찍/자주 트리거됨. clientHeight의 40%(또는 최소 200)면 데스크톱·모바일 모두 자연스러움.
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight
    const threshold = Math.max(200, target.clientHeight * 0.4)
    if (scrollBottom < threshold && hasMore && !isLoading) {
      fetchMoreEvents()
    }
  }

  // ===== 선택된 이벤트/노드 — lookup map으로 O(1) 조회 =====
  const selectedEvent = useMemo<HistoricalEvent | null>(() => {
    if (!selectedEventId) return null
    return (
      eventByIdMap.get(selectedEventId) ??
      nodeIndexMap.get(selectedEventId)?.rootEvent ??
      // 트리 lazy 서브트리에서 불러온 사건 — 목록 인덱스 미스 시 레지스트리 폴백.
      // byParent 응답엔 background 등 상세 전용 필드가 빌 수 있으나 어댑터가
      // 안전 기본값('')으로 채워 드로어는 해당 섹션만 조용히 생략한다.
      lazyEventById.get(selectedEventId) ??
      null
    )
  }, [selectedEventId, eventByIdMap, nodeIndexMap, lazyEventById])

  const selectedNode = useMemo<EventHierarchyNode | null>(() => {
    if (!selectedEventId) return null
    return (
      nodeIndexMap.get(selectedEventId)?.node ??
      // lazy 사건은 어댑터가 만든 자기 자신의 hierarchy 노드를 그대로 쓴다.
      lazyEventById.get(selectedEventId)?.hierarchy ??
      null
    )
  }, [selectedEventId, nodeIndexMap, lazyEventById])

  /**
   * 드로어 '상위 사건' 링크의 데이터 — 평탄화의 `parentNodeId`가 정본.
   *
   * - 평면(계층 OFF) 모드는 같은 노드가 루트 행(parentNodeId=null)과 자식 행으로
   *   중복 등장한다 — parentNodeId가 **있는** 행을 우선 채택해야 평면 모드에서도
   *   상위 링크가 살아 있다.
   * - 제목은 전체 평탄화 배열에서 부모 노드 행(node.id 일치)으로 해석하고, 없으면
   *   `parentEvent` 폴백 — 단 평면 모드의 parentEvent는 다른 값이 들어갈 수 있어
   *   `parentEvent.id === parentNodeId`일 때만 신뢰한다.
   * - 상위가 없으면 null → 드로어는 행을 그리지 않는다.
   */
  const selectedParentRef = useMemo<{ id: string; title: string } | null>(() => {
    if (!selectedEventId) return null
    let parentNodeId: string | null = null
    let parentEventFallback: HistoricalEvent | null = null
    for (const row of visibleFlattenedHierarchy) {
      if (row.node.id !== selectedEventId || row.parentNodeId === null) continue
      parentNodeId = row.parentNodeId
      parentEventFallback = row.parentEvent
      break
    }
    if (!parentNodeId) {
      // lazy 사건 폴백 — 평탄화 행에 없으므로 레지스트리의 parentEventId로 해석.
      // 부모 제목은 목록 인덱스 → lazy 레지스트리 순으로 찾고, 못 찾으면 행 미표시.
      const lazySelected = lazyEventById.get(selectedEventId)
      const lazyParentId = lazySelected?.parentEventId
      if (!lazyParentId) return null
      const lazyParentTitle =
        nodeIndexMap.get(lazyParentId)?.node.title ??
        eventByIdMap.get(lazyParentId)?.title ??
        lazyEventById.get(lazyParentId)?.title
      return lazyParentTitle
        ? { id: lazyParentId, title: lazyParentTitle }
        : null
    }
    for (const row of visibleFlattenedHierarchy) {
      if (row.node.id === parentNodeId) {
        return { id: parentNodeId, title: row.node.title }
      }
    }
    if (parentEventFallback && parentEventFallback.id === parentNodeId) {
      return { id: parentNodeId, title: parentEventFallback.title }
    }
    return null
  }, [
    selectedEventId,
    visibleFlattenedHierarchy,
    lazyEventById,
    nodeIndexMap,
    eventByIdMap,
  ])

  const summaryNode = useMemo<EventHierarchyNode | null>(() => {
    if (!summaryEventId) return null
    return nodeIndexMap.get(summaryEventId)?.node ?? null
  }, [summaryEventId, nodeIndexMap])

  const filtersOrSearchActive =
    hasActiveFilters ||
    bookmarksOnly ||
    anchorsOnly ||
    anchorId !== null ||
    keywordInput.trim().length > 0

  /** 로드된 사건과 실제로 매칭되는 북마크 수 — 툴바 배지의 모수(검토 CR-6) */
  const resolvableBookmarkCount = useMemo(() => {
    if (bookmarks.size === 0) return 0
    let count = 0
    for (const event of events) if (bookmarks.has(event.id)) count += 1
    return count
  }, [bookmarks, events])

  /**
   * 헤더 통계('… · 정치 47')가 쓸 사건 집합 — **총계와 같은 모수**.
   *
   * 필터가 걸리면 단계 ①(술어)을 통과한 사건만 센다 — 접힘(③·④)은 모수를 바꾸지 않는다.
   * 미필터일 때는 **최상위만** 센다(검토 DATA-7): 옆에 붙는 총계(`serverTotal`)가
   * 최상위 기준이라, 자식까지 포함한 카테고리 수를 나란히 두면 같은 줄에서 두 숫자가
   * 서로 다른 모수를 말했다('정치 47 / 등록 전체 110건' 같은 모순).
   */
  const statsEvents = useMemo(() => {
    if (!filtersOrSearchActive) {
      return events.filter(isTreeRoot)
    }
    const matchedIds = new Set(
      matchedOnlyHierarchy.map((item) => item.node.id),
    )
    return events.filter((event) => matchedIds.has(event.id))
  }, [filtersOrSearchActive, events, matchedOnlyHierarchy])

  /** 로드된 최상위 사건 수 — serverTotal과 같은 모수(최상위 기준) */
  const rootLoadedCount = useMemo(() => events.filter(isTreeRoot).length, [events])

  /**
   * 로드된 최상위 중 앵커(자손 ≥ 1) 수 — '앵커만' 칩의 배지 모수.
   * 나머지(rootLoadedCount − anchorRootCount)가 곧 '단독' 사건 수다.
   */
  const anchorRootCount = useMemo(
    () => events.filter((event) => isTreeRoot(event) && isAnchorEvent(event)).length,
    [events],
  )

  /**
   * 타임라인 전용 축의 활성 칩(검토 GAP-4).
   *
   * **타임라인을 보고 있을 때만** 노출한다 — 이 두 축은 다른 뷰의 결과를 바꾸지 않으므로,
   * 목록 화면에 '숨김 · 전쟁' 칩을 띄우면 걸리지도 않은 효과를 주장하게 된다.
   * 반면 '전체 초기화'는 뷰와 무관하게 이 축들도 되돌린다(handleResetAll 참고).
   */
  const timelineFilterChips = useMemo<FilterChip[]>(() => {
    if (viewMode !== VIEW_MODES.TIMELINE) return []
    const chips: FilterChip[] = []
    if (timelineWindow !== null) {
      chips.push({
        key: 'tlw',
        label: `타임라인 창 · ${describeTimelineWindow(timelineWindow)}`,
        onClear: () => setTimelineWindow(null),
      })
    }
    for (const categoryKey of hiddenTimelineCategories) {
      chips.push({
        key: `hide:${categoryKey}`,
        label: `숨김 · ${categoryKey}`,
        onClear: () => toggleHiddenTimelineCategory(categoryKey),
      })
    }
    return chips
  }, [
    viewMode,
    timelineWindow,
    hiddenTimelineCategories,
    toggleHiddenTimelineCategory,
  ])

  /**
   * 칩 바에 **실제로 렌더되는** 필터 집합(검토 IA-17).
   *
   * 예전엔 'N개 적용 중'을 `filterSummaryChips.length + 북마크`로 셌는데, 툴바는
   * 검색어 칩을 렌더하지 않는다(검색창이 이미 그 값을 보여주므로). 그래서 검색어만
   * 있으면 **칩 0개짜리 '1개 적용 중' 바**가 떴고, 다른 조합에서도 숫자와 칩 수가
   * 어긋났다. 숫자와 칩이 같은 배열에서 나오게 해 구조적으로 어긋날 수 없게 한다.
   *
   * 타임라인 전용 축(레인·카테고리 숨김)도 여기 합류한다(검토 GAP-4).
   */
  /**
   * 앵커 스코프 칩 — 지금 무엇 아래를 보고 있는지와 **나가는 길**을 한 자리에 둔다.
   * 모수를 통째로 바꾸는 축이라 다른 칩보다 앞에 세운다.
   */
  const anchorScopeChip = useMemo<FilterChip | null>(() => {
    if (!anchorId) return null
    const scoped = events.find((event) => event.id === anchorId)
    return {
      key: 'anchor',
      // 아직 로드 전이면 제목 대신 중립 문구 — id를 화면에 노출하지 않는다.
      label: `최상위 · ${scoped?.title ?? '불러오는 중'}`,
      onClear: () => setAnchorId(null),
    }
  }, [anchorId, events])

  const barFilterChips = useMemo<FilterChip[]>(
    () => [
      ...(anchorScopeChip ? [anchorScopeChip] : []),
      ...filterSummaryChips.filter((chip) => chip.key !== 'keyword'),
      ...timelineFilterChips,
    ],
    [anchorScopeChip, filterSummaryChips, timelineFilterChips],
  )

  /**
   * ===== 빈 상태 칩 + drop-one-out 카운트 (검토 IA-12) =====
   *
   * 0건 화면에서 회복하려면 "어느 축이 범인인가"를 알아야 하는데, 예전 빈 상태는
   * 걸린 조건을 나열만 하고 **추측을 요구**했다. 축이 셋 걸려 있으면 사용자는
   * 하나씩 껐다 켜며 이진 탐색을 해야 했고, 그 사이 스크롤·선택이 초기화된다.
   * 각 칩에 '그 축만 풀면 몇 건'을 붙이면 한 번에 지목된다.
   *
   * 검색어 칩도 포함한다 — 툴바 칩 바에서는 검색창이 이미 값을 보여주므로 빼지만,
   * 0건의 범인일 때는 여기서 반드시 지목돼야 한다.
   */
  const emptyStateFilterChips = useMemo(() => {
    const releaseCountByChipKey: Record<string, number> = {
      category: optionCounts.dropOneOut.category,
      country: optionCounts.dropOneOut.country,
      continent: optionCounts.dropOneOut.continent,
      century: optionCounts.dropOneOut.century,
      keyword: optionCounts.dropOneOut.keyword,
      bookmarks: optionCounts.dropOneOut.bookmark,
    }
    const chips: FilterChip[] = [...filterSummaryChips]
    if (bookmarksOnly) {
      chips.push({
        key: 'bookmarks',
        label: '북마크만',
        onClear: () => setBookmarksOnly(false),
      })
    }
    if (anchorsOnly) {
      chips.push({
        key: 'anchors',
        label: '최상위 사건만',
        onClear: () => setAnchorsOnly(false),
      })
    }
    return chips.map((chip) => ({
      ...chip,
      releaseCount: releaseCountByChipKey[chip.key],
    }))
  }, [
    filterSummaryChips,
    bookmarksOnly,
    anchorsOnly,
    optionCounts,
    setBookmarksOnly,
  ])
  /**
   * 'N개 적용 중' 숫자는 **툴바가 이 배열에서 직접 센다**(북마크 칩만 +1).
   * 페이지가 따로 세어 내려보내던 시절엔 두 값이 갈릴 여지가 남아 있었다.
   */

  /**
   * ════════ 초기화 범위 규약 (검토 URL-6 · URL-7 · URL-8/INT-11) ════════
   *
   * 기준 한 문장: **'행을 감추는 것'은 전부 되돌리고, '어떻게 보여줄까'는 남긴다.**
   *
   * | 대상 | 초기화 | 근거 |
   * |---|---|---|
   * | 카테고리·국가·대륙·세기 | **O** | 좁히는 축 (`hasNarrowingFilters`) |
   * | 검색어 | **O** | 좁히는 축 |
   * | 북마크만 | **O** | 술어 레인에 합류한 좁히는 축(IA-7) |
   * | 타임라인 레인·카테고리 숨김 | **O** | 두 번째 필터 체계(GAP-4). 뷰와 무관하게 되돌린다 |
   * | 연·세기 밴드 접힘 | **O** | 행을 감춘다(URL-6) |
   * | 하위 사건 접힘(expandedEventIds) | **O** | 행을 감춘다 — 같은 이유 |
   * | 정렬(sortBy·sortDirection) | **X** | `hasNarrowingFilters`가 '표시 옵션'이라 선언(URL-7) |
   * | 계층 토글(showFlatView) | **X** | 표시 옵션 |
   * | 뷰·페이지 크기·밀도·집중 모드 | **X** | 표시 옵션 |
   * | 선택된 사건(selectedEventId) | **X** | 필터가 아니라 '지금 보고 있는 것' |
   *
   * 접힘이 왜 포함인가 — 드로어의 '조건 밖' 배너가 권하는 버튼이 바로 이것인데,
   * 행을 감춘 원인이 접힘일 때 필터만 풀면 화면이 그대로다. 즉 **완전한 먹통 버튼**이었다.
   *
   * 되돌리기 — 초기화 직전 스냅샷을 잡아 `notify.action`으로 복구를 제공한다. 모든 URL
   * write가 `replace: true`라 뒤로가기로 못 돌아오는데, 훨씬 가벼운 북마크 1건 토글에는
   * 이미 '실행 취소'가 붙어 있었다(비용 비대칭, URL-8/INT-11).
   * ════════════════════════════════════════════════════════════════════
   */
  const handleResetAll = useCallback(() => {
    const snapshot = {
      selectedCategory,
      selectedCountry,
      selectedContinent,
      selectedCentury,
      keywordInput,
      bookmarksOnly,
      anchorsOnly,
      anchorId,
      timelineWindow,
      hiddenTimelineCategories,
      collapsedYears,
      collapsedCenturies,
      expandedEventIds,
    }
    /**
     * 해제되는 '좁히는 조건' 수 — 칩과 같은 모수(검색어 칩 포함).
     * 타임라인 축 2종(창 `tlw`·카테고리 숨김 `hide`)은 칩이 TIMELINE 뷰 전용인
     * 것과 달리 **뷰와 무관하게** 카운트한다(검토 R40 — 의도된 비대칭). 다른
     * 뷰에서도 URL에 남아 있고 아래에서 실제로 해제되므로, 뷰로 게이트하면
     * 토스트 건수와 되돌리기 스냅샷이 어긋난다.
     */
    const releasedFilters =
      filterSummaryChips.length +
      (bookmarksOnly ? 1 : 0) +
      (anchorsOnly ? 1 : 0) +
      (anchorId !== null ? 1 : 0) +
      (timelineWindow !== null ? 1 : 0) +
      hiddenTimelineCategories.size
    /**
     * 실제로 감춰진 행이 있었는가 — 밴드 접힘(④)이거나 계층 접힘(③).
     * ⚠️ `expandedEventIds.size === 0`으로 판정하면 안 된다. 자식이 있는 사건이 하나도
     * 없는 데이터에서도 그 집합은 비어 있어 '펼쳤다'고 거짓말하게 된다.
     */
    const releasedCollapse =
      collapsedYears.size + collapsedCenturies.size > 0 ||
      visibleFlattenedHierarchy.length !== listRenderedHierarchy.length

    handleResetFilters()
    setKeywordInput('')
    setBookmarksOnly(false)
    setAnchorsOnly(false)
    setAnchorId(null)
    setTimelineWindow(null)
    setHiddenTimelineCategories(EMPTY_HIDDEN_CATEGORIES)
    // 접힘도 함께 푼다 — 이 버튼이 '보이게 해 준다'고 약속하기 때문이다(URL-6).
    setCollapsedYears(new Set())
    setCollapsedCenturies(new Set())
    expandAllChildren()

    if (releasedFilters === 0 && !releasedCollapse) return
    notify.action(
      releasedFilters > 0
        ? `필터 ${releasedFilters}개 해제${releasedCollapse ? ' · 접힘 펼침' : ''}`
        : '접어 둔 항목을 모두 펼쳤습니다',
      {
        label: '되돌리기',
        onClick: () => {
          setSelectedCategory(snapshot.selectedCategory)
          setSelectedCountry(snapshot.selectedCountry)
          setSelectedContinent(snapshot.selectedContinent)
          setSelectedCentury(snapshot.selectedCentury)
          // 검색어는 입력값만 되돌리면 디바운스 effect가 술어까지 잇는다.
          setKeywordInput(snapshot.keywordInput)
          setBookmarksOnly(snapshot.bookmarksOnly)
          setAnchorsOnly(snapshot.anchorsOnly)
          setAnchorId(snapshot.anchorId)
          setTimelineWindow(snapshot.timelineWindow)
          setHiddenTimelineCategories(snapshot.hiddenTimelineCategories)
          setCollapsedYears(snapshot.collapsedYears)
          setCollapsedCenturies(snapshot.collapsedCenturies)
          setExpandedEventIds(snapshot.expandedEventIds)
        },
      },
      { type: 'info' },
    )
  }, [
    handleResetFilters,
    filterSummaryChips,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    keywordInput,
    bookmarksOnly,
    anchorsOnly,
    anchorId,
    timelineWindow,
    hiddenTimelineCategories,
    collapsedYears,
    collapsedCenturies,
    expandedEventIds,
    expandAllChildren,
    visibleFlattenedHierarchy,
    listRenderedHierarchy,
    setSelectedCategory,
    setSelectedCountry,
    setSelectedContinent,
    setSelectedCentury,
    setExpandedEventIds,
  ])

  // ===== 자식으로 전달되는 핸들러 — useCallback으로 ref 안정화 =====
  const handleExpandEvent = useCallback((eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
  }, [setExpandedEventIds])
  /**
   * 계층 모달(트리)에서 노드를 고르면 그 사건을 연다 — 모달이 막다른 골목이던 것을
   * 목록으로 되돌리는 경로다(검토 CTRL-7).
   *
   * 고른 노드가 접힌 조상 아래일 수 있으므로 **조상 체인을 함께 펼친다**. 그러지 않으면
   * 선택은 되는데 그 행이 목록에 없어 드로어의 '목록 조건 밖' 배너가 뜬다.
   */
  const handleSelectFromTree = useCallback(
    (eventId: string) => {
      const parentById = new Map(
        visibleFlattenedHierarchy.map((item) => [
          item.node.id,
          item.parentNodeId,
        ]),
      )
      const ancestors: string[] = []
      const seen = new Set<string>()
      let cursor = parentById.get(eventId) ?? null
      while (cursor && !seen.has(cursor)) {
        ancestors.push(cursor)
        seen.add(cursor)
        cursor = parentById.get(cursor) ?? null
      }
      if (ancestors.length > 0) {
        setExpandedEventIds((prev) => {
          const next = new Set(prev)
          ancestors.forEach((id) => next.add(id))
          return next
        })
      }
      setSelectedEventId(eventId)
      setShowSummaryModal(false)
    },
    [visibleFlattenedHierarchy, setExpandedEventIds, setSelectedEventId],
  )
  /**
   * 접어 둔 연·세기 밴드만 편다 — 필터·검색어·하위 접힘은 그대로 둔다(검토 CTRL-3).
   * '전체 초기화'는 조건까지 날리므로, 조건은 유지한 채 감춰진 행만 되살릴 길이 필요했다.
   */
  const handleExpandAllBands = useCallback(() => {
    setCollapsedYears(new Set())
    setCollapsedCenturies(new Set())
  }, [setCollapsedYears, setCollapsedCenturies])
  const toggleShowFlatView = useCallback(
    () => setShowFlatView((v) => !v),
    [setShowFlatView],
  )
  const toggleBookmarksOnly = useCallback(
    () => setBookmarksOnly((v) => !v),
    [],
  )
  const toggleAnchorsOnly = useCallback(
    () => setAnchorsOnly((previous) => !previous),
    [],
  )
  /**
   * 앵커 조망 진입 — 모수를 그 사건과 자손으로 좁힌다.
   * '앵커만' 칩은 스코프 안에서 의미가 없으므로(모수가 이미 한 앵커) 함께 끈다.
   */
  const enterAnchorScope = useCallback((eventId: string) => {
    setAnchorId(eventId)
    setAnchorsOnly(false)
  }, [])
  /**
   * 사건 등록은 모달로 연다 — 페이지로 나가면 URL에 없는 UI 상태(연도/세기 접힘,
   * 펼친 행)가 언마운트로 소멸하고, 돌아오는 경로도 필터가 빠진 `/events`였다.
   * 모달은 아무것도 언마운트하지 않아 복귀가 정확하다.
   */
  const handleCreateEvent = useCallback(() => openCreateModal(), [openCreateModal])
  const handleExportJson = useCallback(async () => {
    /**
     * 행마다 `matchesFilter`를 함께 싣는다(검토 GAP-1) — 모집단에는 '매칭된 자손 때문에
     * 문맥으로 남은 부모'가 섞여 있는데, 파일에는 그 구분이 없어 '전쟁'으로 좁혀 받은
     * 파일에 정치 사건이 같은 자격으로 들어앉았다. 조건 요약은 파일 머리에 기록한다.
     */
    const exported = visibleFlattenedHierarchy.map((it) => ({
      event:
        eventByIdMap.get(it.node.id) ??
        nodeIndexMap.get(it.node.id)?.rootEvent ??
        null,
      matchesFilter: it.isMatch,
    }))
    // 현재 화면은 로드·필터된 일부만 → 전체보다 적으면 부분 내보내기임을 확인.
    // serverTotal은 *최상위(parentEventId=null)* 개수이므로, 부분 여부 판정은
    // 로드된 *최상위* 수(depth 0)로 비교해야 한다. exportedCount(하위 포함)로 비교하면
    // 자식이 많을 때 exportedCount>serverTotal이 되어 부분 경고가 조용히 억제됐다.
    const exportedCount = exported.filter((entry) => entry.event).length
    const loadedRootCount = visibleFlattenedHierarchy.filter(
      (item) => item.depth === 0,
    ).length
    if (
      typeof serverTotal === 'number' &&
      loadedRootCount < serverTotal &&
      !(await confirm({
        title: '확인',
        message: `등록된 최상위 사건 ${serverTotal.toLocaleString()}건 중 현재 로드·필터된 ${loadedRootCount.toLocaleString()}건(하위 사건 포함 ${exportedCount.toLocaleString()}건)만 내보냅니다. 계속할까요?`,
      }))
    ) {
      return
    }
    exportEventsAsJson(exported, {
      appliedFilters: barFilterChips
        .map((chip) => chip.label)
        .concat(bookmarksOnly ? ['북마크된 항목만'] : [])
        .concat(anchorsOnly ? ['최상위(앵커) 사건만'] : []),
      keyword: debouncedKeyword.trim() || undefined,
      serverTotal,
    })
  }, [
    visibleFlattenedHierarchy,
    eventByIdMap,
    nodeIndexMap,
    serverTotal,
    barFilterChips,
    bookmarksOnly,
    anchorsOnly,
    debouncedKeyword,
  ])

  /** lazy 슬롯 fallback — 위젯 chunk 다운로드 동안 유지되는 빈 박스. layout shift 방지. */
  const lazyFallback = (
    <PageStyles.LazyViewFallback aria-busy="true" aria-live="polite">
      <PageStyles.LazyViewSpinner aria-hidden="true" />
      <span>뷰 불러오는 중…</span>
    </PageStyles.LazyViewFallback>
  )

  /**
   * 활성 viewMode에 해당하는 슬롯 *하나만* 빌드.
   * 이전엔 7개 슬롯의 React element를 매 렌더마다 모두 생성했으나, 한 번에 하나만 그려지므로
   * 나머지 6개의 prop computation은 순수 낭비였음. switch로 한 슬롯만 만든다.
   *
   * ⚠️ 목록·트리를 제외한 뷰는 `matchedOnlyHierarchy`(단계 ①)를 받는다 —
   * 문맥 부모를 데이터로 세지 않기 위해서다(검토 GAP-1). 새 뷰를 붙일 때도 같은 배열을 쓸 것.
   */
  let activeSlot: React.ReactNode
  /** 아직 받아올 페이지가 남았는가 — 빈 상태를 '0건'으로 확정하지 않기 위한 신호(검토 GAP-3) */
  const stillLoadingMore = hasMore || isFetchingNextPage
  const firstPageLoading = isLoading && events.length === 0
  switch (viewMode) {
    case VIEW_MODES.MAP:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventMapView
            flattenedHierarchy={matchedOnlyHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            hasActiveFilters={filtersOrSearchActive}
            onResetFilters={handleResetAll}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.GRID:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventGridView
            flattenedHierarchy={matchedOnlyHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
            isLoading={firstPageLoading}
            hasMoreData={stillLoadingMore}
            hasActiveFilters={filtersOrSearchActive}
            onResetFilters={handleResetAll}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.DASHBOARD:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventDashboardView
            flattenedHierarchy={matchedOnlyHierarchy}
            events={events}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
            serverTotal={serverTotal}
            isLoading={firstPageLoading}
            hasMoreData={stillLoadingMore}
            hasActiveFilters={filtersOrSearchActive}
            filterLabels={barFilterChips.map((chip) => chip.label)}
            onResetFilters={handleResetAll}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.TREE:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventTreeView
            // 트리만 완전한 배열 — 문맥 부모를 빼면 그 아래 매칭된 자식이 함께 사라진다.
            // 강등(흐림)과 가지치기는 위젯이 isMatch로 직접 처리한다.
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
            // 노드에서 가지 낳기 — 기존 등록 모달을 initialParent와 함께 연다.
            onCreateChild={handleCreateChildEvent}
            // lazy 서브트리 응답 수집 — 미발견 판정·드로어 해석의 폴백 레지스트리.
            onLazyEventsLoaded={handleLazyEventsLoaded}
            isLoading={firstPageLoading}
            hasMoreData={stillLoadingMore}
            hasActiveFilters={filtersOrSearchActive}
            onResetFilters={handleResetAll}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.GALLERY:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventGalleryView
            flattenedHierarchy={matchedOnlyHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
            isLoading={firstPageLoading}
            hasMoreData={stillLoadingMore}
            hasActiveFilters={filtersOrSearchActive}
            onResetFilters={handleResetAll}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.LIST:
      activeSlot = (
        <EventCompactList
          density={listDensity}
          onCreateEvent={handleCreateEvent}
          isLoading={isLoading && events.length === 0}
          // 목록은 접힘으로 숨긴 행을 뺀 배열만 받는다. 완전한 모집단은 다른 뷰·내보내기 몫.
          flattenedHierarchy={listRenderedHierarchy}
          // 연도 버킷은 페이지가 계산한 **바로 그 객체**를 내려준다(검토 PERF-4).
          // 위젯이 다시 계산하면 입력 한 톨 차이로 DOM과 내비 모수가 갈린다.
          yearBuckets={yearBuckets}
          events={events}
          expandedEventIds={expandedEventIds}
          selectedEventId={selectedEventId}
          hasActiveFilters={filtersOrSearchActive}
          // 칩마다 '이 축만 풀면 몇 건'이 붙어 있다 — 0건에서 범인을 지목한다(검토 IA-12).
          activeFilterChips={emptyStateFilterChips}
          // 북마크는 브라우저 로컬이라 공유 링크의 `bookmarks=1`은 받는 쪽에서 항상
          // 0건이 된다 — 그 사실을 빈 상태에서 밝힌다(검토 URL-11).
          showBookmarkStorageHint={bookmarksOnly && bookmarks.size === 0}
          dbCategories={dbCategories}
          isLoadingMore={isFetchingNextPage}
          loadMoreFailed={loadMoreFailed}
          onRetryLoadMore={fetchMoreEvents}
          // 세기·연도 밴드 접힘까지 반영한 '실제 표시 행' — 접어도 값이 안 변하면
          // 라이브 영역 고지(A11Y-12)와 하단 '표시 N행'이 화면과 어긋난다.
          displayedCount={navigableItems.length}
          displayedRootCount={
            navigableItems.filter((item) => item.depth === 0).length
          }
          hasMoreData={hasMore}
          bookmarks={bookmarks}
          searchQuery={debouncedKeyword}
          recentEventIds={recentEvents}
          collapsedYears={collapsedYears}
          collapsedCenturies={collapsedCenturies}
          onToggleYearCollapse={toggleYearCollapse}
          onToggleCenturyCollapse={toggleCenturyCollapse}
          onToggleExpansion={toggleEventExpansion}
          onSelectEvent={setSelectedEventId}
          onShowSummary={openSummary}
          // 목록 행의 ⚑ 배지 = 조망 진입점. 신규 지면 없이 모수만 좁힌다.
          onEnterAnchorScope={enterAnchorScope}
          onResetFilters={handleResetAll}
          onToggleBookmark={handleToggleBookmark}
          onScroll={handleScroll}
          // 접힌 밴드가 반영된 첫 '보이는 행' — 위젯이 접힘을 재계산하지 않게 페이지가 내린다.
          rovingTargetId={rovingTargetId}
          // ⚠️ 위젯의 렌더 분기와 페이지의 navigableItems가 **같은 변수**를 읽는다(검토 GAP-2).
          grouped={listGrouped}
        />
      )
      break
    case VIEW_MODES.TIMELINE:
    default:
      activeSlot = (
        <EventTimeline
          flattenedHierarchy={matchedOnlyHierarchy}
          events={events}
          selectedEventId={selectedEventId}
          dbCategories={dbCategories}
          onSelectEvent={setSelectedEventId}
          hasMore={hasMore}
          isFetchingMore={isFetchingNextPage}
          onLoadMore={fetchMoreEvents}
          loadMoreFailed={loadMoreFailed}
          isLoading={firstPageLoading}
          wideMode={wideMode}
          // 타임라인 전용 상태(창·숨김)는 페이지 소유 — URL·칩·초기화에 참여(검토 GAP-4)
          window={timelineWindow}
          onWindowChange={setTimelineWindow}
          hiddenCategories={hiddenTimelineCategories}
          onToggleHiddenCategory={toggleHiddenTimelineCategory}
          onShowAllCategories={showAllTimelineCategories}
        />
      )
  }

  const handleAfterDelete = useCallback(
    (deletedId: string) => {
      if (selectedEventId === deletedId) setSelectedEventId(null)
      // 지운 사건의 북마크도 함께 정리 — 안 하면 배지 숫자와 '북마크만' 결과가 어긋난다.
      removeBookmark(deletedId)
      // lazy 레지스트리에서도 제거 — 남겨두면 존재 판정·드로어 폴백이 삭제된 사건의
      // stale 스냅샷을 계속 '실재'로 신뢰한다(뒤로가기로 ?event가 복원되는 경로).
      // 세션 내 수정 stale은 byParent refetch가 같은 키를 덮어써 해소되므로 별도 조치 불요.
      setLazyEventById((prev) => {
        if (!prev.has(deletedId)) return prev
        const next = new Map(prev)
        next.delete(deletedId)
        return next
      })

      /**
       * 낙관적 제거 — 무효화만으로는 지운 행이 화면에 남는다(검토 DATA-6).
       *
       * 목록은 useInfiniteQuery이고 maxPages를 안 걸어 v5 재검증이 **저장된 모든 페이지를
       * 처음부터 순차 재요청**한다. autoLoadAll이라 페이지 수는 항상 '전체/pageSize'이므로
       * 228건·pageSize 100이면 3회, 2,000건이면 20회 순차 요청 + 전량 페이로드 재수신이다.
       * 그 사이 토스트는 떴는데 방금 지운 행이 그대로 보인다.
       * 캐시에서 먼저 걷어내고 무효화는 배경 정합용으로만 남긴다.
       */
      queryClient.setQueriesData<InfiniteData<PrunableEvent[]>>(
        { queryKey: eventKeys.lists() },
        (cached) => {
          if (!cached?.pages) return cached
          const pages = pruneEventFromPages(cached.pages, deletedId)
          return pages === cached.pages ? cached : { ...cached, pages }
        },
      )

      // 목록(['events'])과 헤더 총개수(['events-count']) 모두 무효화 — 안 하면
      // 삭제 후 헤더 "전체 N건"이 staleTime 동안 옛 값을 유지.
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.count() })
    },
    [selectedEventId, queryClient, removeBookmark],
  )

  /**
   * drawer 안 prev/next — **화면에 실제로 보이는 행** 기준. 끝에서는 undefined.
   *
   * 이전엔 접힘을 모르는 배열을 썼다. 그래서 19세기를 접어 둔 채 '다음 사건'을 누르면
   * 목록에 없는 사건이 상세에 뜨고 목록엔 활성 하이라이트가 없었다 — 같은 '다음'인데
   * ↓ 키(렌더된 행에서만 이동)와 버튼이 서로 다른 사건으로 갔다(버튼 title은 '(↓)'라고
   * 둘이 같다고 안내한다). navigableItems는 ↑↓와 동일한 후보 집합이다.
   */
  const selectedIndex = useMemo(() => {
    if (!selectedEventId) return -1
    return navigableItems.findIndex((it) => it.node.id === selectedEventId)
  }, [selectedEventId, navigableItems])

  const onDrawerPrev = useMemo(() => {
    if (selectedIndex <= 0) return undefined
    return () => {
      const prev = navigableItems[selectedIndex - 1]
      if (prev) setSelectedEventId(prev.node.id)
    }
  }, [selectedIndex, navigableItems])

  const onDrawerNext = useMemo(() => {
    if (selectedIndex < 0 || selectedIndex >= navigableItems.length - 1)
      return undefined
    return () => {
      const next = navigableItems[selectedIndex + 1]
      if (next) setSelectedEventId(next.node.id)
    }
  }, [selectedIndex, navigableItems])

  /**
   * 드로어 열림 고지 — **항상 마운트**된 라이브 영역이 페이지에 하나 있고, 문구는
   * '닫힘 → 열림' 전이에서만 세팅한다(검토 A11Y-18).
   *
   * ⚠️ 두 가지를 동시에 지켜야 한다.
   * ⑴ 드로어 컴포넌트 안에 두면 안 된다 — 그 컴포넌트가 `selectedEventId && (...)`로
   *    조건부 렌더라 라이브 영역이 텍스트를 품은 채 삽입돼 첫 열림이 낭독되지 않는다.
   * ⑵ 선택이 바뀔 때마다 문구를 갱신하면 안 된다 — ↑/↓ 내비게이션이 선택을 연속으로
   *    옮기므로 행 포커스 낭독 위에 '…상세를 열었습니다'가 매번 겹쳐 큐잉된다.
   */
  const [drawerAnnouncement, setDrawerAnnouncement] = useState('')
  const hadSelectionRef = useRef(false)
  useEffect(() => {
    const hasSelection = Boolean(selectedEventId)
    if (hasSelection && !hadSelectionRef.current) {
      const title = selectedEvent?.title ?? selectedNode?.title
      setDrawerAnnouncement(
        title ? `${title} 상세를 열었습니다` : '사건 상세를 열었습니다',
      )
    } else if (!hasSelection) {
      setDrawerAnnouncement('')
    }
    hadSelectionRef.current = hasSelection
  }, [selectedEventId, selectedEvent, selectedNode])

  const detailPanelSlot = (
    <EventDetailPanel
      /**
       * ⚠️ 하드코딩 false 금지(검토 INT-11).
       *
       * selectedEventId는 URL `event` 파라미터로 초기화되므로 드로어는 즉시 열리지만,
       * 그 사건이 담긴 페이지가 아직 안 왔으면 selectedEvent는 null이다. false로 못 박혀
       * 있던 탓에 `?event=<id>` 딥링크나 상세에서 뒤로가기로 들어오면 헤더는 '사건 상세'인데
       * 본문은 '사건을 선택해주세요'라고 말했고, 스켈레톤 분기는 영구 사문화였다.
       * 아직 받아올 페이지가 남아 있는 동안만 로딩으로 본다.
       */
      isLoading={
        !selectedEvent && (isLoading || isFetchingNextPage || hasMore)
      }
      // 로드 소진 후에도 못 찾은 선택 — 전용 상태로 렌더하고 URL 키는 이미 떨어졌다(URL-4).
      notFound={showMissingEvent}
      missingEventId={missingEventId}
      selectedEvent={selectedEvent}
      selectedNode={selectedNode}
      // 상위 사건 링크 — 평탄화 parentNodeId 기반, 없으면 행 미표시(위 memo 주석 참고).
      parentEventRef={selectedParentRef}
      dbCategories={dbCategories}
      onSelectEvent={setSelectedEventId}
      onExpandEvent={handleExpandEvent}
      onShowSummary={openSummary}
      onAfterDelete={handleAfterDelete}
      onPrev={onDrawerPrev}
      onNext={onDrawerNext}
      // 선택은 살아 있는데 화면에 보이는 행 목록에 없다 = 필터·검색·북마크로 잘려나간 상태.
      // lazy 레지스트리로 해석된 사건은 **TREE 뷰에서만** 예외 — 그 뷰에서만 실제 행이
      // 보여 '조건 밖' 고지(+필터 초기화 권유)가 거짓말이 된다. 다른 뷰로 전환하면
      // 행 자체가 없으므로 기존 고지를 그대로 타야 한다.
      isOutOfScope={
        selectedEventId !== null &&
        selectedIndex === -1 &&
        !(viewMode === VIEW_MODES.TREE && lazyEventById.has(selectedEventId))
      }
      onResetFilters={handleResetAll}
      onClose={clearSelectedEvent}
    />
  )


  // ===== 묶음 props (toolbar/modals) =====
  const toolbarProps = {
    searchInputRef,
    keywordInput,
    setKeywordInput,
    isSearchPending,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    showFlatView,
    dbCategories,
    availableCenturies,
    countries,
    historicalCountries,
    continents,
    // 트리거 라벨이 '알 수 없음'인 이유를 구분해 보여준다(검토 GAP-5).
    referenceState,
    onRetryReference: handleRetryReference,
    /**
     * 옵션 모집단을 참조 DB가 아니라 '내 데이터'로 만드는 건수(검토 IA-13 · IA-2).
     * 국가 축은 이 값으로 정렬까지 한다 — 첫 화면이 곧 이 카탈로그에 실재하는 국가다.
     */
    optionCounts,
    setShowCategoryModal,
    setShowCountryModal,
    toggleShowFlatView,
    setSelectedCentury,
    onSelectCategory: setSelectedCategory,
    onSelectCountry: setSelectedCountry,
    onSelectContinent: setSelectedContinent,
    bookmarksOnly,
    toggleBookmarksOnly,
    /**
     * '최상위 사건만' 칩 — 배지는 앵커 수(자손 ≥ 1인 루트). 나머지가 '단독' 사건이다.
     * autoLoadAll이라 소진 후에는 정확하고, 소진 중에는 과소 표기될 수 있다.
     */
    anchorsOnly,
    toggleAnchorsOnly,
    anchorsCount: anchorRootCount,
    /**
     * 배지 수 — 저장된 id 수가 아니라 **로드된 사건과의 교집합**.
     * 저장값을 그대로 쓰면 삭제·이관된 사건이나 다른 계정의 북마크까지 세어
     * 목록(교집합만 렌더)과 숫자가 어긋난다(검토 CR-6).
     * autoLoadAll이라 소진 후에는 정확하고, 소진 중에는 과소 표기될 수 있다.
     */
    bookmarksCount: resolvableBookmarkCount,
    // 하위 사건 일괄 접기/펼치기(검토 CR-5) — 판정은 위 실측값이 한다.
    childrenCollapsed,
    hasCollapsibleChildren,
    collapsedBandCount: collapsedYears.size + collapsedCenturies.size,
    onExpandAllBands: handleExpandAllBands,
    onCollapseAllChildren: collapseAllChildren,
    onExpandAllChildren: expandAllChildren,
    recentEventIds: recentEvents,
    events,
    onSelectEvent: setSelectedEventId,
    onExportJson: handleExportJson,
    onOpenShortcutHelp: openShortcutHelp,
    onCreateEvent: handleCreateEvent,
    /**
     * ⚠️ 툴바가 렌더할 칩 **그 자체**를 넘긴다(검토 IA-17). 검색어 칩은 이미 제외돼
     * 있고 타임라인 축 칩은 합류돼 있다 — 툴바가 다시 걸러내면 숫자와 칩이 갈린다.
     */
    filterSummaryChips: barFilterChips,
    handleResetAll,
  }

  // ===== 표시 옵션 묶음 (CatalogMainContent의 ViewSwitcherRow가 소비) =====
  const handleSortChange = useCallback(
    (newSortBy: SortOption) => {
      setSortBy(newSortBy)
      if (newSortBy === 'recent' || newSortBy === 'duration') {
        setSortDirection('desc')
      }
    },
    [setSortBy, setSortDirection],
  )

  const handleSortDirectionToggle = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [setSortDirection])

  const entityFilterModalProps = {
    showCategoryModal,
    setShowCategoryModal,
    dbCategories,
    selectedCategory,
    setSelectedCategory,
    showCountryModal,
    setShowCountryModal,
    countries,
    historicalCountries,
    selectedCountry,
    setSelectedCountry,
    // 모달 대륙 사이드바를 페이지 대륙 필터와 같은 값으로 연다(검토 IA-9)
    selectedContinent,
    continents,
  }

  const overlayModalProps = {
    shortcutHelpOpen,
    closeShortcutHelp,
    showSummaryModal,
    setShowSummaryModal,
    summaryNode,
    onSelectNode: handleSelectFromTree,
  }

  const content = (
    <>
      {/* 집중(넓게) 보기에선 페이지 헤더를 접어 본문에 높이 양보 */}
      {/* 제목은 시각 층에서 제거하고 접근성 트리에만 남긴다 — 좌측 nav의 활성 탭
          '사건'이 같은 말을 이미 하고 있고, 이 27px는 스크롤해도 회수되지 않았다. */}
      <PageStyles.VisuallyHiddenPageTitle>
        사건 연대표
      </PageStyles.VisuallyHiddenPageTitle>

      <CatalogToolbar {...toolbarProps} />

      {isError && events.length === 0 ? (
        <PageStyles.ErrorBanner role="alert">
          <FiAlertTriangle size={32} aria-hidden="true" />
          <PageStyles.ErrorBannerTitle>
            사건을 불러오지 못했습니다
          </PageStyles.ErrorBannerTitle>
          <PageStyles.ErrorBannerDesc>
            네트워크 또는 서버 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.
          </PageStyles.ErrorBannerDesc>
          <PageStyles.ErrorRetryButton
            type="button"
            onClick={() => refetchEvents()}
          >
            <FiRefreshCw size={14} aria-hidden="true" />
            다시 시도
          </PageStyles.ErrorRetryButton>
        </PageStyles.ErrorBanner>
      ) : (
        /**
         * 사건 미선택 = 우측 상세 패널 *완전 미렌더* → CatalogSplit이 1-col로 메인 뷰가 풀 폭.
         * 사건 클릭 시에만 drawer 마운트되어 데스크톱 column 표시 / 모바일 슬라이드인.
         */
        <Layout.CatalogSplit $hasSelection={!!selectedEventId}>
        <CatalogMainContent
          viewMode={viewMode}
          setViewMode={changeViewMode}
          visibleCount={visibleFlattenedHierarchy.length}
          matchedCount={matchedCount}
          // 로드된 *최상위* 사건 수 — serverTotal(최상위 기준)과 같은 모수여야
          // '표시 152 / 등록 전체 110' 같은 모순이 안 생긴다.
          totalCount={rootLoadedCount}
          serverTotal={serverTotal}
          // 필터 여부는 카운트 비교가 아니라 실제 필터 상태로 판정한다 —
          // 예전엔 계층을 접기만 해도 '필터됨'으로 둔갑했다(검토 M10).
          filtersActive={filtersOrSearchActive}
          // 헤더 통계는 총계와 같은 모수를 써야 한다(검토 IA-13)
          events={statsEvents}
          dbCategories={dbCategories}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onSortDirectionToggle={handleSortDirectionToggle}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          wideMode={wideMode}
          onToggleWideMode={toggleWideMode}
          listDensity={listDensity}
          onChangeListDensity={changeListDensity}
          activeSlot={activeSlot}
        />
        <PageStyles.DrawerAnnouncer role="status" aria-live="polite">
          {drawerAnnouncement}
        </PageStyles.DrawerAnnouncer>
        {/* 미발견 상태도 패널을 유지한다 — 링크가 왜 아무 것도 안 여는지 설명할 지면이
            사라지면 사용자는 '앱이 멈췄다'로 읽는다(검토 URL-4). */}
        {(selectedEventId || showMissingEvent) && (
          <CatalogDetailDrawer
            open
            onClose={clearSelectedEvent}
            title={
              showMissingEvent
                ? '사건을 찾을 수 없습니다'
                : (selectedEvent?.title ?? selectedNode?.title ?? null)
            }
          >
            {detailPanelSlot}
          </CatalogDetailDrawer>
        )}
        </Layout.CatalogSplit>
      )}
    </>
  )

  return (
    <>
      <Layout.PageScene>
        {/* 폭 상한 없음(2026-08-02 전폭 결정). 좌우 거터의 유일한 소유자는 PageWrapper의
            padding clamp이고, 늘어난 가로 픽셀 흡수는 행 격자의 열 사다리가 한다
            (theme.ts LIST_STEPS). 여기에 캡을 되살리지 말 것. */}
        <Layout.PageWrapper>{content}</Layout.PageWrapper>
      </Layout.PageScene>

      {/* 모바일 우하단 FAB */}
      <Layout.CreateEventFab
        type="button"
        aria-label="새 사건 등록"
        onClick={handleCreateEvent}
      >
        <FiPlus size={24} aria-hidden="true" />
      </Layout.CreateEventFab>

      <CatalogEntityFilterModals {...entityFilterModalProps} />
      <CatalogOverlayModals {...overlayModalProps} />

      <EventRegisterModal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        onDirtyChange={onCreateFormDirtyChange}
        // 트리 '+ 하위 사건' 경유일 때만 값이 있다 — 일반 등록은 undefined(프리필 없음).
        initialParent={createParentPreset ?? undefined}
      />
    </>
  )
}

export default EventsCatalogPage
