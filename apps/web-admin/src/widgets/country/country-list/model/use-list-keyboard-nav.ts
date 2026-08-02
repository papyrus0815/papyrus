/**
 * 사이드바 리스트의 ↑↓/Enter/→/← 키보드 네비게이션.
 *
 * - rows에 포함된 모든 항목 ID를 순서대로 받음 (펼친 sub-row 포함)
 * - 검색 인풋에서 ↓ 또는 행에서 ↓ → focusedIndex 증가
 * - Enter → onSelect(focusedId)
 * - →/← → onExpand(focusedId)/onCollapse(focusedId)
 * - 행에 data-row-index 부여하면 컨테이너 ref에서 focus() 가능
 */
import { useCallback, useRef, useState, type RefObject } from 'react'

interface UseListKeyboardNavOptions {
  containerRef: RefObject<HTMLElement | null>
  rowIds: string[]
  onSelect: (id: string) => void
  onExpand?: (id: string) => void
  onCollapse?: (id: string) => void
  expandableIds?: Set<string>
  expandedIds?: Set<string>
}

export function useListKeyboardNav({
  containerRef,
  rowIds,
  onSelect,
  onExpand,
  onCollapse,
  expandableIds,
  expandedIds,
}: UseListKeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const lastInteractionRef = useRef<'mouse' | 'keyboard'>('mouse')

  const focusRow = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(rowIds.length - 1, index))
      setFocusedIndex(clamped)
      lastInteractionRef.current = 'keyboard'
      requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector<HTMLElement>(
          `[data-row-index="${clamped}"]`,
        )
        el?.focus()
      })
    },
    [containerRef, rowIds.length],
  )

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (rowIds.length === 0) return
      // 현재 실제로 포커스된 행의 data-row-index를 우선 사용 — 마우스 클릭으로 focusedIndex와
      // 어긋난 경우(클릭은 focusedIndex를 갱신하지 않음) 맨 위로 점프하던 문제 방지(F12).
      const activeRow = containerRef.current?.contains(
        document.activeElement,
      )
        ? (document.activeElement as HTMLElement)
        : null
      const activeAttr = activeRow?.getAttribute('data-row-index')
      const activeIndex =
        activeAttr != null && Number.isInteger(Number(activeAttr))
          ? Number(activeAttr)
          : focusedIndex
      const idx = activeIndex >= 0 ? activeIndex : 0

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusRow(idx + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusRow(idx - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        focusRow(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        focusRow(rowIds.length - 1)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const id = rowIds[idx]
        if (id) onSelect(id)
      } else if (e.key === 'ArrowRight') {
        const id = rowIds[idx]
        if (id && expandableIds?.has(id) && !expandedIds?.has(id)) {
          e.preventDefault()
          onExpand?.(id)
        }
      } else if (e.key === 'ArrowLeft') {
        const id = rowIds[idx]
        if (id && expandableIds?.has(id) && expandedIds?.has(id)) {
          e.preventDefault()
          onCollapse?.(id)
        }
      }
    },
    [
      containerRef,
      rowIds,
      focusedIndex,
      focusRow,
      onSelect,
      expandableIds,
      expandedIds,
      onExpand,
      onCollapse,
    ],
  )

  /** 검색 인풋에서 ↓ 누르면 첫 행으로 진입 */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown' && rowIds.length > 0) {
        e.preventDefault()
        focusRow(0)
      }
    },
    [focusRow, rowIds.length],
  )

  return {
    focusedIndex,
    setFocusedIndex,
    focusRow,
    handleListKeyDown,
    handleSearchKeyDown,
  }
}
