/**
 * 바깥 클릭 감지 훅 — ref 바깥에서 mousedown이 발생하면 handler를 호출한다.
 *
 * 드롭다운/팝오버를 클릭아웃으로 닫는 공통 패턴. handler를 ref에 보관해
 * 매 렌더마다 리스너를 재바인딩하지 않는다(인라인 핸들러를 넘겨도 안전).
 */
import { useEffect, useRef, type RefObject } from 'react'

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent) => void,
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const el = ref.current
      if (!el || el.contains(event.target as Node)) return
      handlerRef.current(event)
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref])
}
