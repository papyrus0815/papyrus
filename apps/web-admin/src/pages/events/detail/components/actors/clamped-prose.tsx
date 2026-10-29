import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

import { MoreToggle, ProseClamp } from './actors.styles'

/**
 * 긴 산문을 2줄에서 접는다. 넘칠 때만 '더 보기'를 단다(짧은 글엔 흔적 없음).
 * 편집 중(focus-within)엔 CSS가 접힘을 풀어 textarea가 잘리지 않게 한다.
 */
export function ClampedProse({
  children,
  measureKey,
}: {
  children: ReactNode
  /** 값이 바뀌면 넘침을 다시 잰다 — 접힌 상자는 크기가 그대로라 관찰자가 못 잡는다. */
  measureKey: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box || expanded) return
    /*
     * 반 줄 미만 넘침은 넘침이 아니다 — 인라인 키트의 inline-flex 호스트가 1~2px를
     * 더 먹어, 딱 2줄인 글에도 '더 보기'가 붙고 마지막 줄이 흐려졌다(실측 +1.5px).
     */
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(box).lineHeight) || 20
      setOverflowing(box.scrollHeight - box.clientHeight > lineHeight / 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [expanded, measureKey])

  const collapsed = !expanded
  return (
    <>
      <ProseClamp
        ref={boxRef}
        $collapsed={collapsed}
        $faded={collapsed && overflowing}
      >
        {children}
      </ProseClamp>
      {(overflowing || expanded) && (
        <MoreToggle
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '접기' : '더 보기'}
        </MoreToggle>
      )}
    </>
  )
}
