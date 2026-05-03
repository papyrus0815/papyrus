/**
 * 글자 수 카운터를 우하단에 띄우는 wrapper. textarea 자체는 children으로 전달.
 *
 * 사용:
 * ```tsx
 * <TextareaWithCounterWrap length={value?.length ?? 0} max={5000}>
 *   <FormInput as="textarea" {...register('description')} ... />
 * </TextareaWithCounterWrap>
 * ```
 *
 * - max 80% 넘으면 노란색, 95% 넘으면 빨간색
 */
import React from 'react'

import styled from 'styled-components'

interface TextareaWithCounterWrapProps {
  length: number
  max?: number
  children: React.ReactNode
}

const Wrap = styled.div`
  position: relative;
  display: block;
`

const Counter = styled.span<{ $tone: 'normal' | 'warn' | 'danger' }>`
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) => {
    if ($tone === 'danger') return theme.colors.alert.danger.fg
    if ($tone === 'warn') return theme.colors.alert.warning.fg
    return theme.colors.text.tertiary
  }};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.85)'};
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
`

export function TextareaWithCounterWrap({
  length,
  max,
  children,
}: TextareaWithCounterWrapProps) {
  const tone =
    max && length > max * 0.95
      ? 'danger'
      : max && length > max * 0.8
        ? 'warn'
        : 'normal'

  return (
    <Wrap>
      {children}
      <Counter $tone={tone}>
        {max
          ? `${length.toLocaleString()} / ${max.toLocaleString()}`
          : length.toLocaleString()}
      </Counter>
    </Wrap>
  )
}
