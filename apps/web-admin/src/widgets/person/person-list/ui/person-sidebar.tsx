/**
 * 인물 목록 사이드바의 자립 래퍼 — 지면(page)이 아니라 **레이아웃**이 렌더한다.
 *
 * 셸이 ContentLayout으로 올라가면서 사이드바는 페이지보다 오래 살아남는다. 그래서 예전에
 * 페이지가 내려주던 것(선택 id·등록 모달·상세 필터 시트)을 여기서 직접 소유한다 —
 * 페이지에 의존하면 페이지가 언마운트될 때 사이드바가 같이 죽는다.
 *
 * 상세 지면 전용이다 — 목록 지면(/persons-timeline)은 사이드바 없이 본문 툴바의 '필터'가
 * 같은 상세 필터 시트를 연다(persons-timeline.page).
 */
import React, { useCallback, useState } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { SidebarSheet } from '@/widgets/content-shell'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import { PersonFilterPanel } from '@/widgets/person-infographic'

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

  const openAdvanced = useCallback(() => setAdvancedFilterOpen(true), [])

  // 사이드바는 내비게이션 — 어느 모드든 행을 누르면 모달 없이 곧장 상세로 간다.
  // (상세 지면에서 모달을 거치면 '옆 인물로 바로 넘어가기'라는 이 목록의 쓸모가 사라진다)
  const openDetail = useCallback(
    (id: string) => navigate(pathKeys.personsTimelineDetail(id)),
    [navigate],
  )

  return (
    <>
      {/* 레이아웃은 상세 지면에서만 이 사이드바를 그린다(목록 지면은 본문이 목록·필터를 가진다).
          전체 목록으로 '지금 어디인가'와 옆 인물 이동을 맡는다. */}
      <PersonList
        selectedId={personId}
        onSelect={openDetail}
        onAdd={() => setCreateOpen(true)}
        onOpenAdvancedFilters={openAdvanced}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />

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

