/**
 * 가문이 0개일 때 — 미니멀 빈 상태.
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { primarySoft } from './dynasty.styles'

interface Props {
  onCreate: () => void
}

export function DynastyEmptyState({ onCreate }: Props) {
  return (
    <Wrap
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <IconBubble aria-hidden>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M5 8l-2 -2M19 8l2 -2" />
        </svg>
      </IconBubble>
      <Title>아직 등록된 가문이 없습니다</Title>
      <Desc>첫 가문을 등록해 혈통의 기록을 시작하세요.</Desc>
      <CTA type="button" onClick={onCreate}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        새 가문 추가
      </CTA>
    </Wrap>
  )
}

const Wrap = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 72px 32px 80px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 16px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
`

const IconBubble = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => primarySoft(theme.mode)};
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const Desc = styled.p`
  margin: 8px 0 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 280px;
  line-height: 1.55;
`

const CTA = styled.button`
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.button.text};
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,106,242,0.32)'
        : 'rgba(99,102,241,0.22)'};
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`
