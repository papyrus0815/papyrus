/**
 * Event Compact List Widget
 * FSD: widgets/event-list-compact/ui
 */
import React, { useEffect, useMemo, useState } from 'react'

import {
  FiAlertCircle,
  FiChevronDown,
  FiFilter,
  FiInbox,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { FaCrown, FaLandmark } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { ListColumnKey, SortOption } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useMediaQuery } from '@/shared/hooks/use-media-query.hook'
import { formatYearLabel, getCentury } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'
import * as List from '../../../pages/events/styles/list.styles'
import { shimmerAnimation } from '../../../pages/events/styles/shared.styles'
import {
  BRAND,
  LIST_STEPS,
  SURFACE,
  metaText,
  rowHairline,
  type ListDensity,
} from '../../../pages/events/styles/theme'
import { groupYearsByCentury } from '@/features/event-hierarchy/model'
import {
  type ReignMarker,
  eventStartKey,
  accessionVerb,
  formatAccessionDate,
  formatReignSpan,
  groupReignEntries,
  reignLengthYears,
  interleaveReignMarkers,
  planReignMarkers,
} from '../lib/reign-markers'
import type {
  FlattenedHierarchyItem,
  YearBuckets,
} from '@/features/event-hierarchy/model'

import { EventListItem } from './event-list-item'

interface EventCompactListProps {
  /**
   * 빈 상태의 '사건 등록' CTA. **마운트 지면이 표면을 결정한다** — 카탈로그는 모달을
   * 열고, 다른 지면은 자기 방식대로. 미전달 시 CTA를 렌더하지 않는다(예전엔 위젯이
   * 직접 등록 페이지로 navigate해 부모가 흐름을 바꿀 수 없었다).
   */
  onCreateEvent?: () => void
  isLoading: boolean
  /** 평탄화 계약은 useEventHierarchy가 단일 출처 — 여기서 재선언하면 필드가 표류한다 */
  flattenedHierarchy: FlattenedHierarchyItem[]
  /**
   * 세기›연도 버킷 — **페이지가 계산해 내려준다**(검토 PERF-4).
   *
   * 위젯이 `buildYearBuckets`를 직접 부르지 않는 이유는 성능보다 **단일 출처**다.
   * 페이지는 같은 버킷으로 '화면에 보이는 행'(↑↓ 키·드로어 이전/다음·'조건 밖' 배너)을
   * 정하므로, 두 곳이 각자 계산하면 입력이 한 톨만 달라도 DOM과 내비 모수가 갈린다.
   */
  yearBuckets: YearBuckets
  /**
   * 군주 즉위 구분선 — 연대 흐름 사이에 '👑 세종 즉위 · 조선 · 재위 1418–1450'을 끼운다.
   * 범위(어느 나라 군주인가)는 페이지가 정해 내려준다. 연도 그룹이 꺼진 평면 목록에는 싣지 않는다.
   */
  reignMarkers?: ReignMarker[]
  /** 즉위 표지의 군주 이름 클릭 — 페이지가 공용 인물 모달을 띄운다 */
  onOpenPerson?: (personId: string) => void
  /** 표지의 기간을 누르면 — 목록을 그 재위·재임 기간의 사건으로 좁힌다 */
  onFilterPeriod?: (marker: ReignMarker) => void
  events: HistoricalEvent[]
  expandedEventIds: Set<string>
  selectedEventId: string | null
  hasActiveFilters: boolean
  /**
   * 활성 필터 칩 — 빈 결과 안내에서 어떤 필터가 적용 중인지 보여주는 데 사용.
   *
   * `releaseCount`는 **그 축만 풀었을 때의 건수**다(검토 IA-12). 0건 회복 경로에서
   * 이 숫자가 없으면 사용자는 축을 하나씩 껐다 켜며 이진 탐색을 해야 한다 —
   * 축이 5개라 최악 5회, 그 사이 스크롤·선택이 초기화된다.
   */
  activeFilterChips?: Array<{
    key: string
    label: string
    onClear: () => void
    releaseCount?: number
  }>
  /**
   * '북마크만'인데 이 브라우저에 저장된 북마크가 0건인가(검토 URL-11).
   *
   * 북마크는 URL(`bookmarks=1`)에 실리지만 실체는 localStorage다 — 즉 **링크를 받은
   * 사람은 항상 0건**을 본다. 그 상황이 '조건과 일치하는 사건이 없습니다'로만 보이면
   * 원인을 데이터 쪽에서 찾게 되므로, 저장 위치를 빈 상태에서 한 줄로 밝힌다.
   */
  showBookmarkStorageHint?: boolean
  dbCategories: EventCategoryDto[]
  isLoadingMore?: boolean
  displayedCount?: number
  /**
   * 표시 중인 행 가운데 *최상위* 사건 수 — 헤더의 '등록 N건'(최상위 기준)과 같은
   * 모수를 하단에도 함께 보여, 같은 화면에서 두 숫자가 모순돼 보이지 않게 한다.
   */
  displayedRootCount?: number
  hasMoreData?: boolean
  /** 이미 일부 로드된 뒤 다음 페이지 로드가 실패한 상태 — 하단 인라인 재시도 노출 */
  loadMoreFailed?: boolean
  onRetryLoadMore?: () => void
  bookmarks?: Set<string>
  /**
   * 행 밀도. 세로 픽셀의 소유권을 사용자에게 넘긴다 — 밀도는 취향이 아니라 과업 의존적이라
   * (특정 사건을 찾을 땐 조밀, 읽을 땐 편안) 자동 추정하지 않고 선택을 그대로 따른다.
   */
  density?: ListDensity
  /** 사용자 입력 검색어 — Title의 매칭 부분 강조에 사용 */
  searchQuery?: string
  /** 최근 본 사건 ID — 필터 결과 0건 빈 상태에서 fallback 추천으로 노출 */
  recentEventIds?: string[]
  /**
   * 세기·연도 밴드 접힘 — **페이지가 소유**한다(위젯 로컬 state 아님).
   * 위젯 로컬이던 시절엔 뷰를 바꿨다 돌아오면 언마운트로 접기 작업이 통째로 휘발했고,
   * 드로어 이전/다음이 접힌 밴드 안의 행까지 순회해 ↑↓ 키와 결과가 갈렸다(검토 INT-4/6).
   */
  collapsedYears: Set<number>
  collapsedCenturies: Set<number>
  onToggleYearCollapse: (year: number) => void
  onToggleCenturyCollapse: (century: number) => void
  onToggleExpansion: (eventId: string) => void
  onSelectEvent: (eventId: string) => void
  onShowSummary: (eventId: string) => void
  /**
   * 최상위(앵커) 배지 클릭 — 그 사건과 자손으로 카탈로그 모수를 좁힌다(`?anchor=`).
   * 미전달이면 배지는 정적 표기로만 남는다(다른 소비처의 계약을 깨지 않기 위한 선택 prop).
   */
  onEnterAnchorScope?: (eventId: string) => void
  onResetFilters: () => void
  onToggleBookmark?: (eventId: string) => void
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  /**
   * 로빙 tabindex 진입점 — **밴드 접힘까지 반영한** 유일한 탭 정지점 행의 id.
   * 페이지가 `navigableItems`(↑↓·드로어 이전/다음과 같은 집합) 하나로 판정한다.
   * 위젯은 이 값을 재계산하지 않는다 — 두 곳이 각자 판정하면 정지점이 0개가 된다.
   */
  rovingTargetId?: string | null
  /**
   * 세기›연도 그룹으로 묶을지 여부(기본 true).
   *
   * 연도 그룹핑은 정렬을 **그룹 내부로 가둔다** — '등록순'처럼 전역 순서 자체가 목적인
   * 정렬은 그룹이 켜져 있으면 화면에서 아무 변화도 만들지 못한다(실측: 상위 5행이 시기순과
   * 완전히 동일했다). 작동하지 않는 정렬 옵션을 두느니 그때만 그룹을 끈다(검토 CR-4/IA-12).
   */
  grouped?: boolean
  /**
   * 현재 정렬 축·방향 — **열 머리글이 그것을 표시한다**.
   *
   * 정렬 컨트롤은 도구줄에 있고 결과는 표에 나타나는데, 둘을 잇는 표시가 화면에 없었다.
   * 어떤 열이 순서를 만들고 있는지 표가 스스로 말하게 한다(시기순 → 날짜 · 등록순 → 등록 ·
   * 기간순 → 기간). '하위 많은 순'은 대응 열이 없어 표지를 만들지 않는다.
   */
  sortBy?: SortOption
  sortDirection?: 'asc' | 'desc'
  /**
   * 사용자가 끈 열(표시 설정) — 공백으로 이어 `data-hidden-cols`로 내린다.
   * 트랙·셀·머리글 라벨이 그 한 선언을 함께 읽는다(list.styles의 HIDEABLE_COLUMNS 규칙).
   * 폭이 모자라 열 사다리가 스스로 접는 것과는 **다른 축**이다 — 이건 끄기 전용이다.
   */
  hiddenColumns?: readonly ListColumnKey[]
  /**
   * 열 머리글 클릭 정렬 — 넘기지 않으면 머리글은 **읽기 전용 라벨**로 남는다.
   * 도구줄의 ⋯ 표시 설정 메뉴와 같은 핸들러를 받아야 두 진입점이 갈리지 않는다.
   */
  onSortChange?: (next: SortOption) => void
  onSortDirectionToggle?: () => void
  /**
   * 건수 스트립('180건 · 전쟁/군사 49') — **표의 머리글이 싣는다**.
   *
   * 페이지가 노드째 내려준다. 도구줄에 있던 자리에서는 컨트롤 13개 사이에 낀 토큰이었고,
   * 정작 그 숫자가 설명하는 대상은 바로 아래 표다. 표가 없는 뷰에서는 도구줄이 계속 싣는다
   * (catalog-main-content의 MetaArea).
   */
  headerStats?: React.ReactNode
}

