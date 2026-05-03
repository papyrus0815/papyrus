/**
 * 다중 선택 결과를 chip 형태로 표시 + 개별 X로 제거 가능.
 *
 * 사용처: 역사 모달의 "연결 현대국가" / "후임 국가" 등.
 */
import React from 'react'

import { FiX } from 'react-icons/fi'
import styled from 'styled-components'

export interface ChipItem {
  id: string
  label: string
  /** 선택적 좌측 아이콘 (예: 국기 이모지) */
  icon?: React.ReactNode
}

interface SelectionChipsProps {
  items: ChipItem[]
  onRemove?: (id: string) => void
  /** 비어있을 때 메시지 (생략 시 아무것도 안 보여줌) */
  emptyText?: string
  /** 더 추가하기 버튼 라벨 (생략 시 미표시) */
  addLabel?: string
  onAdd?: () => void
}

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px 5px 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.12)'
      : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#c7d2fe'};
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : '#e0e7ff'};
  }
`

const ChipIcon = styled.span`
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
`

const RemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  transition:
    opacity 0.12s,
    background 0.12s;

  &:hover {
    opacity: 1;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(67,56,202,0.12)'};
  }
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.06)' : '#f5f7ff'};
  }
`

const EmptyText = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export function SelectionChips({
  items,
  onRemove,
  emptyText,
  addLabel,
  onAdd,
}: SelectionChipsProps) {
  if (items.length === 0 && !addLabel && !emptyText) return null

  return (
    <Wrap>
      {items.map((item) => (
        <Chip key={item.id}>
          {item.icon && <ChipIcon>{item.icon}</ChipIcon>}
          <span>{item.label}</span>
          {onRemove && (
            <RemoveBtn
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`${item.label} 제거`}
            >
              <FiX size={12} />
            </RemoveBtn>
          )}
        </Chip>
      ))}
      {items.length === 0 && emptyText && <EmptyText>{emptyText}</EmptyText>}
      {addLabel && onAdd && (
        <AddBtn type="button" onClick={onAdd}>
          + {addLabel}
        </AddBtn>
      )}
    </Wrap>
  )
}
