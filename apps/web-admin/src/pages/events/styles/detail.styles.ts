/**
 * Detail Panel Styled Components
 * 상세 패널 관련 스타일 — ledger polish 적용 (transform/lift 제거, 토큰 사용).
 *
 * 표시 책임 분리:
 *   - desktop (>=1200px): CatalogSplit grid의 두 번째 컬럼이 호스트
 *   - mobile (<1200px): CatalogDetailDrawer가 호스트 (PageStyles.DetailPanelHost)
 *   → DetailPanel 자체는 *어디에 있든 항상 표시*. 이전 `display:none` 분기는 drawer 안에서도
 *      숨기는 버그였음 — 제거.
 */
import styled, { css } from 'styled-components'

import type { HistoricalEventCategory } from '../create/events.types'
import { BRAND, CATEGORY_BADGE_COLORS, DANGER, MOTION, SHADOW } from './theme'

/**
 * Detail panel root — `<section>` (이전 `<aside>`는 drawer dialog 안에 들어가면 SR semantics 충돌).
 * mobile drawer 안에서도 표시되어야 하므로 `display:none` 분기 제거.
 */
export const DetailPanel = styled.section`
  height: 100%;
  border-radius: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #ffffff;
          border: 1px solid rgba(20, 19, 34, 0.08);
        `}

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${BRAND.primarySoftHover};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${BRAND.primaryFill};
  }

  /* drawer 안에서는 자체 border 제거 (drawer가 border-left 가짐) */
  @media (max-width: 1200px) {
    border: none;
    border-radius: 0;
  }
`

/**
 * 상세 패널 본문.
 *
 * ⚠️ **측정(measure) 보호가 필요하다.** 전폭 전환에서 패널 폭이 440px 고정 →
 * `clamp(400px, 22vw, 620px)`로 유동이 됐다(layout.styles의 CatalogSplit). 상한이 없으면
 * 3440에서 본문 한 줄이 과하게 길어져, "목록은 105자/줄인데 패널은 30자/줄"이라는 예전
 * 역전이 **반대 방향으로** 재발한다.
 *
 * ch 단위는 폰트 크기를 따라가므로 한글에서도 대략 맞는다(72ch ≈ 한글 36자 안팎).
 * 히어로 이미지·메타 그리드는 패널 폭 전체를 쓰고, **텍스트 블록만** 이 상한을 받는다 —
 * 그래서 여기가 아니라 문단·서술 컴포넌트에 거는 것이 아니라, 컨테이너에서 중앙정렬로
 * 처리한다(자식이 stretch면 이미지도 같이 좁아진다).
 */
export const DetailPanelContent = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;

  /* 읽기 지면 상한 — 패널이 넓어질 때만 실제로 걸린다(좁을 땐 no-op). */
  > * {
    max-width: 72ch;
    margin-inline: auto;
    width: 100%;
  }

  /* 히어로는 지면 전체를 쓴다 — 상한을 받으면 좌우에 흰 띠가 생긴다.
   *
   * ⚠️ width: auto 가 **필수**다(styled 리터럴 안이라 백틱을 쓸 수 없다).
   * 바로 위 규칙의 width: 100% 가 figure에도 걸리면 '부모 폭 100% + 자기 좌우 마진 32px'이
   * 돼 패널 밖으로 16px 삐져나간다 — 실측 패널 1182~1580인데 figure 1198~1596으로,
   * 히어로 이미지 오른쪽이 카드 경계에서 잘렸다. auto면 flex stretch가 마진을 뺀 폭을 준다. */
  > figure {
    max-width: none;
    width: auto;
  }
`

/**
 * Hero image / category chip은 새 `HeroFigure` + `CategoryChip`으로 대체됨 (위젯에서 사용).
 * 이전 컴포넌트는 사용처 0이라 제거.
 */

export const DetailPanelEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 24px;
  position: relative;
  @media (max-width: 768px) { min-height: 320px; padding: 32px 20px; }
`

/* EmptyResults(40px+18px)와 비례 통일 */
export const DetailPanelEmptyIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
    color: ${BRAND.primary};
  }
`

