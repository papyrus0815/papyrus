/**
 * 인물 등록 뷰 모달 — 등록 버튼 눌렀을 때와 동일한 폼 디자인
 * 대시보드/국가목록 헤더 + 버튼 모달에서 "인물 등록" 선택 시 표시
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

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
  PersonRegisterModalStickyFooter,
  PersonRegisterModalPrimaryBtn,
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

/** 저장되지 않은 변경을 버릴 때 사용자에게 확인 */
const DIRTY_CONFIRM_MSG = '저장되지 않은 변경 사항이 있습니다. 닫으시겠습니까?'

export function PersonRegisterViewModal({
  isOpen,
  onClose,
  initialCountryId,
  onSuccess,
  editPersonId,
  title,
}: PersonRegisterViewModalProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  /** 모달 열기 직전 포커스를 가졌던 요소 — 닫을 때 복귀 */
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // 모달 열릴 때마다 스크롤 초기화
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [isOpen, editPersonId])

  // 포커스 저장/복귀 + 오픈 시 첫 요소에 포커스
  useEffect(() => {
    if (!isOpen) return
    prevFocusRef.current = document.activeElement as HTMLElement | null
    // 렌더 후 포커스 이동 — 모달 박스 내 첫 포커스 가능 요소
    const raf = requestAnimationFrame(() => {
      const box = boxRef.current
      if (!box) return
      const focusable = box.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    })
    return () => {
      cancelAnimationFrame(raf)
      prevFocusRef.current?.focus?.()
    }
  }, [isOpen])

  const handleCloseAttempt = useCallback(() => {
    if (isSubmitting) return
    if (isDirty && !window.confirm(DIRTY_CONFIRM_MSG)) return
    onClose()
  }, [isDirty, isSubmitting, onClose])

  // ESC 닫기 + Tab 포커스 트랩
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleCloseAttempt()
        return
      }
      if (e.key === 'Tab' && boxRef.current) {
        const focusables = Array.from(
          boxRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null) // 보이는 것만
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleCloseAttempt])

  const handleSuccess = (personId?: string) => {
    queryClient.invalidateQueries({ queryKey: personKeys.all })
    if (personId) {
      queryClient.invalidateQueries({
        queryKey: personKeys.detailFull(personId),
      })
      queryClient.invalidateQueries({ queryKey: personKeys.detail(personId) })
    }
    setIsDirty(false)
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
          onClick={handleCloseAttempt}
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-register-modal-title"
        >
          <PersonRegisterModalBox
            ref={boxRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            $height="960px"
          >
            <PersonRegisterModalHeader>
              <PersonRegisterModalTitle id="person-register-modal-title">
                {title ?? (editPersonId ? '인물 수정' : '인물 등록')}
              </PersonRegisterModalTitle>
              <PersonRegisterModalCloseBtn
                type="button"
                onClick={handleCloseAttempt}
                aria-label="닫기"
              >
                <FiX size={20} />
              </PersonRegisterModalCloseBtn>
            </PersonRegisterModalHeader>
            <PersonRegisterModalFormScroll ref={scrollRef}>
              <PersonRegisterView
                initialCountryId={initialCountryId}
                editPersonId={editPersonId ?? undefined}
                onCancel={onClose}
                onSuccess={handleSuccess}
                embedInCard={false}
                onSubmittingChange={setIsSubmitting}
                onDirtyChange={setIsDirty}
              />
            </PersonRegisterModalFormScroll>
            <PersonRegisterModalStickyFooter>
              <PersonRegisterModalPrimaryBtn
                type="submit"
                form="person-register-form"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? editPersonId
                    ? '저장 중…'
                    : '등록 중…'
                  : editPersonId
                    ? '저장'
                    : '등록'}
              </PersonRegisterModalPrimaryBtn>
            </PersonRegisterModalStickyFooter>
          </PersonRegisterModalBox>
        </PersonRegisterModalOverlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
