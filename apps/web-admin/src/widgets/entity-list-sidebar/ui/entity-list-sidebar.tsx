/**
 * EntityListSidebar — 모든 콘텐츠 지면의 좌측 목록 사이드바.
 *
 * 국가(/country)·인물(/persons-timeline)이 각자 갖고 있던 목록 사이드바를 하나로 모은 것.
 * 도메인은 데이터를 EntitySidebarItem/Group으로 매핑하고 셀렉트만 넘기면 되고, 아래는 전부
 * 여기서 처리한다:
 *   헤더(제목·표시/전체 분수 카운트·등록·접기) / 검색·필터 행 / 그룹 아코디언(접힘 persist) /
 *   행 렌더·핀 / roving tabindex·↑↓·Enter / 선택 항목 그룹 자동 펼침 + 스크롤 /
 *   결과 수 aria-live 공지 / 스켈레톤·빈 상태·에러 상태 / 접힘 rail·포커스 복원
 *
 * 검색어와 필터 '값'은 도메인이 소유한다(URL 동기화·디바운스 정책이 지면마다 다름).
 * items는 **이미 걸러진** 목록을 받는다 — 필터 규칙을 이 컴포넌트에 밀어넣으면 도메인마다
 * 예외가 생겨 결국 DSL이 된다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiChevronRight, FiList } from 'react-icons/fi'

import * as S from '@/shared/ui/sidebar-list'
import { SidebarHeader } from '@/widgets/content-shell'

import { useCollapsedGroups } from '../model/use-collapsed-groups.hook'
import type {
  EntitySidebarGroup,
  EntitySidebarItem,
  EntitySidebarSelect,
} from '../model/types'
import { EntitySidebarFilters } from './entity-sidebar-filters'
import { EntitySidebarRow } from './entity-sidebar-row'
import { EntitySidebarEmpty, EntitySidebarError } from './entity-sidebar-states'

export interface EntityListSidebarProps {
  /** 사이드바 헤더 제목 — '국가 목록', '인물 목록' 등 */
  title: string
  /** 빈 상태·에러 문구에 쓰는 도메인 명사 — '국가', '인물' */
  noun: string
  /** 그룹 접힘·앵커 id 접두어로 쓰는 도메인 키 — 'country', 'person' 등 */
  domainKey: string

  /** 이미 검색·필터가 적용된 목록 */
  items: EntitySidebarItem[]
  /** 카운트 분모(필터 전 전체). 표시 수와 다르면 헤더가 분수로 바뀐다 */
  totalCount: number
  /** 표시 순서대로 넘긴 그룹 정의. items의 groupId가 여기 없으면 '미분류'로 흡수 */
  groups: EntitySidebarGroup[]

  selectedId: string | null
  onSelect: (id: string) => void

  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder?: string
  selects?: EntitySidebarSelect[]
  hasActiveFilter: boolean
  onClearFilters?: () => void
  /** 검색·필터 아래 한 줄 (유도 배지 등) */
  discovery?: React.ReactNode

  pinnedIds?: string[]
  onTogglePin?: (id: string) => void

  /** 헤더 + 버튼 */
  onAdd?: () => void
  addLabel?: string

  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void

  collapsed?: boolean
  onToggleCollapse?: () => void
  /** 접힘 rail 아이콘 — 도메인 상징 (기본: 목록 아이콘) */
  collapsedIcon?: React.ReactNode
}

const UNGROUPED = '__ungrouped__'

