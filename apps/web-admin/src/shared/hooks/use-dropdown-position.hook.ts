import { type RefObject, useLayoutEffect, useState } from 'react'

const GAP = 6
const VIEWPORT_MARGIN = 8

export interface DropdownPosition {
  top: number
  left: number
}

/**
 * 기준 요소(칸) 바로 아래에 붙는 드롭다운 좌표 — 피커 모달을 '칸 아래 드롭다운'으로 쓸 때.
 *
 * - 아래 공간이 모자라면 위로 뒤집는다(패널 높이는 그린 뒤 containerRef로 잰다 —
 *   첫 측정 전엔 null이라 호출부가 visibility로 숨겨 한 번 그려 높이를 얻는다).
 * - 좌우는 화면 안으로 끌어들인다.
 * - 모달 본문처럼 **안쪽 스크롤러**가 움직여도 칸을 따라간다(scroll은 버블되지 않아 capture).
 *
 * anchorEl이 없으면 null — 호출부는 예전처럼 가운데 모달로 그린다.
 */
export function useDropdownPosition(
  isOpen: boolean,
  anchorEl: HTMLElement | null | undefined,
  containerRef: RefObject<HTMLElement | null>,
  width: number,
): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !anchorEl) {
      setPosition(null)
      return
    }
    const place = () => {
      const rect = anchorEl.getBoundingClientRect()
      const height = containerRef.current?.offsetHeight ?? 0
      const below = rect.bottom + GAP
      const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN
      const top = fitsBelow
        ? below
        : Math.max(VIEWPORT_MARGIN, rect.top - GAP - height)
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left),
        window.innerWidth - width - VIEWPORT_MARGIN,
      )
      setPosition({ top, left })
    }
    place()
    // 첫 배치 땐 패널 높이가 0일 수 있다 — 그려진 다음 프레임에 한 번 더(위로 뒤집기 판정)
    const frame = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [isOpen, anchorEl, containerRef, width])

  return position
}
