/**
 * 번호 단락(1·2·3) 목록 — 사건 상세의 *배경*과 *전개*가 공유하는 조판.
 *
 * 디자인 의도
 * - 단락 경계는 구분선이 아니라 **좌측 번호 거터**가 만든다. 본문에서 제목 서식(큰 글자)을
 *   쓰더라도 "여기서부터 새 단락"이 번호 하나로 또렷하고, 항목마다 가로선을 긋던 예전 조판이
 *   만들던 가로 잉크(항목 수 − 1개)를 세로 괘선 한 벌로 회수한다.
 * - 거터 폭은 본문 텍스트 열의 좌측 기준선을 고정한다 — 제목·본문·추가 버튼이 모두 같은 열에서
 *   시작해 번호만 왼쪽으로 돌출한다(장부의 행 번호와 같은 읽기).
 * - 관리(이동·삭제)는 평소 숨기고 *관리 모드*에서만 노출 — 읽기 화면의 아이콘 잡음 제거.
 */
import { FiArrowDown, FiArrowUp, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { type MentionItem } from '@/shared/lib/mention/mention-system'

import * as S from '../styles'
import { InlineRichText, InlineText } from './inline'
import { type SectionRow } from './narrative-sections.lib'

export * from './narrative-sections.lib'

interface NarrativeSectionListProps {
  rows: SectionRow[]
  /** 이동·삭제 버튼 노출 여부. */
  manageMode: boolean
  onFieldChange: (index: number, patch: Partial<SectionRow>) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (index: number) => void
  onPersonClick?: (personId: string) => void
  onEntityLink?: (item: MentionItem) => void
  /** 스크린리더 라벨 접두 — "배경 1단락 제목"처럼 읽히게. */
  labelPrefix: string
  /** 본문 placeholder — 배경/전개가 다른 문구를 쓴다. */
  bodyPlaceholder: string
  /** 단락 앵커 접두 — '#background-2'처럼 단락 하나를 직접 가리킬 수 있게. */
  anchorPrefix: string
}

export function NarrativeSectionList({
  rows,
  manageMode,
  onFieldChange,
  onMove,
  onRemove,
  onPersonClick,
  onEntityLink,
  labelPrefix,
  bodyPlaceholder,
  anchorPrefix,
}: NarrativeSectionListProps) {
  return (
    <SectionStack>
      {rows.map((row, index) => {
        /**
         * 제목 줄은 **제목이 있을 때**, 그리고 관리 모드일 때만 그린다.
         *
         * 제목 없는 단락에 placeholder를 띄우면 단락마다 '단락 제목'이라는 회색 italic
         * 한 줄(+dashed underline +✎)이 본문 위에 얹힌다. 배경·전개 단락은 제목 없이
         * 쓰는 경우가 흔해서, 그 한 줄이 곧 단락 수만큼의 잉크가 된다. 제목을 붙이고
         * 싶으면 '단락 관리'를 켠다 — 그 모드가 단락의 뼈대(제목·순서·삭제)를 손보는
         * 자리라는 뜻도 이렇게 또렷해진다.
         */
        const hasTitle = row.title.trim().length > 0
        const showTitleRow = hasTitle || manageMode
        return (
          <SectionItem
            key={row.key}
            id={`${anchorPrefix}-${index + 1}`}
            $hasTitle={showTitleRow}
          >
            <SectionIndex aria-hidden>{index + 1}</SectionIndex>
            <SectionColumn>
              {showTitleRow && (
                <SectionTitleRow>
                  <SectionTitleHost>
                    <InlineText
                      value={row.title}
                      onSave={(next) => onFieldChange(index, { title: next })}
                      placeholder="단락 제목"
                      label={`${labelPrefix} ${index + 1}단락 제목`}
                    />
                  </SectionTitleHost>
                  {manageMode && (
                    <ManageActions>
                      <ManageBtn
                        type="button"
                        onClick={() => onMove(index, -1)}
                        disabled={index === 0}
                        aria-label={`${index + 1}단락 위로`}
                      >
                        <FiArrowUp />
                      </ManageBtn>
                      <ManageBtn
                        type="button"
                        onClick={() => onMove(index, 1)}
                        disabled={index === rows.length - 1}
                        aria-label={`${index + 1}단락 아래로`}
                      >
                        <FiArrowDown />
                      </ManageBtn>
                      <ManageBtn
                        type="button"
                        onClick={() => onRemove(index)}
                        aria-label={`${index + 1}단락 삭제`}
                        $danger
                      >
                        <FiTrash2 />
                      </ManageBtn>
                    </ManageActions>
                  )}
                </SectionTitleRow>
              )}
              <SectionBodyHost>
                <InlineRichText
                  value={row.content}
                  onSave={(next) => onFieldChange(index, { content: next })}
                  placeholder={bodyPlaceholder}
                  label={`${labelPrefix} ${index + 1}단락 본문`}
                  /**
                   * sticky ✎ 금지 — sticky는 '개요'처럼 페이지를 통째로 차지하는 긴 본문
                   * 하나를 위한 것이다. 단락이 여럿 쌓인 목록에서 켜 두면 각 단락의 버튼이
                   * 제 블록을 벗어나 **다음 단락 위로 떠다닌다**(InlineRichText 주석 참고).
                   */
                  stickyEditButton={false}
                  onPersonClick={onPersonClick}
                  onEntityLink={onEntityLink}
                />
              </SectionBodyHost>
            </SectionColumn>
          </SectionItem>
        )
      })}
    </SectionStack>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

/** 번호 거터 폭 — 제목·본문·추가 버튼이 공유하는 텍스트 열의 좌측 기준선. */
const GUTTER = '34px'
const GUTTER_NARROW = '26px'

/** 항목의 상하 여백 — 번호와 본문 열이 **같은 값**을 써야 첫 줄이 나란히 선다. */
const COLUMN_PAD_Y = '18px'
const COLUMN_PAD_Y_NARROW = '14px'

export const SectionStack = styled.div`
  display: flex;
  flex-direction: column;
  /* 항목 간 gap을 0으로 두고 padding을 항목 *안쪽*에 둔다 — 그래야 세로 괘선이
     항목 사이에서 끊기지 않고 목록 전체를 한 벌로 잇는다. */
  gap: 0;
`

const SectionItem = styled.div<{ $hasTitle: boolean }>`
  display: grid;
  grid-template-columns: ${GUTTER} minmax(0, 1fr);
  align-items: start;
  /* 단락 하나를 직접 가리키는 앵커(#background-2) — 헤더 아래로 파묻히지 않게. */
  scroll-margin-top: 24px;

  /**
   * 이 단락의 **첫 줄 높이** — 번호가 그 줄 안에서 세로 중앙에 앉는 기준이다.
   * 제목 줄이 있으면 제목의 줄 상자(17.5 × 1.4 ≈ 24px), 없으면 본문 첫 줄
   * (15.5 × 1.78 ≈ 28px). 예전엔 padding-top 상수로 눈대중을 맞췄는데, 그러면
   * 제목을 접은 단락에서 번호가 본문 첫 줄보다 위로 떠 어긋난다.
   */
  --narr-first-line: ${({ $hasTitle }) => ($hasTitle ? '24px' : '28px')};

  @media (max-width: 640px) {
    grid-template-columns: ${GUTTER_NARROW} minmax(0, 1fr);
  }
`

/**
 * 순번 마커 — 본문 글자 크기와 무관한 결정적 경계 단서.
 *
 * 장부의 행 번호처럼 mono tabular 숫자를 **괘선 쪽으로 붙여 우측 정렬**한다: 두 자리로
 * 넘어가도(10·11) 번호가 왼쪽으로 자라 본문 기준선은 흔들리지 않고, 숫자가 거터 한복판에
 * 떠 있지 않아 어느 단락의 번호인지가 붙어 읽힌다.
 *
 * 세로 위치는 본문 열과 **같은 padding-top + 그 단락의 첫 줄 높이만큼의 줄 상자**로 잡는다
 * (--narr-first-line). 제목을 접은 단락에서는 번호가 곧 그 단락의 유일한 표지라 색도 한 단
 * 올린다(tertiary → secondary).
 */
const SectionIndex = styled.span`
  ${DIGIT_DISPLAY}
  grid-column: 1;
  text-align: right;
  padding-top: ${COLUMN_PAD_Y};
  padding-right: 12px;
  font-size: 12.5px;
  font-weight: 600;
  line-height: var(--narr-first-line, 24px);
  color: ${({ theme }) => theme.colors.text.secondary};
  user-select: none;

  ${SectionStack} > ${SectionItem}:first-child & {
    padding-top: 0;
  }

  @media (max-width: 640px) {
    padding-top: ${COLUMN_PAD_Y_NARROW};
    padding-right: 8px;
    font-size: 11.5px;

    ${SectionStack} > ${SectionItem}:first-child & {
      padding-top: 0;
    }
  }
`

/**
 * 본문 열 — 좌측 세로 괘선이 목록 전체를 잇는다. padding이 열 *안쪽*에 있어
 * 항목이 맞붙고, 괘선은 첫 단락 첫 줄부터 마지막 단락 끝까지 한 줄로 이어진다.
 */
const SectionColumn = styled.div`
  grid-column: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: ${COLUMN_PAD_Y} 0 ${COLUMN_PAD_Y} 18px;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  /**
   * 목록의 바깥 간격은 Section의 gap(18px)이 이미 대고 있다 — 첫 항목이 위 padding을,
   * 마지막 항목이 아래 padding을 또 얹으면 리드 문단·추가 버튼과의 사이만 36px로 벌어져
   * 섹션 안의 리듬이 저 혼자 늘어진다. 항목 *사이*의 간격(18+18)만 남긴다.
   */
  ${SectionStack} > ${SectionItem}:first-child & {
    padding-top: 0;
  }
  ${SectionStack} > ${SectionItem}:last-child & {
    padding-bottom: 8px;
  }

  @media (max-width: 640px) {
    gap: 8px;
    padding: ${COLUMN_PAD_Y_NARROW} 0 ${COLUMN_PAD_Y_NARROW} 12px;
  }
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 24px;
`

const SectionTitleHost = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 17.5px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.012em;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 단락 본문 — 섹션 본문과 같은 가독폭·행간. */
const SectionBodyHost = styled.div`
  font-size: 15.5px;
  line-height: 1.78;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 720px;
`

const ManageActions = styled.div`
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
`

const ManageBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.error : theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s, background 0.14s;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.tertiary};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: 2px solid
      ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.primary)};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

