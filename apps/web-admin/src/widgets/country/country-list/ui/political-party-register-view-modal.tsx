/**
 * 정당 등록/수정 모달 — 인물 등록 모달(PersonRegisterViewModal)과 동일한 셸·애니메이션.
 * 동작(Esc·스크롤락·포커스·aria)은 공용 `<RegisterModal>`이 담당.
 */
import React from 'react'

import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalFormDesc,
  PersonRegisterModalFormScroll,
} from '@/shared/ui/register-modal-shell/register-modal-shell'

export interface PoliticalPartyRegisterViewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** 스크롤 영역 상단 안내 (인물 등록 모달 FormDesc와 동일 역할) */
  description?: string
  /** 모달 박스 min-height (`PersonRegisterModalBox` 기본 560px보다 크게 쓸 때) */
  modalMinHeight?: string
  modalMaxWidth?: string
  children: React.ReactNode
}

export function PoliticalPartyRegisterViewModal({
  isOpen,
  onClose,
  title,
  description,
  modalMinHeight,
  modalMaxWidth,
  children,
}: PoliticalPartyRegisterViewModalProps) {
  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={modalMaxWidth}
      minHeight={modalMinHeight}
    >
      <PersonRegisterModalFormScroll>
        {description ? (
          <PersonRegisterModalFormDesc>
            {description}
          </PersonRegisterModalFormDesc>
        ) : null}
        {children}
      </PersonRegisterModalFormScroll>
    </RegisterModal>
  )
}
