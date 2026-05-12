import { useEffect } from 'react'
import styled from 'styled-components'

import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { NODE_W } from './constants'
import { DescendantNode, SiblingCompactNode } from './card'
import type { NodePerson } from './types'

/**
 * "외 N명 더 보기" 칩 클릭 시 전체 형제를 출생연도순 컴팩트 카드 그리드로 표시.
 * 가계도 인포그래픽 위에 오버레이 — 클릭 외부·Esc로 닫음.
 */
export function SiblingsListModal({
  siblings,
  onClose,
  onPersonClick,
}: {
  siblings: NodePerson[]
  onClose: () => void
  onPersonClick?: (id: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <SiblingsModalOverlay onClick={onClose} role="dialog" aria-label="형제자매 전체 목록">
      <SiblingsModalPanel onClick={(e) => e.stopPropagation()}>
        <SiblingsModalHeader>
          <SiblingsModalTitle>형제자매 — {siblings.length}명</SiblingsModalTitle>
          <SiblingsModalClose type="button" onClick={onClose} aria-label="닫기">
            ×
          </SiblingsModalClose>
        </SiblingsModalHeader>
        <SiblingsModalGrid>
          {siblings.map((sib, idx) => (
            <SiblingCompactNode
              key={sib.id ?? `sib-modal-${idx}`}
              person={sib}
              onPersonClick={(id) => {
                onClose()
                onPersonClick?.(id)
              }}
            />
          ))}
        </SiblingsModalGrid>
      </SiblingsModalPanel>
    </SiblingsModalOverlay>
  )
}

/**
 * 조상 카드 옆 "형제 N" 칩 클릭 시 — 그 인물의 형제 전원을 컴팩트 카드 그리드로.
 * SiblingsListModal과 시각·동작 동일. 차이는 입력 타입(FamilyTreePerson)과
 * 헤더에 "누구의 형제"인지 명시.
 */
export function AncestorSiblingsModal({
  person,
  siblings,
  onClose,
  onPersonClick,
}: {
  person: FamilyTreePerson
  siblings: FamilyTreePerson[]
  onClose: () => void
  onPersonClick?: (id: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const subjectName = getPersonDisplayName(person, true)
  return (
    <SiblingsModalOverlay
      onClick={onClose}
      role="dialog"
      aria-label={`${subjectName}의 형제자매`}
    >
      <SiblingsModalPanel onClick={(e) => e.stopPropagation()}>
        <SiblingsModalHeader>
          <SiblingsModalTitle>
            {subjectName}의 형제자매 — {siblings.length}명
          </SiblingsModalTitle>
          <SiblingsModalClose type="button" onClick={onClose} aria-label="닫기">
            ×
          </SiblingsModalClose>
        </SiblingsModalHeader>
        <SiblingsModalGrid>
          {siblings.map((sib, idx) => (
            <DescendantNode
              key={sib.id ?? `anc-sib-${idx}`}
              person={sib}
              badge="형제"
              onPersonClick={(id) => {
                onClose()
                onPersonClick?.(id)
              }}
            />
          ))}
        </SiblingsModalGrid>
      </SiblingsModalPanel>
    </SiblingsModalOverlay>
  )
}

const SiblingsModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(2px);
`

const SiblingsModalPanel = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  max-height: 80vh;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
`

const SiblingsModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SiblingsModalTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SiblingsModalClose = styled.button`
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 0;
  background: transparent;
  font-size: 22px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SiblingsModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${NODE_W}px, 1fr));
  gap: 16px;
  padding: 18px;
  overflow-y: auto;
  justify-items: center;
`
