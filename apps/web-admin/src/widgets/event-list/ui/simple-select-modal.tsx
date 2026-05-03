/**
 * 간단한 선택 모달 (국가, 직업 등)
 * FSD: widgets/event-list/ui
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import type { IconType } from 'react-icons'
import { FiX } from 'react-icons/fi'

import { FILTER_ALL } from '@/features/event-list/lib'
import * as Modal from '@/pages/events/styles/modal.styles'

interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SimpleSelectModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  selectedValue: typeof FILTER_ALL | string
  options: SelectOption[]
  onSelect: (value: typeof FILTER_ALL | string) => void
  allLabel?: string
  allDescription?: string
  Icon?: IconType
}

export const SimpleSelectModal: React.FC<SimpleSelectModalProps> = ({
  isOpen,
  onClose,
  title,
  selectedValue,
  options,
  onSelect,
  allLabel = '전체',
  allDescription,
  Icon,
}) => {
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
            <Modal.ModalTitle>{title}</Modal.ModalTitle>
            <Modal.ModalClose onClick={onClose}>
              <FiX size={20} />
            </Modal.ModalClose>
          </Modal.ModalHeader>
          <Modal.ModalContent>
            {/* 전체 옵션 */}
            <Modal.ModalOption
              $active={selectedValue === FILTER_ALL}
              onClick={() => {
                onSelect(FILTER_ALL)
                onClose()
              }}
            >
              <Modal.ModalOptionIcon>
                {Icon ? <Icon /> : <FiX />}
              </Modal.ModalOptionIcon>
              <div>
                <strong>{allLabel}</strong>
                {allDescription && <span>{allDescription}</span>}
              </div>
            </Modal.ModalOption>

            {/* 개별 옵션들 */}
            {options.map((option) => (
              <Modal.ModalOption
                key={option.value}
                $active={selectedValue === option.value}
                onClick={() => {
                  onSelect(option.value)
                  onClose()
                }}
              >
                <Modal.ModalOptionIcon>
                  {Icon ? <Icon /> : <FiX />}
                </Modal.ModalOptionIcon>
                <div>
                  <strong>{option.label}</strong>
                  {option.description && <span>{option.description}</span>}
                </div>
              </Modal.ModalOption>
            ))}
          </Modal.ModalContent>
        </motion.div>
      </Modal.Modal>
    </>,
    document.body,
  )
}
