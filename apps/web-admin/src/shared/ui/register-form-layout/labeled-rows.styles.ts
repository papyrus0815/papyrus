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

/*
 * ⚠️ 값은 사건 등록 폼의 **현재** 규격을 옮겨 적은 것이다 — 원본은
 *   pages/events/create/event-create.styles.ts (FormRow·FormLabel·FormField·Required·DateRangeLabel)
 *   widgets/event-form/ui/basic-info-section.tsx (FormGroup·FormGroupTitle)
 * shared가 pages/widgets를 import할 수 없어 공유가 아니라 사본이다. 2026-11-02 사건 폼 재디자인
 * (라벨 200→148px·회색 13px 라벨·점+구분선 머리글·38px 칸) 때 이쪽이 안 따라가서 재위·재임 모달만
 * '다른 느낌'이 됐다(11-05 재동기화). 사건 폼 규격을 바꾸면 여기도 같이 바꿀 것.
 */

/** 라벨 열 폭 — 사건 등록 폼 FormRow와 동일한 148px(≤1024px 132px) */
export const LABELED_ROW_LABEL_COL = 148
/** 라벨 열과 입력 열 사이 — 사건 등록 폼과 동일한 24px(≤1024px 18px) */
export const LABELED_ROW_GAP = 24

/** 라벨·소항목 라벨 색 — 사건 폼 getC(theme).text.secondary(테마 secondary보다 한 단계 옅다) */
const eventLabelColor = (mode: string) => (mode === 'dark' ? '#a1a1aa' : '#64748b')

/**
 * 섹션 묶음 — 사건 등록 폼(BasicInfoSection FormGroup)과 동일한 규격.
 * 개별 행(FieldRow)마다 그어 두던 구분선을 걷고, 성격이 같은 행끼리 묶어 그룹 경계에만 선을 둔다.
 */
export const FormGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 12px;

  & + & {
    margin-top: 28px;
    padding-top: 6px;
  }

  > ${FieldRow} {
    padding: 14px 0;
    border-bottom: none;
  }
`

/** 섹션 묶음 머리글 — 사건 등록 폼과 동일: 앞에 점, 아래 가는 선(14px/700) */
export const FormGroupTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0 0 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
`

export const LabeledRowsWrap = styled.div`
  width: 100%;
  min-width: 0;

  ${FieldRow} {
    display: grid;
    grid-template-columns: ${LABELED_ROW_LABEL_COL}px minmax(0, 1fr);
    gap: 8px ${LABELED_ROW_GAP}px;
    align-items: start;
    padding: 14px 0;
    border-bottom: none;

    @media (max-width: 1024px) {
      grid-template-columns: 132px minmax(0, 1fr);
      column-gap: 18px;
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
    padding-top: 9px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    letter-spacing: -0.01em;
    color: ${({ theme }) => eventLabelColor(theme.mode)};

    @media (max-width: 768px) {
      padding-top: 0;
    }
  }
  ${FieldControl} {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: none;
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
    margin-left: 2px;
    border-radius: 0;
    background: none;
    vertical-align: baseline;
    overflow: visible;
    &::after {
      content: '*';
      font-size: 13px;
      font-weight: 400;
      color: #ef4444;
    }
  }
`

/** 선택(비필수) 라벨 옆 표기 — 사건 등록 모달의 KitOptionalTag 정본 사용 */
export const OptionalTag = KitOptionalTag

/** 한 행 안의 2~4열 소항목(국가·기간·대수·기수·왕조 서수 등) — 사건 폼 DateRangeGrid(gap 18px) 규격 */
export const SubFieldPair = styled.div<{ $cols?: 2 | 3 | 4 }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols = 2 }) => $cols}, minmax(0, 1fr));
  gap: 18px;
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
/** 소항목 라벨('즉위일'·'왕호' 등) — 사건 폼 DateRangeLabel('시작'·'종료': 11.5px/700, 대문자·자간 없음) */
export const SubFieldLabel = styled.label`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => eventLabelColor(theme.mode)};
  letter-spacing: -0.01em;
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
