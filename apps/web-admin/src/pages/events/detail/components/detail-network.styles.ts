import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  MOTION,
  categoryAccent,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerHairlineStrong,
  ledgerRowWash,
  withAlpha,
  type LedgerCategory,
} from '@/pages/events/ledger/styles/ledger-tokens'

/**
 * 연관(네트워크) 섹션 styled 레이어 — detail-network 컨테이너·블록(parent/children/
 * keywords)·링크 후보 픽커 훅이 공유한다. 스타일만 모은 파일이라 로직 import 없음.
 *
 * 문법은 person-detail-panel의 flat-list-rows 정본(UnifiedCard 계열)을 이 지면
 * 어휘로 번역: 행 사이 `& + &` 헤어라인 · `::before` 인셋 워시 · 킥커 글리프
 * 소프트 디스크 · 편집 크롬 hover-reveal(+focus-visible/hover:none/reduced-motion
 * 폴백 4종). 포커스 링 색은 ledgerAccent로 단일화.
 */

export const HierBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

/** 블록 마이크로 라벨 — 상위/추가 상위/하위/키워드 공용(용도중립 이름으로 복제 방지). */
export const BlockLabel = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const HelperNote = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const TextBtn = styled.button`
  /* 최소 24×24 터치 타깃(WCAG 2.5.8) — 12.5px 텍스트라도 클릭 영역은 24px 확보. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  min-width: 24px;
  padding: 0 4px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  /* 기본 opacity는 1 — 투명화는 소속 reveal 스코프($reveal HierRow·ExtraChip)만
     수행하므로, 스코프 밖 TextBtn('새 하위 사건 만들기' 등)은 상시 노출. */
  transition: color ${MOTION.fast}, opacity ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
    color: ${({ theme }) => theme.colors.text.primary};
    opacity: 1;
  }

  &:disabled {
    /* opacity 감쇠 대신 명시색 — 다크에서 대비 침몰 방지. */
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: not-allowed;
  }
`

/* 칩 '사유' 토글 버튼 — TextBtn 계열, 사유 보유 시 강조·펼침 시 액센트. */
export const ReasonToggleBtn = styled(TextBtn)<{ $hasReason?: boolean }>`
  color: ${({ theme, $hasReason }) =>
    $hasReason ? theme.colors.text.primary : theme.colors.text.tertiary};

  &[aria-expanded='true'] {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** '외 N개 더 보기' — 공개(비파괴) 컨트롤을 mutation 시그니처(TextBtn)에서 분리.
    어떤 reveal 스코프에도 안 들어가 상시 노출. */
export const MoreBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  min-width: 24px;
  padding: 0 4px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: color ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

/** $reveal opt-in — 편집 크롬(TextBtn) 은닉은 주 상위 행(parent-block)만.
    추가·등록 어포던스가 있는 행은 미지정으로 상시 노출을 보장한다(AddBtn은
    셀렉터가 TextBtn 한정이라 $reveal 행 안에서도 항상 보임). */
export const HierRow = styled.div<{ $reveal?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;

  ${({ $reveal }) =>
    $reveal &&
    css`
      ${TextBtn} {
        opacity: 0;
      }

      &:hover ${TextBtn},
      &:focus-within ${TextBtn} {
        opacity: 1;
      }

      /* 키보드 포커스 시 가시화 — opacity:0 + hover만 있으면 Tab 이동해도 계속
         투명해 보이지 않는다. */
      ${TextBtn}:focus-visible {
        opacity: 1;
      }

      /* 터치 환경 — hover-reveal은 발견성 0이 되므로 반투명 상시 노출. */
      @media (hover: none) {
        ${TextBtn} {
          opacity: 0.55;
        }
      }
    `}
`

/** 주 상위 링크 — 섹션의 제1 시각 앵커(15px/700). */
export const ParentLink = styled(Link)`
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

export const ExtraParentsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

/** 추가 상위 칩 — 보더 필 해체(무보더), 칩 경계는 interpunct(·)로
    (hero CountryInline·UnifiedFact 전례와 동형). 항목 귀속 편집 컨트롤
    (사유·승격·✕ = 직계 button)만 자기 스코프 hover-reveal. */
export const ExtraChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;

  & + &::before {
    content: '·';
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 400;
  }

  > button {
    opacity: 0;
  }

  &:hover > button,
  &:focus-within > button {
    opacity: 1;
  }

  > button:focus-visible {
    opacity: 1;
  }

  /* 터치 환경 — hover-reveal은 발견성 0이 되므로 반투명 상시 노출. */
  @media (hover: none) {
    > button {
      opacity: 0.55;
    }
  }
`

/** $pending — 제목 동기화 중 폴백을 정상 제목과 즉시 구분(이탤릭·tertiary). */
export const ExtraChipLink = styled(Link)<{ $pending?: boolean }>`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${({ $pending }) =>
    $pending &&
    css`
      font-style: italic;
      font-weight: 500;
      color: ${({ theme }) => theme.colors.text.tertiary};
    `}

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

/* 연결 사유 편집 라인 — 주 상위 행/추가 상위 칩 아래. 좌측 얇은 킥커 + InlineText. */
export const ReasonLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-left: 2px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ReasonKicker = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* 하위 행의 연결 사유 라인 — 행 내부 서브라인(워시 z-index:0 위). 카드 밖
   들여쓰기 매직넘버는 행 편입으로 소멸. */
export const ChildReasonRow = styled.div`
  display: flex;
  position: relative;
  z-index: 1;
  padding: 0;
  margin-top: 6px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export const SiblingNav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
`

export const SiblingLink = styled(Link)<{ $alignEnd?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 48%;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  justify-content: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  margin-left: ${({ $alignEnd }) => ($alignEnd ? 'auto' : '0')};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`

