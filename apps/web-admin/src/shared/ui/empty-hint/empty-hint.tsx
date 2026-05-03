/**
 * 인라인 empty state 안내 (1줄 형태).
 *
 * "등록된 X가 없습니다 → [관리 페이지로 이동]" 같이
 * Select 비어있을 때 자연스럽게 액션을 유도하는 미니멀 카드.
 *
 * Linear / Notion / Vercel 스타일 — 큰 강조 없이 subtle 배경 + 우측 chip 액션.
 */
import React from 'react'

import { Link } from 'react-router-dom'
import { FiArrowRight, FiInbox } from 'react-icons/fi'
import styled from 'styled-components'

interface EmptyHintProps {
  /** 좌측 아이콘 — 미지정 시 FiInbox */
  icon?: React.ReactNode
  /** 메시지 — 한 줄 권장 */
  message: React.ReactNode
  /** 우측 액션 버튼 라벨 (생략 시 액션 미표시) */
  actionLabel?: string
  /** 액션 링크 (react-router) */
  actionHref?: string
  /** 또는 액션 클릭 핸들러 (href 대신) */
  onAction?: () => void
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-top: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'rgba(15,23,42,0.025)'};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  font-size: 12.5px;
`

const IconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.12)'
      : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
`

const Message = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s,
    transform 0.05s;
  flex-shrink: 0;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : '#f5f7ff'};
  }

  &:active {
    transform: translateY(1px);
  }

  svg {
    transition: transform 0.15s;
  }
  &:hover svg {
    transform: translateX(2px);
  }
`

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s,
    transform 0.05s;
  flex-shrink: 0;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : '#f5f7ff'};
  }

  &:active {
    transform: translateY(1px);
  }

  svg {
    transition: transform 0.15s;
  }
  &:hover svg {
    transform: translateX(2px);
  }
`

export function EmptyHint({
  icon,
  message,
  actionLabel,
  actionHref,
  onAction,
}: EmptyHintProps) {
  return (
    <Wrap role="status">
      <IconBox>{icon ?? <FiInbox size={14} />}</IconBox>
      <Message>{message}</Message>
      {actionLabel && actionHref && (
        <Action to={actionHref}>
          {actionLabel}
          <FiArrowRight size={12} />
        </Action>
      )}
      {actionLabel && !actionHref && onAction && (
        <ActionButton type="button" onClick={onAction}>
          {actionLabel}
          <FiArrowRight size={12} />
        </ActionButton>
      )}
    </Wrap>
  )
}