export const EventCompactList: React.FC<EventCompactListProps> = ({
  onCreateEvent,
  isLoading,
  flattenedHierarchy,
  yearBuckets,
  reignMarkers,
  onOpenPerson,
  onFilterPeriod,
  events,
  expandedEventIds,
  selectedEventId,
  hasActiveFilters,
  activeFilterChips = [],
  showBookmarkStorageHint = false,
  dbCategories,
  isLoadingMore = false,
  displayedCount = 0,
  displayedRootCount = 0,
  hasMoreData = false,
  loadMoreFailed = false,
  onRetryLoadMore,
  bookmarks = new Set(),
  searchQuery,
  density = 'cozy',
  recentEventIds = [],
  sortBy,
  sortDirection = 'desc',
  hiddenColumns,
  onSortChange,
  onSortDirectionToggle,
  headerStats,
  collapsedYears,
  collapsedCenturies,
  onToggleYearCollapse,
  onToggleCenturyCollapse,
  onToggleExpansion,
  onSelectEvent,
  onShowSummary,
  onEnterAnchorScope,
  onResetFilters,
  onToggleBookmark,
  onScroll,
  rovingTargetId = null,
  grouped = true,
}) => {
  const navigate = useNavigate()
  /**
   * 좁은 폭 판정을 **목록에서 한 번만** 한다. 행마다 useMediaQuery를 부르면 렌더된 행 수
   * (수백 개)만큼 matchMedia 리스너가 생긴다. 임계값은 행 스타일의 미디어쿼리와 동일하게 640px.
   */
  const isNarrow = useMediaQuery('(max-width: 640px)')
  /**
   * 중간 대역(641~899px) — 이 구간이 오래 '적응 없는 붕괴 대역'이었다.
   * 실측 641px에서 제목 잘림 125/252행·국가칩 중간 절단 127행인데 640px에서는 각각
   * 1행/0행이었다. 1px 좁히면 좋아지는 역전은 임계가 하나뿐이라는 증거다.
   * 격자 트랙은 CSS가 좁히고, CSS로 못 하는 것(국기 개수)은 이 값이 정한다.
   */
  const isMidWidth = useMediaQuery('(min-width: 641px) and (max-width: 899px)')
  /**
   * 넓은 대역 — 열 사다리 step 2·3(ledger 1752 / atlas 2052)에 해당한다. 설명을 걷어내며
   * 남은 폭이 키워드·관련국 열로 넘어갔는데, 트랙만 넓히면 칩 개수가 상수(2·3)라 **넓어진
   * 만큼 빈 칸**이 된다. CSS가 못 하는 개수 판정을 여기서 한 번만 한다(행마다 matchMedia를
   * 다는 것을 막는 것이 이 블록의 원래 이유다).
   *
   * **카드 폭**으로 잰다 — 트랙을 넓히는 CSS(densityVars의 @container eventcard)와 같은 자로.
   * 예전엔 뷰포트 2200/2500px로 쟀는데, 그 값은 좌측 목록 사이드바(320px)가 있던 시절의
   * 환산이다. 사이드바가 없어진 지금 카드는 뷰포트 ≈1880px에서 이미 ledger(1740)에 들어서
   * 관련국 트랙이 1fr로 넓어지는데, 이름 병기는 2200px부터라 **그 사이 320px 구간 내내
   * 넓은 칸에 국기만 떠 있었다**(실측 1920: 328px 칸에 12px 국기 1~4개). 상세 패널이 열려
   * 카드가 460px 좁아질 때도 뷰포트는 그대로라 반대 방향으로 틀렸다.
   */
  /**
   * 끈 열 — 공백으로 이어 한 속성에 싣는다(`~=` 선택자가 토큰 단위로 읽는다).
   * 빈 배열이면 속성 자체를 달지 않는다 — 빈 문자열도 DOM에 남아 diff를 만든다.
   */
  const hiddenColsAttr = hiddenColumns?.length
    ? hiddenColumns.join(' ')
    : undefined
  const [cardEl, setCardEl] = useState<HTMLElement | null>(null)
  const cardStep = useCardStep(cardEl)
  const isWide = cardStep === 'ledger' || cardStep === 'atlas'
  const isUltraWide = cardStep === 'atlas'
  /**
   * 관련국 열이 **96px로 좁아지는 대역**(list.styles.ts의 `@media (max-width: 1179px)`).
   * 개수 사다리가 폭 사다리와 어긋나 있던 자리가 정확히 여기였다 — 아래 주석 참고.
   */
  const isBelowSummary = useMediaQuery(
    '(min-width: 900px) and (max-width: 1179px)',
  )
  /**
   * 관련국 칩 예산 — **트랙 폭에서 역산한다**.
   *
   * 예전엔 개수가 뷰포트 임계(640/899/2200/2500)로만 정해졌고, 폭은 CSS 사다리
   * (`--col-flags`: 60 / 96 / 172 / 200 / 240)가 따로 정했다. 두 사다리가 어긋나
   * **열이 가장 좁아지는 대역에서 오히려 칩을 더 많이** 밀어 넣고 있었다
   * (실측 1066px: 트랙 96px에 칩 3개 → 185행 중 51행(28%)이 '영…' '독일 제…'로 잘림).
   *
   * 게다가 칩 폭은 **두 종류**다(실측): 현대 국가는 국기 이모지 **17px**,
   * 역사 국가는 이름 텍스트 **26~56px**. 한 숫자로는 둘 다 맞출 수 없어,
   * 같은 96px 트랙이 국기 행에서는 남아돌고 이름 행에서는 세 배 모자랐다.
   * 그래서 예산을 **국기용·이름용 두 값**으로 나눈다.
   *
   * 트랙 폭에서 '+N' 칩(21px)과 칩 간격(6px)을 빼고 나눈 값이다:
   *   60px  → 국기 2 · 이름 1      96px  → 국기 3 · 이름 1
   *   172px → 국기 4 · 이름 2      200px+ → 국기 5 · 이름 3 (이름 병기)
   *   240px+ → 국기 6 · 이름 3 (이름 병기)
   *
   * ⚠️ 트랙은 컨테이너(카드) 기준이고 이 판정은 뷰포트 기준이라 좌측 목록이 접히면
   * 한 계단 어긋날 수 있다. 넘치는 칩은 '+N'으로 흡수되므로 과다 쪽으로 틀려도 깨지지
   * 않지만, **부족 쪽이 안전**하므로 경계값은 좁은 쪽에 맞춰 두었다.
   */
  const flagBudget = isNarrow
    ? { flags: 1, names: 1, withName: false }
    : isMidWidth
      ? { flags: 2, names: 1, withName: false }
      : isUltraWide
        ? { flags: 6, names: 3, withName: true }
        : isWide
          ? { flags: 5, names: 3, withName: true }
          : cardStep === 'summary'
            ? { flags: 4, names: 2, withName: true }
            : isBelowSummary
              ? { flags: 3, names: 1, withName: false }
              : { flags: 4, names: 2, withName: false }
  /**
   * 키워드 칩 개수 — 관련국과 같은 근거로 **트랙 폭에서 역산**한다.
   *
   * 기본 대역이 2였는데, 그 대역의 트랙은 240px이고 칩 중앙값은 56px이다.
   * 실측(1600px·키워드 있는 123행): 2칩이 쓰는 폭은 중앙값 **136px = 트랙의 57%**,
   * 어떤 행도 트랙을 넘지 않는데 **123행 중 119행(97%)이 '+N'** 을 달고 있었고 그렇게
   * 감춰진 키워드가 **1,342개**였다. 열은 비어 있는데 값은 접혀 있던 셈이다.
   * 한 칩 더 실으면 중앙값 198px(83%)로 트랙을 쓰고, 넘치는 행은 그대로 '+N'이 받는다.
   */
  const keywordMax = isNarrow ? 1 : isMidWidth ? 2 : isUltraWide ? 6 : isWide ? 4 : 2

  /**
   * 0건의 **단일 범인**(검토 IA-12) — 해제하면 결과가 생기는 축이 정확히 하나일 때만.
   *
   * 둘 이상이면 어느 쪽을 권할지 정할 근거가 없으므로 칩의 숫자로만 말하고,
   * 하나면 그 해제를 1급 액션으로 승격한다(그때 '모든 필터 초기화'는 과잉이다).
   */
  const soleCulpritChip = useMemo(() => {
    const culprits = activeFilterChips.filter(
      (chip) => typeof chip.releaseCount === 'number' && chip.releaseCount > 0,
    )
    // 축이 하나만 걸려 있으면 그 해제는 곧 '모든 필터 초기화'라 버튼 두 개가 같은 말이 된다.
    if (culprits.length !== 1 || activeFilterChips.length < 2) return undefined
    return culprits[0]
  }, [activeFilterChips])

  /** id→event O(1) 조회 — 행마다 events.find로 선형 탐색하던 핫패스 제거 */
  const eventById = useMemo(() => {
    const byId = new Map<string, HistoricalEvent>()
    for (const historicalEvent of events) byId.set(historicalEvent.id, historicalEvent)
    return byId
  }, [events])

  /**
   * 세기›연도 그룹핑 — **페이지가 계산한 것을 그대로 받는다**(검토 PERF-4).
   *
   * 예전엔 위젯이 `buildYearBuckets`를 한 번 더 불렀다. 입력 3개(행 배열·정렬 방향·
   * `filteringActive`)를 페이지와 똑같이 맞춰야만 결과가 같은 구조라, 하나라도 어긋나면
   * DOM에 보이는 행이 페이지의 '보이는 행'(↑↓·드로어 이전/다음 모수)에서 빠진다.
   * 값을 내려받으면 두 판정이 **같은 객체**라 어긋날 방법 자체가 없어진다
   * (`list-grouping.ts`의 `orderRowsForRender` 주석이 경고하는 그 어긋남).
   */
  const {
    allYears,
    eventsByYear,
    centuryCount,
    yearRootCount,
    unknownItems,
    bucketYearById,
  } = yearBuckets

  /**
   * 노드 id → 제목. 앵커 칩이 부모 이름을 말하려면 필요한데, `parentEvent`는
   * 평면 모드에서 다른 값이 들어오고 손자에서는 조부로 폴백될 수 있어 쓸 수 없다.
   * 렌더 배열 자체가 계보의 정본이므로 여기서 뽑는다.
   */
  const nodeTitleById = useMemo(() => {
    const byNodeId = new Map<string, string>()
    flattenedHierarchy.forEach((item) =>
      byNodeId.set(item.node.id, item.node.title),
    )
    return byNodeId
  }, [flattenedHierarchy])

  /**
   * `aria-posinset`/`aria-setsize` — **같은 레벨의 형제** 안에서의 자리다(검토 A11Y-4).
   *
   * 예전엔 연 밴드의 통합 인덱스를 그대로 실었다. 그래서 1914년 밴드에서
   * 그룹은 '사건 5건', 목록 항목은 23개, 자식은 '수준 2, 23개 중 7번째'(실제 형제 18)로
   * **세 숫자가 전부 달랐다**. aria-level은 정확한데 posinset이 레벨을 뭉개면
   * 스크린리더 사용자는 계층 안에서 자기 위치를 알 수 없다.
   * 밴드 안에서 부모별로 묶어 각 묶음이 자기 크기와 순번을 갖게 한다.
   */
  const levelPositionById = useMemo(() => {
    const positions = new Map<string, { position: number; size: number }>()
    const assign = (rows: FlattenedHierarchyItem[]) => {
      const siblingGroups = new Map<string, FlattenedHierarchyItem[]>()
      rows.forEach((item) => {
        const key = item.parentNodeId ?? '__root__'
        if (!siblingGroups.has(key)) siblingGroups.set(key, [])
        siblingGroups.get(key)!.push(item)
      })
      siblingGroups.forEach((siblings) => {
        siblings.forEach((item, index) =>
          positions.set(item.node.id, {
            position: index + 1,
            size: siblings.length,
          }),
        )
      })
    }
    eventsByYear.forEach((rows) => assign(rows))
    assign(unknownItems)
    return positions
  }, [eventsByYear, unknownItems])

  /**
   * 세기 → 그 세기에 속한 연도들. 렌더 트리를 `CenturySection > YearSection > 행`으로
   * 만들기 위한 그룹핑이다.
   *
   * 이전엔 연도 배열을 평면으로 돌면서 "세기가 바뀌면 헤더를 끼워 넣는" 방식이라
   * 세기·연도 헤더가 스크롤 컨테이너의 직접 자식이 됐다. 그러면 sticky의 containing
   * block이 목록 전체가 되어 **지나간 헤더가 하나도 밀려나지 않고 계속 쌓인다**
   * (실측: scrollTop 6000에서 연도 헤더 34개가 동시에 같은 자리에 stuck).
   * 그룹을 실제 박스로 감싸면 그룹이 끝날 때 헤더도 함께 밀려난다.
   */
  const centuryGroups = useMemo(() => groupYearsByCentury(allYears), [allYears])

  /** 즉위 구분선을 세기›연 그룹 사이 어디에 둘지 — 표시 방향을 따른다 */
  const reignPlan = useMemo(() => {
    const eventYears = allYears.filter(
      (year) => (eventsByYear.get(year)?.length ?? 0) > 0,
    )
    const plan = planReignMarkers(
      reignMarkers ?? [],
      centuryGroups,
      sortDirection,
      eventYears.length > 0
        ? { min: Math.min(...eventYears), max: Math.max(...eventYears) }
        : undefined,
    )
    return plan
  }, [
    reignMarkers,
    centuryGroups,
    sortDirection,
    allYears,
    eventsByYear,
  ])

  /**
   * 이름 앞에 나라를 붙이지 않아도 되는 나라 — 목록 군주 중 **가장 많은 나라**.
   * 모든 줄에 '조선'을 반복하면 잉크만 늘어난다. 주류 나라는 생략하고, 섞여 든 다른
   * 나라(임진왜란의 일본 천황 등)만 이름 앞에 나라를 단다.
   */
  const reignHomeCountry = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const marker of reignMarkers ?? []) {
      counts.set(marker.countryName, (counts.get(marker.countryName) ?? 0) + 1)
    }
    let home: string | null = null
    let best = 0
    counts.forEach((count, country) => {
      if (count > best) {
        best = count
        home = country
      }
    })
    return home
  }, [reignMarkers])

  /**
   * 즉위 표지 한 줄 — **축 위의 눈금**이지 행이 아니다.
   *
   * 왕관은 레일 축 위에 연·세기 도트처럼 얹히고, 텍스트는 메타 크기·중립색으로 낮춘다.
   * 끝까지 달리는 rule을 두지 않는다 — 연 머리글·공백 표지·행 괘선이 이미 가로선을
   * 쓰고 있어, 선을 하나 더 보태면 목록이 줄무늬가 된다. 같은 자리의 즉위는 한 줄에
   * 이어 쓴다(세조 1455–1468 · 성종 1469–1494). 이름은 인물 상세 링크.
   * 행 목록 안에 들 때는 listitem이어야 한다.
   */
  const renderReignMarkers = (
    markers: ReignMarker[],
    inList: boolean,
    options: {
      beforeCentury?: boolean
      /** 즉위만 있는 해 — 연 라벨을 말풍선 앞에 세워 연 머리글을 대신한다 */
      yearLabel?: string
      /** 표지가 놓인 연 그룹 — 같은 해면 날짜 열에 월·일만 쓴다 */
      contextYear?: number
    } = {},
  ) => {
    /* 대통령·총리만 모인 자리 — 축 표지를 왕관 대신 의사당으로, 강조색을 호박 대신 파랑으로.
       군주가 하나라도 섞이면 왕관(즉위가 그 자리의 주된 사건이다). */
    const civic = markers.every((marker) => marker.kind !== 'monarch')
    return (
    <List.ReignMarker
      key={`reign-${markers[0].id}`}
      role={inList ? 'listitem' : 'note'}
      $asYear={!!options.yearLabel}
      $beforeCentury={options.beforeCentury}
      data-reign-marker=""
    >
      <List.ReignMarkerIcon aria-hidden="true" $civic={civic}>
        {civic ? <FaLandmark /> : <FaCrown />}
      </List.ReignMarkerIcon>
      {options.yearLabel ? (
        <List.ReignYearLabel aria-hidden="true">
          {options.yearLabel}
        </List.ReignYearLabel>
      ) : (
        // 같은 자리 즉위들은 한 시점에 모인 것이라 첫 즉위일로 대표한다
        <List.ReignMarkerDate $civic={civic}>
          {formatAccessionDate(markers[0], options.contextYear)}
        </List.ReignMarkerDate>
      )}
      <List.ReignMarkerList>
        {groupReignEntries(markers).map(({ marker, countryNames }) => {
          const foreign = countryNames.filter(
            (name) => name !== reignHomeCountry,
          )
          const span = formatReignSpan(marker)
          const verb = accessionVerb(
            countryNames[0],
            marker.kind,
            marker.reappointed,
          )
          const markerCivic = marker.kind !== 'monarch'
          const length = reignLengthYears(marker)
          return (
            <List.ReignMarkerItem key={marker.id}>
              <ReignPortrait path={marker.imageUrl} />
              {foreign.length > 0 && (
                <List.ReignMarkerCountries>
                  {foreign.map((name) => (
                    <List.ReignMarkerCountry key={name}>
                      {name}
                    </List.ReignMarkerCountry>
                  ))}
                </List.ReignMarkerCountries>
              )}
              {/* 직함 — '대통령'·'총리'. 군주는 이름이 곧 왕명이라 없다 */}
              {marker.roleTitle && (
                <List.ReignMarkerRole>{marker.roleTitle}</List.ReignMarkerRole>
              )}
              {onOpenPerson ? (
                <List.ReignMarkerName
                  as="button"
                  type="button"
                  tabIndex={-1}
                  onClick={() => onOpenPerson(marker.personId)}
                  aria-label={`${countryNames.length ? `${countryNames.join('·')} ` : ''}${marker.roleTitle ? `${marker.roleTitle} ` : ''}${marker.name} 인물 정보 보기 — ${verb}, ${verb === '즉위' ? '재위' : '재임'} ${span}`}
                >
                  {marker.name}
                </List.ReignMarkerName>
              ) : (
                <List.ReignMarkerName>{marker.name}</List.ReignMarkerName>
              )}
              {/* '즉위'와 기간은 한 덩어리 — 좁은 폭에서 '즉위'만 줄 끝에 남지 않게 */}
              <List.ReignMarkerSpan>
                <List.ReignMarkerLabel aria-hidden="true" $civic={markerCivic}>
                  {verb}
                </List.ReignMarkerLabel>
                {onFilterPeriod ? (
                  <List.ReignMarkerYears
                    as="button"
                    type="button"
                    tabIndex={-1}
                    title="이 기간의 사건만 보기"
                    aria-label={`${marker.name} ${verb === '즉위' ? '재위' : '재임'} 기간(${span})의 사건만 보기`}
                    onClick={() => onFilterPeriod(marker)}
                  >
                    {span}
                  </List.ReignMarkerYears>
                ) : (
                  <List.ReignMarkerYears>{span}</List.ReignMarkerYears>
                )}
                {length != null && (
                  <List.ReignMarkerLength>{length}년</List.ReignMarkerLength>
                )}
              </List.ReignMarkerSpan>
            </List.ReignMarkerItem>
          )
        })}
      </List.ReignMarkerList>
    </List.ReignMarker>
    )
  }

  /**
   * 로빙 tabindex의 대상 행 id.
   *
   * 예전엔 **모든 행이 tabIndex=0**이라 목록에 238개의 탭 정지점이 생겼다 —
   * 실측상 헤더·툴바를 지나 목록에 진입하는 데만 Tab 22회가 필요했고, 목록 아래 컨트롤로
   * 넘어가려면 238번을 더 눌러야 했다(검토 A11Y-7). 목록 전체는 탭 정지점 **하나**만 갖고,
   * 그 안에서는 ↑↓로 이동하는 것이 리스트박스/그리드의 표준 규약이다.
   *
   * ⚠️ **위젯은 이 값을 계산하지 않는다**(검토 A11Y-1). 예전엔 여기서
   * `selectedEventId ∈ flattenedHierarchy`를 직접 판정했는데, 그 배열은 계층 접힘만
   * 반영하고 **밴드 접힘을 모른다**. 그래서 행을 하나 고른 뒤 그 행이 든 연·세기를 접으면
   * 판정은 참인데 그 행은 DOM에 없어 **목록의 탭 정지점이 0개**가 됐다 — Tab으로 목록의
   * 어떤 행에도 들어갈 수 없고, 복구는 밴드 재펼침·Esc·마우스뿐이었다.
   * 이제 페이지가 `navigableItems`(밴드 접힘까지 반영, ↑↓와 동일한 후보 집합) 하나로
   * 판정해 내려보낸다 — "한 곳에서만 판정" 규약.
   */
  const rovingRowId = rovingTargetId

  /** 행 하나 렌더 — 연도 섹션과 '연도 미상' 섹션이 같은 계약을 공유한다. */
  const renderRow = (
    {
      node,
      depth,
      parentEvent,
      hiddenChildCount,
      isMatch,
      canExpand,
      visibleChildCount,
      parentNodeId,
    }: FlattenedHierarchyItem,
    groupYear: number | null,
    positionInSet: number,
    setSize: number,
  ) => {
    const event = eventById.get(node.id) ?? parentEvent
    if (!event) return null
    /**
     * 부모가 **다른 밴드**에 놓였을 때만 앵커를 채운다. 같은 밴드면 부모가 바로 위에
     * 있으므로 칩은 중복이고, 자식 18행이 이어지는 구간에서는 반복이 밀도를 잡아먹는다.
     * 평면 보기(depth 0 고정)는 계층 표현 자체가 없는 모드라 대상이 아니다.
     */
    const levelPosition = grouped ? levelPositionById.get(node.id) : undefined
    /**
     * 부모에게 아직 뒤따르는 형제가 있는가 — 레일 가지선이 손자 구간에서 끊기지 않게
     * 손자 행이 부모 몫의 세로선을 대신 잇는다(EventListItem.ancestorContinues).
     * 레일 들여쓰기는 두 단에서 멈추므로(--rail-depth-x가 step×2로 clamp) 조상 사슬을
     * 끝까지 거슬러 오를 필요 없이 **직계 부모 한 칸**이면 충분하다.
     */
    const ancestorContinues = (() => {
      if (depth < 2 || !parentNodeId) return false
      const parentPosition = levelPositionById.get(parentNodeId)
      if (!parentPosition) return false
      return parentPosition.position < parentPosition.size
    })()
    const anchorParent = (() => {
      if (depth === 0 || !parentNodeId) return null
      const parentTitle = nodeTitleById.get(parentNodeId)
      if (!parentTitle) return null
      const parentBucket = bucketYearById.get(parentNodeId) ?? null
      if (parentBucket === (bucketYearById.get(node.id) ?? null)) return null
      return { id: parentNodeId, title: parentTitle, year: parentBucket }
    })()
    return (
      <EventListItem
        key={node.id}
        node={node}
        event={event}
        depth={depth}
        isExpanded={expandedEventIds.has(node.id)}
        // 평탄화가 알려주는 값을 그대로 쓴다 — 자식 수로 추측하면 평면 모드에서
        // 눌러도 아무 일이 없는 셰브론이 그려진다.
        hasChildren={canExpand}
        // 원본 `node.children.length`가 아니라 **필터 통과분**을 센 값이다 — 배지가
        // '11개'라 해 놓고 펼치면 0행이던 죽은 약속을 없앤다(검토 FILT-3).
        childCount={visibleChildCount}
        hiddenChildCount={hiddenChildCount}
        anchorParent={anchorParent}
        parentNodeId={parentNodeId}
        isMatch={isMatch}
        isActive={selectedEventId === node.id}
        dbCategories={dbCategories}
        isBookmarked={bookmarks.has(node.id)}
        searchQuery={searchQuery}
        // 이 행이 속한 연 그룹 — 같은 해면 선두 토큰을 월·일로 대체(연도 중복 제거)
        groupYear={groupYear}
        isNarrow={isNarrow}
        flagMax={flagBudget.flags}
        flagNameMax={flagBudget.names}
        flagsWithName={flagBudget.withName}
        keywordMax={keywordMax}
        // 계층 깊이를 접근성 트리에 전달 — 예전엔 하위 사건이 최상위와 똑같이 읽혔다.
        ariaLevel={depth + 1}
        // 그룹 목록은 레벨별 형제 시퀀스를 쓴다(위 memo). 평면 목록은 전부 depth 0이라
        // 인자로 받은 통합 인덱스가 그대로 정답이다.
        positionInSet={levelPosition?.position ?? positionInSet}
        setSize={levelPosition?.size ?? setSize}
        ancestorContinues={ancestorContinues}
        // 목록 전체가 탭 정지점 하나만 갖도록(로빙 tabindex)
        isRovingTarget={node.id === rovingRowId}
        // 안정 참조 전달 — 행마다 새 화살표를 만들지 않아 EventListItem의
        // React.memo가 실효. id는 EventListItem이 node.id로 직접 전달.
        onSelect={onSelectEvent}
        onToggleExpansion={onToggleExpansion}
        onShowSummary={onShowSummary}
        onEnterAnchorScope={onEnterAnchorScope}
        onToggleBookmark={onToggleBookmark}
      />
    )
  }

  return (
    <List.CatalogSection ref={setCardEl}>
      {isLoading ? (
        /* ⚠️ data-density가 없으면 조밀 모드 사용자에게 로딩 45px → 데이터 32px 세로 점프가
           난다(밀도 변수는 스크롤 컨테이너가 한 번만 선언한다). */
        <List.CompactList
          data-density={density}
          data-hidden-cols={hiddenColsAttr}
        >
          <ListColumnHeader
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
            onSortDirectionToggle={onSortDirectionToggle}
            headerStats={headerStats}
          />
          {[...Array(SKELETON_ROW_COUNT)].map((_, index) => {
            // 실제 행과 **같은 트랙 선언**으로 렌더 → 로딩→데이터 전환 시 가로·세로 점프 없음.
            // 동일 폭 반복 회피 — index 기반 폭으로 자연스러운 다양성.
            // ⚠️ %가 아니라 px 상한이다. 트랙이 3,294px일 때 70%면 2,300px 막대가 된다.
            const titleWidth = 220 + ((index * 37) % 180) // 220~400px
            const snippetWidth = 55 + ((index * 11) % 35) // 55~90%
            return (
              /* $depth 0 고정 — 예전엔 index % 3으로 인위적 계단 들여쓰기를 그려,
                 데이터가 도착하면 그 계단이 평평해지며 레이아웃이 한 번 무너졌다 잡혔다. */
              <SkeletonStop key={index} $depth={0}>
                <SkeletonRail aria-hidden="true" />
                <SkeletonBody>
                  <SkeletonYear />
                  <SkeletonCategory />
                  <SkeletonTitleBar style={{ maxWidth: `${titleWidth}px` }} />
                  <SkeletonSnippet style={{ maxWidth: `${snippetWidth}%` }} />
                </SkeletonBody>
              </SkeletonStop>
            )
          })}
        </List.CompactList>
      ) : flattenedHierarchy.length === 0 && (isLoadingMore || hasMoreData) ? (
        /**
         * 아직 받아올 페이지가 남았는데 현재 창에 결과가 0건인 상태.
         *
         * 예전엔 곧장 '현재 조건과 일치하는 사건이 없습니다'를 확정 표시했다. 카탈로그는
         * autoLoadAll로 전 페이지를 순차 소진하고 1000년 이전 사건은 서버 정렬상 마지막
         * 페이지에 몰리므로, 옛 사건을 찾는 필터에서 **아직 오지 않았을 뿐인데 없다고
         * 단정**하는 창이 실제로 존재했다(검토 DATA-12).
         */
        <List.EmptyCatalogState>
          <List.EmptyIcon>
            <List.LoadingSpinner />
          </List.EmptyIcon>
          <List.EmptyContent>
            <List.EmptyTitle>사건을 불러오는 중입니다</List.EmptyTitle>
            <List.EmptyDescription>
              전체 사건을 다 받은 뒤에 조건에 맞는 결과를 보여드립니다.
            </List.EmptyDescription>
          </List.EmptyContent>
        </List.EmptyCatalogState>
      ) : flattenedHierarchy.length === 0 ? (
        <List.EmptyCatalogState>
          {/* 상태별 아이콘 — 빈 DB(수신함)·필터결과0(깔때기)·검색무결과(돋보기)로 구별해
           * '필터 때문에 안 보이나?' 오해를 없앤다. */}
          <List.EmptyIcon>
            {events.length === 0 ? (
              <FiInbox size={44} />
            ) : hasActiveFilters ? (
              <FiFilter size={44} />
            ) : (
              <FiSearch size={44} />
            )}
          </List.EmptyIcon>
          <List.EmptyContent>
            <List.EmptyTitle>
              {events.length === 0
                ? '아직 등록된 사건이 없습니다'
                : hasActiveFilters
                  ? `현재 조건과 일치하는 사건이 없습니다`
                  : '사건을 찾을 수 없습니다'}
            </List.EmptyTitle>
            <List.EmptyDescription>
              {events.length === 0
                ? '새로운 사건을 등록해보세요.'
                : hasActiveFilters
                  ? '아래 활성 필터 중 하나를 해제하거나, 모두 초기화해보세요.'
                  : '다른 조건으로 검색해보세요.'}
            </List.EmptyDescription>
            {/* 북마크는 브라우저 로컬 — 공유 링크로 온 사람에게는 이 설명이 없으면
                '데이터가 없다'로 읽힌다(검토 URL-11). */}
            {showBookmarkStorageHint && (
              <BookmarkStorageHint>
                북마크는 이 브라우저에만 저장됩니다 — 공유받은 링크의 &lsquo;북마크만&rsquo;
                조건은 상대의 북마크를 가져오지 않습니다.
              </BookmarkStorageHint>
            )}
            {hasActiveFilters && activeFilterChips.length > 0 && (
              <ActiveChipsRow>
                {activeFilterChips.map((chip) => {
                  /**
                   * 'drop-one-out' 카운트(검토 IA-12) — 이 축만 풀면 몇 건이 되는가.
                   * 0이면 붙이지 않는다: '해제 시 0건'은 정보가 아니라 소음이고,
                   * 다른 축이 진짜 범인이라는 사실만 흐린다.
                   */
                  const showRelease =
                    typeof chip.releaseCount === 'number' &&
                    chip.releaseCount > 0
                  return (
                    <ActiveChip
                      key={chip.key}
                      type="button"
                      // 라벨만 두면 '정치'로 읽혀 해제 버튼인지 전달되지 않는다.
                      aria-label={
                        showRelease
                          ? `${chip.label} 필터 해제 — 해제하면 ${chip.releaseCount}건`
                          : `${chip.label} 필터 해제`
                      }
                      onClick={chip.onClear}
                    >
                      <span>{chip.label}</span>
                      {showRelease && (
                        <ChipReleaseCount aria-hidden="true">
                          해제 시 {chip.releaseCount}건
                        </ChipReleaseCount>
                      )}
                      <FiX size={12} aria-hidden="true" />
                    </ActiveChip>
                  )
                })}
              </ActiveChipsRow>
            )}
          </List.EmptyContent>
          <List.EmptyActions>
            {/**
             * 범인이 **하나로 좁혀지면** 그 축 해제를 1급 액션으로 승격한다(검토 IA-12).
             * '모든 필터 초기화'는 되돌리기 비용이 가장 큰 선택지인데, 축 하나만 풀면
             * 되는 상황에서도 그것이 유일한 CTA였다.
             */}
            {hasActiveFilters && soleCulpritChip && (
              <List.EmptyResetButton onClick={soleCulpritChip.onClear}>
                <FiX size={14} />
                {soleCulpritChip.label} 해제 ({soleCulpritChip.releaseCount}건)
              </List.EmptyResetButton>
            )}
            {hasActiveFilters && (
              <List.EmptyResetButton onClick={onResetFilters}>
                <FiX size={14} />
                모든 필터 초기화
              </List.EmptyResetButton>
            )}
            {events.length === 0 && onCreateEvent && (
              <List.EmptyCreateButton onClick={onCreateEvent}>
                <FiPlus size={14} />새 사건 등록
              </List.EmptyCreateButton>
            )}
          </List.EmptyActions>
          {/* 필터 결과 0건이지만 사용자가 *최근 본 사건*은 있는 경우 — fallback 추천.
           * 빈 화면에서 "여기서 갈 곳" 단서 제공. recentEvents는 localStorage 기반 ID. */}
          {hasActiveFilters && recentEventIds.length > 0 && (() => {
            const byId = new Map(events.map((e) => [e.id, e]))
            const fallbackItems = recentEventIds
              .map((id) => byId.get(id))
              .filter((e): e is HistoricalEvent => Boolean(e))
              .slice(0, 5)
            if (fallbackItems.length === 0) return null
            return (
              <FallbackSection>
                <FallbackHeading>최근 본 사건</FallbackHeading>
                <FallbackList>
                  {fallbackItems.map((e) => (
                    <FallbackItem
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEvent(e.id)}
                    >
                      <FallbackTitle>{e.title}</FallbackTitle>
                    </FallbackItem>
                  ))}
                </FallbackList>
              </FallbackSection>
            )
          })()}
        </List.EmptyCatalogState>
      ) : (
        <List.CompactList
          onScroll={onScroll}
          aria-busy={isLoadingMore}
          data-density={density}
          /* ⚠️ 스켈레톤 경로에도 **같은 값**을 내린다 — 한쪽만 주면 로딩에서 데이터로
             넘어갈 때 열이 하나 늘었다 줄며 가로 점프가 난다(data-density 전례). */
          data-hidden-cols={hiddenColsAttr}
        >
          {/*
           * 목록 상태 고지 — **항상 마운트된 단일 라이브 영역**.
           *
           * ⑴ 정적 aria-label이던 시절엔 세기·연도를 접어 행이 줄어도 값이 그대로였다(A11Y-12).
           * ⑵ 하단의 '더 불러오는 중'·'끝까지 봤습니다'·'불러오지 못했습니다'는 각각
           *    **조건부 렌더**라 텍스트를 가진 채 노드가 삽입된다 — 그 방식이 누락되는 AT
           *    조합에서는 부분 실패 경고가 조용히 지나가고, 낭독되는 환경에서는 autoLoadAll이
           *    페이지마다 붙였다 떼며 반복 소음이 된다(A11Y-11).
           * 그래서 노드는 계속 두고 **텍스트만** 바꾼다. 라이브 영역은 값이 바뀔 때만 읽으므로
           * 자동 소진 중에는 같은 문구가 유지돼 한 번만 낭독되고, 다 받은 뒤 최종 카운트가
           * 한 번 더 읽힌다. 하단 시각 행들은 aria-hidden으로 중복 낭독을 막는다.
           */}
          <List.GroupHeading as="p" role="status" aria-live="polite">
            {/* ⚠️ 분기 순서 주의 — 로딩이 실패보다 앞이다.
             * React Query에서 이미 페이지를 받은 뒤의 재시도는 status가 'error'로 유지되므로
             * `isFetchNextPageError`(loadMoreFailed)와 `isFetchingNextPage`(isLoadingMore)가
             * **동시에 true**가 된다. 실패를 앞에 두면 재시도 중에도 문구가 그대로라
             * ⑴ 재시도 시작이 고지되지 않고 ⑵ 또 실패해도 값이 안 바뀌어 반복 실패가
             * 한 번도 낭독되지 않는다(예전 role="alert"가 매번 알리던 것을 잃는다).
             * 실패 문구에 현재 규모를 함께 실어, 실패가 고정된 상태에서도 행 수가 전달되게 한다. */}
            {isLoadingMore
              ? '사건을 계속 불러오는 중입니다.'
              : loadMoreFailed
                ? `일부 사건을 불러오지 못했습니다. 다시 시도할 수 있습니다. 현재 표시 ${displayedCount.toLocaleString()}행, 최상위 ${displayedRootCount.toLocaleString()}건`
                : hasMoreData
                  ? '사건을 계속 불러오는 중입니다.'
                  : `사건 목록 — 표시 ${displayedCount.toLocaleString()}행, 최상위 ${displayedRootCount.toLocaleString()}건`}
          </List.GroupHeading>
          {/* 열 헤더 — sticky 3겹 사다리의 첫 단. 스켈레톤 경로와 **같은 컴포넌트**라
              로딩 → 데이터 전환에서 26px 세로 점프가 없다. */}
          <ListColumnHeader
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
            onSortDirectionToggle={onSortDirectionToggle}
            headerStats={headerStats}
          />
          {!grouped && (
            /* 그룹 없는 평면 목록 — 배열 순서(= 선택한 정렬)를 그대로 보여준다.
               groupYear를 null로 넘겨 각 행이 자기 연도를 그대로 표시하게 한다. */
            <List.RowList role="list" aria-label="사건 목록">
              {flattenedHierarchy.map((item, index) =>
                renderRow(item, null, index + 1, flattenedHierarchy.length),
              )}
            </List.RowList>
          )}
          {grouped &&
            centuryGroups.map(({ century, years }, centuryIndex) => {
            const isCenturyCollapsed = collapsedCenturies.has(century)

            // 세기 라벨/범위 — getCentury 정의(양수 ceil, 음수 BC)에 맞춰 BC 안전.
            // 양수 c: (c-1)*100+1 ~ c*100 (예: 20세기 → 1901~2000, 1세기 → 1~100)
            // 음수 c(BC): |c|세기 = (|c|-1)*100+1 ~ |c|*100 BC
            const absCentury = Math.abs(century)
            const centuryLabel =
              century < 0 ? `기원전 ${absCentury}세기` : `${century}세기`
            const centuryRangeFrom =
              absCentury === 1 ? 1 : (absCentury - 1) * 100 + 1
            const centuryRangeTo = absCentury * 100
            const centuryRangeLabel =
              century < 0
                ? `기원전 ${centuryRangeTo}–${centuryRangeFrom}`
                : `${centuryRangeFrom}–${centuryRangeTo}`

            /**
             * 이 세기 밴드가 **실제로 그리는 행 수**. `centuryCount`(그룹 단위)와 다르다 —
             * 자식은 부모 밴드로 흡수되므로 그룹 단위 1개가 행 여러 개를 데려온다
             * (실측: '11세기 1건' 헤더 아래 11행, '20세기 76건' 접기에 107행 소멸).
             * 접힘 자리표시자는 **사라지는 것**을 말해야 하므로 이 값을 쓴다(검토 A11Y-5).
             */
            const centuryRowCount = years.reduce(
              (total, year) => total + (eventsByYear.get(year)?.length ?? 0),
              0,
            )
            const centuryUnitCount = centuryCount.get(century) ?? 0
            /** 그룹 단위가 데려온 하위 사건 수 — 헤더 숫자와 행 수의 차이를 화면이 먼저 말한다. */
            const centurySubCount = Math.max(
              centuryRowCount - centuryUnitCount,
              0,
            )
            const centuryCountLabel =
              centurySubCount > 0
                ? `${centuryUnitCount.toLocaleString()}건 · 하위 ${centurySubCount.toLocaleString()}`
                : `${centuryUnitCount.toLocaleString()}건`

            const centuryHeadingId = `events-century-${century}`
            return (
              <List.CenturySection
                key={`century-${century}`}
                role="group"
                aria-labelledby={centuryHeadingId}
              >
                {/* (제거) 'N세기 기록 없음' 공백 표지 — 사용자 지시로 폐지(2026-09-25).
                    데이터가 없다는 진술이 목록의 절반 가까운 구간 경계마다 끼어 소음이었다. */}
                {(() => {
                  const reigns = reignPlan.beforeCentury.get(century)
                  return reigns
                    ? renderReignMarkers(reigns, false, { beforeCentury: true })
                    : null
                })()}
                {/* 헤딩 탐색용 — 시각적으로는 숨기고 접근성 트리에만 남긴다. */}
                <List.GroupHeading id={centuryHeadingId} aria-level={3}>
                  {`${centuryLabel} (${centuryRangeLabel}) — 사건 ${centuryUnitCount}건${
                    centurySubCount > 0
                      ? `, 하위 ${centurySubCount}건 포함 (${centuryRowCount}행)`
                      : ''
                  }`}
                </List.GroupHeading>
                <List.CenturyDivider
                  type="button"
                  /**
                   * 밴드 머리글은 **탭 정지점이 아니다** — ↑↓ 순회에 편입돼 있다.
                   *
                   * 실측: 정지점을 그대로 두면 목록 안 64개 중 62개가 머리글이라,
                   * 목록을 지나 다음 컨트롤로 가는 데 Tab이 62번 필요했다(로빙 규약 위반).
                   *
                   * 단 하나 예외 — 세기를 전부 접어 **행이 0개**가 되면 로빙 대상이 사라져
                   * 목록의 탭 정지점이 0이 된다. 그러면 키보드로는 다시 펼칠 방법이 없다.
                   * 그 경우에만 첫 세기 머리글이 정지점 노릇을 한다.
                   */
                  tabIndex={!rovingTargetId && centuryIndex === 0 ? 0 : -1}
                  data-band-toggle="century"
                  aria-expanded={!isCenturyCollapsed}
                  aria-label={`${centuryLabel} — 사건 ${centuryUnitCount}건${
                    centurySubCount > 0
                      ? `, 하위 ${centurySubCount}건 포함 (${centuryRowCount}행)`
                      : ''
                  } ${isCenturyCollapsed ? '펼치기' : '접기'}`}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault()
                    onToggleCenturyCollapse(century)
                  }}
                >
                  <List.CenturyDividerLabel>
                    <FiChevronDown
                      size={14}
                      aria-hidden="true"
                      style={{
                        transform: isCenturyCollapsed
                          ? 'rotate(-90deg)'
                          : 'rotate(0deg)',
                      }}
                    />
                    <span>
                      {centuryLabel}
                      <List.CenturyDividerYears>
                        {' '}({centuryRangeLabel})
                      </List.CenturyDividerYears>
                    </span>
                  </List.CenturyDividerLabel>
                  <List.CenturyDividerCount>
                    {centuryCountLabel}
                  </List.CenturyDividerCount>
                </List.CenturyDivider>

                {/* 세기 접힘 → 그 세기 안의 연도 섹션을 통째로 렌더하지 않는다(헤더만 남음) */}
                {/* 세기 접힘도 연도 접힘과 **같은 언어**를 쓴다.
                    예전엔 상위 레벨일수록 숨기는 양이 많은데(93행짜리 20세기) 정직성
                    신호는 반대로 사라져, 접힌 세기와 '사건이 없는 세기'가 화면상
                    구별되지 않았다 — 스크롤 중 데이터 공백으로 오독된다. */}
                {isCenturyCollapsed ? (
                  <List.CollapsedPlaceholder>
                    <span>
                      {/* 자리표시자는 **사라진 것**을 센다 — 연 쪽은 이미 '행' 단위인데
                          세기만 '건'이라 '20세기 76건 접힘'이라 말하고 107행이 사라졌다. */}
                      {`${centuryLabel} — ${centuryRowCount}행 접힘`}
                    </span>
                  </List.CollapsedPlaceholder>
                ) : (
                  years.map((currentYear) => {
                      const yearItems = eventsByYear.get(currentYear) ?? []
                      /**
                       * 연 헤더 카운트 — depth 0이 아니라 **그룹 단위**(부모가 목록에 없는 행)를 센다.
                       * depth로 세면 부모 없이 남은 자식이 어디에도 안 세어져 '976년 0'처럼
                       * 0건 헤더가 나오고, '1건' 헤더 아래 2행이 보인다.
                       */
                      const yearEventCount = yearRootCount.get(currentYear) ?? 0
                      /**
                       * 그룹 단위가 데려온 하위 사건 수 — **헤더 숫자와 행 수의 차이**다.
                       * 예전엔 헤더가 그룹 단위만 말해 '1894년 1건' 아래 16행,
                       * '1914년 5건' 아래 23행이 놓였다(연 헤더 38개 중 19개 불일치).
                       * 숫자를 하나 더 두는 편이, 하나를 골라 틀리는 것보다 정직하다(검토 IDX-3).
                       */
                      const yearSubCount = Math.max(
                        yearItems.length - yearEventCount,
                        0,
                      )
                      /**
                       * 연 머리글은 **모든 연 그룹**에 선다.
                       *
                       * 한때 1행짜리 그룹(119개 중 68개)은 밴드를 지웠다 — 세로 예산 때문이다.
                       * 그런데 라벨이 없는 그룹의 행은 *바로 위 연 밴드에 속한 것처럼* 보였고
                       * (사용자 보고: "867년 아래에 895년 레겐스부르크 의회가 같이 나온다"),
                       * 한 지면 안에서 같은 것(연 그룹)이 두 가지로 그려지는 상태였다.
                       * 아껴야 할 것은 '어떤 해는 라벨을 안 준다'가 아니라 라벨의 높이였다 —
                       * 밴드를 62px → 38px로 줄이고 '1건' 카운트를 생략해 그 비용을 갚는다.
                       */
                      const isYearCollapsed = collapsedYears.has(currentYear)
                      /**
                       * 카운트는 **말할 것이 있을 때만** 싣는다.
                       * 1행짜리 그룹이 68개인데 그 전부에 '1건'을 붙이면, 바로 아래 한 행이
                       * 이미 말하는 사실을 68번 되풀이하는 잉크가 된다.
                       */
                      // 즉위 연도로 세운 빈 연 그룹은 '0건'을 말하지 않는다 — 표지가 곧 내용이다.
                      const showYearCount =
                        yearItems.length > 0 &&
                        (yearEventCount !== 1 || yearSubCount > 0)

                      const yearHeadingId = `events-year-${currentYear}`
                      const inYearReigns = reignPlan.inYear.get(currentYear)
                      /** 즉위 연도로만 세운 해 — 머리글과 말풍선을 한 줄로 합친다 */
                      const reignOnlyYear =
                        yearItems.length === 0 && !!inYearReigns?.length
                      return (
                        <List.YearSection
                          key={`year-${currentYear}`}
                          role="group"
                          aria-labelledby={yearHeadingId}
                          /* (제거) 공백에 비례한 추가 여백과 'N년 기록 없음' 표지 — 사용자
                             지시로 폐지(2026-09-25). 설명 없는 여백만 남기면 결함처럼 보이므로
                             여백도 함께 걷어 연 그룹 리듬을 한 가지로 둔다. */
                        >
                          {(() => {
                            const reigns = reignPlan.beforeYear.get(currentYear)
                            return reigns
                              ? renderReignMarkers(reigns, false)
                              : null
                          })()}
                          {reignOnlyYear ? (
                            <>
                              <List.GroupHeading
                                id={yearHeadingId}
                                aria-level={4}
                              >
                                {`${formatYearLabel(currentYear)} — 사건 없음, 즉위`}
                              </List.GroupHeading>
                              {renderReignMarkers(inYearReigns, false, {
                                yearLabel: formatYearLabel(currentYear),
                              })}
                            </>
                          ) : (
                            <>
                            <List.GroupHeading id={yearHeadingId} aria-level={4}>
                              {`${formatYearLabel(currentYear)} — 사건 ${yearEventCount}건${
                                yearSubCount > 0
                                  ? `, 하위 ${yearSubCount}건 포함 (${yearItems.length}행)`
                                  : ''
                              }`}
                            </List.GroupHeading>
                            <List.YearDivider
                              type="button"
                              /* 세기 머리글과 같은 규약 — 탭 정지점이 아니라 ↑↓ 순회 대상 */
                              tabIndex={-1}
                              data-band-toggle="year"
                              aria-expanded={!isYearCollapsed}
                              aria-label={`${formatYearLabel(currentYear)} — 사건 ${yearEventCount}건${
                                yearSubCount > 0
                                  ? `, 하위 ${yearSubCount}건 포함 (${yearItems.length}행)`
                                  : ''
                              } ${isYearCollapsed ? '펼치기' : '접기'}`}
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.preventDefault()
                                onToggleYearCollapse(currentYear)
                              }}
                            >
                              <span>
                                <FiChevronDown
                                  size={13}
                                  aria-hidden="true"
                                  style={{
                                    transform: isYearCollapsed
                                      ? 'rotate(-90deg)'
                                      : 'rotate(0deg)',
                                  }}
                                />
                                {formatYearLabel(currentYear)}
                                {/* 단위 '건' 필수 — 숫자만 두면 '2026년 6'이 6월로 읽힌다.
                                    세기 헤더는 이미 'N건'이라 표기도 함께 통일된다.
                                    하위가 있으면 두 번째 숫자를 덧붙인다 — 헤더 하나가
                                    '1건'이라 말하고 16행이 놓이던 어긋남(IDX-3).
                                    '1건'뿐인 그룹은 생략한다 — 바로 아래 한 행이 이미 그 말이다.
                                    (낭독용 aria-label에는 항상 남는다 — 스크린리더는 '바로 아래
                                    한 행'을 눈으로 확인할 수 없다.) */}
                                {showYearCount && (
                                  <List.CollapsedCount>
                                    {yearSubCount > 0
                                      ? `${yearEventCount}건 · 하위 ${yearSubCount}`
                                      : `${yearEventCount}건`}
                                  </List.CollapsedCount>
                                )}
                              </span>
                            </List.YearDivider>
                            {isYearCollapsed ? (
                              <List.CollapsedPlaceholder>
                                <span>
                                  {/* 접기가 실제로 숨기는 것은 **렌더되던 행 전체**(하위 사건 포함)다.
                                      yearEventCount(depth 0만)를 쓰면 '2개 사건이 접혀있습니다'라며
                                      7행이 사라져 숫자가 화면과 어긋난다. */}
                                  {yearItems.length > 0
                                    ? `${yearItems.length}행이 접혀있습니다`
                                    : formatYearLabel(currentYear)}
                                </span>
                              </List.CollapsedPlaceholder>
                            ) : (
                              <List.RowList
                                role="list"
                                aria-labelledby={yearHeadingId}
                              >
                                {/* ⚠️ aria-posinset은 **1부터** 시작한다. index를 그대로
                                    넘기면 첫 행이 '0번째'로 낭독되고, 이 경로가
                                    grouped 기본값(true)이라 LIST의 상시 경로다. */}
                                {interleaveReignMarkers(
                                  yearItems,
                                  inYearReigns,
                                  {
                                    direction: sortDirection,
                                    // 연 그룹 안이 시간순일 때만 날짜로 자리를 잡는다
                                    chronological: sortBy === 'recent',
                                    rowStartKey: (item) =>
                                      item.depth === 0
                                        ? eventStartKey(item.node.period)
                                        : null,
                                  },
                                ).map((entry) =>
                                  entry.kind === 'reign'
                                    ? renderReignMarkers(entry.markers, true, {
                                      contextYear: currentYear,
                                    })
                                    : renderRow(
                                        entry.item,
                                        currentYear,
                                        yearItems.indexOf(entry.item) + 1,
                                        yearItems.length,
                                      ),
                                )}
                              </List.RowList>
                            )}
                            </>
                          )}
                        </List.YearSection>
                      )
                    })
                )}
                </List.CenturySection>
              )
            })}

          {grouped &&
            reignPlan.trailing.length > 0 &&
            renderReignMarkers(reignPlan.trailing, false)}

          {/* 연도 미상 — period.start가 비었거나 파싱 불가하고 귀속할 상위 연도도 없는 항목.
           * 그룹핑에서 드롭하지 않고 여기 모아 렌더한다(자식만 남은 북마크 필터·날짜 완전 미상). */}
          {grouped && unknownItems.length > 0 && (
            /* 연도 섹션과 같은 래퍼를 쓴다 — UnknownYearDivider도 YearDivider를 상속해
             * sticky이므로, 감싸지 않으면 이 헤더만 목록 끝까지 상단에 눌어붙는다. */
            <List.YearSection
              key="year-unknown"
              role="group"
              aria-labelledby="events-year-unknown"
            >
              <List.GroupHeading id="events-year-unknown" aria-level={4}>
                {`연도 미상 — 사건 ${unknownItems.length}건`}
              </List.GroupHeading>
              <List.UnknownYearDivider as="div" style={{ cursor: 'default' }}>
                <span>
                  연도 미상
                  <List.CollapsedCount>{unknownItems.length}</List.CollapsedCount>
                </span>
              </List.UnknownYearDivider>
              <List.RowList role="list" aria-labelledby="events-year-unknown">
                {unknownItems.map((item, index) =>
                  renderRow(item, null, index + 1, unknownItems.length),
                )}
              </List.RowList>
            </List.YearSection>
          )}

          {/* 로딩 / 끝 안내 — 사용자가 "어디까지 봤는지·더 있는지·끝인지" 즉시 알 수 있도록.
           * displayedCount를 모든 상태에 노출해 스크롤 중에도 진행도가 보임. */}
          {isLoadingMore && (
            /* 라이브 역할만 뗀다(자동 고지는 상단 단일 라이브 영역이 담당) — aria-hidden으로
               숨기면 브라우즈 모드로 목록을 훑는 사용자에게서 진행 상태가 통째로 사라진다. */
            <LoadingMoreRow>
              <List.LoadingSpinner />
              <LoadingMoreText>
                {displayedCount > 0
                  ? `${displayedCount.toLocaleString()}건 표시 · 더 불러오는 중…`
                  : '더 불러오는 중…'}
              </LoadingMoreText>
            </LoadingMoreRow>
          )}
          {/* 부분 로드 실패 — 전역 에러 배너(events.length===0)엔 안 걸리는 조용한 누락을
           * 인라인으로 노출하고 재시도 진입점을 준다. */}
          {loadMoreFailed && !isLoadingMore && (
            /* ⚠️ 이 행에는 '다시 시도' 버튼이 있으므로 aria-hidden 금지 —
             * 포커스 가능한 컨트롤을 AT에서 숨기면 탭으로 닿는데 정체를 알 수 없는 상태가 된다.
             * 대신 role="alert"만 뗀다: 조건부로 삽입되는 alert는 AT 조합에 따라 통째로
             * 누락되므로, 실패 고지는 항상 마운트된 상단 라이브 영역이 담당한다(A11Y-11). */
            <LoadingMoreRow>
              <LoadMoreErrorText>
                <FiAlertCircle
                  size={14}
                  aria-hidden="true"
                  style={{ flexShrink: 0, verticalAlign: '-2px', marginRight: 6 }}
                />
                일부 사건을 불러오지 못했습니다.
              </LoadMoreErrorText>
              {onRetryLoadMore && (
                <RetryLoadMoreButton type="button" onClick={onRetryLoadMore}>
                  다시 시도
                </RetryLoadMoreButton>
              )}
            </LoadingMoreRow>
          )}
          {!isLoadingMore && hasMoreData && !loadMoreFailed && (
            <LoadingMoreRow aria-hidden="true">
              <ScrollHintInline>
                {displayedCount > 0
                  ? `${displayedCount.toLocaleString()}건 표시 · ↓ 스크롤하여 더 보기`
                  : '↓ 스크롤하여 더 보기'}
              </ScrollHintInline>
            </LoadingMoreRow>
          )}
          {!isLoadingMore && !hasMoreData && displayedCount > 0 && (
            /* '끝까지 봤습니다'는 목록의 끝을 알리는 콘텐츠다 — 브라우즈 모드에서 읽혀야 한다.
               자동 고지만 상단 라이브 영역에 맡기고 여기서는 role/aria-live를 두지 않는다. */
            <LoadingMoreRow>
              <EndOfListText>
                끝까지 봤습니다 · 표시 {displayedCount.toLocaleString()}행
                {displayedRootCount > 0 &&
                  displayedRootCount !== displayedCount &&
                  ` (최상위 ${displayedRootCount.toLocaleString()}건)`}
              </EndOfListText>
            </LoadingMoreRow>
          )}
        </List.CompactList>
      )}
    </List.CatalogSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled (theme-aware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 즉위 말풍선의 초상 — 말풍선이 **누구의 말인지**를 얼굴로 보인다(군주 58%가 초상 보유).
 * 없거나 로드에 실패하면 아무것도 그리지 않는다 — 빈 원·실루엣은 '초상 없음'이라는
 * 정보 없는 잉크라, 이름만 있는 항목이 더 깨끗하다. 축 위 왕관이 이미 표지 종류를 말한다.
 */
function ReignPortrait({ path }: { path: string | null }) {
  const src = path ? getUploadImageUrl(path) || path : null
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    setBroken(false)
  }, [src])
  if (!src || broken) return null
  return (
    <List.ReignMarkerPortrait
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  )
}

