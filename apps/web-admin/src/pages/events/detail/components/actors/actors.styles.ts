/**
 * 참여 탭 공용 스타일 — 인물·국가(·기관) 행이 같은 골격을 쓴다.
 * detail-actors.tsx(1,691줄)를 쪼개며 옮겼다. 값은 그대로.
 */
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { ledgerAccent, ledgerHairlineStrong, RADIUS } from '@/entities/event/ui/ledger-tokens'

import * as S from '../../styles'
import { CLAMP_LINES } from './actors.lib'

/* ───────────────────────── styles — editorial sans ─────────────── */
/* NYT 깔끔한 톤(헤어라인 룰 + smallcaps eyebrow + 위계)만 차용. 폰트는 sans 기본. */

/**
 * 면(surface) — 이 탭은 **선을 쓰지 않는다**(테두리·구분선·색 밑줄 금지). 묶음은 옅은 면과 간격으로 가른다.
 * card = 나라·인물 한 장, nested = 나라 카드 안의 대표단 칸, chip = 칩·단추 바탕.
 */
export const surface = {
  card: (mode: 'light' | 'dark') => (mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.03)'),
  cardHover: (mode: 'light' | 'dark') => (mode === 'dark' ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.045)'),
  nested: (mode: 'light' | 'dark') => (mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)'),
  chip: (mode: 'light' | 'dark') => (mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'),
}

export const mutedTextColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.66)' : 'rgba(15,23,42,0.62)'

/* ─── Section header — '순서 변경' 토글(공용 S.SectionHeader 안에 배치) ─── */

/**
 * 머리글도 넓은 트랙으로 펴되 제목은 여백만큼 안으로 들인다 — 제목은 다른 섹션 제목과 같은
 * x(산문 열)에, '순서 변경'은 아래 목록의 '+ 추가'와 같은 오른쪽 끝에 선다.
 */
export const ActorsHeader = styled(S.SectionHeader)`
  ${S.breakout}
  padding-left: ${S.breakoutGutter};
`

