/**
 * Event Tree View — 모든 root 사건의 hierarchy를 트리 형태로 한 화면에.
 *
 * - 각 root 사건은 카드 헤더, 하위 노드는 들여쓰기로 시각화.
 * - 깊이 표시: 좌측 vertical guide line + indent.
 * - 시간 정렬은 부모(events.page)의 sortDirection을 따름. 트리 자체는 hierarchy 순서 유지.
 * - 기본 펼침 정책: depth 0~1만 자동 펼침, 그 이상은 클릭으로 확장.
 */
import React, { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiChevronDown, FiChevronRight, FiPlus } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import { CatalogViewEmpty } from '@/features/event-list/ui/catalog-view-empty'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { getEventsByParentId } from '@/shared/api/events'
import type { EventResponseDto } from '@/shared/api/events'
import { CategoryDot as SharedCategoryDot } from '@/shared/ui/category-dot/category-dot'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'
import { ImportancePill } from '@/shared/ui/importance-pill/importance-pill'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { BRAND } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** 모든 클릭 컨트롤 공통 포커스 링 — theme.ts의 '모든 컨트롤 동일' 규약 준수 */
const focusVisible = `
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

/**
 * 연도 라벨 — 네이티브 Date 금지(BC·연도<100을 Invalid Date/오년도로 만듦).
 * ISO 구성요소 파싱으로 부호 연도 안전 처리. BC는 '기원전 N', 미상은 '—'.
 */
const formatYear = (start: string): string => {
  const parts = parseIsoDateParts(start)
  if (!parts) return '—'
  return parts.year < 0 ? `기원전 ${Math.abs(parts.year)}` : `${parts.year}`
}

/**
 * byParent 응답의 구조화 시작 필드 — BC·고대는 startDate(DATETIME)가 비므로
 * 구조화 연도가 정본이다. 현 서버 계약상 이 필드들이 응답에 빠질 수 있어(미전송)
 * 옵션 확장 타입으로 좁혀 읽고, 없으면 startDate 파싱으로 폴백한다.
 */
type LazyStructuredStart = {
  startEra?: string | null
  startYear?: number | null
}

/** lazy 자식의 부호 시작 연도(BC 음수) — 구조화 필드 우선, startDate 폴백, 미상 null. */
const lazySignedStartYear = (event: EventResponseDto): number | null => {
  const structured = event as EventResponseDto & LazyStructuredStart
  if (typeof structured.startYear === 'number') {
    return structured.startEra === 'BC'
      ? -Math.abs(structured.startYear)
      : structured.startYear
  }
  // 네이티브 Date 금지 — BC(`-0044-…`)·연도<100을 Invalid Date/오년도로 만든다.
  const parts = parseIsoDateParts(event.startDate ?? '')
  return parts ? parts.year : null
}

/** lazy 자식 행의 연도 라벨 — 로컬 노드(formatYear)와 동일 표기('기원전 N'/'N'/'—'). */
const formatLazyYear = (event: EventResponseDto): string => {
  const signedYear = lazySignedStartYear(event)
  if (signedYear === null) return '—'
  return signedYear < 0 ? `기원전 ${-signedYear}` : `${signedYear}`
}

/** '+ 하위 사건' 액션 콜백 계약 — events.page가 등록 모달을 initialParent로 연다. */
export interface TreeCreateChildTarget {
  id: string
  title: string
}

interface Props {
  /**
   * ⚠️ 이 뷰만 **문맥 부모를 포함한 완전한 평탄화**를 받는다(검토 GAP-1).
   *
   * 다른 5뷰는 `isMatch`인 행만 받아 집계에서 문맥 부모를 배제한다. 트리는 구조를
   * 보여주는 뷰라 같은 처방을 쓸 수 없다 — 자식 하나만 매칭된 경우 그 부모는
   * `isMatch=false`이고, 부모를 빼면 **매칭된 자식이 화면에서 통째로 사라진다**
   * (트리의 자식은 루트 카드 안에서만 도달 가능하다).
   * 대신 ⑴ 이 배열에 없는 노드(= 필터가 잘라낸 가지)는 렌더하지 않고
   * ⑵ `isMatch=false` 행은 흐리게 강등해 목록 뷰와 같은 신호를 준다.
   */
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
  /**
   * 노드에서 하위 사건 등록 — 전달 시 각 행에 hover/focus로 '+ 하위 사건' 액션이
   * 노출된다. 호출부(events.page)는 기존 등록 모달을 initialParent로 연다.
   */
  onCreateChild?: (parent: TreeCreateChildTarget) => void
  /**
   * lazy 서브트리(GET /events/parent/:id) 응답을 페이지로 올려보낸다.
   *
   * 목록 API는 루트만 페이징하므로 lazy로 불러온 손자 이하 사건은 페이지의
   * eventByIdMap·nodeIndexMap에 없다 — 그대로 두면 행 클릭이 '사건을 찾을 수
   * 없습니다' 미발견 판정으로 오발동한다. 페이지는 이 콜백으로 lazy 사건
   * 레지스트리를 채워 미발견 판정·드로어 해석의 폴백으로 쓴다.
   * 같은 데이터로 중복 호출될 수 있다(호출부는 id 기준 dedupe 병합).
   */
  onLazyEventsLoaded?: (loadedEvents: EventResponseDto[]) => void
  /** 빈 상태 3분기(로딩·필터0건·데이터0건) 판정용 — 검토 GAP-3 */
  isLoading?: boolean
  hasMoreData?: boolean
  hasActiveFilters?: boolean
  onResetFilters?: () => void
}

export const EventTreeView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  onSelectEvent,
  onCreateChild,
  onLazyEventsLoaded,
  isLoading = false,
  hasMoreData = false,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  /**
   * 평탄화가 남긴 노드 id 집합 = **필터를 통과했거나 매칭 자손을 가진 노드**.
   * 트리는 자식을 원본 `node.children`에서 재귀로 그리므로, 이 집합으로 걸러야
   * 조건 밖 가지가 계속 그려지는 일이 없다(필터가 없으면 전 노드가 들어 있어 no-op).
   */
  const keptNodeIds = useMemo(
    () => new Set(flattenedHierarchy.map((item) => item.node.id)),
    [flattenedHierarchy],
  )
  /** 자기는 조건을 만족하지 않고 문맥으로만 남은 노드 — 흐리게 강등한다. */
  const contextNodeIds = useMemo(
    () =>
      new Set(
        flattenedHierarchy
          .filter((item) => !item.isMatch)
          .map((item) => item.node.id),
      ),
    [flattenedHierarchy],
  )
  /**
   * 현재 표시 대상 root 사건만 추출.
   *
   * ⚠️ `depth === 0`만으로 판정하면 안 된다. '계층' 토글을 끄면(평면 모드) 평탄화가
   * **모든 노드를 depth 0으로** 밀어 넣기 때문에, 자식 사건이 자기 루트 카드로 한 번
   * 나오고 부모 카드 안 자식 노드로 또 한 번 나온다(`data-event-id`도 중복돼 키보드
   * 이동·aria-current가 첫 노드로만 매칭). 트리 뷰는 계층을 보여주는 뷰이므로
   * 표시 대상이더라도 **원본 루트(parentEventId 없음)**만 카드로 삼는다(검토 IA-9).
   */
  const rootEvents = useMemo(() => {
    const eventById = new Map<string, HistoricalEvent>()
    for (const e of events) eventById.set(e.id, e)

    const seen = new Set<string>()
    const out: HistoricalEvent[] = []
    for (const item of flattenedHierarchy) {
      if (seen.has(item.node.id)) continue
      const evt = eventById.get(item.node.id)
      if (!evt) continue
      // 평면 모드에서도 원본 계층 기준으로 루트를 판정
      if (evt.parentEventId) continue
      seen.add(item.node.id)
      out.push(evt)
    }
    return out
  }, [flattenedHierarchy, events])

  /**
   * 모든 노드 id 수집 — 전체 펼침 + 헤더 '노드 N개'의 모수.
   * 필터가 잘라낸 가지는 렌더도 안 되므로 여기서도 세지 않는다.
   */
  const allNodeIds = useMemo(() => {
    const ids: string[] = []
    const visit = (node: EventHierarchyNode) => {
      if (!keptNodeIds.has(node.id)) return
      ids.push(node.id)
      if (node.children) for (const child of node.children) visit(child)
    }
    for (const rootEvent of rootEvents) visit(rootEvent.hierarchy)
    return ids
  }, [rootEvents, keptNodeIds])

  /** 깊은 자식들 수동 펼침 — depth 1까지는 자동 펼침, expanded set이 추가 펼침 제어 */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  /** 강제 접기 모드 — 사용자가 "모두 접기"를 누르면 depth 1 자동 펼침도 무시 */
  const [collapseAll, setCollapseAll] = useState(false)

  const toggle = (id: string) => {
    // 사용자가 한 번이라도 토글하면 강제 접기 해제 (정상 manual 모드로)
    if (collapseAll) setCollapseAll(false)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    setCollapseAll(false)
    setExpanded(new Set(allNodeIds))
  }
  const collapseAllNodes = () => {
    setCollapseAll(true)
    setExpanded(new Set())
  }

  if (rootEvents.length === 0) {
    return (
      <CatalogViewEmpty
        icon={<FiChevronDown size={28} />}
        title="표시할 사건이 없습니다"
        description="사건을 등록하면 계층 구조가 표시됩니다."
        isLoading={isLoading}
        hasMoreData={hasMoreData}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
      />
    )
  }

  return (
    <Host>
      <Toolbar>
        <ToolbarStat>
          <strong>{rootEvents.length.toLocaleString()}</strong>개 root ·{' '}
          {allNodeIds.length.toLocaleString()}개 노드
        </ToolbarStat>
        <ToolbarActions>
          <ToolbarBtn type="button" onClick={expandAll}>
            모두 펼치기
          </ToolbarBtn>
          <ToolbarBtn type="button" onClick={collapseAllNodes}>
            모두 접기
          </ToolbarBtn>
        </ToolbarActions>
      </Toolbar>
      {rootEvents.map((evt) => {
        const root = evt.hierarchy
        const totalNodes = countAllNodes(root, keptNodeIds)
        const startYear = formatYear(root.period.start)
        const keptChildren = (root.children ?? []).filter((child) =>
          keptNodeIds.has(child.id),
        )
        return (
          <RootCard key={evt.id} $active={selectedEventId === root.id}>
            {/* 헤더는 <button>이라 내부에 '+ 하위' 버튼을 못 담는다(중첩 button 금지)
                — 행 셸이 형제로 나란히 담고 hover/focus-within에 액션을 드러낸다. */}
            <RootHeaderRow>
              <RootHeader
                type="button"
                onClick={() => onSelectEvent(root.id)}
                $active={selectedEventId === root.id}
                // 조건을 만족하지 않고 문맥으로만 남은 루트 — 목록 행과 같은 강등 신호
                $context={contextNodeIds.has(root.id)}
                aria-current={selectedEventId === root.id ? 'true' : undefined}
                data-event-id={root.id}
              >
                <RootYear>{startYear}</RootYear>
                <SharedCategoryDot category={evt.category} size={8} />
                <RootTitle>{root.title}</RootTitle>
                <CountryFlags
                  modern={evt.relatedCountries}
                  historical={evt.relatedHistoricalCountries}
                  max={2}
                  size="md"
                />
                <RootMeta>
                  <CategoryLabel>
                    {getCategoryName(evt.category, dbCategories)}
                  </CategoryLabel>
                  {totalNodes > 1 && (
                    <NodeCount>{totalNodes}개 노드</NodeCount>
                  )}
                </RootMeta>
              </RootHeader>
              {onCreateChild && (
                <RowAddBtn
                  type="button"
                  aria-label={`'${root.title}'의 하위 사건 등록`}
                  title="이 사건의 하위 사건 등록"
                  onClick={() =>
                    onCreateChild({ id: root.id, title: root.title })
                  }
                >
                  <FiPlus size={11} aria-hidden="true" />
                  <span>하위 사건</span>
                </RowAddBtn>
              )}
            </RootHeaderRow>
            {keptChildren.length > 0 && (
              <ChildrenWrap>
                {keptChildren.map((child) => (
                  <TreeNode
                    key={child.id}
                    node={child}
                    depth={1}
                    expanded={expanded}
                    collapseAll={collapseAll}
                    selectedId={selectedEventId}
                    keptNodeIds={keptNodeIds}
                    contextNodeIds={contextNodeIds}
                    hasActiveFilters={hasActiveFilters}
                    onToggle={toggle}
                    onSelect={onSelectEvent}
                    onCreateChild={onCreateChild}
                    onLazyEventsLoaded={onLazyEventsLoaded}
                  />
                ))}
              </ChildrenWrap>
            )}
          </RootCard>
        )
      })}
    </Host>
  )
}

const TreeNode: React.FC<{
  node: EventHierarchyNode
  depth: number
  expanded: Set<string>
  /** 강제 접기 모드 — true면 depth 1 자동 펼침도 무시. 사용자 manual 토글로 해제됨. */
  collapseAll: boolean
  selectedId: string | null
  /** 필터를 통과해 평탄화에 남은 노드 id — 여기 없는 가지는 그리지 않는다(검토 GAP-1) */
  keptNodeIds: ReadonlySet<string>
  /** 문맥으로만 남은 노드 id — 흐리게 강등 */
  contextNodeIds: ReadonlySet<string>
  /** lazy 로드 하위에 '필터 미적용' 뉘앙스를 붙일지 판단용 */
  hasActiveFilters: boolean
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onCreateChild?: (parent: TreeCreateChildTarget) => void
  onLazyEventsLoaded?: (loadedEvents: EventResponseDto[]) => void
}> = ({
  node,
  depth,
  expanded,
  collapseAll,
  selectedId,
  keptNodeIds,
  contextNodeIds,
  hasActiveFilters,
  onToggle,
  onSelect,
  onCreateChild,
  onLazyEventsLoaded,
}) => {
  const keptChildren = (node.children ?? []).filter((child) =>
    keptNodeIds.has(child.id),
  )
  const hasChildren = keptChildren.length > 0
  /**
   * 데이터 경계 노드 — 로드된 계층에 자식이 **아예 없는** 노드(목록 API는 손자
   * 계층에서 include가 끊긴다). 서버에 자식이 있는지 여기서는 알 수 없으므로,
   * hover 시 '하위 불러오기' 토글을 내밀고 펼치면 GET /events/parent/:id 로
   * 확인한다(없으면 '하위 사건 없음'으로 확정·캐시).
   * ⚠️ 자식이 있는데 **필터가 전부 잘라낸** 노드는 경계가 아니다 — 그건 필터의
   * 의도적 결과라 lazy 로드로 우회하면 안 된다(ToggleSpacer 분기 유지).
   */
  /**
   * lazy 경계 — 자식이 안 실려 온 노드. 여기서만 단건 조회로 더 파고든다.
   *
   * ⚠️ depth 게이트가 핵심이다. 목록 응답은 root→자식→**손자**(depth 3)까지 채우므로,
   * depth 0·1의 잎은 '아직 안 실려온 것'이 아니라 **진짜 잎**이다. 게이트가 없으면
   * 1차세계대전의 잎 자식 18개 전부에 확장 토글이 그려지고, 누를 때마다 빈 결과를
   * 받아오는 헛왕복이 된다(검토 K9 — `_count.childEvents` 추가보다 이 한 줄이 싸다).
   */
  const isLazyBoundary = (node.children?.length ?? 0) === 0 && depth >= 2
  const [lazyOpen, setLazyOpen] = useState(false)
  // 강제 접기 모드: 사용자가 토글한 것만 펼침
  // 정상 모드: depth 1까지 자동 펼침 + expanded set
  const isOpen = collapseAll
    ? expanded.has(node.id)
    : depth <= 1 || expanded.has(node.id)
  const startYear = formatYear(node.period.start)

  return (
    <NodeWrap $depth={depth}>
      <NodeRow
        role="button"
        tabIndex={0}
        $active={selectedId === node.id}
        $context={contextNodeIds.has(node.id)}
        aria-current={selectedId === node.id ? 'true' : undefined}
        aria-label={node.title}
        data-event-id={node.id}
        onClick={() => onSelect(node.id)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault()
            onSelect(node.id)
          }
        }}
      >
        {hasChildren ? (
          <ToggleBtn
            type="button"
            aria-label={isOpen ? '접기' : '펼치기'}
            aria-expanded={isOpen}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onToggle(node.id)
            }}
          >
            {isOpen ? (
              <FiChevronDown size={11} />
            ) : (
              <FiChevronRight size={11} />
            )}
          </ToggleBtn>
        ) : isLazyBoundary ? (
          <LazyToggleBtn
            type="button"
            $open={lazyOpen}
            aria-label={
              lazyOpen
                ? `'${node.title}' 하위 접기`
                : `'${node.title}' 하위 사건 불러오기`
            }
            aria-expanded={lazyOpen}
            title={lazyOpen ? '하위 접기' : '하위 불러오기'}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              setLazyOpen((prev) => !prev)
            }}
          >
            {lazyOpen ? (
              <FiChevronDown size={11} />
            ) : (
              <FiChevronRight size={11} />
            )}
          </LazyToggleBtn>
        ) : (
          <ToggleSpacer />
        )}
        <NodeYear>{startYear}</NodeYear>
        <NodeTitle>{node.title}</NodeTitle>
        {node.summary && <NodeSummary>{node.summary}</NodeSummary>}
        {onCreateChild && (
          <RowAddBtn
            type="button"
            aria-label={`'${node.title}'의 하위 사건 등록`}
            title="이 사건의 하위 사건 등록"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onCreateChild({ id: node.id, title: node.title })
            }}
          >
            <FiPlus size={11} aria-hidden="true" />
            <span>하위 사건</span>
          </RowAddBtn>
        )}
      </NodeRow>
      {hasChildren && isOpen && (
        <NodeChildren>
          {keptChildren.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              collapseAll={collapseAll}
              selectedId={selectedId}
              keptNodeIds={keptNodeIds}
              contextNodeIds={contextNodeIds}
              hasActiveFilters={hasActiveFilters}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onLazyEventsLoaded={onLazyEventsLoaded}
            />
          ))}
        </NodeChildren>
      )}
      {isLazyBoundary && lazyOpen && (
        <NodeChildren>
          <LazyBranch
            parentId={node.id}
            depth={depth + 1}
            selectedId={selectedId}
            hasActiveFilters={hasActiveFilters}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onLazyEventsLoaded={onLazyEventsLoaded}
          />
        </NodeChildren>
      )}
    </NodeWrap>
  )
}

/**
 * lazy 서브트리 — 로드된 계층 밖(손자 캡 아래)을 GET /events/parent/:id 로 채운다.
 *
 * - queryKey를 `['events', …]` 프리픽스 아래 두어, 등록/수정/삭제가 이미 쓰는
 *   `eventKeys.lists()`(=['events']) 무효화·refetch가 이 서브트리도 함께 갱신한다.
 * - 불러온 자식도 childEvents 3상 판별(LazyNode 주석)로 재귀 확장된다 — 현 서버는
 *   childEvents를 include하지 않으므로(항상 undefined) '하위 불러오기' 토글이
 *   자기교정으로 자식 존재를 확인하고, 없으면 '하위 사건 없음'으로 확정·캐시한다.
 * - ⚠️ 이 데이터는 페이지 필터(isMatch)를 **거치지 않는다** — 필터 활성 중엔
 *   블록 상단에 '필터 미적용' 뉘앙스를 한 줄로 밝힌다.
 */
const LazyBranch: React.FC<{
  parentId: string
  depth: number
  selectedId: string | null
  hasActiveFilters: boolean
  onSelect: (id: string) => void
  onCreateChild?: (parent: TreeCreateChildTarget) => void
  onLazyEventsLoaded?: (loadedEvents: EventResponseDto[]) => void
}> = ({
  parentId,
  depth,
  selectedId,
  hasActiveFilters,
  onSelect,
  onCreateChild,
  onLazyEventsLoaded,
}) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['events', 'byParent', parentId],
    queryFn: () => getEventsByParentId(parentId),
    staleTime: 30_000,
  })

  // 응답을 페이지 lazy 레지스트리로 올려보낸다 — 미발견 판정·드로어 폴백의 근거.
  // data는 react-query 캐시 참조라 리렌더에 안정적이어서 같은 응답당 1회만 발화한다.
  useEffect(() => {
    if (data && data.length > 0) onLazyEventsLoaded?.(data)
  }, [data, onLazyEventsLoaded])

  /**
   * 클라 정렬(부호 연도 asc, 미상은 끝) — 서버 orderBy는 startDate(DATETIME)라
   * BC·고대(startDate NULL)에 무의미하다. 구조화 연도 우선의 부호 연도로 재정렬한다.
   */
  const sortedChildren = useMemo(() => {
    if (!data) return []
    return [...data].sort((first, second) => {
      const firstYear = lazySignedStartYear(first)
      const secondYear = lazySignedStartYear(second)
      if (firstYear === null && secondYear === null) return 0
      if (firstYear === null) return 1
      if (secondYear === null) return -1
      return firstYear - secondYear
    })
  }, [data])

  if (isPending) {
    return (
      <LazyStateRow>
        <LazySpinner aria-hidden="true" />
        하위 사건 불러오는 중…
      </LazyStateRow>
    )
  }
  if (isError) {
    return (
      <LazyStateRow role="alert">
        하위 사건을 불러오지 못했습니다
        <LazyRetryBtn type="button" onClick={() => refetch()}>
          재시도
        </LazyRetryBtn>
      </LazyStateRow>
    )
  }
  if (!data || data.length === 0) {
    return <LazyStateRow>하위 사건 없음</LazyStateRow>
  }
  return (
    <>
      {hasActiveFilters && (
        <LazyFilterHint>서버에서 불러온 하위 — 현재 필터 미적용</LazyFilterHint>
      )}
      {sortedChildren.map((child) => (
        <LazyNode
          key={child.id}
          event={child}
          depth={depth}
          selectedId={selectedId}
          hasActiveFilters={hasActiveFilters}
          onSelect={onSelect}
          onCreateChild={onCreateChild}
          onLazyEventsLoaded={onLazyEventsLoaded}
        />
      ))}
    </>
  )
}

/** lazy 로드된 자식 행 — childEvents 3상 판별로 다시 LazyBranch로 파고든다. */
const LazyNode: React.FC<{
  event: EventResponseDto
  depth: number
  selectedId: string | null
  hasActiveFilters: boolean
  onSelect: (id: string) => void
  onCreateChild?: (parent: TreeCreateChildTarget) => void
  onLazyEventsLoaded?: (loadedEvents: EventResponseDto[]) => void
}> = ({
  event,
  depth,
  selectedId,
  hasActiveFilters,
  onSelect,
  onCreateChild,
  onLazyEventsLoaded,
}) => {
  const [open, setOpen] = useState(false)
  /**
   * childEvents 3상 판별 — 서버 계약: 현 GET /events/parent/:id 는 childEvents
   * 관계를 include하지 않아 **항상 undefined**다(repository findByParentEventId →
   * toEntity가 관계 드랍). undefined는 '자식 없음'이 아니라 '모름'이므로,
   *  · undefined → 데이터 경계 노드와 동일한 자기교정 '하위 불러오기' 토글을
   *    항상 렌더(펼치면 fetch로 확인, 없으면 '하위 사건 없음' 확정·캐시)
   *  · 배열 길이 0 → 잎 확정, 토글 미렌더
   *  · 길이 > 0 → 확장 토글(미래 include 대비)
   */
  const childrenUnknown = event.childEvents === undefined
  const hasServerChildren = (event.childEvents?.length ?? 0) > 0
  const startYear = formatLazyYear(event)

  return (
    <NodeWrap $depth={depth}>
      <NodeRow
        role="button"
        tabIndex={0}
        $active={selectedId === event.id}
        aria-current={selectedId === event.id ? 'true' : undefined}
        aria-label={event.title}
        data-event-id={event.id}
        onClick={() => onSelect(event.id)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault()
            onSelect(event.id)
          }
        }}
      >
        {hasServerChildren ? (
          <ToggleBtn
            type="button"
            aria-label={open ? '접기' : '펼치기'}
            aria-expanded={open}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              setOpen((prev) => !prev)
            }}
          >
            {open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
          </ToggleBtn>
        ) : childrenUnknown ? (
          <LazyToggleBtn
            type="button"
            $open={open}
            aria-label={
              open
                ? `'${event.title}' 하위 접기`
                : `'${event.title}' 하위 사건 불러오기`
            }
            aria-expanded={open}
            title={open ? '하위 접기' : '하위 불러오기'}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              setOpen((prev) => !prev)
            }}
          >
            {open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
          </LazyToggleBtn>
        ) : (
          <ToggleSpacer />
        )}
        <NodeYear>{startYear}</NodeYear>
        <NodeTitle>{event.title}</NodeTitle>
        {event.description && <NodeSummary>{event.description}</NodeSummary>}
        {onCreateChild && (
          <RowAddBtn
            type="button"
            aria-label={`'${event.title}'의 하위 사건 등록`}
            title="이 사건의 하위 사건 등록"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onCreateChild({ id: event.id, title: event.title })
            }}
          >
            <FiPlus size={11} aria-hidden="true" />
            <span>하위 사건</span>
          </RowAddBtn>
        )}
      </NodeRow>
      {(hasServerChildren || childrenUnknown) && open && (
        <NodeChildren>
          <LazyBranch
            parentId={event.id}
            depth={depth + 1}
            selectedId={selectedId}
            hasActiveFilters={hasActiveFilters}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onLazyEventsLoaded={onLazyEventsLoaded}
          />
        </NodeChildren>
      )}
    </NodeWrap>
  )
}

/**
 * 이 카드가 실제로 그리는 노드 수. `keptNodeIds`에 없는 가지(= 필터가 잘라낸 자손)는
 * 세지 않는다 — 화면엔 없는 자식을 '3개 노드'라고 주장하던 모수 오류(검토 GAP-1).
 */
const countAllNodes = (
  node: EventHierarchyNode,
  keptNodeIds: ReadonlySet<string>,
): number => {
  let count = 1
  if (node.children) {
    for (const child of node.children) {
      if (!keptNodeIds.has(child.id)) continue
      count += countAllNodes(child, keptNodeIds)
    }
  }
  return count
}

// ─────────────────────────────────────────────────────────────────────────────

const Host = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 4px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 4px 2px;
  flex-wrap: wrap;
`

