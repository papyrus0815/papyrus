import React from 'react'

import { FiChevronRight, FiFilter } from 'react-icons/fi'

import { usePersonsInfographic } from '@/entities/person/api'
import { PersonFilterPanel } from '@/widgets/person-infographic'

import type { DashboardContentView } from '../model/dashboard-menu-items'
import { SidebarHeader } from './sidebar-header'
import * as S from './left-filter-slot.styles'

interface LeftFilterSlotProps {
  /**
   * 현재는 'person' 한 가지만 의미가 있음. 다른 view는 fullScreen 모드를 쓰므로
   * 좌측 슬롯 자체가 마운트되지 않는다. 시그니처는 미래 확장을 위해 유지.
   */
  view: DashboardContentView
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function LeftFilterSlot({
  view,
  collapsed = false,
  onToggleCollapse,
}: LeftFilterSlotProps) {
  // person view에서 count 표시 (PersonFilterPanel과 경량 인포그래픽 캐시 공유 — 추가 fetch 없음).
  // 접힘 상태에서는 count를 그리지 않으므로 쿼리도 끈다 — 인물 상세 딥링크(/persons-timeline/:id)는
  // 좌측 패널이 기본 접힘이라, 이 게이트가 없으면 인물 한 명 보려고 전량 목록을 받게 된다.
  const { data: rawPersons } = usePersonsInfographic({ enabled: !collapsed })
  const personCount = rawPersons?.length ?? 0

  if (collapsed) {
    return (
      <S.Wrapper $collapsed aria-label="필터 패널 (접힘)">
        <S.CollapsedRail>
          <S.CollapseBtn
            type="button"
            onClick={onToggleCollapse}
            aria-label="패널 펼치기"
            title="패널 펼치기"
          >
            <FiChevronRight size={16} />
          </S.CollapseBtn>
          <FiFilter size={16} opacity={0.5} />
        </S.CollapsedRail>
      </S.Wrapper>
    )
  }

  return (
    <S.Wrapper aria-label="컨텍스트 필터">
      <SidebarHeader
        title="인물 필터"
        count={view === 'person' ? personCount : undefined}
        onCollapse={onToggleCollapse}
      />
      <S.Body>{view === 'person' ? <PersonFilterPanel /> : null}</S.Body>
    </S.Wrapper>
  )
}
