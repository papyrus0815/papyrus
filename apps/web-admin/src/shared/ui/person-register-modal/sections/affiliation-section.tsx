/**
 * 인물 등록/수정 폼의 "가문·종교" 탭.
 * - 가문 / 종교 — 검색형 SelectModal로 진입
 * (출생지/사망지는 생애 상세의 place-fields.tsx로 이관 — 출생 날짜와 한 흐름에 둔다.)
 */
import React from 'react'

import styled from 'styled-components'

import {
  FieldControl,
  FieldLabel,
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
  markDirty: () => void
}

export function AffiliationSection({
  dynastyOptions,
  religionOptions,
  dynastyValue,
  religionValue,
  onDynastyChange,
  onReligionChange,
  markDirty,
}: AffiliationSectionProps) {
  return (
    <FormRows>
      <FieldRowMulti>
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
        </FieldControl>
      </FieldRowMulti>
    </FormRows>
  )
}

// ─── Styled ──────────────────────────────────────────────────────────────────

/* Top-aligned 패턴 — 비-첫행에만 가벼운 구분선. */
const FieldRowMulti = styled.div`
  display: block;
  padding: 18px 0;
  &:not(:first-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`
