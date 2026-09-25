/**
 * Event Detail — page-level layout & shared frames.
 *
 * 디자인 의도
 * - 본문은 단일 칼럼(가독폭 720~760px)으로 narrative-first.
 * - 섹션 헤더는 *eyebrow + 큰 타이틀* — 밑줄 X, 공백이 리듬을 결정.
 * - 카드/모듈은 hairline border 위주 — 하위 사건은 flat rows, fill 카드 사용처 없음.
 * - ledger 페이지의 토큰 체계(ledger-tokens.ts)를 그대로 차용해 다크/라이트 일관 유지.
 */
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { metaText } from '@/pages/events/styles/theme'

import {
  DIGIT_DISPLAY,
  MOTION,
  ledgerAccent,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineHover,
  ledgerHairlineStrong,
  RADIUS,
} from '@/pages/events/ledger/styles/ledger-tokens'

/* ───────────────────────── Page Shell ───────────────────────── */

/**
 * 전역 `body { overflow: hidden }` + `#root { height: 100vh }` 때문에 윈도우
 * 스크롤이 잠겨 있다. 페이지 자체를 *내부 스크롤 컨테이너*로 만들어야 sticky·hash
 * scroll이 정상 동작한다 (ledger 페이지 동일 패턴).
 */
export const Page = styled.div`
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  overflow-y: auto;
  overflow-x: hidden;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family:
    -apple-system, BlinkMacSystemFont, 'Inter', 'Pretendard', 'Noto Sans KR',
    sans-serif;

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)} transparent;
`

export const PageInner = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 28px 96px;

  @media (max-width: 768px) {
    padding: 18px 16px 72px;
  }
`

/**
 * Body grid — sticky rail + main column.
 * Wide(≥1101px): 200px rail + 1fr main, gap 56
 * Narrow(≤1100): single column, rail collapses 위로.
 *
 * 이전에는 sections.length<5일 때 `$noRail`로 grid 컬럼을 1fr 단일 + 가운데 정렬로
 * 바꿨지만, 모듈 활성화에 따라 임계값을 오가며 main 컬럼 위치가 점프하는 jitter가
 * 발생했다. 지금은 항상 동일한 2-컬럼 grid를 유지하고, rail 컨텐츠 자체는
 * `DetailRail`이 sections<5에서 null을 반환해 시각적으로만 사라진다 — main 위치는
 * 절대 흔들리지 않는다.
 */
export const Body = styled.div`
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 56px;
  align-items: start;
  margin-top: 36px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 24px;
    margin-top: 24px;
  }
`

export const Main = styled.main`
  /**
   * narrative-first 가독폭. 이전에는 760이었으나 내부 SectionBody·HeroSummary·
   * SummaryHost가 모두 720으로 막혀 있어 narrative(배경·전개·여파)와 그 외
   * 섹션(actors·network·modules·appendix) 사이에 40px 가로 차이가 발생했음.
   * Main을 720으로 통일해 모든 섹션이 동일 폭으로 정렬되도록 한다.
   *
   * grid cell(868px 폭)의 *가운데*에 배치해 Hero 콘텐츠 영역의 시각 중앙과
   * 정렬한다. 이전에는 좌측 정렬이라 Hero(폭 868)와 본문(폭 720) 사이에
   * 우측으로 148px 비대칭이 보였다.
   */
  min-width: 0;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 64px;

  @media (max-width: 768px) {
    gap: 44px;
  }
`

/* ───────────────────────── Hero ───────────────────────── */

export const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 32px;
  width: 100%;

  /**
   * 진입 페이드업 — 사건 진입(또는 다른 사건으로 이동 시 ErrorBoundary key 리셋으로
   * 리마운트)마다 1회. 인라인 patch refetch에는 DOM이 유지돼 재생되지 않는다.
   */
  @media (prefers-reduced-motion: no-preference) {
    animation: heroRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes heroRise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  /**
   * Hero 콘텐츠 폭을 Main(720px)과 동일하게 잡고 가운데 정렬.
   * Main이 grid cell 안에서 margin: auto로 가운데 오므로, Hero도 같은
   * 시각 좌표(좌측 시작·우측 끝)를 가져야 본문과 정렬이 어긋나지 않는다.
   */
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;

  /**
   * wide 화면에서는 Body grid의 rail(200) + gap(56) = 256px만큼 콘텐츠를
   * 우측으로 밀어 main column의 좌측 시작 좌표와 정렬한다. max-width는 그
   * padding을 포함해 늘려 콘텐츠 영역은 여전히 720px를 유지(box-sizing: border-box).
   * Body의 미디어 브레이크(1100px)와 동일한 임계값을 사용한다.
   */
  @media (min-width: 1101px) {
    padding-left: calc(200px + 56px);
    max-width: calc(720px + 200px + 56px);
  }
`

