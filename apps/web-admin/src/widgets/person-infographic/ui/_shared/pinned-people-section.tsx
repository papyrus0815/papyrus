/**
 * 좋아요 고정(핀) 인물 전역 섹션 — era-story·dynasty 그룹 뷰 상단 공용.
 *
 * 이전엔 핀 인물이 각 세기/왕조 그룹 *내부*에서만 상단으로 떠, 오래된 세기의
 * 핀 인물이 페이지 하단에 묻혔다("고정=항상 위" 어포던스와 어긋남).
 * 이제 그룹과 무관하게 최상단에 모아 보여준다. 중복을 피하려 호출부는 이 인물들을
 * 각 그룹 집계에서 제외해 전달한다(people = 핀 인물만, 이미 정렬됨).
 */
import { useState } from 'react'

import styled from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'

import { INFOGRAPHIC_DEFAULTS } from '../../model/constants'
import type { AdaptedPerson } from '../../model/types'

import { EraCardGrid, PersonCardItem } from './person-card'

interface Props {
  /** 핀 된 인물 — 이미 활성 정렬 기준으로 정렬된 상태 */
  people: AdaptedPerson[]
  query: string
  onTogglePin: (id: string, event: React.MouseEvent) => void
  onOpen: (id: string) => void
}

export function PinnedPeopleSection({
  people,
  query,
  onTogglePin,
  onOpen,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  if (people.length === 0) return null

  const shown = expanded
    ? people
    : people.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
  const hasMore = people.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N

  return (
    <Block>
      <BlockHdr>
        <BlockTitle>★ 고정</BlockTitle>
        <BlockCount>{people.length}명</BlockCount>
      </BlockHdr>
      <EraCardGrid>
        {shown.map((person) => (
          <PersonCardItem
            key={person.id}
            p={person}
            era={person.era}
            q={query}
            pinned
            onTogglePin={onTogglePin}
            onOpen={onOpen}
          />
        ))}
      </EraCardGrid>
      {hasMore && (
        <MoreBtn onClick={() => setExpanded((prev) => !prev)}>
          {expanded
            ? '접기'
            : `+ ${people.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더보기`}
        </MoreBtn>
      )}
    </Block>
  )
}

const Block = styled.div`
  border-radius: 12px;
  padding: 16px 18px;
  ${({ theme }) => glassOrSolidMixin(theme)}
`

const BlockHdr = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
`

const BlockTitle = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.active};
`

const BlockCount = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MoreBtn = styled.button`
  margin: 12px auto 0;
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
