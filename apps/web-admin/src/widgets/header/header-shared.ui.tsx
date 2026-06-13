/**
 * 헤더 위젯 공용 프리미티브 — 데스크톱 드롭다운과 모바일 모달이 같은
 * 스타일/모션을 공유하도록 한곳에 모은다. (알림 벨·유저 메뉴·사운드 설정 공통)
 */
import { useRef, type ReactNode } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import { useMediaQuery } from '@/shared/hooks/use-media-query.hook'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

/** 모바일 모달 레이아웃이 적용되는 뷰포트(헤더의 모바일 분기와 동일) */
export const MOBILE_QUERY = '(max-width: 768px)'

/** 아바타 이니셜 — 표시명 첫 글자(대문자), 없으면 게스트 'G' */
export const getAvatarInitial = (name: string | undefined | null): string =>
  (name || 'G').charAt(0).toUpperCase()

/** 데스크톱 드롭다운 진입/퇴장 모션 (세 드롭다운 공통) */
export const DROPDOWN_MOTION = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.15, ease: 'easeOut' },
} as const

/** 모바일 모달 진입/퇴장 스프링 모션 (벨·유저·설정·메뉴 공통) */
export const MODAL_MOTION = {
  initial: { opacity: 0, scale: 0.9, x: '-50%', y: 'calc(-50% + 20px)' },
  animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' },
  exit: { opacity: 0, scale: 0.9, x: '-50%', y: 'calc(-50% + 20px)' },
  transition: { type: 'spring', damping: 25, stiffness: 300 },
} as const

/** 오버레이 페이드 모션 */
export const OVERLAY_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const

export const IconButton = styled.button`
  position: relative;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
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
`

export const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.button.text};
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.header.primary};
`

export const Avatar = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.activeLight};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`

export const AvatarLg = styled(Avatar)`
  width: 36px;
  height: 36px;
  font-size: 14px;
`

export const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  margin: 14px 0;
  border-radius: 1px;
`

export const MenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

/**
 * 데스크톱 드롭다운 패널 — 표시 여부는 AnimatePresence 조건부 마운트로 제어한다.
 * (모바일은 별도 모달이 처리하므로 여기선 숨김)
 */
export const DropdownPanel = styled(motion.div)`
  position: absolute;
  top: 44px;
  right: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 20px;
  box-shadow:
    0 20px 50px ${({ theme }) => theme.colors.shadow.lg},
    0 4px 12px ${({ theme }) => theme.colors.shadow.sm};
  padding: 12px;
  transform-origin: top right;
  z-index: ${Z_INDEX.HEADER};

  @media (max-width: 768px) {
    display: none;
  }
`

export const ModalOverlay = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${OVERLAY_STYLES.BACKGROUND};
    z-index: ${Z_INDEX.MODAL_OVERLAY};
    backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  }
`

export const MobileModal = styled(motion.div)`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 24px;
    box-shadow: 0 24px 64px ${({ theme }) => theme.colors.shadow.lg};
    z-index: ${Z_INDEX.MODAL_CONTENT};
    overflow: hidden;
  }
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const MobileCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active {
    transform: scale(0.92);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

export const ModalContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
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

export const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 10px;
`

export const ProfileName = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
`

export const ProfileRole = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

interface MobileModalShellProps {
  isOpen: boolean
  title: string
  closeLabel?: string
  onClose: () => void
  playClickSound: () => void
  children: ReactNode
}

/**
 * 모바일 모달 공통 셸 — 오버레이 + 중앙 모달(헤더/닫기/본문)을 document.body로
 * 포털한다. 고정 헤더의 stacking context에 갇히지 않도록 루트로 띄운다.
 * AnimatePresence의 직속 자식이 motion 컴포넌트라 진입/퇴장 애니메이션이 유지된다.
 */
export function MobileModalShell({
  isOpen,
  title,
  closeLabel = '닫기',
  onClose,
  playClickSound,
  children,
}: MobileModalShellProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  // 모달은 데스크톱에서도 portal로 렌더되지만 CSS로 숨겨진다(드롭다운과 isOpen 공유).
  // 스크롤 락/포커스 트랩은 실제 모바일 레이아웃일 때만 걸어야 데스크톱이 안 잠긴다.
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const active = isOpen && isMobile
  useBodyScrollLock(active)
  useFocusTrap(panelRef, active)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <ModalOverlay {...OVERLAY_MOTION} onClick={onClose} />
          <MobileModal ref={panelRef} {...MODAL_MOTION}>
            <ModalHeader>
              <ModalTitle>{title}</ModalTitle>
              <MobileCloseButton
                onClick={() => {
                  playClickSound()
                  onClose()
                }}
                aria-label={closeLabel}
              >
                <FiX size={24} />
              </MobileCloseButton>
            </ModalHeader>
            <ModalContent>{children}</ModalContent>
          </MobileModal>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
