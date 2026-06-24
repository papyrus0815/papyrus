/**
 * 인물 인포그래픽 페인.
 *
 * 매트릭스 / 은하계 / 시대 스토리 / 왕조 / 능력치 5개 인포그래픽 뷰.
 *
 * 국가 상세 → "이 나라 인물 보기" 진입은 ?countries=<id>로 들어와
 * useFilterUrlSync가 scope.country에 적용 → 동일 인포그래픽 + 국가 필터로 표시.
 */
import { useRef, type KeyboardEvent } from 'react'

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

  const navRef = useRef<HTMLElement>(null)

  // 탭 키보드 네비게이션 (ARIA tabs 패턴 — 화살표/Home/End로 이동 + 포커스 이동)
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const last = VIEW_OPTIONS.length - 1
    let nextIdx = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      nextIdx = idx === last ? 0 : idx + 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      nextIdx = idx === 0 ? last : idx - 1
    else if (event.key === 'Home') nextIdx = 0
    else if (event.key === 'End') nextIdx = last
    else return
    event.preventDefault()
    setView(VIEW_OPTIONS[nextIdx][0])
    const tabs =
      navRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[nextIdx]?.focus()
  }

  return (
    <PaneWrap>
      <PersonInnerPillNav ref={navRef} role="tablist" aria-label="인물 인포그래픽 뷰">
        {VIEW_OPTIONS.map(([key, label], idx) => (
          <PersonInnerPillBtn
            key={key}
            id={`person-view-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={activeView === key}
            aria-controls="person-view-panel"
            tabIndex={activeView === key ? 0 : -1}
            $active={activeView === key}
            onClick={() => setView(key)}
            onKeyDown={(event) => onTabKeyDown(event, idx)}
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
