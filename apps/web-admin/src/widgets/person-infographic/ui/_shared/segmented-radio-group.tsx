/**
 * 접근성 갖춘 세그먼트 라디오 그룹.
 * ARIA radiogroup 키보드 계약(화살표/Home/End 이동+선택 + roving tabindex)을 구현한다.
 * 인물 뷰 툴바의 정렬(SortBar)·세기 그룹 순서(EraOrderToggle)가 공유.
 */
import { useRef, type KeyboardEvent } from 'react'

import styled, { css } from 'styled-components'

interface SegmentedRadioGroupProps<T extends string> {
  /** 앞에 붙는 라벨 (예: "정렬") */
  label: string
  /** radiogroup aria-label */
  ariaLabel: string
  /** [값, 표시라벨] 튜플 목록 */
  options: ReadonlyArray<readonly [T, string]>
  value: T
  onChange: (value: T) => void
}

export function SegmentedRadioGroup<T extends string>({
  label,
  ariaLabel,
  options,
  value,
  onChange,
}: SegmentedRadioGroupProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null)

  // ARIA radiogroup 키보드 — 화살표/Home/End로 이동하며 즉시 선택, 포커스도 함께 이동.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1
    let nextIndex = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      nextIndex = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      nextIndex = index === 0 ? last : index - 1
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = last
    else return
    event.preventDefault()
    onChange(options[nextIndex][0])
    const radios =
      groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios?.[nextIndex]?.focus()
  }

  return (
    <Wrap ref={groupRef} role="radiogroup" aria-label={ariaLabel}>
      <Label>{label}</Label>
      {options.map(([optionValue, optionLabel], index) => (
        <Btn
          key={optionValue}
          type="button"
          role="radio"
          aria-checked={value === optionValue}
          // roving tabindex — 선택된 항목만 Tab 순서에 포함, 나머지는 화살표로 접근.
          tabIndex={value === optionValue ? 0 : -1}
          $active={value === optionValue}
          onClick={() => onChange(optionValue)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {optionLabel}
        </Btn>
      ))}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 2px;
  flex-wrap: wrap;
`

const Label = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
`

const Btn = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.12s, color 0.12s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.activeLight};
          color: ${theme.colors.active};
          font-weight: 600;
        `
      : css`
          background: transparent;
          color: ${theme.colors.text.secondary};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
          }
        `}
`
