import { type RefObject, useEffect, useState } from 'react'

import styled from 'styled-components'

interface ReadingProgressProps {
  /** 진행률을 측정할 내부 스크롤 컨테이너(=S.Page). 윈도우가 아닌 내부 스크롤. */
  targetRef: RefObject<HTMLElement | null>
  /** 진행 바 색 — 사건 카테고리 톤. */
  color: string
}

/**
 * 읽기 진행률 바 — 상세 페이지 상단에 얇게 고정. 사건이 길어질수록(전쟁 등 모듈
 * 다수) "얼마나 읽었나" 감을 준다. Page가 내부 스크롤 컨테이너라 window가 아닌
 * 그 엘리먼트의 scrollTop/scrollHeight로 계산하고, rAF로 스크롤 핸들러를 코얼레스.
 */
export function ReadingProgress({ targetRef, color }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return undefined

    let raf = 0
    const measure = () => {
      raf = 0
      const max = el.scrollHeight - el.clientHeight
      setProgress(max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [targetRef])

  return (
    <Track aria-hidden>
      <Fill style={{ transform: `scaleX(${progress})`, background: color }} />
    </Track>
  )
}

const Track = styled.div`
  position: sticky;
  top: 0;
  z-index: 6;
  width: 100%;
  height: 2.5px;
  background: transparent;
  pointer-events: none;
`

const Fill = styled.div`
  width: 100%;
  height: 100%;
  transform-origin: left center;
  border-radius: 0 2px 2px 0;
  /* scaleX는 인라인 style로 매 프레임 갱신 — transition은 미세한 지연만. */
  transition: transform 0.08s linear;
`
