/**
 * 인물 등록/수정 폼의 "소속·가문" 탭.
 * - 국가(필수) + 출생지/사망지(자유 텍스트 또는 city/admin-division 매핑)
 * - 가문 / 종교 — 검색형 SelectModal로 진입
 */
import React from 'react'

import { FiAlertCircle, FiChevronDown, FiCopy } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  PlaceSelect as PlaceAutocomplete,
  type PlaceResult,
} from '@/shared/ui/place-autocomplete/place-autocomplete'
import {
  FOCUS_COLOR,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Required,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

export interface AffiliationSectionProps {
  fid: (key: string) => string
  // 국가
  countryId: string
  countryName: string
  setShowCountryModal: (v: boolean) => void
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
  // 검증·dirty
  errors: Record<string, string>
  markDirty: () => void
}

export function AffiliationSection({
  fid,
  countryId,
  countryName,
  setShowCountryModal,
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
  errors,
  markDirty,
}: AffiliationSectionProps) {
  return (
    <FormRows>
      <FieldRow>
        <FieldLabel htmlFor={fid('countryId')}>
          소속(출생) 국가 <Required>*</Required>
        </FieldLabel>
        <FieldControl>
          <SelectBtn
            id={fid('countryId')}
            type="button"
            $hasValue={!!countryName}
            $error={!!errors.countryId}
            aria-invalid={!!errors.countryId}
            aria-describedby={
              errors.countryId ? fid('countryId-err') : undefined
            }
            onClick={() => setShowCountryModal(true)}
          >
            <span>{countryName || '국가 선택'}</span>
            <FiChevronDown size={18} />
          </SelectBtn>
          {errors.countryId && (
            <FieldError id={fid('countryId-err')} role="alert">
              <FiAlertCircle size={13} />
              {errors.countryId}
            </FieldError>
          )}
        </FieldControl>
      </FieldRow>
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
              <span>{dynastyLabel || '가문 — 선택'}</span>
              <FiChevronDown size={16} />
            </SelectBtn>
            <SelectBtn
              id={fid('religion')}
              type="button"
              $hasValue={!!religionLabel}
              onClick={() => setShowReligionModal(true)}
            >
              <span>{religionLabel || '종교 — 선택'}</span>
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
  max-width: 480px;
  width: 100%;
`

const FieldRowMulti = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 220px) 1fr;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const InlineFields = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${(p) => `repeat(${p.$cols ?? 3}, 1fr)`};
  gap: 12px;
  max-width: 600px;
  & > div {
    min-width: 0;
  }
  input,
  select,
  button {
    max-width: 100%;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const SelectBtn = styled.button<{ $hasValue?: boolean; $error?: boolean }>`
  width: 100%;
  max-width: 460px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ $error, theme }) =>
    $error
      ? theme.colors.alert.danger.bg
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#fff'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? '#ea4335' : theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#f9fafb'};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  span {
    flex: 1;
  }
`

const InlineActionBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.alert.info.border};
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const FieldError = styled.span`
  ${() => css``}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #dc2626;
  margin-top: 6px;
  line-height: 1.4;
  svg {
    flex-shrink: 0;
  }
`
