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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertTriangle, FiPlus, FiRefreshCw } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useEvents } from '@/entities/event/model'
import { getEventsCount } from '@/shared/api/events'
import { eventKeys } from '@/pages/events/detail/use-event-detail'
import { useEventFilters } from '@/features/event-filters/model'
import {
  buildYearBuckets,
  selectVisibleRows,
  useEventHierarchy,
} from '@/features/event-hierarchy/model'
import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'
import type { SortOption } from '@/features/event-list/lib/constants'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { useBookmarks } from '@/shared/hooks/use-bookmarks.hook'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useRecentEvents } from '@/shared/hooks/use-recent-events.hook'
import { EventCompactList } from '@/widgets/event-list-compact/ui/event-compact-list'
import { EventTimeline } from '@/widgets/event-timeline/ui/event-timeline'
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
import { useCatalogModals } from './hooks/use-catalog-modals'
import { useCatalogReferenceData } from './hooks/use-catalog-reference-data'
import {
  useCatalogListNavigation,
  useCatalogShortcuts,
} from './hooks/use-catalog-keyboard'
import { useCatalogUrlSync } from './hooks/use-catalog-url-sync'
import { exportEventsAsJson } from './lib/export-events'
import { resolveDefaultViewMode } from './lib/resolve-default-view-mode'

/** 집중(넓게) 보기 선택 영속 키 — 세션 간 유지. 모듈 스코프(렌더마다 재생성 회피). */
const WIDE_MODE_KEY = 'papyrus.events.wideMode'

export interface EventsCatalogPageProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 사건 */
  countryId?: string | null
  /** 대시보드 등에 임베드 시 상단 타이틀/여백 축소 */
  embed?: boolean
}

