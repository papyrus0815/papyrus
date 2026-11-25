/**
 * 행정부·내각 상세 — 머리(수반 프로필)·경위 본문 칸.
 *
 * 머리: 예전엔 220px 원형 사진이 카드 위로 반쯤 튀어나온 가운데 정렬 카드라 1440px 첫 화면의 절반(≈430px),
 * 폰에서는 첫 화면 전부를 머리가 먹었다. 사진을 왼쪽 112px(폰 72px)로 두고 글자를 오른쪽에 왼쪽 정렬한다.
 * 경위 본문: 예전 칸은 520px 가운데 정렬이라 '취임 배경' 글이 제목 줄과 따로 놀며 화면 가운데 떠 있었다.
 *
 * cabinets-section.styled.tsx의 같은 부품을 styled()로 덮어써 쓴다(원본은 다른 지면 수정이 진행 중인 큰 파일).
 */
import { motion } from 'framer-motion'
import styled from 'styled-components'

import * as CabS from './cabinets-section.styled'
import { SubsectionAddBtn } from './country-politics-tab.styles'

export const HeroBlock = styled(CabS.HeadProfileBlock)`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  text-align: left;
  gap: 24px;
  margin-top: 4px;
  margin-bottom: 8px;
  padding: 20px 24px;

  @media (max-width: 560px) {
    gap: 14px;
    padding: 16px;
  }
`

export const HeroAvatar = styled(CabS.HeadProfileAvatar)`
  position: relative;
  left: auto;
  top: auto;
  transform: none;
  width: 112px;
  height: 112px;
  border-width: 2px;

  svg {
    width: 40%;
    height: 40%;
  }

  @media (max-width: 560px) {
    width: 72px;
    height: 72px;
  }
`

export const HeroMeta = styled(CabS.HeadProfileMeta)`
  align-items: flex-start;
  gap: 8px;
  max-width: none;
  /* 전임·후임 칸(240px)이 옆에 못 들어갈 만큼 좁아지면 그 칸이 아래 줄로 내려앉는다 */
  flex: 1 1 300px;
  width: auto;

  /* 폰: 사진(72px) 옆에 글자가 남도록 — 300px 기준이면 사진만 한 줄을 차지했다 */
  @media (max-width: 560px) {
    flex-basis: 180px;
  }
`

/** 머리 오른쪽 — 전임·후임 행정부 이동(세로 두 단추 + 몇 번째인지) */
export const HeroNav = styled.nav`
  flex: 0 1 260px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 18px;
  border-left: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf0')};

  .position {
    margin: 0 0 2px 8px;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  @media (max-width: 560px) {
    flex-basis: 100%;
    padding-left: 0;
    padding-top: 10px;
    border-left: none;
    border-top: 1px solid
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf0')};
  }
`

export const HeroNavBtn = styled.button`
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 32px;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .caption {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .label {
    font-size: 12.5px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#eef2f7'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
`

export const HeroBadgeRow = styled(CabS.HeadProfileBadgeRow)`
  justify-content: flex-start;
`

export const HeroHeadline = styled(CabS.HeadProfileHeadline)`
  text-align: left;
  font-size: 24px;

  @media (max-width: 560px) {
    font-size: 20px;
  }
`

export const HeroTenureRow = styled(CabS.HeadTenureRow)`
  justify-content: flex-start;
`

/** 경위·개요 본문 — 제목 줄과 같은 왼쪽 선에서 시작, 읽기 폭 72자 */
export const ProseColumn = styled(CabS.HeadTenureInfoRichColumn)`
  max-width: min(100%, 72ch);
  margin-left: 0;
  margin-right: 0;

  /* 한국어는 어절 단위로 — 좁은 폭에서 '대 / 통령'처럼 낱말이 잘렸다 */
  &,
  & p {
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
`

export const ProseEditorWrap = styled(ProseColumn)`
  margin-bottom: 8px;
`

/** 아직 안 적은 취임·퇴임 경위를 여는 한 줄 단추 묶음 */
export const TenureQuickAddRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 0 18px;
`

/**
 * 취임 · 퇴임 두 칸 — 넓으면 좌우, 좁거나 한 칸뿐이면 한 줄을 다 쓴다(auto-fit이 빈 칸을 접는다).
 * 예전엔 위아래로 따로 쌓이고 본문이 72자로 줄어 오른쪽 절반이 비었다.
 */
export const TenurePair = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  column-gap: 36px;
  scroll-margin-top: 12px;

  > ${TenureQuickAddRow} {
    grid-column: 1 / -1;
  }
`

/** 취임·퇴임 칸 — 예전 민트/분홍 왼쪽 띠·점 대신 다른 섹션과 같은 아이콘 머리(띠는 이 두 칸만 쓰던 별도 문법) */
export const TenureCard = styled(CabS.HeadTenureInfoSection)`
  border-left: none;
  padding-left: 0;
  min-width: 0;
`

/** 각료 상세 오른쪽 단추 묶음 — 예전엔 간격 0이라 '임명 수정'·'내각 제외' 테두리가 한 덩어리로 붙어 보였다 */
export const MinisterActions = styled(CabS.MinisterProfileAction)`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** '내각 제외'는 연결을 끊는 단추 — 수정과 같은 인디고 대신 경고색 */
export const DetachBtn = styled(SubsectionAddBtn)`
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  border-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(248,113,113,0.35)' : 'rgba(220,38,38,0.28)'};
  background: transparent;

  svg {
    color: inherit;
  }

  &:hover:not(:disabled) {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fecaca' : '#991b1b')};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.6)' : 'rgba(220,38,38,0.5)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.1)' : 'rgba(254,226,226,0.6)'};
  }
`

/**
 * 상세 뷰 뿌리. 아직 아무것도 없는 섹션(각료·재임 기록·사건·조약 0건)은 머리 줄만 남긴다 —
 * 머리에 이미 '0건'이 있는데 그 아래 '…없습니다' 띠와 위아래 32/36px 여백까지 두면 빈 섹션 하나가 ≈150px,
 * 네 개면 화면 하나(≈600px)가 '없음'이었다. 표시는 data-empty-note를 단 빈 띠에만(검색 결과 없음·오류 문구는 그대로).
 */
export const DetailRoot = styled(motion.div)`
  [data-empty-note] {
    display: none;
  }
  div:has(> [data-empty-note]) {
    padding-top: 14px;
    padding-bottom: 14px;
  }
`