export const ManageToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme, $active }) => ($active ? surface.chip(theme.mode) : 'transparent')};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : mutedTextColor(theme.mode)};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => surface.chip(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/**
 * 행 오른쪽 위 단추(✎·✕·↑↓) — 행 위에 떠 있다. 칸(열)을 차지하면 보이지 않을 때도 글 폭을 56px씩
 * 먹어, 나란한 진영 칸 안 대표단 줄이 몇 글자마다 꺾였다.
 */
export const RowActions = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-radius: ${RADIUS.SM};
  li:hover > &,
  li:focus-within > & {
    background: ${({ theme }) => theme.colors.background.primary};
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
  }
  > button {
    margin-top: 0;
  }
`

export const ReorderBtn = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => surface.chip(theme.mode)};
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  transition: background 0.14s, color 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`


/* ─── Person list (vertical, hairline separators) ─── */

/**
 * 인물·국가 묶음은 **넓은 트랙**으로 편다(S.breakout) — 산문이 아니라 훑는 목록이다.
 * 트랙이 880px 이상 열리면 2열 격자가 된다: 15명이 8줄로, 6명 미리보기는 3줄로.
 * 1440px 화면(사이드바 포함)에서는 여백이 0이라 지금과 같은 한 열이다.
 */

/**
 * 넓은 트랙(880px+)에선 카드를 두 열로 — 15명이 8줄로.
 */
export const twoColumnRows = css`
  @container eventdetail ${S.WIDE_TRACK_QUERY} {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 40px;

  }
`

export const PersonList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  /* 카드 사이는 선 대신 틈 */
  gap: 8px;
  row-gap: 8px;
  ${twoColumnRows}
`

export const PersonRow = styled.li<{ $compact?: boolean; $dragOver?: boolean; $editing?: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $compact }) => ($compact ? '28px' : '48px')} minmax(0, 1fr);
  align-items: start;
  gap: ${({ $compact }) => ($compact ? '10px' : '14px')};
  /*
   * 한 사람 = 한 장(면). 대표단 줄도 제 카드다 — 나라 카드 **밖**, 그 아래 들여 쓴 자리에 선다(DelegationList).
   * 카드 안에 카드를 넣지 않는다(예전: 회색 나라 카드 안 흰 인물 카드).
   */
  padding: ${({ $compact }) => ($compact ? '8px 12px' : '14px 14px')};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => surface.card(theme.mode)};
  outline: ${({ $dragOver, theme }) => ($dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none')};
  outline-offset: -2px;
  transition: background 0.15s, outline-color 0.15s;
  &[draggable='true'] {
    cursor: grab;
  }
  &[draggable='true']:active {
    cursor: grabbing;
  }

  &:hover {
    background: ${({ theme }) => surface.cardHover(theme.mode)};
  }

  /* 편집 중인 사람 — 어느 카드를 고치고 있는지 한눈에 */
  ${({ $editing, theme }) =>
    $editing &&
    css`
      &,
      &:hover {
        background: ${theme.colors.background.primary};
        box-shadow:
          0 0 0 1.5px ${ledgerAccent(theme.mode)},
          0 4px 16px rgba(15, 23, 42, 0.08);
      }
    `}

  /* 좁은 화면 — 큰 행만 아바타를 40px로(대표단 작은 행은 이미 28px) */
  ${({ $compact }) =>
    !$compact &&
    css`
      @media (max-width: 400px) {
        grid-template-columns: 40px minmax(0, 1fr);
        gap: 10px;
        padding: 12px;
      }
    `}
`

export const PersonAvatarBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: block;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

export const PersonAvatar = styled.span<{ $hasImage: boolean; $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $compact }) => ($compact ? '28px' : '48px')};
  height: ${({ $compact }) => ($compact ? '28px' : '48px')};
  overflow: hidden;
  border-radius: 8px;
  background: ${({ theme, $hasImage }) =>
    $hasImage
      ? 'transparent'
      : theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  font-size: ${({ $compact }) => ($compact ? '12px' : '18px')};
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* NYT 흑백 톤 */
    filter: grayscale(0.4) contrast(1.03);
    transition: filter 0.18s;
  }

  ${PersonAvatarBtn}:hover & img {
    filter: grayscale(0) contrast(1);
  }

  ${({ $compact }) =>
    !$compact &&
    css`
      @media (max-width: 400px) {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }
    `}
`

export const PersonBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const PersonNameBtn = styled.button<{ $compact?: boolean }>`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: ${({ $compact }) => ($compact ? '14px' : '16px')};
  font-weight: 700;
  letter-spacing: -0.012em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  line-height: 1.25;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
    outline: none;
  }
`

/* 한글 이탤릭은 기울기만 흉내 내 흐려 보인다 — 역할은 곧은 보조 잉크로 */
/** 참여 국가 · 당시 직위 한 줄 */
export const PersonMetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const OfficeAtEvent = styled.span`
  font-weight: 500;
`

/** 앞뒤 안 맞는 연결 안내 — 막지 않고 알리기만(옅은 호박색) */
export const MismatchNote = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  background: ${({ theme }) => theme.colors.alert.warning.bg};
  border-radius: 999px;
  white-space: nowrap;
`

/** 이 사건에서 전사·처형·피살·사망한 인물 배지 — 붉은 잉크·옅은 바탕 */
export const DeathAtEventBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(185, 28, 28, 0.09)'};
  border-radius: 999px;
  white-space: nowrap;
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

export const PersonRoleLine = styled.div`
  font-size: 13.5px;
  line-height: 1.5;
  letter-spacing: -0.005em;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  /* InlineText placeholder — empty state는 더 약하게 */
  [data-empty='true'] {
    font-style: italic;
    opacity: 0.55;
  }
`

