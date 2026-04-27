/**
 * 모달 접근성 헬퍼 훅 모음.
 *
 * - useEscapeKey: 모달 열린 상태에서 Esc 키로 닫기
 * - useFocusFirstOnMount: 모달 mount 시 컨테이너 내 첫 focusable 요소로 이동
 *
 * 본 프로젝트는 react-focus-lock 같은 의존성이 없어 완전한 focus trap은 불가하지만,
 * 1) Esc 닫기 + 2) 초기 포커스 이전 두 가지만 보장해도 키보드/스크린리더 사용자
 * 경험이 크게 개선됨.
 */
import { useEffect, type RefObject } from 'react'

/**
 * 모달이 열려 있을 때 Esc 키로 닫는다.
 *
 * @param isOpen 모달 표시 여부
 * @param onClose 닫기 콜백
 */
export const useEscapeKey = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])
}

/**
 * 모달 mount 시 컨테이너 내 첫 focusable 요소로 포커스 이동.
 *
 * 자동으로 입력란이 활성화돼야 사용자가 곧바로 타이핑할 수 있어 UX가 자연스러움.
 * @param containerRef 모달 루트 ref
 * @param isOpen 모달 표시 여부 — false → true 전이마다 1회 실행
 */
export const useFocusFirstOnMount = (
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
) => {
  useEffect(() => {
    if (!isOpen) return
    const root = containerRef.current
    if (!root) return
    // 모달 마운트 직후엔 DOM이 아직 정리 안 됐을 수 있어 다음 tick에 실행
    const id = window.requestAnimationFrame(() => {
      const candidates = root.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
      )
      const first = Array.from(candidates).find(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
      )
      first?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [containerRef, isOpen])
}
