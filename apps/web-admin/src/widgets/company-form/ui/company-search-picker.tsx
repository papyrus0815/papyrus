/**
 * 검색형 선택 picker — 기업 등록 모달의 창립자·본사 도시 칸.
 * (옛 기업 폼 페이지에서 그대로 옮겼다 — combobox/listbox ARIA·↑↓/Enter/Esc 키보드 계약 유지.)
 */
import React, { useEffect, useId, useRef, useState } from 'react'

import { FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

const PickerControl = styled.div`
  position: relative;
`

const SelectedBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 6px 6px 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  background: ${({ theme }) => theme.colors.activeLight};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.4)' : '#c7d2fe'};
  color: ${({ theme }) => theme.colors.text.primary};

  .label {
    flex: 1;
    font-weight: 500;
  }
  button {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    display: inline-flex;
    padding: 2px;
    &:hover {
      opacity: 1;
    }
  }
`

const PickerInputWrap = styled.div`
  position: relative;
  svg.lead {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px 8px 30px;
    border-radius: 8px;
    font-size: 13px;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
    transition: border-color 0.18s, box-shadow 0.18s;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.25)'
            : 'rgba(99, 102, 241, 0.15)'};
    }
  }
`

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 12px 32px ${({ theme }) => theme.colors.shadow.lg};
`

const DropItem = styled.li<{ $active?: boolean }>`
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.hover : 'transparent'};
  .main {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const DropEmpty = styled.li`
  padding: 0.5rem 0.6rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`


export type PickerOption = { id: string; label: string; sub?: string }

export const SearchPicker: React.FC<{
  value: string
  selectedLabel: string
  placeholder: string
  /** 접근성 라벨 베이스 — "{label} 검색"·"{label} 해제"에 사용 */
  label: string
  fetchOptions: (query: string) => Promise<PickerOption[]>
  showOnEmpty?: boolean
  onChange: (id: string, label: string) => void
}> = ({
  value,
  selectedLabel,
  placeholder,
  label,
  fetchOptions,
  showOnEmpty = false,
  onChange,
}) => {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<PickerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reactId = useId()
  const listId = `${reactId}-listbox`
  const optionId = (index: number) => `${reactId}-option-${index}`

  useEffect(() => {
    if (!editing) return
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [editing])

  useEffect(() => {
    if (!editing) return
    if (!query.trim() && !showOnEmpty) {
      setOptions([])
      return
    }
    let alive = true
    setLoading(true)
    const timer = setTimeout(() => {
      fetchOptions(query)
        .then((opts) => alive && setOptions(opts))
        .catch(() => alive && setOptions([]))
        .finally(() => alive && setLoading(false))
    }, 200)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, editing, showOnEmpty, fetchOptions])

  // 옵션 목록이 바뀌면 활성 인덱스 리셋.
  useEffect(() => {
    setActiveIndex(-1)
  }, [options])

  const selectOption = (option: PickerOption) => {
    onChange(option.id, option.label)
    setEditing(false)
    setQuery('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const dropdownOpen = editing && (query.trim().length > 0 || showOnEmpty)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!dropdownOpen) {
        setEditing(true)
        return
      }
      if (options.length === 0) return
      setActiveIndex((index) => (index + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (options.length === 0) return
      // 미선택(-1)에서 위로 = 마지막 항목(둘러가기). (-1-1+len)%len는 끝-1로 새던 버그.
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      // 드롭다운이 열려 있으면 Enter는 *항상* 폼 제출을 막는다 — 활성 항목이 없으면
      // (타이핑 직후, activeIndex=-1) 첫 결과를 고른다. preventDefault를 활성 항목이
      // 있을 때로만 한정하면 일반 흐름에서 native Enter가 폼을 제출하는 버그가 난다.
      if (!dropdownOpen) return
      event.preventDefault()
      const picked = activeIndex >= 0 ? options[activeIndex] : options[0]
      if (picked) selectOption(picked)
    } else if (event.key === 'Escape') {
      setEditing(false)
    }
  }

  if (value && !editing) {
    return (
      <PickerControl>
        <SelectedBox>
          <span className="label">{selectedLabel || '(이름 없음)'}</span>
          <button
            type="button"
            aria-label={`${label} 검색`}
            onClick={() => {
              setQuery('')
              setOptions([])
              setEditing(true)
            }}
          >
            <FiSearch size={15} />
          </button>
          <button
            type="button"
            aria-label={`${label} 해제`}
            onClick={() => onChange('', '')}
          >
            <FiX size={16} />
          </button>
        </SelectedBox>
      </PickerControl>
    )
  }

  const dropdownOpen = editing && (query.trim().length > 0 || showOnEmpty)

  return (
    <PickerControl ref={wrapRef}>
      <PickerInputWrap>
        <FiSearch className="lead" size={15} />
        <input
          autoFocus={editing}
          value={query}
          placeholder={placeholder}
          onFocus={() => setEditing(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-label={label ? `${label} 검색` : placeholder}
          aria-expanded={dropdownOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
        />
      </PickerInputWrap>
      {dropdownOpen && (
        <Dropdown id={listId} role="listbox">
          {loading && <DropEmpty>검색 중...</DropEmpty>}
          {!loading && options.length === 0 && <DropEmpty>결과 없음</DropEmpty>}
          {!loading &&
            options.map((option, index) => (
              <DropItem
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                $active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectOption(option)
                }}
              >
                <span className="main">{option.label}</span>
                {option.sub && <span className="sub">{option.sub}</span>}
              </DropItem>
            ))}
        </Dropdown>
      )}
    </PickerControl>
  )
}
