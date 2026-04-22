/**
 * 인물 인포그래픽 + 4뷰 전환 스위처를 묶은 페인.
 *
 * - 매트릭스 / 은하계 / 시대 스토리 / 왕조 4뷰만 노출 (카드는 제외 — 인포그래픽 디자인 유지)
 * - 뷰 선택은 zustand persist로 세션 간 유지
 */
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
    <div style={{ padding: '24px 32px 0' }}>
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
    </div>
  )
}
