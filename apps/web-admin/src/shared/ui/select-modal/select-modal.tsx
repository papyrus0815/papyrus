import React, { useEffect, useMemo, useState } from 'react'
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
  /** 검색 입력 표시 (옵션 6개 이상이면 자동 노출 권장) */
  searchable?: boolean
  /** 검색 placeholder */
  searchPlaceholder?: string
  /** 로딩 상태 — 옵션 fetching 중 */
  isLoading?: boolean
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
  searchable,
  searchPlaceholder = '검색...',
  isLoading = false,
}: SelectModalProps<T>) {
  const [query, setQuery] = useState('')

  // 모달이 닫히면 검색어 초기화
  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  const showSearch = searchable ?? options.length >= 6

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description?.toLowerCase().includes(q) ?? false),
    )
  }, [options, query])

  if (!isOpen) return null

  const isSelected = (value: T) => {
    if (multiple) {
      return selectedValues.includes(value)
    }
    return selectedValue === value
  }

  return createPortal(
    <S.SelectModalOverlay
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <S.SelectModal
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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

        {headerExtra && <S.HeaderExtraWrapper>{headerExtra}</S.HeaderExtraWrapper>}

        {showSearch && (
          <S.SearchWrapper>
            <S.SearchInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
          </S.SearchWrapper>
        )}

        <S.SelectModalContent>
          {isLoading ? (
            <S.EmptyState>
              <S.EmptyIcon>⏳</S.EmptyIcon>
              <S.EmptyTitle>불러오는 중...</S.EmptyTitle>
              <S.EmptyDesc>잠시만 기다려 주세요</S.EmptyDesc>
            </S.EmptyState>
          ) : filteredOptions.length === 0 ? (
            <S.EmptyState>
              <S.EmptyIcon>{query ? '🔍' : '📭'}</S.EmptyIcon>
              <S.EmptyTitle>
                {query ? '검색 결과 없음' : '데이터가 없습니다'}
              </S.EmptyTitle>
              <S.EmptyDesc>
                {query
                  ? `"${query}"에 해당하는 항목을 찾지 못했습니다`
                  : '선택 가능한 항목이 없습니다'}
              </S.EmptyDesc>
            </S.EmptyState>
          ) : (
            filteredOptions.map((option) => (
              <S.SelectOption
                key={String(option.value)}
                $active={isSelected(option.value)}
                onClick={() => onSelect(option.value)}
              >
                {option.icon && (
                  <S.SelectOptionIcon>{option.icon}</S.SelectOptionIcon>
                )}
                <S.SelectOptionBody>
                  <S.SelectOptionText>{option.label}</S.SelectOptionText>
                  {option.description && (
                    <S.SelectOptionDescription>
                      {option.description}
                    </S.SelectOptionDescription>
                  )}
                </S.SelectOptionBody>
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
    </S.SelectModalOverlay>,
    document.body,
  )
}
