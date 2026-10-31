/**
 * 라벨 열 폼 — 사건 등록 모달과 같은 문법의 공용 조각.
 *
 *   인물        ( 🖼 마오 쩌둥 )
 *   ─────────────────────────────────────────
 *   국가 *      [ 국가 선택                ▾ ]
 *   ─────────────────────────────────────────
 *   대수·기수 (선택)   대수 [    ]   기수 [    ]
 *   ─────────────────────────────────────────
 *   취임 (선택)  (직접 선거)(간접 선거)(임명)…
 *               [ 어떻게 취임했나…          ]
 *
 * 섹션 머리 없이 [라벨 | 입력] 두 열 행을 가는 선으로 가른다. 필수는 빨간 *, 선택은 회색 (선택).
 * 재임 등록·군주 재위 등록 모달이 함께 쓴다 — 한쪽만 고치면 두 모달이 어긋나므로 여기서 고칠 것.
 * 공용 FieldRow/FieldLabel/FieldControl/Required를 감싸 덮으므로, 그걸 쓰는 하위 컴포넌트
 * (DateRangeField 등)도 이 래퍼 안에서 같은 모양이 된다.
 */
import styled from 'styled-components'

import {
  KitChipGroup,
  KitChoiceChip,
  KitOptionalTag,
} from '@/shared/ui/register-form-kit/register-form-kit'

import {
  DateFieldsRow,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  Required,
} from './register-form-layout.styles'

/** 라벨 열 폭 — 사건 등록 폼(FormRow)·인물 등록 폼(PersonFormLayoutWrap)과 동일한 200px */
export const LABELED_ROW_LABEL_COL = 200
/** 라벨 열과 입력 열 사이 — 사건 등록 폼과 동일한 24px */
export const LABELED_ROW_GAP = 24

/**
 * 섹션 묶음 — 사건 등록 폼(BasicInfoSection FormGroup)과 동일한 규격.
 * 개별 행(FieldRow)마다 그어 두던 구분선을 걷고, 성격이 같은 행끼리 묶어 그룹 경계에만 선을 둔다.
 */
export const FormGroup = styled.section`
  display: flex;
  flex-direction: column;
  padding: 0 0 4px;

  & + & {
    padding-top: 14px;
  }

  > ${FieldRow} {
    padding: 8px 0;
    border-bottom: none;
  }
`

/** 섹션 묶음 머리글 — 사건·인물 등록 폼 장 머리글(15px/700)과 동일 */
export const FormGroupTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const LabeledRowsWrap = styled.div`
  width: 100%;
  min-width: 0;

  ${FieldRow} {
    display: grid;
    grid-template-columns: ${LABELED_ROW_LABEL_COL}px minmax(0, 1fr);
    gap: 8px ${LABELED_ROW_GAP}px;
    align-items: start;
    padding: 12px 0;
    border-bottom: none;

    @media (max-width: 1024px) {
      grid-template-columns: 160px minmax(0, 1fr);
      column-gap: 16px;
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 10px 0;
    }
  }
  ${FieldRow}:first-child {
    padding-top: 4px;
  }
  ${FieldRow}:last-child {
    border-bottom: none;
    padding-bottom: 4px;
  }
  ${FieldLabel} {
    display: block;
    padding-top: 10px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.primary};

    @media (max-width: 768px) {
      padding-top: 0;
    }
  }
  ${FieldControl} {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 680px;
    width: 100%;
    min-width: 0;
  }
  ${FieldControl} ${FieldHint} {
    margin-top: 0;
    font-size: 12px;
    line-height: 1.5;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
    word-break: keep-all;
  }
  ${DateFieldsRow} {
    max-width: none;
  }
  /* 필수 표시 — 점 대신 사건 모달과 같은 빨간 * (스크린리더 텍스트는 그대로) */
  ${Required} {
    display: inline;
    width: auto;
    height: auto;
    margin-left: 4px;
    border-radius: 0;
    background: none;
    vertical-align: baseline;
    overflow: visible;
    &::after {
      content: '*';
      font-size: 14px;
      font-weight: 400;
      color: #ef4444;
    }
  }
`

/** 선택(비필수) 라벨 옆 표기 — 사건 등록 모달의 KitOptionalTag 정본 사용 */
export const OptionalTag = KitOptionalTag

/** 한 행 안의 2~4열 소항목(국가·기간·대수·기수·왕조 서수 등) — 사건 폼 DateRangeGrid(gap 16px) 규격 */
export const SubFieldPair = styled.div<{ $cols?: 2 | 3 | 4 }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols = 2 }) => $cols}, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`
export const SubField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`
/** 소항목 라벨 — 사건 폼 DateRangeLabel(KitGroupLabel: 11px/700)과 동일 */
export const SubFieldLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
`

/** 방식·사유 칩 — 사건 등록 폼 KitChipGroup / KitChoiceChip(36px 알약 + 안쪽 링) 정본 사용 */
export const ChoiceChips = KitChipGroup
export const ChoiceChip = KitChoiceChip

/** 인물 행 — 원형 사진 + 이름 (배경 없는 플랫 칩) */
export const PersonChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  padding: 0;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`
export const PersonChipThumb = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/** 등록 버튼 옆 — 아직 비어 있는 필수 항목 */
export const FooterMissingHint = styled.span`
  margin-right: auto;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 목록의 마지막 낱말 받침에 맞춘 목적격 조사 — '취임일을', '국가를' */
export function objectParticle(word: string): '을' | '를' {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를'
}