export const DetailPanelEmptyContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

export const DetailPanelEmptyTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.mode === 'dark' ? '#94a3b8' : '#1e293b'};
  @media (max-width: 768px) { font-size: 14px; }
`

export const DetailPanelEmptyDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#475569' : '#64748b')};
  animation: textPulse 3s ease-in-out infinite;

  @keyframes textPulse {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  /* 운동 민감 사용자 — pulse 정지 */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.85;
  }

  @media (max-width: 768px) {
    font-size: 12px;
  }
`

/**
 * 헤더 — sticky top. 본문 길어져도 제목/액션 항상 보임.
 * 배경색은 panel surface와 동일 (불투명) — 스크롤 시 본문이 비치지 않게.
 */
export const DetailPanelHeader = styled.div<{ $expanded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  /*
   * sticky는 **접힌 요약일 때만**. 요약을 펼치면 이 헤더가 실측 500px(패널 819px의 61%)이
   * 되는데, 그대로 붙어 있으면 스크롤을 아무리 내려도 본문에 남는 자리가 300px뿐이다 —
   * 화면 대부분을 차지한 채 따라다니는 '고정 머리글'이 된다. 펼친 요약은 크롬이 아니라
   * 사용자가 방금 요청한 **본문**이므로 함께 흘러가는 게 맞다. 선택이 바뀌면 접힘으로
   * 되돌아가므로(위젯의 useEffect) sticky도 자동으로 복귀한다.
   */
  position: ${({ $expanded }) => ($expanded ? 'static' : 'sticky')};
  top: 0;
  z-index: 2;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: #0f0f12;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #ffffff;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        `}

  @media (max-width: 768px) {
    padding: 14px 16px;
  }
`

/* 제목 + X 닫기 버튼 row — 제목은 flex-grow, 닫기는 flex-shrink-none */
export const DetailTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

export const DetailTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
  flex: 1;
  min-width: 0;
`

/* 데스크톱 column 모드에서도 X로 명시적 닫기 — 모바일 drawer 헤더와 동일한 톤 */
export const DetailCloseButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-top: -2px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }
`

export const DetailDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const DetailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px;
  &:first-of-type { padding-top: 20px; }
`

/**
 * 구역 머리글(하위 사건 · 배경 · 여파).
 *
 * brand blue(#2563eb)였다. 이 패널에서 파랑이 맡고 있던 일이 이미 다섯 가지였다 —
 * '더 보기' 토글 · '상세 보기' CTA · '상위 사건' 링크 · 관련국 칩 글자 · 그리고 이 머리글.
 * 그중 넷은 누를 수 있고 머리글만 누를 수 없는데 옷이 같아서, 읽는 쪽에서는 '하위 사건 (4개)'이
 * 링크로 보였다. 파랑은 **누를 수 있는 것**에만 남기고 머리글은 중립색 + 굵기로 선다.
 *
 * text-transform: uppercase도 걷어낸다 — 이 지면의 머리글은 전부 한글이라 no-op이었다.
 */
export const DetailSectionTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.04em;
`

export const DetailStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`