export const EventsCatalogPage: React.FC<EventsCatalogPageProps> = ({
  countryId,
  embed = false,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // ===== 검색 / 페이지 상태 =====
  const [bookmarksOnly, setBookmarksOnly] = useState(
    searchParams.get('bookmarks') === '1',
  )
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  // 기본 page size 100 — 타임라인 뷰가 한 번에 더 많은 사건을 보여주도록.
  // 사용자는 toolbar의 page size 컨트롤로 변경 가능.
  const [pageSize, setPageSize] = useState(100)

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
  const { bookmarks, toggleBookmark } = useBookmarks()

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
    countryId: countryId ?? undefined,
    // 정렬·세기 필터·계층 평탄화가 전부 클라이언트 전역이라, 일부 페이지만 로드된 채로
    // 정렬을 바꾸면 로드된 창 안에서만 재정렬된다(안 받은 페이지의 사건은 영영 안 나옴).
    // 특히 1000년 이전 사건은 start_date NULL → 서버 정렬상 맨 뒤로 밀려 마지막 페이지에
    // 몰리므로, 전체 페이지를 자동 소진해 전역 정렬/필터가 완전한 데이터를 보게 한다.
    autoLoadAll: true,
  })

  // ===== 권위 총개수 — 헤더 "전체 N건"이 *로드된 수*가 아닌 진짜 총량을 표시하도록 =====
  // 페이징 응답엔 total이 없어 별도 count 엔드포인트 조회(가벼운 count 쿼리). 실패 시 undefined.
  const { data: serverTotal } = useQuery({
    queryKey: [...eventKeys.count(), countryId ?? null],
    queryFn: () => getEventsCount({ countryId: countryId ?? undefined }),
    staleTime: 30_000,
  })

  // ===== 참조 데이터 (카테고리·국가·대륙) =====
  const { dbCategories, countries, historicalCountries, continents } =
    useCatalogReferenceData()

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
  )

  // ===== Feature: 계층 / 직책 =====
  const {
    expandedEventIds,
    setExpandedEventIds,
    toggleEventExpansion,
    flattenedHierarchy,
    // matchedCount는 여기서 쓰지 않는다 — 북마크 필터 이후 기준으로 다시 세는
    // visibleMatchedCount가 헤더의 단일 출처다(아래 참조).
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
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    resolveDefaultViewMode(searchParams.get('view')),
  )
  /**
   * 뷰 전환(시간↔카테고리↔타임라인 등)은 전체 pivot을 같은 events로 다시 그리는
   * *무거운 동기 재렌더*다(특히 가상화 안 된 뷰). 사용자 클릭은 startTransition으로
   * 비긴급 처리해 전환 중에도 버튼/UI가 멈추지 않게 한다. URL→state 동기화 경로는
   * 그대로 raw setViewMode를 사용한다.
   */
  const [, startViewTransition] = useTransition()
  const changeViewMode = useCallback(
    (next: ViewMode) => startViewTransition(() => setViewMode(next)),
    [],
  )
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get('event'),
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
  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') ?? '')
  const debouncedKeyword = useDebouncedValue(keywordInput, 250)
  const isSearchPending = debouncedKeyword !== keywordInput
  useEffect(() => {
    setKeyword(debouncedKeyword)
    // setKeyword는 useEventFilters 내부의 setter — 안정적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword])

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
  } = useCatalogModals()

  // ===== 사건 선택 시 최근 본 목록에 추가 =====
  useEffect(() => {
    if (selectedEventId) {
      addRecentEvent(selectedEventId)
    }
  }, [selectedEventId, addRecentEvent])

  // ===== id 기반 lookup map =====
  const { eventByIdMap, nodeIndexMap } = useCatalogEventIndex(events)

  // ===== URL ↔ 상태 동기화 =====
  useCatalogUrlSync({
    searchParams,
    setSearchParams,
    keywordInput,
    selectedEventId,
    bookmarksOnly,
    selectedCategory,
    selectedCountry,
    selectedContinent,
    selectedCentury,
    sortBy,
    sortDirection,
    showFlatView,
    viewMode,
    pageSize,
    setKeywordInput,
    setSelectedEventId,
    setBookmarksOnly,
    setSelectedCategory,
    setSelectedCountry,
    setSelectedContinent,
    setSelectedCentury,
    setSortBy,
    setSortDirection,
    setShowFlatView,
    setViewMode,
    setPageSize,
  })

  // ===== 페이지네이션 핸들러 =====
  // pageSize state 변경만으로 react-query queryKey가 바뀌어 새 페이지로 자동 fetch됨
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
  }, [])

  // ===== 북마크 필터 — flattenedHierarchy를 한 번 더 거름 =====
  const visibleFlattenedHierarchy = useMemo(() => {
    if (!bookmarksOnly) return flattenedHierarchy
    return flattenedHierarchy.filter((item) => bookmarks.has(item.node.id))
  }, [flattenedHierarchy, bookmarksOnly, bookmarks])

  /**
   * **목록이 실제로 그리는 행**만 남긴 배열.
   *
   * `visibleFlattenedHierarchy`는 접힌 부모의 자손까지 포함한 *완전한* 모집단이다
   * (타임라인·격자·지도·통계·트리·갤러리·JSON 내보내기가 그 완전한 모집단을 받아야
   * 목록의 접기 조작이 다른 화면의 데이터를 지우지 않는다 — 검토 CR-1).
   * 목록 렌더·표시 카운트·드로어 이전/다음은 이 걸러진 배열을 쓴다.
   */
  const listRenderedHierarchy = useMemo(
    () => visibleFlattenedHierarchy.filter((item) => !item.isCollapsedAway),
    [visibleFlattenedHierarchy],
  )

  /**
   * 헤더 '조건 일치 N건'의 모수 — **화면에 실제로 남은 행** 기준.
   *
   * useEventHierarchy가 주는 matchedCount는 북마크 필터를 적용하기 *전* 배열을 센다.
   * 북마크만 켜면 목록은 0행인데 헤더는 '조건 일치 233건'이라고 말하고, 심지어
   * '등록 전체 148건(최상위)'보다 큰 숫자가 나왔다(실측 확인).
   * 북마크는 여기서만 적용되므로 카운트도 여기서 다시 세는 것이 유일한 정합 지점이다.
   */
  const visibleMatchedCount = useMemo(
    () => listRenderedHierarchy.filter((item) => item.isMatch).length,
    [listRenderedHierarchy],
  )

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

  /** 목록 그룹핑 — 위젯과 같은 함수를 써야 '보이는 행' 판정이 화면과 어긋나지 않는다. */
  const yearBuckets = useMemo(
    () => buildYearBuckets(listRenderedHierarchy, sortDirection),
    [listRenderedHierarchy, sortDirection],
  )

  /**
   * 화면에 실제로 렌더되는 행 — 계층 접힘 + 세기/연도 밴드 접힘을 모두 반영.
   * ↑↓ 키(DOM 렌더 행 기준)와 드로어 이전/다음이 이 하나의 집합을 공유한다.
   */
  const navigableItems = useMemo(
    () =>
      viewMode === VIEW_MODES.LIST
        ? selectVisibleRows(
            listRenderedHierarchy,
            yearBuckets,
            collapsedYears,
            collapsedCenturies,
          )
        : listRenderedHierarchy,
    [
      viewMode,
      listRenderedHierarchy,
      yearBuckets,
      collapsedYears,
      collapsedCenturies,
    ],
  )

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
    selectedEventId,
    clearSelectedEvent,
  })
  useCatalogListNavigation({
    setSelectedEventId,
    navigate,
    // 목록 뷰에서, 오버레이가 닫혀 있을 때만. 다른 뷰·모달 위에서는 리스너를 아예
    // 걸지 않아 브라우저 기본 키 동작(스크롤·select 조작)을 되돌려준다.
    enabled: viewMode === VIEW_MODES.LIST && !anyOverlayOpen,
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
      null
    )
  }, [selectedEventId, eventByIdMap, nodeIndexMap])

  const selectedNode = useMemo<EventHierarchyNode | null>(() => {
    if (!selectedEventId) return null
    return nodeIndexMap.get(selectedEventId)?.node ?? null
  }, [selectedEventId, nodeIndexMap])

  const summaryNode = useMemo<EventHierarchyNode | null>(() => {
    if (!summaryEventId) return null
    return nodeIndexMap.get(summaryEventId)?.node ?? null
  }, [summaryEventId, nodeIndexMap])

  const filtersOrSearchActive =
    hasActiveFilters || bookmarksOnly || keywordInput.trim().length > 0

  /**
   * 헤더 통계('… · 정치 47')가 쓸 사건 집합 — **총계와 같은 모수**.
   * 필터가 걸리면 조건을 만족한 사건만 센다. 아니면 로드된 전체가 곧 모수다(검토 IA-13).
   */
  const statsEvents = useMemo(() => {
    if (!filtersOrSearchActive) return events
    const matchedIds = new Set(
      listRenderedHierarchy
        .filter((item) => item.isMatch)
        .map((item) => item.node.id),
    )
    return events.filter((event) => matchedIds.has(event.id))
  }, [filtersOrSearchActive, events, listRenderedHierarchy])

  /** 로드된 최상위 사건 수 — serverTotal과 같은 모수(최상위 기준) */
  const rootLoadedCount = useMemo(
    () => events.filter((event) => !event.parentEventId).length,
    [events],
  )
  const activeFilterCount = filterSummaryChips.length + (bookmarksOnly ? 1 : 0)

  /** 필터/북마크/검색 일괄 초기화 (위젯 EmptyCatalogState에 전달) */
  const handleResetAll = useCallback(() => {
    handleResetFilters()
    setKeywordInput('')
    setBookmarksOnly(false)
  }, [handleResetFilters])

  // ===== 자식으로 전달되는 핸들러 — useCallback으로 ref 안정화 =====
  const handleExpandEvent = useCallback((eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
  }, [setExpandedEventIds])
  const toggleShowFlatView = useCallback(
    () => setShowFlatView((v) => !v),
    [setShowFlatView],
  )
  const toggleBookmarksOnly = useCallback(
    () => setBookmarksOnly((v) => !v),
    [],
  )
  const handleCreateEvent = useCallback(
    () => navigate(pathKeys.events.create()),
    [navigate],
  )
  const handleExportJson = useCallback(async () => {
    const exported = visibleFlattenedHierarchy.map(
      (it) =>
        eventByIdMap.get(it.node.id) ??
        nodeIndexMap.get(it.node.id)?.rootEvent ??
        null,
    )
    // 현재 화면은 로드·필터된 일부만 → 전체보다 적으면 부분 내보내기임을 확인.
    // serverTotal은 *최상위(parentEventId=null)* 개수이므로, 부분 여부 판정은
    // 로드된 *최상위* 수(depth 0)로 비교해야 한다. exportedCount(하위 포함)로 비교하면
    // 자식이 많을 때 exportedCount>serverTotal이 되어 부분 경고가 조용히 억제됐다.
    const exportedCount = exported.filter(Boolean).length
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
    exportEventsAsJson(exported)
  }, [visibleFlattenedHierarchy, eventByIdMap, nodeIndexMap, serverTotal])

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
   */
  let activeSlot: React.ReactNode
  switch (viewMode) {
    case VIEW_MODES.MAP:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventMapView
            flattenedHierarchy={visibleFlattenedHierarchy}
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
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.DASHBOARD:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventDashboardView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
            serverTotal={serverTotal}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.TREE:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventTreeView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.GALLERY:
      activeSlot = (
        <Suspense fallback={lazyFallback}>
          <EventGalleryView
            flattenedHierarchy={visibleFlattenedHierarchy}
            events={events}
            selectedEventId={selectedEventId}
            dbCategories={dbCategories}
            onSelectEvent={setSelectedEventId}
          />
        </Suspense>
      )
      break
    case VIEW_MODES.LIST:
      activeSlot = (
        <EventCompactList
          isLoading={isLoading && events.length === 0}
          // 목록은 접힘으로 숨긴 행을 뺀 배열만 받는다. 완전한 모집단은 다른 뷰·내보내기 몫.
          flattenedHierarchy={listRenderedHierarchy}
          events={events}
          expandedEventIds={expandedEventIds}
          selectedEventId={selectedEventId}
          sortDirection={sortDirection}
          hasActiveFilters={filtersOrSearchActive}
          activeFilterChips={
            bookmarksOnly
              ? [
                  ...filterSummaryChips,
                  {
                    key: 'bookmarks',
                    label: '북마크만',
                    onClear: () => setBookmarksOnly(false),
                  },
                ]
              : filterSummaryChips
          }
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
          onResetFilters={handleResetAll}
          onToggleBookmark={handleToggleBookmark}
          onScroll={handleScroll}
          pageSize={pageSize}
        />
      )
      break
    case VIEW_MODES.TIMELINE:
    default:
      activeSlot = (
        <EventTimeline
          flattenedHierarchy={visibleFlattenedHierarchy}
          events={events}
          selectedEventId={selectedEventId}
          dbCategories={dbCategories}
          continents={continents}
          countries={countries}
          onSelectEvent={setSelectedEventId}
          hasMore={hasMore}
          isFetchingMore={isFetchingNextPage}
          onLoadMore={fetchMoreEvents}
          loadMoreFailed={loadMoreFailed}
          isLoading={isLoading && events.length === 0}
          wideMode={wideMode}
        />
      )
  }

  const handleAfterDelete = useCallback(
    (deletedId: string) => {
      // 선택 해제 + React Query 캐시 invalidate (페이지 reload 회피)
      // 목록(['events'])과 헤더 총개수(['events-count']) 모두 무효화 — 안 하면
      // 삭제 후 헤더 "전체 N건"이 staleTime 동안 옛 값을 유지.
      if (selectedEventId === deletedId) setSelectedEventId(null)
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      queryClient.invalidateQueries({ queryKey: eventKeys.count() })
    },
    [selectedEventId, queryClient],
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
      selectedEvent={selectedEvent}
      selectedNode={selectedNode}
      dbCategories={dbCategories}
      onSelectEvent={setSelectedEventId}
      onExpandEvent={handleExpandEvent}
      onShowSummary={openSummary}
      onAfterDelete={handleAfterDelete}
      onPrev={onDrawerPrev}
      onNext={onDrawerNext}
      // 선택은 살아 있는데 화면에 보이는 행 목록에 없다 = 필터·검색·북마크로 잘려나간 상태.
      isOutOfScope={Boolean(selectedEventId) && selectedIndex === -1}
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
    setShowCategoryModal,
    setShowCountryModal,
    toggleShowFlatView,
    setSelectedCentury,
    onSelectCategory: setSelectedCategory,
    onSelectCountry: setSelectedCountry,
    onSelectContinent: setSelectedContinent,
    bookmarksOnly,
    toggleBookmarksOnly,
    bookmarksCount: bookmarks.size,
    recentEventIds: recentEvents,
    events,
    onSelectEvent: setSelectedEventId,
    onExportJson: handleExportJson,
    onOpenShortcutHelp: openShortcutHelp,
    onCreateEvent: handleCreateEvent,
    filterSummaryChips,
    activeFilterCount,
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
  }

  const overlayModalProps = {
    shortcutHelpOpen,
    closeShortcutHelp,
    showSummaryModal,
    setShowSummaryModal,
    summaryNode,
  }

  const content = (
    <>
      {/* 집중(넓게) 보기에선 페이지 헤더를 접어 본문에 높이 양보 */}
      {wideMode ? null : embed ? (
        <PageStyles.EmbedHeader>
          연대표
          {countryId && (
            <PageStyles.EmbedHeaderHint>
              · 선택한 국가에 연관된 사건
            </PageStyles.EmbedHeaderHint>
          )}
        </PageStyles.EmbedHeader>
      ) : (
        <PageStyles.PageHeader>
          <PageStyles.PageHeaderTitleGroup>
            <PageStyles.PageHeaderTitle>사건 연대표</PageStyles.PageHeaderTitle>
            {countryId && (
              <PageStyles.PageHeaderSubtitle>
                선택한 국가에 연관된 역사적 사건
              </PageStyles.PageHeaderSubtitle>
            )}
          </PageStyles.PageHeaderTitleGroup>
        </PageStyles.PageHeader>
      )}

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
          matchedCount={visibleMatchedCount}
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
          activeSlot={activeSlot}
        />
        {selectedEventId && (
          <CatalogDetailDrawer
            open
            onClose={clearSelectedEvent}
            title={selectedEvent?.title ?? selectedNode?.title ?? null}
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
      {embed ? (
        <PageStyles.EmbedWrapper>{content}</PageStyles.EmbedWrapper>
      ) : (
        <Layout.PageScene>
          <Layout.PageWrapper>{content}</Layout.PageWrapper>
        </Layout.PageScene>
      )}

      {/* 모바일 우하단 FAB — embed 모드에선 부모가 자체 CTA를 가질 가능성이 높아 미렌더 */}
      {!embed && (
        <Layout.CreateEventFab
          type="button"
          aria-label="새 사건 등록"
          onClick={handleCreateEvent}
        >
          <FiPlus size={24} aria-hidden="true" />
        </Layout.CreateEventFab>
      )}

      <CatalogEntityFilterModals {...entityFilterModalProps} />
      <CatalogOverlayModals {...overlayModalProps} />
    </>
  )
}

export default EventsCatalogPage
