/**
 * List Page Shell Styled Components
 * 페이지 헤더 · 탭 · 메인/상세 패널 레이아웃 · 빈 상태 · 삭제 패널 · 단축키 도움말
 */
import styled, { keyframes } from 'styled-components'

import { BRAND, MOTION } from './theme'

/** lazy view chunk 다운로드 중 fallback — 화면 점프 없이 자리를 유지 */
const lazySpinKeyframes = keyframes`
  to { transform: rotate(360deg); }
`

export const LazyViewFallback = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const LazyViewSpinner = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(147, 197, 253, 0.18)'
        : 'rgba(37, 99, 235, 0.18)'};
  border-top-color: ${BRAND.primary};
  animation: ${lazySpinKeyframes} 0.7s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** 대시보드 등에 임베드 시 페이지 외곽 컨테이너 — 부모가 헤더/패딩을 제공한다고 가정 */
export const EmbedWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 16px;
`

/* 페이지 헤더 — Embed와 시각 시그너처 통일을 위해 좌측에 indigo accent bar.
 * Title 글꼴 크기로 위계는 유지(19px vs Embed 13px).
 *
 * v2: 통계 chip을 ViewMeta 자리로 옮기면서 헤더는 Title만 — 실제 align 컨텍스트가
 * 단순해져 padding 축소. */
/**
 * 시각적으로만 숨긴 페이지 제목.
 *
 * h1 '사건 연대표'는 좌측 nav의 활성 탭 '사건'과 같은 말을 27px + 간격 12px에 다시 적었고,
 * 스크롤해도 회수되지 않는 고정 크롬이었다. 시각 층에서는 지우되 문서에 h1이 없으면
 * 헤딩 탐색이 깨지므로(세기 h3 · 연도 h4가 그 아래에 매달려 있다) 접근성 트리에는 남긴다.
 */
export const VisuallyHiddenPageTitle = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 4px 2px 12px;
  flex-wrap: wrap;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    border-radius: 2px;
    background: ${BRAND.primary};
  }

  @media (max-width: 640px) {
    padding: 2px 2px 2px 14px;
  }
`

export const PageHeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

/* 제목은 admin 도구의 *시각 1순위*가 아니다 — 데이터가 1순위.
 * Embed(13px) ↔ 풀 페이지(19px)로 위계 명확히. */
export const PageHeaderTitle = styled.h1`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const PageHeaderSubtitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 임베드 헤더 — 페이지 헤더(19px)보다 한 톤 작게(13px)로 위계 분명히. */
export const EmbedHeader = styled.div`
  position: relative;
  padding: 12px 18px 8px 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};

  /* 좌측 단색 인디고 악센트 */
  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: ${BRAND.primary};
  }
`

export const EmbedHeaderHint = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 10px;
  font-size: 13px;
`

/**
 * 뷰 본문 래퍼 — 뷰 전환 세그먼트 + 활성 뷰 슬롯.
 *
 * ⚠️ 여기에 폭 상한을 두지 않는다. 상한의 소유자는 `layout.styles.ts`의 `PageWrapper`
 * 하나다(`theme.ts` LIST_WIDTH). 예전엔 이 래퍼가 1120px 캡을 들고 있었는데, 정작 가장
 * 넓은 검색·필터 바(CatalogToolbar)는 CatalogSplit 바깥이라 캡을 안 받아 **우측 끝이
 * 2종**으로 갈렸다 — 그게 "우측만 비었다"의 직접 원인이었다(2026-08-02 검토).
 *
 * 캡을 셸로 올린 뒤 이 자리에 상한을 다시 걸면 no-op이거나 이중 소유가 된다:
 * 미선택 시 부모 track1 = 셸 − 40 ≤ ink, 선택 시 = 셸 − 40 − gap − 패널 ≤ ink 이므로
 * 전 대역에서 이미 상한 이하다.
 */
export const ActiveContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  min-width: 0;
  flex: 1;
`

export const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 4px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e5e7eb'};
  background: transparent;
`