export const DetailStatCard = styled.div`
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
  ` : css`
    background: #fafbff;
    border: 1px solid rgba(20, 19, 34, 0.08);
  `}

  svg { color: #2563eb; flex-shrink: 0; margin-top: 2px; width: 16px; height: 16px; }
  div { display: flex; flex-direction: column; gap: 3px; }
  small { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${({ theme }) => theme.mode === 'dark' ? '#475569' : '#64748b'}; }
  strong { font-size: 13px; font-weight: 600; color: ${({ theme }) => theme.mode === 'dark' ? '#e2e8f0' : '#0f172a'}; }
`

export const DetailText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const DetailFiguresList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DetailFigureCard = styled.div`
  border-radius: 10px;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  div { display: flex; flex-direction: column; gap: 2px; }
  ${({ theme }) => theme.mode === 'dark' ? css`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    strong { font-size: 12px; color: #e2e8f0; }
    span { font-size: 11px; color: #64748b; }
    small { font-size: 10px; color: #475569; }
  ` : css`
    background: #fafbff;
    border: 1px solid rgba(20, 19, 34, 0.08);
    strong { font-size: 12px; color: #0f172a; }
    span { font-size: 11px; color: #475569; }
    small { font-size: 10px; color: #64748b; }
  `}
`

export const DetailFigureAvatar = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
`

export const DetailCountriesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const DetailCountryTag = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
`

export const DetailChildrenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

/**
 * 하위 사건 항목의 날짜 — 제목 바로 아래 한 줄.
 * 예전엔 드로어의 하위 목록에 날짜가 아예 없어, 목록에서 보던 시간 순서와 대조할 수
 * 없었다(검토 DISC-7). `span` 규칙(요약)과 색·크기를 나눠 두 줄이 구별되게 한다.
 */
export const DetailChildDate = styled.time`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 하위 사건 목록 하단 액션 줄 — '더 보기'와 '전체 계층 구조 보기'. */
export const DetailChildrenMoreRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

/** '나머지 N개 더 보기' — 텍스트 버튼. */
export const DetailChildrenMoreButton = styled.button`
  border: none;
  background: transparent;
  padding: 4px 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${BRAND.primary};
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;

  &:hover {
    text-decoration: underline solid;
  }
`

/**
 * 하위 사건 카드.
 *
 * 요약·날짜 글자가 라이트·다크 모두 `#64748b` 11px이었다 — 다크 카드 배경(#1b1b1b 상당)
 * 위에서 **3.62:1**로 WCAG AA(4.5:1) 미달이고, 라이트도 4.60:1로 경계선이었다.
 * 이 목록의 요약은 '어느 하위 사건인지'를 가르는 유일한 문장이라 가장 안 읽히면 안 되는
 * 자리다. 이 지면이 이미 쓰는 메타 토큰 짝(라이트 #6b7280 / 다크 #94a3b8)으로 옮긴다
 * — 각각 4.68:1 / 6.72:1.
 */
export const DetailChildItem = styled.button`
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(37, 99, 235, 0.12);
          strong { font-size: 12px; font-weight: 600; color: #e2e8f0; }
          span { font-size: 11px; line-height: 1.4; color: #94a3b8; }
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: ${BRAND.primarySoftDark};
          }
        `
      : css`
          background: #fafbff;
          border: 1px solid rgba(37, 99, 235, 0.12);
          strong { font-size: 12px; font-weight: 600; color: #0f172a; }
          span { font-size: 11px; line-height: 1.4; color: #6b7280; }
          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: #f0f4ff;
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const DetailActions = styled.div`
  padding: 12px 16px;
  ${({ theme }) => theme.mode === 'dark' ? css`
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
  ` : css`
    border-top: 1px solid rgba(37, 99, 235, 0.1);
    background: rgba(248, 250, 252, 0.5);
  `}
`

export const SecondaryActionsRow = styled.div`
  display: flex;
  gap: 8px;
`

export const SecondaryActionButton = styled.button`
  flex: 1;
  border-radius: 8px;
  padding: 8px 12px;
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  svg { width: 13px; height: 13px; }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid ${BRAND.primaryBorder};
          &:hover {
            border-color: ${BRAND.primaryBorderHover};
            background: ${BRAND.primarySoftDark};
            color: #93c5fd;
          }
        `
      : css`
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(37, 99, 235, 0.15);
          &:hover {
            border-color: rgba(37, 99, 235, 0.3);
            background: rgba(37, 99, 235, 0.06);
            color: #1d4ed8;
          }
        `}
`

export const ViewAllHierarchyButton = styled.button`
  border-radius: 8px;
  padding: 8px 12px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.2);
          &:hover {
            border-color: rgba(37, 99, 235, 0.4);
            background: rgba(37, 99, 235, 0.14);
          }
        `
      : css`
          background: rgba(37, 99, 235, 0.05);
          border: 1px solid rgba(37, 99, 235, 0.25);
          &:hover {
            border-color: rgba(37, 99, 235, 0.4);
            background: rgba(37, 99, 235, 0.1);
          }
        `}
