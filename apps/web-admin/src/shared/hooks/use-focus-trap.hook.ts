/**
 * 포커스 트랩 훅 — 모달 등 일시적 오버레이의 키보드 포커스를 컨테이너 안에 가둔다.
 *
 * enabled일 때:
 *  1) 컨테이너 내 첫 포커스 가능 요소(없으면 컨테이너 자체 tabIndex=-1)로 초기 포커스 이동
 *  2) Tab / Shift+Tab이 컨테이너 경계를 넘지 않도록 순환(첫↔마지막)
 *  3) 닫힐 때(enabled=false 또는 언마운트) 열기 직전 포커스 요소로 복원
 *
 * react-focus-lock 의존 없이 직접 구현 — 중첩 모달이 떠도 각 인스턴스가
 * 자신의 직전 포커스를 보관·복원하므로 스택 복귀가 자연스럽다.
 *
 * @param containerRef 모달 패널 루트 ref
 * @param enabled 트랩 활성 여부
 */
import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
}

/**
 * 활성 트랩 스택 — 중첩 모달이 겹치면 여러 useFocusTrap이 같은 document capture 단계에
 * 등록돼, 외부 트랩의 `!root.contains(active)` 분기가 내부 모달의 포커스를 가로채
 * Tab이 매번 내부 첫 요소로 튕기는 충돌이 생긴다. 최상위(가장 최근 활성) 트랩만
 * Tab을 처리하도록 스택으로 게이트한다.
 */
const trapStack: HTMLElement[] = []

export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) => {
  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return
    const root = containerRef.current
    if (!root) return

    // 열기 직전 포커스 요소 보관 (닫힐 때 복원)
    const previouslyFocused = document.activeElement as HTMLElement | null

    // 이 트랩을 최상위로 등록 — 아래 onKeyDown이 최상위일 때만 Tab을 처리한다.
    trapStack.push(root)

    // 초기 포커스 이동 — 마운트 직후 DOM 정리 전일 수 있어 다음 프레임에 실행
    const rafId = window.requestAnimationFrame(() => {
      const focusable = getFocusable(root)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        // 포커스 가능한 요소가 없으면 패널 자체로 (tabIndex=-1 필요)
        if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
        root.focus()
      }
    })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      // 최상위 트랩만 처리 — 중첩 모달에서 외부 트랩이 내부 포커스를 가로채는 충돌 방지.
      if (trapStack[trapStack.length - 1] !== root) return
      const focusable = getFocusable(root)
      if (focusable.length === 0) {
        // 가둘 대상이 없으면 패널 밖으로 못 나가게만 막음
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        // Shift+Tab: 첫 요소(또는 컨테이너 밖)에서 마지막으로 순환
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab: 마지막 요소(또는 컨테이너 밖)에서 첫 요소로 순환
        if (active === last || !root.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      window.cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', onKeyDown, true)
      const stackIdx = trapStack.lastIndexOf(root)
      if (stackIdx !== -1) trapStack.splice(stackIdx, 1)
      // 직전 포커스 복원 (요소가 아직 DOM에 있을 때만)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [containerRef, enabled])
}
