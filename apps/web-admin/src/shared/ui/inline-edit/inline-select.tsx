import { type ReactNode, useState } from 'react'

import { FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

import * as S from './inline.styles'

export interface InlineSelectOption {
  value: string
  label: string
}

interface InlineSelectProps {
  value: string
  options: InlineSelectOption[]
  onSave: (next: string) => void
  /** read 모드 라벨 — value에 매칭되는 option.label 우선, 없으면 placeholder. */
  placeholder?: string
  /** 스크린리더용 필드명 — 트리거 "{label} 변경", select aria-label. 미지정 시 placeholder/일반 폴백. */
  label?: string
  /** read 모드 prefix(카테고리 칩 등). */
  prefix?: ReactNode
  className?: string
}

/**
 * 명시 ▾ 트리거 select 편집.
 *
 * - read 모드 라벨은 클릭해도 아무 일 없음 — 옆 ▾ 버튼만 트리거.
 * - ▾ 클릭 → native select 등장. change 시 즉시 저장. blur/Esc → 취소.
 */
export function InlineSelect({
  value,
  options,
  onSave,
  placeholder = '선택',
  label,
  prefix,
  className,
}: InlineSelectProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <S.InlineSelectEl
        autoFocus
        aria-label={label ?? placeholder}
        value={value}
        onChange={(e) => {
          const next = e.target.value
          setEditing(false)
          if (next !== value) onSave(next)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </S.InlineSelectEl>
    )
  }

  const current = options.find((opt) => opt.value === value)
  const isEmpty = !current
  return (
    <ReadHost className={className} data-edit-host>
      <ReadValue data-empty={isEmpty || undefined}>
        {prefix}
        {current ? current.label : placeholder}
      </ReadValue>
      <ChevronTrigger
        type="button"
        onClick={() => setEditing(true)}
        aria-label={label ? `${label} 변경` : '선택 변경'}
      >
        <FiChevronDown />
      </ChevronTrigger>
    </ReadHost>
  )
}

const ReadHost = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const ReadValue = styled.span`
  ${S.editableTrigger}
`

/**
 * select 트리거는 ✎ 대신 ▾ chevron — 드롭다운 표준 어포던스.
 * 호스트 hover/focus-within 시에만 옅게 노출.
 */
const ChevronTrigger = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s;

  /* WCAG 2.5.8 — 투명 hit-area로 터치 타깃만 24px 확보(시각 ▾ 크기 유지). */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 24px;
    height: 24px;
    transform: translate(-50%, -50%);
  }

  [data-edit-host]:hover &,
  [data-edit-host]:focus-within & {
    opacity: 0.6;
  }

  &:hover,
  &:focus-visible {
    opacity: 1 !important;
    outline: none;
  }

  /* 터치/펜 등 hover 미지원 환경 — ▾ 트리거가 영영 안 보이는 문제 방지. */
  @media (hover: none) {
    opacity: 0.55;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`
