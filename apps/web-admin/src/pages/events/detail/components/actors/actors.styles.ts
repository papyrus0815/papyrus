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
 * 섹션 구분 hr 색상 — 본문 흐름 방해 안 하는 hairline.
 * 이전엔 0.78/0.5로 본문 글자보다 진해 시선 분산이 컸음. hairline 톤으로 낮춤.
 */
export const editorialRuleColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'

export const softRuleColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'

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
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text.tertiary : softRuleColor(theme.mode)};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : mutedTextColor(theme.mode)};
  font-family: inherit;
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
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

export const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
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
export const PersonsBlock = styled.div`
  ${S.breakout}
  display: flex;
  flex-direction: column;
`

/**
 * 2열일 때 행 구분선 — 각 행의 border-bottom을 그대로 쓰되, 마지막 **줄**(홀수 개면 1개,
 * 짝수 개면 2개)의 선을 지운다. 한 열 규칙(&:last-child)만으로는 짝수 개일 때 왼쪽 칸에
 * 선이 하나 남는다.
 */
export const twoColumnRows = css`
  @container eventdetail ${S.WIDE_TRACK_QUERY} {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 40px;

    > li:nth-last-child(2):nth-child(odd) {
      border-bottom: none;
    }
  }
`

export const PersonList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  ${twoColumnRows}
`

export const PersonRow = styled.li<{ $compact?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) => ($compact ? '28px' : '48px')} minmax(0, 1fr) auto;
  align-items: start;
  gap: ${({ $compact }) => ($compact ? '10px' : '14px')};
  padding: ${({ $compact }) => ($compact ? '6px 12px' : '14px 12px')};
  margin: 0 -12px;
  border-radius: ${RADIUS.MD};
  border-bottom: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  }

  /* 좁은 화면 — 큰 행만 아바타를 40px로(대표단 작은 행은 이미 28px) */
  ${({ $compact }) =>
    !$compact &&
    css`
      @media (max-width: 400px) {
        grid-template-columns: 40px minmax(0, 1fr) auto;
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
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
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
  /* 정사각 — editorial photo */
  border-radius: 0;

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
  &[data-quiet] {
    display: none;
  }
  li:hover > div > &[data-quiet],
  li:focus-within > div > &[data-quiet] {
    display: flex;
  }
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

/* ─── Nations paragraph ─── */

export const NationsBlock = styled.div`
  ${S.breakout}
  /* 섹션 flex 틈(18px)이 이미 있다 — 20px을 더 얹어 인물 목록 아래가 60px 넘게 비었다 */
  margin-top: 0;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => editorialRuleColor(theme.mode)};
  display: flex;
  flex-direction: column;
`

/**
 * 무리 머리글 — 인물·국가가 같은 모양으로 연다(라벨 · 수 ······ + 추가).
 * 한글 라벨이라 라틴 스몰캡스 트래킹(0.18em)을 쓰지 않는다 — 낱자로 흩어진다.
 */
export const GroupHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
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
  ${({ $faded }) =>
    $faded &&
    css`
      mask-image: linear-gradient(to bottom, #000 calc(100% - 1lh), transparent);
    `}

  &:focus-within {
    max-height: none;
    mask-image: none;
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
  padding: 10px 0;
  border: none;
  border-top: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  background: transparent;
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

  ${({ $hasContent }) =>
    !$hasContent &&
    css`
      height: 0;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.14s;

      [data-empty='true'] {
        opacity: 0.55;
        font-style: italic;
      }
    `}
`

/**
 * 역할은 이 지면의 새 축이라 스캔이 돼야 하는데, 이름 옆 회색 글씨로 두니
 * "대한민국 피해국"이 한 덩어리로 읽히고 편집 가능한지도 보이지 않았다.
 * 테두리를 둘러 이름에서 떼어내고, 작지만 또렷한 잉크를 준다.
 */
export const CountryRolePicker = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 4px 1px 8px;
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  border-radius: ${RADIUS.PILL};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;

  [data-empty='true'] {
    font-style: italic;
    font-weight: 500;
    opacity: 0.6;
  }

  /* 자리도 차지하지 않는다 — 투명하기만 하면 긴 이름 옆에서 다음 줄로 꺾여 행이 두 배가 됐다 */
  &[data-default] {
    display: none;
  }

  /*
   * InlineSelect의 ▾는 hover에서만 뜨는데, 배지는 그 자리를 18px 비워 두므로 평소엔
   * 한쪽이 빈 알약처럼 보였다. 약하게 상시 노출해 균형을 맞추고 "고를 수 있다"는
   * 신호도 남긴다 — 행에 들어오면 또렷해진다.
   */
  button {
    opacity: 0.4;
  }
`

/** 진영 한 묶음 — 묶음 사이는 국가 목록의 행 간격보다 넓게 */
/** 진영 묶음들 — 넓으면 나란히, 좁으면 위아래 */
export const SideColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 22px 28px;
  margin-top: 6px;
`

export const SideGroup = styled.div<{ $rest?: boolean }>`
  min-width: 0;
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
  /* 칸이 나란히 서므로 행이 칸 밖(-12px)으로 나가면 옆 칸 선과 어긋났다 */
  > li {
    margin: 0 -6px;
    padding-inline: 6px;
  }
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
`

/** 진영 머리 — 국가 묶음 라벨(GroupLabel)보다 한 단 낮은 소제목. 진영색은 쓰지 않는다(색 면 금지 규약) */
/** 진영 머리 — 진영 색 견본·아래 굵은 선(색). 진영 밖('그 밖')은 회색 선 */
export const SideHead = styled.h4<{ $color?: string }>`
  margin: 0 0 4px;
  padding-bottom: 6px;
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 2px solid
    ${({ $color, theme }) => $color ?? softRuleColor(theme.mode)};
`

export const CountryList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
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

  ${({ $hasContent }) =>
    !$hasContent &&
    css`
      height: 0;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.14s;
    `}
`

/* 인물 행과 같은 골격 — 아바타 열만 없다(국기 이모지는 이름 옆이 자연스러워 생략). */
export const CountryRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  /* 15개국이 한 화면에 들어오게 — 이름 한 줄 행은 위아래 7px */
  padding: 7px 12px;
  margin: 0 -12px;
  border-radius: ${RADIUS.MD};
  border-bottom: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  /* 빈 '한 일'·비고 줄은 이 행에 들어왔을 때만 펼친다 */
  &:hover ${CountryNoteLine}, &:focus-within ${CountryNoteLine},
  &:hover ${CountryRoleLine}, &:focus-within ${CountryRoleLine} {
    height: auto;
    opacity: 1;
  }

  &:hover ${CountryRolePicker} button,
  &:focus-within ${CountryRolePicker} button {
    opacity: 1;
  }
  &:hover ${CountryRolePicker}[data-default],
  &:focus-within ${CountryRolePicker}[data-default] {
    display: inline-flex;
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
  font-size: 15px;
  font-weight: 600;
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
  font-weight: 500;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

/* 역사 국가도 /country/:histId 상세가 실존 — 현대국(CountryLink)과 동일한
 * 링크 어포던스(hover·focus-visible 밑줄)를 상속하고 이탤릭 톤만 덧입힌다. */
export const HistoricalCountryName = styled(CountryLink)`
  font-style: italic;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.78)'
      : 'rgba(15,23,42,0.74)'};
`




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
export const DelegationList = styled.ol`
  list-style: none;
  margin: 4px 0 2px;
  padding: 0 0 0 10px;
  display: flex;
  flex-direction: column;
  border-left: 2px solid ${({ theme }) => softRuleColor(theme.mode)};
  > li {
    border-bottom: none;
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
    $divided ? `padding-top: 18px; border-top: 1px solid ${editorialRuleColor(theme.mode)};` : ''}
`

/** 참여 국가 고르기 — 대표단 줄(data-quiet)에선 행에 들어왔을 때만 */
export const ParticipationPicker = styled.span`
  display: inline-flex;
  &[data-quiet] {
    display: none;
  }
  li:hover > div > div > &[data-quiet],
  li:focus-within > div > div > &[data-quiet] {
    display: inline-flex;
  }
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
