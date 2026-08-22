/**
 * 인물 목록 사이드바의 자립 래퍼 — 지면(page)이 아니라 **레이아웃**이 렌더한다.
 *
 * 셸이 ContentLayout으로 올라가면서 사이드바는 페이지보다 오래 살아남는다. 그래서 예전에
 * 페이지가 내려주던 것(선택 id·등록 모달·상세 필터 시트)을 여기서 직접 소유한다 —
 * 페이지에 의존하면 페이지가 언마운트될 때 사이드바가 같이 죽는다.
 *
 * 모바일 필터 트리거도 여기 있다. 같은 시트를 여는 컨트롤이 둘(사이드바 배지·모바일 FAB)인데
 * 시트 상태가 페이지에 있으면 사이드바 쪽 배지가 그걸 열 수 없다.
 */
import React, { useCallback, useState } from 'react'

import { FiFilter } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { SidebarSheet, SidebarSheetTrigger } from '@/widgets/content-shell'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  countActiveScopes,
  PersonFilterPanel,
  usePersonInfographicFilterStore,
} from '@/widgets/person-infographic'

import { PersonList } from './person-list'

/** `/persons-timeline/:personId` 에서 선택 id 추출 (목록 지면이면 null) */
function selectedPersonId(pathname: string): string | null {
  const match = /^\/persons-timeline\/([^/]+)/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

interface PersonSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function PersonSidebar({
  collapsed,
  onToggleCollapse,
}: PersonSidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const personId = selectedPersonId(pathname)

  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // 필터 트리거 배지용 — 활성 필터 개수 (scope + 영향력 + 생존 + 검색어)
  const activeFilterCount = usePersonInfographicFilterStore(
    (state) =>
      countActiveScopes(state.scopes) +
      (state.minInfluence > 0 ? 1 : 0) +
      (state.aliveFilter !== 'all' ? 1 : 0) +
      (state.query.trim() ? 1 : 0),
  )

  const openAdvanced = useCallback(() => setAdvancedFilterOpen(true), [])

  return (
    <>
      <PersonList
        selectedId={personId}
        onSelect={(id) => navigate(pathKeys.personsTimelineDetail(id))}
        onAdd={() => setCreateOpen(true)}
        onOpenAdvancedFilters={openAdvanced}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {/* 모바일 floating 트리거 — 좌측이 숨는 폭에서 상세 필터로 가는 유일한 경로.
          상세를 보는 중에는 본문 조작을 가리므로 목록 지면에서만 띄운다. */}
      {!personId && (
        <SidebarSheetTrigger
          type="button"
          onClick={openAdvanced}
          aria-label={
            activeFilterCount > 0
              ? `필터 열기, ${activeFilterCount}개 적용 중`
              : '필터 열기'
          }
        >
          <FiFilter size={20} />
          {activeFilterCount > 0 && (
            <FilterCountBadge aria-hidden>{activeFilterCount}</FilterCountBadge>
          )}
        </SidebarSheetTrigger>
      )}

      <SidebarSheet
        open={advancedFilterOpen}
        onClose={() => setAdvancedFilterOpen(false)}
        title="인물 상세 필터"
      >
        <PersonFilterPanel />
      </SidebarSheet>

      {/* 등록 전용 — 수정 모달은 상세 패널을 가진 페이지가 따로 소유한다 */}
      <PersonRegisterViewModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        editPersonId={null}
        onSuccess={() => setCreateOpen(false)}
      />
    </>
  )
}

/** 모바일 필터 트리거 우상단 — 활성 필터 개수 배지 */
const FilterCountBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.background.primary};
`
