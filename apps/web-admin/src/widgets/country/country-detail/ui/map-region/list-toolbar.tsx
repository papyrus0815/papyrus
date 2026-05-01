/**
 * 자연/인프라 뷰의 상단 툴바 — 검색 input + 정렬 select + 등록 버튼.
 * pill 필터 위에 별도 row로 배치된다.
 */
import type { ChangeEvent } from 'react'

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
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={palette.textSecondary}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          left: 12,
          pointerEvents: 'none',
        }}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 32px 8px 34px',
          fontSize: 13,
          border: `1px solid ${palette.border}`,
          borderRadius: 10,
          background: palette.bg,
          color: palette.text,
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = palette.primary
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = palette.border
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 8,
            width: 20,
            height: 20,
            border: 'none',
            background: palette.bgSecondary,
            color: palette.textSecondary,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            padding: 0,
          }}
        >
          ×
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
        padding: '8px 28px 8px 12px',
        fontSize: 12,
        fontWeight: 500,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        background: palette.bg,
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
