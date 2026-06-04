/**
 * 인물 인라인 상세 모달 — 사건 상세·행정부 상세 등에서 썸네일/이름 클릭 시 띄우는 공용 모달.
 *
 * - 글래스 카드 박스 (max 900px / 88vh), 헤더에 인물 이름 + 닫기.
 * - PersonDetailPanel을 `embedInModal`로 감싸 모달 안에서 정보 보기.
 * - 모달 안에서 다른 인물 링크 클릭 시 stack push → 같은 오버레이 위에서 인물 전환.
 * - ESC: stack pop, 비어있으면 close. 오버레이 클릭으로도 close.
 *
 * 단일 책임: "인물 인라인 상세 보기 모달"
 *   - 편집 동작은 부모가 결정 (`onEdit` prop) — 페이지 이동(navigate)이거나 인라인 편집 모드 전환이거나.
 */
import { useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import { glassCardMixin } from '@/shared/styles/mixins'
import { Z_INDEX } from '@/shared/styles/z-index'
import {
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

export interface PersonInlineModalProps {
  /** 열려 있는 인물 id. null이면 모달 닫힘. */
  personId: string | null
  /** 모달 닫기 (오버레이/X/ESC) */
  onClose: () => void
  /** 패널 안에서 ✎ 편집 클릭 시. id는 stack 최상단(현재 보이는 인물). */
  onEdit?: (id: string) => void
}

export function PersonInlineModal({
  personId,
  onClose,
  onEdit,
}: PersonInlineModalProps) {
  /** 모달 안에서 다른 인물 링크 클릭 시 stack push — 같은 오버레이 위에서 인물 전환. */
  const [stack, setStack] = useState<string[]>([])

  // personId 변경 시 stack 초기화
  useEffect(() => {
    setStack([])
  }, [personId])

  const activeId = stack[stack.length - 1] ?? personId

  // ESC 닫기 (stack이 있으면 pop, 없으면 close)
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

  const { data: activePerson } = useQuery({
    queryKey: ['person-detail', activeId],
    queryFn: () => getPersonDetailById(activeId!),
    enabled: !!activeId,
  })
  const titleName = activePerson ? getPersonDisplayName(activePerson) : ''

  const handleHeaderClose = () => {
    if (stack.length > 0) setStack((s) => s.slice(0, -1))
    else onClose()
  }

  // 모달 열림 동안 body 스크롤 락 + 패널 내 포커스 트랩
  const open = !!personId && !!activeId
  const panelRef = useRef<HTMLDivElement>(null)
  useBodyScrollLock(open)
  useFocusTrap(panelRef, open)

  return (
    <AnimatePresence>
      {personId && activeId && (
        <Overlay
          key="person-inline-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          role="presentation"
        >
          <Box
            key="person-inline-modal-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-inline-modal-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle id="person-inline-modal-title" title={titleName}>
                {titleName || '인물'}
              </ModalTitle>
              <ModalCloseButton
                type="button"
                onClick={handleHeaderClose}
                aria-label={stack.length > 0 ? '뒤로' : '닫기'}
              >
                <FiX size={20} strokeWidth={2.5} />
              </ModalCloseButton>
            </ModalHeader>
            <Body>
              <PersonDetailPanel
                key={activeId}
                personId={activeId}
                onClose={onClose}
                onEdit={onEdit ?? (() => onClose())}
                hideHeaderActions
                embedInModal
                onLinkedPersonClick={(id) => setStack((s) => [...s, id])}
              />
            </Body>
          </Box>
        </Overlay>
      )}
    </AnimatePresence>
  )
}

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  overflow-y: auto;
`

const Box = styled(motion.div)`
  ${({ theme }) => glassCardMixin(theme)}
  max-width: 900px;
  width: 100%;
  max-height: 88vh;
  border-radius: 20px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Body = styled(ModalBody)`
  overflow-y: auto;
  flex: 1;
`