type CardStep = 'base' | 'summary' | 'ledger' | 'atlas'

/**
 * 카드(컨테이너 eventcard)의 열 사다리 단계 — CSS 컨테이너 쿼리와 **같은 입력**(콘텐츠 상자
 * 인라인 폭)과 같은 임계(LIST_STEPS)로 판정한다. 관찰자는 목록에 하나뿐이고, 단계가 바뀔
 * 때만 상태를 갱신하므로 창 크기를 끌어도 행이 다시 그려지지 않는다.
 * ResizeObserver가 없는 환경(jsdom)에서는 기본 단계로 남는다.
 */
function useCardStep(el: HTMLElement | null): CardStep {
  const [step, setStep] = useState<CardStep>('base')
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const width =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width
      setStep(
        width >= LIST_STEPS.atlas
          ? 'atlas'
          : width >= LIST_STEPS.ledger
            ? 'ledger'
            : width >= LIST_STEPS.summary
              ? 'summary'
              : 'base',
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
  return step
}

const LoadingMoreRow = styled.div`
  /* 40 → 14px. 이 행은 4개 분기 중 하나가 **항상** 렌더되므로 목록 끝에 상시 존재한다.
     99px짜리 안내문이 마지막 세기를 확인하러 온 화면의 3분의 1을 먹고 있었다. */
  padding: 14px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const LoadingMoreText = styled.div`
  color: ${metaText};
  font-size: 13px;
  font-weight: 500;
`

const LoadMoreErrorText = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
`

const RetryLoadMoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.4)' : 'rgba(220,38,38,0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
  transition: background 0.14s, border-color 0.14s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.2)' : 'rgba(220,38,38,0.1)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ScrollHintInline = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${metaText};
  letter-spacing: 0.02em;
