/**
 * @file 애플리케이션 전반에서 사용될 중앙화된 로거 유틸리티입니다.
 *
 * - 개발 환경: 브라우저 콘솔에 상세한 로그를 출력합니다.
 * - 프로덕션 환경: 직접 구축한 로그 수집 API 서버로 로그를 전송합니다.
 */

// =============================================================================
//  TYPES & CONFIGURATION
// =============================================================================

/**
 * 로그의 심각도를 나타내는 레벨입니다.
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 로그에 추가적인 맥락 정보를 제공하기 위한 타입입니다.
 * @example { userId: '123', scope: 'BillingForm' }
 */
export interface LogContext {
  [key: string]: any
}

// 데이터를 전송할 자체 로그 수집 API 서버 주소입니다.
// 실제 운영 서버의 주소로 변경해야 합니다.
const LOG_API_ENDPOINT = '/v1/logs' // 프록시 사용

// 현재 환경이 개발 환경인지 확인합니다.
const isDevelopment = process.env.NODE_ENV === 'development'

// =============================================================================
//  PRIVATE FUNCTIONS (SERVER COMMUNICATION)
// =============================================================================

/**
 * 캡처된 로그 데이터를 실제 API 서버로 전송하는 내부 함수입니다.
 * @param payload - 서버로 전송할 로그 데이터
 */
async function reportToServer<T>(payload: T) {
  try {
    // navigator.sendBeacon은 페이지가 닫히는 중에도 데이터 전송을 시도하여 더 안정적입니다.
    // 복잡한 헤더나 응답 처리가 필요 없을 때 사용하기 좋습니다.
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      })
      navigator.sendBeacon(LOG_API_ENDPOINT, blob)
    } else {
      // sendBeacon을 지원하지 않는 구형 브라우저를 위한 대체 로직
      await fetch(LOG_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true, // 페이지 이동 중에도 요청을 유지하려는 시도
      })
    }
  } catch (e) {
    // 로깅 서버로의 전송 실패는 서비스의 다른 기능에 영향을 주지 않아야 합니다.
    // 따라서 실패 시에는 콘솔에만 조용히 기록합니다.
    console.error('[Logger] Failed to report log to custom server:', e)
  }
}

// =============================================================================
//  PUBLIC LOGGER INTERFACE
// =============================================================================

/**
 * ✍️ 정보(info) 또는 경고(warn) 레벨의 로그를 처리합니다.
 * @param level - 로그 레벨 ('info' 또는 'warn')
 * @param message - 기록할 메시지
 * @param context - 추가적인 컨텍스트 데이터
 */
function log(
  level: LogLevel.INFO | LogLevel.WARN,
  message: string,
  context?: LogContext,
) {
  if (isDevelopment) {
    const logFunction = console[level] || console.log
    logFunction(`[${level.toUpperCase()}] ${message}`, context || '')

    return
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      href: window.location.href,
      userAgent: navigator.userAgent,
    },
  }
  reportToServer(payload)
}

/**
 * 🚨 Error 객체를 상세 컨텍스트와 함께 로깅합니다.
 * @param error - 로깅할 Error 객체
 * @param context - 추가적인 컨텍스트 정보
 */
function error(error: Error, context?: LogContext) {
  if (isDevelopment) {
    console.error('[Caught Error]', error, context || '')

    return
  }

  const payload = {
    level: 'error',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      href: window.location.href,
      userAgent: navigator.userAgent,
    },
  }
  reportToServer(payload)
}

/**
 * 애플리케이션 전체에서 사용할 정적 로거 객체입니다.
 */
export const Logger = {
  /**
   * ℹ️ 정보성 로그를 기록합니다. (예: 사용자 액션, 주요 프로세스 시작)
   */
  info: (message: string, context?: LogContext) =>
    log(LogLevel.INFO, message, context),

  /**
   * ⚠️ 경고 로그를 기록합니다. (예: 비정상적이지만 치명적이지 않은 상황)
   */
  warn: (message: string, context?: LogContext) =>
    log(LogLevel.WARN, message, context),

  /**
   * 🚨 에러 객체를 기록합니다. (예외 처리, 심각한 오류 등)
   */
  error,
}

// =============================================================================
//  INTEGRATION WRAPPER (for React ErrorBoundary)
// =============================================================================

/**
 * react-error-boundary의 `onError` prop 시그니처에 맞춘 래퍼 함수입니다.
 * `App.tsx`의 ErrorBoundary에서 이 함수를 직접 사용합니다.
 *
 * @param error - ErrorBoundary에 의해 포착된 Error 객체
 * @param info - 에러가 발생한 컴포넌트 스택 정보를 포함하는 객체
 */
export function logError(
  error: Error,
  info: { componentStack?: string | null },
) {
  // focus 관련 에러는 무시 (react-focus-lock 충돌 방지)
  const errorMessage = error.message?.toLowerCase() || ''
  const errorStack = error.stack?.toLowerCase() || ''

  const isFocusError =
    errorMessage.includes('focus') ||
    errorMessage.includes('focuslock') ||
    errorMessage.includes('tabindex') ||
    errorStack.includes('focus-lock') ||
    errorStack.includes('focus') ||
    errorMessage.includes('blur') ||
    errorMessage.includes('activeElement')

  if (isFocusError) {
    // 개발 환경에서는 콘솔에 경고만 표시
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Focus Error Ignored]', error.message)
    }
    
return // ErrorBoundary UI를 표시하지 않음
  }

  Logger.error(error, { componentStack: info.componentStack })
}
