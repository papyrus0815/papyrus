/**
 * 인물 등록/수정 폼의 "소속·가문" 탭.
 * - 국가(필수) + 출생지/사망지(자유 텍스트 또는 city/admin-division 매핑)
 * - 가문 / 종교 — 검색형 SelectModal로 진입
 */
import React from 'react'

import { FiChevronDown, FiCopy } from 'react-icons/fi'
import styled from 'styled-components'

import {
  PlaceSelect as PlaceAutocomplete,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { FONT, InlineFields, RADIUS, SelectBtn } from '../_form-primitives'

export interface AffiliationSectionProps {
  fid: (key: string) => string
  /** 출생지/사망지 자동완성의 국가 스코프 (국적 선택은 코어에서 처리) */
  countryId: string
  // 출생지/사망지
  birthPlace: PlaceResult | null
  deathPlace: PlaceResult | null
  setBirthPlace: (p: PlaceResult | null) => void
  setDeathPlace: (p: PlaceResult | null) => void
  setBirthCityId: (id: string) => void
  setDeathCityId: (id: string) => void
  /** 출생지를 사망지로 복사하는 핸들러 — 부모가 토스트까지 처리 */
  onCopyBirthToDeathPlace: () => void
  // 가문/종교
  dynastyLabel: string
  religionLabel: string
  setShowDynastyModal: (v: boolean) => void
  setShowReligionModal: (v: boolean) => void
  markDirty: () => void
}

export function AffiliationSection({
  fid,
  countryId,
  birthPlace,
  deathPlace,
  setBirthPlace,
  setDeathPlace,
  setBirthCityId,
  setDeathCityId,
  onCopyBirthToDeathPlace,
  dynastyLabel,
  religionLabel,
  setShowDynastyModal,
  setShowReligionModal,
  markDirty,
}: AffiliationSectionProps) {
  return (
    <FormRows>
      <FieldRow>
        <FieldLabel>출생지</FieldLabel>
        <FieldControl>
          <PlaceAutocompleteWrap>
            <PlaceAutocomplete
              value={birthPlace}
              onChange={(place) => {
                setBirthPlace(place)
                setBirthCityId(place?.cityId ?? '')
                markDirty()
              }}
              countryId={countryId || undefined}
            />
          </PlaceAutocompleteWrap>
        </FieldControl>
      </FieldRow>
      <FieldRow>
        <FieldLabel>사망지</FieldLabel>
        <FieldControl>
          {birthPlace && (
            <InlineActionBtn
              type="button"
              onClick={onCopyBirthToDeathPlace}
              title="출생지를 사망지로 복사"
            >
              <FiCopy size={12} />
              출생지와 동일
            </InlineActionBtn>
          )}
          <PlaceAutocompleteWrap>
            <PlaceAutocomplete
              value={deathPlace}
              onChange={(place) => {
                setDeathPlace(place)
                setDeathCityId(place?.cityId ?? '')
                markDirty()
              }}
              countryId={countryId || undefined}
            />
          </PlaceAutocompleteWrap>
        </FieldControl>
      </FieldRow>
      <FieldRowMulti>
        <FieldLabel htmlFor={fid('dynasty')}>가문 · 종교</FieldLabel>
        <FieldControl>
          <InlineFields $cols={2}>
            <SelectBtn
              id={fid('dynasty')}
              type="button"
              $hasValue={!!dynastyLabel}
              onClick={() => setShowDynastyModal(true)}
            >
              <span>{dynastyLabel || '가문 선택'}</span>
              <FiChevronDown size={16} />
            </SelectBtn>
            <SelectBtn
              id={fid('religion')}
              type="button"
              $hasValue={!!religionLabel}
              onClick={() => setShowReligionModal(true)}
            >
              <span>{religionLabel || '종교 선택'}</span>
              <FiChevronDown size={16} />
            </SelectBtn>
          </InlineFields>
        </FieldControl>
      </FieldRowMulti>
    </FormRows>
  )
}

// ─── Styled (소속 섹션 — 메인과 형식 동일) ───────────────────────────────────

const PlaceAutocompleteWrap = styled.div`
  width: 100%;
`

/* Top-aligned 패턴 — 비-첫행에만 가벼운 구분선. */
const FieldRowMulti = styled.div`
  display: block;
  padding: 18px 0;
  &:not(:first-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

// InlineFields·SelectBtn·FieldError는 ../_form-primitives에서 import (중복 제거).

const InlineActionBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding: 4px 10px;
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.35)'
        : 'rgba(99,102,241,0.25)'};
  border-radius: ${RADIUS.pill};
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    color: #fff;
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
