/**
 * 국가 상세 머리 탭의 2차 메뉴 — 탭에 마우스를 올리거나 누르면 그 탭 안의 구역이 아래로 펼쳐진다.
 *
 *   대시보드  [정부·행정]  정당·선거  법령 …
 *            ┌──────────────────────┐
 *            │ ✓ 행정부·내각          │
 *            │   중앙부처·국가기관     │
 *            │   정체·헌정            │
 *            │   통계·연혁            │
 *            └──────────────────────┘
 *
 * - 탭 줄은 가로 스크롤(overflow-x:auto)이라 안에 두면 잘린다 → body로 포털, 탭 아래에 fixed 배치.
 * - 마우스: 올리면 열고(90ms), 탭·메뉴 밖으로 나가면 닫는다(180ms 유예 — 탭에서 메뉴로 옮겨 가는 틈).
 *   누르면 원래대로 그 탭으로 가면서 메뉴도 열린다(터치 기기는 이것이 유일한 여는 길).
 * - 키보드: 탭에서 ↓로 열고 ↑↓로 이동, Enter로 이동, Esc로 닫고 탭으로 돌아간다.
 * - 2차 구역이 URL로 열리는 탭만 등록한다(정부·행정 ?sub=, 군사 ?sub=). 통계·인물·정당은 구역이 화면 상태라
 *   URL로 바꿔도 안 따라오므로 아직 넣지 않았다.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { FiCheck } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  GOV_TAB_META,
  GOVERNMENT_TAB_ORDER,
} from '@/features/government-info/model/government-content-tab'
import { pathKeys } from '@/shared/router'
import { Z_INDEX } from '@/shared/styles/z-index'

import type { OverviewSubTab } from './overview-sub-tabs'

interface SubmenuItem {
  /** URL 쿼리 값 — null이면 쿼리 없이(그 탭의 기본 구역) */
  value: string | null
  label: string
  hint?: string
}

interface SubmenuSpec {
  param: string
  buildPath: (countryId: string) => string
  items: SubmenuItem[]
}

const COUNTRY_TAB_SUBMENUS: Partial<Record<OverviewSubTab, SubmenuSpec>> = {
  government: {
    param: 'sub',
    buildPath: (countryId) => pathKeys.countryGovernment(countryId),
    items: GOVERNMENT_TAB_ORDER.map((tabKey) => ({
      /* 행정부·내각이 기본 구역 — 정부·행정 지면이 이 구역일 때 sub를 지운다(switchSubTab과 같은 규약) */
      value: tabKey === 'cabinets' ? null : tabKey,
      label: GOV_TAB_META[tabKey].label,
      hint: GOV_TAB_META[tabKey].hint,
    })),
  },
  military: {
    param: 'sub',
    buildPath: (countryId) => pathKeys.countryMilitary(countryId),
    items: [
      { value: null, label: '편제 · 사령부', hint: '최고사령부·참모본부·야전군·사단·함대 등 지휘 계통' },
      { value: 'wars', label: '전쟁 · 참전사', hint: '이 나라가 치른 전쟁과 참전 기록' },
    ],
  },
}

const OPEN_DELAY_MS = 90
const CLOSE_DELAY_MS = 180

function countryIdFromPath(pathname: string): string | null {
  const matched = /^\/country\/([^/]+)/.exec(pathname)
  return matched ? decodeURIComponent(matched[1]) : null
}

/** 탭 단추에 덧대는 속성 — 원래 onClick·onKeyDown은 그대로 부른다 */
interface TriggerProps {
  onClick?: (clickEvent: React.MouseEvent<HTMLButtonElement>) => void
  onKeyDown?: (keyboardEvent: React.KeyboardEvent<HTMLButtonElement>) => void
  'aria-haspopup'?: 'menu'
  'aria-expanded'?: boolean
  'aria-controls'?: string
}

interface CountryTabSubmenuProps {
  tabKey: OverviewSubTab
  active: boolean
  /** 탭 단추 하나(UnderlineTabButton) */
  children: React.ReactElement<TriggerProps>
}

export function CountryTabSubmenu({ tabKey, active, children }: CountryTabSubmenuProps) {
  const spec = COUNTRY_TAB_SUBMENUS[tabKey]
  if (!spec) return children
  return (
    <SubmenuAnchor spec={spec} active={active}>
      {children}
    </SubmenuAnchor>
  )
}

