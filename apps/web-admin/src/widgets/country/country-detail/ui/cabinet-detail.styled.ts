/**
 * 행정부·내각 상세 — 머리(수반 프로필)·경위 본문 칸.
 *
 * 머리: 예전엔 220px 원형 사진이 카드 위로 반쯤 튀어나온 가운데 정렬 카드라 1440px 첫 화면의 절반(≈430px),
 * 폰에서는 첫 화면 전부를 머리가 먹었다. 사진을 왼쪽 112px(폰 72px)로 두고 글자를 오른쪽에 왼쪽 정렬한다.
 * 경위 본문: 예전 칸은 520px 가운데 정렬이라 '취임 배경' 글이 제목 줄과 따로 놀며 화면 가운데 떠 있었다.
 *
 * cabinets-section.styled.tsx의 같은 부품을 styled()로 덮어써 쓴다(원본은 다른 지면 수정이 진행 중인 큰 파일).
 */
import styled from 'styled-components'

import * as CabS from './cabinets-section.styled'

export const HeroBlock = styled(CabS.HeadProfileBlock)`
  flex-direction: row;
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
  flex: 1;
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