/**
 * 히어로 상단 줄(목록 링크 · 분류 · 상위 체인) — **보조 데이텀**이라 metaText를 쓴다.
 *
 * text.tertiary는 소형 텍스트 기준 WCAG AA(4.5:1)에 미달한다(실측 라이트 2.54:1 ·
 * 다크 3.82:1). 목록이 날짜·건수·누락 고지를 이 토큰에서 metaText로 옮긴 것과 같은
 * 이유다 — 이 줄이 담은 '어느 사건 아래인가'는 화면에서 가장 안 읽히면 안 되는 축이다.
 */
export const HeroTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: ${metaText};
`

export const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  /* 상위 사건 체인 — 링크다. 읽히지 않으면 위계가 통째로 사라진다(metaText 근거는 HeroTopRow). */
  color: ${metaText};

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
      outline-offset: 2px;
      border-radius: ${RADIUS.FOCUS};
    }

    &:not(:last-child)::after {
      content: '›';
      margin-left: 8px;
      opacity: 0.5;
    }

    /* '+N' 추가 상위 배지 앞은 체인 하강이 아니라 병렬 소속 — '›' 구분자를 지운다. */
    &:has(+ [data-extra-parents])::after {
      content: none;
    }
  }
`

/**
 * 카테고리 색 dual 적용 — 다크에서는 $colorDark(전달 시)로 스왑, 미전달이면
 * $color 폴백. module-*.tsx의 MODULE_COLOR(라이트 베이크) 소비처는 $colorDark를
 * 안 넘기므로 현상 유지 — 모듈 지면 다크 보정은 후속 배치(known-gap).
 */
const dualColor = (
  mode: 'light' | 'dark',
  color: string,
  colorDark?: string,
) => (mode === 'dark' ? colorDark ?? color : color)

/**
 * 분류 표지 — **색 면(fill) 없음. hue는 글자와 글리프에만 싣는다.**
 *
 * 목록이 2026-08-02에 같은 판단을 실측으로 내렸다(event-list-item CategoryLabel):
 *  ⑴ 칩 배경과 표면의 대비가 10색 전부 1.06~1.25:1 — '배지'로 읽히지도 않으면서 화면
 *     색 면적의 대부분을 차지한다.
 *  ⑵ 원색 텍스트는 소형에서 AA 미달이라, 목록은 hue별 **AA 대비 shade**
 *     (CATEGORY_SOFT_COLORS.text / .textDark)로 글자를 칠한다.
 *
 * 이 칩은 그 폐기된 조합(반투명 fill + 30% border + pill + 원색 텍스트)을 그대로 갖고
 * 있었다. 게다가 히어로 상단의 조용한 12px 줄에서 혼자 가장 큰 색 면이라, 바로 아래
 * h1이 가져야 할 시선을 앞에서 가로챘다.
 *
 * ⚠️ $color/$colorDark에는 원색이 아니라 **AA shade**를 넘길 것(소비처가 CATEGORY_SOFT_COLORS
 *    에서 꺼내 전달한다). 원색을 넘기면 ⑵의 대비 미달로 되돌아간다.
 */
