/**
 * 표준 토스트 래퍼 — react-hot-toast 위에 success/error/info/warning/action/promise를
 * 얇게 감싸 메시지·duration을 한 곳에서 관리한다. 콜사이트에서는 항상 이 모듈을 쓴다.
 *
 * 스타일/위치/테마는 app.tsx의 ThemedToaster가 단일 책임으로 관리하므로 여기서는
 * 의미(variant)와 동작(action/promise)만 담당한다.
 */
import toast, { type ToastOptions } from 'react-hot-toast'

import styled from 'styled-components'

/** 토스트 지속시간(ms) — 콜사이트 매직넘버 제거용 중앙 정의 */
export const TOAST_DURATION = {
  short: 2500,
  base: 3500,
  success: 3200,
  error: 4200,
  /** 등급 상승·실행취소 등 사용자가 읽고 반응할 시간이 필요한 경우 */
  long: 5000,
} as const

/** 토스트 안에 띄우는 인라인 액션 버튼 (예: 실행 취소) */
export interface ToastActionConfig {
  label: string
  onClick: () => void
}

type NotifyType = 'success' | 'error' | 'info' | 'warning'

const VARIANT_ICON: Record<'info' | 'warning', string> = {
  info: 'ℹ️',
  warning: '⚠️',
}

function success(message: string, opts?: ToastOptions) {
  return toast.success(message, { duration: TOAST_DURATION.success, ...opts })
}

function error(message: string, opts?: ToastOptions) {
  return toast.error(message, { duration: TOAST_DURATION.error, ...opts })
}

function info(message: string, opts?: ToastOptions) {
  return toast(message, { icon: VARIANT_ICON.info, ...opts })
}

function warning(message: string, opts?: ToastOptions) {
  return toast(message, { icon: VARIANT_ICON.warning, ...opts })
}

function loading(message: string, opts?: ToastOptions) {
  return toast.loading(message, opts)
}

function dismiss(id?: string) {
  toast.dismiss(id)
}

/**
 * 액션 버튼이 달린 토스트. 커스텀 useToast의 인라인 액션(실행취소)을 대체한다.
 * 버튼 클릭 시 onClick 실행 후 해당 토스트를 닫는다.
 */
function action(
  message: string,
  config: ToastActionConfig,
  opts?: { type?: NotifyType; duration?: number },
) {
  const icon =
    opts?.type === 'info' || opts?.type === 'warning'
      ? VARIANT_ICON[opts.type]
      : undefined

  return toast(
    (instance) => (
      <ActionRow>
        <ActionMessage>{message}</ActionMessage>
        <ActionButton
          type="button"
          onClick={() => {
            config.onClick()
            toast.dismiss(instance.id)
          }}
        >
          {config.label}
        </ActionButton>
      </ActionRow>
    ),
    { duration: opts?.duration ?? TOAST_DURATION.long, icon },
  )
}

/**
 * 비동기 작업의 로딩→성공/실패 토스트를 한 번에 처리한다.
 * react-hot-toast의 toast.promise 얇은 래핑.
 */
function promise<T>(
  task: Promise<T>,
  messages: {
    loading: string
    success: string | ((value: T) => string)
    error: string | ((err: unknown) => string)
  },
  opts?: ToastOptions,
) {
  return toast.promise(task, messages, opts)
}

export const notify = {
  success,
  error,
  info,
  warning,
  loading,
  action,
  promise,
  dismiss,
}

const ActionRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 12px;
`

const ActionMessage = styled.span`
  flex: 1;
`

const ActionButton = styled.button`
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 999px;
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.button.primary};
    color: ${({ theme }) => theme.colors.button.text};
    border-color: ${({ theme }) => theme.colors.button.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.button.primary};
    outline-offset: 2px;
  }
`
