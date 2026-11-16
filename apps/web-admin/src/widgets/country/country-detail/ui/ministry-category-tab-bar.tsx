/**
 * 중앙부처 — 카테고리 탭 (사건 페이지 플랫 언더라인 탭 규격 + 빈 직능 자동 접기)
 */
import { useMemo, useState } from 'react'
import styled from 'styled-components'

import {
  GOV_BRAND,
  GOV_ROW_HAIRLINE,
} from '@/features/government-info/ui/government-ledger.styles'
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { ALL_DEPARTMENTS_CATEGORY_ID } from '@/shared/lib/ministry-department/ministry-department-utils'

type MinistryCategoryTabBarProps = {
  categories: AdministrationDepartmentCategory[]
  /** categoryId → 부처 개수 */
  counts: Map<string, number>
  selectedCategoryId: string
  onSelectCategory: (categoryId: string) => void
  isDark?: boolean
}

export function MinistryCategoryTabBar({
  categories,
  counts,
  selectedCategoryId,
  onSelectCategory,
}: MinistryCategoryTabBarProps) {
  const [showEmptyCategories, setShowEmptyCategories] = useState(false)

  const { visibleCategories, hiddenEmptyCount } = useMemo(() => {
    const emptyItems = categories.filter((catItem) => {
      if (catItem.id === ALL_DEPARTMENTS_CATEGORY_ID) return false
      if (catItem.id === selectedCategoryId) return false
      return (counts.get(catItem.id) ?? 0) === 0
    })

    if (showEmptyCategories || emptyItems.length <= 2) {
      return {
        visibleCategories: categories,
        hiddenEmptyCount: emptyItems.length,
      }
    }

    const visible = categories.filter((catItem) => {
      if (catItem.id === ALL_DEPARTMENTS_CATEGORY_ID) return true
      if (catItem.id === selectedCategoryId) return true
      return (counts.get(catItem.id) ?? 0) > 0
    })

    return {
      visibleCategories: visible,
      hiddenEmptyCount: emptyItems.length,
    }
  }, [categories, counts, selectedCategoryId, showEmptyCategories])

  return (
    <CatNavBar role="tablist" aria-label="부처 직능 분류">
      {visibleCategories.map((catItem) => {
        const deptCount = counts.get(catItem.id) ?? 0
        const active = selectedCategoryId === catItem.id
        return (
          <CatTabBtn
            key={catItem.id}
            type="button"
            role="tab"
            id={`ministry-cat-tab-${catItem.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            $active={active}
            $empty={deptCount === 0 && !active}
            onClick={() => onSelectCategory(catItem.id)}
          >
            <span>{catItem.name}</span>
            <CatCountPill $active={active}>{deptCount}</CatCountPill>
          </CatTabBtn>
        )
      })}
      {hiddenEmptyCount > 2 ? (
        <EmptyToggleBtn
          type="button"
          onClick={() => setShowEmptyCategories((prev) => !prev)}
          title={
            showEmptyCategories
              ? '현재 필터 조건에서 0건인 빈 직능 탭을 접습니다'
              : `현재 0건인 직능 분류 ${hiddenEmptyCount}개를 펼쳐서 바로 해당 분류로 등록하거나 확인합니다`
          }
        >
          {showEmptyCategories
            ? '빈 직능 접기'
            : `+ 빈 직능 ${hiddenEmptyCount}개`}
        </EmptyToggleBtn>
      ) : null}
    </CatNavBar>
  )
}

const CatNavBar = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light};

  &::-webkit-scrollbar {
    display: none;
  }
`

const CatTabBtn = styled.button<{ $active: boolean; $empty?: boolean }>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 11px;
  margin: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.015em;
  white-space: nowrap;
  cursor: pointer;
  opacity: ${({ $empty }) => ($empty ? 0.68 : 1)};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  transition: color 0.14s ease, opacity 0.14s ease;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    border-radius: 0;
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? GOV_BRAND.primaryDark
          : GOV_BRAND.primary
        : 'transparent'};
    transition: background 0.14s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
    outline-offset: -2px;
    border-radius: 6px;
  }
`

const CatCountPill = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primarySoftDark
        : GOV_BRAND.primarySoft
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(20, 19, 34, 0.05)'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? GOV_BRAND.primaryInkDark
        : GOV_BRAND.primary
      : theme.colors.text.tertiary};
`

const EmptyToggleBtn = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  margin-left: 4px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(20, 19, 34, 0.14)'};
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(20, 19, 34, 0.28)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(20, 19, 34, 0.03)'};
  }
`
