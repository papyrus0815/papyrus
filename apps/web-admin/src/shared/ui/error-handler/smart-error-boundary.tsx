import React, { Component, ErrorInfo, ReactNode } from 'react'

import { ErrorHandler } from './error.handler.ui'
import { isFocusRelatedError } from './error-handler.lib'

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
    // focus 관련 에러는 UI를 띄우지 않고 통과 (단일 기준: isFocusRelatedError)
    if (isFocusRelatedError(error)) {
      return { hasError: false, error: null }
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // getDerivedStateFromError와 동일 기준으로 focus 에러는 보고하지 않음
    if (isFocusRelatedError(error)) {
      return
    }

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
