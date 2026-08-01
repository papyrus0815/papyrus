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

  /** 하나라도 열린 오버레이가 있는가 — 전역 키보드 훅 비활성 판정용 */
  anyOverlayOpen: boolean
  /**
   * 가장 위에 열린 오버레이 *하나만* 닫는다. 닫을 게 있었으면 true.
   * Escape가 여러 레이어를 동시에 건드리던 문제(요약 모달은 안 닫히고 대신 뒤의
   * 선택이 풀리던 현상)를 우선순위 스택 하나로 정리한다.
   */
  closeTopOverlay: () => boolean
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

  const anyOverlayOpen =
    shortcutHelpOpen || showSummaryModal || showCategoryModal || showCountryModal

  /**
   * Escape 우선순위 — 나중에 열린 것(더 위 레이어)부터 하나만 닫는다.
   * 요약 모달이 자체 Esc 핸들러를 갖는 대신 여기로 모아 두 핸들러가 같은 키에
   * 동시 반응하는 일을 막는다.
   */
  const closeTopOverlay = useCallback(() => {
    if (showSummaryModal) {
      setShowSummaryModal(false)
      return true
    }
    if (showCategoryModal) {
      setShowCategoryModal(false)
      return true
    }
    if (showCountryModal) {
      setShowCountryModal(false)
      return true
    }
    if (shortcutHelpOpen) {
      setShortcutHelpOpen(false)
      return true
    }
    return false
  }, [showSummaryModal, showCategoryModal, showCountryModal, shortcutHelpOpen])

  return {
    anyOverlayOpen,
    closeTopOverlay,
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