export const PersonNoteLine = styled.div<{ $hasContent: boolean }>`
  font-size: 14px;
  line-height: 1.62;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-top: 4px;
  display: flex;
  flex-direction: column;

  /**
   * 빈 상태도 항상 placeholder가 보이도록 유지(과거엔 opacity 0 → hover 시 0.7로
   * 노출했는데, touch/포인터 환경에서는 hover 진입 자체가 없어 "비고 추가"가
   * 발견되지 않는 문제가 있었음). role 줄과 일관되게 약하게 항상 노출.
   */
  ${({ $hasContent }) =>
    !$hasContent &&
    css`
      [data-empty='true'] {
        opacity: 0.55;
        font-style: italic;
      }
    `}
`

export const RemoveInline = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s, color 0.14s;

  ${PersonRow}:hover &,
  ${PersonRow}:focus-within & {
    opacity: 0.7;
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.error};
    outline: none;
  }

  /**
   * 터치/포인터 hover 미지원 환경은 hover-only 진입이 불가하므로 항상 노출.
   * 키보드 사용자도 :focus-visible로 1.0까지 올라가지만, 발견성을 위해 매체 쿼리로
   * 보정해 둔다.
   */
  @media (hover: none) {
    opacity: 0.7;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

/* ─── 인물 편집 칸 — 참여 국가·진영(한 번 누르기) · 무엇을 했나 · 비고 ─── */

/** 아무것도 적지 않은 사람의 '+ 무엇을 했나 · 비고 적기' — 편집 칸을 연다 */
export const AddInfoButton = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

export const EditPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
`

export const EditField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`

export const EditLabel = styled.label`
  font-size: 11.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 하나 고르기(참여 국가·진영) — 누르면 바로 저장 */
export const ChoiceChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

export const ChoiceChip = styled.button<{ $selected: boolean; $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ $selected, theme }) => ($selected ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  background: ${({ $selected, theme }) =>
    $selected ? `color-mix(in srgb, ${ledgerAccent(theme.mode)} 12%, transparent)` : 'transparent'};
  color: ${({ $selected, $muted, theme }) =>
    $selected ? theme.colors.text.primary : $muted ? mutedTextColor(theme.mode) : theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  white-space: nowrap;
  cursor: ${({ $selected }) => ($selected ? 'default' : 'pointer')};
  transition: border-color 0.12s, background 0.12s;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const editControl = css`
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 14px;
  line-height: 1.55;

  &::placeholder {
    color: ${({ theme }) => mutedTextColor(theme.mode)};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    box-shadow: 0 0 0 3px ${({ theme }) => `color-mix(in srgb, ${ledgerAccent(theme.mode)} 18%, transparent)`};
  }
`

export const EditInput = styled.input`
  ${editControl}
  height: 36px;
`

export const EditTextarea = styled.textarea`
  ${editControl}
  min-height: 60px;
  resize: vertical;
  overflow: hidden;
`

export const EditFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const EditHint = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const EditDone = styled.button`
  flex: none;
  height: 30px;
  padding: 0 14px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다 */
  color: ${({ theme }) => (theme.mode === 'dark' ? '#111827' : '#ffffff')};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/* ─── Nations paragraph ─── */


/**
 * 무리 머리글 — 인물·국가가 같은 모양으로 연다(라벨 · 수 ······ + 추가).
 * 한글 라벨이라 라틴 스몰캡스 트래킹(0.18em)을 쓰지 않는다 — 낱자로 흩어진다.
 */
export const GroupHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 10px;
`

/** 무리 머리 오른쪽 — 이름으로 추가(입력) · 목록에서 고르기. 좁으면 라벨 아래로 내려가 한 줄을 쓴다 */
export const GroupTools = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 12px;
  min-width: 0;

  /* 좁으면 입력 칸이 한 줄을 다 쓰고 단추들은 그 아래 */
  @container eventdetail (max-width: 639px) {
    justify-content: flex-start;

    > input {
      flex: 1 1 100%;
      width: auto;
    }
  }
`

/** 이름이 맞는 후보 — 입력하는 동안만 머리 아래 한 줄 */
export const QuickMatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: -2px 0 10px;
`

export const GroupLabel = styled.h3`
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const GroupCount = styled.span`
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

/**
 * 2줄 접힘. 높이는 줄 수 × 1lh(부모 line-height) — 인물 1.62·국가 1.6 어느 쪽이든 맞는다.
 * 편집 중엔 풀어서 textarea가 잘리지 않게 한다.
 */
export const ProseClamp = styled.div<{ $collapsed: boolean; $faded: boolean }>`
  ${({ $collapsed }) =>
    $collapsed &&
    css`
      /* +4px — 호스트가 더 먹는 1~2px에 마지막 줄 받침이 잘리지 않게 */
      max-height: calc(${CLAMP_LINES} * 1lh + 4px);
      overflow: hidden;
    `}
  /*
   * 넘치면 마지막 줄의 **끝만** 가로로 흐린다 — 그 자리에 '더 보기'가 얹힌다(MoreToggle $floating).
   * 윗줄들은 그대로, 마지막 줄은 오른쪽 6em 전부터 사라진다. (예전: 마지막 줄 전체를 아래로 흐리고 '더 보기'는 제 줄)
   */
  ${({ $faded }) =>
    $faded &&
    css`
      mask-image: linear-gradient(#000, #000),
        linear-gradient(to right, #000 calc(100% - 7em), transparent calc(100% - 4.5em));
      mask-size: 100% calc(100% - 1lh - 4px), 100% calc(1lh + 4px);
      mask-position: top, bottom;
      mask-repeat: no-repeat;
    `}

  &:focus-within {
    max-height: none;
    mask-image: none;
  }

  /* 편집 중엔 접힘이 풀리므로 끝에 띄운 '더 보기'를 걷는다(글 위에 겹친다) */
  &:focus-within + * {
    display: none;
  }

  /* 산문 속 강조는 굵기로 — 잉크는 본문과 같게 */
  strong {
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /*
   * 인라인 키트의 점선 밑줄은 한 줄짜리 값의 편집 신호다. 여러 줄 산문 전체에 깔리면
   * 글보다 선이 먼저 읽힌다 — 산문은 행에 들어왔을 때만 밑줄을 띄운다(✎는 그대로).
   */
  [data-edit-host] > span:first-child:not([data-empty='true']) {
    text-decoration-color: transparent;
  }

  li:hover & [data-edit-host] > span:first-child:not([data-empty='true']),
  li:focus-within & [data-edit-host] > span:first-child:not([data-empty='true']) {
    text-decoration-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 인물 목록 '모두 보기' — 목록 폭 전체를 쓰는 얇은 버튼. 행 구분선과 같은 룰을 위에 둔다. */
export const ShowAllToggle = styled.button`
  display: block;
  width: 100%;
  margin-top: 0;
  margin-top: 8px;
  padding: 10px 0;
  border: none;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => surface.card(theme.mode)};
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

/** 접는 산문의 자리 — 접힌 '더 보기'를 마지막 줄 끝에 띄우는 기준 */
export const ClampHost = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`

/**
 * 접힌 산문의 마지막 줄 끝 — ProseClamp가 그 자리를 가로로 흐려 둔다. 칸 높이가 **산문의 한 줄(1lh)**이라
 * 안의 작은 '더 보기'가 그 줄 가운데에 선다(단추 자신의 1lh는 12px 글자 기준이라 줄보다 아래로 처졌다).
 * bottom 4px = ProseClamp 받침 여백.
 */
export const FloatingMoreSlot = styled.div`
  position: absolute;
  right: 0;
  bottom: 4px;
  height: 1lh;
  display: flex;
  align-items: center;

  > button {
    margin: 0;
  }
`

export const MoreToggle = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  font-style: normal;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

/**
 * 비고는 대부분 비어 있다(실측 676행 중 0행). 모든 행에 '비고 추가' 유령 줄을 세우면
 * 14국짜리 사건에서 죽은 줄만 14개가 된다. 내용이 있을 때만 상시 노출하고, 없으면
 * 행에 마우스를 올리거나 포커스가 들어왔을 때만 나타나게 한다.
 */
export const CountryNoteLine = styled.div<{ $hasContent: boolean }>`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  [data-empty='true'] {
    opacity: 0.55;
    font-style: italic;
  }
`

/**
 * 역할(주도국·피해국…) — 이름 옆 알약. 기본값 '참여국'이면 세우지 않는다. 고르기는 편집 칸(✎)에서.
 * 이름과 한 덩어리로 읽히지 않게 면을 깔고, 작지만 또렷한 잉크.
 */
export const CountryRoleTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => surface.chip(theme.mode)};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

/** 진영 한 묶음 — 묶음 사이는 국가 목록의 행 간격보다 넓게 */
/**
 * 진영 묶음들 — 넓으면 나란히, 좁으면 위아래. 나라 밑에 대표단이 달리면($stack) 한 칸 폭이 모자라
 * (290px 칸에 아바타·들여쓰기·글) 위아래로 쌓는다.
 */
export const SideColumns = styled.div<{ $stack?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $stack }) => ($stack ? 'minmax(0, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))')};
  gap: 22px 28px;
  margin-top: 6px;