export const CategoryChip = styled.span<{ $color: string; $colorDark?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  color: ${({ theme, $color, $colorDark }) =>
    dualColor(theme.mode, $color, $colorDark)};

  > [aria-hidden] {
    line-height: 1;
  }
`

export const HeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 18px 28px;
  align-items: center;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding-top: 4px;
`

/**
 * HeroMetaItem — 좌측 prefix 아이콘 한 개만 스코프해서 스타일.
 * 안쪽의 다른 svg(✎ 등)에 cascade 되지 않도록 `> svg:first-child` 선택자 사용.
 */
export const HeroMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  ${DIGIT_DISPLAY}

  > svg:first-child {
    width: 14px;
    height: 14px;
    margin-right: 6px;
    opacity: 0.65;
  }
`

export const HeroActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
`

/* ───────────────────────── Rail (sticky 좌측) ───────────────────────── */

export const Rail = styled.aside`
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-right: 4px;
  max-height: calc(100vh - var(--header-height, 64px) - 60px);
  overflow-y: auto;
  scrollbar-width: thin;

  /**
   * 1100px 아래에서는 옆 칼럼이 사라져 **본문 흐름 위로 내려온다**(Body가 1단이 됨).
   * 이때 세로 목록 모양을 그대로 끌고 내려오면 642px 폭에 33px짜리 줄이 8개 쌓여
   * 289px — 첫 섹션이 화면 밖으로 밀린다. 아래 RailNavList/RailNavItem이 같은
   * 중단점에서 **가로 한 줄**로 바꾼다(실측 289 → 40px).
   */
  @media (max-width: 1100px) {
    position: static;
    max-height: none;
    overflow: visible;
    padding: 0 0 14px;
    background: transparent;
    border: none;
    gap: 0;
  }
`

export const RailGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  /* 라벨과 목록을 한 줄에 — '목차'가 제 줄을 차지할 이유가 없다 */
  @media (max-width: 1100px) {
    flex-direction: row;
    align-items: baseline;
    gap: 12px;
  }
`

/**
 * '목차' — 한글 두 글자다. uppercase는 아무 일도 하지 않고, 0.14em은 라틴 스몰캡스용
 * 트래킹이라 한글에서는 글자가 흩어진다(DefLabel과 같은 규약). 목록의 라벨 트래킹
 * (연 머리글 0.04em)에 맞추고, 크기는 FONT_SCALE의 META(10.5/600)로.
 */
export const RailGroupLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${metaText};

  @media (max-width: 1100px) {
    flex-shrink: 0;
    /* 가로 줄에서는 칩들의 글자선에 맞춰 내려앉는다 */
    transform: translateY(-1px);
  }
`

export const RailNavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  /* 흐름으로 내려오면 축이 눕는다 — 세로 자를 가로 자로 */
  @media (max-width: 1100px) {
    flex-direction: row;
    flex-wrap: wrap;
    row-gap: 2px;
    border-left: none;
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

/**
 * RailNavItem — 이전엔 styled.li + onClick(키보드 미접근).
 * 이제 styled.button으로 바꿔 Tab/Enter/Space로 자연 활성화. 부모 ul 안에서는
 * 사용 측이 `<li>`로 감싸 list semantics를 유지한다(ul > li > button 구조).
 */
export const RailNavItem = styled.button<{ $active: boolean }>`
  position: relative;
  width: 100%;
  padding: 7px 0 7px 14px;
  margin-left: -1px;
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  /* 비활성 항목도 '지금 어디쯤인가'를 읽어야 하는 내비다 — metaText(AA)로. */
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : metaText({ theme })};
  background: transparent;
  border: 0;
  border-left: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  text-align: left;
  cursor: pointer;
  transition: color ${MOTION.normal}, border-color ${MOTION.normal};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }

  /* 가로 줄에서는 현재 위치 표시도 같이 눕는다 — 왼쪽 막대 → 밑줄 */
  @media (max-width: 1100px) {
    width: auto;
    margin-left: 0;
    margin-bottom: -1px;
    padding: 6px 11px;
    border-left: 0;
    border-bottom: 2px solid
      ${({ theme, $active }) =>
        $active ? ledgerAccent(theme.mode) : 'transparent'};
  }
`

/* ───────────────────────── Section frame ───────────────────────── */

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
  scroll-margin-top: 24px;
`

/**
 * SectionHeader — 큰 타이틀 + 부제 + 우측 액션.
 * 밑줄/구분선 없이 스페이싱이 리듬을 결정.
 * baseline 정렬로 타이틀과 부제 글꼴 크기 차이를 자연스럽게.
 */
export const SectionHeader = styled.header`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-bottom: 4px;
`

/**
 * 섹션 제목 — 제목 36 : 섹션 20 : 본문 15.5의 가운데 단.
 * 24px이던 시절엔 본문의 1.55배로 목록의 단조(1.29배)보다 층이 넓었다.
 * 자간도 한글 규약대로 -0.012 → -0.01em.
 */
export const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;

  @media (max-width: 640px) {
    font-size: 18px;
  }
`

/**
 * 모듈 SectionTitle 좌측 카테고리 점 — 페이지 안에서 카테고리 색이 여러 톤으로
 * 흩뿌려지는 노이즈를 줄이기 위해 작고 옅게. 히어로가 이미 분류를 한 번 말했으므로
 * (제목 아래 액센트 막대 + 상단 줄의 분류 글자) 여기서는 섹션 그루핑만 한다.
 * $colorDark는 optional — module-*.tsx 소비처는 미전달($color 폴백, known-gap).
 */
export const SectionTitleDot = styled.span<{
  $color: string
  $colorDark?: string
}>`
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme, $color, $colorDark }) =>
    dualColor(theme.mode, $color, $colorDark)};
  margin-right: 10px;
  margin-bottom: 4px;
  opacity: 0.7;
  flex-shrink: 0;
`

export const SectionSubtitle = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  /* 건수·단락 수 = 목록이 metaText로 옮긴 바로 그 '보조 데이텀'이다. */
  color: ${metaText};
  ${DIGIT_DISPLAY}
`

export const SectionActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

export const EditIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color ${MOTION.fast}, border-color ${MOTION.fast};

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/**
 * SectionBody — 읽기 본문(배경·전개·여파). 좁은 가독폭과 넉넉한 line-height.
 */
export const SectionBody = styled.div`
  font-size: 15.5px;
  line-height: 1.78;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 720px;
`

/* ───────────────────────── Module data card ──────────────────────────── */

/**
 * 모듈의 데이터 묶음(작전 정보·교전 진영 등)을 감싸는 hairline 카드.
 * 사상자 stat 카드와 동일한 톤 — 좌측 3px 모듈색 액센트 + hover border.
 * 본문 narrative엔 카드를 쓰지 않는 원칙을 지키되, "수치/표" 성격의 모듈 데이터는
 * 이 카드로 묶어 본문과 시각적으로 분리한다($accent로 모듈색 주입).
 */
export const ModuleDataCard = styled.div<{ $accent: string }>`
  position: relative;
  padding: 14px 16px 14px 18px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  /* 12px은 이 지면에서 가장 둥근 값이었다 — 목록이 flat rows로 간 뒤의 톤에 맞춘다. */
  border-radius: ${RADIUS.MD};
  /**
   * 면(fill) 없음. 이 파일 머리말이 "카드/모듈은 hairline border 위주 — fill 카드 사용처
   * 없음"이라 적어 두고 정작 여기서 1.5~2% tint를 깔고 있었다. 목록도 그룹 머리글의
   * 회색 밴드(GROUP_BAND)를 폐기하고 지면색으로 갔다 — 경계는 선이 긋고, 면은 비운다.
   */
  background: transparent;
  transition: border-color ${MOTION.normal};

  &::before {
    content: '';
    position: absolute;
    top: 16px;
    left: 0;
    width: 3px;
    height: 16px;
    border-radius: 0 2px 2px 0;
    background: ${({ $accent }) => $accent};
    opacity: 0.55;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerHairlineHover(theme.mode)};
  }
`

/* ───────────────────────── Definition list (모듈 데이터 표) ──────────── */

/**
 * 모듈에서 라벨-값 쌍을 sk할 때 사용. 카드 surface보다 가벼움.
 * 좌측 좁은 라벨 · 우측 값. 작은 화면에선 한 줄로 떨어진다.
 */
export const Definitions = styled.dl`
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px 18px;
  margin: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 4px 0;
  }
