/**
 * 등록 모달 크롬(헤더 섹션 이동 · 푸터 상태줄) — 사건 등록 모달에서 다듬어진 조각을 공용으로.
 *
 * 사건 등록 모달(`widgets/event-form/ui/event-register-modal.tsx`)이 원본이고, 재임·재위 등록
 * 패널이 두 번째 소비자다. 사건 모달은 아직 자기 파일 안의 로컬 사본을 쓴다 — 옮길 때 값은
 * 그대로라 픽셀 변화가 없다.
 *
 * - 헤더: 섹션 이동 알약(`SectionJumpNav`) + 초기화(`HeaderResetBtn`)
 * - 푸터 좌측: 빠진 필수 칸으로 **이동하는** 버튼(`FooterJumpButton`) 또는 준비 완료 + 단축키
 * - `useModalSubmitShortcut`: ⌘/Ctrl+Enter 저장, ⇧ 추가 시 '등록 후 계속'
 */
import { useEffect, type RefObject } from 'react'

import styled from 'styled-components'

export const HeaderActionsBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  margin-right: 4px;

  @media (max-width: 768px) {
    display: none;
  }
`

export const SectionJumpNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const SectionJumpBtn = styled.button<{ $active?: boolean }>`
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#ffffff') : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark' ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff')};
    outline: none;
  }
`

export const HeaderResetBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.28)'};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2')};
    outline: none;
  }
`

export const FooterHint = styled.div<{ $warning?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  margin: 0;
  font-size: 12px;
  font-weight: ${({ $warning }) => ($warning ? 600 : 400)};
  line-height: 1.4;
  color: ${({ $warning, theme }) =>
    $warning ? theme.colors.text.secondary : theme.colors.text.tertiary};

  @media (max-width: 768px) {
    display: none;
  }
`

export const FooterJumpButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.32)' : 'rgba(99, 102, 241, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.07)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : theme.colors.primary)};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.13)'};
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }
`

export const FooterJumpArrow = styled.span`
  font-size: 11.5px;
  opacity: 0.85;
`

export const FooterMissingCount = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.12)'};
`

export const FooterReadyGroup = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

export const FooterReadyBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const FooterShortcutItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FooterKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 19px;
  padding: 0 5px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff')};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
`

export const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`

/**
 * ⌘/Ctrl + Enter 저장, ⌘/Ctrl + Shift + Enter '등록 후 계속'.
 *
 * 이 모달 위에 다른 모달(국가 선택·달력·사건 선택)이 떠 있으면 무시한다 — 그 창의 Enter가
 * 뒤의 폼을 저장해 버리면 안 된다. 판정은 사건 등록 모달과 같다: 이벤트 대상이 우리 스크롤
 * 컨테이너를 품지 않은 다이얼로그 안이거나, aria-modal 다이얼로그가 둘 이상이면 건너뛴다.
 */
export function useModalSubmitShortcut({
  enabled,
  scrollContainerRef,
  onSubmit,
}: {
  enabled: boolean
  scrollContainerRef: RefObject<HTMLElement | null>
  onSubmit: (options: { continueAfterSave: boolean }) => void
}): void {
  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return
      if (event.defaultPrevented) return
      const targetElement = event.target instanceof Element ? event.target : null
      const closestDialog = targetElement?.closest('[role="dialog"]')
      if (
        closestDialog &&
        scrollContainerRef.current &&
        !closestDialog.contains(scrollContainerRef.current)
      ) {
        return
      }
      if (document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1) return
      event.preventDefault()
      onSubmit({ continueAfterSave: event.shiftKey })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, scrollContainerRef, onSubmit])
}
