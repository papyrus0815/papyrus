/**
 * 가문 등록·수정 모달 — register-modal-shell 셸 + DynastyForm 본문.
 * 외부 sticky footer 의 저장 버튼은 `form` 속성으로 폼 submit 트리거.
 */
import styled from 'styled-components'

import type { Dynasty } from '@/shared/api/dynasty'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalFormScroll,
  PersonRegisterModalStickyFooter,
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
  return (
    <RegisterModal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? '가문 수정' : '가문 등록'}
      maxWidth="min(720px, 96vw)"
      minHeight="520px"
    >
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
    </RegisterModal>
  )
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
  transition:
    border-color 0.12s,
    color 0.12s;
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
  transition:
    background 0.12s,
    opacity 0.12s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`
