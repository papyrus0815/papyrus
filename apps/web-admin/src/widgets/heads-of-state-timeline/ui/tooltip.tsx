/**
 * 페이지 단위 단일 floating 툴팁 — 막대 호버 시 마우스 좌표 기준으로 위치를 잡아 다줄/리치 컨텐츠를 노출.
 * 네이티브 `title` 속성의 한계(딜레이, 미스타일, 멀티라인 빈약)를 대체한다.
 *
 * 사용법:
 *   <HeadsTooltipProvider>
 *     ...children
 *   </HeadsTooltipProvider>
 *
 *   const tooltip = useHeadsTooltip()
 *   <div
 *     onMouseEnter={(e) => tooltip.show(e.clientX, e.clientY, <TooltipContent/>)}
 *     onMouseMove={(e) => tooltip.move(e.clientX, e.clientY)}
 *     onMouseLeave={tooltip.hide}
 *   />
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

interface TooltipState {
  x: number
  y: number
  content: ReactNode
}

interface TooltipApi {
  show: (x: number, y: number, content: ReactNode) => void
  move: (x: number, y: number) => void
  hide: () => void
}

const TooltipContext = createContext<TooltipApi | null>(null)

export function HeadsTooltipProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TooltipState | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)

  const api: TooltipApi = useMemo(
    () => ({
      show: (x, y, content) => setState({ x, y, content }),
      move: (x, y) =>
        setState((prev) => (prev ? { ...prev, x, y } : prev)),
      hide: () => setState(null),
    }),
    [],
  )

  // 스크롤·리사이즈 등으로 호버 대상이 사라지면 자동 hide (race 안전망)
  useEffect(() => {
    if (!state) return
    const onScroll = () => api.hide()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [state, api])

  return (
    <TooltipContext.Provider value={api}>
      {children}
      {state &&
        typeof document !== 'undefined' &&
        createPortal(
          <Bubble
            ref={bubbleRef}
            style={computePosition(state.x, state.y)}
            role="tooltip"
          >
            {state.content}
          </Bubble>,
          document.body,
        )}
    </TooltipContext.Provider>
  )
}

/** 마우스 우상단에 띄우되 화면 모서리 안쪽으로 자동 클램프 */
function computePosition(x: number, y: number): React.CSSProperties {
  const OFFSET_X = 14
  const OFFSET_Y = 18
  const APPROX_W = 280
  const APPROX_H = 110
  let left = x + OFFSET_X
  let top = y - OFFSET_Y - APPROX_H
  if (typeof window !== 'undefined') {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (left + APPROX_W > vw - 8) left = x - OFFSET_X - APPROX_W
    if (top < 8) top = y + OFFSET_Y
    if (top + APPROX_H > vh - 8) top = vh - APPROX_H - 8
    if (left < 8) left = 8
  }
  return { left, top }
}

/** Provider 누락 시 no-op — UI 사망 방지 */
const NOOP_API: TooltipApi = {
  show: () => {},
  move: () => {},
  hide: () => {},
}

export function useHeadsTooltip(): TooltipApi {
  return useContext(TooltipContext) ?? NOOP_API
}

const Bubble = styled.div`
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  min-width: 180px;
  max-width: min(320px, calc(100vw - 24px));
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20, 20, 28, 0.97)'
      : 'rgba(255, 255, 255, 0.98)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#ffffff' : '#0f172a'};
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.10);
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.10)'
        : 'rgba(15, 23, 42, 0.08)'};
  white-space: normal;
  word-break: keep-all;
  @media (max-width: 600px) {
    min-width: 0;
    max-width: calc(100vw - 24px);
  }
`
