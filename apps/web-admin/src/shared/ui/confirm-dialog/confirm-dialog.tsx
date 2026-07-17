import React, { useRef } from 'react'

import { createPortal } from 'react-dom'

import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'
import {
  ModalBoxNarrow,
  ModalFooter,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { useModalBehavior } from '@/shared/ui/modal'

const Message = styled.p`
  margin: 0;
  padding: 0 0 4px;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FooterBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease, opacity 0.15s ease;

  ${({ $primary, $danger, theme }) =>
    $primary
      ? `
    background: ${$danger ? theme.colors.error : theme.colors.button.primary};
    color: ${theme.colors.button.text};
    &:hover { opacity: 0.92; }
  `
      : `
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
    &:hover { background: ${theme.colors.border.light}; }
  `}
`

export type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 확인 버튼을 경고(삭제 등) 스타일로 */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * window.confirm 대체 — 테마와 맞는 확인 다이얼로그.
 *
 * 접근성은 useModalBehavior가 일괄 담당(모달 규약과 동일):
 * Esc=취소·포커스 트랩·초기 포커스(취소 버튼)·닫힐 때 트리거로 포커스 복원·
 * body 스크롤 락. 트리거에 포커스가 남아 Enter 재발화로 다이얼로그가
 * 중복 큐잉되던 문제를 초기 포커스 이동이 구조적으로 차단한다.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogBoxRef = useRef<HTMLDivElement | null>(null)
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null)
  // 초기 포커스는 취소 버튼 — 위험(삭제) 확인에서 Enter 오발화가 파괴적이지 않게.
  useModalBehavior({
    isOpen,
    onClose: onCancel,
    containerRef: dialogBoxRef,
    initialFocusRef: cancelBtnRef,
  })

  if (typeof document === 'undefined' || !isOpen) return null

  return createPortal(
    <ModalOverlay
      role="presentation"
      onClick={onCancel}
      style={{ zIndex: Z_INDEX.MODAL_OVERLAY + 2 }}
    >
      <ModalBoxNarrow
        ref={dialogBoxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '22px 22px 18px' }}
      >
        <ModalTitle id="confirm-dialog-title" style={{ fontSize: 17 }}>
          {title}
        </ModalTitle>
        <Message>{message}</Message>
        <ModalFooter style={{ padding: '16px 0 0', border: 'none', gap: 10 }}>
          <FooterBtn ref={cancelBtnRef} type="button" onClick={onCancel}>
            {cancelLabel}
          </FooterBtn>
          <FooterBtn
            type="button"
            $primary
            $danger={danger}
            onClick={onConfirm}
          >
            {confirmLabel}
          </FooterBtn>
        </ModalFooter>
      </ModalBoxNarrow>
    </ModalOverlay>,
    document.body,
  )
}
