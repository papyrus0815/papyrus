/**
 * VIEW: 카드 — 세기/왕조 그룹 없이 전체 인물을 활성 정렬(SortBar) 기준으로
 * 한 그리드에 나열하는 평면 랭킹 뷰. "전체 상위 N명 / 최근순 전체 목록"을 위한 것.
 *
 * 세기 스토리(story)가 세기 그룹 서사라면, 이 뷰는 그룹 없이 정렬만으로 전체를
 * 위→아래로 재배열한다(영향력·이름·출생·사망). 핀 인물은 정렬과 무관하게 맨 위로
 * (makeSortFnWithPinned) — 그룹이 없어 전역 상단 고정이 자연스럽다.
 */
import { useMemo, useState } from 'react'

import styled from 'styled-components'

import { INFOGRAPHIC_DEFAULTS } from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import { makeSortFnWithPinned } from '../model/sort-helpers'
import type { AdaptedPerson } from '../model/types'

import { EraCardGrid, PersonCardItem } from './_shared/person-card'

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  query: string
  pinned: Set<string>
  togglePin: (id: string, event: React.MouseEvent) => void
}

export function CardsView({ people, onOpen, query, pinned, togglePin }: Props) {
  const sort = usePersonInfographicFilterStore((state) => state.sort)
  const [visibleCount, setVisibleCount] = useState<number>(
    INFOGRAPHIC_DEFAULTS.CARDS_PAGE_SIZE,
  )

  const sortFn = useMemo(
    () => makeSortFnWithPinned(pinned, sort),
    [pinned, sort],
  )
  const sorted = useMemo(() => people.slice().sort(sortFn), [people, sortFn])

  const shown = sorted.slice(0, visibleCount)
  const remaining = sorted.length - shown.length

  return (
    <Wrap>
      <EraCardGrid>
        {shown.map((person) => (
          <PersonCardItem
            key={person.id}
            p={person}
            era={person.era}
            q={query}
            pinned={pinned.has(person.id)}
            onTogglePin={togglePin}
            onOpen={onOpen}
          />
        ))}
      </EraCardGrid>
      {remaining > 0 && (
        <MoreBtn
          type="button"
          onClick={() => setVisibleCount(sorted.length)}
        >
          + {remaining}명 더보기
        </MoreBtn>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
`

const MoreBtn = styled.button`
  margin: 16px auto 0;
  display: block;
  padding: 6px 16px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f3f4f6'};
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