export const SiblingText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 하위 행 제거 버튼 — 채운 원 대신 투명 hover-reveal(UnifiedEditBtn 규약).
    reveal은 ChildRow 스코프가 담당. 24px 터치 타깃. */
export const RemoveChildBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 4px;
  z-index: 2; /* ::before 워시(z-index:0) 위에서 클릭 가능하게 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity ${MOTION.fast}, transform ${MOTION.fast},
    background ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) => theme.colors.error};
  }

  /* 키보드 포커스 시 가시화 — opacity:0 + hover만 있으면 Tab 이동해도 계속
     투명해 보이지 않는다. */
  &:focus-visible {
    opacity: 1;
    transform: scale(1);
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }

  /* 모션 민감 사용자 — transition에서 transform 항 제거(scale 정지, 정본 규약). */
  @media (prefers-reduced-motion: reduce) {
    transition: opacity ${MOTION.fast}, background ${MOTION.fast},
      color ${MOTION.fast};
    transform: none;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/** 하위 사건 리스트 — 시간순 단일 칼럼(2열 그리드 폐기, 시간축과 읽기 순서 정합). */
export const ChildList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
`

/** 하위 사건 행 — UnifiedCard 직역: 카드 박스 대신 행 사이 헤어라인 +
    hover/focus 시에만 뜨는 인셋 라운드 워시(중성 — 카테고리 신호는 킥커
    디스크 한 채널로 한정). */
export const ChildRow = styled.li`
  position: relative;
  display: block;
  padding: 12px 8px;

  /* 형제 행 사이 헤어라인 — 카드 박스 대신 리스트 구분선. 첫 행은 무선. */
  & + & {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(15,23,42,0.07)'};
  }

  /* 행 하이라이트 — 지속 서피스가 아니라 hover/focus 시에만 뜨는 라운드 워시.
     상하 6·좌우 4px 인셋이라 구분선과 겹치지 않고, z-index:0으로 내용 뒤에 깔린다. */
  &::before {
    content: '';
    position: absolute;
    inset: 6px 4px;
    border-radius: 10px;
    background: ${({ theme }) => ledgerRowWash(theme.mode)};
    opacity: 0;
    transition: opacity ${MOTION.fast};
    pointer-events: none;
    z-index: 0;
  }
  &:hover::before,
  &:active::before {
    opacity: 1;
  }
  &:focus-within::before {
    opacity: 1;
    box-shadow: 0 0 0 1.5px ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

  /* 항목 귀속 편집 컨트롤(제거 ✕)만 행 스코프 hover-reveal. */
  ${RemoveChildBtn} {
    opacity: 0;
  }
  &:hover ${RemoveChildBtn},
  &:focus-within ${RemoveChildBtn} {
    opacity: 1;
    transform: scale(1);
  }

  /* 터치 환경 — hover-reveal은 발견성 0이 되므로 반투명 상시 노출. */
  @media (hover: none) {
    ${RemoveChildBtn} {
      opacity: 0.55;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }
  @media (max-width: 560px) {
    padding: 11px 4px;
  }
`

export const ChildTitle = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`

/** 하위 사건 링크 — 박스 소멸(보더·그림자·배경 없음). hover 피드백은 행 워시
    + 제목 밑줄이 담당. */
export const ChildCard = styled(Link)`
  display: block;
  position: relative;
  z-index: 1;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
  text-decoration: none;

  &:hover ${ChildTitle} {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

/** 킥커(eyebrow) — 카테고리 글리프 소프트 디스크 + 날짜(없으면 카테고리명).
    좌측 색 레일(ChildBar) 대체 — 색맹 안전: 글리프 모양이 색과 독립 신호. */
export const ChildEyebrow = styled.div<{ $cat: LedgerCategory }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $cat }) => categoryAccent($cat, theme.mode)};

  > span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1;
    flex-shrink: 0;
    background: ${({ theme, $cat }) =>
      withAlpha(
        categoryAccent($cat, theme.mode),
        theme.mode === 'dark' ? 0.18 : 0.1,
      )};
    color: inherit;
  }
`

export const ChildBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

export const ChildDesc = styled.span`
  font-size: 12.5px;
  line-height: 1.55;
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

export const KeywordsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

export const KeywordChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  font-size: 12.5px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border: none;

  &::before {
    content: '#';
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-right: 1px;
  }

  /* 항목 귀속 편집 컨트롤(제거 ✕)만 자기 스코프 hover-reveal. */
  > button {
    opacity: 0;
  }

  &:hover > button,
  &:focus-within > button {
    opacity: 1;
  }

  > button:focus-visible {
    opacity: 1;
  }

  /* 터치 환경 — hover-reveal은 발견성 0이 되므로 반투명 상시 노출. */
  @media (hover: none) {
    > button {
      opacity: 0.55;
    }
  }
`

export const ChipX = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

/** 추가 버튼 — 상주 폼 크롬 강등: 대시드 보더는 hover/focus 발현(EditIconButton
    전례와 동형). 버튼 자체는 상시 노출(추가 어포던스 — 텍스트는 항상 보임,
    보더만 침묵). 히트 영역(패딩)은 불변. */
export const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px dashed transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color ${MOTION.fast}, color ${MOTION.fast};

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }

  &:disabled {
    /* opacity 감쇠 대신 명시색 — 다크에서 대비 침몰 방지. */
    color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: not-allowed;

    &:hover {
      border-color: transparent;
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

export const KeywordInput = styled.input`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  min-width: 140px;

  /* 폼 컨트롤이라 보더 신호 유지 + 링은 focus-visible 계열. */
  &:focus {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`
