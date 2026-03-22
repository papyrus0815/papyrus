/**
 * 인물 등록 뷰 모달 — 등록 버튼 눌렀을 때와 동일한 폼 디자인
 * 대시보드/국가목록 헤더 + 버튼 모달에서 "인물 등록" 선택 시 표시
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { useQueryClient } from '@tanstack/react-query'

import { AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import { personKeys } from '@/entities/person/api'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalTitle,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'
import { PersonRegisterView } from '@/shared/ui/person-register-modal/person-register-view'

export interface PersonRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  initialCountryId?: string | null
  onSuccess?: (personId: string) => void
  /** 수정할 인물 ID (없으면 신규 등록) */
  editPersonId?: string | null
  /** 모달 제목 (기본: 인물 등록) */
  title?: string
}

export function PersonRegisterViewModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
  editPersonId,
  title,
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
        <PersonRegisterModalOverlay
          key="person-register-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-register-modal-title"
        >
          <PersonRegisterModalBox
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PersonRegisterModalHeader>
              <PersonRegisterModalTitle id="person-register-modal-title">
                {title ?? (editPersonId ? '인물 수정' : '인물 등록')}
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
              <PersonRegisterView
                initialCountryId={initialCountryId}
                editPersonId={editPersonId ?? undefined}
                onCancel={onClose}
                onSuccess={handleSuccess}
                embedInCard={false}
              />
            </PersonRegisterModalFormScroll>
          </PersonRegisterModalBox>
        </PersonRegisterModalOverlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