/**
 * '단락 관리' 토글 — 읽기 화면에서는 **반쯤 물러나 있는다**.
 *
 * 이 버튼은 글을 읽는 사람에게는 할 일이 없는데, 섹션 제목 옆 가장 눈에 띄는 자리에
 * 상시 또렷하게 서 있었다. 그렇다고 hover에만 나타나게 하면 순서를 바꾸려는 사람이
 * 찾을 곳이 없어진다 — 평소 옅게 두고 섹션에 손이 닿을 때 또렷해지는 쪽을 택한다.
 * opacity만 움직이므로 레이아웃은 흔들리지 않고, hover가 없는 환경에서는 상시 또렷하다.
 */
export const ManageToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text.tertiary : ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
  /* ⚠️ transition은 한 선언으로 — 뒤에 또 쓰면 앞의 opacity 전이가 통째로 덮인다. */
  transition: color 0.14s, border-color 0.14s, background 0.14s, opacity 0.14s;

  ${S.Section}:hover &,
  ${S.Section}:focus-within & {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  /* hover가 없는 환경(터치)에서는 '손이 닿을 때'가 없다 — 상시 또렷하게. */
  @media (hover: none) {
    opacity: 1;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/** 관리 토글 — 섹션 헤더 우측. 단락이 있을 때만 의미가 있다. */
export function ManageSectionsToggle({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <ManageToggle
      type="button"
      onClick={onToggle}
      $active={active}
      aria-pressed={active}
    >
      <FiSettings />
      {active ? '관리 끝' : '단락 관리'}
    </ManageToggle>
  )
}

/**
 * 단락 추가 — 텍스트 열에 맞춰 들여쓰고, 점선 상자 대신 hairline 한 줄 위의
 * 조용한 행으로 둔다(읽기 화면의 잉크를 아끼고 목록의 마지막 행처럼 읽히게).
 */
const AddRow = styled.div<{ $indent: boolean }>`
  display: flex;
  margin-left: ${({ $indent }) => ($indent ? `calc(${GUTTER} + 18px)` : '0')};

  @media (max-width: 640px) {
    margin-left: ${({ $indent }) => ($indent ? `calc(${GUTTER_NARROW} + 12px)` : '0')};
  }
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 7px 12px 7px 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

export function AddSectionButton({
  onClick,
  label,
  indent,
}: {
  onClick: () => void
  label: string
  /** 단락이 이미 있으면 텍스트 열에 맞춰 들여쓴다(번호 거터만큼). */
  indent: boolean
}) {
  return (
    <AddRow $indent={indent}>
      <AddBtn type="button" onClick={onClick}>
        <FiPlus /> {label}
      </AddBtn>
    </AddRow>
  )
}
