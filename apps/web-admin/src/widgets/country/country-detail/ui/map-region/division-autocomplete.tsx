/**
 * 행정구역 검색 autocomplete — combobox role + 키보드 네비.
 * predecessor·parent 양쪽에서 같은 패턴 재사용.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import {
  type AdministrativeDivision,
  type DivisionOwner,
  useAdministrativeDivisionSearch,
} from '@/entities/country/api.administrative-divisions'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { Input } from './form-fields'
import { useRegionPalette } from './use-region-palette'

interface DivisionAutocompleteProps {
  id?: string
  /** 검색 대상 소속 — 현대(countryId) 또는 역사(historicalCountryId) 국가 */
  owner: DivisionOwner
  /** 지정 시 그 체계 소속 구역만 검색 (상위 구역 선택 등 체계 일치가 필요한 곳) */
  schemeId?: string | null
  /** 선택된 행정구역 — null이면 입력창, 있으면 chip */
  selected: AdministrativeDivision | null
  onChange: (id: string) => void
  onClear: () => void
  /** 검색 결과에서 제외할 ID (자기 자신 등) */
  excludeIds?: string[]
  placeholder?: string
}

export function DivisionAutocomplete({
  id,
  owner,
  schemeId,
  selected,
  onChange,
  onClear,
  excludeIds = [],
  placeholder = '이름으로 검색',
}: DivisionAutocompleteProps) {
  const reactId = useId()
  const palette = useRegionPalette()
  const listboxId = `${id ?? reactId}-listbox`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const debouncedQ = useDebouncedValue(query, 250)
  const search = useAdministrativeDivisionSearch(debouncedQ, owner, 50, schemeId)
  const inputRef = useRef<HTMLInputElement>(null)

  const hits = useMemo(
    () => (search.data ?? []).filter((h) => !excludeIds.includes(h.id)),
    [search.data, excludeIds],
  )

  // 결과 바뀌면 활성 인덱스 리셋
  useEffect(() => {
    setActiveIdx(0)
  }, [debouncedQ, hits.length])

  if (selected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: `1px solid ${palette.borderMedium}`,
          borderRadius: 10,
          background: palette.bgSecondary,
          color: palette.text,
          fontSize: 13,
        }}
      >
        <span style={{ flex: 1, fontWeight: 600 }}>
          {selected.name}
          {selected.localName ? (
            <span
              style={{
                marginLeft: 6,
                color: palette.textSecondary,
                fontWeight: 400,
              }}
            >
              — {selected.localName}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'transparent',
            border: 'none',
            color: palette.textSecondary,
            cursor: 'pointer',
            fontSize: 16,
          }}
          aria-label="제거"
        >
          ×
        </button>
      </div>
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || hits.length === 0) {
      if (e.key === 'ArrowDown' && hits.length === 0 && query.trim()) {
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[activeIdx]
      if (hit) {
        onChange(hit.id)
        setQuery('')
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <Input
        id={id}
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && query.trim().length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && hits[activeIdx]
            ? `${listboxId}-opt-${hits[activeIdx]!.id}`
            : undefined
        }
      />
      {open && query.trim().length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            marginTop: 4,
            listStyle: 'none',
            background: palette.bg,
            border: `1px solid ${palette.borderMedium}`,
            borderRadius: 10,
            boxShadow: palette.isDark
              ? '0 8px 24px rgba(0, 0, 0, 0.5)'
              : '0 8px 24px rgba(15, 23, 42, 0.08)',
            zIndex: 10,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {search.isLoading ? (
            <li
              style={{
                padding: '10px 12px',
                fontSize: 12,
                color: palette.textSecondary,
              }}
            >
              검색 중…
            </li>
          ) : hits.length === 0 ? (
            <li
              style={{
                padding: '10px 12px',
                fontSize: 12,
                color: palette.textSecondary,
              }}
            >
              일치하는 행정구역이 없습니다
            </li>
          ) : (
            hits.map((hit, i) => {
              const optionId = `${listboxId}-opt-${hit.id}`
              const active = i === activeIdx
              return (
                <li
                  key={hit.id}
                  id={optionId}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(hit.id)
                    setQuery('')
                    setOpen(false)
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${palette.divider}`,
                    fontSize: 12,
                    background: active ? palette.bgHover : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, color: palette.text }}>
                    {hit.name}
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        color: palette.badgeText,
                        background: palette.badgeBg,
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      {hit.divisionLabel}
                    </span>
                  </div>
                  {hit.parentPath.length > 0 && (
                    <div
                      style={{
                        color: palette.textSecondary,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {hit.parentPath.join(' › ')}
                    </div>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
