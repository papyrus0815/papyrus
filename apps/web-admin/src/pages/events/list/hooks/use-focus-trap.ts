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

/**
 * ⚠️ 모든 후보에 `:not([tabindex="-1"])`가 붙어야 한다 — 브라우저가 실제로 Tab을 주는
 * 집합과 같아야 하기 때문이다. 예전엔 `button:not([disabled])`만 있어서, 로빙
 * tabindex를 쓰는 그룹(라디오·세그먼트)이 안에 있으면 트랩이 계산한 첫/마지막 요소가
 * 진짜 첫/마지막 탭 대상과 어긋났다. 그러면 경계에서 가로채지 못해 **포커스가 트랩을
 * 빠져나간다** — 트랩이 있는데도 Tab 한 번에 뒤 문서로 새는 상태.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]',
]
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(',')

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
