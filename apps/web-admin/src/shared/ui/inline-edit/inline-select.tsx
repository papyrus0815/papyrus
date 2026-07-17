import { type ReactNode, useState } from 'react'

import { FiCheck, FiChevronDown } from 'react-icons/fi'
import styled from 'styled-components'

import { Modal } from '@/shared/ui/modal'

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
  /** 스크린리더용·모달 제목용 필드명. 미지정 시 placeholder/일반 폴백. */
  label?: string
  /** read 모드 prefix(카테고리 칩 등). */
  prefix?: ReactNode
  className?: string
}

/**
 * 명시 ▾ 트리거 select 편집 — *모달 옵션 피커*.
 *
 * - read 모드 라벨은 클릭해도 아무 일 없음 — 옆 ▾ 버튼만 트리거.
 * - ▾ 클릭 → 옵션 목록 모달(글래스). 옵션 클릭 시 즉시 저장 후 닫힘.
 * - native select 대신 모달이라 좁은 인라인 트리거에서도 목록이 읽기 쉽고 터치 친화적.
 *   (공용 [[web-admin-modal-foundation]] <Modal> 재사용 — Esc/포커스트랩/스크롤락 일괄.)
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
  const [open, setOpen] = useState(false)

  const current = options.find((opt) => opt.value === value)
  const isEmpty = !current

  const pick = (next: string) => {
    setOpen(false)
    if (next !== value) onSave(next)
  }

  return (
    <ReadHost className={className} data-edit-host>
      <ReadValue data-empty={isEmpty || undefined}>
        {prefix}
        {current ? current.label : placeholder}
      </ReadValue>
      <ChevronTrigger
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label ? `${label} 변경` : '선택 변경'}
      >
        <FiChevronDown />
      </ChevronTrigger>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={label ?? '선택'}
        size="narrow"
      >
        <OptList role="listbox" aria-label={label ?? '옵션 선택'}>
          <OptRow
            type="button"
            role="option"
            aria-selected={isEmpty}
            $active={isEmpty}
            onClick={() => pick('')}
          >
            <OptLabel $muted>{placeholder}</OptLabel>
            {isEmpty && <FiCheck />}
          </OptRow>
          {options.map((opt) => {
            const selected = opt.value === value
            return (
              <OptRow
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                $active={selected}
                onClick={() => pick(opt.value)}
              >
                <OptLabel>{opt.label}</OptLabel>
                {selected && <FiCheck />}
              </OptRow>
            )
          })}
        </OptList>
      </Modal>
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

const OptList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: min(60vh, 420px);
  overflow-y: auto;
`

const OptRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  border-radius: 10px;
  font: inherit;
  font-size: 0.9375rem;
  text-align: left;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.hover : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: background 0.12s;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primary};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const OptLabel = styled.span<{ $muted?: boolean }>`
  min-width: 0;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : 'inherit'};
`
