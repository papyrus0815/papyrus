/**
 * 모달 공용 프리미티브
 *
 * 프로젝트 전체 모달에서 반복되는 오버레이/컨테이너/헤더/닫기 버튼을 공용화.
 * 다크 모드: 리퀴드 글래스, 라이트 모드: 솔리드.
 *
 * @example
 *   <ModalOverlay onClick={onClose}>
 *     <ModalBox onClick={e => e.stopPropagation()}>
 *       <ModalHeader>
 *         <ModalTitle>제목</ModalTitle>
 *         <ModalCloseButton onClick={onClose}><FiX /></ModalCloseButton>
 *       </ModalHeader>
 *       {children}
 *     </ModalBox>
 *   </ModalOverlay>
 */
import styled from 'styled-components'

import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'
import { glassCardMixin, scrollbarMixin } from '@/shared/styles/mixins'

// ─── 오버레이 ─────────────────────────────────────────────────────────────────

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

// ─── 모달 컨테이너 ────────────────────────────────────────────────────────────

/**
 * 기본 모달 박스 (다크: 리퀴드 글래스, 라이트: 솔리드).
 * flex-column + overflow:hidden 기본 — 헤더·푸터 고정, ModalBody만 스크롤되도록.
 */
export const ModalBox = styled.div<{
  $maxWidth?: string
  $maxHeight?: string
}>`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  max-width: ${({ $maxWidth }) => $maxWidth ?? '560px'};
  width: 100%;
  max-height: ${({ $maxHeight }) => $maxHeight ?? '90vh'};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

/** 넓은 모달 (멀티 컬럼 등) */
export const ModalBoxWide = styled(ModalBox)`
  max-width: 900px;
`

/** 좁은 모달 (확인 다이얼로그 등) */
export const ModalBoxNarrow = styled(ModalBox)`
  max-width: 400px;
`

// ─── 헤더 ─────────────────────────────────────────────────────────────────────

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

export const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const ModalSubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

// ─── 닫기 버튼 ────────────────────────────────────────────────────────────────

export const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

// ─── 바디 / 푸터 ──────────────────────────────────────────────────────────────

/**
 * ModalBox 안의 스크롤 영역. ModalBox가 flex-column + overflow:hidden이므로
 * 여기서 flex:1 + overflow:auto를 잡아 본문만 스크롤되게 함.
 */
export const ModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  ${scrollbarMixin}
`

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`
