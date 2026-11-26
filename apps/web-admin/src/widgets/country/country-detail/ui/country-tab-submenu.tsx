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
 * - 마우스: 머물면 열고(180ms — 탭 줄을 가로질러 본문으로 가는 길엔 안 뜨게), 탭·메뉴 밖으로 나가면 닫는다
 *   (180ms 유예 — 탭에서 메뉴로 옮겨 가는 틈).
 *   메뉴는 한 번에 하나 — 하나가 열린 채 옆 탭으로 옮기면 앞 메뉴는 바로 닫고 새 메뉴는 기다림 없이 연다
 *   (메뉴 막대처럼. 예전엔 두 메뉴가 약 0.1초 겹쳐 보였다).
 * - 누르기: 다른 탭이면 그 탭(기본 구역)으로 가면서 메뉴가 열린다. 지금 있는 탭이면 이동 없이 메뉴만 연다 —
 *   예전엔 '정체·헌정'을 보다 메뉴를 열려고 '정부·행정'을 누르면 행정부·내각으로 튕겼다(터치는 누르기가 유일한 길).
 * - 정부·행정 메뉴 아래칸엔 도구(관직 사전·직능 분류·전 국가 허브) — 본문의 「행정부·내각 19 … ⋯」 제목 줄을
 *   자리만 차지한다고 뺐을 때 ⋯가 맡던 것들. 사전·분류는 ?tool=로 정부·행정 지면이 열고, 보던 구역(sub)은 그대로 둔다.
 * - 2차 메뉴가 있는 탭엔 글자 옆에 흐린 ▾ — 14개 탭 중 어느 것에 메뉴가 있는지 겉으로 보이게.
 * - 키보드: 탭에서 ↓로 열고 ↑↓로 이동, Enter로 이동, Esc로 닫고 탭으로 돌아간다.
 * - 2차 구역이 URL로 열리는 탭만 등록한다 — 정부·행정·군사·경제·통계(?sub=), 정당·선거(?subtab=),
 *   지리·행정구역(?region_view=). 인물·과거국가의 알약은 구역이 아니라 '보기 방식'이라 넣지 않는다.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { FiAward, FiCheck, FiChevronDown, FiGlobe, FiGrid } from 'react-icons/fi'
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

/** 구역이 아닌 도구 — 메뉴 아래칸, 구분선 밑 */
interface SubmenuTool {
  key: string
  label: string
  icon: React.ReactNode
  /** 갈 곳 — 지금 이 탭에 있으면(active) 보던 쿼리를 살려 덧붙인다 */
  buildUrl: (context: { countryId: string; active: boolean; search: string; currentValue: string | null }) => string
  navigateState?: unknown
}

interface SubmenuSpec {
  param: string
  buildPath: (countryId: string) => string
  items: SubmenuItem[]
  /** 쿼리가 없을 때 지금 구역으로 칠 값 — 기본 구역도 쿼리 값으로 여는 탭(경제·통계)용 */
  defaultValue?: string
  /** 쿼리 말고 경로로 구역이 정해지는 경우(정당 상세 /elections/party/:id = 정당) */
  valueFromPath?: (pathname: string) => string | null
  tools?: SubmenuTool[]
}

/** 정부·행정 지면이 ?tool=로 여는 도구 — 이 탭에 있으면 보던 구역(sub 등)을 살린 채 tool만 덧붙인다 */
function govToolUrl(tool: 'positions' | 'categories') {
  return ({ countryId, active, search }: { countryId: string; active: boolean; search: string }) => {
    const params = new URLSearchParams(active ? search : '')
    params.set('tool', tool)
    return `${pathKeys.countryGovernment(countryId)}?${params.toString()}`
  }
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
    tools: [
      { key: 'positions', label: '고유 관직 · 직제 사전', icon: <FiAward size={13} />, buildUrl: govToolUrl('positions') },
      { key: 'categories', label: '전역 직능 분류 관리', icon: <FiGrid size={13} />, buildUrl: govToolUrl('categories') },
      {
        key: 'global-hub',
        label: '전 국가 정부·내각 허브 ↗',
        icon: <FiGlobe size={13} />,
        buildUrl: ({ currentValue }) =>
          pathKeys.government.list({ tab: currentValue === 'ministries' ? 'departments' : 'cabinets' }),
        navigateState: { skipGovernmentMemoryRestore: true },
      },
    ],
  },
  military: {
    param: 'sub',
    buildPath: (countryId) => pathKeys.countryMilitary(countryId),
    items: [
      { value: null, label: '편제 · 사령부', hint: '최고사령부·참모본부·야전군·사단·함대 등 지휘 계통' },
      { value: 'wars', label: '전쟁 · 참전사', hint: '이 나라가 치른 전쟁과 참전 기록' },
    ],
  },
  elections: {
    param: 'subtab',
    buildPath: (countryId) => pathKeys.countryElections(countryId),
    valueFromPath: (pathname) => (/\/elections\/party\//.test(pathname) ? 'parties' : null),
    items: [
      { value: 'parties', label: '정당', hint: '이 나라의 정당과 그 계보' },
      { value: null, label: '선거', hint: '역대 선거와 투표 결과' },
    ],
  },
  regions: {
    param: 'region_view',
    buildPath: (countryId) => pathKeys.countryRegions(countryId),
    items: [
      { value: null, label: '행정구역', hint: '행정구역 계층 편제와 시기별 개편 체계' },
      { value: 'nature', label: '자연 지리', hint: '산·강·호수 등 자연 지형' },
      { value: 'infrastructure', label: '인프라', hint: '철도·항만·발전소 등 국가 기간시설' },
    ],
  },
  statistics: {
    param: 'sub',
    buildPath: (countryId) => pathKeys.countryStatistics(countryId),
    /* 통계 지면은 쿼리가 사라질 때 구역을 되돌리지 않는다 — 기본 구역도 값으로 열어야 같은 지면에서 돌아온다 */
    defaultValue: 'indicators',
    items: [
      { value: 'indicators', label: '거시·발전 지표', hint: '경제·인구·발전 핵심 지표와 연도별 추이' },
      { value: 'pyramid', label: '인구 피라미드', hint: '연도별 연령대 × 성별 인구 구조' },
      { value: 'bonds', label: '국채 금리', hint: '연도·만기별 수익률 곡선과 장단기 스프레드' },
      { value: 'records', label: '국가 연혁 메모', hint: '연도별 주요 정책·경제·사회 기록 노트' },
    ],
  },
}