export const TabButton = styled.button<{ $active: boolean; $tone: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  position: relative;
  transition:
    color 0.18s ease,
    background 0.18s ease;
  color: ${({ theme, $active, $tone }) =>
    $active
      ? $tone === 'danger'
        ? '#ef4444'
        : '#2563eb'
      : theme.colors.text.tertiary};
  border-radius: 8px 8px 0 0;

  /* 활성 탭의 underline은 ::after로 — 1px border와 겹쳐 매끈하게 */
  &::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active, $tone }) =>
      $active
        ? $tone === 'danger'
          ? 'linear-gradient(90deg, #ef4444, #f97316)'
          : 'linear-gradient(90deg, #2563eb, #2563eb)'
        : 'transparent'};
    transition: background 0.18s ease;
  }

  &:hover:not([aria-selected='true']) {
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.03)'};
  }
`

/* 빈 상태 박스 — 어드민 톤에 맞춰 콤팩트.
 * padding 96 → 56, radius 18 → 12, 원형 아이콘 56 → 40px.
 * 장식 ⌕ 글리프는 SR에서 의미 없는 문자로 읽히지 않도록 배경 SVG로 대체. */
export const EmptyResults = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 56px 32px;
  text-align: center;

  @media (max-width: 640px) {
    padding: 36px 16px;
  }
  margin: 12px;
  border-radius: 12px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.012)'
      : 'rgba(15,23,42,0.008)'};

  &::before {
    content: '';
    display: inline-block;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoft};
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="%2393c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>');
    background-repeat: no-repeat;
    background-position: center;
    margin-bottom: 4px;
  }
`

export const EmptyResultsTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const EmptyResultsHint = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.6;
  max-width: 360px;
`

export const DeletedEventsPanel = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 18px;
`

export const DeletedEventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DeletedEventRow = styled.button`
  position: relative;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px 16px 14px 18px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'};
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s,
    box-shadow 0.15s;

  /* 좌측 빨강 악센트 + 미세 반투명 — 휴지통/아카이브 인상 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(239, 68, 68, 0.55);
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  &:hover {
    border-color: rgba(239, 68, 68, 0.45);
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239,68,68,0.08)'
        : 'rgba(239,68,68,0.03)'};
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);
  }
  &:hover::before {
    opacity: 1;
  }
`

export const DeletedEventTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  /* 삭제 항목 — 살짝 줄긋기 인상으로 시각 단서 */
  text-decoration: line-through;
  text-decoration-color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(239,68,68,0.5)'
      : 'rgba(239,68,68,0.35)'};
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
`

export const DeletedEventMeta = styled.div`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/**
 * 상세 패널 컨테이너:
 * - >=1200px: Layout.CatalogSplit grid의 두 번째 컬럼으로 자연스럽게 자리잡음
 * - <1200px: 우측에서 슬라이드인하는 fixed drawer로 동작
 *
 * 다크 모드 drawer 배경은 PageScene(`#0f0f0f`)보다 한 톤 위(`#171717`)로 경계 인지 강화.
 */
