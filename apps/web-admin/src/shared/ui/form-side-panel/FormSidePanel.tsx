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
  z-index: ${Z_INDEX.DRAWER_OVERLAY};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
`

/* 행정조직 폼 톤: 흰 배경, #e5e7eb 테두리, 인디고 포커스/버튼 */
const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(600px, calc(100% - 40px));
  background: #fff;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.06);
  z-index: ${Z_INDEX.DRAWER_CONTENT};
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
`

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #475569;
  }

  &:active {
    transform: scale(0.97);
  }
`

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
  }

  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`

const Footer = styled.div`
  padding: 20px 28px;
  border-top: 1px solid #f3f4f6;
  background: #fff;
  display: flex;
  justify-content: stretch;
`

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 24px;
  border: none;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);

  &:hover:not(:disabled) {
    background: #4f46e5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`
