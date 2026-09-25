/**
 * 좋아요 고정(핀) 인물 전역 섹션 — era-story·dynasty 그룹 뷰 상단 공용.
 *
 * 이전엔 핀 인물이 각 세기/왕조 그룹 *내부*에서만 상단으로 떠, 오래된 세기의
 * 핀 인물이 페이지 하단에 묻혔다("고정=항상 위" 어포던스와 어긋남).
 * 이제 그룹과 무관하게 최상단에 모아 보여준다. 중복을 피하려 호출부는 이 인물들을
 * 각 그룹 집계에서 제외해 전달한다(people = 핀 인물만, 이미 정렬됨).
 */
import { useState } from 'react'

import { INFOGRAPHIC_DEFAULTS } from '../../model/constants'
import type { AdaptedPerson } from '../../model/types'

import { GroupSection, MoreBtn } from './group-section'
import { EraCardGrid, PersonCardItem } from './person-card'

interface Props {
  /** 핀 된 인물 — 이미 활성 정렬 기준으로 정렬된 상태 */
  people: AdaptedPerson[]
  query: string
  onTogglePin: (id: string, event: React.MouseEvent) => void
  onOpen: (id: string) => void
}

/** GroupPanel 안에서 첫 그룹으로 렌더된다(호박색 도트). */
export function PinnedPeopleSection({
  people,
  query,
  onTogglePin,
  onOpen,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  if (people.length === 0) return null

  const shown = expanded
    ? people
    : people.slice(0, INFOGRAPHIC_DEFAULTS.GROUP_TOP_N)
  const hasMore = people.length > INFOGRAPHIC_DEFAULTS.GROUP_TOP_N

  return (
    <GroupSection
      id="pinned"
      label="고정"
      count={people.length}
      tone="pinned"
      collapsed={collapsed}
      onToggle={() => setCollapsed((prev) => !prev)}
    >
      <EraCardGrid>
        {shown.map((person) => (
          <PersonCardItem
            key={person.id}
            person={person}
            query={query}
            pinned
            onTogglePin={onTogglePin}
            onOpen={onOpen}
          />
        ))}
      </EraCardGrid>
      {hasMore && (
        <MoreBtn type="button" onClick={() => setExpanded((prev) => !prev)}>
          {expanded
            ? '접기'
            : `+ ${people.length - INFOGRAPHIC_DEFAULTS.GROUP_TOP_N}명 더 보기`}
        </MoreBtn>
      )}
    </GroupSection>
  )
}