`

/* Timeline View styled 6종(TimelineContainer·EventCard·EventDate·EventTitle·
   EventSummary·Importance)은 v3 이전부터 사용처 0의 죽은 코드 — 삭제(검토 R42).
   타임라인 뷰는 이후 목록에 흡수돼 위젯째 사라졌다(docs/event-timeline-merged-into-list.md) —
   시간 비례 막대는 목록 기간 열이 그린다(widgets/event-list-compact/lib/year-span.ts). */

// Tree View
export const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const TreeNodeWrapper = styled.div<{ $depth: number }>`
  margin-left: ${({ $depth }) => $depth * 32}px;
  position: relative;

  ${({ $depth }) => $depth > 0 && `
    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 20px;
      width: 12px;
      height: 2px;
      background: rgba(37, 99, 235, 0.25);
    }

    &::after {
      content: '';
      position: absolute;
      left: -16px;
      top: 0;
      bottom: 50%;
      width: 2px;
      background: rgba(37, 99, 235, 0.15);
    }
  `}
`

/* TreeNodeCard — 2px 두꺼운 border + 중첩 box-shadow + hover translateX 모두 제거.
 * 좌측 1px stripe만 importance 색으로 (시각 단서 보존). */
export const TreeNodeCard = styled.div<{
  $depth: number
  $importance: 'critical' | 'major' | 'notable'
}>`
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  transition: border-color 0.15s, background 0.15s;
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)'};
  border-left: 3px solid ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.5)'
      case 'major': return 'rgba(251, 191, 36, 0.5)'
      default: return 'rgba(37, 99, 235, 0.4)'
    }
  }};
  ${({ theme, $depth }) => theme.mode === 'dark' ? css`
    background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.06)' : 'rgba(255, 255, 255, 0.03)'};
    &:hover { background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.06)'}; }
  ` : css`
    background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.04)' : '#ffffff'};
    &:hover { background: ${$depth === 0 ? 'rgba(37, 99, 235, 0.07)' : 'rgba(37, 99, 235, 0.03)'}; }
  `}
`

export const TreeNodeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

export const TreeNodeTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  flex: 1;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f5f9' : '#0f172a'};
`

export const TreeImportanceBadge = styled.span<{
  $importance: 'critical' | 'major' | 'notable'
}>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)'
      case 'major': return 'rgba(251, 191, 36, 0.15)'
      default: return 'rgba(37, 99, 235, 0.1)'
    }
  }};
  color: ${({ $importance }) => {
    switch ($importance) {
      case 'critical': return '#dc2626'
      case 'major': return '#d97706'
      default: return '#2563eb'
    }
  }};
`

export const TreeNodeDate = styled.div`
  font-size: 12px;
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 6px;
`

export const TreeNodeSummary = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : '#475569'};
`

