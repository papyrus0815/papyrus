import React, { useCallback } from 'react'
import CredentialLoginForm from '@/features/session/login/credential-login.ui'
import { NoReloadErrorBoundary } from '@/shared/ui/error-handler/no-reload-error-boundary'

export interface LoginFormFeatureProps {
  onError?: (error: string) => void
}

/**
 * 로그인 폼 기능 컴포넌트
 * FSD: Features 레이어 - 순수한 로그인 폼 기능만 담당
 * 레이아웃/배경/장식 요소는 Pages 레이어에서 담당
 */
const LoginFormFeatureComponent: React.FC<LoginFormFeatureProps> = ({
  onError,
}) => {
  const handleError = useCallback(
    (error: string) => {
      if (import.meta.env.DEV) {
        console.error('🚨 로그인 폼에서 에러 발생:', error)
      }
      onError?.(error)
    },
    [onError],
  )

  return (
    <NoReloadErrorBoundary>
      <CredentialLoginForm onError={handleError} />
    </NoReloadErrorBoundary>
  )
}

// 메모이제이션을 통한 성능 최적화
export const LoginFormFeature = React.memo(
  LoginFormFeatureComponent,
  (prevProps, nextProps) => {
    // onError 함수가 변경되지 않았다면 리렌더링 방지
    return prevProps.onError === nextProps.onError
  },
)

LoginFormFeature.displayName = 'LoginFormFeature'
