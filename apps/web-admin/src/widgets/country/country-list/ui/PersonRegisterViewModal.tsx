/**
 * 인물 등록 뷰 모달 — 등록 버튼 눌렀을 때와 동일한 폼 디자인
 * 대시보드/국가목록 헤더 + 버튼 모달에서 "인물 등록" 선택 시 표시
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { personKeys } from '@/entities/person/api'
import { Z_INDEX } from '@/shared/styles/z-index'
import { PersonRegisterView } from '@/shared/ui/person-register-modal'

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.38);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(10px);
`

const ModalBox = styled(motion.div)`
  width: min(960px, 100%);
  height: min(95vh, 1060px);
  min-height: 1060px;
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.2);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
`

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`

const FormScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 3px;
  }
`

export interface PersonRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  initialCountryId?: string | null
  onSuccess?: (personId: string) => void
}

export function PersonRegisterViewModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
}: PersonRegisterViewModalProps) {
  const queryClient = useQueryClient()

  const handleSuccess = (personId?: string) => {
    queryClient.invalidateQueries({ queryKey: personKeys.all })
    onSuccess?.(personId ?? '')
    onClose()
  }

  const content = (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          key="person-register-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-register-modal-title"
        >
          <ModalBox
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle id="person-register-modal-title">
                인물 등록
              </ModalTitle>
              <CloseBtn type="button" onClick={onClose} aria-label="닫기">
                <FiX size={20} />
              </CloseBtn>
            </ModalHeader>
            <FormScroll>
              <PersonRegisterView
                initialCountryId={initialCountryId}
                onCancel={onClose}
                onSuccess={handleSuccess}
                embedInCard={false}
              />
            </FormScroll>
          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
