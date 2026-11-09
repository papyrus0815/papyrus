/**
 * 조약 상세 지면 — 사건 상세(`pages/events/detail`)와 같은 문법.
 *
 * - 상단: 브레드크럼(← 목록 · 조약 › 유형) + 조용한 액션
 * - 본문 두 칸(≥920px 컨테이너): 문서 열 | 우측 장부(연도 34 mono · 날짜·장소 · 사실 행 · 목차)
 * - 제목 36 : 섹션 20 : 본문 16 단조 — 예전의 보라 그라디언트 배너·'기본 정보' 타일 4칸·
 *   13px 회색 본문은 걷어냈다(배너가 첫 화면 200px를 먹고, 정작 서명일은 타일 속 13px였다).
 *
 * 국가 상세 조약 탭에서도 같은 컴포넌트가 뜨므로 뷰포트가 아니라 **컨테이너 쿼리**로 접는다.
 */
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  RADIUS,
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'

const ASIDE_WIDTH = 300

export const metaColor = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'

const fill = (mode: string, light: number, dark: number) =>
  mode === 'dark' ? `rgba(255,255,255,${dark})` : `rgba(15,23,42,${light})`

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

export const Page = styled.div`
  container-type: inline-size;
  container-name: treatydetail;
  padding: 28px clamp(20px, 3vw, 56px) 96px;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 768px) {
    padding: 18px 16px 96px;
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: treatyRise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes treatyRise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
`

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'top'
    'hero'
    'aside'
    'main';
  gap: 24px;
  align-items: start;

  @container treatydetail (min-width: 920px) {
    grid-template-columns: minmax(0, 1fr) ${ASIDE_WIDTH}px;
    grid-template-areas:
      'top aside'
      'hero aside'
      'main aside';
    grid-template-rows: auto auto 1fr;
    gap: 20px 48px;
  }
`

export const TopRow = styled.div`
  grid-area: top;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  /* 우상단 전역 플로팅 아바타(≈48px)가 이 줄 끝을 덮는다 — 390px에서 '삭제'가 가려졌다.
     사건 상세 HeroTopRow와 같은 56px 비킴. */
  @media (max-width: 768px) {
    padding-right: 56px;
  }
`

export const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
  font-size: 12px;
  color: ${metaColor};

  button,
  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
    }

    ${focusRing}
  }
`

export const CrumbSep = styled.span`
  opacity: 0.5;
`

/* && — Breadcrumb의 'button { color: inherit }'(0,1,1)를 이겨야 유형 색이 남는다 */
export const TypeCrumb = styled.button<{ $color: string }>`
  && {
    font-weight: 600;
    color: ${({ $color }) => $color};
  }

  &&:hover {
    color: ${({ $color }) => $color};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

export const TopActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
`

