import styled from 'styled-components'

import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'

import { DescendantNode } from './card'
import { ForkFromOneParent, ForkToCompactChildren } from './forks'

const DESCENDANT_BADGES = ['손자녀', '증손자녀', '고손자녀', '후손']

/**
 * 자녀 카드 바로 아래에 후손 세대를 그린다. 윗 세대(조부모/증조부모) 카드와
 * 같은 컴팩트 GeoNode 스타일을 사용한다.
 *  - 1명: 단순 수직선(ForkFromOneParent)
 *  - N명: T-fork (ForkToCompactChildren) + 각 카드 위 수직선(::before)
 *
 * 손자녀(depth=1) → 증손자녀(depth=2)까지 재귀 렌더링.
 * 더 깊이 있을 수 있지만 BFS limit + UI 가독성 위해 maxDepth 제한.
 */
export function DescendantSubtree({
  descendants,
  childrenOf,
  depth,
  maxDepth,
  visited,
  inMarriageByPersonId,
  onPersonClick,
}: {
  descendants: FamilyTreePerson[]
  childrenOf: Map<string, FamilyTreePerson[]>
  depth: number
  maxDepth: number
  visited: Set<string>
  inMarriageByPersonId?: Map<string, FamilyTreePerson[]>
  onPersonClick?: (id: string) => void
}) {
  if (descendants.length === 0) return null
  const badge = DESCENDANT_BADGES[depth] ?? '후손'
  return (
    <GrandchildrenBlock>
      <GrandchildrenForkTrack>
        {descendants.length > 1 ? (
          <ForkToCompactChildren count={descendants.length} />
        ) : (
          <ForkFromOneParent />
        )}
      </GrandchildrenForkTrack>
      <GrandchildrenRow>
        {descendants.map((g) => {
          const next =
            depth + 1 < maxDepth && g.id
              ? (childrenOf.get(g.id) ?? []).filter((c) => !visited.has(c.id))
              : []
          const nextVisited = new Set(visited)
          if (g.id) nextVisited.add(g.id)
          const inMarriagesWith = g.id ? inMarriageByPersonId?.get(g.id) ?? [] : []
          return (
            <GrandchildPair key={g.id}>
              <DescendantNode
                person={g}
                badge={badge}
                inMarriagesWith={inMarriagesWith}
                onPersonClick={onPersonClick}
              />
              {next.length > 0 && (
                <DescendantSubtree
                  descendants={next}
                  childrenOf={childrenOf}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  visited={nextVisited}
                  inMarriageByPersonId={inMarriageByPersonId}
                  onPersonClick={onPersonClick}
                />
              )}
            </GrandchildPair>
          )
        })}
      </GrandchildrenRow>
    </GrandchildrenBlock>
  )
}

const GrandchildrenBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

const GrandchildrenForkTrack = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  height: 28px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const GrandchildrenRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 100%;
  gap: 12px;
  justify-content: center;
  align-items: flex-start;
`

const GrandchildPair = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 0;
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -16px;
    width: 1.75px;
    height: 16px;
    transform: translateX(-50%);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
  }
`
