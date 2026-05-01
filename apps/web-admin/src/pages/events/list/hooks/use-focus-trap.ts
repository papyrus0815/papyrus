/**
 * 모달/오버레이 포커스 트랩
 *
 * - 활성 시: Tab/Shift+Tab을 컨테이너 내부로 가둠
 * - 마운트 시: 첫 포커스 가능한 요소로 포커스 이동
 * - 언마운트 시: 직전 활성 요소로 포커스 복귀 (트리거 버튼 ref가 별도로 필요 없음)
 *
 * 사용:
 *   const ref = useFocusTrap<HTMLDivElement>(open)
 *   <div ref={ref} role="dialog" aria-modal="true">…</div>
 */
import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    // 첫 포커스 가능한 요소로 이동 (없으면 컨테이너 자체)
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE)
    const first = focusables[0] ?? container
    requestAnimationFrame(() => first.focus())

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = container.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    container.addEventListener('keydown', handleKey)

    return () => {
      container.removeEventListener('keydown', handleKey)
      // 언마운트 시 직전 트리거로 복귀
      const prev = previouslyFocusedRef.current
      if (prev && document.contains(prev)) {
        prev.focus()
      }
    }
  }, [active])

  return containerRef
}
