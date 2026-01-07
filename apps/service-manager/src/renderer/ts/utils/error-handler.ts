/**
 * 공통 에러 처리 유틸리티
 */

/**
 * 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '알 수 없는 오류가 발생했습니다'
}

/**
 * 에러를 안전하게 처리하고 UI에 표시
 */
export function handleError(
  error: unknown,
  defaultMessage: string = '오류가 발생했습니다',
): void {
  const message = getErrorMessage(error)
  const errorMessage = message || defaultMessage

  console.error('❌', errorMessage, error)

  // UI.showAlert가 있으면 사용, 없으면 alert 사용
  if (typeof UI !== 'undefined' && UI.showAlert) {
    UI.showAlert('❌ 오류', errorMessage)
  } else {
    alert(`❌ ${errorMessage}`)
  }
}

/**
 * API 응답 결과를 처리하고 에러가 있으면 표시
 */
export function handleApiResult(
  result: { success: boolean; message: string },
  successTitle: string = '✅ 완료',
  errorTitle: string = '❌ 실패',
): boolean {
  if (result.success) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert(successTitle, result.message)
    } else {
      alert(`${successTitle}\n\n${result.message}`)
    }
    return true
  } else {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert(errorTitle, result.message)
    } else {
      alert(`${errorTitle}\n\n${result.message}`)
    }
    return false
  }
}

