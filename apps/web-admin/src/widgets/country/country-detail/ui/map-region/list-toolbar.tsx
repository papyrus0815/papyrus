/**
 * 자연/인프라 뷰의 상단 툴바 — 검색 input + 정렬 select + 등록 버튼.
 * pill 필터 위에 별도 row로 배치된다.
 */
import type { ChangeEvent } from 'react'

import { FiSearch, FiX } from 'react-icons/fi'

import { type RegionPalette } from './use-region-palette'

interface SearchInputProps {
  palette: RegionPalette
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({
  palette,
  value,
  onChange,
  placeholder = '검색...',
}: SearchInputProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
      }}
    >
      <FiSearch
        size={13}
        style={{
          position: 'absolute',
          left: 11,
          color: palette.textSecondary,
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: 34,
          padding: '0 30px 0 32px',
          fontSize: 12.5,
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
          background: 'transparent',
          color: palette.text,
          outline: 'none',
          transition: 'border-color 0.14s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = palette.primary
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = palette.border
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 7,
            width: 20,
            height: 20,
            border: 'none',
            background: 'transparent',
            color: palette.textSecondary,
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <FiX size={13} />
        </button>
      )}
    </div>
  )
}

interface SortOption<V extends string> {
  value: V
  label: string
}

interface SortSelectProps<V extends string> {
  palette: RegionPalette
  value: V
  options: ReadonlyArray<SortOption<V>>
  onChange: (value: V) => void
}

export function SortSelect<V extends string>({
  palette,
  value,
  options,
  onChange,
}: SortSelectProps<V>) {
  return (
    <select
      aria-label="정렬"
      value={value}
      onChange={(e) => onChange(e.target.value as V)}
      style={{
        height: 34,
        padding: '0 26px 0 11px',
        fontSize: 12,
        fontWeight: 600,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        background: 'transparent',
        color: palette.text,
        outline: 'none',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

interface ListToolbarRowProps {
  palette: RegionPalette
  /** 좌측: 검색·정렬 등 */
  children: React.ReactNode
  /** 우측: 등록 버튼 등 */
  rightSlot?: React.ReactNode
}

/**
 * 검색·정렬 row 컨테이너 — pill 필터 위에 배치.
 */
export function ListToolbarRow({
  palette,
  children,
  rightSlot,
}: ListToolbarRowProps) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${palette.border}`,
        background: palette.bg,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {children}
      {rightSlot}
    </div>
  )
}
