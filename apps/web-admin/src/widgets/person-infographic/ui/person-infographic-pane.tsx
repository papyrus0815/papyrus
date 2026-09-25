/**
 * 인물 목록 페인.
 *
 * 목록(연대 원장) / 카드 / 시대 스토리 / 왕조 / 매트릭스 / 은하계 / 능력치 / 기록 비교 8개 뷰.
 * 크롬(검색·필터·뷰 전환·결과 요약)은 사건 목록(/events)과 같은 문법으로 짠다.
 * 기록 비교(records)는 필터 스코프와 무관한 별도 데이터(compare API)라
 * InfographicContent 대신 전용 뷰로 분기한다.
 *
 * 국가 상세 → "이 나라 인물 보기" 진입은 ?countries=<id>로 들어와
 * useFilterUrlSync가 scope.country에 적용 → 동일 목록 + 국가 필터로 표시.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import {
  FiActivity,
  FiAperture,
  FiBookOpen,
  FiGrid,
  FiLayout,
  FiList,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonInfographicView } from '../model/filter.store'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import { useFilterUrlSync } from '../model/url-sync'

import {
  ViewHint,
  ViewRow,
  ViewSegment,
  ViewSegmented,
  VisuallyHiddenTitle,
} from './_shared/catalog.styles'
import { InfographicContent } from './infographic-content'
import { RecordsCompareView } from './records-compare-view'

const VIEW_OPTIONS: Array<{
  key: PersonInfographicView
  label: string
  icon: ReactNode
  hint: string
}> = [
  {
    key: 'list',
    label: '목록',
    icon: <FiList size={13} />,
    hint: '전체 인물을 출생 세기별로 훑기 — 레일을 따라 시대순 연대 원장',
  },
  {
    key: 'cards',
    label: '카드',
    icon: <FiGrid size={13} />,
    hint: '정렬 기준(영향력·이름·출생·사망)으로 전체 인물을 한 그리드에',
  },
  {
    key: 'story',
    label: '시대 스토리',
    icon: <FiBookOpen size={13} />,
    hint: '출생 세기별 카드 묶음 — 시대마다 누가 있었는지',
  },
  {
    key: 'dynasty',
    label: '왕조',
    icon: <FiShield size={13} />,
    hint: '왕조·가문 단위로 묶어 보기',
  },
  {
    key: 'matrix',
    label: '매트릭스',
    icon: <FiLayout size={13} />,
    hint: '시대 × 국가 분포 매트릭스',
  },
  {
    key: 'galaxy',
    label: '은하계',
    icon: <FiAperture size={13} />,
    hint: '시간축 위 인물 분포 — 점 크기는 영향력',
  },
  {
    key: 'stats',
    label: '능력치',
    icon: <FiActivity size={13} />,
    hint: '능력치 분포·비교',
  },
  {
    key: 'records',
    label: '기록 비교',
    icon: <FiTrendingUp size={13} />,
    hint: '인물을 골라 재임·기록을 나란히 비교',
  },
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
  const activeView = usePersonInfographicFilterStore((state) => state.view)
  const setView = usePersonInfographicFilterStore((state) => state.setView)

  const navRef = useRef<HTMLDivElement>(null)

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
    setView(VIEW_OPTIONS[nextIdx].key)
    const tabs =
      navRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[nextIdx]?.focus()
  }

  const viewSwitcher = (
    <ViewSegmented ref={navRef} role="tablist" aria-label="인물 보기 방식">
      {VIEW_OPTIONS.map(({ key, label, icon }, idx) => (
        <ViewSegment
          key={key}
          id={`person-view-tab-${key}`}
          type="button"
          role="tab"
          title={label}
          aria-selected={activeView === key}
          aria-controls="person-view-panel"
          tabIndex={activeView === key ? 0 : -1}
          $active={activeView === key}
          onClick={() => setView(key)}
          onKeyDown={(event) => onTabKeyDown(event, idx)}
        >
          {icon}
          <span className="label">{label}</span>
        </ViewSegment>
      ))}
    </ViewSegmented>
  )

  const hint = (
    <ViewHint>
      {VIEW_OPTIONS.find((option) => option.key === activeView)?.hint}
    </ViewHint>
  )

  return (
    <PaneWrap>
      <VisuallyHiddenTitle>인물</VisuallyHiddenTitle>
      {activeView === 'records' ? (
        <>
          <ViewRow>{viewSwitcher}</ViewRow>
          {hint}
          <RecordsCompareView onPersonClick={onPersonClick} />
        </>
      ) : (
        <InfographicContent
          onPersonClick={onPersonClick}
          viewSwitcher={viewSwitcher}
          viewHint={hint}
        />
      )}
    </PaneWrap>
  )
}

const PaneWrap = styled.div`
  padding: 24px 28px 0;
  @media (max-width: 768px) {
    padding: 16px 16px 0;
  }
`
