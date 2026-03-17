import React, { useEffect, useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, useTheme } from 'styled-components'
import styled, { keyframes } from 'styled-components'

import { attachAuthInterceptor } from '@/entities/session/session.lib'
import { BackgroundSlideshow } from '@/features/auth/login/ui/background-slideshow'
import { useEnvConfig } from '@/shared/hooks/use-env-config.hook'
import { queryClient } from '@/shared/queryClient'
import { useBackgroundStore } from '@/shared/store/background.store'
import { getTheme } from '@/shared/styles/theme'
import { useThemeStore } from '@/shared/styles/theme.store'
import { EnvConfigModal } from '@/shared/ui/env-config-modal/env-config-modal.ui'
import { logError } from '@/shared/ui/error-handler/error-handler.lib'
import { ErrorHandler } from '@/shared/ui/error-handler/error.handler.ui'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'

import { BootstrappedRouter } from './browser-router'

attachAuthInterceptor()

// ThemeProvider 내부에서 테마 값을 읽어 Toaster에 전달
function ThemedToaster() {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const bg = theme.colors.background.primary
  const border = theme.colors.border.default
  const textPrimary = theme.colors.text.primary

  return (
    <Toaster
      position="top-right"
      gutter={16}
      containerStyle={{ top: 80, right: 20 }}
      toastOptions={{
        duration: 3500,
        style: {
          background: bg,
          color: textPrimary,
          fontSize: '14px',
          borderRadius: '12px',
          padding: '12px 16px',
          fontWeight: '500',
          boxShadow: isDark
            ? `0 4px 12px ${theme.colors.shadow.md}`
            : '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
          border: `1px solid ${border}`,
          maxWidth: '400px',
          minWidth: '280px',
        },
        success: {
          duration: 3000,
          style: {
            background: bg,
            color: isDark ? theme.colors.success : '#065f46',
            borderLeft: `4px solid ${theme.colors.success}`,
          },
          iconTheme: {
            primary: theme.colors.success,
            secondary: bg,
          },
        },
        error: {
          duration: 4000,
          style: {
            background: bg,
            color: isDark ? theme.colors.error : '#991b1b',
            borderLeft: `4px solid ${theme.colors.error}`,
          },
          iconTheme: {
            primary: theme.colors.error,
            secondary: bg,
          },
        },
        loading: {
          style: {
            background: bg,
            color: isDark ? theme.colors.accent : '#1e40af',
            borderLeft: `4px solid ${theme.colors.accent}`,
          },
          iconTheme: {
            primary: theme.colors.accent,
            secondary: bg,
          },
        },
      }}
    />
  )
}

// 전역 배경 컨테이너
const GlobalBackgroundContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.5s ease;
`

// 검은 화면 오버레이 (배경 꺼짐 상태)
const BlackOverlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.5s ease;
  pointer-events: none;
`

// 컨텐츠 컨테이너
const ContentContainer = styled.div<{ $hasGlobalBackground: boolean }>`
  position: relative;
  z-index: 10;
  width: 100%;
  min-height: 100vh;
  background: ${({ $hasGlobalBackground, theme }) =>
    $hasGlobalBackground ? 'transparent' : theme.colors.background.primary};
`

// 전역 로딩 오버레이
const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  gap: 1.5rem;
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  letter-spacing: 0.05em;
`

export default function App() {
  const { missingEnvKeys, showModal, closeModal } = useEnvConfig()
  const { mode } = useThemeStore()
  const { isEnabled: isBackgroundEnabled } = useBackgroundStore()
  const currentTheme = getTheme(mode)
  const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false)

  const handleBackgroundLoaded = () => {
    setIsBackgroundLoaded(true)
  }

  // 테마 변경 시 body에 data-theme 속성 + 배경색 동기화
  useEffect(() => {
    document.body.setAttribute('data-theme', mode)
    document.body.style.backgroundColor = getTheme(mode).colors.background.primary
  }, [mode])

  // 전역 focus 에러 방지
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message?.toLowerCase() || ''
      const filename = event.filename?.toLowerCase() || ''

      if (
        message.includes('focus') ||
        message.includes('blur') ||
        message.includes('activeelement') ||
        filename.includes('focus')
      ) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(
        event.reason?.message || event.reason || '',
      ).toLowerCase()

      if (
        reason.includes('focus') ||
        reason.includes('blur') ||
        reason.includes('activeelement')
      ) {
        event.preventDefault()
      }
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <ThemeProvider theme={currentTheme}>
      <SmartErrorBoundary FallbackComponent={ErrorHandler} onError={logError}>
        {/* 검은 화면 (배경 꺼짐) */}
        <BlackOverlay $isVisible={!isBackgroundEnabled} />

        {/* 전역 배경 (모든 페이지 공유) */}
        <GlobalBackgroundContainer
          id="global-bg"
          $isVisible={isBackgroundEnabled}
        >
          <BackgroundSlideshow onLoaded={handleBackgroundLoaded} />
        </GlobalBackgroundContainer>

        {/* 배경 로딩 중 스피너 */}
        <AnimatePresence>
          {!isBackgroundLoaded && isBackgroundEnabled && (
            <LoadingOverlay
              as={motion.div}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Spinner />
              <LoadingText>로딩 중...</LoadingText>
            </LoadingOverlay>
          )}
        </AnimatePresence>

        <ContentContainer $hasGlobalBackground={isBackgroundEnabled}>
          <QueryClientProvider client={queryClient}>
            <BootstrappedRouter />
            <ReactQueryDevtools
              initialIsOpen={false}
              buttonPosition="bottom-left"
            />
            {/* Toast 알림 */}
            <ThemedToaster />
            {/* 환경 변수 설정 모달 */}
            {showModal && (
              <EnvConfigModal
                missingEnvKeys={missingEnvKeys}
                onClose={closeModal}
              />
            )}
          </QueryClientProvider>
        </ContentContainer>
      </SmartErrorBoundary>
    </ThemeProvider>
  )
}
