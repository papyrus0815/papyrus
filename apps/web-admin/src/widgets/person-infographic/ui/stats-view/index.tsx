/**
 * 능력치 인포그래픽 view — 사용자 평가(stats + traits) 기반 분석.
 *
 * Sub-tab:
 *  - overview : leaderboard + 평가 패턴 + 시대 추이 + 사망유형 + 태그 페어 + 진행률
 *  - compare  : 다중 인물 레이더 overlay
 *  - group    : 가문/국가 그룹 평균 레이더 overlay
 *  - matrix   : 두 축 선택 가능한 2D scatter + 사분면 라벨
 */
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import { usePersonEvaluationIndex } from '@/shared/lib/person-evaluation-index'
import type { AdaptedPerson } from '../../model/types'

import { ComparePane } from './compare'
import { GroupRadarPane } from './group-radar'
import { MatrixPane } from './matrix'
import { OverviewPane } from './overview'
import { EmptyHint } from './shared'

interface Props {
  people: AdaptedPerson[]
  onPersonClick: (personId: string) => void
}

type SubTab = 'overview' | 'compare' | 'group' | 'matrix'

const TAB_OPTIONS: Array<{ key: SubTab; label: string }> = [
  { key: 'overview', label: '개요' },
  { key: 'compare', label: '인물 비교' },
  { key: 'group', label: '가문·국가 비교' },
  { key: 'matrix', label: '2축 분포' },
]

export function StatsView({ people, onPersonClick }: Props) {
  const evalIndex = usePersonEvaluationIndex()
  const [tab, setTab] = useState<SubTab>('overview')

  const evaluatedPeople = useMemo(
    () => people.filter((p) => evalIndex.get(p.id)?.hasEvaluation === true),
    [people, evalIndex],
  )


  // C1: 인물 상세에서 "비교 추가"로 진입 — sessionStorage 신호 읽고 compare sub-tab으로 점프
  useEffect(() => {
    const pending = sessionStorage.getItem('person-stats:pending-compare')
    if (!pending) return
    sessionStorage.removeItem('person-stats:pending-compare')
    setTab('compare')
    // 다음 tick에 ComparePane이 마운트된 후 이벤트 발사
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('stats-view:compare-add', { detail: pending }))
    })
  }, [])

  if (people.length === 0) {
    return <EmptyHint>현재 필터에 해당하는 인물이 없습니다.</EmptyHint>
  }

  return (
    <Wrap>
      <SubTabBar role="tablist">
        {TAB_OPTIONS.map(({ key, label }) => (
          <SubTabBtn
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            $active={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </SubTabBtn>
        ))}
      </SubTabBar>

      {tab === 'overview' && (
        <OverviewPane
          people={people}
          evaluated={evaluatedPeople}
          evalIndex={evalIndex}
          onPersonClick={onPersonClick}
        />
      )}
      {tab === 'compare' && (
        <ComparePane
          people={people}
          evaluated={evaluatedPeople}
          evalIndex={evalIndex}
          onPersonClick={onPersonClick}
        />
      )}
      {tab === 'group' && (
        <GroupRadarPane evaluated={evaluatedPeople} evalIndex={evalIndex} />
      )}
      {tab === 'matrix' && (
        <MatrixPane evaluated={evaluatedPeople} evalIndex={evalIndex} onPersonClick={onPersonClick} />
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 0;
`

const SubTabBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)'};
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const SubTabBtn = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  white-space: nowrap;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  border: none;
  border-radius: 7px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.13)'
        : '#ffffff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)'
        : '0 1px 2px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(15,23,42,0.03)'
      : 'none'};
  transition: background 0.15s ease, color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
