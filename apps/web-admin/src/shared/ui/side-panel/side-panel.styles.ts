/**
 * 사이드 패널(드로어) 레이아웃 — 모달과 동일한 헤더/바디 토큰 재사용
 *
 * z-index: Z_INDEX.DRAWER_* — 모달(Z_INDEX.MODAL_*)보다 낮음.
 * → 패널 안에서 국가/인물/날짜 등 기존 모달을 띄우면 모달이 패널 위에 올라감.
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { glassCardMixin, scrollbarMixin } from '@/shared/styles/mixins'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

import {
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'

export const SidePanelOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  z-index: ${Z_INDEX.DRAWER_OVERLAY};
`

export type SidePanelSide = 'start' | 'end'

type SidePanelSurfaceProps = {
  $side: SidePanelSide
  $width: string
}

export const SidePanelSurface = styled(motion.div)<SidePanelSurfaceProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  ${({ $side }) => ($side === 'end' ? 'right: 0;' : 'left: 0;')}
  z-index: ${Z_INDEX.DRAWER_CONTENT};
  width: ${({ $width }) => $width};
  max-width: 100vw;
  height: 100%;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: ${({ $side }) =>
    $side === 'end' ? '16px 0 0 16px' : '0 16px 16px 0'};
  box-shadow: ${({ $side }) =>
    $side === 'end'
      ? '-12px 0 40px rgba(0, 0, 0, 0.18)'
      : '12px 0 40px rgba(0, 0, 0, 0.18)'};
`

/** 헤더 우측: 저장·취소 등 — 닫기 버튼과 한 그룹 */
export const SidePanelHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-right: 4px;

  @media (max-width: 520px) {
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: min(100%, 220px);
  }
`

/** 스크롤은 바디만 — 헤더/푸터 고정 */
export const SidePanelScrollBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 28px 28px;
  ${scrollbarMixin}
`

export {
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalSubtitle,
  ModalTitle,
}
