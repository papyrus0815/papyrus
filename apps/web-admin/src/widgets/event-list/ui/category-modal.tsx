/**
 * 분야 선택 모달
 * FSD: widgets/event-list/ui
 */
import React, { useMemo, useRef } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

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
  /** 현재 조건 기준 분야별 사건 건수 — 인라인 팝오버와 동일한 모수를 표시한다 */
  categoryCounts?: ReadonlyMap<string, number>
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  dbCategories,
  selectedCategory,
  onSelect,
  categoryCounts,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, isOpen)

  const totalCount = useMemo(() => {
    if (!categoryCounts) return undefined
    let sum = 0
    for (const count of categoryCounts.values()) sum += count
    return sum
  }, [categoryCounts])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <Modal.ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              exit={{ opacity: 0, scale: 0.95 }}
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
                  <OptionBody>
                    <strong>전체 분야</strong>
                    <span>모든 사건</span>
                  </OptionBody>
                  {typeof totalCount === 'number' && (
                    <OptionCount>{totalCount.toLocaleString()}건</OptionCount>
                  )}
                </Modal.ModalOption>

                {/* 분야 9개 — 아이콘·설명은 분야 레지스트리 */}
                {dbCategories.map((dbCat) => {
                  const Icon = EVENT_DOMAINS[dbCat.id].Icon
                  const count = categoryCounts
                    ? (categoryCounts.get(dbCat.id) ?? 0)
                    : undefined
                  const isActive = selectedCategory === dbCat.id

                  return (
                    <Modal.ModalOption
                      key={dbCat.id}
                      $active={isActive}
                      aria-pressed={isActive}
                      style={
                        !isActive && count === 0 ? { opacity: 0.55 } : undefined
                      }
                      onClick={() => {
                        onSelect(dbCat.id)
                        onClose()
                      }}
                    >
                      <Modal.ModalOptionIcon>
                        <Icon />
                      </Modal.ModalOptionIcon>
                      <OptionBody>
                        <strong>{dbCat.name}</strong>
                        <span>{EVENT_DOMAINS[dbCat.id].tagline}</span>
                      </OptionBody>
                      {typeof count === 'number' && (
                        <OptionCount>{count.toLocaleString()}건</OptionCount>
                      )}
                    </Modal.ModalOption>
                  )
                })}
              </Modal.ModalContent>
            </motion.div>
          </Modal.Modal>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

const OptionBody = styled.div`
  flex: 1;
  min-width: 0;
`

const OptionCount = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`
