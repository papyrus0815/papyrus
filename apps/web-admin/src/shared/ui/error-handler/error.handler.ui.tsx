import { useEffect, useRef, useState } from 'react'

import {
  AlertTriangleIcon,
  BrokenLinkIcon,
  BulbIcon,
  RefreshIcon,
  SparkleIcon,
  TerminalIcon,
  WifiIcon,
} from './error-handler.icons'
import * as S from './error-handler.styles'

// 진입 애니메이션 표시 지연 / 퇴장 후 액션 실행 지연 (CSS 전환 시간과 맞춤)
const ENTER_DELAY_MS = 100
const EXIT_DELAY_MS = 300

// --- 타입 정의 ---
type ErrorHandlerProps = {
  /** ErrorBoundary로부터 전달받는 에러 객체 */
  error: Error
  /** 컴포넌트 상태를 리셋하고 UI를 다시 렌더링하는 함수 */
  resetErrorBoundary?: () => void
}

/**
 * 모던하고 인터랙티브한 에러 핸들러 컴포넌트
 * 사용자 친화적인 에러 UI와 매력적인 애니메이션을 제공합니다.
 *
 * focus 관련 에러 필터링은 상위 SmartErrorBoundary가 단일 책임으로 처리하므로,
 * 이 컴포넌트는 전달받은 에러를 항상 표시한다(여기서 다시 거르지 않음).
 */
export function ErrorHandler({ error, resetErrorBoundary }: ErrorHandlerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const primaryActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), ENTER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [error])

  // 에러 표시 시 포커스를 주요 액션으로 이동.
  // 키보드/스크린리더 사용자가 (가려진) 이전 페이지에 갇히지 않고 즉시 인지·조작.
  useEffect(() => {
    primaryActionRef.current?.focus()
  }, [error])

  const handleReload = () => {
    setIsVisible(false)
    setTimeout(() => window.location.reload(), EXIT_DELAY_MS)
  }

  const handleRetry = () => {
    if (!resetErrorBoundary) return
    setIsVisible(false)
    setTimeout(() => resetErrorBoundary(), EXIT_DELAY_MS)
  }

  const toggleDetails = () => setShowDetails((prev) => !prev)

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
            <S.HeartIcon>
              <BrokenLinkIcon />
            </S.HeartIcon>
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
                  ref={primaryActionRef}
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
                ref={resetErrorBoundary ? undefined : primaryActionRef}
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
              <S.HelpTitle>
                <S.TitleIcon>
                  <BulbIcon />
                </S.TitleIcon>
                해결 방안
              </S.HelpTitle>
              <S.HelpList>
                <S.HelpItem>
                  <S.HelpIcon>
                    <RefreshIcon />
                  </S.HelpIcon>
                  <span>잠시 후 다시 시도해보시게</span>
                </S.HelpItem>
                <S.HelpItem>
                  <S.HelpIcon>
                    <WifiIcon />
                  </S.HelpIcon>
                  <span>네트워크 연결을 확인하시게</span>
                </S.HelpItem>
                <S.HelpItem>
                  <S.HelpIcon>
                    <SparkleIcon />
                  </S.HelpIcon>
                  <span>브라우저 기록을 지워보시게</span>
                </S.HelpItem>
              </S.HelpList>
            </S.HelpSection>

            <S.ErrorInfo>
              <S.ErrorBadge>
                <S.ErrorIcon>
                  <AlertTriangleIcon />
                </S.ErrorIcon>
                {error.name}
              </S.ErrorBadge>

              {isDevelopment && (
                <S.DetailsToggle
                  type="button"
                  onClick={toggleDetails}
                  aria-expanded={showDetails}
                >
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
              <S.DevTitle>
                <S.TitleIcon>
                  <TerminalIcon />
                </S.TitleIcon>
                기술자를 위한 정보
              </S.DevTitle>
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
