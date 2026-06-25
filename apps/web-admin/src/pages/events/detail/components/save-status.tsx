import { useEffect, useState } from 'react'

import { FiCheck, FiLoader } from 'react-icons/fi'
import styled, { css, keyframes } from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'

interface SaveStatusProps {
  isPending: boolean
  /** 마지막 성공 epoch — 변동 시 "방금 저장됨" 잠시 노출. */
  lastSavedAt: number | null
}

/**
 * 페이지 우상단 sticky 저장 인디케이터.
 *
 * - 저장 중: spinner + "저장 중…"
 * - 직후 ~2.4s: ✓ + "방금 저장됨"
 * - 그 외: 숨김(idle은 시각 노이즈)
 *
 * 인라인 편집은 patch 빈도가 높아 매 patch마다 toast를 띄우면 화면이 묶임 —
 * 이 인디케이터 한 곳에서만 시그널.
 */
export function SaveStatus({ isPending, lastSavedAt }: SaveStatusProps) {
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (lastSavedAt == null) return
    setSavedFlash(true)
    const t = window.setTimeout(() => setSavedFlash(false), 2400)
    return () => window.clearTimeout(t)
  }, [lastSavedAt])

  const visible = isPending || savedFlash

  // 라이브 리전 컨테이너는 idle에도 항상 마운트 — 노드가 콘텐츠 변경 *이전부터*
  // 존재해야 스크린리더가 '저장 중/방금 저장됨' 갱신을 읽는다. (이전엔 visible 시점에
  // 노드+텍스트가 동시 생성돼 다수 SR이 고지하지 못했다.) 시각적 Pill만 조건부 렌더.
  return (
    <StatusLive aria-live="polite" aria-atomic="true">
      {visible && (
        <Pill $state={isPending ? 'pending' : 'saved'}>
          {isPending ? (
            <>
              <SpinIcon><FiLoader /></SpinIcon>
              <span>저장 중…</span>
            </>
          ) : (
            <>
              <FiCheck />
              <span>방금 저장됨</span>
            </>
          )}
        </Pill>
      )}
    </StatusLive>
  )
}

/* idle에도 항상 마운트되는 빈 라이브 리전 래퍼 (레이아웃 영향 없음). */
const StatusLive = styled.div``

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Pill = styled.div<{ $state: 'pending' | 'saved' }>`
  position: sticky;
  top: 12px;
  z-index: 10;
  /* 부모(PageInner)가 block이라 inline-flex + align-self로는 우측 정렬이 안 됐다.
     block-level flex + margin-left:auto + width:fit-content로 우상단에 고정. */
  display: flex;
  width: fit-content;
  margin-left: auto;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  animation: ${fadeIn} 0.18s ease-out;
  pointer-events: none;

  svg {
    width: 12px;
    height: 12px;
  }

  ${({ $state, theme }) =>
    $state === 'saved' &&
    css`
      color: ${theme.colors.success ?? theme.colors.text.primary};
    `}
`

const SpinIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    animation: ${spin} 0.9s linear infinite;
  }
`
