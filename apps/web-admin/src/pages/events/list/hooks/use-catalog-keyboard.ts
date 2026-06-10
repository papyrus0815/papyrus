/**
 * 카탈로그 키보드 상호작용
 *
 * - 페이지 단축키: ? → 도움말, / → 검색 포커스, Esc → 도움말/선택 닫기
 * - 리스트 네비게이션: ↑/↓/Home/End → 이전/다음 선택, Enter → 상세 이동
 *
 * 입력창에 포커스 있을 땐 모두 비활성.
 */
import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { useNavigate } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import type { FlattenedHierarchyItem } from '@/features/event-hierarchy/model'

const isInEditableElement = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el?.isContentEditable ?? false)
  )
}

interface CatalogShortcutsArgs {
  searchInputRef: RefObject<HTMLInputElement | null>
  shortcutHelpOpen: boolean
  setShortcutHelpOpen: (updater: (v: boolean) => boolean) => void
  closeShortcutHelp: () => void
  selectedEventId: string | null
  clearSelectedEvent: () => void
}

/** ? · / · Esc 단축키 */
export function useCatalogShortcuts(args: CatalogShortcutsArgs) {
  const {
    searchInputRef,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    closeShortcutHelp,
    selectedEventId,
    clearSelectedEvent,
  } = args

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inEditable = isInEditableElement(e.target)
      if (e.key === '?' && !inEditable) {
        e.preventDefault()
        setShortcutHelpOpen((v) => !v)
      } else if (e.key === '/' && !inEditable) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        if (shortcutHelpOpen) closeShortcutHelp()
        else if (selectedEventId) clearSelectedEvent()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    shortcutHelpOpen,
    selectedEventId,
    searchInputRef,
    setShortcutHelpOpen,
    closeShortcutHelp,
    clearSelectedEvent,
  ])
}

interface CatalogListNavigationArgs {
  visibleList: FlattenedHierarchyItem[]
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  navigate: ReturnType<typeof useNavigate>
}

/** ↑ ↓ Home End Enter — 리스트 네비게이션 */
export function useCatalogListNavigation(args: CatalogListNavigationArgs) {
  const { visibleList, selectedEventId, setSelectedEventId, navigate } = args

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInEditableElement(e.target)) return
      if (!visibleList.length) return

      const list = visibleList
      const currentIndex = list.findIndex(
        (item) => item.node.id === selectedEventId,
      )
      const noSelection = currentIndex === -1

      let newIndex = currentIndex

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // 선택 없음 → 첫 항목, 그 외 → 다음 (마지막에서 정지)
        newIndex = noSelection
          ? 0
          : Math.min(currentIndex + 1, list.length - 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // 선택 없음 → 마지막 항목, 그 외 → 이전 (맨 앞에서 정지)
        newIndex = noSelection ? list.length - 1 : Math.max(currentIndex - 1, 0)
      } else if (e.key === 'Home') {
        e.preventDefault()
        newIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        newIndex = list.length - 1
      } else if (e.key === 'Enter' && selectedEventId) {
        e.preventDefault()
        navigate(pathKeys.events.detail(selectedEventId))
        return
      } else {
        return
      }

      if (newIndex !== currentIndex) {
        const newId = list[newIndex].node.id
        setSelectedEventId(newId)

        // rAF 두 번: setState → 커밋 → 페인트 후 스크롤이 보장됨
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const element = document.querySelector(
              `[data-event-id="${newId}"]`,
            )
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          })
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleList, selectedEventId, navigate, setSelectedEventId])
}
