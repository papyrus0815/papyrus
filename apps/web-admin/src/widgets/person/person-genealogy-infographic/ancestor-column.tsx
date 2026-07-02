import { type KeyboardEvent as ReactKeyboardEvent } from 'react'
import styled from 'styled-components'

import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { NODE_W } from './constants'
import {
  CardHoverInfo,
  CountryFlag,
  GeoNode,
  NodeBadge,
  NodeNameBlock,
  familyTreePersonFlag,
} from './card'
import { ftPersonToNodePerson, ftResolveParentIds, getAncestorBadgeLabel } from './family-tree-derive'
import { ForkFromOneParent, ForkFromTwoParents } from './forks'
import type { AvatarRole } from './types'
import { buildPersonTooltip } from './utils'

// 군주 즉위국 깃발 우선순위 보존을 위해 useNodePersonFlag 대신 familyTreePersonFlag를 직접 호출하므로
// 카드 본문도 GeoThumbnail 대신 NodeAvatar+CountryFlag를 인라인으로 그린다.
import { AvatarFrame, AvatarImage, NodeAvatar } from './card'

interface AncestorColumnProps {
  personId: string
  path: string
  nodeMap: Map<string, FamilyTreePerson>
  parentsOf: Map<string, string[]>
  maxDepth: number
  visited: Set<string>
  /** 조상별 형제 노드 — 카드 옆 "형제 N" 칩 표시용 */
  siblingsByPersonId?: Map<string, FamilyTreePerson[]>
  onPersonClick?: (id: string) => void
  onOpenSiblings?: (person: FamilyTreePerson, siblings: FamilyTreePerson[]) => void
}

/**
 * 한 조상과 그 위 세대를 재귀적으로 렌더링한다.
 * - path: ego 기준 경로 ('F'=아버지, 'FM'=친조모, 'FFF'=증조부 등)
 * - maxDepth: 총 표시 깊이 (FT_MAX_DEPTH = 4)
 * - 레이아웃: AncColumnDiv(flex-col, align-center)
 *     └ AncParentsGrid(flex-row) ← 부/모 각각 AncestorColumn
 *     └ AncForkTrack ← ForkFromTwoParents | ForkFromOneParent
 *     └ GeoNode ← 현재 인물 카드
 *
 * 부/모가 AncParentsGrid 안에서 1fr 씩 차지하므로
 * ForkFromTwoParents(viewBox 400×52, 선 x=100/300=25%/75%)가 항상 정확히 맞음.
 */
