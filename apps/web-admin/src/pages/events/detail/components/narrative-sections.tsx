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
}: NarrativeSectionListProps) {
  return (
    <SectionStack>
      {rows.map((row, index) => (
        <SectionItem key={row.key}>
          <SectionIndex aria-hidden>{index + 1}</SectionIndex>
          <SectionColumn>
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
            <SectionBodyHost>
              <InlineRichText
                value={row.content}
                onSave={(next) => onFieldChange(index, { content: next })}
                placeholder={bodyPlaceholder}
                label={`${labelPrefix} ${index + 1}단락 본문`}
                onPersonClick={onPersonClick}
                onEntityLink={onEntityLink}
              />
            </SectionBodyHost>
          </SectionColumn>
        </SectionItem>
      ))}
    </SectionStack>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

/** 번호 거터 폭 — 제목·본문·추가 버튼이 공유하는 텍스트 열의 좌측 기준선. */
const GUTTER = '34px'
const GUTTER_NARROW = '26px'

export const SectionStack = styled.div`
  display: flex;
  flex-direction: column;
  /* 항목 간 gap을 0으로 두고 padding을 항목 *안쪽*에 둔다 — 그래야 세로 괘선이
     항목 사이에서 끊기지 않고 목록 전체를 한 벌로 잇는다. */
  gap: 0;
`

const SectionItem = styled.div`
  display: grid;
  grid-template-columns: ${GUTTER} minmax(0, 1fr);
  align-items: start;

  @media (max-width: 640px) {
    grid-template-columns: ${GUTTER_NARROW} minmax(0, 1fr);
  }
`

/**
 * 순번 마커 — 본문 글자 크기와 무관한 결정적 경계 단서.
 *
 * 장부의 행 번호처럼 mono tabular 숫자를 **괘선 쪽으로 붙여 우측 정렬**한다: 두 자리로
 * 넘어가도(10·11) 번호가 왼쪽으로 자라 본문 기준선은 흔들리지 않고, 숫자가 거터 한복판에
 * 떠 있지 않아 어느 단락의 번호인지가 붙어 읽힌다. 세로 위치는 제목 첫 줄에 맞춘다.
 */
const SectionIndex = styled.span`
  ${DIGIT_DISPLAY}
  grid-column: 1;
  text-align: right;
  padding-top: 20px;
  padding-right: 12px;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
  user-select: none;

  @media (max-width: 640px) {
    /* 본문 열의 좁은 padding-top(14px)에 맞춰 같이 올라간다 — 번호가 제목의 첫 줄과
       어긋나면 거터가 행을 세는 게 아니라 떠 있는 것처럼 읽힌다. */
    padding-top: 16px;
    padding-right: 8px;
    font-size: 11.5px;
  }
`

/**
 * 본문 열 — 좌측 세로 괘선이 목록 전체를 잇는다. padding이 열 *안쪽*에 있어
 * 항목이 맞붙고, 괘선은 첫 번호 위부터 마지막 단락 끝까지 한 줄로 이어진다.
 */
const SectionColumn = styled.div`
  grid-column: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 0 18px 18px;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (max-width: 640px) {
    gap: 8px;
    padding: 14px 0 14px 12px;
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
  transition: color 0.14s, border-color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
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
