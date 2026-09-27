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
  DateFieldsRow,
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  Required,
} from './register-form-layout.styles'

/** 라벨 열 폭 — 사건 등록 모달(200px)보다 조금 좁게: 이 폼들의 라벨은 짧다 */
export const LABELED_ROW_LABEL_COL = 168
/** 라벨 열과 입력 열 사이 */
export const LABELED_ROW_GAP = 24

export const LabeledRowsWrap = styled.div`
  width: 100%;
  min-width: 0;

  ${FieldRow} {
    display: grid;
    grid-template-columns: ${LABELED_ROW_LABEL_COL}px minmax(0, 1fr);
    gap: ${LABELED_ROW_GAP}px;
    align-items: start;
    padding: 18px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 14px 0;
    }
  }
  /* 첫 행 위 여백은 스크롤 영역이 이미 준다(사건 모달과 같은 처리) · 마지막 행은 선 없음 */
  ${FieldRow}:first-child {
    padding-top: 4px;
  }
  ${FieldRow}:last-child {
    border-bottom: none;
  }
  ${FieldLabel} {
    display: block;
    padding-top: 10px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.primary};
    letter-spacing: -0.01em;

    @media (max-width: 720px) {
      padding-top: 0;
    }
  }
  ${FieldControl} {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 640px;
    width: 100%;
  }
  ${FieldControl} ${FieldHint} {
    margin-top: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  ${DateFieldsRow} {
    max-width: none;
  }
  /* 필수 표시 — 점 대신 사건 모달과 같은 빨간 * (스크린리더 텍스트는 그대로) */
  ${Required} {
    width: auto;
    height: auto;
    margin-left: 4px;
    background: none;
    vertical-align: baseline;
    overflow: visible;
    &::after {
      content: '*';
      font-size: 14px;
      color: #ef4444;
    }
  }
`

/** 선택(비필수) 라벨 옆 표기 — 사건 등록 모달의 OptionalTag와 같은 모양 */
export const OptionalTag = styled.span`
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 한 행 안의 두 소항목(대수·기수 등) — 사건 모달의 시작일/종료일 소제목 문법 */
export const SubFieldPair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`
export const SubField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`
export const SubFieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 방식·사유 칩 — 사건 카테고리 칩 문법(10~11개라 드롭다운보다 한눈에). 다시 누르면 해제 */
export const ChoiceChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`
export const ChoiceChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ $selected, theme }) => ($selected ? '#6366f1' : theme.colors.border.default)};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.1)'
      : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected ? (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca') : theme.colors.text.secondary};
  font-size: 13px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;

  &:hover {
    border-color: ${({ $selected, theme }) => ($selected ? '#6366f1' : theme.colors.text.tertiary)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #6366f1;
  }
`

/** 인물 행 — 원형 사진 + 이름 한 알 */
export const PersonChip = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 6px 14px 6px 6px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`
export const PersonChipThumb = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.primary};
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
