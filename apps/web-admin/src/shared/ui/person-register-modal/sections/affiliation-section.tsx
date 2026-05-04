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

const InlineFields = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: ${(p) => `repeat(${p.$cols ?? 3}, 1fr)`};
  gap: 10px;
  width: 100%;
  & > div {
    min-width: 0;
  }
  input,
  select,
  button {
    max-width: 100%;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

/** 인물 모달 SelectBtn — FormInput과 동일 톤(r8 + 채움 + hover시 흰배경) */
const SelectBtn = styled.button<{ $hasValue?: boolean; $error?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  font-size: 14px;
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error
        ? theme.colors.alert.danger.fg
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  }
  &:focus-visible {
    border-color: ${FOCUS_COLOR};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
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
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.35)'
        : 'rgba(99,102,241,0.25)'};
  border-radius: 999px;
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

const FieldError = styled.span`
  ${() => css``}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
  margin-top: 6px;
  line-height: 1.4;
  svg {
    flex-shrink: 0;
  }
`
