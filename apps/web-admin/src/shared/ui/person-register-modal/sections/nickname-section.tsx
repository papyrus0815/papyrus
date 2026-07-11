/**
 * 인물 등록/수정 폼의 별칭(아명·출생명·자·아호·필명 등) 저작 섹션.
 * 반복 행(유형 + 별칭 텍스트) — 저장 시 통째로 delete-and-recreate(백엔드 PersonNickname).
 * 개명 인물의 출생명·동아시아 군주의 아명 등 "출생 정보"를 별도 컬럼 신설 없이 담는다
 * (Wikidata P1477 birth name — 전용 birthName 컬럼 대신 nickname.type 정식화).
 */
import React from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import { FONT, RADIUS } from '../_form-primitives'

export interface NicknameRow {
  nickname: string
  type: string
  /** 이 별칭이 붙은 이유·유래 (선택). type=분류와 직교. */
  reason: string
}

export interface NicknameSectionProps {
  rows: NicknameRow[]
  setRows: React.Dispatch<React.SetStateAction<NicknameRow[]>>
  markDirty: () => void
  /** datalist·라벨 id 유일화 (한 페이지 다중 폼 대비) */
  fid: (name: string) => string
}

/** 유형 프리셋 — 자유 입력도 허용(datalist). 표기 흔들림 방지용 권장값. */
const TYPE_PRESETS = ['아명', '출생명', '자(字)', '아호(雅號)', '시호', '필명', '별명']

export function NicknameSection({
  rows,
  setRows,
  markDirty,
  fid,
}: NicknameSectionProps) {
  const listId = fid('nickname-type-presets')
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
        <FieldControl>
          <datalist id={listId}>
            {TYPE_PRESETS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
          {rows.map((row, idx) => (
            <NicknameRowWrap key={idx}>
              <NicknameTopRow>
                <TypeInput
                  list={listId}
                  value={row.type}
                  onChange={(event) => update(idx, { type: event.target.value })}
                  placeholder="유형(아명·출생명…)"
                  aria-label="별칭 유형"
                />
                <NameInput
                  value={row.nickname}
                  onChange={(event) => update(idx, { nickname: event.target.value })}
                  placeholder="별칭"
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
          <AddBtn type="button" onClick={add}>
            <FiPlus size={13} />
            별칭 추가
          </AddBtn>
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

const TypeInput = styled.input`
  ${baseInput}
  flex: 0 0 132px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const NameInput = styled.input`
  ${baseInput}
  flex: 1 1 auto;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
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
  &:focus {
    outline: none;
    border-style: solid;
    border-color: ${({ theme }) => theme.colors.primary};
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

const AddBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  padding: 6px 12px;
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)'};
  border-radius: ${RADIUS.pill};
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  &:hover {
    color: #fff;
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`
