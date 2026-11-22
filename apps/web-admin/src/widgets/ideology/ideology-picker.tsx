/**
 * 이념 고르기 — 카탈로그(정당·조직·인물 공용)에서 여러 개를 고른다. 첫 칩이 대표 이념.
 *
 * 문자열 키워드 칸을 대신한다: 같은 개념이 정당마다 다른 글자로 흩어지지 않게(포퓰리즘·표퓰리즘),
 * 고를 때 이름·영문·다른 표기로 찾고, 없으면 그 자리에서 카탈로그에 새로 만든다.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiStar, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  type IdeologyDto,
  ideologyApi,
  ideologyKeys,
  labelIdeologyCategory,
} from '@/shared/api/ideology'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { notify } from '@/shared/ui/toast'

export interface IdeologyChip {
  id: string
  name: string
  category?: string | null
}

const MAX_OPTIONS = 12

export function IdeologyPicker({
  value,
  onChange,
  inputId,
  placeholder = '이념 찾기 — 이름·영문·다른 표기',
}: {
  value: IdeologyChip[]
  onChange: (next: IdeologyChip[]) => void
  inputId?: string
  placeholder?: string
}) {
  const queryClient = useQueryClient()
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounced = useDebouncedValue(query, 180)

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ideologyKeys.list(debounced.trim(), ''),
    queryFn: () => ideologyApi.list({ query: debounced.trim() || undefined }),
    enabled: open,
    staleTime: 30_000,
  })

  const selectedIds = useMemo(() => new Set(value.map((chip) => chip.id)), [value])
  const options = useMemo(
    () => candidates.filter((ideology) => !selectedIds.has(ideology.id)).slice(0, MAX_OPTIONS),
    [candidates, selectedIds],
  )
  const trimmed = query.trim()
  const exactExists = candidates.some(
    (ideology) =>
      ideology.name === trimmed || (ideology.aliases ?? []).some((alias) => alias.name === trimmed),
  )
  const canCreate = trimmed.length > 0 && !exactExists
  const rowCount = options.length + (canCreate ? 1 : 0)

  /* 목록이 열리면 스크롤 영역 안에서 보이게 — 모달 아래쪽 칸이면 목록이 화면 밖에 펴진다 */
  const listVisible = open && rowCount > 0
  useEffect(() => {
    if (listVisible) listRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [listVisible, rowCount])

  const createMut = useMutation({
    mutationFn: (name: string) => ideologyApi.create({ name }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ideologyKeys.all })
      select(created)
      notify.success(`이념 목록에 「${created.name}」을 만들었습니다.`)
    },
    onError: (err: Error) => notify.error(err.message),
  })

  function select(ideology: Pick<IdeologyDto, 'id' | 'name' | 'category'>) {
    if (selectedIds.has(ideology.id)) return
    onChange([...value, { id: ideology.id, name: ideology.name, category: ideology.category }])
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  const commitActive = () => {
    if (activeIndex < options.length) {
      const option = options[activeIndex]
      if (option) select(option)
    } else if (canCreate && !createMut.isPending) {
      createMut.mutate(trimmed)
    }
  }

  const makePrimary = (chipId: string) => {
    const chip = value.find((item) => item.id === chipId)
    if (!chip) return
    onChange([chip, ...value.filter((item) => item.id !== chipId)])
  }

  return (
    <PickerRoot>
      {value.length > 0 ? (
        <ChipRow aria-label="고른 이념">
          {value.map((chip, index) => (
            <Chip key={chip.id} $primary={index === 0}>
              {index === 0 ? (
                <FiStar size={11} aria-label="대표" className="star" />
              ) : (
                <ChipIconBtn type="button" aria-label={`${chip.name}을 대표로`} title="대표로" onClick={() => makePrimary(chip.id)}>
                  <FiStar size={11} />
                </ChipIconBtn>
              )}
              <span>{chip.name}</span>
              {chip.category && chip.category !== 'IDEOLOGY' ? (
                <span className="category">{labelIdeologyCategory(chip.category)}</span>
              ) : null}
              <ChipIconBtn
                type="button"
                aria-label={`${chip.name} 빼기`}
                onClick={() => onChange(value.filter((item) => item.id !== chip.id))}
              >
                <FiX size={12} />
              </ChipIconBtn>
            </Chip>
          ))}
        </ChipRow>
      ) : null}
      <InputWrap>
        <SearchInput
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open && rowCount > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && rowCount > 0 ? `${listboxId}-${activeIndex}` : undefined}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((index) => (rowCount === 0 ? 0 : (index + 1) % rowCount))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => (rowCount === 0 ? 0 : (index - 1 + rowCount) % rowCount))
            } else if (event.key === 'Enter') {
              if (rowCount > 0) {
                event.preventDefault()
                commitActive()
              }
            } else if (event.key === 'Escape') {
              if (open) {
                event.stopPropagation()
                setOpen(false)
              }
            } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
        />
        {open && rowCount > 0 ? (
          <OptionList ref={listRef} id={listboxId} role="listbox" aria-label="이념 후보">
            {options.map((ideology, index) => (
              <OptionRow
                key={ideology.id}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                $active={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(ideology)}
              >
                <span className="name">{ideology.name}</span>
                {ideology.englishName ? <span className="english">{ideology.englishName}</span> : null}
                <span className="meta">
                  {[
                    ideology.category !== 'IDEOLOGY' ? labelIdeologyCategory(ideology.category) : null,
                    ideology.parent ? `⊂ ${ideology.parent.name}` : null,
                    ideology._count?.partyLinks ? `${ideology._count.partyLinks}곳` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </OptionRow>
            ))}
            {canCreate ? (
              <OptionRow
                id={`${listboxId}-${options.length}`}
                role="option"
                aria-selected={activeIndex === options.length}
                $active={activeIndex === options.length}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(options.length)}
                onClick={() => !createMut.isPending && createMut.mutate(trimmed)}
              >
                <span className="create">
                  <FiPlus size={13} aria-hidden />
                  {createMut.isPending ? '만드는 중…' : `「${trimmed}」을 이념 목록에 새로 만들기`}
                </span>
              </OptionRow>
            ) : null}
          </OptionList>
        ) : null}
        {open && rowCount === 0 && !isFetching && trimmed === '' ? (
          <OptionList role="presentation">
            <EmptyRow>이념 목록이 비어 있습니다 — 이름을 쳐서 새로 만드세요.</EmptyRow>
          </OptionList>
        ) : null}
      </InputWrap>
    </PickerRoot>
  )
}

const PickerRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.span<{ $primary: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 8px;
  border: 1px solid
    ${({ theme, $primary }) => ($primary ? theme.colors.primary : theme.colors.border.light)};
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme, $primary }) =>
    $primary ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)') : 'transparent'};

  .star {
    color: ${({ theme }) => theme.colors.primary};
  }
  .category {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ChipIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`

const InputWrap = styled.div`
  display: flex;
  flex-direction: column;
`

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.16)')};
  }
`

/* 칸 아래에 흐름대로 편다 — 모달 스크롤 영역 안에서 떠 있는 목록은 아래쪽이 잘렸다 */
const OptionList = styled.div`
  margin-top: 4px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const OptionRow = styled.div<{ $active: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)') : 'transparent'};

  .name {
    font-size: 13.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .english {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .meta {
    font-size: 11.5px;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .create {
    grid-column: 1 / -1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
  }
`

const EmptyRow = styled.div`
  padding: 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
