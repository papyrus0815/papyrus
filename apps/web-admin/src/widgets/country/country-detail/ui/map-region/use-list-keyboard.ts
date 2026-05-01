import { useEffect } from 'react'

interface UseListKeyboardOptions<T extends { id: string }> {
  /** 현재 표시 중인 항목 (필터·검색 적용 후) */
  items: T[]
  /** 현재 선택된 ID — null이면 미선택 */
  selectedId: string | null
  /** 선택 ID를 갱신 */
  onSelect: (id: string | null) => void
  /** 키 입력을 받을지 여부 (모달이 열려있으면 false 권장) */
  enabled?: boolean
}

/**
 * 자연/인프라/행정구역 리스트의 키보드 네비게이션.
 *  - ArrowUp/ArrowDown: 이전/다음 항목으로 선택 이동
 *  - Home/End: 처음/마지막 항목
 *  - Esc: 선택 해제
 *
 * 입력 필드(input/textarea/select)에 포커스 있으면 무시.
 */
export function useListKeyboard<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  enabled = true,
}: UseListKeyboardOptions<T>) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          // 단, Esc는 input에서도 선택 해제 허용
          if (e.key !== 'Escape') return
        }
      }

      if (items.length === 0) {
        if (e.key === 'Escape' && selectedId) {
          e.preventDefault()
          onSelect(null)
        }
        return
      }

      const idx = selectedId
        ? items.findIndex((i) => i.id === selectedId)
        : -1

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = idx < 0 ? 0 : Math.min(idx + 1, items.length - 1)
          onSelect(items[next].id)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const next = idx < 0 ? items.length - 1 : Math.max(idx - 1, 0)
          onSelect(items[next].id)
          break
        }
        case 'Home': {
          e.preventDefault()
          onSelect(items[0].id)
          break
        }
        case 'End': {
          e.preventDefault()
          onSelect(items[items.length - 1].id)
          break
        }
        case 'Escape': {
          if (selectedId) {
            e.preventDefault()
            onSelect(null)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items, selectedId, onSelect, enabled])
}