export function AncestorColumn({
  personId,
  path,
  nodeMap,
  parentsOf,
  maxDepth,
  visited,
  siblingsByPersonId,
  onPersonClick,
  onOpenSiblings,
}: AncestorColumnProps) {
  if (visited.has(personId)) return null
  const person = nodeMap.get(personId)
  if (!person) return null

  // 방문 처리 (사이클 방지)
  const nextVisited = new Set(visited)
  nextVisited.add(personId)

  const depth = path.length
  const { fatherId, motherId } = ftResolveParentIds(personId, parentsOf, nodeMap)
  const canGoDeeper = depth < maxDepth
  const showFather = canGoDeeper && Boolean(fatherId) && fatherId && !visited.has(fatherId)
  const showMother = canGoDeeper && Boolean(motherId) && motherId && !visited.has(motherId)
  const showParents = showFather || showMother
  const hasBothParents = Boolean(showFather && showMother)

  const role: AvatarRole =
    depth === 1
      ? path === 'F'
        ? 'parent'
        : 'parentAlt'
      : depth === 2
        ? path.endsWith('F')
          ? 'grandparent'
          : 'grandparentAlt'
        : 'ancestor'
  const badgeRole = depth <= 2 ? role : 'ancestor'
  const label = getAncestorBadgeLabel(path, person.gender)

  // 비소유 노드(다른 계정 등록)는 상세를 열 수 없음 → 클릭 비활성 + dim
  const openable = person.isOwned !== false
  const clickable = Boolean(onPersonClick && person.id) && openable
  const handleClick = () => person.id && onPersonClick?.(person.id)
  const personAsNode = ftPersonToNodePerson(person)
  const tooltip = buildPersonTooltip(person)
  const siblings = siblingsByPersonId?.get(person.id) ?? []
  const displayName = getPersonDisplayName(person, true)
  const initial = [...displayName.trim()][0] ?? '?'
  const src = person.profileImageUrl
    ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
    : null
  const { flag: ancFlag, countryName: ancCountryName } = familyTreePersonFlag(person)

  return (
    <AncColumnDiv>
      {showParents && (
        <>
          <AncParentsGrid>
            {showFather && fatherId && (
              <AncestorColumn
                personId={fatherId}
                path={path + 'F'}
                nodeMap={nodeMap}
                parentsOf={parentsOf}
                maxDepth={maxDepth}
                visited={nextVisited}
                siblingsByPersonId={siblingsByPersonId}
                onPersonClick={onPersonClick}
                onOpenSiblings={onOpenSiblings}
              />
            )}
            {showMother && motherId && (
              <AncestorColumn
                personId={motherId}
                path={path + 'M'}
                nodeMap={nodeMap}
                parentsOf={parentsOf}
                maxDepth={maxDepth}
                visited={nextVisited}
                siblingsByPersonId={siblingsByPersonId}
                onPersonClick={onPersonClick}
                onOpenSiblings={onOpenSiblings}
              />
            )}
          </AncParentsGrid>
          <AncForkTrack>
            {hasBothParents ? <ForkFromTwoParents /> : <ForkFromOneParent />}
          </AncForkTrack>
        </>
      )}
      <GeoNode
        $role={role}
        $clickable={clickable}
        $dimmed={!openable}
        title={openable ? tooltip : '다른 계정이 등록한 인물이라 상세를 열 수 없습니다'}
        {...(clickable
          ? {
              role: 'button' as const,
              tabIndex: 0,
              onClick: handleClick,
              onKeyDown: (e: ReactKeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClick()
                }
              },
            }
          : {})}
      >
        {/* 인라인 아바타+국기 — 군주 카드일 때 sovereignCountry 우선 표시
            (GeoThumbnail의 useNodePersonFlag는 country를 우선해 regnal flag를 놓침) */}
        <AvatarFrame>
          <NodeAvatar $role={role} $hasImage={Boolean(src)}>
            {src ? (
              <AvatarImage
                src={src}
                alt={`${displayName} 프로필 사진`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              initial
            )}
          </NodeAvatar>
          <CountryFlag flag={ancFlag} countryName={ancCountryName} size={24} />
        </AvatarFrame>
        <NodeNameBlock person={personAsNode} />
        <NodeBadge $role={badgeRole}>{label}</NodeBadge>
        <CardHoverInfo person={person} />
        {/* 형제 N 칩 — GeoNode 내부에 두어 stacking context를 카드와 공유.
            클릭은 stopPropagation으로 카드 onClick 차단. */}
        {siblings.length > 0 && onOpenSiblings && (
          <AncestorSiblingChip
            type="button"
            onClick={(ev) => {
              ev.stopPropagation()
              onOpenSiblings(person, siblings)
            }}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') ev.stopPropagation()
            }}
            aria-label={`${displayName}의 형제 ${siblings.length}명 보기`}
            title={`${displayName}의 형제 ${siblings.length}명`}
          >
            형제 {siblings.length}
          </AncestorSiblingChip>
        )}
      </GeoNode>
    </AncColumnDiv>
  )
}

/**
 * AncColumnDiv: 한 조상과 그 위 세대 묶음 컨테이너
 * - flex: 1 1 0 → AncParentsGrid 안에서 균등 분할 (항상 50:50)
 * - min-width: NODE_W → 카드 폭 보장
 */
const AncColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
  min-width: ${NODE_W}px;
`

/**
 * AncParentsGrid: 부/모 AncestorColumn을 1:1로 나란히
 * align-items: flex-end — 한쪽 가지에 윗 세대 데이터가 없으면(컬럼이 짧으면)
 * 짧은 쪽 카드가 위로 떠서 형제 가지의 윗 세대와 같은 행에 그려지는 문제를 방지.
 */
const AncParentsGrid = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  width: 100%;
`

/** AncForkTrack: AncestorColumn 안에서 부모→자식 연결선 영역 */
const AncForkTrack = styled.div`
  width: 100%;
  height: 52px;
  margin: 4px 0 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const AncestorSiblingChip = styled.button`
  /* 칩은 GeoNode 자식이라 위치 기준이 GeoNode. position:absolute로 카드 우측 상단에 부착.
     z-index는 GeoNode 내부 스택에서 NodeBadge·NodeName 등 카드 콘텐츠 위에 오면 충분.
     HoverInfoBubble(z:50)은 시각적으로 카드 하단 외부에 떨어져 칩(상단)과 겹치지 않음. */
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 5;
  padding: 2px 6px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.10)'};
  color: #6366f1;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.42)' : 'rgba(99, 102, 241, 0.26)'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background 0.15s ease;
  white-space: nowrap;
  &:hover,
  &:focus-within,
  &:active {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.30)' : 'rgba(99, 102, 241, 0.18)'};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`
