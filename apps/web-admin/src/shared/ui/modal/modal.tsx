/**
 * 공용 모달 컴포넌트 — 포털 + 오버레이 + 박스 + 동작 레이어를 한곳에 묶음.
 *
 * 기존엔 모달마다 createPortal·Esc·스크롤락·aria 를 직접 구현해 중복/누락이 많았다.
 * 이 컴포넌트는 그 보일러플레이트를 흡수한다:
 *  - 포털(document.body) 렌더
 *  - 오버레이 클릭으로 닫기(드래그 아웃 오작동 방지 — mousedown target 일치 검사)
 *  - Esc 닫기 · body 스크롤 락 · 초기 포커스 · focus trap · 포커스 복원 (useModalBehavior)
 *  - role="dialog" · aria-modal · aria-labelledby 자동 배선
 *
 * 시각 스킨은 공용 글래스(@/shared/ui/modal styles)를 사용. 커스텀 스킨을 유지해야 하는
 * 모달은 이 컴포넌트 대신 `useModalBehavior` 훅만 단독 채택하면 된다.
 *
 * @example
 *   <Modal isOpen={open} onClose={onClose} title="제목" subtitle="설명">
 *     <ModalBody>…</ModalBody>
 *     <ModalFooter>…</ModalFooter>
 *   </Modal>
 */
import { type ReactNode, type RefObject, useId, useRef } from 'react'

import { createPortal } from 'react-dom'

import { FiX } from 'react-icons/fi'

import {
  ModalBox,
  ModalBoxNarrow,
  ModalBoxWide,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from './modal.styles'
import { useModalBehavior } from './use-modal-behavior.hook'

type ModalSize = 'default' | 'wide' | 'narrow'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  /** 기본 헤더의 제목 — 주면 헤더(타이틀+닫기)를 렌더하고 aria-labelledby 자동 연결 */
  title?: ReactNode
  /** 기본 헤더의 보조 설명 */
  subtitle?: ReactNode
  /** title 없이 dialog 라벨만 필요할 때 (스크린리더용) */
  ariaLabel?: string
  /** 커스텀 header 사용 시 제목 요소의 id를 aria-labelledby로 직접 연결 (title 미사용일 때) */
  ariaLabelledBy?: string
  /** 박스 폭 프리셋 (default 560 / wide 900 / narrow 400) */
  size?: ModalSize
  /** size 프리셋 대신 직접 지정 */
  maxWidth?: string
  maxHeight?: string
  /** 오버레이 클릭으로 닫기 (기본 true) */
  closeOnOverlayClick?: boolean
  /** Esc 로 닫기 (기본 true) */
  closeOnEsc?: boolean
  /** body 스크롤 락 (기본 true) */
  lockScroll?: boolean
  /** Tab focus trap (기본 true) */
  trapFocus?: boolean
  /** 열릴 때 자동 초기 포커스 (기본 true) */
  autoFocus?: boolean
  /** 초기 포커스 대상 */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** 기본 헤더의 닫기 버튼 노출 (기본 true) */
  showCloseButton?: boolean
  /** 기본 헤더 대신 직접 렌더할 헤더 (지정 시 title 무시) */
  header?: ReactNode
  /** 박스에 추가할 className */
  className?: string
  children: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  ariaLabel,
  ariaLabelledBy,
  size = 'default',
  maxWidth,
  maxHeight,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  lockScroll = true,
  trapFocus = true,
  autoFocus = true,
  initialFocusRef,
  showCloseButton = true,
  header,
  className,
  children,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const titleId = `modal-title-${generatedId}`

  useModalBehavior({
    isOpen,
    onClose,
    containerRef,
    closeOnEsc,
    lockScroll,
    trapFocus,
    autoFocus,
    initialFocusRef,
  })

  if (!isOpen || typeof document === 'undefined') return null

  const Box =
    size === 'wide'
      ? ModalBoxWide
      : size === 'narrow'
        ? ModalBoxNarrow
        : ModalBox

  return createPortal(
    <ModalOverlay
      onMouseDown={
        closeOnOverlayClick
          ? (event) => {
              if (event.target === event.currentTarget) onClose()
            }
          : undefined
      }
    >
      <Box
        ref={containerRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : ariaLabelledBy}
        aria-label={
          title == null && ariaLabelledBy == null ? ariaLabel : undefined
        }
        tabIndex={-1}
        $maxWidth={maxWidth}
        $maxHeight={maxHeight}
      >
        {header ??
          (title != null && (
            <ModalHeader>
              <div>
                <ModalTitle id={titleId}>{title}</ModalTitle>
                {subtitle != null && <ModalSubtitle>{subtitle}</ModalSubtitle>}
              </div>
              {showCloseButton && (
                <ModalCloseButton
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                >
                  <FiX />
                </ModalCloseButton>
              )}
            </ModalHeader>
          ))}
        {children}
      </Box>
    </ModalOverlay>,
    document.body,
  )
}
