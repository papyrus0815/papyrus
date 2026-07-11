import { useContext, useId, type ReactNode } from 'react'
import styled from 'styled-components'

import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { Modal, ModalBody } from '@/shared/ui/modal'

import { NODE_W } from './constants'
import { DescendantNode, SiblingCompactNode } from './card'
import { FamilyTreeLookupContext } from './context'
import {
  classifySiblingKinship,
  partitionSiblingsByKinship,
  siblingKinshipAriaLabel,
  siblingKinshipBadgeLabel,
  withSiblingKinshipMeta,
  type SiblingKinshipResult,
  type SiblingParentFks,
} from './family-tree-derive'
import type { NodePerson } from './types'

/**
 * 형제 모달 공통 본체 — 공용 <Modal> 토대(Esc·스크롤락·포커스 트랩·aria는
 * useModalBehavior 담당, 직접 구현 금지 mandate) + 판별 레인 파티션.
 *
 * 레인은 구분이 실제로 존재할 때(2개 이상)만 헤더를 그린다 — 전원 친형제/전원
 * 미상이면 기존 flat 그리드 그대로(헤더 노이즈 방지). anchorParents가 없으면
 * 판별 없이 flat(무수식 '형제')으로 렌더한다.
 */
function SiblingsLaneModal<T extends SiblingParentFks & { id?: string }>({
  title,
  anchorParents,
  siblings,
  truncated,
  onClose,
  renderCard,
}: {
  title: ReactNode
  anchorParents?: SiblingParentFks | null
  siblings: T[]
  /** BFS take 절단 존재 — 레인 카운트가 표시분 기준임을 헤더에 한정 고지 */
  truncated?: boolean
  onClose: () => void
  renderCard: (sibling: T, kinship: SiblingKinshipResult | null) => ReactNode
}) {
  const nodeMap = useContext(FamilyTreeLookupContext)
  const resolvedNodeMap = nodeMap.size > 0 ? nodeMap : null
  const laneIdBase = useId()
  const lanes = anchorParents
    ? partitionSiblingsByKinship(anchorParents, siblings, resolvedNodeMap)
    : null
  const showLanes = lanes != null && lanes.length > 1
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      subtitle={truncated ? '인원이 많아 일부만 표시 — 구분·인원수는 표시된 형제 기준' : undefined}
      size="wide"
      maxHeight="80vh"
    >
      <SiblingsModalScroll>
        {showLanes ? (
          lanes.map((lane) => (
            // aria-labelledby로 레인 제목 요소를 참조 — aria-label 병기 시 SR 이중 낭독 방지
            <LaneSection key={lane.key} role="group" aria-labelledby={`${laneIdBase}-${lane.key}`}>
              <LaneHeader>
                <LaneTitle id={`${laneIdBase}-${lane.key}`} $kind={lane.kind}>
                  {lane.title}
                </LaneTitle>
                <LaneCount>{lane.siblings.length}명</LaneCount>
              </LaneHeader>
              <SiblingsModalGrid>
                {lane.siblings.map((sib, idx) => (
                  <CardSlot key={sib.id ?? `${lane.key}-${idx}`}>
                    {renderCard(sib, anchorParents ? classifySiblingKinship(anchorParents, sib) : null)}
                  </CardSlot>
                ))}
              </SiblingsModalGrid>
            </LaneSection>
          ))
        ) : (
          <SiblingsModalGrid>
            {siblings.map((sib, idx) => (
              <CardSlot key={sib.id ?? `sib-${idx}`}>
                {renderCard(sib, anchorParents ? classifySiblingKinship(anchorParents, sib) : null)}
              </CardSlot>
            ))}
          </SiblingsModalGrid>
        )}
      </SiblingsModalScroll>
    </Modal>
  )
}

/**
 * "외 N명 더 보기" 칩 클릭 시 전체 형제를 출생연도순으로 표시 (ego 형제).
 * anchorParents: 판별 기준(ego)의 부모 FK — 없으면 판별 없이 무수식 '형제'.
 */
export function SiblingsListModal({
  siblings,
  anchorParents,
  truncated,
  onClose,
  onPersonClick,
}: {
  siblings: NodePerson[]
  anchorParents?: SiblingParentFks | null
  truncated?: boolean
  onClose: () => void
  onPersonClick?: (id: string) => void
}) {
  const nodeMap = useContext(FamilyTreeLookupContext)
  const resolvedNodeMap = nodeMap.size > 0 ? nodeMap : null
  return (
    <SiblingsLaneModal
      title={<>형제자매 — {siblings.length}명</>}
      anchorParents={anchorParents}
      siblings={siblings}
      truncated={truncated}
      onClose={onClose}
      renderCard={(sib, kinship) => (
        <SiblingCompactNode
          person={kinship ? withSiblingKinshipMeta(sib, kinship, resolvedNodeMap) : sib}
          badge={kinship ? siblingKinshipBadgeLabel(kinship) : undefined}
          badgeAriaLabel={kinship ? siblingKinshipAriaLabel(kinship) : undefined}
          onPersonClick={(id) => {
            onClose()
            onPersonClick?.(id)
          }}
        />
      )}
    />
  )
}

/**
 * 조상 카드 옆 "형제 N" 칩 클릭 시 — 그 인물의 형제 전원.
 * 판별 기준(anchor)은 모달의 주인공 조상 본인 — per-anchor 구조 그대로.
 */
export function AncestorSiblingsModal({
  person,
  siblings,
  truncated,
  onClose,
  onPersonClick,
}: {
  person: FamilyTreePerson
  siblings: FamilyTreePerson[]
  truncated?: boolean
  onClose: () => void
  onPersonClick?: (id: string) => void
}) {
  const nodeMap = useContext(FamilyTreeLookupContext)
  const resolvedNodeMap = nodeMap.size > 0 ? nodeMap : null
  const subjectName = getPersonDisplayName(person, true)
  return (
    <SiblingsLaneModal
      title={<>{subjectName}의 형제자매 — {siblings.length}명</>}
      anchorParents={person}
      siblings={siblings}
      truncated={truncated}
      onClose={onClose}
      renderCard={(sib, kinship) => (
        <DescendantNode
          person={kinship ? withSiblingKinshipMeta(sib, kinship, resolvedNodeMap) : sib}
          badge={kinship ? siblingKinshipBadgeLabel(kinship) : '형제'}
          badgeAriaLabel={kinship ? siblingKinshipAriaLabel(kinship) : undefined}
          onPersonClick={(id) => {
            onClose()
            onPersonClick?.(id)
          }}
        />
      )}
    />
  )
}

/** 공용 ModalBody(flex:1·min-height:0·overflow·scrollbarMixin) 재사용 — 간격만 오버라이드 */
const SiblingsModalScroll = styled(ModalBody)`
  gap: 20px;
  padding: 18px;
`

const LaneSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LaneHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

/* h3 — 다이얼로그 제목(h2) 바로 아래 레벨(헤딩 건너뜀 방지). 크기는 스타일이 지정. */
const LaneTitle = styled.h3<{ $kind: string }>`
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme, $kind }) =>
    $kind === 'undetermined' ? theme.colors.text.secondary : theme.colors.text.primary};
`

const LaneCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SiblingsModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${NODE_W}px, 1fr));
  gap: 16px;
  justify-items: center;
`

/** 카드 하단 모서리 칩(InMarriageMark 등)이 그리드 행 경계에 잘리지 않게 여유 */
const CardSlot = styled.div`
  padding-bottom: 8px;
`
