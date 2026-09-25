import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import styled from 'styled-components'

interface NavEntry {
  label: string
  element: HTMLElement
}

export interface SectionNavProps {
  /** 장(章)을 찾을 대시보드 뿌리 */
  rootRef: RefObject<HTMLElement | null>
}

/** 스크롤 위치를 판정할 때 목차 아래로 더 내려다보는 여유 — 장 머리가 이만큼 들어오면 '지금 장' */
const ACTIVE_OFFSET_PX = 96

/** 목차를 싣고 스크롤되는 칼럼 — 창이 아니라 오른쪽 콘텐츠 칼럼이다 */
function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null
  while (current) {
    const { overflowY } = getComputedStyle(current)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }
  return document.scrollingElement as HTMLElement | null
}

/**
 * 대시보드 목차 — 장 머리를 한 줄에 세우고 스크롤을 따라 지금 장을 표시한다.
 *
 * 대시보드는 규모·계보부터 교역·최근 활동까지 열 개 넘는 장이 한 칼럼으로 이어져
 * 세로로 5,000px가 넘는다. 교역을 보려면 빈 차트 네 개를 지나 끝까지 내려가야 했고,
 * 지금 어느 장에 있는지도 장 머리가 화면 밖으로 나가면 알 길이 없었다.
 *
 * 목록은 **지면에서 읽어 온다** — 장마다 `<section>` + `<h2>`(SectionTitleText)를 쓰므로
 * 그것을 모은다. 목차에 장 목록을 따로 적어 두면 패널이 조건부로 빠지거나 순서가
 * 바뀔 때 목차만 어긋난다(판단이 두 곳에 있으면 어긋난다). 패널이 늦게 그려져도
 * MutationObserver가 다시 모은다.
 */
export function SectionNav({ rootRef }: SectionNavProps) {
  const [entries, setEntries] = useState<NavEntry[]>([])
  /* 지금 장 — 둘 이상일 수 있다(최근 활동·더 채울 것처럼 한 줄에 나란한 장) */
  const [activeIndices, setActiveIndices] = useState<number[]>([0])
  const navRef = useRef<HTMLElement | null>(null)

  /* 장 수집 — 뿌리의 자식 장, 그리고 한 겹 묶인 장(최근 활동·더 채울 것 줄)까지.
     장 안의 장(행정부 안의 내각)은 목차에 올리지 않는다 */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frame = 0
    const collect = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const sections = Array.from(
          root.querySelectorAll<HTMLElement>(
            ':scope > section, :scope > :not(section) > section',
          ),
        )
        const next: NavEntry[] = []
        for (const section of sections) {
          const heading = section.querySelector('h2')
          const label = heading?.textContent?.trim()
          if (label) next.push({ label, element: section })
        }
        setEntries((previous) =>
          previous.length === next.length &&
          previous.every(
            (entry, index) =>
              entry.label === next[index].label &&
              entry.element === next[index].element,
          )
            ? previous
            : next,
        )
      })
    }

    collect()
    const observer = new MutationObserver(collect)
    observer.observe(root, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [rootRef])

  /* 지금 장 — 목차 바로 아래 선을 넘어간 마지막 장. 스크롤 컨테이너가 창이 아니라
     오른쪽 칼럼이라 캡처 단계에서 모든 스크롤을 듣는다 */
  useEffect(() => {
    if (entries.length === 0) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 0
        const line = navBottom + ACTIVE_OFFSET_PX
        const tops = entries.map(
          (entry) => entry.element.getBoundingClientRect().top,
        )
        let currentTop = tops[0]
        for (const top of tops) {
          if (top <= line) currentTop = top
        }
        /* 끝까지 내렸으면 마지막 줄 — 짧은 끝 장은 선까지 올라오지 못해 영영 안 켜진다 */
        const scroller = findScrollParent(navRef.current)
        if (
          scroller &&
          scroller.scrollTop > 0 &&
          scroller.scrollTop + scroller.clientHeight >=
            scroller.scrollHeight - 2
        ) {
          currentTop = tops[tops.length - 1]
        }
        /* 같은 높이에서 시작하는 장은 좌우로 나란한 한 줄이다 — 함께 켠다 */
        const next = tops.flatMap((top, index) =>
          Math.abs(top - currentTop) < 2 ? [index] : [],
        )
        setActiveIndices((previous) =>
          previous.join() === next.join() ? previous : next,
        )
      })
    }
    update()
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      cancelAnimationFrame(frame)
    }
  }, [entries])

  /* 지금 장 버튼이 목차 가로 스크롤 밖에 있으면 끌어온다 */
  const firstActive = activeIndices[0] ?? 0
  useEffect(() => {
    const nav = navRef.current
    const button = nav?.querySelector<HTMLElement>(
      `[data-nav-index="${firstActive}"]`,
    )
    const track = button?.parentElement
    if (!button || !track) return
    const left = button.offsetLeft
    const right = left + button.offsetWidth
    if (
      left < track.scrollLeft ||
      right > track.scrollLeft + track.clientWidth
    ) {
      track.scrollTo({ left: left - 16, behavior: 'smooth' })
    }
  }, [firstActive])

  const jump = useCallback((element: HTMLElement) => {
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    element.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  /* 장이 셋도 안 되면 목차가 오히려 군더더기다 */
  if (entries.length < 3) return null

  return (
    <Bar ref={navRef} aria-label="대시보드 목차">
      <Track>
        {entries.map((entry, index) => {
          const isActive = activeIndices.includes(index)
          return (
            <Item
              key={`${entry.label}-${index}`}
              type="button"
              data-nav-index={index}
              $active={isActive}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => jump(entry.element)}
            >
              {entry.label}
            </Item>
          )
        })}
      </Track>
    </Bar>
  )
}

/**
 * 뿌리의 좌우 여백까지 밀어 붙여 칼럼 폭 전체를 덮는다 — 안 그러면 스크롤되는 본문이
 * 목차 양옆 여백으로 비쳐 보인다. 여백 값은 DashboardRoot의 반응형 여백과 같아야 한다.
 */
const Bar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 -40px;
  padding: 10px 40px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(23, 23, 23, 0.86)'
      : 'rgba(255, 255, 255, 0.88)'};
  backdrop-filter: saturate(160%) blur(12px);
  -webkit-backdrop-filter: saturate(160%) blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 1024px) {
    margin: 0 -28px;
    padding: 10px 28px;
  }
  @media (max-width: 768px) {
    margin: 0 -20px;
    padding: 8px 20px;
  }
  @media (max-width: 480px) {
    margin: 0 -16px;
    padding: 8px 16px;
  }
`

const Track = styled.div`
  position: relative;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const Item = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  padding: 6px 12px;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.07)'
      : 'transparent'};
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`
