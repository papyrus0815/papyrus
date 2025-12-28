import React, { useState, useEffect } from 'react'
import * as S from './error-handler.styles'
import { Button } from '../button'

// --- 타입 정의 ---
type ErrorHandlerProps = {
  /** ErrorBoundary로부터 전달받는 에러 객체 */
  error: Error
  /** 컴포넌트 상태를 리셋하고 UI를 다시 렌더링하는 함수 */
  resetErrorBoundary?: (...args: any[]) => void
}

/**
 * 모던하고 인터랙티브한 에러 핸들러 컴포넌트
 * 사용자 친화적인 에러 UI와 매력적인 애니메이션을 제공합니다.
 */
export function ErrorHandler({ error, resetErrorBoundary }: ErrorHandlerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const isDevelopment = process.env.NODE_ENV === 'development'

  // focus 관련 에러인지 마지막 확인
  const isFocusRelatedError = () => {
    const errorMessage = error.message?.toLowerCase() || ''
    const errorStack = error.stack?.toLowerCase() || ''
    const errorName = error.name?.toLowerCase() || ''

    return (
      errorMessage.includes('focus') ||
      errorMessage.includes('blur') ||
      errorMessage.includes('activeelement') ||
      errorMessage.includes('focuslock') ||
      errorMessage.includes('tabindex') ||
      errorStack.includes('focus') ||
      errorStack.includes('blur') ||
      errorStack.includes('activeelement') ||
      errorName.includes('focus') ||
      (errorMessage.includes('cannot read properties of null') &&
        (errorStack.includes('focus') || errorStack.includes('input'))) ||
      (errorMessage.includes('cannot read property') &&
        (errorStack.includes('focus') || errorStack.includes('input')))
    )
  }

  useEffect(() => {
    // focus 관련 에러라면 UI를 표시하지 않음
    if (isFocusRelatedError()) {
      console.warn(
        '[ErrorHandler] Focus error detected - UI will not be shown:',
        error.message,
      )

      return
    }

    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [error])

  const handleReload = () => {
    // focus 관련 에러라면 새로고침하지 않음
    if (isFocusRelatedError()) {
      console.warn(
        '[ErrorHandler] Focus error reload prevented:',
        error.message,
      )

      return
    }

    setIsVisible(false)
    setTimeout(() => window.location.reload(), 300)
  }

  const handleRetry = () => {
    // focus 관련 에러라면 단순히 UI만 닫기
    if (isFocusRelatedError()) {
      console.warn(
        '[ErrorHandler] Focus error retry - just closing UI:',
        error.message,
      )
      setIsVisible(false)

      return
    }

    if (resetErrorBoundary) {
      setIsVisible(false)
      setTimeout(() => resetErrorBoundary(), 300)
    }
  }

  const toggleDetails = () => setShowDetails(!showDetails)

  // focus 관련 에러라면 아무것도 렌더링하지 않음
  if (isFocusRelatedError()) {
    console.warn(
      '[ErrorHandler] Focus error - returning null to prevent UI render',
    )

    return null
  }

  return (
    <S.Wrapper $isVisible={isVisible}>
      <S.ErrorCard $isVisible={isVisible}>
        <S.IllustrationContainer>
          <S.ErrorIllustration>
            <S.Robot>
              <S.RobotHead>
                <div
                  style={{ display: 'flex', gap: '12px', marginBottom: '6px' }}
                >
                  <S.RobotEye $isBlinking />
                  <S.RobotEye $isBlinking $delay={0.2} />
                </div>
                <S.RobotMouth />
              </S.RobotHead>
            </S.Robot>
            <S.HeartIcon>💔</S.HeartIcon>
          </S.ErrorIllustration>
        </S.IllustrationContainer>

        <S.ContentContainer>
          <S.MainContent>
            <S.StatusBadge>
              <S.StatusDot />
              System Error
            </S.StatusBadge>

            <S.Title>이런! 예기치 못한 일이 발생하였도다</S.Title>
            <S.Subtitle>
              시스템에 문제가 생겼도다. 잠시 기다렸다가 다시 시도해보시게.
              우리가 신속히 해결하고 있으니 염려 말게나.
            </S.Subtitle>

            <S.ActionButtons>
              {resetErrorBoundary && (
                <S.ActionButton
                  type="button"
                  onClick={handleRetry}
                  $variant="primary"
                >
                  <S.ButtonIcon>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 3v5h5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </S.ButtonIcon>
                  다시 시도하기
                </S.ActionButton>
              )}

              <S.ActionButton
                type="button"
                onClick={handleReload}
                $variant="secondary"
              >
                <S.ButtonIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 21v-5h-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </S.ButtonIcon>
                처음부터 다시 시작
              </S.ActionButton>
            </S.ActionButtons>
          </S.MainContent>

          <S.SidePanel>
            <S.HelpSection>
              <S.HelpTitle>💡 해결 방안</S.HelpTitle>
              <S.HelpList>
                <S.HelpItem>
                  <S.HelpIcon>🔄</S.HelpIcon>
                  <span>잠시 후 다시 시도해보시게</span>
                </S.HelpItem>
                <S.HelpItem>
                  <S.HelpIcon>🌐</S.HelpIcon>
                  <span>네트워크 연결을 확인하시게</span>
                </S.HelpItem>
                <S.HelpItem>
                  <S.HelpIcon>🧹</S.HelpIcon>
                  <span>브라우저 기록을 지워보시게</span>
                </S.HelpItem>
              </S.HelpList>
            </S.HelpSection>

            <S.ErrorInfo>
              <S.ErrorBadge>
                <S.ErrorIcon>⚠️</S.ErrorIcon>
                {error.name}
              </S.ErrorBadge>

              {isDevelopment && (
                <S.DetailsToggle onClick={toggleDetails}>
                  <span>기술 세부사항</span>
                  <S.ChevronIcon $isOpen={showDetails}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </S.ChevronIcon>
                </S.DetailsToggle>
              )}
            </S.ErrorInfo>
          </S.SidePanel>
        </S.ContentContainer>

        {isDevelopment && showDetails && (
          <S.DevDetails $isOpen={showDetails}>
            <S.DevHeader>
              <S.DevTitle>🔧 기술자를 위한 정보</S.DevTitle>
            </S.DevHeader>
            <S.DevContent>
              <S.ErrorMessage>{error.message}</S.ErrorMessage>
              {error.stack && <S.StackTrace>{error.stack}</S.StackTrace>}
            </S.DevContent>
          </S.DevDetails>
        )}
      </S.ErrorCard>
    </S.Wrapper>
  )
}
