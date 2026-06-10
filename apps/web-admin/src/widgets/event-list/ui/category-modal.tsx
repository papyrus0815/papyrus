/**
 * 카테고리 선택 모달
 * FSD: widgets/event-list/ui
 */
import React, { useRef } from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import { extractCategoryKey } from '@/features/event-create/lib'
import { FILTER_ALL } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'

import {
  CATEGORY_ICON_MAP,
  CATEGORY_LABEL,
} from '@/pages/events/create/events.constants'
import * as Modal from '@/pages/events/styles/modal.styles'
import { CATEGORY_COLORS } from '@/pages/events/styles/theme'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  dbCategories: EventCategoryDto[]
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
              카테고리 선택
            </Modal.ModalTitle>
            <Modal.ModalClose onClick={onClose} aria-label="카테고리 선택 닫기">
              <FiX size={20} aria-hidden="true" />
            </Modal.ModalClose>
          </Modal.ModalHeader>
          <Modal.ModalContent>
            {/* 전체 카테고리 */}
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
                <strong>전체 카테고리</strong>
                <span>모든 유형의 사건</span>
              </div>
            </Modal.ModalOption>

            {/* DB 카테고리들 */}
            {dbCategories.map((dbCat) => {
              const categoryKey = extractCategoryKey(dbCat.id)
              const Icon =
                CATEGORY_ICON_MAP[dbCat.name] ||
                CATEGORY_ICON_MAP[categoryKey] ||
                (() => <FiX />)

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
                    <span>
                      {CATEGORY_COLORS[categoryKey]?.tagline ||
                        dbCat.description ||
                        ''}
                    </span>
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
