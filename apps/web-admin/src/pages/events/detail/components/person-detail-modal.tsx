import { useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { ModalOverlay } from '@/shared/ui/modal'
import { Z_INDEX } from '@/shared/styles/z-index'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

interface PersonDetailModalProps {
  /** 열려 있는 인물 id. null이면 모달 닫힘. */
  personId: string | null
  onClose: () => void
}

/**
 * 사건 상세 페이지에서 참여 인물 클릭 시 띄우는 인물 정보 모달.
 *
 * - PersonDetailPanel을 `embedInModal`로 감싸 모달 안에서 정보 보기 + 연관 인물 stack 전환.
 * - 편집 버튼(✎) 클릭 시: 모달을 닫고 `/persons/:id/edit`으로 이동.
 * - ESC / 오버레이 클릭으로 닫힘.
 */
export function PersonDetailModal({ personId, onClose }: PersonDetailModalProps) {
  const navigate = useNavigate()
  /** 모달 안에서 다른 인물 링크 클릭 시 stack push — 같은 오버레이 위에서 인물 전환. */
  const [stack, setStack] = useState<string[]>([])

  // personId 변경 시 stack 초기화
  useEffect(() => {
    setStack([])
  }, [personId])

  // ESC 닫기
  useEffect(() => {
    if (!personId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stack.length > 0) setStack((s) => s.slice(0, -1))
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [personId, stack.length, onClose])

  const activeId = stack[stack.length - 1] ?? personId

  return (
    <AnimatePresence>
      {personId && activeId && (
        <ModalOverlay
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
        >
          <ModalShell
            as={motion.div}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton
              type="button"
              onClick={() => {
                if (stack.length > 0) setStack((s) => s.slice(0, -1))
                else onClose()
              }}
              aria-label={stack.length > 0 ? '뒤로' : '닫기'}
            >
              <FiX />
            </CloseButton>
            <PanelHost>
              <PersonDetailPanel
                key={activeId}
                personId={activeId}
                onClose={onClose}
                onEdit={(id) => {
                  onClose()
                  navigate(pathKeys.persons.detail(id))
                }}
                hideHeaderActions
                embedInModal
                onLinkedPersonClick={(id) => setStack((s) => [...s, id])}
              />
            </PanelHost>
          </ModalShell>
        </ModalOverlay>
      )}
    </AnimatePresence>
  )
}

const ModalShell = styled.div`
  position: relative;
  width: min(960px, 96vw);
  max-height: 92vh;
  border-radius: 18px;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20, 20, 22, 0.96)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
`

const PanelHost = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  /* PersonDetailPanel 내부 sticky 헤더가 자체 패딩으로 자리잡고 있어 여기선 padding 0 */
`

const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.06)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`
