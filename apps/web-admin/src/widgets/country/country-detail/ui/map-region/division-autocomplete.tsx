/**
 * 행정구역 검색 autocomplete — combobox role + 키보드 네비.
 * predecessor·parent 양쪽에서 같은 패턴 재사용.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import {
  type AdministrativeDivision,
  useAdministrativeDivisionSearch,
} from '@/entities/country/api.administrative-divisions'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

import { Input } from './form-fields'

interface DivisionAutocompleteProps {
  id?: string
  countryId: string
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
  countryId,
  selected,
  onChange,
  onClear,
  excludeIds = [],
  placeholder = '이름으로 검색',
}: DivisionAutocompleteProps) {
  const reactId = useId()
  const listboxId = `${id ?? reactId}-listbox`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const debouncedQ = useDebouncedValue(query, 250)
  const search = useAdministrativeDivisionSearch(debouncedQ, countryId)
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
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          background: '#f8fafc',
          fontSize: 13,
        }}
      >
        <span style={{ flex: 1, fontWeight: 600 }}>
          {selected.name}
          {selected.localName ? (
            <span
              style={{
                marginLeft: 6,
                color: '#64748b',
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
            color: '#64748b',
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
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
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
                color: '#64748b',
              }}
            >
              검색 중…
            </li>
          ) : hits.length === 0 ? (
            <li
              style={{
                padding: '10px 12px',
                fontSize: 12,
                color: '#64748b',
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
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: 12,
                    background: active ? '#f1f5f9' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {hit.name}
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#6366f1',
                        background: 'rgba(99,102,241,0.1)',
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
                        color: '#64748b',
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
