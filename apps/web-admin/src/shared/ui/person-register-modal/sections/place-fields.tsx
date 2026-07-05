/**
 * 인물 등록/수정 폼의 출생지·사망지 입력 (생애 상세 영역).
 *
 * 원래 '소속·가문' 섹션에 있던 장소 입력을 생애 상세로 이관 — 출생 정보(날짜)와
 * 한 흐름에 두어 "출생은 날짜밖에 못 넣는다"는 발견성 비대칭을 해소한다.
 * (Wikipedia infobox처럼 출생=날짜+장소가 한 몸.)
 * PlaceAutocomplete는 비동기 검색 컴포넌트라 코어(essentials)로 올리지 않고
 * details 영역에 둔다 — 점진 노출 canon 준수.
 */
import React from 'react'

import { FiCopy } from 'react-icons/fi'
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

import { FONT, RADIUS } from '../_form-primitives'

export interface PlaceFieldsProps {
  /** 출생지/사망지 자동완성의 국가 스코프 (국적 선택은 코어에서 처리) */
  countryId: string
  birthPlace: PlaceResult | null
  deathPlace: PlaceResult | null
  setBirthPlace: (p: PlaceResult | null) => void
  setDeathPlace: (p: PlaceResult | null) => void
  setBirthCityId: (id: string) => void
  setDeathCityId: (id: string) => void
  /** 출생지를 사망지로 복사하는 핸들러 — 부모가 토스트까지 처리 */
  onCopyBirthToDeathPlace: () => void
  markDirty: () => void
}

export function PlaceFields({
  countryId,
  birthPlace,
  deathPlace,
  setBirthPlace,
  setDeathPlace,
  setBirthCityId,
  setDeathCityId,
  onCopyBirthToDeathPlace,
  markDirty,
}: PlaceFieldsProps) {
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
    </FormRows>
  )
}

// ─── Styled ──────────────────────────────────────────────────────────────────

const PlaceAutocompleteWrap = styled.div`
  width: 100%;
`

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
