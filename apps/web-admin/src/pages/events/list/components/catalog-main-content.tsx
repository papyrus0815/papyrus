/**
 * 카탈로그 메인 영역 (활성 뷰 모드).
 *
 * - 보기 전환(7개 모드) 세그먼트
 * - 표시 옵션: 정렬·정렬 방향·페이지 크기 (필터와 분리된 *display* 컨트롤)
 * - 위젯 슬롯 — 부모(events.page)가 각 모드별 위젯 인스턴스를 만들어 전달
 *
 * 모드별 슬롯 표:
 *   timeline  → timelineSlot
 *   list      → listSlot
 *   map       → mapSlot
 *   grid      → gridSlot
 *   dashboard → dashboardSlot
 *   tree      → treeSlot
 *   gallery   → gallerySlot
 *
 * 상세 패널은 `CatalogDetailDrawer`로 분리.
 */
import React from 'react'

import {
  FiArrowDown,
  FiBarChart2,
  FiClock,
  FiGitBranch,
  FiGrid,
  FiImage,
  FiList,
  FiMapPin,
} from 'react-icons/fi'

import type { SortOption } from '@/features/event-list/lib'
import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'

import * as Filter from '../../styles/filter.styles'
import * as List from '../../styles/list.styles'
import * as PageStyles from '../../styles/list-page.styles'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'

interface Props {
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  /** 현재 필터·북마크가 적용된 *보이는* 항목 수 — 화면 상의 진실 */
  visibleCount: number
  /** 전체 등록 사건 수 — visibleCount와 다를 때만 보조 표시 */
  totalCount: number

  // 표시 옵션
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  onSortChange: (sortBy: SortOption) => void
  onSortDirectionToggle: () => void

  pageSize: number
  onPageSizeChange: (size: number) => void

  // 7개 모드 슬롯
  timelineSlot: React.ReactNode
  listSlot: React.ReactNode
  mapSlot: React.ReactNode
  gridSlot: React.ReactNode
  dashboardSlot: React.ReactNode
  treeSlot: React.ReactNode
  gallerySlot: React.ReactNode
}

interface ModeDef {
  value: ViewMode
  label: string
  icon: React.ReactNode
}

const MODES: ModeDef[] = [
  { value: VIEW_MODES.TIMELINE, label: '타임라인', icon: <FiClock size={13} /> },
  { value: VIEW_MODES.LIST, label: '목록', icon: <FiList size={13} /> },
  { value: VIEW_MODES.MAP, label: '지도', icon: <FiMapPin size={13} /> },
  { value: VIEW_MODES.GRID, label: '연대', icon: <FiGrid size={13} /> },
  {
    value: VIEW_MODES.DASHBOARD,
    label: '통계',
    icon: <FiBarChart2 size={13} />,
  },
  { value: VIEW_MODES.TREE, label: '트리', icon: <FiGitBranch size={13} /> },
  { value: VIEW_MODES.GALLERY, label: '갤러리', icon: <FiImage size={13} /> },
]

export const CatalogMainContent: React.FC<Props> = ({
  viewMode,
  setViewMode,
  visibleCount,
  totalCount,
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionToggle,
  pageSize,
  onPageSizeChange,
  timelineSlot,
  listSlot,
  mapSlot,
  gridSlot,
  dashboardSlot,
  treeSlot,
  gallerySlot,
}) => {
  const isFiltered = visibleCount !== totalCount

  let activeSlot: React.ReactNode
  switch (viewMode) {
    case VIEW_MODES.TIMELINE:
      activeSlot = timelineSlot
      break
    case VIEW_MODES.LIST:
      activeSlot = listSlot
      break
    case VIEW_MODES.MAP:
      activeSlot = mapSlot
      break
    case VIEW_MODES.GRID:
      activeSlot = gridSlot
      break
    case VIEW_MODES.DASHBOARD:
      activeSlot = dashboardSlot
      break
    case VIEW_MODES.TREE:
      activeSlot = treeSlot
      break
    case VIEW_MODES.GALLERY:
      activeSlot = gallerySlot
      break
    default:
      activeSlot = timelineSlot
  }

  return (
    <PageStyles.ActiveContent>
      <ToolbarStyles.ViewSwitcherRow>
        <ToolbarStyles.ViewSegmented role="group" aria-label="보기 모드">
          {MODES.map((mode) => {
            const active = viewMode === mode.value
            return (
              <ToolbarStyles.ViewSegment
                key={mode.value}
                type="button"
                $active={active}
                onClick={() => setViewMode(mode.value)}
                aria-pressed={active}
                title={mode.label}
                aria-label={mode.label}
              >
                {mode.icon}
                <span className="label">{mode.label}</span>
              </ToolbarStyles.ViewSegment>
            )
          })}
        </ToolbarStyles.ViewSegmented>

        {/* 표시 옵션 — 정렬 + 방향 + 페이지 크기. 필터와 시각 family 분리(border 없음). */}
        <ToolbarStyles.DisplayOptions>
          <Filter.SortSelect
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="정렬 기준"
          >
            <option value="recent">최근순</option>
            <option value="duration">기간순</option>
          </Filter.SortSelect>
          <Filter.SortButton
            type="button"
            onClick={onSortDirectionToggle}
            aria-label={sortDirection === 'asc' ? '오름차순' : '내림차순'}
            $direction={sortDirection}
          >
            <FiArrowDown size={14} aria-hidden="true" />
          </Filter.SortButton>
          <List.SortSelect
            value={pageSize}
            aria-label="페이지 크기"
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ width: '92px', fontSize: '12px' }}
          >
            <option value={20}>20개</option>
            <option value={50}>50개</option>
            <option value={100}>100개</option>
          </List.SortSelect>
        </ToolbarStyles.DisplayOptions>

        <ToolbarStyles.ViewMeta aria-live="polite">
          {isFiltered ? (
            <>
              <strong>{visibleCount.toLocaleString()}</strong>
              <span aria-hidden="true"> / </span>
              <span>{totalCount.toLocaleString()}건</span>
            </>
          ) : (
            <strong>{visibleCount.toLocaleString()}건</strong>
          )}
        </ToolbarStyles.ViewMeta>
      </ToolbarStyles.ViewSwitcherRow>

      {activeSlot}
    </PageStyles.ActiveContent>
  )
}
