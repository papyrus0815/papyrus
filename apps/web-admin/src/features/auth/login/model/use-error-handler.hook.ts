import { useState, useEffect } from 'react'

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

  // 전역 에러 핸들러 등록
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const errorMsg = `🚨 에러: ${event.error?.message || event.message || '알 수 없는 오류'}`
      showError(errorMsg)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = `🚨 Promise 오류: ${event.reason?.message || event.reason || '알 수 없는 오류'}`
      showError(errorMsg)
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

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
