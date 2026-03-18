/**
 * 현대 국가 등록/수정 모달 — 역사적 국가·인물 등록 모달과 동일한 디자인
 * 국가 목록 페이지에서 "국가 등록" 선택 시 표시
 */
import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { Country } from '@/entities/country/api'
import type { ContinentOption } from '@/entities/country/api'
import { Z_INDEX } from '@/shared/styles/z-index'
import { CountryForm } from './country-form'

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
  width: min(1200px, 96vw);
  height: 90vh;
  max-height: 1200px;
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
  min-height: 0;
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

export interface CountryFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** 수정 시 해당 국가, 등록 시 빈 객체 {} 등 */
  editing: Country | Record<string, never> | null
  continents: ContinentOption[]
  onSave: (data: Omit<Country, 'id'> & { id?: string }) => Promise<void>
  onSuccess?: () => void
}

export function CountryFormModal({
  isOpen,
  onClose,
  editing,
  continents,
  onSave,
  onSuccess,
}: CountryFormModalProps) {
  const handleSave = async (
    data: Omit<Country, 'id'> & { id?: string },
  ) => {
    await onSave(data)
    onSuccess?.()
    onClose()
  }

  const effectiveEditing =
    editing && typeof editing === 'object' && 'id' in editing
      ? (editing as Country)
      : editing && Object.keys(editing).length === 0
        ? ({} as Country)
        : null

  const content = (
    <AnimatePresence>
      {isOpen && effectiveEditing !== null && (
        <Overlay
          key="country-form-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="country-form-modal-title"
        >
          <ModalBox
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle id="country-form-modal-title">
                {effectiveEditing?.id ? '국가 수정' : '국가 등록'}
              </ModalTitle>
              <CloseBtn type="button" onClick={onClose} aria-label="닫기">
                <FiX size={20} />
              </CloseBtn>
            </ModalHeader>
            <FormScroll>
              <CountryForm
                editing={effectiveEditing}
                embedIn="modal"
                continents={continents}
                onClose={onClose}
                onSave={handleSave}
              />
            </FormScroll>
          </ModalBox>
        </Overlay>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
