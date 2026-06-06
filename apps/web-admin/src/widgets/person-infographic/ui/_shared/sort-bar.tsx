/**
 * 인물 뷰 공용 정렬 바 — 매트릭스/은하계/스토리/왕조 4뷰 동일 사용.
 * store의 `sort` 상태를 직접 읽고 쓴다 → URL/persist에 자동 동기화.
 */
import styled, { css } from 'styled-components'

import { usePersonInfographicFilterStore } from '../../model/filter.store'
import { SORT_OPTIONS } from '../../model/sort-helpers'

export function SortBar() {
  const sort = usePersonInfographicFilterStore((s) => s.sort)
  const setSort = usePersonInfographicFilterStore((s) => s.setSort)

  return (
    <Wrap role="radiogroup" aria-label="인물 정렬 기준">
      <Label>정렬</Label>
      {SORT_OPTIONS.map(([k, lbl]) => (
        <Btn
          key={k}
          type="button"
          role="radio"
          aria-checked={sort === k}
          $active={sort === k}
          onClick={() => setSort(k)}
        >
          {lbl}
        </Btn>
      ))}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px;
  flex-wrap: wrap;
`

const Label = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
`

const Btn = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.12s, color 0.12s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.activeLight};
          color: ${theme.colors.active};
          font-weight: 600;
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.secondary};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
          }
        `}
`
