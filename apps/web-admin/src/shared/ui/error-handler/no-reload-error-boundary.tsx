import React, { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 절대 새로고침하지 않는 ErrorBoundary
 * focus 에러뿐만 아니라 모든 에러에 대해 새로고침을 방지
 */
export class NoReloadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    console.warn(
      '[NoReloadErrorBoundary] Error caught but UI will not be shown:',
      error.message,
    )
    console.warn('[NoReloadErrorBoundary] Error stack:', error.stack)

    // 어떤 에러든 UI를 표시하지 않음 (새로고침 방지)
    return { hasError: false, error: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(
      '[NoReloadErrorBoundary] componentDidCatch - error suppressed:',
      error.message,
    )
    console.warn(
      '[NoReloadErrorBoundary] componentStack:',
      errorInfo.componentStack,
    )

    // onError 콜백도 호출하지 않음 (추가 에러 핸들링 방지)
    // if (this.props.onError) {
    //   this.props.onError(error, errorInfo)
    // }
  }

  render() {
    // 항상 children을 렌더링 (에러 UI 표시 안함)
    return this.props.children
  }
}
