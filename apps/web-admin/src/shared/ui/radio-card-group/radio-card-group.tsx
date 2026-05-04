/**
 * 라디오 카드 그룹 — 3~5개 옵션을 카드 형태로 가로 배치.
 * 각 카드: 아이콘 + 라벨 + 보조 설명/예시.
 * 트렌디한 admin UI 패턴 (Linear, Stripe Dashboard).
 */
import React from 'react'

import { FiCheck } from 'react-icons/fi'
import styled from 'styled-components'

export interface RadioCardOption<V extends string = string> {
  value: V
  label: string
  /** 좌측 큰 아이콘/이모지 */
  icon?: React.ReactNode
  /** 작은 보조 설명 (예시 등) */
  hint?: string
}

interface RadioCardGroupProps<V extends string = string> {
  options: RadioCardOption<V>[]
  value?: V
  onChange: (value: V | undefined) => void
  /** 미지정 옵션 추가 */
  allowEmpty?: boolean
  emptyLabel?: string
}

const Wrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
`

const Card = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
  text-align: left;
  position: relative;
  transition:
    border-color 0.12s,
    box-shadow 0.12s;

  &:hover:not(:focus-visible) {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }

  ${({ $active, theme }) =>
    $active &&
    `
    box-shadow: 0 0 0 1px ${theme.colors.primary};
  `}
`

const IconRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`

const Icon = styled.span`
  font-size: 14px;
  line-height: 1;
`

const CheckMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
`

const Label = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Hint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`

export function RadioCardGroup<V extends string = string>({
  options,
  value,
  onChange,
  allowEmpty,
  emptyLabel = '미지정',
}: RadioCardGroupProps<V>) {
  return (
    <Wrap role="radiogroup">
      {allowEmpty && (
        <Card
          type="button"
          $active={!value}
          onClick={() => onChange(undefined)}
          role="radio"
          aria-checked={!value}
        >
          <IconRow>
            <Label>{emptyLabel}</Label>
            {!value && (
              <CheckMark>
                <FiCheck size={12} />
              </CheckMark>
            )}
          </IconRow>
        </Card>
      )}
      {options.map((opt) => (
        <Card
          key={opt.value}
          type="button"
          $active={value === opt.value}
          onClick={() => onChange(opt.value)}
          role="radio"
          aria-checked={value === opt.value}
        >
          <IconRow>
            <Label>{opt.label}</Label>
            {value === opt.value && (
              <CheckMark>
                <FiCheck size={12} />
              </CheckMark>
            )}
          </IconRow>
          {opt.hint && <Hint>{opt.hint}</Hint>}
        </Card>
      ))}
    </Wrap>
  )
}
