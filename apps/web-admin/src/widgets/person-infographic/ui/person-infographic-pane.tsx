/**
 * 인물 인포그래픽 페인.
 *
 * 기본(헤더 "인물" 진입):
 *  매트릭스 / 은하계 / 시대 스토리 / 왕조 4개 인포그래픽 뷰.
 *
 * 국가 프리셋 (예: 국가 상세 → "이 나라 인물 전체 보기 →" 링크, URL `?country=<id>`):
 *  인포그래픽 대신 카드 리스트(PersonListContent)를 렌더.
 *  프리셋이 해제(헤더 "인물" 재클릭 등)되면 다시 인포그래픽으로 돌아감.
 */
import { useQuery } from '@tanstack/react-query'

import styled from 'styled-components'

import { usePersons } from '@/entities/person/api'
import { dynastyApi } from '@/shared/api/dynasty'
import { PersonListContent } from '@/shared/ui/person-list-content/person-list-content'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  PersonInnerPillBtn,
  PersonInnerPillNav,
} from '@/widgets/country/country-detail/ui/country-detail.styles'

import type { PersonInfographicView } from '../model/filter.store'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import { InfographicContent } from './infographic-content'

const VIEW_OPTIONS: Array<[Exclude<PersonInfographicView, 'cards'>, string]> = [
  ['matrix', '매트릭스'],
  ['galaxy', '은하계'],
  ['story', '시대 스토리'],
  ['dynasty', '왕조'],
  ['stats', '능력치'],
]

interface PersonInfographicPaneProps {
  onPersonClick: (id: string) => void
  /** 국가 프리셋 — 있을 때만 카드 리스트 뷰를 렌더 (없으면 인포그래픽) */
  initialCountryId?: string | null
  /** 프리셋 해제 콜백 (예: 상단 배너의 "전체 보기" 버튼). 제공 시 해제 UI 노출. */
  onClearPreset?: () => void
}

export function PersonInfographicPane({
  onPersonClick,
  initialCountryId = null,
  onClearPreset,
}: PersonInfographicPaneProps) {
  const view = usePersonInfographicFilterStore((s) => s.view)
  const setView = usePersonInfographicFilterStore((s) => s.setView)
  const activeView: Exclude<PersonInfographicView, 'cards'> =
    view === 'cards' ? 'story' : view

  // 국가 프리셋이 있으면 인포그래픽 뷰 스위처를 숨기고 바로 카드 리스트만 노출
  if (initialCountryId) {
    return (
      <PaneWrap>
        <PersonListCardsView
          onPersonClick={onPersonClick}
          initialCountryId={initialCountryId}
          onClearPreset={onClearPreset}
        />
      </PaneWrap>
    )
  }

  return (
    <PaneWrap>
      <PersonInnerPillNav role="tablist" aria-label="인물 인포그래픽 뷰">
        {VIEW_OPTIONS.map(([key, label]) => (
          <PersonInnerPillBtn
            key={key}
            type="button"
            role="tab"
            aria-selected={activeView === key}
            $active={activeView === key}
            onClick={() => setView(key)}
          >
            {label}
          </PersonInnerPillBtn>
        ))}
      </PersonInnerPillNav>
      <InfographicContent onPersonClick={onPersonClick} />
    </PaneWrap>
  )
}

const PaneWrap = styled.div`
  padding: 24px 32px 0;
  @media (max-width: 768px) {
    padding: 16px 16px 0;
  }
`

/** 카드 모양 스켈레톤 — 텍스트 안내보다 안정감 있는 로딩 표지 */
function PersonCardSkeletonGrid({ count }: { count: number }) {
  return (
    <SkeletonGrid>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <SkeletonImageBlock />
          <SkeletonContent>
            <SkeletonLine $w="60%" />
            <SkeletonLine $w="40%" />
            <SkeletonLine $w="80%" />
            <SkeletonLine $w="55%" />
          </SkeletonContent>
        </SkeletonCard>
      ))}
    </SkeletonGrid>
  )
}

const SkeletonGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  padding: 24px 32px 32px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 16px;
  }
`

const SkeletonCard = styled.div`
  display: flex;
  border-radius: 16px;
  min-height: 116px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`

const shimmer = `
  @keyframes skel {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

const SkeletonImageBlock = styled.div`
  ${shimmer}
  width: 110px;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)'
      : 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)'};
  background-size: 200% 100%;
  animation: skel 1.4s ease-in-out infinite;
`

const SkeletonContent = styled.div`
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
`

const SkeletonLine = styled.div<{ $w: string }>`
  ${shimmer}
  height: 10px;
  width: ${({ $w }) => $w};
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)'
      : 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)'};
  background-size: 200% 100%;
  animation: skel 1.4s ease-in-out infinite;
`

/** 국가 프리셋 카드 뷰 — PersonListContent 재사용 (국가 상세 "인물 리스트"와 동일 디자인) */
function PersonListCardsView({
  onPersonClick,
  initialCountryId,
  onClearPreset,
}: {
  onPersonClick: (id: string) => void
  initialCountryId: string
  onClearPreset?: () => void
}) {
  const { data: persons = [], isLoading } = usePersons()
  const { data: dynasties = [] } = useQuery({
    queryKey: ['dynasties'],
    queryFn: () => dynastyApi.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return <PersonCardSkeletonGrid count={6} />
  }

  return (
    <PersonListContent
      persons={persons as any}
      dynasties={(dynasties as Array<{ id: string; name: string }>).map(
        (d) => ({ id: d.id, name: d.name }),
      )}
      initialCountryId={initialCountryId}
      invalidateKeys={['persons']}
      title="인물 리스트"
      emptyMessage="등록된 인물이 없습니다."
      emptyFilterMessage="검색·필터 조건에 맞는 인물이 없습니다."
      onPersonClick={onPersonClick}
      onClearPreset={onClearPreset}
      renderRegisterModal={(props) => (
        <PersonRegisterViewModal
          isOpen={props.isOpen}
          onClose={props.onClose}
          initialCountryId={props.initialCountryId}
          editPersonId={props.editPersonId}
          onSuccess={props.onSuccess}
        />
      )}
    />
  )
}