`

export const DefRow = styled.div`
  display: contents;
`

/**
 * 라벨 — 받는 값이 전부 한글이다('지휘관'·'병력'·'분쟁 유형'·'전쟁 비용').
 * uppercase는 한글에 아무 일도 하지 않고, 0.06em 라틴 트래킹은 자간만 벌려 읽기를
 * 해친다(목록이 한글 큰 제목에서 되돌린 것과 같은 규약). 색은 metaText — 11px은
 * text.tertiary가 AA에 가장 크게 미달하는 크기대다.
 */
export const DefLabel = styled.dt`
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${metaText};
  padding-top: 3px;

  @media (max-width: 640px) {
    margin-top: 8px;
  }
`

export const DefValue = styled.dd`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  /* 병력·사상자·전쟁 비용이 들어오는 자리 — 목록의 모든 수치가 그렇듯 자릿수를 세운다. */
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* ───────────────────────── Tag/Chip primitives ───────────────────────── */

export const Tag = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-size: 12.5px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme, $color }) => $color ?? metaText({ theme })};
  border: none;
  white-space: nowrap;
`

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/* ───────────────────────── States ───────────────────────── */

export const StateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 320px;
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-top-color: ${({ theme }) => ledgerAccent(theme.mode)};
  border-radius: 50%;
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const ErrorText = styled.p`
  font-size: 14px;
  margin: 0;
  color: ${({ theme }) => theme.colors.error ?? '#dc2626'};
`

export const HelperText = styled.p`
  font-size: 12.5px;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.6;
`

/* 로딩/에러 상태 박스의 행동 링크(예: 목록으로 돌아가기). */
export const StateBackLink = styled(Link)`
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/* ───────────────────────── Empty state ───────────────────────── */

/**
 * 섹션 비어 있을 때 통일 placeholder. text + 옵션 CTA가 한 묶음으로 보이도록.
 * 회색 italic 한 줄 + 좌측 dashed 강조선. HelperText는 보조 텍스트(에러·hint)
 * 용도로 둠.
 */
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 0 16px 16px;
  border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13.5px;
  line-height: 1.6;
`

/**
 * 빈 상태 헤더 — 맥락 아이콘 + 한 줄 안내. 아이콘은 emoji/노드로 전달.
 * italic은 보조 메타용으로 예약하고, 빈 상태는 또렷한 secondary 텍스트로 발견성 ↑.
 */
export const EmptyStateHead = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const EmptyStateIcon = styled.span`
  display: inline-flex;
  font-size: 16px;
  line-height: 1;
  opacity: 0.65;
`

export const EmptyStateLine = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`
