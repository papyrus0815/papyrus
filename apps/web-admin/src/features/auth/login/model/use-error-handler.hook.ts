import { useState } from 'react'

export interface UseErrorHandlerReturn {
  errorMessage: string
  isErrorModalOpen: boolean
  showError: (message: string) => void
  closeError: () => void
}

/**
 * 로그인 관련 에러 처리를 위한 커스텀 훅
 * FSD: Features/Model - 로그인 기능의 에러 상태 관리
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

  // NOTE: 과거 window 전역 error/unhandledrejection 핸들러를 등록했으나,
  // 원본 에러 메시지를 그대로 노출해 정규화된 안내 문구 정책을 무력화하고
  // 로그인과 무관한 거부까지 모달을 띄우는 문제가 있어 제거함.
  // 로그인 실패는 onSubmit의 onError 콜백 → showError 경로로만 처리한다.

  const showError = (message: string) => {
    setErrorMessage(message)
    setIsErrorModalOpen(true)

    // 에러 메시지는 사용자가 직접 닫을 때까지 유지
  }

  const closeError = () => {
    setIsErrorModalOpen(false)
  }

  return {
    errorMessage,
    isErrorModalOpen,
    showError,
    closeError,
  }
}
