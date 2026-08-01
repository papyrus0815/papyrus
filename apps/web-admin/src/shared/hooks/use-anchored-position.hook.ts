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
      setPosition({
        top,
        left,
        minWidth: rect.width,
        maxHeight: Math.max(
          MIN_USABLE_HEIGHT,
          window.innerHeight - top - VIEWPORT_MARGIN,
        ),
      })
    }

    recompute()
    window.addEventListener('resize', recompute)
    // 캡처 단계 구독 — 툴바 가로 스크롤·본문 스크롤 등 *조상* 스크롤도 잡아야
    // 트리거가 움직였을 때 팝오버가 떨어져 나가지 않는다.
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [anchorRef, open, gap, maxWidth])

  return position
}