function EntityListSidebarBase({
  title,
  noun,
  domainKey,
  items,
  totalCount,
  groups,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  searchPlaceholder,
  selects = [],
  hasActiveFilter,
  onClearFilters,
  discovery,
  pinnedIds,
  onTogglePin,
  onAdd,
  addLabel,
  isLoading = false,
  isError = false,
  onRetry,
  collapsed = false,
  onToggleCollapse,
  collapsedIcon,
}: EntityListSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  const collapsibleGroupIds = useMemo(
    () =>
      groups
        .filter((group) => !group.alwaysExpanded && !group.isQuickAccess)
        .map((group) => group.id),
    [groups],
  )
  const alwaysExpandedIds = useMemo(
    () =>
      groups
        .filter((group) => group.alwaysExpanded || group.isQuickAccess)
        .map((group) => group.id),
    [groups],
  )
  const { isCollapsed, toggle, expandForSelection } = useCollapsedGroups(
    `${domainKey}-sidebar-collapsed-groups`,
    collapsibleGroupIds,
    alwaysExpandedIds,
  )

  // 그룹별 버킷 — groups 순서를 그대로 따르고, 비어 있는 그룹은 그리지 않는다.
  // groups에 없는 groupId는 '미분류'로 모은다(never-drop): 어떤 시점에도 항목이 조용히 사라지면 안 된다.
  const renderedGroups = useMemo(() => {
    const buckets = new Map<string, EntitySidebarItem[]>()
    for (const item of items) {
      const list = buckets.get(item.groupId)
      if (list) list.push(item)
      else buckets.set(item.groupId, [item])
    }
    const result: (EntitySidebarGroup & { items: EntitySidebarItem[] })[] = []
    for (const group of groups) {
      const bucket = buckets.get(group.id)
      if (!bucket?.length) continue
      result.push({ ...group, items: bucket })
      buckets.delete(group.id)
    }
    const leftover: EntitySidebarItem[] = []
    for (const bucket of buckets.values()) leftover.push(...bucket)
    if (leftover.length > 0) {
      result.push({
        id: UNGROUPED,
        name: '미분류',
        accent: '#a1a1aa',
        items: leftover,
      })
    }
    return result
  }, [items, groups])

  // 검색·필터 중에는 접힘을 무시하고 전부 펼친다 — 결과가 접힌 그룹에 숨으면 안 된다.
  const { flatRowIds, rowIndexByKey } = useMemo(() => {
    const ids: string[] = []
    const indexMap = new Map<string, number>()
    for (const group of renderedGroups) {
      if (!hasActiveFilter && isCollapsed(group.id)) continue
      for (const item of group.items) {
        indexMap.set(`${group.id}-${item.id}`, ids.length)
        ids.push(item.id)
      }
    }
    return { flatRowIds: ids, rowIndexByKey: indexMap }
  }, [renderedGroups, hasActiveFilter, isCollapsed])

  // roving tabindex 단일 진입점 — 선택 행(첫 등장), 없으면 첫 행.
  const tabStopIndex = useMemo(() => {
    if (flatRowIds.length === 0) return -1
    const selectedIndex = selectedId ? flatRowIds.indexOf(selectedId) : -1
    return selectedIndex >= 0 ? selectedIndex : 0
  }, [flatRowIds, selectedId])

  const { handleListKeyDown, handleSearchKeyDown } = S.useListKeyboardNav({
    containerRef: listRef,
    rowIds: flatRowIds,
    onSelect,
  })

  // 접기/펼치기 토글 시 누른 버튼이 언마운트돼 포커스가 body로 유실되는 것 방지 —
  // 전환 후 반대편 토글 버튼으로 포커스를 옮긴다.
  const collapsedDidMountRef = useRef(false)
  useEffect(() => {
    if (!collapsedDidMountRef.current) {
      collapsedDidMountRef.current = true
      return
    }
    const targetLabel = collapsed ? '패널 펼치기' : '패널 접기'
    paneRef.current
      ?.querySelector<HTMLElement>(`[aria-label="${targetLabel}"]`)
      ?.focus()
  }, [collapsed])

  // 외부 진입(딥링크 등)으로 선택이 바뀌면 그 그룹을 임시로 펼치고 행으로 스크롤.
  const selectedGroupId = useMemo(() => {
    if (!selectedId) return null
    for (const group of renderedGroups) {
      if (group.isQuickAccess) continue
      if (group.items.some((item) => item.id === selectedId)) return group.id
    }
    return null
  }, [selectedId, renderedGroups])

  useEffect(() => {
    if (!selectedId || !selectedGroupId) return
    expandForSelection(selectedGroupId)
    // 펼침이 커밋·레이아웃된 뒤 스크롤 — 전역 조회 대신 listRef 내부만 본다.
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLElement>(
            `#${domainKey}-${CSS.escape(selectedId)}`,
          )
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    })
    return () => {
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [selectedId, selectedGroupId, expandForSelection, domainKey])

  /**
   * 제목 아래 보조 줄 — 필터 중이면 '표시 / 전체'를 분수로 드러낸다.
   *
   * 빠른 접근(고정·최근)은 통상 그룹의 항목을 **다시 한 번** 싣는 자리다. items.length를
   * 그대로 쓰면 그 중복이 더해져 분자가 분모를 넘는다(실제로 '453 / 452개'가 떴다).
   */
  const visibleCount = useMemo(() => {
    const quickIds = new Set(
      groups.filter((group) => group.isQuickAccess).map((group) => group.id),
    )
    if (quickIds.size === 0) return items.length
    return items.filter((item) => !quickIds.has(item.groupId)).length
  }, [items, groups])

  const headerCount =
    visibleCount !== totalCount
      ? `${visibleCount} / ${totalCount}개`
      : `${totalCount}개`

  // 결과 수 스크린리더 공지 — 타이핑 폭주를 피해 300ms 디바운스
  const [liveMessage, setLiveMessage] = useState('')
  useEffect(() => {
    if (!hasActiveFilter) {
      setLiveMessage('')
      return
    }
    const timerId = setTimeout(() => {
      setLiveMessage(
        visibleCount === 0 ? '검색 결과 없음' : `${noun} ${visibleCount}개`,
      )
    }, 300)
    return () => clearTimeout(timerId)
  }, [visibleCount, hasActiveFilter, noun])

  const pinnedSet = useMemo(() => new Set(pinnedIds ?? []), [pinnedIds])
  const handleTogglePin = useCallback(
    (id: string) => onTogglePin?.(id),
    [onTogglePin],
  )

  const isInitialLoading = isLoading && items.length === 0

  return (
    <S.ListPaneWrapper>
      <S.ListPane ref={paneRef} $collapsed={collapsed}>
        {!collapsed && (
          <>
            <SidebarHeader
              title={title}
              subtitle={headerCount}
              subtitleTitle={
                visibleCount !== totalCount
                  ? `표시 ${visibleCount} / 전체 ${totalCount}`
                  : undefined
              }
              action={
                onAdd ? (
                  <S.SidebarActionButton
                    type="button"
                    aria-label={addLabel ?? `${noun} 등록`}
                    title={addLabel ?? `${noun} 등록`}
                    onClick={onAdd}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SidebarActionButton>
                ) : undefined
              }
              onCollapse={onToggleCollapse}
            />

            <EntitySidebarFilters
              query={query}
              onQueryChange={onQueryChange}
              searchLabel={`${noun} 검색`}
              searchPlaceholder={searchPlaceholder ?? `${noun} 검색...`}
              onSearchKeyDown={handleSearchKeyDown}
              selects={selects}
              hasActiveFilter={hasActiveFilter}
              onClearFilters={onClearFilters}
              discovery={discovery}
            />

            <S.SrLiveRegion role="status" aria-live="polite">
              {liveMessage}
            </S.SrLiveRegion>

            <S.SidebarTabBody>
              <S.ListContainer>
                <S.VirtualList
                  ref={listRef}
                  role="listbox"
                  aria-label={title}
                  tabIndex={-1}
                  onKeyDown={handleListKeyDown}
                >
                  {isInitialLoading ? (
                    <S.SidebarListSkeleton label={`${title} 로딩 중`} />
                  ) : isError && items.length === 0 ? (
                    <EntitySidebarError noun={noun} onRetry={onRetry} />
                  ) : items.length === 0 ? (
                    <EntitySidebarEmpty
                      noun={noun}
                      query={query}
                      hasActiveFilter={hasActiveFilter}
                      addLabel={addLabel}
                      onAdd={onAdd}
                    />
                  ) : (
                    renderedGroups.map((group) => {
                      const groupCollapsed =
                        !hasActiveFilter && isCollapsed(group.id)
                      return (
                        <React.Fragment key={group.id}>
                          <S.GroupSectionHeader
                            type="button"
                            onClick={() => toggle(group.id)}
                            aria-expanded={!groupCollapsed}
                            title={
                              group.isQuickAccess
                                ? '빠른 접근 — 전체 목록은 아래 그룹에서'
                                : undefined
                            }
                          >
                            <S.GroupCaret $collapsed={groupCollapsed} aria-hidden>
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </S.GroupCaret>
                            {group.leadIcon ? (
                              <S.GroupLeadIcon
                                aria-hidden
                                style={{ color: group.accent }}
                              >
                                {group.leadIcon}
                              </S.GroupLeadIcon>
                            ) : (
                              <S.GroupDot
                                aria-hidden
                                style={{ background: group.accent }}
                              />
                            )}
                            <S.GroupTitle>{group.name}</S.GroupTitle>
                            <S.GroupCount>{group.items.length}</S.GroupCount>
                          </S.GroupSectionHeader>
                          {!groupCollapsed &&
                            group.items.map((item) => (
                              <EntitySidebarRow
                                key={`${group.id}-${item.id}`}
                                item={item}
                                isQuickAccess={!!group.isQuickAccess}
                                idPrefix={domainKey}
                                selectedId={selectedId}
                                accentColor={group.accent}
                                rowIndex={
                                  rowIndexByKey.get(`${group.id}-${item.id}`) ?? 0
                                }
                                isTabStop={
                                  rowIndexByKey.get(`${group.id}-${item.id}`) ===
                                  tabStopIndex
                                }
                                pinned={pinnedSet.has(item.id)}
                                onSelect={onSelect}
                                onTogglePin={onTogglePin ? handleTogglePin : undefined}
                              />
                            ))}
                        </React.Fragment>
                      )
                    })
                  )}
                </S.VirtualList>
              </S.ListContainer>
            </S.SidebarTabBody>
          </>
        )}
        {collapsed && (
          <S.CollapsedRail role="group" aria-label={`${title} (접힘)`}>
            <S.CollapsedToggleBtn
              type="button"
              onClick={onToggleCollapse}
              title="패널 펼치기"
              aria-label="패널 펼치기"
            >
              <FiChevronRight size={16} />
            </S.CollapsedToggleBtn>
            <S.CollapsedHint aria-hidden>
              {collapsedIcon ?? <FiList size={16} />}
            </S.CollapsedHint>
          </S.CollapsedRail>
        )}
      </S.ListPane>
    </S.ListPaneWrapper>
  )
}

export const EntityListSidebar = React.memo(EntityListSidebarBase)
