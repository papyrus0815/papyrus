/**
 * 카탈로그 메인 영역 (활성 탭).
 *
 * - 보기 전환(타임라인 ↔ 목록) 세그먼트
 * - 위젯 슬롯 (EventTimeline / EventCompactList) — 위젯 인스턴스를 부모가 만들어 전달
 *
 * 상세 패널은 `CatalogDetailDrawer`로 분리.
 */
import React from 'react'

import { FiClock, FiList } from 'react-icons/fi'

import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'

import * as PageStyles from '../../styles/list-page.styles'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'

interface Props {
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  visibleCount: number

  timelineSlot: React.ReactNode
  listSlot: React.ReactNode
}

export const CatalogMainContent: React.FC<Props> = ({
  viewMode,
  setViewMode,
  visibleCount,
  timelineSlot,
  listSlot,
}) => {
  return (
    <PageStyles.ActiveContent>
      <ToolbarStyles.ViewSwitcherRow>
        <ToolbarStyles.ViewSegmented role="group" aria-label="보기 모드">
          <ToolbarStyles.ViewSegment
            type="button"
            $active={viewMode === VIEW_MODES.TIMELINE}
            onClick={() => setViewMode(VIEW_MODES.TIMELINE)}
            aria-pressed={viewMode === VIEW_MODES.TIMELINE}
          >
            <FiClock size={13} />
            <span>타임라인</span>
          </ToolbarStyles.ViewSegment>
          <ToolbarStyles.ViewSegment
            type="button"
            $active={viewMode === VIEW_MODES.LIST}
            onClick={() => setViewMode(VIEW_MODES.LIST)}
            aria-pressed={viewMode === VIEW_MODES.LIST}
          >
            <FiList size={13} />
            <span>목록</span>
          </ToolbarStyles.ViewSegment>
        </ToolbarStyles.ViewSegmented>
        <ToolbarStyles.ViewMeta>
          {visibleCount.toLocaleString()}건
        </ToolbarStyles.ViewMeta>
      </ToolbarStyles.ViewSwitcherRow>

      {viewMode === VIEW_MODES.TIMELINE ? timelineSlot : listSlot}
    </PageStyles.ActiveContent>
  )
}
