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
      {/* 출생지·사망지 2열 — 병렬 개념이라 나란히 두어 세로 길이를 줄인다(≤640px 1열). */}
      <PlaceGrid>
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
          {/* 복사 버튼을 라벨 행 우측에 둬, birthPlace 유무로 autocomplete 위치가
              흔들리는(raggedness) 문제를 없앤다. */}
          <DeathLabelRow>
            <FieldLabel>사망지</FieldLabel>
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
          </DeathLabelRow>
          <FieldControl>
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
      </PlaceGrid>
    </FormRows>
  )
}

// ─── Styled ──────────────────────────────────────────────────────────────────

/**
 * 출생지·사망지 묶음 — 옆 라벨 행 문법(PersonFormLayoutWrap)에선 두 칸이 **각자 한 행**이라
 * 묶음 상자를 지운다(display: contents). 예전 2열 그리드는 위 라벨 시절 배치.
 */
const PlaceGrid = styled.div`
  display: contents;
`

/*
 * 사망지 머리 줄 — 라벨 열(200px) 안에서 '사망지' 아래에 '출생지와 동일' 글 버튼을 둔다.
 * 레이아웃(세로 스택)은 PersonFormLayoutWrap의 `FieldRow > :has(> FieldLabel)` 규칙이 정한다.
 */
const DeathLabelRow = styled.div``

const PlaceAutocompleteWrap = styled.div`
  width: 100%;
`

/** '출생지와 동일' — 테 없는 글 버튼(폼의 '+ 추가' 버튼과 같은 언어), 라벨 줄 높이 안에 든다 */
const InlineActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin-right: -6px;
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.active};
  background: transparent;
  border: none;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