export const TreeNodeChildren = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const SummaryIconButton = styled.button`
  border: none;
  background: ${BRAND.primarySoftHover};
  padding: 4px 6px;
  border-radius: 6px;
  color: ${BRAND.primary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast};
  flex-shrink: 0;
  margin-left: 6px;

  &:hover {
    background: ${BRAND.primaryFill};
    color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// EventDetailPanel 위젯 전용 스타일 — 이전엔 위젯 안 inline. detail.styles로 hoist.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hero image — 패널 폭 fit. 16px 좌우 여백만. CLS 방지를 위해 height는 skeleton과 일치.
 *
 * `$empty`(대표 이미지 없음)일 때는 **높이를 예약하지 않는다**. 실측 293건 중 대표 이미지를
 * 가진 사건은 **19건(6.5%)** — 나머지 274건에서는 헤더 바로 아래 200px짜리 점선 빈 상자가
 * 지면의 첫 화면을 차지하고, 분류·기간·관련국 같은 실제 내용은 그만큼 접힌 아래로 밀렸다.
 * 추가 동선은 남기되(발견성) 높이는 한 줄짜리 띠로 줄인다.
 */
export const HeroFigure = styled.figure<{ $empty?: boolean }>`
  margin: 12px 16px 0;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  height: ${({ $empty }) => ($empty ? '40px' : '200px')};
  background-color: ${({ theme, $empty }) =>
    $empty
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#f1f5f9'};
`

export const HeroImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

export const HeroPlaceholder = styled.button`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 세로 스택 → 가로 한 줄. 40px 띠 안에서 아이콘과 문구가 나란히 선다. */
  flex-direction: row;
  gap: 6px;
  background: transparent;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color ${MOTION.fast}, background ${MOTION.fast},
    color ${MOTION.fast};
  font-family: inherit;

  svg {
    opacity: 0.55;
  }

  &:hover {
    border-color: ${BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
    color: ${BRAND.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * Action toolbar — icon ghost group + 우측 filled primary CTA.
 * primary는 페이지 단 CreateEventButton과 동일 톤 (filled indigo).
 */
export const ActionButtonRow = styled.div`
  display: flex;
  align-items: center;
  /*
   * 묶음 사이 간격(10) > 묶음 안 간격(2). 예전에는 여섯 버튼이 전부 같은 6px 간격이라
   * '이전/다음'(목록 이동) · '공유/수정/삭제'(이 사건에 대한 조작) · '상세 보기'(이동)가
   * 한 줄에 균질하게 늘어서 있었다 — 되돌릴 수 없는 삭제가 수정 바로 옆에, 같은 무게로.
   */
  gap: 10px;
  margin-top: 4px;

  & > [data-cta='primary'] {
    margin-left: auto;
  }
`

/** 액션 묶음 — 한 가지 일을 하는 버튼들만 담는다. */
export const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

/** 묶음 경계 — 간격만으로는 약한 자리(파괴적 동작 앞)에 세우는 얇은 세로선. */
export const ActionDivider = styled.span`
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)'};
`

type ActionVariant = 'ghost' | 'ghost-danger' | 'primary'

export const ActionButton = styled.button<{ $variant: ActionVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: -0.005em;
  border-radius: 8px;
  transition: background ${MOTION.fast}, color ${MOTION.fast},
    border-color ${MOTION.fast};

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  &:disabled {
    cursor: default;
    opacity: 0.35;
    pointer-events: none;
  }

  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      // CreateEventButton과 동일한 filled primary
      return css`
        height: 32px;
        padding: 0 12px;
        font-size: 12.5px;
        font-weight: 600;
        background: ${BRAND.primary};
        border: 1px solid ${BRAND.primary};
        color: #ffffff;
        &:hover {
          background: ${BRAND.primaryHover};
          border-color: ${BRAND.primaryHover};
        }
      `
    }
    if ($variant === 'ghost-danger') {
      return css`
        width: 32px;
        height: 32px;
        padding: 0;
        background: transparent;
        border: 1px solid transparent;
        /* 평소에도 약한 빨강 단서 — 위험 동작 인지 */
        color: ${theme.mode === 'dark' ? '#fca5a5' : DANGER.base};
        opacity: 0.7;
        &:hover {
          background: ${theme.mode === 'dark'
            ? 'rgba(239, 68, 68, 0.12)'
            : DANGER.fill};
          color: ${theme.mode === 'dark' ? '#f87171' : DANGER.base};
          border-color: ${DANGER.border};
          opacity: 1;
        }
      `
    }
    return css`
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      color: ${theme.colors.text.secondary};
      &:hover {
        background: ${theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.04)'};
        color: ${theme.colors.text.primary};
      }
    `
  }}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 본문 컨텐츠 영역 — sticky 헤더와 분리 */
export const InfoBlock = styled.div`
  padding: 14px 20px 16px;

  @media (max-width: 768px) {
    padding: 12px 16px 14px;
  }
`

/* InfoGrid — line-height 1.8 → 1.6 (정보 밀도 ↑) */
export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 14px;
  font-size: 13px;
  line-height: 1.6;
  /*
   * 라벨은 값의 **첫 줄 옆**에 선다.
   *
   * stretch(기본)로 두면 라벨 박스가 값 높이만큼 늘어나고 그 안에서 세로 중앙정렬이라,
   * 값이 길수록 라벨이 아래로 흘러내렸다 — 실측 '위치'는 평균 58자(최장 237자)라 3~4줄,
   * '본문 구성'은 사건당 최대 14개라 라벨이 블록 한가운데 떠 있었다. 무엇의 라벨인지
   * 알려면 눈이 다시 위로 올라가야 한다.
   */
  align-items: start;
`

export const InfoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

export const InfoValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`

export const InfoMutedHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 8px;
  white-space: nowrap;
`

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`

/**
 * Country chip — 평면 톤 통일 (이전 gradient 제거).
 * filter.styles.FilterChip / list-toolbar.ActiveFilterChip와 family.
 */
export const CountryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 500;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : BRAND.primaryHover)};
  /*
   * 테두리 없음 — 이 칩은 **누를 수 없다**. 채움 + 1px 외곽선 + 600 굵기는 이 패널에서
   * 유일하게 실제 버튼인 '상세 보기'와 같은 옷이라, 5개가 두 줄로 깔리면 정보가 아니라
   * 버튼 밭으로 읽혔다(필터 칩 가족을 그대로 빌려 온 자리 — 거긴 누르는 칩이다).
   * 면 tint만 남겨 '분류가 있는 값'이라는 사실만 싣는다.
   */
