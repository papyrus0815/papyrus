import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX } from '@/shared/styles/z-index'

export type ActionMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  disabled?: boolean
}

export function ActionMenu({ items, disabled }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 드롭다운 위치와 방향 결정
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - buttonRect.bottom
      const menuHeight = items.length * 44 + 16 // 대략적인 메뉴 높이

      // 아래 공간이 부족하면 위쪽으로 열기
      const shouldOpenUpward =
        spaceBelow < menuHeight && buttonRect.top > menuHeight
      setOpenUpward(shouldOpenUpward)

      // fixed position 계산
      if (shouldOpenUpward) {
        setPosition({
          top: buttonRect.top - 4,
          left: buttonRect.right - 160, // 메뉴 너비(160px)를 빼서 오른쪽 정렬
        })
      } else {
        setPosition({
          top: buttonRect.bottom + 4,
          left: buttonRect.right - 160,
        })
      }
    }
  }, [isOpen, items.length])

  const handleItemClick = (item: ActionMenuItem) => {
    if (!item.disabled) {
      item.onClick()
      setIsOpen(false)
    }
  }

  return (
    <>
      <Container data-action-menu>
        <TriggerButton
          ref={buttonRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          $isOpen={isOpen}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </TriggerButton>
      </Container>

      <AnimatePresence>
        {isOpen && (
          <MenuDropdown
            ref={menuRef}
            as={motion.div}
            $openUpward={openUpward}
            $top={position.top}
            $left={position.left}
            initial={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {items.map((item) => (
              <MenuItem
                key={item.id}
                onClick={() => handleItemClick(item)}
                $variant={item.variant || 'default'}
                $disabled={item.disabled}
              >
                {item.icon && <MenuIcon>{item.icon}</MenuIcon>}
                <MenuLabel>{item.label}</MenuLabel>
              </MenuItem>
            ))}
          </MenuDropdown>
        )}
      </AnimatePresence>
    </>
  )
}

const Container = styled.div`
  display: inline-block;
`

const TriggerButton = styled.button<{ $isOpen?: boolean }>`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: ${({ $isOpen }) => ($isOpen ? '#f5f5f5' : '#fff')};
  color: #666;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f5f5f5;
    border-color: #ccc;
    color: #333;
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const MenuDropdown = styled.div<{
  $openUpward?: boolean
  $top?: number
  $left?: number
}>`
  position: fixed;
  ${({ $openUpward, $top }) =>
    $openUpward
      ? `
    bottom: ${window.innerHeight - ($top || 0)}px;
    transform-origin: bottom right;
  `
      : `
    top: ${$top || 0}px;
    transform-origin: top right;
  `}
  left: ${({ $left }) => $left || 0}px;
  min-width: 160px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 4px;
  z-index: ${Z_INDEX.DROPDOWN};
`

const MenuItem = styled.button<{
  $variant?: 'default' | 'danger'
  $disabled?: boolean
}>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $variant }) => ($variant === 'danger' ? '#dc3545' : '#333')};
  font-size: 14px;
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(220, 53, 69, 0.1)' : '#f5f5f5'};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`

const MenuIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
`

const MenuLabel = styled.span`
  flex: 1;
  font-weight: 500;
`
