/**
 * 인물 인포그래픽 페인.
 *
 * 매트릭스 / 은하계 / 시대 스토리 / 왕조 / 능력치 / 기록 비교 6개 뷰.
 * 기록 비교(records)는 필터 스코프와 무관한 별도 데이터(compare API)라
 * InfographicContent 대신 전용 뷰로 분기한다.
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
import { useFilterUrlSync } from '../model/url-sync'
import { InfographicContent } from './infographic-content'
import { RecordsCompareView } from './records-compare-view'

const VIEW_OPTIONS: Array<[Exclude<PersonInfographicView, 'cards'>, string]> = [
  ['matrix', '매트릭스'],
  ['galaxy', '은하계'],
  ['story', '시대 스토리'],
  ['dynasty', '왕조'],
  ['stats', '능력치'],
  ['records', '기록 비교'],
]

interface PersonInfographicPaneProps {
  onPersonClick: (id: string) => void
}

export function PersonInfographicPane({
  onPersonClick,
}: PersonInfographicPaneProps) {
  // URL ↔ store 동기화 — records 뷰에서 InfographicContent가 언마운트돼도
  // view·recordPersonIds 등 쿼리 동기화가 유지되도록 페인 레벨에서 1회 등록.
  useFilterUrlSync()
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
      {activeView === 'records' ? (
        <RecordsCompareView onPersonClick={onPersonClick} />
      ) : (
        <InfographicContent onPersonClick={onPersonClick} />
      )}
    </PaneWrap>
  )
}

const PaneWrap = styled.div`
  padding: 24px 32px 0;
  @media (max-width: 768px) {
    padding: 16px 16px 0;
  }
`