const ToolbarStat = styled.div`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const ToolbarActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const ToolbarBtn = styled.button`
  padding: 4px 10px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${focusVisible}
`

/**
 * 행 hover/focus에만 드러나는 '+ 하위 사건' 액션.
 * ⚠️ 참조 인터폴레이션(RootHeaderRow·NodeRow의 reveal 규칙)보다 먼저 정의할 것.
 */
const RowAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(37, 99, 235, 0.1);
    border-color: rgba(37, 99, 235, 0.4);
    color: #2563eb;
  }
  &:focus-visible {
    opacity: 1;
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

/** 데이터 경계 노드의 '하위 불러오기' 토글 — 로컬 자식이 있는 노드의 실선 셰브론과
 *  구분되게 점선 테두리. 열려 있는 동안엔 항상 보인다. */
const LazyToggleBtn = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: opacity 0.15s, background 0.15s, color 0.15s;

  &:hover {
    background: rgba(37, 99, 235, 0.16);
    color: #2563eb;
  }
  &:focus-visible {
    opacity: 1;
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const RootCard = styled.div<{ $active: boolean }>`
  border-radius: 12px;
  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? `background: rgba(255,255,255,0.025);
         border: 1px solid ${$active ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.06)'};`
      : `background: #fff;
         border: 1px solid ${$active ? 'rgba(37,99,235,0.4)' : 'rgba(15,23,42,0.06)'};`}
  overflow: hidden;
