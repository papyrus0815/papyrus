/**
 * 인물 인포그래픽 페인.
 *
 * 매트릭스 / 은하계 / 시대 스토리 / 왕조 / 능력치 5개 인포그래픽 뷰.
 *
 * 국가 상세 → "이 나라 인물 보기" 진입은 ?countries=<id>로 들어와
 * useFilterUrlSync가 scope.country에 적용 → 동일 인포그래픽 + 국가 필터로 표시.
 */
import styled from 'styled-components'

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
}

export function PersonInfographicPane({
  onPersonClick,
}: PersonInfographicPaneProps) {
  const view = usePersonInfographicFilterStore((s) => s.view)
  const setView = usePersonInfographicFilterStore((s) => s.setView)
  const activeView: Exclude<PersonInfographicView, 'cards'> =
    view === 'cards' ? 'story' : view

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