`

export const SideGroup = styled.div<{ $rest?: boolean; $dragOver?: boolean }>`
  min-width: 0;
  border-radius: ${RADIUS.MD};
  outline: ${({ $dragOver, theme }) => ($dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none')};
  outline-offset: 4px;
  transition: outline-color 0.14s, background 0.14s;
  /* '그 밖'은 진영 칸 아래 한 줄 전체 */
  ${({ $rest }) => ($rest ? 'grid-column: 1 / -1;' : '')}
`

/** 진영 안 나라 목록 — 진영 칸이 이미 나란히 서므로 안에서는 한 줄씩 */
export const SideCountryList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const SideSwatch = styled.span<{ $color: string }>`
  flex-shrink: 0;
  align-self: center;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
`

export const EmptyGroupLine = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  a {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 600;
    text-underline-offset: 3px;
  }
`

/** 진영 머리 — 진영 색 견본 + 진영색 옅은 바탕(선 없음). 진영 밖('그 밖')은 무채색 면 */
export const SideHead = styled.h4<{ $color?: string }>`
  margin: 0 0 8px;
  padding: 8px 12px;
  display: flex;
  align-items: baseline;
  gap: 7px;
  border-radius: ${RADIUS.MD};
  /* 진영 색은 선이 아니라 옅은 바탕으로 — 진영 밖('그 밖')은 무채색 */
  background: ${({ $color, theme }) =>
    $color ? `color-mix(in srgb, ${$color} ${theme.mode === 'dark' ? 16 : 9}%, transparent)` : surface.card(theme.mode)};
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 진영 결과(승리·패배…) — 머리 오른쪽 끝, 채운 칩 */
export const SideOutcomeTag = styled.span`
  margin-left: auto;
  padding: 1px 8px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)')};
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

export const CountryList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  row-gap: 8px;
  ${twoColumnRows}
`

/**
 * '이 나라가 한 일' — 비어 있으면 비고 줄과 같은 규칙으로 접었다가 행에 들어오면(hover·focus) 편다.
 * 1차세계대전 15개국 전부에 빈 자리표시가 서 있어 참여 탭의 대부분이 회색 기울임 글씨였다.
 */
export const CountryRoleLine = styled.div<{ $hasContent: boolean }>`
  display: flex;
  flex-direction: column;
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-empty='true'] {
    font-style: italic;
    opacity: 0.55;
  }

