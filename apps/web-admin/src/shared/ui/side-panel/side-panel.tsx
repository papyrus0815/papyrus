/**
 * 공용 사이드 패널(슬라이드 오버)
 *
 * - 조약 등록, 긴 폼, 상세 편집 등 **모달 대신** 쓸 수 있는 레이아웃 프리미티브
 * - `Z_INDEX.DRAWER_*` 사용 → **모달보다 아래** 레이어.
 * - 날짜/인물 등 보조 UI는 `document.body`로 포털되는 공용 모달을 쓰면 **항상 화면 정중앙**에 뜸
 *   (부모 `transform`에 묶이지 않도록 `DatePickerModal`·`PersonSelectModal` 등에서 처리).
 *
 * @example
 * const [open, setOpen] = useState(false)
 * return (
 *   <>
 *     <button type="button" onClick={() => setOpen(true)}>열기</button>
 *     <SidePanel
 *       isOpen={open}
 *       onClose={() => setOpen(false)}
 *       title="조약 등록"
 *       footer={<button type="button" onClick={save}>저장</button>}
 *     >
 *       {폼 내용}
 *     </SidePanel>
 *   </>
 * )
 */
import React, { useEffect, useId } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import {
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalSubtitle,
  ModalTitle,
  SidePanelHeaderActions,
  SidePanelOverlay,
  SidePanelScrollBody,
  type SidePanelSide,
  SidePanelSurface,
} from './side-panel.styles'

export type SidePanelProps = {
  isOpen: boolean
  onClose: () => void
  /** 헤더 제목 */
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /**
   * 헤더 우측(닫기 버튼 왼쪽) — 보조 액션·짧은 폼 저장 등.
   * 긴 폼의 주요 제출은 `footer` 가 UX상 더 자연스러운 경우가 많다.
   */
  headerActions?: React.ReactNode
  children: React.ReactNode
  /** 하단 고정 액션 영역 */
  footer?: React.ReactNode
  /**
   * `end`: 우측(일반적인 슬라이드 인), `start`: 좌측
   */
  side?: SidePanelSide
  /**
   * 패널 너비 (CSS length)
   * @default 'min(1180px, 100vw)' — 넓은 폼·표용
   */
  width?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  /** 열릴 때 `document.body` 스크롤 잠금 */
  lockBodyScroll?: boolean
  /** `title` 없을 때 dialog 접근성 라벨 */
  ariaLabel?: string
}

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

function panelMotion(side: SidePanelSide) {
  const x = side === 'end' ? '100%' : '-100%'
  return {
    initial: { x },
    animate: { x: 0 },
    exit: { x },
    transition: { type: 'spring' as const, damping: 28, stiffness: 320 },
  }
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  children,
  footer,
  side = 'end',
  width = 'min(1180px, 100vw)',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  lockBodyScroll = true,
  ariaLabel,
}: SidePanelProps) {
  const titleId = useId()
  const hasTitle = title != null && title !== ''

  useEffect(() => {
    if (!isOpen || !lockBodyScroll) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen, lockBodyScroll])

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeOnEscape, onClose])

  const portal = (
    <AnimatePresence>
      {isOpen ? (
        <>
          <SidePanelOverlay
            key="side-panel-overlay"
            role="presentation"
            aria-hidden
            {...overlayMotion}
            onClick={
              closeOnOverlayClick
                ? (e) => e.target === e.currentTarget && onClose()
                : undefined
            }
          />
          <SidePanelSurface
            key="side-panel-surface"
            $side={side}
            $width={width}
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasTitle ? titleId : undefined}
            aria-label={!hasTitle ? (ariaLabel ?? '패널') : undefined}
            {...panelMotion(side)}
          >
            <ModalHeader>
              <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                {hasTitle ? (
                  <ModalTitle id={titleId}>{title}</ModalTitle>
                ) : null}
                {subtitle ? <ModalSubtitle>{subtitle}</ModalSubtitle> : null}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                {headerActions ? (
                  <SidePanelHeaderActions>
                    {headerActions}
                  </SidePanelHeaderActions>
                ) : null}
                <ModalCloseButton
                  type="button"
                  onClick={onClose}
                  aria-label="패널 닫기"
                >
                  <FiX size={22} strokeWidth={2} />
                </ModalCloseButton>
              </div>
            </ModalHeader>

            <SidePanelScrollBody>{children}</SidePanelScrollBody>

            {footer ? <ModalFooter>{footer}</ModalFooter> : null}
          </SidePanelSurface>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null

  return createPortal(portal, document.body)
}