const OPEN_DELAY_MS = 180
const CLOSE_DELAY_MS = 180

/**
 * 지금 열린 메뉴 하나 — 탭마다 따로 그려지는 메뉴들이 '한 번에 하나'를 지키는 자리.
 * 다른 탭 메뉴가 열리면 앞 주인의 close를 불러 바로 닫는다.
 */
const openMenuSlot: { ownerId: string | null; close: (() => void) | null } = {
  ownerId: null,
  close: null,
}

function countryIdFromPath(pathname: string): string | null {
  const matched = /^\/country\/([^/]+)/.exec(pathname)
  return matched ? decodeURIComponent(matched[1]) : null
}

/** 탭 단추에 덧대는 속성 — 원래 onClick·onKeyDown은 그대로 부른다 */
interface TriggerProps {
  children?: React.ReactNode
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
  const currentValue = active
    ? (spec.valueFromPath?.(location.pathname) ??
      new URLSearchParams(location.search).get(spec.param) ??
      spec.defaultValue ??
      null)
    : undefined

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
    if (openMenuSlot.ownerId && openMenuSlot.ownerId !== menuId) openMenuSlot.close?.()
    openMenuSlot.ownerId = menuId
    openMenuSlot.close = () => {
      clearTimers()
      setOpen(false)
    }
    placeMenu()
    setOpen(true)
  }, [placeMenu, menuId])

  /* 닫히면(어느 길로든) 자리를 비운다 — 다음 탭이 '다른 메뉴가 열려 있다'고 착각해 즉시 열지 않게 */
  useEffect(() => {
    if (open) return undefined
    if (openMenuSlot.ownerId === menuId) {
      openMenuSlot.ownerId = null
      openMenuSlot.close = null
    }
    return undefined
  }, [open, menuId])

  useEffect(
    () => () => {
      if (openMenuSlot.ownerId === menuId) {
        openMenuSlot.ownerId = null
        openMenuSlot.close = null
      }
    },
    [menuId],
  )

  const scheduleOpen = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (open || openTimerRef.current != null) return
    /* 옆 탭 메뉴가 이미 열려 있으면 메뉴 막대처럼 바로 갈아탄다 */
    if (openMenuSlot.ownerId && openMenuSlot.ownerId !== menuId) {
      openNow()
      return
    }
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null
      openNow()
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

  const runTool = (tool: SubmenuTool) => {
    closeNow(false)
    if (!countryId) return
    const url = tool.buildUrl({ countryId, active, search: location.search, currentValue: currentValue ?? null })
    navigate(url, tool.navigateState ? { state: tool.navigateState } : undefined)
  }

  const tools = spec.tools ?? []
  const focusableCount = spec.items.length + tools.length

  const isItemCurrent = (item: SubmenuItem) =>
    active && (currentValue ?? null) === (item.value ?? null)

  const trigger = React.cloneElement(
    children,
    {
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      /* 닫혀 있을 땐 탭 원래의 aria-controls(탭 패널)를 덮지 않는다 */
      ...(open ? { 'aria-controls': menuId } : {}),
      onClick: (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
        /* 지금 있는 탭: 이동하면 기본 구역으로 튕기므로 메뉴만 연다(이미 열려 있으면 그대로) */
        if (!active) children.props.onClick?.(clickEvent)
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
    },
    children.props.children,
    <SubmenuCaret key="submenu-caret" size={11} aria-hidden data-open={open} />,
  )

  const handleMenuKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex((button) => button === document.activeElement)
    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault()
      closeNow(true)
    } else if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault()
      const step = keyboardEvent.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + step + focusableCount) % focusableCount
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
              {tools.length > 0 ? <MenuDivider role="separator" /> : null}
              {tools.map((tool, toolIndex) => (
                <ToolItem
                  key={tool.key}
                  ref={(element) => {
                    itemRefs.current[spec.items.length + toolIndex] = element
                  }}
                  type="button"
                  role="menuitem"
                  onClick={() => runTool(tool)}
                >
                  <span className="icon" aria-hidden>
                    {tool.icon}
                  </span>
                  <span>{tool.label}</span>
                </ToolItem>
              ))}
            </Menu>,
            document.body,
          )
        : null}
    </SubmenuAnchorSpan>
  )
}

/* 탭 단추의 gap(6px)을 조금 거둬 글자에 붙인다 — 흐리게, 열리면 뒤집힌다 */
const SubmenuCaret = styled(FiChevronDown)`
  flex-shrink: 0;
  margin-left: -3px;
  opacity: 0.45;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;

  &[data-open='true'] {
    opacity: 0.8;
    transform: rotate(180deg);
  }
`

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

const MenuDivider = styled.div`
  height: 1px;
  margin: 6px 4px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eef2f7')};
`

const ToolItem = styled.button`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px 7px 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  .icon {
    display: inline-flex;
    justify-content: center;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover,
  &:focus-visible {
    outline: none;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
  }
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