`

/**
 * 나라 한 줄 = 나라 카드(CountryCard) + 그 아래 대표단(DelegationList). 면은 카드가 지고, 줄 자체는 면이 없다.
 * 대표단이 달린 나라는 다음 나라와 조금 더 띄운다(어디까지가 이 나라 사람인지).
 */
export const CountryRow = styled.li`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  &[draggable='true'] {
    cursor: grab;
  }
  &[draggable='true']:active {
    cursor: grabbing;
  }
  &:has(> ol) {
    margin-bottom: 8px;
  }
`

export const CountryBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const CountryNameLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  /* 나라 이름은 아래 대표단(사람 카드 14px)의 머리 — 한 단 크고 굵게 */
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`





export const CountryFlag = styled.span`
  margin-right: 6px;
  font-style: normal;
`

export const CountryLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  font-weight: inherit;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

/*
 * 역사 국가도 /country/:histId 상세가 실존 — 현대국(CountryLink)과 같은 링크·같은 잉크.
 * 예전엔 이탤릭 + 74% 회색이었는데, 참여국 1,086줄 대부분이 역사 국가라 탭의 이름이 거의 다 '비어 있음'
 * 자리표시(같은 탭의 빈 칸이 기울임 회색)처럼 읽혔다. 나라 이름은 이 행의 닻이다.
 */