export const DetailPanelHost = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 1200px) {
    position: fixed;
    top: var(--header-height, 0);
    right: 0;
    bottom: 0;
    width: min(420px, 92vw);
    z-index: 1100;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#171717' : '#ffffff'};
    box-shadow: ${({ $open }) =>
      $open ? '-12px 0 32px rgba(15, 17, 29, 0.18)' : 'none'};
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
    transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
    transition: transform ${MOTION.drawer};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    /* drawer 내부 스크롤이 body로 새는 것 방지 (iOS rubber band 포함) */
    overscroll-behavior: contain;
  }

  /* 모바일 — drawer를 풀폭으로. 92vw로 8vw만 backdrop 노출하던 이전엔
   * 정확한 backdrop tap이 어려워 닫기가 사실상 헤더 X 버튼 한 가지뿐이었음. */
  @media (max-width: 640px) {
    width: 100vw;
    width: 100dvw;
    border-left: none;
  }

  @media (max-width: 1200px) and (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** drawer 상단 sticky 띠 — 좌측에 선택된 사건 제목, 우측에 닫기 버튼.
 * 컨텐츠 자체가 헤더를 가져도 시각적으로 *drawer 자체의 헤더*가 분명히 분리됨. */
export const DetailDrawerHeader = styled.div`
  display: none;

  @media (max-width: 1200px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px 10px 16px;
    border-bottom: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#171717' : '#ffffff'};
    position: sticky;
    top: 0;
    z-index: 1;
  }
`

/** drawer header 좌측 제목 — 선택된 사건 제목. 길면 ellipsis. */
export const DetailDrawerHeaderTitle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const DetailDrawerBackdrop = styled.div<{ $open: boolean }>`
  display: none;

  @media (max-width: 1200px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
    z-index: 1099;
  }

  @media (max-width: 1200px) and (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** drawer header 안쪽에 위치하는 닫기 버튼 — 컨텐츠와 겹치지 않음. */
export const DetailDrawerClose = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background ${MOTION.fast}, color ${MOTION.fast},
    border-color ${MOTION.fast};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/** 드로어 열림 고지 전용 — 시각적으로 숨기고 접근성 트리에만 남긴다. */
export const DrawerAnnouncer = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

export const ShortcutOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  /**
   * 짧은 뷰포트 대비 — 모달이 열린 동안 body는 overflow:hidden이고 셸도 position:fixed라
   * 문서 스크롤이 아예 없다. 오버레이에 스크롤이 없으면 내용(13항목 + 섹션 제목 ≈ 600px)이
   * 뷰포트 높이 ~660px 미만에서 위아래로 잘린 채 **읽을 방법이 사라진다**(검토 RWD-5).
   * 내용이 넘칠 때만 세로 스크롤이 생기도록 하고, 중앙 정렬이 넘침을 잘라먹지 않게
   * align-items를 safe center로 둔다.
   */
  overflow-y: auto;
  overscroll-behavior: contain;
  /* 위의 align-items:center 는 의도적인 폴백이다 — safe 키워드 미지원 브라우저에서는
   * 중앙 정렬이 유지되고(넘치면 위쪽이 잘릴 수 있음), 지원 브라우저에서는 넘칠 때
   * start 정렬로 떨어져 잘림 없이 스크롤된다. */
  align-items: safe center;
  animation: fadein 0.15s ease-out;

  @keyframes fadein {
    from {
      opacity: 0;
    }
  }
`

export const ShortcutBox = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(28,28,32,0.96)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  border-radius: 18px;
  padding: 20px 24px 22px;
  width: 100%;
  max-width: 460px;
  /* 오버레이 패딩(24px×2)을 뺀 높이를 넘지 않게 하고, 넘치면 박스 안에서 스크롤한다.
   * dvh가 이 폴더의 정본이다(layout.styles.ts:27, modal.styles.ts:168) — 100vh는 모바일에서
   * 주소창 높이만큼 실제 뷰포트보다 커서, 상한을 걸어도 그만큼 잘린다. vh는 구형 폴백. */
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.24),
    0 2px 6px rgba(15, 23, 42, 0.06);
  animation: pop 0.18s ease-out;

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const ShortcutOverlayInner = styled.div`
  display: contents;
`

export const ShortcutHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

export const ShortcutClose = styled.button`
  background: transparent;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 단축키 도움말의 섹션 구분 — "타임라인 보기" 등 그룹별 헤더 */
export const ShortcutSectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 14px 10px 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

export const ShortcutList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: background 0.12s;

    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(15,23,42,0.025)'};
    }

    & > span:last-child {
      margin-left: auto;
      color: ${({ theme }) => theme.colors.text.primary};
      font-weight: 500;
    }
  }

  kbd {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 7px;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-bottom-width: 2px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
    font: 600 11.5px/1
      ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    /* 다크 모드에서도 키 입체감이 보이도록 안쪽 highlight 강화 */
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)'
        : 'inset 0 -1px 0 rgba(15,23,42,0.04)'};
  }
`

/**
 * 사건 fetch 실패 배너 — events=[]를 '사건 없음'으로 오인시키지 않도록 명시적 오류 + 재시도.
 */
export const ErrorBanner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 260px;
  padding: 32px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ErrorBannerTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ErrorBannerDesc = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ErrorRetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: ${BRAND.primary};
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${MOTION.fast};

  &:hover {
    background: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`
