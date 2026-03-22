/**
 * 정당 등록/수정 모달 — 인물 등록 모달(PersonRegisterViewModal)과 동일한 셸·애니메이션
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormDesc,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalTitle,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'

export interface PoliticalPartyRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** 스크롤 영역 상단 안내 (인물 등록 모달 FormDesc와 동일 역할) */
  description?: string
  children: React.ReactNode
}

export function PoliticalPartyRegisterViewModal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: PoliticalPartyRegisterViewModalProps) {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <PersonRegisterModalOverlay
          key="political-party-register-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="political-party-register-modal-title"
        >
          <PersonRegisterModalBox
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <PersonRegisterModalHeader>
              <PersonRegisterModalTitle id="political-party-register-modal-title">
                {title}
              </PersonRegisterModalTitle>
              <PersonRegisterModalCloseBtn
                type="button"
                onClick={onClose}
                aria-label="닫기"
              >
                <FiX size={20} />
              </PersonRegisterModalCloseBtn>
            </PersonRegisterModalHeader>
            <PersonRegisterModalFormScroll>
              {description ? (
                <PersonRegisterModalFormDesc>{description}</PersonRegisterModalFormDesc>
              ) : null}
              {children}
            </PersonRegisterModalFormScroll>
          </PersonRegisterModalBox>
        </PersonRegisterModalOverlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