export const HistoricalCountryName = styled(CountryLink)``




/* ─── Add buttons (editorial) ─── */

export const AddBtn = styled.button`
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  /* 한글 라벨 — 라틴 스몰캡스(uppercase + 0.16em)를 걷는다. */
  letter-spacing: 0.04em;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.14s;

  &::before {
    content: '+';
    font-size: 13px;
    line-height: 1;
    letter-spacing: 0;
    margin-right: 2px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 3px;
    border-radius: ${RADIUS.FOCUS};
  }
`

/** 대표단 — 나라 줄 밑 그 나라 자격의 인물들. 나라 이름 아래로 한 단 들인다 */
/**
 * 대표단 — 나라 카드 **아래** 그 나라 자격의 인물들. 나라 카드 밖에 들여 써서 소속을 보인다
 * (선은 쓰지 않는다 — 들여쓰기와 간격이 묶음을 말한다).
 */
export const DelegationList = styled.ol`
  list-style: none;
  margin: 0 0 0 22px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 640px) {
    margin-left: 12px;
  }
`

/** 섹션 머리 요약 — '국가 14 · 인물 15 · 진영 2' */
export const ActorsSummary = styled.span`
  margin-left: 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

/** 인물·국가 무리 — 넓은 트랙. 두 번째 무리부터 위에 가는 선(어느 쪽이 먼저 오든) */
export const ActorsBlock = styled.div<{ $divided?: boolean }>`
  ${S.breakout}
  display: flex;
  flex-direction: column;
  ${({ $divided, theme }) =>
    $divided ? 'padding-top: 14px;' : ''}
`

/** 대표단 '+N명 더' */
export const DelegationMore = styled.button`
  align-self: flex-start;
  margin: 2px 0 0 0;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/**
 * ✎ 편집 — 빈 칸(역할·한 일·비고·참여 국가)을 여는 단추. ✕와 같은 규칙으로 행에 들어왔을 때만 진해진다
 * (자리는 늘 잡혀 있어 hover가 레이아웃을 흔들지 않는다). 편집 중엔 '완료'로 늘 보인다.
 */
export const EditToggle = styled.button<{ $active?: boolean }>`
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  min-width: 24px;
  padding: 0 6px;
  border: none;
  background: ${({ $active, theme }) => ($active ? `color-mix(in srgb, ${ledgerAccent(theme.mode)} 14%, transparent)` : 'transparent')};
  border-radius: ${RADIUS.SM};
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ $active, theme }) => ($active ? ledgerAccent(theme.mode) : mutedTextColor(theme.mode))};
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 0.14s, color 0.14s;
  li:hover > div > &,
  li:focus-within > div > & {
    opacity: 0.8;
  }
  &:hover,
  &:focus-visible {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
  @media (hover: none) {
    opacity: 0.7;
  }
  svg {
    width: 13px;
    height: 13px;
  }
`

