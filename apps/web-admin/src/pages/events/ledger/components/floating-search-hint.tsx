/**
 * Floating Search Hint — 우하단 떠있는 ⌘K 안내·트리거.
 */
import React from 'react'

import { FiCommand, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { DIGIT_DISPLAY } from '../styles/ledger-tokens'

interface Props {
  onClick: () => void
}

export const FloatingSearchHint: React.FC<Props> = ({ onClick }) => (
  <Btn type="button" onClick={onClick} title="명령 팔레트 (⌘K)">
    <FiSearch size={13} />
    <span>검색</span>
    <Sep />
    <FiCommand size={11} />
    <Key>K</Key>
  </Btn>
)

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20,20,24,0.85)' : 'rgba(255,255,255,0.92)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow:
    0 8px 24px rgba(15, 23, 42, 0.12),
    0 1px 3px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(8px);
  transition:
    color 0.12s,
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.1s;

  &:hover {
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.45);
    box-shadow:
      0 12px 28px rgba(15, 23, 42, 0.16),
      0 1px 3px rgba(15, 23, 42, 0.08);
  }

  &:active {
    transform: translateY(1px);
  }
`

const Sep = styled.span`
  width: 1px;
  height: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
  margin: 0 2px;
`

const Key = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
`
