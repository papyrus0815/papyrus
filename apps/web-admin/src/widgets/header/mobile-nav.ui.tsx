/**
 * 모바일 내비게이션 위젯 — 햄버거 버튼 + 전체 메뉴 모달.
 * 데스크톱 중앙 내비(TopNavBar)와 동일한 항목을 모바일에서 모달로 제공한다.
 */
import { useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { FiMenu, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import { useMediaQuery } from '@/shared/hooks/use-media-query.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

import {
  MobileCloseButton,
  MOBILE_QUERY,
  MODAL_MOTION,
  ModalHeader,
  ModalTitle,
  OVERLAY_MOTION,
} from './header-shared.ui'
import type { TopNavItemSpec } from './top-nav.ui'

interface MobileNavProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  items: TopNavItemSpec[]
  playClickSound: () => void
}

export function MobileNav({
  isOpen,
  onOpen,
  onClose,
  items,
  playClickSound,
}: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const active = isOpen && isMobile
  useBodyScrollLock(active)
  useFocusTrap(panelRef, active)

  return (
    <>
      <MobileMenuButton
        onClick={() => {
          playClickSound()
          onOpen()
        }}
        aria-label="메뉴 열기"
      >
        <FiMenu size={20} />
      </MobileMenuButton>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <MobileOverlay {...OVERLAY_MOTION} onClick={onClose} />
              <MobileMenuModal ref={panelRef} {...MODAL_MOTION}>
                <ModalHeader>
                  <ModalTitle>메뉴</ModalTitle>
                  <MobileCloseButton
                    onClick={() => {
                      playClickSound()
                      onClose()
                    }}
                    aria-label="메뉴 닫기"
                  >
                    <FiX size={24} />
                  </MobileCloseButton>
                </ModalHeader>
                <MobileMenuContent>
                  {items.map((item) => (
                    <MobileNavItem
                      key={item.key}
                      $active={item.active}
                      onClick={() => {
                        playClickSound()
                        item.onClick?.()
                        onClose()
                      }}
                    >
                      <MobileNavIcon>{item.icon}</MobileNavIcon>
                      <MobileNavLabel>{item.label}</MobileNavLabel>
                    </MobileNavItem>
                  ))}
                </MobileMenuContent>
              </MobileMenuModal>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.96);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`

const MobileOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.shadow.lg};
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  backdrop-filter: blur(2px);
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`

const MobileMenuModal = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 92%;
    max-width: 420px;
    max-height: 65vh;
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 24px;
    box-shadow: 0 24px 64px ${({ theme }) => theme.colors.shadow.lg};
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

const MobileMenuContent = styled.div`
  flex: 1;
  padding: 8px 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.primary};

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const MobileNavItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  margin-bottom: 6px;
  border: none;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.active : theme.colors.text.primary};
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    border-radius: 0 2px 2px 0;
    background: ${({ theme }) => theme.colors.primary};
    opacity: ${({ $active }) => ($active ? '1' : '0')};
    transition: opacity 0.2s ease;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.99);
  }
`

const MobileNavIcon = styled.span`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.85;
  transition: all 0.2s ease;

  ${MobileNavItem}:hover & {
    opacity: 1;
    transform: scale(1.05);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const MobileNavLabel = styled.span`
  font-size: 15px;
  font-weight: inherit;
  color: inherit;
  line-height: 1.5;
  flex: 1;
  letter-spacing: -0.01em;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`