`

/* 역사적 국가 — amber 톤. 페이지 안에서 오직 이 chip만 amber라 색 분리 의도 보존. */
export const HistoricalCountryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 500;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.18)'
      : 'rgba(245, 158, 11, 0.10)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
  /* 테두리 없음 — CountryChip과 같은 이유. 현대/역사 구분은 hue가 계속 맡는다. */
`

/**
 * 본문 구성 = **목차**다. 칩이 아니라 목록으로 그린다.
 *
 * 이전엔 `SectionChip`(회색 알약)을 ChipRow에 흘렸다. 칩은 짧은 꼬리표를 담는 그릇인데
 * 여기 들어가는 값은 실측 평균 **22자**(최장 45자)짜리 제목 문장이라("개전 — 라이징 라이언
 * 작전 (2025-06-13)"), 알약 하나가 값 열을 거의 다 차지하고 여러 개가 세로로 쌓여
 * 길이가 제각각인 회색 덩어리 더미가 됐다(사건당 최대 14개). 번호를 매긴 한 줄짜리 목록은
 * 같은 폭에서 더 많이, 더 읽히게 담고 '이 글이 어떤 순서로 쓰였는가'를 그대로 말한다.
 */
export const SectionList = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;
  counter-reset: section-index;
`

export const SectionItem = styled.li`
  counter-increment: section-index;
  display: grid;
  grid-template-columns: 1.4em 1fr;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: counter(section-index) '.';
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
`

/** 미리보기 상한을 넘은 나머지 — 숫자만 조용히 남긴다. */
export const SectionMore = styled.li`
  grid-column: 1 / -1;
  padding-left: calc(1.4em + 6px);
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * 카테고리 chip — InfoGrid 안에서 항상 표시 (이전엔 hero image 위 absolute라 이미지 없으면 사라짐).
 * 카테고리 색을 좌측 dot으로 표현 + 텍스트.
 */
export const CategoryChip = styled.span<{
  $category: HistoricalEventCategory
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 10px 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${({ $category }) =>
      CATEGORY_BADGE_COLORS[$category] ?? '#6b7280'};
    flex-shrink: 0;
  }
`

/**
 * 길이 긴 description — line-clamp + "더 보기"/"접기" 토글.
 * `$expanded` prop으로 외부에서 제어.
 */
export const DescriptionWrap = styled.div`
  position: relative;
`

export const DescriptionText = styled.p<{ $expanded: boolean }>`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};

  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`

export const DescriptionToggle = styled.button`
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${BRAND.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: color ${MOTION.fast};

  &:hover {
    color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
    border-radius: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
