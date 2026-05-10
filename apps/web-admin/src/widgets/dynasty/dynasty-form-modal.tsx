/**
 * 가문 등록·수정 모달 — register-modal-shell 셸 + DynastyForm 본문.
 * 외부 sticky footer 의 저장 버튼은 `form` 속성으로 폼 submit 트리거.
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { Dynasty } from '@/shared/api/dynasty'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalTitle,
} from '@/shared/ui/register-modal-shell/register-modal-shell'

import { DynastyForm, type DynastyFormPayload } from './ui/dynasty-form'

const FORM_ID = 'dynasty-form-modal'

interface Props {
  isOpen: boolean
  editing: Dynasty | null
  isSaving: boolean
  onClose: () => void
  onSubmit: (data: DynastyFormPayload) => void | Promise<void>
}

export function DynastyFormModal({
  isOpen,
  editing,
  isSaving,
  onClose,
  onSubmit,
}: Props) {
  // ESC 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, onClose])

  const content = (
    <AnimatePresence>
      {isOpen && (
        <PersonRegisterModalOverlay
          key="dynasty-form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dynasty-form-modal-title"
        >
          <PersonRegisterModalBox
            $maxWidth="min(720px, 96vw)"
            $minHeight="520px"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PersonRegisterModalHeader>
              <PersonRegisterModalTitle id="dynasty-form-modal-title">
                {editing ? '가문 수정' : '가문 등록'}
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
              <DynastyForm
                key={editing?.id ?? '__new__'}
                formId={FORM_ID}
                editing={editing}
                onSubmit={onSubmit}
              />
            </PersonRegisterModalFormScroll>

            <PersonRegisterModalStickyFooter>
              <FooterSpacer />
              <FooterActions>
                <CancelBtn type="button" onClick={onClose} disabled={isSaving}>
                  취소
                </CancelBtn>
                <SaveBtn
                  type="submit"
                  form={FORM_ID}
                  disabled={isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving ? '저장 중…' : editing ? '저장' : '등록'}
                </SaveBtn>
              </FooterActions>
            </PersonRegisterModalStickyFooter>
          </PersonRegisterModalBox>
        </PersonRegisterModalOverlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}

const FooterSpacer = styled.span``

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
`

const CancelBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`

const SaveBtn = styled.button`
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.button.text};
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`
