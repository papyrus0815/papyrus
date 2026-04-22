import React from 'react'

import { FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi'

import { PersonFilterPanel } from '@/widgets/person-infographic'

import {
  DASHBOARD_MENU_ITEMS,
  type DashboardContentView,
} from '../model/dashboard-menu-items'
import * as S from './left-filter-slot.styles'

interface LeftFilterSlotProps {
  view: DashboardContentView
  /** 국가 상세 모드일 때 그 국가 이름(컨텍스트 배지) */
  countryContextLabel?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

/** 탭별 placeholder 설명. 4단계 이후 실제 필터 컴포넌트로 교체 예정. */
const VIEW_PLACEHOLDER: Record<
  DashboardContentView,
  { title: string; description: string }
> = {
  stats: {
    title: '통계 뷰',
    description:
      '국가 통계는 필터가 필요 없어요. 우측에서 전체 현황을 확인할 수 있습니다.',
  },
  person: {
    title: '인물 필터',
    description:
      '시대·지역·분야·영향력 등 인물 탐색용 필터가 곧 여기에 들어옵니다.',
  },
  legislature: {
    title: '저원 필터',
    description: '입법 기관·회기 필터는 추후 추가 예정입니다.',
  },
  military: {
    title: '군사 필터',
    description: '병종·시대별 필터는 추후 추가 예정입니다.',
  },
  administration: {
    title: '행정부 필터',
    description: '비교할 국가를 우측에서 선택하면 다국가 비교가 시작됩니다.',
  },
  dynasty: {
    title: '가문 필터',
    description: '가문 타입·연대 필터는 추후 추가 예정입니다.',
  },
  ethnicity: {
    title: '민족 필터',
    description: '민족 분류 필터는 추후 추가 예정입니다.',
  },
  events: {
    title: '사건 필터',
    description: '기간·카테고리·참전국 필터는 추후 추가 예정입니다.',
  },
}

export function LeftFilterSlot({
  view,
  countryContextLabel,
  collapsed = false,
  onToggleCollapse,
}: LeftFilterSlotProps) {
  const menuItem = DASHBOARD_MENU_ITEMS.find((m) => m.id === view)
  const placeholder = VIEW_PLACEHOLDER[view]

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
      <S.Header>
        <S.HeaderTitle>
          <S.HeaderLabel>필터</S.HeaderLabel>
          <S.HeaderValue>{menuItem?.label ?? '—'}</S.HeaderValue>
        </S.HeaderTitle>
        {onToggleCollapse && (
          <S.CollapseBtn
            type="button"
            onClick={onToggleCollapse}
            aria-label="패널 접기"
            title="패널 접기"
          >
            <FiChevronLeft size={16} />
          </S.CollapseBtn>
        )}
      </S.Header>

      <S.Body>
        {countryContextLabel && (
          <S.ContextChip>
            국가 <span>{countryContextLabel}</span>
          </S.ContextChip>
        )}
        {view === 'person' ? (
          <PersonFilterPanel />
        ) : (
          <S.Placeholder>
            <S.PlaceholderTitle>{placeholder.title}</S.PlaceholderTitle>
            {placeholder.description}
          </S.Placeholder>
        )}
      </S.Body>
    </S.Wrapper>
  )
}
