/**
 * 모바일(<1024px) 전용 사이드바 시트.
 *
 * 데스크톱에서는 좌측 사이드바가 보이지만, 1024px 이하에서는 숨겨지므로
 * 우측 메인의 floating 버튼으로 호출해 우측에서 슬라이드인하는 패널.
 *
 * - createPortal로 body에 렌더 (z-index 문제 회피)
 * - backdrop 클릭 + ESC로 닫힘
 * - 데스크톱에서는 자동으로 안 보이게 (호출 측이 미디어 쿼리로 트리거 숨기는 것이 권장)
 */
import React, { useEffect, useId, useRef } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'

interface SidebarSheetProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
}

export function SidebarSheet({
  open,
  onClose,
  title,
  children,
}: SidebarSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // 포커스 트랩 + 초기 포커스 이동 + 닫을 때 트리거로 복원
  useFocusTrap(panelRef, open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <Backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <Panel
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <Header>
              <Title id={titleId}>{title ?? '필터'}</Title>
              <CloseBtn type="button" onClick={onClose} aria-label="닫기">
                <FiX size={18} />
              </CloseBtn>
            </Header>
            <Body>{children}</Body>
          </Panel>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
`

const Panel = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(380px, 92vw);
  background: ${({ theme }) => theme.colors.background.primary};
  z-index: 1001;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.18);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
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
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px;
`

/** 모바일에서만 보이는 floating 트리거 버튼 — 우측 메인에 배치 */
export const SidebarSheetTrigger = styled.button`
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  align-items: center;
  justify-content: center;
  z-index: 999;

  &:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 1024px) {
    display: inline-flex;
  }
`
