/**
 * 국가/역사/인물 등록 — SidebarHeader action 슬롯에서 호출.
 * 사건 페이지 EventActionsMenu와 동일한 플랫 헤어라인 드롭다운 + Feather 선형 아이콘.
 */
import React, { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiCompass, FiGlobe, FiPlus, FiUserPlus } from 'react-icons/fi'
import styled from 'styled-components'

import {
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
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
        aria-haspopup="true"
        aria-expanded={open}
        title="등록"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <FiPlus size={16} aria-hidden />
      </Trigger>
      <AnimatePresence>
        {open && (
          <Menu
            as={motion.div}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            <Item type="button" onClick={select(onAddModern)}>
              <ItemIcon>
                <FiGlobe aria-hidden />
              </ItemIcon>
              <ItemText>
                <ItemLabel>현대 국가</ItemLabel>
                <ItemDesc>ISO·대륙·수도</ItemDesc>
              </ItemText>
            </Item>
            <Item type="button" onClick={select(onAddHistorical)}>
              <ItemIcon>
                <FiCompass aria-hidden />
              </ItemIcon>
              <ItemText>
                <ItemLabel>역사 국가</ItemLabel>
                <ItemDesc>제국·왕국·정권·시대</ItemDesc>
              </ItemText>
            </Item>
            <Item type="button" onClick={select(onAddPerson)}>
              <ItemIcon>
                <FiUserPlus aria-hidden />
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
  appearance: none;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: ${RADIUS.SM};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease,
    color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &[aria-expanded='true'] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  min-width: 196px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 24px rgba(0, 0, 0, 0.55)'
      : '0 8px 24px rgba(15, 23, 42, 0.1)'};
  padding: 4px;
  z-index: ${Z_INDEX.DROPDOWN};
`

const Item = styled.button`
  appearance: none;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 4px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background ${MOTION.fast} ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    outline: none;
  }
`

const ItemIcon = styled.span`
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;

  > svg {
    width: 15px;
    height: 15px;
  }
`

const ItemText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const ItemLabel = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ItemDesc = styled.span`
  font-size: 11px;
  color: ${metaText};
`
