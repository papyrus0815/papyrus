import React, { useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiFileText,
  FiFilter,
  FiGitBranch,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiTarget,
  FiUserCheck,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import {
  extractCategoryKey,
  isMilitaryCategory,
} from '@/features/event-create/lib'
import {
  FILTER_ALL,
  SORT_OPTIONS,
  SUMMARY_VIEW_MODES,
  type SortOption,
  type SummaryViewMode,
  VIEW_MODES,
  type ViewMode,
  getCategoryName,
} from '@/features/event-list/lib'
import {
  type EventCategoryDto,
  getAllEventCategories,
} from '@/shared/api/event-categories'
import { getAllEvents } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import {
  CategoryModal,
  EventDetailPanel,
  SimpleSelectModal,
  TreeView,
} from '@/widgets/event-list/ui'

import { CATEGORY_ICON_MAP } from '../create/events.constants'
import {
  EventHierarchyNode,
  EventMapMarker,
  HistoricalEvent,
  HistoricalEventCategory,
} from '../create/events.types'
import * as Detail from '../styles/detail.styles'
import * as Filter from '../styles/filter.styles'
// Styled Components Imports
import * as Layout from '../styles/layout.styles'
import * as List from '../styles/list.styles'
import * as Modal from '../styles/modal.styles'
import * as Skeleton from '../styles/skeleton.styles'
import { CATEGORY_COLORS } from '../styles/theme'
import {
  formatCenturyLabel,
  formatCenturyRange,
  formatCompactNumber,
  formatDateRange,
  getCenturyFromDate,
} from '../utils/events.utils'

type CenturyFilter = typeof FILTER_ALL | number
type FilterChip = {
  key: string
  label: string
  onClear: () => void
}

const projectCoordinates = (marker: EventMapMarker) => {
  const clampedLat = Math.max(-60, Math.min(80, marker.coordinates.lat))
  const clampedLng = Math.max(-180, Math.min(180, marker.coordinates.lng))

  const top = ((90 - clampedLat) / 180) * 100
  const left = ((clampedLng + 180) / 360) * 100

  return { top: `${top}%`, left: `${left}%` }
}

export const EventsCatalogPage: React.FC = () => {
  const navigate = useNavigate()

  // ===== 카테고리 (DB 데이터) =====
  const [dbCategories, setDbCategories] = useState<EventCategoryDto[]>([])
  const [selectedCategory, setSelectedCategory] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)

  // ===== 필터 상태 =====
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.RECENT)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.GRID)
  const [selectedCentury, setSelectedCentury] =
    useState<CenturyFilter>(FILTER_ALL)
  const [selectedCountry, setSelectedCountry] = useState<
    typeof FILTER_ALL | string
  >(FILTER_ALL)
  const [showFlatView, setShowFlatView] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  )
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null)
  const [summaryViewMode] = useState<SummaryViewMode>(
    SUMMARY_VIEW_MODES.TREE,
  )
  const [events, setEvents] = useState<HistoricalEvent[]>([])

  // DB 카테고리 로드
  useEffect(() => {
    getAllEventCategories()
      .then((categories) => {
        console.log('✅ 카테고리 목록 로드:', categories)
        setDbCategories(categories)
      })
      .catch((error) => {
        console.error('❌ 카테고리 로드 실패:', error)
        setDbCategories([])
      })
  }, [])

  // 실제 API에서 이벤트 데이터 불러오기 (연대표/역대 수반은 국가 페이지에서만 사용)
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      try {
        const response = await getAllEvents()
        console.log('📦 API 응답 (전체):', response)
        console.log('📦 첫 번째 이벤트 상세:', response[0])

        // API 응답을 HistoricalEvent 타입으로 변환
        const allEvents: HistoricalEvent[] = []

        // 1️⃣ 먼저 모든 이벤트를 Map으로 인덱싱 (빠른 조회를 위해)
        type EventResponse = (typeof response)[0]
        const eventMap = new Map<string, EventResponse>()
        response.forEach((event: EventResponse) => {
          eventMap.set(event.id, event)
        })

        // 2️⃣ 재귀적으로 전체 트리를 구축하는 함수 (API 응답 기반)
        const buildFullHierarchy = (eventId: string): EventResponse | null => {
          const event = eventMap.get(eventId)
          if (!event) return null

          // 자식 이벤트 ID 수집: childEvents + parentEventId로 연결된 모든 자식
          const childIds = new Set<string>()

          // childEvents에서 ID 수집
          if (event.childEvents) {
            event.childEvents.forEach((child: EventResponse) =>
              childIds.add(child.id),
            )
          }

          // parentEventId가 현재 이벤트를 가리키는 모든 이벤트 찾기
          response.forEach((evt: EventResponse) => {
            if (evt.parentEventId === eventId) {
              childIds.add(evt.id)
            }
          })

          // 재귀적으로 자식들의 전체 트리 구축
          const fullChildEvents = Array.from(childIds)
            .map((childId) => buildFullHierarchy(childId))
            .filter(
              (child): child is NonNullable<typeof child> => child !== null,
            )

          return {
            ...event,
            childEvents:
              fullChildEvents.length > 0 ? fullChildEvents : undefined,
          }
        }

        // 3️⃣ 최상위 이벤트만 필터링하여 처리
        response
          .filter((event: EventResponse) => !event.parentEventId)
          .forEach((event: EventResponse) => {
            // 전체 트리가 구축된 이벤트 가져오기
            const fullEvent = buildFullHierarchy(event.id)
            if (!fullEvent) return

            console.log(
              '🔍 Event:',
              fullEvent.title,
              'Category 객체:',
              fullEvent.category,
              'Category ID:',
              fullEvent.categoryId,
              'Parent:',
              fullEvent.parentEventId,
              'Children:',
              fullEvent.childEvents?.length || 0,
            )

            // ===== FSD: 카테고리 ID 직접 사용 =====
            const categoryId = fullEvent.category?.id || 'cat-other-001'
            const categoryKey = extractCategoryKey(categoryId)

            console.log(
              '✅ Category for',
              fullEvent.title,
              ':',
              categoryKey,
              '(ID:',
              categoryId,
              ', name:',
              fullEvent.category?.name,
              ')',
            )

            // 재귀적으로 hierarchy를 구축하는 헬퍼 함수
            const buildHierarchy = (
              evt: typeof fullEvent,
            ): EventHierarchyNode => {
              return {
                id: evt.id,
                title: evt.title,
                summary: evt.description || '',
                period: {
                  start: evt.startDate || new Date().toISOString(),
                  end: evt.endDate === null ? undefined : evt.endDate,
                },
                importance: 'notable' as const,
                // 재귀적으로 자식의 자식까지 모두 처리
                children: evt.childEvents?.map((child) =>
                  buildHierarchy(child),
                ),
              }
            }

            // 이벤트를 HistoricalEvent로 변환하는 헬퍼 함수
            const convertToHistoricalEvent = (
              evt: typeof fullEvent,
              isChild: boolean = false,
            ): HistoricalEvent => {
              // ===== FSD: 카테고리 ID 사용 =====
              const evtCategoryId = evt.category?.id || 'cat-other-001'
              const evtCategoryKey = extractCategoryKey(evtCategoryId)

              return {
                id: evt.id,
                title: evt.title,
                type: 'battle' as const,
                category: evtCategoryKey as HistoricalEventCategory,
                description: evt.description || '',
                startDate: evt.startDate || new Date().toISOString(),
                endDate: evt.endDate || undefined,
                location: evt.location || undefined,
                tags: [],
                background: evt.background || '',
                aftermath: evt.aftermath || '',
                stats: {
                  casualties: {
                    total: 0,
                    civilians: 0,
                    military: 0,
                  },
                  participatingNations: 0,
                  theaters: 0,
                  durationInYears: 0,
                },
                // 재귀적으로 전체 hierarchy 구축
                hierarchy: buildHierarchy(evt),
                timeline: [],
                theaters: [],
                keyFigures: [],
                countries: [],
                influence: [],
                visuals: {
                  heroImageUrl: evt.thumbnail || '',
                  thumbnailUrl: evt.thumbnail || '',
                  gallery: [],
                },
                map: {
                  summary: '',
                  markers: [],
                },
                quickFacts: {
                  commandStructure: '',
                  decisiveTechnology: '',
                  intelligenceNotes: '',
                  logisticalScale: '',
                },
                // 자식 여부 표시
                parentEventId: isChild
                  ? evt.parentEventId || undefined
                  : undefined,
                sectionTitles: evt.sectionTitles,
                relatedCountries: evt.relatedCountries,
                relatedHistoricalCountries: evt.relatedHistoricalCountries,
              }
            }

            // 재귀적으로 모든 자식 이벤트를 수집하는 함수
            const collectAllDescendants = (
              evt: typeof fullEvent,
              descendants: (typeof fullEvent)[] = [],
            ): (typeof fullEvent)[] => {
              if (evt.childEvents && evt.childEvents.length > 0) {
                evt.childEvents.forEach((child) => {
                  descendants.push(child)
                  // 재귀: 자식의 자식도 수집
                  collectAllDescendants(child, descendants)
                })
              }
              return descendants
            }

            // ✅ 부모 이벤트 추가
            const parentEventData = convertToHistoricalEvent(fullEvent, false)
            allEvents.push(parentEventData)

            // ✅ 모든 하위 이벤트들을 재귀적으로 수집하여 추가
            const allDescendants = collectAllDescendants(fullEvent)
            allDescendants.forEach((descendant) => {
              const descendantData = convertToHistoricalEvent(descendant, true)
              allEvents.push(descendantData)
            })
          })

        setEvents(allEvents)
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const availableCountries = useMemo(() => {
    const countries = new Set<string>()

    events.forEach((event) => {
      event.countries.forEach((country) => countries.add(country.name))
    })

    return Array.from(countries).sort((countryA, countryB) =>
      countryA.localeCompare(countryB, 'ko'),
    )
  }, [events])

  const availableCenturies = useMemo(() => {
    const centuries = new Set<number>()

    events.forEach((event) => {
      const startCentury = getCenturyFromDate(event.startDate)
      const endCentury = getCenturyFromDate(event.endDate)

      if (startCentury) {
        centuries.add(startCentury)
      }
      if (endCentury) {
        centuries.add(endCentury)
      }
    })

    return Array.from(centuries).sort(
      (centuryA, centuryB) => centuryA - centuryB,
    )
  }, [events])

  const totalCasualties = events.reduce(
    (acc, event) => acc + event.stats.casualties.total,
    0,
  )
  const totalNations = events.reduce(
    (acc, event) => acc + event.stats.participatingNations,
    0,
  )
  const avgDurationInYears = useMemo(() => {
    if (events.length === 0) {
      return 0
    }

    const totalDuration = events.reduce(
      (acc, event) => acc + event.stats.durationInYears,
      0,
    )
    return Math.round(totalDuration / events.length)
  }, [events])
  const uniqueTagCount = useMemo(() => {
    const tags = new Set<string>()
    events.forEach((event) => {
      event.tags.forEach((tag) => tags.add(tag))
    })
    return tags.size
  }, [events])

  // =====  카테고리 카운트 =====
  const categoryCounts = useMemo(() => {
    return events.reduce<Record<HistoricalEventCategory, number>>(
      (acc, event) => {
        acc[event.category] = (acc[event.category] ?? 0) + 1
        return acc
      },
      {
        military: 0,
        political: 0,
        economic: 0,
        social: 0,
        technological: 0,
        cultural: 0,
        diplomatic: 0,
        conference: 0,
        religious: 0,
        other: 0,
      },
    )
  }, [events])

  const trimmedKeyword = keyword.trim()
  const normalizedKeyword = trimmedKeyword.toLowerCase()
  const filteredEvents = useMemo(() => {
    // ✅ 부모 이벤트만 필터링 (parentEventId가 없는 것만)
    return events
      .filter((event) => !event.parentEventId)
      .filter((event) => {
        const categoryOk =
          selectedCategory === FILTER_ALL || event.category === selectedCategory
        const keywordOk =
          normalizedKeyword.length === 0 ||
          event.title.toLowerCase().includes(normalizedKeyword) ||
          event.description.toLowerCase().includes(normalizedKeyword) ||
          event.tags.some((tag) =>
            tag.toLowerCase().includes(normalizedKeyword),
          )
        const centuryOk = (() => {
          if (selectedCentury === FILTER_ALL) {
            return true
          }
          const startCentury = getCenturyFromDate(event.startDate)
          const endCentury = getCenturyFromDate(event.endDate)
          return (
            startCentury === selectedCentury || endCentury === selectedCentury
          )
        })()
        const countryOk =
          selectedCountry === FILTER_ALL ||
          event.countries.some((country) => country.name === selectedCountry)

        return categoryOk && keywordOk && centuryOk && countryOk
      })
  }, [
    events,
    selectedCategory,
    normalizedKeyword,
    selectedCentury,
    selectedCountry,
  ])

  // ===== 이벤트 정렬 =====
  const sortedEvents = useMemo(() => {
    const eventsCopy = [...filteredEvents]

    return eventsCopy.sort((eventA, eventB) => {
      let comparison = 0

      switch (sortBy) {
        case 'recent':
          comparison =
            new Date(eventA.startDate).getTime() -
            new Date(eventB.startDate).getTime()
          break
        case 'duration':
          comparison =
            eventA.stats.durationInYears - eventB.stats.durationInYears
          break
        default:
          comparison =
            new Date(eventA.startDate).getTime() -
            new Date(eventB.startDate).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredEvents, sortBy, sortDirection])

  // ===== 필터 칩 생성 (선언적 방식) =====
  const filterSummaryChips: FilterChip[] = [
    selectedCategory !== FILTER_ALL && {
      key: 'category',
      label: `카테고리 · ${
        dbCategories.find((cat) => cat.id === selectedCategory)?.name ||
        '알 수 없음'
      }`,
      onClear: () => setSelectedCategory(FILTER_ALL),
    },
    selectedCountry !== FILTER_ALL && {
      key: 'country',
      label: `국가 · ${selectedCountry}`,
      onClear: () => setSelectedCountry(FILTER_ALL),
    },
    trimmedKeyword.length > 0 && {
      key: 'keyword',
      label: `검색어 · ${trimmedKeyword}`,
      onClear: () => setKeyword(''),
    },
  ].filter((chip): chip is FilterChip => Boolean(chip))

  // ===== 필터 활성 여부 =====
  const hasActiveFilters = filterSummaryChips.length > 0

  // ===== 필터 초기화 =====
  const handleResetFilters = () => {
    setSelectedCategory(FILTER_ALL)
    setKeyword('')
    setSortBy('recent')
    setSelectedCentury(FILTER_ALL)
    setSelectedCountry(FILTER_ALL)
  }

  const toggleYearCollapse = (year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

  // ===== 선택된 이벤트 정보 =====
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null

    // 먼저 events에서 직접 찾기
    const directEvent = events.find((event) => event.id === selectedEventId)
    if (directEvent) return directEvent

    // hierarchy에서 찾기
    const findInHierarchy = (
      node: EventHierarchyNode,
      parentEvent: HistoricalEvent,
    ): HistoricalEvent | null => {
      if (node.id === selectedEventId) return parentEvent
      if (node.children) {
        for (const child of node.children) {
          const found = findInHierarchy(child, parentEvent)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findInHierarchy(event.hierarchy, event)
      if (found) return found
    }

    return null
  }, [selectedEventId, events])

  // ===== 선택된 노드 정보 =====
  const selectedNode = useMemo(() => {
    if (!selectedEventId) return null

    const findNode = (node: EventHierarchyNode): EventHierarchyNode | null => {
      if (node.id === selectedEventId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findNode(event.hierarchy)
      if (found) return found
    }

    return null
  }, [selectedEventId, events])

  // ===== 요약 노드 정보 =====
  const summaryNode = useMemo(() => {
    if (!summaryEventId) return null

    const findNode = (node: EventHierarchyNode): EventHierarchyNode | null => {
      if (node.id === summaryEventId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child)
          if (found) return found
        }
      }
      return null
    }

    for (const event of events) {
      const found = findNode(event.hierarchy)
      if (found) return found
    }

    return null
  }, [summaryEventId, events])

  // ===== 요약 부모 이벤트 정보 =====
  const summaryParentEvent = useMemo(() => {
    if (!summaryEventId) return null
    return events.find((event) => event.id === summaryEventId)
  }, [summaryEventId, events])

  // hierarchy를 flatten하여 리스트로 만들기
  const flattenedHierarchy = useMemo(() => {
    const result: Array<{
      node: EventHierarchyNode
      depth: number
      parentEvent: HistoricalEvent | null
    }> = []

    if (showFlatView) {
      // 플랫 뷰: 모든 사건을 depth 0으로 평평하게 표시
      events.forEach((event) => {
        result.push({
          node: event.hierarchy,
          depth: 0,
          parentEvent: event,
        })
      })
    } else {
      // 계층 뷰: 기존 로직
      const traverse = (
        node: EventHierarchyNode,
        depth: number,
        parentEvent: HistoricalEvent | null,
      ) => {
        result.push({ node, depth, parentEvent })

        // 펼쳐진 경우에만 자식 노드 추가
        if (expandedEventIds.has(node.id) && node.children) {
          const childParentEvent =
            events.find((e) => e.id === node.id) ?? parentEvent
          node.children.forEach((child) => {
            traverse(child, depth + 1, childParentEvent)
          })
        }
      }

      sortedEvents.forEach((event) => {
        traverse(event.hierarchy, 0, event)
      })
    }

    return result
  }, [sortedEvents, expandedEventIds, events, showFlatView])

  // 연대표/역대 수반은 국가 페이지에서만 사용. 사건 리스트에서는 미사용.
  const tenureGroups = useMemo(() => [], [])
  return (
    <Layout.PageScene>
      <Layout.PageWrapper>
        <Layout.PageTopBar>
          <Layout.PageTopTitle>
            <h1>역사적 사건</h1>
            <p>시대별 주요 사건과 계층적 관계를 탐색합니다</p>
          </Layout.PageTopTitle>
          <Layout.CreateEventButton
            onClick={() => navigate(pathKeys.events.create())}
          >
            <FiPlus size={16} />새 사건 등록
          </Layout.CreateEventButton>
        </Layout.PageTopBar>

        {/* 카테고리 요약 카드 */}
        <Skeleton.CategorySummaryGrid>
          {isLoading
            ? [...Array(5)].map((_, index) => (
                <Skeleton.SkeletonCategorySummaryCard key={index}>
                  <Skeleton.SkeletonIconBubble />
                  <div style={{ flex: 1 }}>
                    <Skeleton.SkeletonText $width="60%" />
                    <div style={{ marginTop: '8px' }}>
                      <Skeleton.SkeletonText $width="40%" />
                    </div>
                  </div>
                </Skeleton.SkeletonCategorySummaryCard>
              ))
            : dbCategories.map((dbCat) => {
                const categoryKey = extractCategoryKey(dbCat.id)
                const Icon =
                  CATEGORY_ICON_MAP[dbCat.name] ||
                  CATEGORY_ICON_MAP[categoryKey] ||
                  FiFileText

                return (
                  <Skeleton.CategorySummaryCard
                    key={dbCat.id}
                    $category={categoryKey as HistoricalEventCategory}
                  >
                    <Skeleton.CategoryIconBubble
                      $category={categoryKey as HistoricalEventCategory}
                    >
                      <Icon />
                    </Skeleton.CategoryIconBubble>
                    <Skeleton.CategorySummaryContent>
                      <Skeleton.CategorySummaryTitle>
                        {dbCat.name}
                      </Skeleton.CategorySummaryTitle>
                      <Skeleton.CategorySummaryCount>
                        {categoryCounts[
                          categoryKey as HistoricalEventCategory
                        ] ?? 0}
                        건
                      </Skeleton.CategorySummaryCount>
                      <Skeleton.CategorySummaryTagline
                        $category={categoryKey as HistoricalEventCategory}
                      >
                        {CATEGORY_COLORS[categoryKey]?.tagline ||
                          dbCat.description ||
                          ''}
                      </Skeleton.CategorySummaryTagline>
                    </Skeleton.CategorySummaryContent>
                  </Skeleton.CategorySummaryCard>
                )
              })}
        </Skeleton.CategorySummaryGrid>

        <Layout.CatalogSplit>
          {/* 좌측: 필터 + 세기 선택 */}
          <Filter.FilterColumn>
            {/* 통합된 필터 블록 */}
            <Filter.FilterBlock>
              <Filter.FilterBlockLabel>필터</Filter.FilterBlockLabel>

              {/* 검색 */}
              <Filter.FilterSearchInput
                type="search"
                placeholder="사건명, 태그 검색"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />

              {/* 카테고리 */}
              <Filter.FilterTriggerButton
                type="button"
                onClick={() => setShowCategoryModal(true)}
                style={{ marginTop: '10px' }}
              >
                <span>
                  {selectedCategory === FILTER_ALL
                    ? '전체 카테고리'
                    : dbCategories.find((cat) => cat.id === selectedCategory)
                        ?.name || '알 수 없음'}
                </span>
                <FiChevronRight size={14} />
              </Filter.FilterTriggerButton>

              {/* 국가 */}
              <Filter.FilterTriggerButton
                type="button"
                onClick={() => setShowCountryModal(true)}
                style={{ marginTop: '6px' }}
              >
                <span>
                  {selectedCountry === FILTER_ALL
                    ? '전체 국가'
                    : selectedCountry}
                </span>
                <FiChevronRight size={14} />
              </Filter.FilterTriggerButton>

              {/* 계층 분리 토글 */}
              <Filter.FilterToggle style={{ marginTop: '12px' }}>
                <Filter.FilterToggleLabel>
                  계층 구조 해제
                </Filter.FilterToggleLabel>
                <Filter.Switch
                  type="button"
                  $active={showFlatView}
                  onClick={() => {
                    setShowFlatView(!showFlatView)
                  }}
                >
                  <Filter.SwitchThumb $active={showFlatView} />
                </Filter.Switch>
              </Filter.FilterToggle>
            </Filter.FilterBlock>

            {hasActiveFilters && (
              <Filter.FilterResetButton
                type="button"
                onClick={handleResetFilters}
              >
                <FiX size={14} />
                초기화
              </Filter.FilterResetButton>
            )}

            <Filter.FilterDivider />

            <Filter.CenturyHeader>
              <Filter.CenturyTitle>시대 선택</Filter.CenturyTitle>
              <Filter.CenturyCount>
                {isLoading ? '...' : `${availableCenturies.length}개`}
              </Filter.CenturyCount>
            </Filter.CenturyHeader>
            {isLoading ? (
              <Filter.CenturyList>
                {[...Array(6)].map((_, index) => (
                  <Skeleton.SkeletonCenturyButton key={index}>
                    <Skeleton.SkeletonCenturyLabel />
                    <Skeleton.SkeletonCenturyCount />
                  </Skeleton.SkeletonCenturyButton>
                ))}
              </Filter.CenturyList>
            ) : (
              <Filter.CenturyList>
                <Filter.CenturyButton
                  $active={selectedCentury === FILTER_ALL}
                  type="button"
                  onClick={() => setSelectedCentury('all')}
                >
                  <Filter.CenturyLabel>
                    <strong>전체 시대</strong>
                    <span>모든 연대</span>
                  </Filter.CenturyLabel>
                  <Filter.CenturyEventCount>
                    {events.length}건
                  </Filter.CenturyEventCount>
                </Filter.CenturyButton>
                {availableCenturies.map((century) => {
                  const centuryEvents = events.filter((event) => {
                    const startCentury = getCenturyFromDate(event.startDate)
                    const endCentury = getCenturyFromDate(event.endDate)
                    return startCentury === century || endCentury === century
                  })
                  return (
                    <Filter.CenturyButton
                      key={century}
                      $active={selectedCentury === century}
                      type="button"
                      onClick={() => setSelectedCentury(century)}
                    >
                      <Filter.CenturyLabel>
                        <strong>{formatCenturyLabel(century)}</strong>
                        <span>{formatCenturyRange(century)}</span>
                      </Filter.CenturyLabel>
                      <Filter.CenturyEventCount>
                        {centuryEvents.length}건
                      </Filter.CenturyEventCount>
                    </Filter.CenturyButton>
                  )
                })}
              </Filter.CenturyList>
            )}
          </Filter.FilterColumn>

          {/* 중앙: 간결한 사건 목록 */}
          <List.CatalogSection>
            <List.ResultControls>
              <List.ToolbarMeta>
                <span>{sortedEvents.length}건</span>
              </List.ToolbarMeta>
              <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <List.SortSelect
                  value={sortBy}
                  aria-label="정렬 기준 선택"
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSortBy(e.target.value as SortOption)
                  }}
                >
                  <option value="recent">최근 발생 순</option>
                  <option value="duration">장기 지속 순</option>
                </List.SortSelect>
                <List.SortDirectionToggle
                  type="button"
                  onClick={() =>
                    setSortDirection((prev) =>
                      prev === 'asc' ? 'desc' : 'asc',
                    )
                  }
                >
                  {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                </List.SortDirectionToggle>
              </div>
            </List.ResultControls>

            {isLoading ? (
              <List.CompactList>
                {[...Array(8)].map((_, index) => {
                  const depth = index % 3
                  return (
                    <Skeleton.SkeletonListItem key={index} $depth={depth}>
                      <Skeleton.SkeletonThumbnail $depth={depth} />
                      <div style={{ flex: 1, padding: '12px 14px 12px 0' }}>
                        <Skeleton.SkeletonHeader>
                          <Skeleton.SkeletonExpandButton />
                          <Skeleton.SkeletonDot />
                          <Skeleton.SkeletonTitle />
                        </Skeleton.SkeletonHeader>
                        <Skeleton.SkeletonMeta />
                        <Skeleton.SkeletonSummary />
                      </div>
                    </Skeleton.SkeletonListItem>
                  )
                })}
              </List.CompactList>
            ) : filteredEvents.length === 0 ? (
              <List.EmptyCatalogState>
                <List.EmptyIcon>
                  <FiFilter size={44} />
                </List.EmptyIcon>
                <List.EmptyContent>
                  <List.EmptyTitle>사건을 찾을 수 없습니다</List.EmptyTitle>
                  <List.EmptyDescription>
                    {events.length === 0
                      ? '아직 등록된 사건이 없습니다. 새로운 사건을 등록해보세요.'
                      : '검색 조건에 맞는 사건이 없습니다. 다른 조건으로 검색해보세요.'}
                  </List.EmptyDescription>
                </List.EmptyContent>
                <List.EmptyActions>
                  {hasActiveFilters && (
                    <List.EmptyResetButton onClick={handleResetFilters}>
                      <FiX size={14} />
                      필터 초기화
                    </List.EmptyResetButton>
                  )}
                  {events.length === 0 && (
                    <List.EmptyCreateButton
                      onClick={() => navigate(pathKeys.events.create())}
                    >
                      <FiPlus size={14} />새 사건 등록
                    </List.EmptyCreateButton>
                  )}
                </List.EmptyActions>
              </List.EmptyCatalogState>
            ) : (
              <List.CompactList>
                {flattenedHierarchy.map(
                  ({ node, depth, parentEvent }, index) => {
                    const hasChildren =
                      node.children && node.children.length > 0
                    const isExpanded = expandedEventIds.has(node.id)
                    // 현재 노드의 이벤트를 찾거나, 없으면 parentEvent 사용
                    const event =
                      events.find((e) => e.id === node.id) ?? parentEvent

                    if (!event) return null

                    // 년도 구분선 표시 여부 체크 (depth 0인 최상위 사건만)
                    const currentYear = new Date(
                      node.period.start,
                    ).getFullYear()
                    const prevEvent =
                      index > 0 ? flattenedHierarchy[index - 1] : null
                    const prevYear = prevEvent
                      ? new Date(prevEvent.node.period.start).getFullYear()
                      : null
                    const showYearDivider =
                      depth === 0 &&
                      (index === 0 ||
                        (prevYear !== null && currentYear !== prevYear))

                    // 이 년도가 접혀있는지 확인
                    const isYearCollapsed = collapsedYears.has(currentYear)

                    // 접힌 년도의 사건은 렌더링하지 않음 (년도 구분선만 표시)
                    if (isYearCollapsed && depth === 0) {
                      return showYearDivider ? (
                        <List.YearDivider
                          key={`year-${currentYear}`}
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault()
                            toggleYearCollapse(currentYear)
                          }}
                        >
                          <span>
                            <FiChevronRight size={14} />
                            {currentYear}년
                          </span>
                        </List.YearDivider>
                      ) : null
                    }

                    // depth 0인 사건의 실제 인덱스 찾기
                    const topLevelIndex =
                      depth === 0
                        ? flattenedHierarchy
                            .slice(0, index + 1)
                            .filter((item) => item.depth === 0).length - 1
                        : -1

                    // 이 사건이 속한 집권 기간 그룹 찾기
                    const tenureGroup =
                      depth === 0
                        ? tenureGroups.find((group) =>
                            group.eventIds.includes(node.id),
                          )
                        : null

                    // 이 사건이 그룹의 첫 번째 사건인지 확인
                    const isGroupStart =
                      showTenureMarkers &&
                      tenureGroup &&
                      tenureGroup.eventIds[0] === node.id &&
                      depth === 0

                    // 이 사건이 그룹의 마지막 사건인지 확인
                    const isGroupEnd =
                      showTenureMarkers &&
                      tenureGroup &&
                      tenureGroup.eventIds[tenureGroup.eventIds.length - 1] ===
                        node.id &&
                      depth === 0

                    // 집권 기간 그룹 표시는 제거됨 (경력/재위는 사건 리스트에 노출하지 않음)
                    const isInTenureGroup = false

                    return (
                      <React.Fragment key={node.id}>
                        {/* 년도 구분선 */}
                        {showYearDivider && (
                          <List.YearDivider
                            type="button"
                            onClick={(
                              e: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              e.preventDefault()
                              toggleYearCollapse(currentYear)
                            }}
                          >
                            <span>
                              <FiChevronDown size={14} />
                              {currentYear}년
                            </span>
                          </List.YearDivider>
                        )}

                        {isInTenureGroup ? (
                          <List.CompactListItemInTenure
                            $active={selectedEventId === node.id}
                            $depth={depth}
                            type="button"
                            onClick={(
                              e: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              e.stopPropagation()
                              setSelectedEventId(node.id)
                            }}
                          >
                            <List.CompactListBody>
                              <List.CompactThumbnail
                                $depth={depth}
                                $isEmpty={!event.visuals.thumbnailUrl}
                                style={
                                  event.visuals.thumbnailUrl
                                    ? {
                                        backgroundImage: `url(${event.visuals.thumbnailUrl})`,
                                      }
                                    : undefined
                                }
                              >
                                <List.CompactCategoryBadge
                                  $category={event.category}
                                >
                                  {getCategoryName(
                                    event.category,
                                    dbCategories,
                                  )}
                                </List.CompactCategoryBadge>
                              </List.CompactThumbnail>
                              <List.CompactListContent>
                                <List.CompactListHeader>
                                  {hasChildren ? (
                                    <List.ExpandButton
                                      type="button"
                                      onClick={(
                                        e: React.MouseEvent<HTMLButtonElement>,
                                      ) => {
                                        e.stopPropagation()
                                        toggleEventExpansion(node.id)
                                      }}
                                    >
                                      {isExpanded ? (
                                        <FiChevronDown size={14} />
                                      ) : (
                                        <FiChevronRight size={14} />
                                      )}
                                    </List.ExpandButton>
                                  ) : (
                                    <List.ExpandSpacer />
                                  )}
                                  <List.CompactCategoryDot
                                    $category={event.category}
                                    $depth={depth}
                                  />
                                  <List.CompactListTitle>
                                    {node.title}
                                    {hasChildren && depth === 0 && (
                                      <Modal.SummaryIconButton
                                        type="button"
                                        onClick={(
                                          e: React.MouseEvent<HTMLButtonElement>,
                                        ) => {
                                          e.stopPropagation()
                                          setSummaryEventId(node.id)
                                          setShowSummaryModal(true)
                                        }}
                                        title="사건 요약 보기"
                                      >
                                        <FiGitBranch size={13} />
                                      </Modal.SummaryIconButton>
                                    )}
                                  </List.CompactListTitle>
                                </List.CompactListHeader>
                                <List.CompactListMeta $depth={depth}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      width: '100%',
                                    }}
                                  >
                                    {(() => {
                                      const start = new Date(node.period.start)
                                      const end = node.period.end
                                        ? new Date(node.period.end)
                                        : null

                                      const formatFullDate = (date: Date) => {
                                        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
                                      }

                                      if (
                                        !end ||
                                        start.getTime() === end.getTime()
                                      ) {
                                        return (
                                          <span>{formatFullDate(start)}</span>
                                        )
                                      }

                                      const diffTime = Math.abs(
                                        end.getTime() - start.getTime(),
                                      )
                                      const diffDays = Math.ceil(
                                        diffTime / (1000 * 60 * 60 * 24),
                                      )

                                      const years = Math.floor(diffDays / 365)
                                      const remainingDaysAfterYears =
                                        diffDays % 365
                                      const months = Math.floor(
                                        remainingDaysAfterYears / 30,
                                      )
                                      const days = remainingDaysAfterYears % 30

                                      const parts = []
                                      if (years > 0) parts.push(`${years}년`)
                                      if (months > 0)
                                        parts.push(`${months}개월`)
                                      if (days > 0 || parts.length === 0)
                                        parts.push(`${days}일`)
                                      const durationText = parts.join(' ')

                                      return (
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              color: '#64748b',
                                            }}
                                          >
                                            {formatFullDate(start)} ~{' '}
                                            {formatFullDate(end)}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              color: '#64748b',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {durationText}
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  {node.importance === 'critical' && (
                                    <>
                                      <span>·</span>
                                      <List.ImportanceBadge>
                                        핵심
                                      </List.ImportanceBadge>
                                    </>
                                  )}
                                  {node.importance === 'major' && (
                                    <>
                                      <span>·</span>
                                      <List.ImportanceBadge $major>
                                        주요
                                      </List.ImportanceBadge>
                                    </>
                                  )}
                                </List.CompactListMeta>
                                <List.CompactListSummary $depth={depth}>
                                  {node.summary}
                                </List.CompactListSummary>
                              </List.CompactListContent>
                            </List.CompactListBody>
                          </List.CompactListItemInTenure>
                        ) : (
                          <List.CompactListItem
                            $active={selectedEventId === node.id}
                            $depth={depth}
                            type="button"
                            onClick={(
                              e: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              e.stopPropagation()
                              setSelectedEventId(node.id)
                            }}
                          >
                            <List.CompactListBody>
                              <List.CompactThumbnail
                                $depth={depth}
                                $isEmpty={!event.visuals.thumbnailUrl}
                                style={
                                  event.visuals.thumbnailUrl
                                    ? {
                                        backgroundImage: `url(${event.visuals.thumbnailUrl})`,
                                      }
                                    : undefined
                                }
                              >
                                <List.CompactCategoryBadge
                                  $category={event.category}
                                >
                                  {getCategoryName(
                                    event.category,
                                    dbCategories,
                                  )}
                                </List.CompactCategoryBadge>
                              </List.CompactThumbnail>
                              <List.CompactListContent>
                                <List.CompactListHeader>
                                  {hasChildren ? (
                                    <List.ExpandButton
                                      type="button"
                                      onClick={(
                                        e: React.MouseEvent<HTMLButtonElement>,
                                      ) => {
                                        e.stopPropagation()
                                        toggleEventExpansion(node.id)
                                      }}
                                    >
                                      {isExpanded ? (
                                        <FiChevronDown size={14} />
                                      ) : (
                                        <FiChevronRight size={14} />
                                      )}
                                    </List.ExpandButton>
                                  ) : (
                                    <List.ExpandSpacer />
                                  )}
                                  <List.CompactCategoryDot
                                    $category={event.category}
                                    $depth={depth}
                                  />
                                  <List.CompactListTitle>
                                    {node.title}
                                    {hasChildren && depth === 0 && (
                                      <Modal.SummaryIconButton
                                        type="button"
                                        onClick={(
                                          e: React.MouseEvent<HTMLButtonElement>,
                                        ) => {
                                          e.stopPropagation()
                                          setSummaryEventId(node.id)
                                          setShowSummaryModal(true)
                                        }}
                                        title="사건 요약 보기"
                                      >
                                        <FiGitBranch size={13} />
                                      </Modal.SummaryIconButton>
                                    )}
                                  </List.CompactListTitle>
                                </List.CompactListHeader>
                                <List.CompactListMeta $depth={depth}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      width: '100%',
                                    }}
                                  >
                                    {(() => {
                                      const start = new Date(node.period.start)
                                      const end = node.period.end
                                        ? new Date(node.period.end)
                                        : null

                                      const formatFullDate = (date: Date) => {
                                        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
                                      }

                                      if (
                                        !end ||
                                        start.getTime() === end.getTime()
                                      ) {
                                        return (
                                          <span>{formatFullDate(start)}</span>
                                        )
                                      }

                                      const diffTime = Math.abs(
                                        end.getTime() - start.getTime(),
                                      )
                                      const diffDays = Math.ceil(
                                        diffTime / (1000 * 60 * 60 * 24),
                                      )

                                      const years = Math.floor(diffDays / 365)
                                      const remainingDaysAfterYears =
                                        diffDays % 365
                                      const months = Math.floor(
                                        remainingDaysAfterYears / 30,
                                      )
                                      const days = remainingDaysAfterYears % 30

                                      const parts = []
                                      if (years > 0) parts.push(`${years}년`)
                                      if (months > 0)
                                        parts.push(`${months}개월`)
                                      if (days > 0 || parts.length === 0)
                                        parts.push(`${days}일`)
                                      const durationText = parts.join(' ')

                                      return (
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              color: '#64748b',
                                            }}
                                          >
                                            {formatFullDate(start)} ~{' '}
                                            {formatFullDate(end)}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              color: '#64748b',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {durationText}
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  {node.importance === 'critical' && (
                                    <>
                                      <span>·</span>
                                      <List.ImportanceBadge>
                                        핵심
                                      </List.ImportanceBadge>
                                    </>
                                  )}
                                  {node.importance === 'major' && (
                                    <>
                                      <span>·</span>
                                      <List.ImportanceBadge $major>
                                        주요
                                      </List.ImportanceBadge>
                                    </>
                                  )}
                                </List.CompactListMeta>
                                <List.CompactListSummary $depth={depth}>
                                  {node.summary}
                                </List.CompactListSummary>
                              </List.CompactListContent>
                            </List.CompactListBody>
                          </List.CompactListItem>
                        )}

                      </React.Fragment>
                    )
                  },
                )}
              </List.CompactList>
            )}
          </List.CatalogSection>

          {/* ===== FSD Widget: EventDetailPanel ===== */}
          <EventDetailPanel
            isLoading={isLoading}
            selectedEvent={selectedEvent}
            selectedNode={selectedNode}
            dbCategories={dbCategories}
          />
        </Layout.CatalogSplit>
      </Layout.PageWrapper>

      {/* 카테고리 선택 모달 */}
      {/* ===== FSD Widget: CategoryModal ===== */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        dbCategories={dbCategories}
        selectedCategory={selectedCategory}
        onSelect={(categoryId) => {
          setSelectedCategory(categoryId)
        }}
      />

      {/* 국가 선택 모달 */}
      {/* ===== FSD Widget: 국가 선택 모달 ===== */}
      <SimpleSelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        title="국가 선택"
        selectedValue={selectedCountry}
        options={availableCountries.map((country) => ({
          value: country,
          label: country,
        }))}
        onSelect={(value) => setSelectedCountry(value)}
        allLabel="전체 국가"
        allDescription="모든 참전국/관련국"
        Icon={FiGlobe}
      />

      {/* 사건 요약 모달 */}
      {showSummaryModal &&
        summaryNode &&
        createPortal(
          <>
            <Modal.ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowSummaryModal(false)}
            />
            <Modal.SummaryModal>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Modal.ModalHeader>
                  <div>
                    <Modal.ModalTitle>{summaryNode.title}</Modal.ModalTitle>
                    <Modal.SummarySubtitle>
                      {formatDateRange(
                        summaryNode.period.start,
                        summaryNode.period.end,
                      )}
                    </Modal.SummarySubtitle>
                  </div>
                  <Modal.ModalClose onClick={() => setShowSummaryModal(false)}>
                    <FiX size={20} />
                  </Modal.ModalClose>
                </Modal.ModalHeader>

                <Modal.SummaryTabBar>
                  <Modal.SummaryTab $active>
                    <FiGitBranch size={16} />
                    계층 구조
                  </Modal.SummaryTab>
                </Modal.SummaryTabBar>

                <Modal.SummaryContent>
                  <TreeView node={summaryNode} />
                </Modal.SummaryContent>
              </motion.div>
            </Modal.SummaryModal>
          </>,
          document.body,
        )}
    </Layout.PageScene>
  )
}

// TimelineView와 TreeView는 widgets/event-list/ui로 분리됨

export default EventsCatalogPage
