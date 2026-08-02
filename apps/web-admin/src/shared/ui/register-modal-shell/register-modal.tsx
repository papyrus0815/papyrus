/**
 * 등록 모달 공용 컴포넌트 (솔리드 스킨) — 글래스 `<Modal>`의 register-shell 판.
 *
 * 동작 레이어(Esc·body 스크롤락·초기 포커스·focus trap·포커스 복원)는 글래스 `<Modal>`과
 * 동일하게 `useModalBehavior` 훅을 공유한다. 차이는 시각 스킨(솔리드 12px·정제 그림자)과
 * 박스 모델(width·minHeight·고정 height), 그리고 AnimatePresence exit 애니메이션뿐.
 *
 * 기존 register-shell 모달들이 각자 구현하던 createPortal·Esc·스크롤락·aria 보일러플레이트를
 * 흡수한다. 본문은 `PersonRegisterModalFormScroll`, 하단 고정은 `PersonRegisterModalStickyFooter`를
 * children으로 그대로 사용.
 *
 * @example
 *   <RegisterModal isOpen={open} onClose={onClose} title="가문 등록" maxWidth="min(720px,96vw)" minHeight="520px">
 *     <PersonRegisterModalFormScroll>…</PersonRegisterModalFormScroll>
 *     <PersonRegisterModalStickyFooter>…</PersonRegisterModalStickyFooter>
 *   </RegisterModal>
 */
import { type ReactNode, type RefObject, useId, useRef } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import { useModalBehavior } from '@/shared/ui/modal'

import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalTitle,
} from './register-modal-shell'

export interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  /** 기본 헤더 제목 — 주면 헤더(타이틀+닫기)를 렌더하고 aria-labelledby 자동 연결 */
  title?: ReactNode
  /** title 없이 dialog 라벨만 필요할 때 (스크린리더용) */
  ariaLabel?: string
  /** 커스텀 header 사용 시 제목 요소 id 직접 연결 */
  ariaLabelledBy?: string
  /** 박스 width (기본 min(960px, 96vw)) */
  maxWidth?: string
  /** 박스 min-height (기본 560px) */
  minHeight?: string
  /** 지정 시 height: min(값, 90vh)로 바깥 박스 높이 고정 (탭 전환 등) */
  height?: string
  /**
   * ≤768px에서 화면을 꽉 채운다. 긴 폼은 켜는 편이 낫다 — 기본 박스는 390×844에서
   * 본문 세로가 같은 폼의 페이지 판보다 좁아진다.
   */
  fullBleedOnMobile?: boolean
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
  /** 헤더 제목과 닫기 버튼 사이에 끼울 추가 액션 */
  headerActions?: ReactNode
  /** 기본 헤더 대신 직접 렌더할 헤더 (지정 시 title 무시) */
  header?: ReactNode
  className?: string
  children: ReactNode
}

export function RegisterModal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  ariaLabelledBy,
  maxWidth,
  minHeight,
  height,
  fullBleedOnMobile = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  lockScroll = true,
  trapFocus = true,
  autoFocus = true,
  initialFocusRef,
  showCloseButton = true,
  headerActions,
  header,
  className,
  children,
}: RegisterModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const titleId = `register-modal-title-${generatedId}`

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

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <PersonRegisterModalOverlay
          $fullBleedOnMobile={fullBleedOnMobile}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={
            closeOnOverlayClick
              ? (event) => {
                  if (event.target === event.currentTarget) onClose()
                }
              : undefined
          }
        >
          <PersonRegisterModalBox
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
            $minHeight={minHeight}
            $height={height}
            $fullBleedOnMobile={fullBleedOnMobile}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
          >
            {header ??
              (title != null && (
                <PersonRegisterModalHeader>
                  <PersonRegisterModalTitle id={titleId}>
                    {title}
                  </PersonRegisterModalTitle>
                  {headerActions}
                  {showCloseButton && (
                    <PersonRegisterModalCloseBtn
                      type="button"
                      onClick={onClose}
                      aria-label="닫기"
                    >
                      <FiX size={20} />
                    </PersonRegisterModalCloseBtn>
                  )}
                </PersonRegisterModalHeader>
              ))}
            {children}
          </PersonRegisterModalBox>
        </PersonRegisterModalOverlay>
      )}
    </AnimatePresence>,
    document.body,
  )
}
