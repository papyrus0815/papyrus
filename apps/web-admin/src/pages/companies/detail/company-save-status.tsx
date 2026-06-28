import { useEffect, useState } from 'react'

import { FiAlertTriangle, FiCheck, FiLoader } from 'react-icons/fi'
import styled, { css, keyframes } from 'styled-components'

interface SaveStatusProps {
  isPending: boolean
  /** 마지막 성공 epoch — 변동 시 "방금 저장됨" 잠시 노출. */
  lastSavedAt: number | null
  /** 마지막 저장이 실패했는지(react-query mutation.isError). true면 다음 저장까지 영구 노출. */
  isError?: boolean
  /** 실패 사유 — hover 툴팁(title)으로 노출. */
  errorMessage?: string | null
}

/**
 * 페이지 우상단 sticky 저장 인디케이터(사건 상세 SaveStatus와 동일 거동).
 * 인라인 편집은 patch 빈도가 높아 성공 토스트 대신 이 한 곳에서만 시그널.
 *
 * 실패는 *영구* 노출한다 — 자동저장 실패 시 변경이 조용히 되돌려지므로(onError가
 * invalidate→refetch로 서버 정본 복원), 2.4초 토스트만으로는 사용자가 못 보고
 * "저장된 것처럼 보이는" 화면에서 데이터를 잃는다. 실패 칩은 다음 저장 시도(저장
 * 중)나 성공(방금 저장됨)이 덮어쓸 때까지 남는다.
 */
export function CompanySaveStatus({
  isPending,
  lastSavedAt,
  isError = false,
  errorMessage,
}: SaveStatusProps) {
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (lastSavedAt == null) return
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 2400)
    return () => window.clearTimeout(t)
  }, [lastSavedAt])

  // 실패는 *최신 상태*다 — 저장 중에만 양보하고, 직전 성공 flash(savedFlash)보다
  // 우선해 노출한다(이전 저장의 2.4초 잔상이 새 실패를 가리지 않도록).
  const showError = isError && !isPending
  const visible = isPending || savedFlash || showError

  // aria-live는 정적 'polite' 고정 — 같은 노드에서 polite↔assertive를 토글하면 다수
  // 스크린리더가 첫 파싱 시점의 정중함을 캐시해 실패 전환을 못 읽는다(사건 상세 동일 교훈).
  return (
    <Live aria-live="polite" aria-atomic="true">
      {visible && (
        <Pill
          $saved={!isPending && savedFlash}
          $error={showError}
          title={showError ? errorMessage ?? undefined : undefined}
        >
          {isPending ? (
            <>
              <Spin>
                <FiLoader />
              </Spin>
              저장 중…
            </>
          ) : showError ? (
            <>
              <FiAlertTriangle />
              저장 실패 · 변경이 반영되지 않았습니다
            </>
          ) : (
            <>
              <FiCheck />
              방금 저장됨
            </>
          )}
        </Pill>
      )}
    </Live>
  )
}

const Live = styled.div`
  position: sticky;
  top: 8px;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  height: 0;
  overflow: visible;
  pointer-events: none;
`

const spin = keyframes`to { transform: rotate(360deg); }`

const Spin = styled.span`
  display: inline-flex;
  animation: ${spin} 0.9s linear infinite;
`

const Pill = styled.div<{ $saved: boolean; $error: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid
    ${({ $error, theme }) =>
      $error
        ? theme.colors.error ?? '#dc2626'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(15,23,42,0.1)'};
  background: ${({ theme }) => theme.colors.background.primary};
  ${({ $saved, $error, theme }) =>
    $error
      ? css`
          color: ${theme.colors.error ?? '#dc2626'};
          pointer-events: auto;
          cursor: help;
        `
      : $saved
        ? css`
            color: #16a34a;
          `
        : css`
            color: ${theme.colors.text.secondary};
          `}

  svg {
    width: 13px;
    height: 13px;
  }
`
