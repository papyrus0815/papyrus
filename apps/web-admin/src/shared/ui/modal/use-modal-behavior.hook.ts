/**
 * 모달 동작 레이어 — 한 훅으로 모달 접근성/UX를 일괄 보장.
 *
 * 프로젝트 전역에 흩어진 직접 구현(Esc 60+곳, 스크롤락 미적용, focus trap 부재)을
 * 하나로 모은다. 공용 `<Modal>` 컴포넌트 내부에서 호출되며, 커스텀 스킨을 유지해야 하는
 * 모달(예: country-search)은 이 훅만 단독으로 채택할 수 있다.
 *
 * 보장 항목:
 *  1. Esc 닫기 — 컨테이너(root)에 바인딩 + stopPropagation. 포커스가 트랩된 최상위
 *     모달의 root 에서만 이벤트가 잡혀, 중첩 모달이 함께 닫히던 버그를 구조적으로 차단.
 *  2. body 스크롤 락 — 참조 카운트 공용 훅 재사용(다중 모달 안전).
 *  3. 초기 포커스 — initialFocusRef → [autofocus] → 첫 focusable 순. 이미 모달 내부에
 *     포커스가 있으면(autoFocus 등) 가로채지 않음.
 *  4. focus trap — Tab/Shift+Tab 순환을 모달 안에 가둠.
 *  5. 포커스 복원 — 닫힐 때 모달을 연 트리거로 포커스를 되돌림.
 */
import { type RefObject, useEffect, useRef } from 'react'

import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** root 내부의 보이는 focusable 요소를 DOM 순서대로 수집 */
function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.tabIndex !== -1 &&
      (element.offsetWidth > 0 ||
        element.offsetHeight > 0 ||
        element.getClientRects().length > 0),
  )
}

export interface UseModalBehaviorOptions {
  /** 모달 표시 여부 — false → true 전이마다 동작 1회 설정 */
  isOpen: boolean
  /** 닫기 콜백 (Esc) */
  onClose: () => void
  /** 모달 루트(컨테이너) ref — Esc/트랩/초기포커스 기준 */
  containerRef: RefObject<HTMLElement | null>
  /** Esc 로 닫기 (기본 true) */
  closeOnEsc?: boolean
  /** body 스크롤 락 (기본 true) */
  lockScroll?: boolean
  /** Tab focus trap (기본 true) */
  trapFocus?: boolean
  /** 열릴 때 자동 초기 포커스 (기본 true) */
  autoFocus?: boolean
  /** 초기 포커스 대상 (없으면 [autofocus] → 첫 focusable) */
  initialFocusRef?: RefObject<HTMLElement | null>
}

export function useModalBehavior({
  isOpen,
  onClose,
  containerRef,
  closeOnEsc = true,
  lockScroll = true,
  trapFocus = true,
  autoFocus = true,
  initialFocusRef,
}: UseModalBehaviorOptions) {
  useBodyScrollLock(isOpen && lockScroll)

  // onClose 를 ref 로 고정 — 매 렌더 새 핸들러여도 effect 재실행(=리스너 재바인딩·초기
  // 포커스 재시도)을 유발하지 않게 함.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const root = containerRef.current
    if (!root) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    // 초기 포커스 — 마운트 직후 DOM 정리 후 다음 프레임에 실행
    let frame = 0
    if (autoFocus) {
      frame = window.requestAnimationFrame(() => {
        // 이미 모달 내부로 포커스가 들어와 있으면(autoFocus 등) 가로채지 않음
        if (
          root.contains(document.activeElement) &&
          document.activeElement !== root
        )
          return
        const target =
          initialFocusRef?.current ??
          root.querySelector<HTMLElement>('[autofocus]') ??
          getFocusable(root)[0] ??
          root
        target.focus()
      })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (!trapFocus || event.key !== 'Tab') return
      const focusables = getFocusable(root)
      if (focusables.length === 0) {
        event.preventDefault()
        root.focus({ preventScroll: true })
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault()
          last.focus({ preventScroll: true })
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    root.addEventListener('keydown', handleKeyDown)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      root.removeEventListener('keydown', handleKeyDown)
      // 모달을 연 트리거로 포커스 복원 — 키보드/스크린리더 컨텍스트 유지
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [isOpen, containerRef, initialFocusRef, autoFocus, trapFocus, closeOnEsc])
}
