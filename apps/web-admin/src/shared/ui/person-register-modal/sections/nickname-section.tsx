/**
 * 인물 등록/수정 폼의 별칭(아명·출생명·자·아호·필명 등) 저작 섹션.
 * 반복 행(유형 + 별칭 텍스트) — 저장 시 통째로 delete-and-recreate(백엔드 PersonNickname).
 * 개명 인물의 출생명·동아시아 군주의 아명 등 "출생 정보"를 별도 컬럼 신설 없이 담는다
 * (Wikidata P1477 birth name — 전용 birthName 컬럼 대신 nickname.type 정식화).
 */
import React from 'react'

import { FiChevronDown, FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  NICKNAME_TYPE_OPTIONS,
  normalizeNicknameType,
} from '@/shared/lib/nickname-type-labels'
import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import {
  AddRowBtn,
  FONT,
  RADIUS,
  inputFocusMixin,
  mobileInputFontMixin,
} from '../_form-primitives'

export interface NicknameRow {
  nickname: string
  /** 별칭 유형 토큰 (PersonNicknameType) 또는 '' (미분류) */
  type: string
  /** 이 별칭이 붙은 이유·유래 (선택). type=분류와 직교. */
  reason: string
}

export interface NicknameSectionProps {
  rows: NicknameRow[]
  setRows: React.Dispatch<React.SetStateAction<NicknameRow[]>>
  markDirty: () => void
}

export function NicknameSection({
  rows,
  setRows,
  markDirty,
}: NicknameSectionProps) {
  const update = (idx: number, patch: Partial<NicknameRow>) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
    markDirty()
  }
  const add = () => {
    setRows((prev) => [...prev, { nickname: '', type: '', reason: '' }])
    markDirty()
  }
  const remove = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
    markDirty()
  }
  return (
    <FormRows>
      <FieldRow>
        <FieldLabel>별칭</FieldLabel>
        <FieldHint>
          출생명·아명·자(字)·호·필명도 여기에서 유형을 골라 등록해요.
        </FieldHint>
        <FieldControl>
          {rows.map((row, idx) => (
            <NicknameRowWrap key={idx}>
              <NicknameTopRow>
                <TypeSelectWrap>
                  <TypeSelect
                    // draft 복원 등으로 남은 레거시 자유 문자열도 정규화해 표시 — 저장값과 표시 일치
                    value={normalizeNicknameType(row.type)}
                    onChange={(event) => update(idx, { type: event.target.value })}
                    aria-label="별칭 유형"
                  >
                    <option value="">미분류</option>
                    {NICKNAME_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </TypeSelect>
                  <SelectCaret>
                    <FiChevronDown size={16} />
                  </SelectCaret>
                </TypeSelectWrap>
                <NameInput
                  value={row.nickname}
                  onChange={(event) => update(idx, { nickname: event.target.value })}
                  placeholder="별칭·출생명·자·호…"
                  aria-label="별칭"
                />
                <RemoveBtn
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="별칭 삭제"
                >
                  <FiX size={14} />
                </RemoveBtn>
              </NicknameTopRow>
              {/* 이유·유래 — type(분류)과 직교. 산문이라 하단 풀폭 입력. */}
              <ReasonInput
                value={row.reason}
                onChange={(event) => update(idx, { reason: event.target.value })}
                placeholder="이 별칭이 붙은 이유·유래 (선택)"
                aria-label="별칭 이유"
                maxLength={300}
              />
            </NicknameRowWrap>
          ))}
          <AddRowBtn type="button" onClick={add}>
            <FiPlus size={16} />
            별칭 추가
          </AddRowBtn>
        </FieldControl>
      </FieldRow>
    </FormRows>
  )
}

// ─── Styled ──────────────────────────────────────────────────────────────────

const NicknameRowWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  & + & {
    margin-top: 12px;
  }
`

const NicknameTopRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const baseInput = `
  height: 36px;
  padding: 0 10px;
  font-size: ${FONT.body};
  border-radius: ${RADIUS.control};
`

const TypeSelectWrap = styled.div`
  position: relative;
  flex: 0 0 132px;
`

const TypeSelect = styled.select`
  ${baseInput}
  width: 100%;
  appearance: none;
  padding-right: 28px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  cursor: pointer;
  ${mobileInputFontMixin}
  ${({ theme }) => inputFocusMixin(theme)}
`

const SelectCaret = styled.span`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
`

const NameInput = styled.input`
  ${baseInput}
  flex: 1 1 auto;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  ${mobileInputFontMixin}
  ${({ theme }) => inputFocusMixin(theme)}
`

/** 별칭 이유·유래 — 상단 행(유형+별칭) 아래 풀폭. 삭제 버튼 폭만큼 우측 여백을 둬 정렬. */
const ReasonInput = styled.input`
  ${baseInput}
  width: 100%;
  height: 32px;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa'};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  ${mobileInputFontMixin}
  &:focus {
    outline: none;
    border-style: solid;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const RemoveBtn = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'};
  }
`

