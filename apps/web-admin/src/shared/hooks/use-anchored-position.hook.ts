/**
 * 트리거 요소를 기준으로 *포털된* 팝오버의 fixed 좌표를 계산한다.
 *
 * 왜 포털이 필요한가: 사건 툴바의 `FilterGroup`·`ViewSegmented`는 radius 클리핑과
 * 좁은 폭 가로 스크롤 때문에 `overflow`가 걸려 있다. 팝오버를 그 안에서 absolute로
 * 띄우면 컨테이닝 블록 체인이 클리핑 박스 *안*이라 z-index와 무관하게 잘린다
 * (2026-07-28 검토 P1-1·P1-8 — 카테고리·대륙·국가 필터 드롭다운이 7주간 화면에
 *  전혀 나타나지 않던 근본 원인). body로 포털하면 클리핑 조상 자체를 벗어나고,
 * 좌표 계산 책임은 이 훅이 진다.
 */
import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

/** 뷰포트 가장자리에서 확보할 최소 여백 */
const VIEWPORT_MARGIN = 8
/** maxHeight가 이보다 작아지면 팝오버가 쓸모없어지므로 하한을 둔다 */
const MIN_USABLE_HEIGHT = 120

export interface AnchoredPosition {
  /** `position: fixed` 기준 좌표 */
  top: number
  left: number
  /** 트리거 폭 — 팝오버가 최소한 트리거만큼은 넓도록 */
  minWidth: number
  /** 아래로 남은 공간 — 팝오버 내부 스크롤 상한 */
  maxHeight: number
}

interface AnchoredPositionOptions {
  /** 트리거와 팝오버 사이 간격(px) */
  gap?: number
  /** 팝오버가 가질 수 있는 최대 폭 — 우측 클램프 계산에 사용 */
  maxWidth?: number
}

/**
 * 좌표 4필드 얕은 비교 — **같으면 setState 자체를 하지 않기 위한** 판정(검토 INT-15/PERF-8).
 *
 * 예전엔 스크롤 이벤트마다 무조건 새 객체를 setState했다. 이 훅을 쓰는 팝오버의 트리거는
 * 목록 스크롤러 *밖*의 sticky 툴바라 rect가 아예 변하지 않는데도, 캡처 단계 스크롤 구독이
 * 본문 스크롤을 전부 받아 옵션 수십 개를 매 스크롤 이벤트마다 다시 그렸다.
 */
function isSamePosition(
  left: AnchoredPosition | null,
  right: AnchoredPosition,
): boolean {
  return (
    left !== null &&
    left.top === right.top &&
    left.left === right.left &&
    left.minWidth === right.minWidth &&
    left.maxHeight === right.maxHeight
  )
}

export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  { gap = 4, maxWidth = 280 }: AnchoredPositionOptions = {},
): AnchoredPosition | null {
  const [position, setPosition] = useState<AnchoredPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const recompute = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()

      // 폭: 트리거보다 좁아지지 않되 maxWidth와 뷰포트를 넘지 않는다.
      const available = window.innerWidth - VIEWPORT_MARGIN * 2
      const width = Math.min(Math.max(rect.width, maxWidth), available)

      // 좌측 정렬을 기본으로 하되 우측 뷰포트를 넘으면 안쪽으로 끌어당긴다.
      const rightBound = window.innerWidth - VIEWPORT_MARGIN - width
      const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, rightBound))

      const top = rect.bottom + gap
      const next: AnchoredPosition = {
        top,
        left,
        minWidth: rect.width,
        maxHeight: Math.max(
          MIN_USABLE_HEIGHT,
          window.innerHeight - top - VIEWPORT_MARGIN,
        ),
      }
      // 좌표가 그대로면 새 객체를 만들지 않는다 — 스크롤 한 번에 팝오버 전체가
      // 다시 그려지던 원인(검토 INT-15/PERF-8).
      setPosition((previous) =>
        isSamePosition(previous, next) ? previous : next,
      )
    }

    /**
     * 스크롤·리사이즈는 한 프레임에 여러 번 들어온다(캡처 단계라 조상 스크롤러 수만큼
     * 더 온다). rAF로 코얼레스해 프레임당 `getBoundingClientRect` 1회로 묶는다 —
     * rect 읽기는 강제 레이아웃을 유발하므로 횟수 자체가 비용이다.
     */
    let frameId = 0
    const schedule = () => {
      if (frameId !== 0) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        recompute()
      })
    }

    // 최초 1회는 동기 — 첫 페인트 전에 좌표가 있어야 팝오버가 (0,0)에서 튀지 않는다.
    recompute()
    // passive — 이 리스너는 스크롤을 막지 않으므로 브라우저에게 그 사실을 알린다.
    window.addEventListener('resize', schedule, { passive: true })
    // 캡처 단계 구독 — 툴바 가로 스크롤·본문 스크롤 등 *조상* 스크롤도 잡아야
    // 트리거가 움직였을 때 팝오버가 떨어져 나가지 않는다.
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [anchorRef, open, gap, maxWidth])

  return position
}