function SubmenuAnchor({
  spec,
  active,
  children,
}: {
  spec: SubmenuSpec
  active: boolean
  children: React.ReactElement<TriggerProps>
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const menuId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const countryId = countryIdFromPath(location.pathname)
  const currentValue = active ? new URLSearchParams(location.search).get(spec.param) : undefined

  const clearTimers = () => {
    if (openTimerRef.current != null) window.clearTimeout(openTimerRef.current)
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current)
    openTimerRef.current = null
    closeTimerRef.current = null
  }

  const placeMenu = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const menuWidth = 280
    const left = Math.min(Math.max(8, rect.left - 4), window.innerWidth - menuWidth - 8)
    setPosition({ top: rect.bottom + 4, left })
  }, [])

  const openNow = useCallback(() => {
    clearTimers()
    placeMenu()
    setOpen(true)
  }, [placeMenu])

  const scheduleOpen = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (open || openTimerRef.current != null) return
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null
      placeMenu()
      setOpen(true)
    }, OPEN_DELAY_MS)
  }

  const scheduleClose = () => {
    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current != null) return
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setOpen(false)
    }, CLOSE_DELAY_MS)
  }

  const closeNow = (returnFocus: boolean) => {
    clearTimers()
    setOpen(false)
    if (returnFocus) {
      anchorRef.current?.querySelector('button')?.focus({ preventScroll: true })
    }
  }

  useEffect(() => () => clearTimers(), [])

  /*
   * 열려 있는 동안: 탭이 실제로 움직였을 때(지면 스크롤 등)만 닫고, 창 크기가 바뀌거나 바깥을 누르면 닫는다.
   * 아무 스크롤에나 닫으면 지면 안의 다른 스크롤(지도·캐러셀)에도 메뉴가 바로 사라졌다.
   */
  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    const startTop = anchorRef.current?.getBoundingClientRect().top ?? 0
    const closeIfAnchorMoved = () => {
      const nowTop = anchorRef.current?.getBoundingClientRect().top ?? startTop
      if (Math.abs(nowTop - startTop) > 2) setOpen(false)
    }
    const handlePointerDown = (pointerEvent: MouseEvent) => {
      const target = pointerEvent.target as Node
      if (anchorRef.current?.contains(target)) return
      if ((target as HTMLElement).closest?.(`[data-country-tab-submenu="${menuId}"]`)) return
      setOpen(false)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', closeIfAnchorMoved, true)
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', closeIfAnchorMoved, true)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open, menuId])

  const goTo = (item: SubmenuItem) => {
    closeNow(false)
    if (!countryId) return
    const query = item.value ? `?${spec.param}=${encodeURIComponent(item.value)}` : ''
    navigate(`${spec.buildPath(countryId)}${query}`)
  }

  const isItemCurrent = (item: SubmenuItem) =>
    active && (currentValue ?? null) === (item.value ?? null)

  const trigger = React.cloneElement(children, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    /* 닫혀 있을 땐 탭 원래의 aria-controls(탭 패널)를 덮지 않는다 */
    ...(open ? { 'aria-controls': menuId } : {}),
    onClick: (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
      children.props.onClick?.(clickEvent)
      openNow()
    },
    onKeyDown: (keyboardEvent: React.KeyboardEvent<HTMLButtonElement>) => {
      children.props.onKeyDown?.(keyboardEvent)
      if (keyboardEvent.key === 'ArrowDown') {
        keyboardEvent.preventDefault()
        keyboardEvent.stopPropagation()
        openNow()
        const currentIndex = Math.max(0, spec.items.findIndex(isItemCurrent))
        requestAnimationFrame(() => itemRefs.current[currentIndex]?.focus({ preventScroll: true }))
      } else if (keyboardEvent.key === 'Escape' && open) {
        keyboardEvent.preventDefault()
        closeNow(true)
      }
    },
  })

  const handleMenuKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex((button) => button === document.activeElement)
    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault()
      closeNow(true)
    } else if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault()
      const step = keyboardEvent.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + step + spec.items.length) % spec.items.length
      itemRefs.current[nextIndex]?.focus({ preventScroll: true })
    } else if (keyboardEvent.key === 'Tab') {
      closeNow(false)
    }
  }

  return (
    <SubmenuAnchorSpan ref={anchorRef} onMouseEnter={scheduleOpen} onMouseLeave={scheduleClose}>
      {trigger}
      {open && position && typeof document !== 'undefined'
        ? createPortal(
            <Menu
              id={menuId}
              role="menu"
              data-country-tab-submenu={menuId}
              style={{ top: position.top, left: position.left }}
              onMouseEnter={scheduleOpen}
              onMouseLeave={scheduleClose}
              onKeyDown={handleMenuKeyDown}
            >
              {spec.items.map((item, itemIndex) => {
                const isCurrent = isItemCurrent(item)
                return (
                  <MenuItem
                    key={item.value ?? '__default__'}
                    ref={(element) => {
                      itemRefs.current[itemIndex] = element
                    }}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isCurrent}
                    $current={isCurrent}
                    onClick={() => goTo(item)}
                  >
                    <span className="check" aria-hidden>
                      {isCurrent ? <FiCheck size={13} /> : null}
                    </span>
                    <span className="body">
                      <span className="label">{item.label}</span>
                      {item.hint ? <span className="hint">{item.hint}</span> : null}
                    </span>
                  </MenuItem>
                )
              })}
            </Menu>,
            document.body,
          )
        : null}
    </SubmenuAnchorSpan>
  )
}

const SubmenuAnchorSpan = styled.span`
  display: inline-flex;
  align-items: stretch;
  flex-shrink: 0;
`

const Menu = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.ACTION_MENU};
  width: 280px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1c1f' : '#ffffff')};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 32px rgba(15,23,42,0.14)'};
`

const MenuItem = styled.button<{ $current: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 6px;
  width: 100%;
  padding: 8px 10px 8px 6px;
  border: none;
  border-radius: 8px;
  background: ${({ $current, theme }) =>
    $current
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.16)'
        : 'rgba(99,102,241,0.07)'
      : 'transparent'};
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  .check {
    display: inline-flex;
    padding-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .label {
    font-size: 13px;
    font-weight: ${({ $current }) => ($current ? 700 : 600)};
  }
  .hint {
    font-size: 11.5px;
    line-height: 1.45;
    color: ${({ theme }) => theme.colors.text.tertiary};
    word-break: keep-all;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
  }
`