`

const ActiveChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  max-width: 480px;
`

/* 북마크 저장 위치 고지 — 빈 상태 설명 바로 아래, 본문보다 한 단계 약하게(검토 URL-11) */
const BookmarkStorageHint = styled.p`
  margin: 6px 0 0;
  max-width: 420px;
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};
`

const ActiveChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, color 0.14s;

  svg {
    opacity: 0.6;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
    svg {
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * '해제 시 N건'(검토 IA-12) — 칩 라벨과 ✕ 사이의 약한 보조 텍스트.
 * 라벨과 같은 크기로 두면 무엇이 필터 이름이고 무엇이 예측치인지 갈리지 않는다.
 */
const ChipReleaseCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EndOfListText = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${metaText};
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;

  &::before {
    content: '·';
    margin-right: 8px;
    opacity: 0.5;
  }
  &::after {
    content: '·';
    margin-left: 8px;
    opacity: 0.5;
  }
`

/**
 * 필터 결과 0건 시 fallback 추천 — 최근 본 사건 5개 노출.
 * 빈 상태가 죽은 화면이 되지 않도록 사용자 행동 단서 제공.
 */
const FallbackSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  width: 100%;
  max-width: 480px;
`

const FallbackHeading = styled.h4`
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
`

const FallbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FallbackItem = styled.button`
  text-align: left;
  padding: 8px 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.03)'};
    border-color: rgba(37, 99, 235, 0.32);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const FallbackTitle = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — 실제 timeline-stop 레이아웃과 동일 구조로 렌더되어,
// 로딩 → 실제 데이터 전환 시 시각 점프 없이 자연스러운 페인트 흐름 유지.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 로딩 스켈레톤 행 수.
 *
 * 예전엔 `Math.min(pageSize, 12)`였는데 pageSize는 **로딩 행 수와 무관한 축**이다
 * (한 번에 몇 건을 fetch할지일 뿐, 화면에 몇 행이 들어가는지가 아니다). 12행 × 45px =
 * 540px라 1440 화면 목록 뷰포트(약 1,200px)의 절반 이상이 빈 채로 로딩됐다.
 * 컨테이너 높이 실측(ResizeObserver)은 별건이고, 상수 18이면 전 대역에서 화면을 덮는다.
 */
const SKELETON_ROW_COUNT = 18

/**
 * 열 헤더 한 줄 — 데이터 경로와 스켈레톤 경로가 **같은 것**을 렌더한다.
 *
 * 한쪽에만 있으면 로딩 → 데이터 전환에서 26px 세로 점프가 난다.
 * 라벨은 각자 트랙에 배치되므로 폭이 좁아 열이 꺼지면 라벨도 같이 사라진다.
 * `aria-hidden` — 행은 listitem이고 여기 라벨은 시각 보조다. 스크린리더에는 각 셀의
 * 텍스트와 title 속성이 이미 의미를 싣고 있어, 헤더를 읽히면 행마다 중복 낭독이 된다.
 */
/** 정렬 축 → 열 매핑. 대응 열이 없는 축('하위 많은 순')은 undefined. */
const SORT_COLUMN: Partial<Record<SortOption, 'date' | 'dur' | 'reg'>> = {
  recent: 'date',
  duration: 'dur',
  created: 'reg',
}

const ListColumnHeader: React.FC<{
  sortBy?: SortOption
  sortDirection?: 'asc' | 'desc'
  headerStats?: React.ReactNode
  onSortChange?: (next: SortOption) => void
  onSortDirectionToggle?: () => void
}> = ({
  sortBy,
  sortDirection = 'desc',
  headerStats,
  onSortChange,
  onSortDirectionToggle,
}) => {
  const sortedCol = sortBy ? SORT_COLUMN[sortBy] : undefined
  const sortable = !!onSortChange
  /**
   * 열을 눌러 그 축으로 줄 세운다 — 이미 그 축이면 방향만 뒤집는다(표 관습).
   *
   * 도구줄의 ⋯ 표시 설정 메뉴와 **같은 두 핸들러**를 부른다. 정렬 규칙(시기·기간은
   * 내림차순으로 리셋)은 페이지 한 곳에 있으므로 여기서 다시 판단하지 않는다.
   */
  const sortHandler = (axis: SortOption) =>
    onSortChange
      ? () => {
          if (sortBy === axis) onSortDirectionToggle?.()
          else onSortChange(axis)
        }
      : undefined
  /** 라벨이 '무엇을 하는 칸인지' 말한다 — 머리글은 aria-hidden이라 title이 유일한 설명이다. */
  const sortTitle = (axis: SortOption, label: string) =>
    onSortChange
      ? sortBy === axis
        ? `${label} — 눌러서 오름/내림 바꾸기`
        : `${label}으로 정렬`
      : undefined
  /**
   * 방향 글리프는 **한 곳에서만** 만든다 — 열마다 따로 쓰면 오름/내림이 엇갈린다.
   *
   * 정렬 중이 아닌 열에도 **흐린 ▾**를 남긴다. 머리글 클릭이 정렬의 1차 진입점이 된
   * 뒤로, 그 사실이 화면에 적히는 곳은 hover 색 변화뿐이었다 — 마우스를 얹기 전에는
   * 누를 수 있는 칸인지 알 방법이 없었고, 터치에는 hover가 없다. 글리프 자리를 늘
   * 비워 두면 라벨 x가 정렬 상태에 따라 흔들리는 문제도 함께 사라진다.
   */
  const caret = (col: 'date' | 'title' | 'dur' | 'reg') => {
    const active = sortedCol === col || (col === 'title' && sortBy === 'descendants')
    if (!active && !sortable) return null
    return (
      <List.ColumnSortCaret aria-hidden="true" $idle={!active}>
        {active && sortDirection === 'asc' ? '▲' : '▼'}
      </List.ColumnSortCaret>
    )
  }

  return (
  <List.ColumnHeader aria-hidden="true">
    {/* 정렬은 **셀을 따라간다** — 라벨과 값이 같은 트랙의 반대쪽 끝에 서면 머리글이
        열을 가리키는 게 아니라 오독을 만든다(실측: 날짜 값은 우측 정렬인데 라벨은
        좌측이라 66px 트랙의 양 끝에 따로 서 있었다. 분류도 같은 상태였다). */}
    <List.ColumnHeaderCell
      $col="date"
      $align="right"
      $sorted={sortedCol === 'date'}
      $clickable={!!onSortChange}
      onClick={sortHandler('recent')}
      title={sortTitle('recent', '시기순')}
    >
      시작
      {caret('date')}
    </List.ColumnHeaderCell>
    {/* 종료 — 시작과 한 쌍이라 바로 옆에 세운다. 값이 없는 행이 많지만(65%) 그 빈칸이
        '종료 미상'이라는 사실이고, 머리글이 없으면 그 사실을 읽을 이름 자체가 없다. */}
    <List.ColumnHeaderCell
      $col="end"
      $align="right"
      $showFrom={LIST_STEPS.summary}
    >
      종료
    </List.ColumnHeaderCell>
    <List.ColumnHeaderCell $col="cat" $align="right">
      분류
    </List.ColumnHeaderCell>
    {/* '사건' 열에 걸리는 축은 **하위 많은 순**이다 — 이 열이 제목과 하위 펼침을 함께
        싣는 칸이고, 그 정렬이 세우는 것도 '자손을 몇 개 거느린 사건인가'다.
        ⚠️ 건수 스트립(headerStats)은 클릭 대상이 아니다 — 숫자를 누르려다 정렬이
        바뀌면 안 되므로 전파를 여기서 끊는다. */}
    <List.ColumnHeaderCell
      $col="title"
      $textIndent
      $sorted={sortBy === 'descendants'}
      $clickable={!!onSortChange}
      onClick={sortHandler('descendants')}
      title={sortTitle('descendants', '하위 많은 순')}
    >
      사건
      {caret('title')}
      {headerStats && (
        <HeaderStatsSlot
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          {headerStats}
        </HeaderStatsSlot>
      )}
    </List.ColumnHeaderCell>
    {/* (제거) '설명' 열 머리글 — 설명이 별도 열이 아니라 '사건' 셀 안에서 제목 뒤를
        잇는 글이 됐다. 없는 열에 머리글만 남으면 그 라벨이 가리키는 트랙이 없다. */}
    <List.ColumnHeaderCell $col="kw" $showFrom={LIST_STEPS.summary}>
      키워드
    </List.ColumnHeaderCell>
    {/* 기간 열은 우측 정렬 숫자가 아니라 **연 단위 트랙**이다 — 라벨을 오른쪽 끝에
        붙이면 연말(12월 31일) 위에 얹혀 축이 거기서 끝나는 것처럼 읽힌다. */}
    <List.ColumnHeaderCell
      $col="dur"
      $align="center"
      $axis
      $sorted={sortedCol === 'dur'}
      $clickable={!!onSortChange}
      onClick={sortHandler('duration')}
      title={
        onSortChange
          ? `이 행이 속한 해의 1월 1일 ~ 12월 31일 · 눈금은 4·7·10월 — ${
              sortBy === 'duration'
                ? '눌러서 오름/내림 바꾸기'
                : '눌러서 기간순 정렬'
            }`
          : '이 행이 속한 해의 1월 1일 ~ 12월 31일 · 눈금과 세로 격자는 4·7·10월'
      }
    >
      {/* 축의 양 끝 — 이 열이 '한 해'라는 사실을 화면에 적는 유일한 잉크.
          좁은 대역에서는 스스로 꺼진다(AxisEndLabel의 컨테이너 쿼리). */}
      <List.AxisEndLabel $side="start" aria-hidden="true">
        1월
      </List.AxisEndLabel>
      기간
      {caret('dur')}
      <List.AxisEndLabel $side="end" aria-hidden="true">
        12월
      </List.AxisEndLabel>
      <List.DurationAxis aria-hidden="true" />
    </List.ColumnHeaderCell>
    {/* 관련국 칩 묶음은 트랙 우단에 붙는다(Flags의 justify-content) — 라벨도 함께 간다. */}
    <List.ColumnHeaderCell $col="flags" $align="right">
      관련국
    </List.ColumnHeaderCell>
    <List.ColumnHeaderCell
      $col="reg"
      $align="right"
      $showFrom={LIST_STEPS.atlas}
      $sorted={sortedCol === 'reg'}
      $clickable={!!onSortChange}
      onClick={sortHandler('created')}
      title={sortTitle('created', '등록순')}
    >
      등록
      {caret('reg')}
    </List.ColumnHeaderCell>
    </List.ColumnHeader>
  )
}

/**
 * 머리글 안 건수 슬롯 — 라벨('사건')보다 **한 단 뒤**에 선다.
 *
 * 스트립 자신의 12px을 11px로 낮춘다(자식 선택자). 머리글 줄의 다른 잉크가 전부 11px이라
 * 한 토큰만 크면 그게 라벨처럼 읽히고, 정작 열 이름이 뒤로 밀린다.
 */
const HeaderStatsSlot = styled.span`
  margin-left: 14px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;

  > * {
    font-size: 11px;
  }
`

const skeletonBarBg = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.08)'
        : 'rgba(37, 99, 235, 0.08)'} 0%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.15)'
        : 'rgba(37, 99, 235, 0.15)'} 50%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.08)'
        : 'rgba(37, 99, 235, 0.08)'} 100%
  );
`

const SkeletonStop = styled.div<{ $depth: number }>`
  position: relative;
  display: flex;
  align-items: stretch;
  /* 실제 행 높이와 동기화 — 예전엔 33px이라 12행 기준 세로 ~144px이 점프했다.
     이제 행 높이는 밀도 토큰이 소유하므로 같은 변수를 읽는다(조밀 32 / 기본 45 / 편안 52).
     리터럴로 두면 밀도를 바꿀 때마다 로딩→데이터 전환에서 점프가 되살아난다. */
  box-sizing: border-box;
  min-height: var(--row-min-h);
  padding: var(--row-pad-y) var(--row-pad-r) var(--row-pad-y) var(--row-pad-l);
  margin-left: ${({ $depth }) => `calc(var(--row-indent) * ${$depth})`};

  /* 모바일은 실제 행이 2줄(69px)인데 스켈레톤은 1줄이라 데이터가 도착하는 순간
     12행 × 24px = 288px가 아래로 밀렸다. 좁은 폭에서는 2줄 높이를 예약한다. */
  @media (max-width: 640px) {
    min-height: 69px;
  }
  /* 실제 행과 **같은 토큰** — 다르면 로딩→데이터에서 선 굵기가 튄다 */
  border-bottom: 1px solid ${rowHairline};
`

const SkeletonRail = styled.span`
  position: absolute;
  left: calc(-1 * var(--rail-inset, 38px));
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  ${skeletonBarBg}
  ${shimmerAnimation}
  box-shadow: 0 0 0 2px
    ${({ theme }) => (theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised)};
  z-index: 1;
`

/**
 * 스켈레톤 행 — 실제 행 `Body`와 **같은 트랙 선언**(`list.styles.ts`의 `rowGridTemplate`)을
 * 읽는다.
 *
 * 예전엔 `display:flex; max-width:880px`라, 폭 캡을 걷어낸 전폭에서 로딩(880px) →
 * 데이터(3,294px) 가로 점프가 났다. 자리표시자 폭도 밀도 토큰과 어긋나 있었다.
 * ⚠️ 여기에 두 번째 트랙 선언을 만들지 말 것 — 만드는 순간 다음 격자 변경에서 또 갈린다.
 */
const SkeletonBody = styled.div`
  flex: 1;
  min-width: 0;
  ${List.rowGridTemplate}
  align-items: center;
`

const SkeletonYear = styled.span`
  grid-column: date;
  height: 11px;
  border-radius: 4px;
  ${skeletonBarBg}
  ${shimmerAnimation}
`

const SkeletonCategory = styled.span`
  grid-column: cat;
  height: 16px;
  border-radius: 6px;
  ${skeletonBarBg}
  ${shimmerAnimation}
  opacity: 0.7;
`

/* 제목 + 설명을 한 트랙 안에 나란히 — 실제 행이 그렇게 조판되므로(설명은 열이 아니라
   제목 뒤를 잇는 글) 스켈레톤도 같은 구조여야 데이터 도착 시 폭이 튀지 않는다. */
const SkeletonTitleGroup = styled.span`
  grid-column: title;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  /* 실제 제목은 디스클로저 폭만큼 안쪽에서 시작한다 */
  margin-left: var(--row-disc-btn);
`

const SkeletonTitleBar = styled.span`
  flex: 0 0 auto;
  height: 14px;
  border-radius: 4px;
  ${skeletonBarBg}
  ${shimmerAnimation}
`

/* 설명이 켜지는 대역에서만 — 실제 행과 같은 게이트를 읽는다. */
const SkeletonSnippet = styled.span`
  display: none;

  @container eventcard (min-width: ${LIST_STEPS.summary}px) {
    display: block;
    flex: 1 1 0;
    min-width: 0;
    height: 11px;
    border-radius: 4px;
    opacity: 0.6;
    ${skeletonBarBg}
    ${shimmerAnimation}
  }
`