`

/** 루트 헤더 행 셸 — <button> 헤더와 '+ 하위' 액션을 형제로 담는다(중첩 button 회피).
 *  기존 헤더가 갖던 하단 헤어라인은 셸이 소유한다. */
const RootHeaderRow = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'};

  &:hover ${RowAddBtn}, &:focus-within ${RowAddBtn} {
    opacity: 1;
  }

  > ${RowAddBtn} {
    margin-right: 10px;
  }
`

const RootHeader = styled.button<{ $active: boolean; $context?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: none;
  /* 자기는 조건을 만족하지 않고 매칭 자손 때문에 남은 루트 — 흐리게 강등 */
  opacity: ${({ $context }) => ($context ? 0.55 : 1)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.12)'
        : 'rgba(37,99,235,0.06)'
      : 'transparent'};
  cursor: pointer;
  font-family: inherit;
  text-align: left;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.025)'};
  }
  ${focusVisible}
`

const RootYear = styled.span`
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  flex-shrink: 0;
  min-width: 48px;
`


const RootTitle = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RootMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const CategoryLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NodeCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 6px;
  border-radius: 999px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#1e40af')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.1)'};
`

const ChildrenWrap = styled.div`
  padding: 6px 14px 12px;
`

const NodeWrap = styled.div<{ $depth: number }>`
  position: relative;
  margin-left: ${({ $depth }) => ($depth - 1) * 18}px;
`

