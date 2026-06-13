import { motion } from 'framer-motion'
import styled, { keyframes } from 'styled-components'

interface LoadingOverlayProps {
  message?: string
}

// country-detail.styles에는 로딩 관련 styled가 존재하지 않아(초기 이관 누락) 로컬로 정의
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const OverlayBox = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  z-index: 10;
`

const SpinnerRing = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #6366f1;
  animation: ${spin} 0.8s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SpinnerInner = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: transparent;
`

const LoadingMessage = styled.div`
  font-size: 14px;
  color: #6b7280;
`

/**
 * 로딩 오버레이
 * @param message 로딩 메시지
 * @returns 로딩 오버레이
 */
export function LoadingOverlay({
  message = '정보를 불러오는 중...',
}: LoadingOverlayProps) {
  return (
    <OverlayBox
      as={motion.div}
      key="loading"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <SpinnerRing>
        <SpinnerInner />
      </SpinnerRing>
      <LoadingMessage>{message}</LoadingMessage>
    </OverlayBox>
  )
}
