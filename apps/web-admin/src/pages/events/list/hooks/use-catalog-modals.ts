/**
 * 카탈로그 모달/오버레이 상태 묶음.
 *
 * 카테고리 / 국가 / 요약 / 단축키 도움말 — 모달들의 open 상태와
 * body overflow lock effect, 자주 쓰는 helper(openSummary 등)를 한곳에 모음.
 */
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react'

export interface CatalogModalsState {
  shortcutHelpOpen: boolean
  setShortcutHelpOpen: Dispatch<SetStateAction<boolean>>
  closeShortcutHelp: () => void
  openShortcutHelp: () => void

  showCategoryModal: boolean
  setShowCategoryModal: Dispatch<SetStateAction<boolean>>
  showCountryModal: boolean
  setShowCountryModal: Dispatch<SetStateAction<boolean>>

  showSummaryModal: boolean
  setShowSummaryModal: Dispatch<SetStateAction<boolean>>
  summaryEventId: string | null
  openSummary: (eventId: string) => void
}

export function useCatalogModals(): CatalogModalsState {
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryEventId, setSummaryEventId] = useState<string | null>(null)

  /**
   * 모달/drawer 열린 동안 body 스크롤 잠금.
   * (drawer/모달은 portal 또는 fixed라 main에 inert를 거는 건 부작용이 큼 — body overflow만 잠금)
   */
  useEffect(() => {
    const anyOpen =
      shortcutHelpOpen ||
      showSummaryModal ||
      showCategoryModal ||
      showCountryModal
    if (!anyOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [
    shortcutHelpOpen,
    showSummaryModal,
    showCategoryModal,
    showCountryModal,
  ])

  const closeShortcutHelp = useCallback(() => setShortcutHelpOpen(false), [])
  const openShortcutHelp = useCallback(() => setShortcutHelpOpen(true), [])
  const openSummary = useCallback((eventId: string) => {
    setSummaryEventId(eventId)
    setShowSummaryModal(true)
  }, [])

  return {
    shortcutHelpOpen,
    setShortcutHelpOpen,
    closeShortcutHelp,
    openShortcutHelp,
    showCategoryModal,
    setShowCategoryModal,
    showCountryModal,
    setShowCountryModal,
    showSummaryModal,
    setShowSummaryModal,
    summaryEventId,
    openSummary,
  }
}
