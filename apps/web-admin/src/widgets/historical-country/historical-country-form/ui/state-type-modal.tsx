/**
 * 국가 형태 선택 모달 — 카테고리 그룹 + 검색.
 * 검색 시에는 카테고리 그룹 무시하고 평면 표시.
 */
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FiSearch } from 'react-icons/fi'
import { useTheme } from 'styled-components'

import * as S from '@/widgets/country/country-form/ui/country-form.styles'

export interface StateTypeOption {
  value: string
  label: string
  desc: string
  category: 'monarchy' | 'republic' | 'regime' | 'tribal' | 'other'
}

export interface StateTypeCategory {
  key: StateTypeOption['category']
  label: string
}

interface StateTypeModalProps {
  open: boolean
  onClose: () => void
  options: StateTypeOption[]
  categories: StateTypeCategory[]
  selectedValue?: string
  onSelect: (value: string) => void
}

const CategoryHeader: React.FC<{ label: string; isDark: boolean }> = ({
  label,
  isDark,
}) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: isDark ? '#94a3b8' : '#6b7280',
      padding: '8px 16px 4px',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}
  >
    {label}
  </div>
)

const OptionItem: React.FC<{
  option: StateTypeOption
  active: boolean
  isDark: boolean
  onClick: () => void
}> = ({ option, active, isDark, onClick }) => (
  <S.SelectOption $active={active} onClick={onClick}>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flex: 1,
        minWidth: 0,
      }}
    >
      <S.SelectOptionText>{option.label}</S.SelectOptionText>
      <span
        style={{
          fontSize: 12,
          color: isDark ? '#94a3b8' : '#6b7280',
          lineHeight: 1.4,
        }}
      >
        {option.desc}
      </span>
    </div>
    {active && (
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
)

export function StateTypeModal({
  open,
  onClose,
  options,
  categories,
  selectedValue,
  onSelect,
}: StateTypeModalProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.desc && opt.desc.toLowerCase().includes(q)),
    )
  }, [options, search])

  const isSearching = search.trim().length > 0

  const handleClose = () => {
    setSearch('')
    onClose()
  }

  const handleSelect = (value: string) => {
    setSearch('')
    onSelect(value)
  }

  if (!open) return null

  return createPortal(
    <>
      <S.SelectModalOverlay
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleClose}
      />
      <S.SelectModal
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          transform: 'translate(-50%, -50%)',
          height: 'min(520px, 85vh)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <S.SelectModalHeader>
          <S.SelectModalTitle>국가 형태 선택</S.SelectModalTitle>
          <S.SelectModalClose onClick={handleClose} aria-label="닫기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                fill="currentColor"
              />
            </svg>
          </S.SelectModalClose>
        </S.SelectModalHeader>
        <S.ModalSearchWrap>
          <FiSearch size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <S.ModalSearchInput
            type="text"
            placeholder="형태 검색 (예: 왕국, 제국)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </S.ModalSearchWrap>
        <S.SelectModalContent
          style={{ maxHeight: 320, flex: '1 1 0', minHeight: 0 }}
        >
          {/* 검색 중: 평면 결과. 평소: 카테고리 그룹. */}
          {isSearching
            ? filtered.map((option) => (
                <OptionItem
                  key={option.value}
                  option={option}
                  active={selectedValue === option.value}
                  isDark={isDark}
                  onClick={() => handleSelect(option.value)}
                />
              ))
            : categories.map((cat) => {
                const items = filtered.filter((o) => o.category === cat.key)
                if (items.length === 0) return null
                return (
                  <div key={cat.key} style={{ marginBottom: 6 }}>
                    <CategoryHeader label={cat.label} isDark={isDark} />
                    {items.map((option) => (
                      <OptionItem
                        key={option.value}
                        option={option}
                        active={selectedValue === option.value}
                        isDark={isDark}
                        onClick={() => handleSelect(option.value)}
                      />
                    ))}
                  </div>
                )
              })}
          {filtered.length === 0 && (
            <S.EmptyState style={{ padding: '24px 16px' }}>
              <span
                style={{
                  color: isDark ? '#64748b' : '#9ca3af',
                  fontSize: 14,
                }}
              >
                검색 결과가 없습니다.
              </span>
            </S.EmptyState>
          )}
        </S.SelectModalContent>
      </S.SelectModal>
    </>,
    document.body,
  )
}
