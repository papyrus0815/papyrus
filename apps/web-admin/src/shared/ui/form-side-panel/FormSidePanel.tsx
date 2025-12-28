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

const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(600px, calc(100% - 40px));
  background: #ffffff;
  box-shadow:
    -4px 0 24px rgba(0, 0, 0, 0.12),
    -2px 0 8px rgba(0, 0, 0, 0.08);
  z-index: ${Z_INDEX.DRAWER_CONTENT};
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid var(--border-color-light);
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
`

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #202124;
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #5f6368;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #202124;
  }

  &:active {
    transform: scale(0.95);
  }
`

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 4px;

    &:hover {
      background: #bdc1c6;
    }
  }
`

const Footer = styled.div`
  padding: 20px 24px;
  border-top: 1px solid var(--border-color-light);
  background: #fafbfc;
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
  background: linear-gradient(135deg, var(--color-primary) 0%, #9146ff 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(173, 70, 255, 0.3);
  font-family:
    'Roboto',
    -apple-system,
    sans-serif;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(173, 70, 255, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
    box-shadow: none;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`
