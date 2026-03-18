import React from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import * as S from './select-modal.styles'

export interface SelectOption<T = string> {
  value: T
  label: string
  icon?: string
  description?: string
}

interface SelectModalProps<T = string> {
  /** 모달 표시 여부 */
  isOpen: boolean
  /** 모달 닫기 핸들러 */
  onClose: () => void
  /** 모달 제목 */
  title: string
  /** 선택 옵션 목록 */
  options: SelectOption<T>[]
  /** 현재 선택된 값 */
  selectedValue?: T
  /** 선택 핸들러 */
  onSelect: (value: T) => void
  /** 다중 선택 모드 */
  multiple?: boolean
  /** 선택된 값 목록 (다중 선택 모드) */
  selectedValues?: T[]
  /** 추가 헤더 컨텐츠 (예: 전체 해제 버튼) */
  headerExtra?: React.ReactNode
}

/**
 * 공통 선택 모달 컴포넌트
 *
 * @example
 * // 단일 선택
 * <SelectModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="국가 형태 선택"
 *   options={stateTypeOptions}
 *   selectedValue={selectedStateType}
 *   onSelect={handleSelect}
 * />
 *
 * @example
 * // 다중 선택
 * <SelectModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="국가 선택"
 *   options={countryOptions}
 *   multiple
 *   selectedValues={selectedCountries}
 *   onSelect={handleToggle}
 * />
 */
export function SelectModal<T = string>({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  multiple = false,
  selectedValues = [],
  headerExtra,
}: SelectModalProps<T>) {
  if (!isOpen) return null

  const isSelected = (value: T) => {
    if (multiple) {
      return selectedValues.includes(value)
    }
    return selectedValue === value
  }

  return createPortal(
    <>
      <S.SelectModalOverlay
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <S.SelectModal
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <S.SelectModalHeader>
          <S.SelectModalTitle>{title}</S.SelectModalTitle>
          <S.SelectModalClose onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                fill="currentColor"
              />
            </svg>
          </S.SelectModalClose>
        </S.SelectModalHeader>

        {headerExtra && <div style={{ padding: '0 24px' }}>{headerExtra}</div>}

        <S.SelectModalContent>
          {options.length === 0 ? (
            <S.EmptyState>
              <S.EmptyIcon>📭</S.EmptyIcon>
              <S.EmptyTitle>데이터가 없습니다</S.EmptyTitle>
              <S.EmptyDesc>선택 가능한 항목이 없습니다</S.EmptyDesc>
            </S.EmptyState>
          ) : (
            options.map((option) => (
              <S.SelectOption
                key={String(option.value)}
                $active={isSelected(option.value)}
                onClick={() => onSelect(option.value)}
              >
                {option.icon && (
                  <S.SelectOptionIcon>{option.icon}</S.SelectOptionIcon>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    flex: 1,
                  }}
                >
                  <S.SelectOptionText>{option.label}</S.SelectOptionText>
                  {option.description && (
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected(option.value) && (
                  <S.SelectOptionCheck>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                        fill="currentColor"
                      />
                    </svg>
                  </S.SelectOptionCheck>
                )}
              </S.SelectOption>
            ))
          )}
        </S.SelectModalContent>
      </S.SelectModal>
    </>,
    document.body,
  )
}
