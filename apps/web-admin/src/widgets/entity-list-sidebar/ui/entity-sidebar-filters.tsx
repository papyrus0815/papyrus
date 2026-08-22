/**
 * 사이드바 검색·필터 행 — 검색 인풋 + 칩 셀렉트 N개 + 초기화, 그 아래 유도 배지 줄.
 * 국가 목록이 쓰던 조판 그대로(shared/ui/sidebar-list), 셀렉트 구성만 도메인이 주입한다.
 */
import React from 'react'

import * as S from '@/shared/ui/sidebar-list'

import type { EntitySidebarSelect } from '../model/types'

interface EntitySidebarFiltersProps {
  query: string
  onQueryChange: (value: string) => void
  searchLabel: string
  searchPlaceholder: string
  onSearchKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  selects: EntitySidebarSelect[]
  hasActiveFilter: boolean
  onClearFilters?: () => void
  /** 검색·필터 아래 한 줄 — 유도 배지 등 도메인 자유 영역 */
  discovery?: React.ReactNode
}

export function EntitySidebarFilters({
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  onSearchKeyDown,
  selects,
  hasActiveFilter,
  onClearFilters,
  discovery,
}: EntitySidebarFiltersProps) {
  return (
    <S.FilterRow>
      <S.SearchWrapper>
        <S.SearchIcon>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </S.SearchIcon>
        <S.SearchInput
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
        />
        {query && (
          <S.ClearButton onClick={() => onQueryChange('')} aria-label="지우기">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </S.ClearButton>
        )}
      </S.SearchWrapper>

      {(selects.length > 0 || (hasActiveFilter && onClearFilters)) && (
        <S.FilterWrapper>
          {selects.map((select) => (
            <S.FilterSelect
              key={select.id}
              value={select.value}
              onChange={(event) => select.onChange(event.target.value)}
              $active={select.active ?? !!select.value}
              disabled={select.disabled}
              aria-label={select.label}
              title={select.title}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.FilterSelect>
          ))}
          {hasActiveFilter && onClearFilters && (
            <S.ClearAllFiltersButton onClick={onClearFilters}>
              초기화
            </S.ClearAllFiltersButton>
          )}
        </S.FilterWrapper>
      )}

      {discovery}
    </S.FilterRow>
  )
}
