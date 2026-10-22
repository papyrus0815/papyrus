/**
 * 분야 선택 모달
 * FSD: widgets/event-list/ui
 */
import React, { useRef } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import { EVENT_DOMAINS, type EventDomainOption } from '@/entities/event/model/event-domain'
import { FILTER_ALL } from '@/features/event-list/lib'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'

import * as Modal from '@/pages/events/styles/modal.styles'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  dbCategories: EventDomainOption[]
  selectedCategory: 'all' | string
  onSelect: (categoryId: 'all' | string) => void
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  dbCategories,
  selectedCategory,
  onSelect,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, isOpen)

  if (!isOpen) return null

  return createPortal(
    <>
      <Modal.ModalOverlay
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <Modal.Modal>
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Modal.ModalHeader>
            <Modal.ModalTitle id="category-modal-title">
              분야 선택
            </Modal.ModalTitle>
            <Modal.ModalClose onClick={onClose} aria-label="분야 선택 닫기">
              <FiX size={20} aria-hidden="true" />
            </Modal.ModalClose>
          </Modal.ModalHeader>
          <Modal.ModalContent>
            {/* 전체 분야 */}
            <Modal.ModalOption
              $active={selectedCategory === FILTER_ALL}
              aria-pressed={selectedCategory === FILTER_ALL}
              onClick={() => {
                onSelect(FILTER_ALL)
                onClose()
              }}
            >
              <Modal.ModalOptionIcon>
                <FiX />
              </Modal.ModalOptionIcon>
              <div>
                <strong>전체 분야</strong>
                <span>모든 사건</span>
              </div>
            </Modal.ModalOption>

            {/* 분야 9개 — 아이콘·설명은 분야 레지스트리 */}
            {dbCategories.map((dbCat) => {
              const Icon = EVENT_DOMAINS[dbCat.id].Icon

              return (
                <Modal.ModalOption
                  key={dbCat.id}
                  $active={selectedCategory === dbCat.id}
                  aria-pressed={selectedCategory === dbCat.id}
                  onClick={() => {
                    onSelect(dbCat.id)
                    onClose()
                  }}
                >
                  <Modal.ModalOptionIcon>
                    <Icon />
                  </Modal.ModalOptionIcon>
                  <div>
                    <strong>{dbCat.name}</strong>
                    <span>{EVENT_DOMAINS[dbCat.id].tagline}</span>
                  </div>
                </Modal.ModalOption>
              )
            })}
          </Modal.ModalContent>
        </motion.div>
      </Modal.Modal>
    </>,
    document.body,
  )
}