/** 사건 상세 EditIconButton과 같은 조용한 버튼 — 평소엔 글자, hover에 테두리 */
export const QuietButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    color: ${({ theme, $danger }) =>
      $danger
        ? theme.mode === 'dark'
          ? '#fca5a5'
          : '#b91c1c'
        : theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  ${focusRing}
`

// ── 히어로 ──────────────────────────────────────

export const Hero = styled.section`
  grid-area: hero;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

export const HeroImage = styled.figure`
  margin: 0;
  width: 100%;
  max-width: 880px;
  aspect-ratio: 16 / 7;
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => fill(theme.mode, 0.04, 0.05)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

/** 대표 이미지가 없을 때 — 배너 대신 한 줄짜리 알약(사건 상세 '대표 이미지 추가'와 같은 자리) */
export const ImagePill = styled.label<{ $busy?: boolean }>`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  font-weight: 500;
  color: ${metaColor};
  cursor: ${({ $busy }) => ($busy ? 'progress' : 'pointer')};
  opacity: ${({ $busy }) => ($busy ? 0.6 : 1)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
`

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Title = styled.h1`
  margin: 0;
  font-size: clamp(27px, 3.4vw, 36px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.01em;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const HeroDateLine = styled.p`
  display: none;
  margin: 2px 0 0;
  flex-wrap: wrap;
  gap: 2px 6px;
  font-size: 13px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};

  @container treatydetail (max-width: 919px) {
    display: flex;
  }
`

export const Alias = styled.p`
  margin: 0;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 개요 — 히어로의 리드 문단(사건 상세 요약과 같은 17px 본문) */
export const Lead = styled.p`
  margin: 0;
  max-width: 880px;
  font-size: 17px;
  line-height: 1.75;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const Broken = styled.div`
  display: flex;
  gap: 10px;
  align-items: baseline;
  max-width: 880px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fecaca' : '#991b1b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.07)'};

  b {
    flex-shrink: 0;
    font-weight: 700;
  }
`

// ── 서명국 카드 (사건 상세 hero-country-cards 문법) ─────────

export const PartiesHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaColor};

  b {
    ${DIGIT_DISPLAY}
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const PartiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 8px;
  max-width: 1100px;

  /* 좁은 폭에선 2열 — 1열이면 서명국 6개가 카드 6장(≈600px)으로 세로를 다 먹는다(사건 상세와 같은 140px) */
  @container treatydetail (max-width: 639px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
`

export const PartyCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ theme }) => fill(theme.mode, 0.03, 0.04)};
  transition: background 0.12s;

  &:hover {
    background: ${({ theme }) => fill(theme.mode, 0.06, 0.07)};
  }

  &:hover [data-party-actions],
  &:focus-within [data-party-actions] {
    opacity: 1;
  }

  &:has(a[data-party-link]) {
    cursor: pointer;
  }

  &:has(a[data-party-link]:focus-visible) {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

export const PartyHead = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-right: 44px;

  /* 2열 카드(≈175px)에서 44px을 비우면 국가명 몫이 70px대로 준다 — 액션을 카드 아랫줄로 내린다 */
  @container treatydetail (max-width: 639px) {
    padding-right: 0;
  }
`

export const Emblem = styled.span<{ $historical: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  font-style: ${({ $historical }) => ($historical ? 'italic' : 'normal')};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => fill(theme.mode, 0.06, 0.08)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/* 국가명은 카드에서 가장 중요한 글자라 한 줄 말줄임 대신 두 줄까지 — 숨은 편집 아이콘 몫(44px)
   때문에 '그레이트브리튼 및 아일…'처럼 잘리던 것 */
export const PartyName = styled.span`
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;
  line-height: 1.35;
  font-size: 14px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
`

/**
 * 국가명 링크 — 카드 전체가 눌리도록 ::after로 카드를 덮는다(사건 상세 참여국 카드와 같은 동작:
 * 국가 정보 창). 수정자 키·가운데 클릭은 href(국가 상세)로 새 탭. 카드 안의 다른 조작
 * (편집·삭제·인물 링크·더 보기)은 z-index 1로 이 덮개 위에 선다.
 */
export const PartyNameLink = styled(Link)`
  min-width: 0;
  color: inherit;
  text-decoration: none;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
  }

  &:focus-visible {
    outline: none;
  }

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/** 서명 인물 → 인물 상세 */
export const PersonLink = styled(Link)`
  position: relative;
  z-index: 1;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  ${focusRing}
`

export const PartyTags = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
`

export const Tag = styled.span<{ $strong?: boolean }>`
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
  line-height: 18px;
  color: ${({ theme, $strong }) =>
    $strong ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme, $strong }) =>
    $strong ? fill(theme.mode, 0.09, 0.12) : fill(theme.mode, 0.05, 0.07)};
`

export const PartyLine = styled.span`
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .meta {
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: ${metaColor};
  }
`

/**
 * 서명국 비고 — "서명했으나 상원이 비준을 거부"처럼 그 나라가 이 조약에서 어떤 처지였는지.
 * 예전엔 수정 창에서만 보였다. 카드 높이가 들쭉날쭉하지 않게 3줄에서 접고, 넘칠 때만 '더 보기'.
 */
export const PartyNote = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin-top: 2px;
  padding-top: 7px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const PartyNoteText = styled.p<{ $expanded: boolean }>`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  word-break: keep-all;
  overflow-wrap: anywhere;
  white-space: pre-line;
  color: ${({ theme }) => theme.colors.text.secondary};

  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
    `}
`

export const NoteToggle = styled.button`
  position: relative;
  z-index: 1;
  padding: 0;
  border: none;
  background: none;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  ${focusRing}
`

/** 카드 우상단 편집·삭제 — hover/focus에서만 보인다(행마다 상시 아이콘 2개는 잡음이었다) */
export const PartyActions = styled.span`
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 8px;
  display: inline-flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;

  @media (hover: none) {
    opacity: 1;
  }

  @container treatydetail (max-width: 639px) {
    position: relative;
    top: auto;
    right: auto;
    align-self: flex-end;
    margin-top: -4px;
  }
`

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${metaColor};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => fill(theme.mode, 0.06, 0.1)};
  }

  ${focusRing}
`

export const AddCard = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 46px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${metaColor};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  ${focusRing}
`

// ── 우측 장부 ───────────────────────────────────

export const Aside = styled.aside`
  grid-area: aside;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  @container treatydetail (min-width: 920px) {
    position: sticky;
    top: 24px;
    gap: 6px;
  }
`

export const YearDisplay = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.text.primary};

  /* 한 칸 배치에선 바로 아래 날짜 줄이 연도를 이미 말한다 — 큰 숫자가 두 번 찍히지 않게
     (사건 상세 YearDisplay와 같은 판정) */
  @container treatydetail (max-width: 919px) {
    display: none;
  }
`

export const AsideLine = styled.div`
  /* 한 칸 배치에선 히어로 날짜 줄(HeroDateLine)이 같은 말을 먼저 한다 */
  &[data-wide-only] {
    @container treatydetail (max-width: 919px) {
      display: none;
    }
  }

  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    flex-shrink: 0;
    align-self: center;
    color: ${metaColor};
  }
`

export const FactRows = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 12px 0 0;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @container treatydetail (max-width: 919px) {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 32px;
    padding: 10px 0;
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

export const FactRow = styled.div`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @container treatydetail (max-width: 919px) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0;
    border-bottom: none;
  }
`

export const FactLabel = styled.dt`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaColor};
`

export const FactValue = styled.dd<{
  $tone?: 'danger' | 'type'
  $color?: string
}>`
  margin: 0;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  font-weight: ${({ $tone }) => ($tone ? 600 : 400)};
  color: ${({ theme, $tone, $color }) =>
    $tone === 'danger'
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : ($color ?? theme.colors.text.primary)};
`

export const FillHint = styled.button`
  align-self: flex-start;
  margin-top: 8px;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: ${metaColor};
  cursor: pointer;

  b {
    font-weight: 600;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:hover b {
    text-decoration: underline;
  }

  ${focusRing}
`

export const Toc = styled.nav`
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @container treatydetail (max-width: 919px) {
    display: none;
  }
`

export const TocLabel = styled.div`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaColor};
`

export const TocList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const TocItem = styled.button`
  display: flex;
  align-items: baseline;
  gap: 6px;
  width: 100%;
  margin-left: -1px;
  padding: 7px 0 7px 14px;
  border: none;
  border-left: 2px solid transparent;
  background: none;
  text-align: left;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  span {
    ${DIGIT_DISPLAY}
    font-size: 11px;
    color: ${metaColor};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-left-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  ${focusRing}
`

// ── 문서 열 ─────────────────────────────────────

export const Main = styled.main`
  grid-area: main;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-margin-top: 24px;
`

export const SectionHeader = styled.header`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
`

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: 18px;
  }
`

export const SectionMeta = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12.5px;
  font-weight: 500;
  color: ${metaColor};
`

export const SectionActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  gap: 4px;
`

export const Prose = styled.p`
  margin: 0;
  max-width: 880px;
  font-size: 16px;
  line-height: 1.8;
  word-break: keep-all;
  white-space: pre-line;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const EmptyLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${metaColor};
`

/** 조항 — 사건 상세 '배경' 번호 단락과 같은 원형 번호 + 제목 + 본문 */
export const TermList = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  max-width: 880px;
  display: flex;
  flex-direction: column;
`

export const TermItem = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:first-child {
    padding-top: 4px;
  }

  &:hover [data-term-actions],
  &:focus-within [data-term-actions] {
    opacity: 1;
  }
`

export const TermIndex = styled.span<{ $secret?: boolean }>`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
  font-size: 11.5px;
  font-weight: 600;
  border: 1.5px solid
    ${({ theme, $secret }) =>
      $secret
        ? theme.mode === 'dark'
          ? '#fca5a5'
          : '#b91c1c'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.4)'
          : 'rgba(15,23,42,0.45)'};
  color: ${({ theme, $secret }) =>
    $secret
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.colors.text.secondary};
`

export const TermBody = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 32px;
`

export const TermTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SecretTag = styled.span`
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)'};
`

export const TermContent = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.75;
  word-break: keep-all;
  white-space: pre-line;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const TermActions = styled.span`
  position: absolute;
  top: 12px;
  right: 0;
  opacity: 0;
  transition: opacity 0.12s;

  @media (hover: none) {
    opacity: 1;
  }
`

/**
 * 연결된 사건 — 사건 상세의 '조약' 모듈과 짝. 서술이 사건 쪽에만 있는 조약(사건에서 승격된 행)은
 * 여기가 유일한 길이다. 한 줄: 연도 · 제목(링크) · 연결 종류, 메모가 있으면 아랫줄.
 */
export const EventLinkList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  max-width: 880px;
  display: flex;
  flex-direction: column;
`

export const EventLinkRow = styled.li`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 2px 14px;
  padding: 11px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:first-child {
    padding-top: 2px;
  }

  @container treatydetail (max-width: 639px) {
    grid-template-columns: minmax(0, 1fr) auto;

    [data-event-year] {
      grid-column: 1 / -1;
    }
  }
`

export const EventLinkYear = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 13px;
  font-weight: 600;
  color: ${metaColor};
`

/* inline — 제목이 두 줄로 접혀도 ↗ 아이콘이 마지막 글자 뒤를 따라간다(flex면 오른쪽 끝에 떨어진다) */
export const EventLinkTitle = styled(Link)`
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  svg {
    margin-left: 6px;
    vertical-align: -1px;
    color: ${metaColor};
  }

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  ${focusRing}
`

export const EventLinkKind = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${metaColor};
`

export const EventLinkNote = styled.p`
  grid-column: 2 / -1;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  @container treatydetail (max-width: 639px) {
    grid-column: 1 / -1;
  }
`

/**
 * 더 채울 수 있는 것 — 사건 상세 `FillInStrip`과 같은 장치. 빈 섹션(개요·배경·결과·조항)은
 * 본문·목차에서 빠지고 여기 점선 칩으로 모인다. 예전엔 조항 0개(24건 중 19건)·이미지 0장(전부)이
 * 제목 + '없습니다' 문장으로 서서 거의 모든 조약이 빈 섹션 두 개로 끝났다.
 * 이미지는 칩을 두지 않는다 — 히어로의 '대표 이미지 추가'가 같은 일을 한다.
 */
export const FillStrip = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

/* 섹션 제목(20px)이 아니라 장부 라벨 크기 — 본문 섹션이 아니라 편집 안내다 */
export const FillStripTitle = styled.h2`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaColor};
`

export const FillChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const FillChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  ${focusRing}
`

/** 장부 사실 행 안의 링크(체결 사건) — 값 글자 그대로, hover에서만 링크임을 드러낸다 */
export const FactLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  word-break: keep-all;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  ${focusRing}
`

export const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  max-width: 880px;
`

export const ImageTile = styled.figure`
  position: relative;
  margin: 0;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: ${({ theme }) => fill(theme.mode, 0.04, 0.05)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  [data-primary] {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    color: #fff;
    background: rgba(15, 23, 42, 0.72);
  }

  [data-remove] {
    position: absolute;
    top: 6px;
    right: 6px;
    opacity: 0;
    color: #fff;
    background: rgba(15, 23, 42, 0.72);
    transition: opacity 0.12s;

    &:hover {
      color: #fff;
      background: rgba(185, 28, 28, 0.9);
    }
  }

  &:hover [data-remove],
  &:focus-within [data-remove] {
    opacity: 1;
  }
`

export const UploadLabel = styled.label<{ $busy?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: ${({ $busy }) => ($busy ? 'progress' : 'pointer')};
  opacity: ${({ $busy }) => ($busy ? 0.5 : 1)};

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
`