// 노드 행은 클릭 가능하지만 내부에 실제 <button>(ToggleBtn)을 담으므로 <button>이 아닌
// role="button" <div>로 둔다(<button> 안 <button> DOM 중첩 오류 회피). 키보드는 onKeyDown.
const NodeRow = styled.div<{ $active: boolean; $context?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px 6px 0;
  border: none;
  /* 문맥용으로만 남은 노드 — 조건을 만족한 행과 시각적으로 구분(목록 뷰와 동일 규약) */
  opacity: ${({ $context }) => ($context ? 0.55 : 1)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37,99,235,0.14)'
        : 'rgba(37,99,235,0.06)'
      : 'transparent'};
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
  }
  &:hover ${RowAddBtn}, &:focus-within ${RowAddBtn} {
    opacity: 1;
  }
  &:hover ${LazyToggleBtn}, &:focus-within ${LazyToggleBtn} {
    opacity: 1;
  }
  ${focusVisible}
`

const ToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 0;
  border-radius: 4px;

  &:hover {
    background: rgba(37, 99, 235, 0.16);
    color: #2563eb;
  }
  ${focusVisible}
`

const ToggleSpacer = styled.span`
  width: 16px;
  flex-shrink: 0;
`

const NodeYear = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  min-width: 36px;
`

const NodeTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  flex-shrink: 0;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NodeSummary = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NodeChildren = styled.div`
  margin-top: 2px;
  border-left: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'};
  padding-left: 12px;
  margin-left: 8px;
`

// ── lazy 서브트리 상태 표시(행 안에 소박하게) ────────────────────────────────

const lazySpin = keyframes`
  to { transform: rotate(360deg); }
`

const LazySpinner = styled.span`
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(37, 99, 235, 0.25);
  border-top-color: #2563eb;
  animation: ${lazySpin} 0.7s linear infinite;
`

const LazyStateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LazyRetryBtn = styled.button`
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${focusVisible}
`

/** lazy 하위는 페이지 필터를 거치지 않는다 — 그 사실을 블록 상단에 한 줄로 밝힌다. */
const LazyFilterHint = styled.div`
  padding: 2px 8px 4px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

