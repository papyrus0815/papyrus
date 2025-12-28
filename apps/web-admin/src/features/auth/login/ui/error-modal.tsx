import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import errorIcon from '@/shared/assets/images/status/error.png'

export interface ErrorModalProps {
  isOpen: boolean
  error: string
  onClose: () => void
}

// 🚀 이미지 전역 캐시 (한 번만 로드)
let cachedErrorImage: HTMLImageElement | null = null
let isImageLoaded = false

// 앱 시작 시 즉시 프리로드
if (!cachedErrorImage) {
  cachedErrorImage = new Image()
  cachedErrorImage.onload = () => {
    isImageLoaded = true
  }
  cachedErrorImage.src = errorIcon
}

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`

const ModalContent = styled(motion.div)`
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(245, 101, 101, 0.3);
  border-radius: 24px;
  padding: 40px 32px;
  max-width: 480px;
  width: 90%;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(245, 101, 101, 0.1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 24px;

  /* 배경 그라데이션 효과 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(245, 101, 101, 0.15) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
  }
`

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 16px rgba(245, 101, 101, 0.5));
  }
`

const ErrorTitle = styled.h2`
  color: #f56565;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin: 0;
  text-shadow: 0 2px 8px rgba(245, 101, 101, 0.3);
`

const ErrorMessage = styled.div`
  color: #e2e8f0;
  font-size: 15px;
  line-height: 1.6;
  text-align: center;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  word-wrap: break-word;
  overflow-wrap: break-word;
`

const ButtonGroup = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  margin-top: 8px;
`

const CloseButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow:
    0 4px 16px rgba(245, 101, 101, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 25px rgba(245, 101, 101, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`

/**
 * 에러 모달 컴포넌트
 * FSD: Features/UI - 로그인 기능의 에러 표시 UI
 */
export const ErrorModal: React.FC<ErrorModalProps> = React.memo(
  ({ isOpen, error, onClose }) => {
    const [imageLoaded, setImageLoaded] = useState(isImageLoaded)

    // 캐시된 이미지 상태 확인
    useEffect(() => {
      if (isImageLoaded && !imageLoaded) {
        setImageLoaded(true)
      }
    }, [imageLoaded])

    if (!isOpen) return null

    return (
      <AnimatePresence>
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContentWrapper>
              <ErrorIcon>
                <img
                  src={errorIcon}
                  alt="에러"
                  style={{
                    opacity: 1, // 캐시된 이미지는 항상 즉시 표시
                  }}
                />
              </ErrorIcon>
              <ErrorTitle>이런, 문제가 생겼도다!</ErrorTitle>
              <ErrorMessage>{error}</ErrorMessage>
            </ContentWrapper>
            <ButtonGroup>
              <CloseButton onClick={onClose}>알았노라</CloseButton>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      </AnimatePresence>
    )
  },
)

ErrorModal.displayName = 'ErrorModal'
