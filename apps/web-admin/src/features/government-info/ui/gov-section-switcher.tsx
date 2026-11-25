/**
 * 정부·행정 지면의 구역 제목 겸 전환 메뉴.
 *
 *   행정부·내각 19 ▾                                        [⋯]
 *     ┌──────────────────────────────┐
 *     │ ✓ 행정부·내각            19  │  정부수반 임기별 내각 구성과 …
 *     │   중앙부처·국가기관        7  │
 *     │   정체·헌정                4  │
 *     │   통계·연혁                   │
 *     └──────────────────────────────┘
 *
 * 예전엔 알약 하위 탭 한 줄(행정부·내각 | 중앙부처 | 정체 | 통계)이 국가 탭 바로 아래 또 한 겹의 띠를 깔아
 * 행정부처럼 넓게 봐야 하는 지면이 좁고 답답해 보였다. 게다가 '여기가 어느 구역인가'를 말하는 제목이 따로
 * 없어 탭이 그 일을 대신했다. 이제 현재 구역 이름이 제목이 되고, 누르면 나머지 구역을 고른다.
 */
import React, { useEffect, useId, useRef, useState } from 'react'

import { FiCheck, FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

export interface GovSectionSwitcherItem<Key extends string> {
  key: Key
  label: string
  count?: number | null
  hint?: string
}

interface GovSectionSwitcherProps<Key extends string> {
  items: ReadonlyArray<GovSectionSwitcherItem<Key>>
  activeKey: Key
  onChange: (key: Key) => void
  /** 오른쪽 도구(⋯ 등) */
  actions?: React.ReactNode
  ariaLabel?: string
}

export function GovSectionSwitcher<Key extends string>({
  items,
  activeKey,
  onChange,
  actions,
  ariaLabel = '구역 바꾸기',
}: GovSectionSwitcherProps<Key>) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0]

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (pointerEvent: MouseEvent) => {
      if (!anchorRef.current?.contains(pointerEvent.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    const activeIndex = Math.max(
      0,
      items.findIndex((item) => item.key === activeKey),
    )
    requestAnimationFrame(() => itemRefs.current[activeIndex]?.focus({ preventScroll: true }))
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, items, activeKey])

  const closeAndReturnFocus = () => {
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  const handleMenuKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex(
      (button) => button === document.activeElement,
    )
    if (keyboardEvent.key === 'Escape') {
      keyboardEvent.preventDefault()
      keyboardEvent.stopPropagation()
      closeAndReturnFocus()
    } else if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault()
      const step = keyboardEvent.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + step + items.length) % items.length
      itemRefs.current[nextIndex]?.focus({ preventScroll: true })
    } else if (keyboardEvent.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <Row>
      <Anchor ref={anchorRef}>
        <Heading>
          <TitleButton
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={`${activeItem?.label ?? ''} — ${ariaLabel}`}
            title={activeItem?.hint}
            onClick={() => setOpen((previous) => !previous)}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === 'ArrowDown' && !open) {
                keyboardEvent.preventDefault()
                setOpen(true)
              }
            }}
          >
            <span className="label">{activeItem?.label}</span>
            {activeItem?.count != null && activeItem.count > 0 ? (
              <span className="count">{activeItem.count.toLocaleString('ko-KR')}</span>
            ) : null}
            <FiChevronDown className="chevron" size={16} aria-hidden data-open={open} />
          </TitleButton>
        </Heading>
        {open ? (
          <Menu id={menuId} role="menu" aria-label={ariaLabel} onKeyDown={handleMenuKeyDown}>
            {items.map((item, itemIndex) => {
              const isActive = item.key === activeKey
              return (
                <MenuItem
                  key={item.key}
                  ref={(element) => {
                    itemRefs.current[itemIndex] = element
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  $active={isActive}
                  onClick={() => {
                    setOpen(false)
                    if (!isActive) onChange(item.key)
                    triggerRef.current?.focus({ preventScroll: true })
                  }}
                >
                  <span className="check" aria-hidden>
                    {isActive ? <FiCheck size={13} /> : null}
                  </span>
                  <span className="body">
                    <span className="line">
                      <span className="item-label">{item.label}</span>
                      {item.count != null && item.count > 0 ? (
                        <span className="item-count">{item.count.toLocaleString('ko-KR')}</span>
                      ) : null}
                    </span>
                    {item.hint ? <span className="hint">{item.hint}</span> : null}
                  </span>
                </MenuItem>
              )
            })}
          </Menu>
        ) : null}
      </Anchor>
      {actions ? <Actions>{actions}</Actions> : null}
    </Row>
  )
}

/*
 * 아래 여백 — 국가 탭 줄과 이 줄 사이가 20px인데 아래 본문(구역 무대의 위 여백 16px 포함)까지는 30px라
 * 줄이 위로 붙어 보였다. 4px + 16px = 위와 같은 20px.
 * 오른쪽 단추(30px)는 제목 단추(31px) 높이 가운데에 맞춘다.
 */
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 31px;
  margin: 0 0 4px;
  min-width: 0;
`

/* 줄어들지 않게 — 구역 이름은 짧고('중앙부처·국가기관'이 가장 김) 잘리면 제목 구실을 못 한다 */
const Anchor = styled.div`
  position: relative;
  flex: 0 0 auto;
`

const Heading = styled.h2`
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
`

const TitleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: -8px;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  .label {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
  .count {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .chevron {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
    transition: transform 0.15s ease;
  }
  .chevron[data-open='true'] {
    transform: rotate(180deg);
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  @media (max-width: 560px) {
    .label {
      font-size: 17px;
    }
  }
`

const Menu = styled.div`
  position: absolute;
  z-index: 40;
  top: calc(100% + 6px);
  left: -8px;
  width: min(360px, calc(100vw - 32px));
  padding: 6px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1c1f' : '#ffffff')};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 12px 32px rgba(0,0,0,0.5)'
      : '0 12px 32px rgba(15,23,42,0.14)'};
`

const MenuItem = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 6px;
  width: 100%;
  padding: 8px 10px 8px 6px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active
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
  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .item-label {
    font-size: 13.5px;
    font-weight: ${({ $active }) => ($active ? 700 : 600)};
  }
  .item-count {
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
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

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`
