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

// 메모이제이션을 통한 성능 최적화 (기본 shallow 비교로 충분 — prop은 onError 하나)
export const LoginFormFeature = React.memo(LoginFormFeatureComponent)

LoginFormFeature.displayName = 'LoginFormFeature'
