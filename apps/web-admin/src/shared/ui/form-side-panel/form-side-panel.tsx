import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import { Z_INDEX, OVERLAY_STYLES } from '@/shared/styles/z-index'

/**
 * FormSidePanel Props 인터페이스
 */
interface FormSidePanelProps {
  /** 패널 표시 여부 */
  isOpen: boolean
  /** 패널 제목 */
  title: string
  /** 닫기 핸들러 */
  onClose: () => void
  /** 제출 버튼 라벨 */
  submitLabel: string
  /** 폼 ID (제출 버튼과 연결) */
  formId: string
  /** 제출 버튼 비활성화 여부 */
  submitDisabled?: boolean
  /** 헤더 아래 추가 컨텐츠 (선택적) */
  headerExtra?: React.ReactNode
  /** 폼 컨텐츠 */
  children: React.ReactNode
  /** 패널 너비(px). 기본 600. 수반 등록 등 그리드 폼은 760 권장 */
  panelWidth?: number
}

/**
 * FormSidePanel 공통 컴포넌트
 * - 우측에서 슬라이드되는 폼 패널
 * - 오버레이 + 헤더 + 컨텐츠 + 푸터(제출 버튼) 구조
 * - CountryForm, HistoricalCountryForm 등에서 사용
 */
export function FormSidePanel({
  isOpen,
  title,
  onClose,
  submitLabel,
  formId,
  submitDisabled = false,
  headerExtra,
  children,
  panelWidth = 600,
}: FormSidePanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 오버레이 (어두운 배경) */}
          <Overlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* 우측 사이드 패널 */}
          <Panel
            $width={panelWidth}
            as={motion.div}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* 헤더 */}
            <Header>
              <Title>{title}</Title>
              <CloseButton onClick={onClose} type="button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    fill="currentColor"
                  />
                </svg>
              </CloseButton>
            </Header>

            {/* 헤더 추가 컨텐츠 (선택적) */}
            {headerExtra}

            {/* 폼 컨텐츠 */}
            <Content>{children}</Content>

            {/* 푸터 (저장 버튼) */}
            <Footer>
              <SubmitButton
                type="submit"
                form={formId}
                disabled={submitDisabled}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="currentColor"
                  />
                </svg>
                {submitLabel}
              </SubmitButton>
            </Footer>
          </Panel>
        </>
      )}
    </AnimatePresence>
  )
}

// ==================== Styled Components ====================

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  -webkit-backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
  z-index: ${Z_INDEX.DRAWER_OVERLAY};
`

const Panel = styled.div<{ $width?: number }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(${(p) => p.$width ?? 600}px, calc(100% - 20px));
  max-height: 100vh;
  background: ${({ theme }) => theme.colors.background.primary};
  z-index: ${Z_INDEX.DRAWER_CONTENT};
  display: flex;
  flex-direction: column;
  border-radius: 16px 0 0 16px;
  box-shadow: -8px 0 32px ${({ theme }) => theme.colors.shadow.lg};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px 20px;
  flex-shrink: 0;
`

const Title = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.2s, color 0.2s, transform 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:active {
    transform: scale(0.96);
  }
`

const Content = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 26px 26px 28px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const Footer = styled.div`
  padding: 20px 26px 26px;
  flex-shrink: 0;
`

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 15px 24px;
  border: none;
  background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-radius: 14px;
  cursor: pointer;
  transition: filter 0.2s, transform 0.15s;

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    filter: none;
  }
  svg {
    width: 20px;
    height: 20px;
  }
`
