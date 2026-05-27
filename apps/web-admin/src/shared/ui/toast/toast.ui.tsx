import React, { createContext, useContext, useState, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
} from 'react-icons/fa'
import { Z_INDEX } from '@/shared/styles/z-index'

type ToastType = 'success' | 'error' | 'info' | 'warning'

/** 토스트 안에 띄우는 인라인 액션 버튼 (예: 실행 취소) */
interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: ToastAction
}

interface ToastContextValue {
  showToast: (
    type: ToastType,
    message: string,
    duration?: number,
    action?: ToastAction,
  ) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (
      type: ToastType,
      message: string,
      duration: number = 3000,
      action?: ToastAction,
    ) => {
      const id = Math.random().toString(36).substring(7)
      const toast: Toast = { id, type, message, duration, action }

      setToasts((prev) => [...prev, toast])

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, duration)
      }
    },
    [],
  )

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer>
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onClose={() => hideToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </ToastContainer>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <FaCheckCircle />
      case 'error':
        return <FaExclamationCircle />
      case 'warning':
        return <FaExclamationCircle />
      case 'info':
      default:
        return <FaInfoCircle />
    }
  }

  const getColor = () => {
    switch (toast.type) {
      case 'success':
        return '#10b981'
      case 'error':
        return '#ef4444'
      case 'warning':
        return '#f59e0b'
      case 'info':
      default:
        return '#3b82f6'
    }
  }

  return (
    <ToastWrapper
      as={motion.div}
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      $color={getColor()}
    >
      <ToastIcon>{getIcon()}</ToastIcon>
      <ToastMessage>{toast.message}</ToastMessage>
      {toast.action && (
        <ToastActionButton
          $color={getColor()}
          onClick={() => {
            toast.action!.onClick()
            onClose()
          }}
        >
          {toast.action.label}
        </ToastActionButton>
      )}
      <ToastClose onClick={onClose}>
        <FaTimes />
      </ToastClose>
    </ToastWrapper>
  )
}

const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: ${Z_INDEX.TOAST};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
`

const ToastWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid ${(props) => props.$color};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  color: #fff;
  min-width: 300px;
  max-width: 500px;
  pointer-events: auto;
`

const ToastIcon = styled.div`
  font-size: 1.25rem;
  flex-shrink: 0;
`

const ToastMessage = styled.div`
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.4;
`

const ToastActionButton = styled.button<{ $color: string }>`
  flex-shrink: 0;
  border: 1px solid ${(props) => props.$color};
  background: transparent;
  color: ${(props) => props.$color};
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${(props) => props.$color};
    color: #fff;
  }
  &:focus-visible {
    outline: 2px solid ${(props) => props.$color};
    outline-offset: 2px;
  }
`

const ToastClose = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`
