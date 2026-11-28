/**
 * 인물 등록/수정 폼의 "가문·종교" 탭.
 * - 가문 / 종교 — 칸 안에서 검색하는 드롭다운(InlineSearchSelect). 가문 후보엔 기간·구성원 수가 붙는다
 *   (relation-search-options.ts).
 * - 가문이 비었고 아버지에게 가문이 있으면 칸 아래에 한 줄 제안(누르면 지정 — 자동 채움은 안 한다).
 * - 목록에 없는 가문은 검색어 그대로 '새로 등록'(이름만 있는 최소 가문 → 기간 등은 가문 페이지에서).
 * (출생지/사망지는 생애 상세의 place-fields.tsx로 이관 — 출생 날짜와 한 흐름에 둔다.)
 */
import React from 'react'
import { FiCornerDownRight } from 'react-icons/fi'
import styled from 'styled-components'

import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { InlineFields } from '../_form-primitives'
import {
  InlineSearchSelect,
  type SearchOption,
} from './inline-search-select'

export interface AffiliationSectionProps {
  // 가문/종교 — 인라인 검색 콤보박스(모달 대신)
  dynastyOptions: SearchOption[]
  religionOptions: SearchOption[]
  dynastyValue: string
  religionValue: string
  onDynastyChange: (value: string) => void
  onReligionChange: (value: string) => void
  /** 아버지 가문 등 — 가문이 비었을 때만 넘어온다 */
  dynastySuggestion?: { value: string; label: string; meta?: string; basis: string } | null
  /** 검색어로 새 가문을 등록하고 지정 — 없으면 '새로 등록' 행을 숨긴다 */
  onCreateDynasty?: (name: string) => void
  markDirty: () => void
}

export function AffiliationSection({
  dynastyOptions,
  religionOptions,
  dynastyValue,
  religionValue,
  onDynastyChange,
  onReligionChange,
  dynastySuggestion,
  onCreateDynasty,
  markDirty,
}: AffiliationSectionProps) {
  return (
    <FormRows>
      <FieldRow>
        <FieldLabel>가문 · 종교</FieldLabel>
        <FieldControl>
          <InlineFields $cols={2}>
            <InlineSearchSelect
              ariaLabel="가문"
              options={dynastyOptions}
              value={dynastyValue}
              onChange={(next) => {
                onDynastyChange(next)
                markDirty()
              }}
              placeholder="가문 검색·선택"
              /* 고른 뒤에도 기간·구성원 수를 칸에 — 합스부르크 분가 5개처럼 이름이 비슷한 가문을 가른다 */
              showSelectedMeta
              onCreateNew={onCreateDynasty}
              createRequiresQuery
              createLabel={(name) => `'${name}' 가문 새로 등록`}
            />
            <InlineSearchSelect
              ariaLabel="종교"
              options={religionOptions}
              value={religionValue}
              onChange={(next) => {
                onReligionChange(next)
                markDirty()
              }}
              placeholder="종교 검색·선택"
            />
          </InlineFields>
          {dynastySuggestion && (
            <SuggestionBtn
              type="button"
              onClick={() => {
                onDynastyChange(dynastySuggestion.value)
                markDirty()
              }}
            >
              <FiCornerDownRight size={13} aria-hidden />
              <span className="basis">{dynastySuggestion.basis} 가문</span>
              <strong>{dynastySuggestion.label}</strong>
              {dynastySuggestion.meta && <span className="meta">{dynastySuggestion.meta}</span>}
              <span className="action">이 가문으로 지정</span>
            </SuggestionBtn>
          )}
        </FieldControl>
      </FieldRow>
    </FormRows>
  )
}

/** 가문 제안 한 줄 — 칸 바로 아래, 칸 왼쪽 끝에 맞춘 옅은 버튼(누르기 전엔 아무것도 바뀌지 않는다) */
const SuggestionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  margin-top: 6px;
  padding: 4px 10px 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff')};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  line-height: 1.4;
  cursor: pointer;
  text-align: left;

  svg {
    flex: none;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }
  .basis,
  .meta {
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
  }
  .action {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
    white-space: nowrap;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`
