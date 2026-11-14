/**
 * 중앙부처 — 카테고리 탭 (사건 페이지 플랫 언더라인 탭 규격)
 */
import styled from 'styled-components'

import { GOV_BRAND, GOV_ROW_HAIRLINE } from '@/features/government-info/ui/government-ledger.styles'
import type { AdministrationDepartmentCategory } from '@/shared/api/administration-department'
import { scrollbarMixin } from '@/shared/styles/mixins'

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
  return (
    <CatNavBar role="tablist" aria-label="부처 카테고리">
      {categories.map((catItem) => {
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
            onClick={() => onSelectCategory(catItem.id)}
          >
            <span>{catItem.name}</span>
            <CatCountPill $active={active}>{deptCount}</CatCountPill>
          </CatTabBtn>
        )
      })}
    </CatNavBar>
  )
}

const CatNavBar = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
  ${scrollbarMixin}
`

const CatTabBtn = styled.button<{ $active: boolean }>`
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 11px 9px;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? GOV_BRAND.primary : 'transparent')};
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.015em;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  transition:
    color 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
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
        ? '#93c5fd'
        : GOV_BRAND.primary
      : theme.colors.text.tertiary};
`
