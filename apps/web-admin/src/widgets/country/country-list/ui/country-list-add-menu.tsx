/**
 * 국가/역사/인물 등록 — SidebarHeader action 슬롯에서 호출.
 *
 * 이전엔 + 버튼 클릭 → 풀스크린 모달이었으나, 클릭 한 번에 옵션 3개만 보여주는
 * inline dropdown으로 단순화 (다른 필터들과 일관성).
 */
import React, { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FaGlobeAsia, FaLandmark, FaUserPlus } from 'react-icons/fa'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

interface CountryListAddMenuProps {
  onAddModern: () => void
  onAddHistorical: () => void
  onAddPerson: () => void
}

export function CountryListAddMenu({
  onAddModern,
  onAddHistorical,
  onAddPerson,
}: CountryListAddMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (fn: () => void) => () => {
    fn()
    setOpen(false)
  }

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        type="button"
        aria-label="등록"
        aria-haspopup="menu"
        aria-expanded={open}
        title="등록"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
            fill="currentColor"
          />
        </svg>
      </Trigger>
      <AnimatePresence>
        {open && (
          <Menu
            as={motion.div}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            role="menu"
          >
            <Item type="button" role="menuitem" onClick={select(onAddModern)}>
              <ItemIcon>
                <FaGlobeAsia />
              </ItemIcon>
              <ItemText>
                <ItemLabel>현대 국가</ItemLabel>
                <ItemDesc>ISO·대륙·수도</ItemDesc>
              </ItemText>
            </Item>
            <Item
              type="button"
              role="menuitem"
              onClick={select(onAddHistorical)}
            >
              <ItemIcon>
                <FaLandmark />
              </ItemIcon>
              <ItemText>
                <ItemLabel>역사 국가</ItemLabel>
                <ItemDesc>제국·왕국·정권·시대</ItemDesc>
              </ItemText>
            </Item>
            <Item type="button" role="menuitem" onClick={select(onAddPerson)}>
              <ItemIcon>
                <FaUserPlus />
              </ItemIcon>
              <ItemText>
                <ItemLabel>인물</ItemLabel>
                <ItemDesc>역사적 인물</ItemDesc>
              </ItemText>
            </Item>
          </Menu>
        )}
      </AnimatePresence>
    </Wrap>
  )
}

const Wrap = styled.div`
  position: relative;
  display: inline-flex;
`

const Trigger = styled.button`
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &[aria-expanded='true'] {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
  }
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 200px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  box-shadow: 0 8px 24px ${({ theme }) => theme.colors.shadow.md};
  padding: 4px;
  z-index: ${Z_INDEX.DROPDOWN};
  transform-origin: top right;
`

const Item = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 6px;
  cursor: pointer;
  text-align: left;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.hover};
    outline: none;
  }
`

const ItemIcon = styled.span`
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;

  > svg {
    width: 18px;
    height: 18px;
  }
`

const ItemText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const ItemLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ItemDesc = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
