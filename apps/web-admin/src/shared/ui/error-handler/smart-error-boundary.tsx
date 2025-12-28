import React, { Component, ErrorInfo, ReactNode } from 'react'

import { ErrorHandler } from './error.handler.ui'

interface Props {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  FallbackComponent?: React.ComponentType<{
    error: Error
    resetErrorBoundary?: () => void
  }>
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * focus 관련 에러를 무시하는 스마트한 ErrorBoundary
 */
export class SmartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // focus 관련 에러인지 확인 (더 포괄적으로)
    const errorMessage = error.message?.toLowerCase() || ''
    const errorStack = error.stack?.toLowerCase() || ''
    const errorName = error.name?.toLowerCase() || ''

    const isFocusError =
      errorMessage.includes('focus') ||
      errorMessage.includes('focuslock') ||
      errorMessage.includes('tabindex') ||
      errorMessage.includes('blur') ||
      errorMessage.includes('activeElement') ||
      errorMessage.includes('activeelement') ||
      errorStack.includes('focus-lock') ||
      errorStack.includes('focus') ||
      errorStack.includes('blur') ||
      errorStack.includes('activeelement') ||
      errorName.includes('focus') ||
      // input 관련 에러도 포함
      (errorMessage.includes('cannot read properties of null') &&
        (errorStack.includes('focus') ||
          errorStack.includes('input') ||
          errorStack.includes('element'))) ||
      (errorMessage.includes('cannot read property') &&
        (errorStack.includes('focus') ||
          errorStack.includes('input') ||
          errorStack.includes('element'))) ||
      // React 관련 focus 에러
      (errorMessage.includes('react') && errorMessage.includes('focus')) ||
      // 일반적인 DOM 조작 에러
      (errorMessage.includes('queryselector') && errorStack.includes('focus'))

    if (isFocusError) {
      // 개발 환경에서는 콘솔에 경고 표시
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Smart ErrorBoundary] Focus error ignored:',
          error.message,
          '\nStack:',
          error.stack,
        )
      }
      // 에러 상태로 업데이트하지 않음 (UI를 표시하지 않음)
      return { hasError: false, error: null }
    }

    // 일반적인 에러는 처리
    console.log(
      '[Smart ErrorBoundary] Non-focus error will be handled:',
      error.message,
    )

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // focus 관련 에러인지 다시 확인 (getDerivedStateFromError와 동일한 로직)
    const errorMessage = error.message?.toLowerCase() || ''
    const errorStack = error.stack?.toLowerCase() || ''
    const errorName = error.name?.toLowerCase() || ''

    const isFocusError =
      errorMessage.includes('focus') ||
      errorMessage.includes('focuslock') ||
      errorMessage.includes('tabindex') ||
      errorMessage.includes('blur') ||
      errorMessage.includes('activeElement') ||
      errorMessage.includes('activeelement') ||
      errorStack.includes('focus-lock') ||
      errorStack.includes('focus') ||
      errorStack.includes('blur') ||
      errorStack.includes('activeelement') ||
      errorName.includes('focus') ||
      // input 관련 에러도 포함
      (errorMessage.includes('cannot read properties of null') &&
        (errorStack.includes('focus') ||
          errorStack.includes('input') ||
          errorStack.includes('element'))) ||
      (errorMessage.includes('cannot read property') &&
        (errorStack.includes('focus') ||
          errorStack.includes('input') ||
          errorStack.includes('element'))) ||
      // React 관련 focus 에러
      (errorMessage.includes('react') && errorMessage.includes('focus')) ||
      // 일반적인 DOM 조작 에러
      (errorMessage.includes('queryselector') && errorStack.includes('focus'))

    if (isFocusError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Smart ErrorBoundary] Focus error caught and ignored:',
          error.message,
          '\nStack:',
          error.stack,
        )
      }

      return // onError 콜백을 호출하지 않음
    }

    // 일반적인 에러만 onError 콜백 호출
    console.log(
      '[Smart ErrorBoundary] Non-focus error passed to onError:',
      error.message,
    )
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.FallbackComponent || ErrorHandler
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      )
    }

    return this.props.children
  }
}