/**
 * 나라 카드 — 나라만 담는다(그 나라 사람은 카드 밖 아래). ✎·✕는 **이 카드에 들어왔을 때만** 켜진다 —
 * 예전엔 나라 줄 전체(대표단 포함)에 걸려 인물에 마우스를 올려도 나라 단추가 켜졌다.
 * 행에 들어와도 높이·줄바꿈은 그대로(hover는 단추 투명도만).
 */
export const CountryCard = styled.div<{ $dragOver?: boolean; $editing?: boolean }>`
  position: relative;
  padding: 10px 14px;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => surface.card(theme.mode)};
  outline: ${({ $dragOver, theme }) => ($dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none')};
  outline-offset: -2px;
  transition: background 0.15s, outline-color 0.15s;

  &:hover {
    background: ${({ theme }) => surface.cardHover(theme.mode)};
  }
  &:hover > ${RowActions},
  &:focus-within > ${RowActions} {
    background: ${({ theme }) => theme.colors.background.primary};
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
  }
  &:hover > ${RowActions} ${RemoveInline},
  &:focus-within > ${RowActions} ${RemoveInline} {
    opacity: 0.7;
  }
  &:hover > ${RowActions} ${EditToggle},
  &:focus-within > ${RowActions} ${EditToggle} {
    opacity: 0.8;
  }

  /* 편집 중인 나라 — 인물 카드와 같은 표시 */
  ${({ $editing, theme }) =>
    $editing &&
    css`
      &,
      &:hover {
        background: ${theme.colors.background.primary};
        box-shadow:
          0 0 0 1.5px ${ledgerAccent(theme.mode)},
          0 4px 16px rgba(15, 23, 42, 0.08);
      }
    `}
`

/** 참여국 사실 줄 — 참여 형태·가담/이탈·진영(평평한 목록일 때) */
export const CountryFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

export const FactTag = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 19px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  ${({ $color }) =>
    $color
      ? `&::before { content: ''; width: 7px; height: 7px; border-radius: 2px; background: ${$color}; }`
      : ''}
  button {
    opacity: 0.45;
  }
  &:hover button,
  &:focus-within button {
    opacity: 1;
  }
`

/** 이 나라 몫의 측정값 — '병력 120만' 같은 숫자 칩. 숫자는 고정폭 */
export const FigureChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`

export const FigureChip = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 9px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => surface.nested(theme.mode)};
  font-size: 12px;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  strong {
    font-size: 13px;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 이름으로 추가 — 무리 머리 오른쪽(GroupTools) */
export const QuickSearchInput = styled.input`
  width: 200px;
  min-width: 0;
  max-width: 100%;
  height: 28px;
  padding: 0 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => surface.card(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12px;

  &::placeholder {
    color: ${({ theme }) => mutedTextColor(theme.mode)};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

export const QuickMatchChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px dashed ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => `color-mix(in srgb, ${ledgerAccent(theme.mode)} 8%, transparent)`};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, transform 0.1s;

  &:hover {
    background: ${({ theme }) => `color-mix(in srgb, ${ledgerAccent(theme.mode)} 15%, transparent)`};
  }
`

/** 추천 — 목록 **뒤**(이미 있는 사람이 먼저). 목록이 비었으면 머리 바로 아래가 된다 */
export const RecommendBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 6px;
  margin-top: 10px;
`

export const RecommendLabel = styled.span`
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  margin-right: 2px;
`

export const RecommendChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  border: none;
  background: ${({ theme }) => surface.chip(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => surface.cardHover(theme.mode)};
  }
`

export const RecommendMoreBtn = styled.button`
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`
