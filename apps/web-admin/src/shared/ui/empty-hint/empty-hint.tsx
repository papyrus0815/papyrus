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
  gap: 8px;
  padding: 8px 0;
  margin-top: 6px;
  font-size: 12.5px;
`

const IconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Message = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const linkStyle = `
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  border: none;
  background: transparent;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.12s;

  svg {
    transition: transform 0.15s;
  }
  &:hover svg {
    transform: translateX(2px);
  }
`

const Action = styled(Link)`
  ${linkStyle}
  color: ${({ theme }) => theme.colors.primary};

  &:hover {
    color: ${({ theme }) => theme.colors.button.hover};
  }
`

const ActionButton = styled.button`
  ${linkStyle}
  color: ${({ theme }) => theme.colors.primary};

  &:hover {
    color: ${({ theme }) => theme.colors.button.hover};
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
