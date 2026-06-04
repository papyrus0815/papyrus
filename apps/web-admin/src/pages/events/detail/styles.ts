/**
 * Event Detail — page-level layout & shared frames.
 *
 * 디자인 의도
 * - 본문은 단일 칼럼(가독폭 720~760px)으로 narrative-first.
 * - 섹션 헤더는 *eyebrow + 큰 타이틀* — 밑줄 X, 공백이 리듬을 결정.
 * - 카드/모듈은 hairline border 위주, fill은 nav성 카드(children grid)에만.
 * - ledger 페이지의 토큰 체계(ledger-tokens.ts)를 그대로 차용해 다크/라이트 일관 유지.
 */
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerInkLine,
  withAlpha,
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

export const HeroTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.text.primary};
    }

    &:not(:last-child)::after {
      content: '›';
      margin-left: 8px;
      opacity: 0.5;
    }
  }
`

export const CategoryChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: ${({ $color }) => withAlpha($color, 0.1)};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => withAlpha($color, 0.3)};
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

/* RichTextReadView가 div를 렌더하므로 div로 둔다. */
export const HeroSummary = styled.div`
  font-size: 16.5px;
  font-weight: 400;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 4px 0 0;
  max-width: 720px;
`

export const HeroActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
`

const buttonReset = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.16s, color 0.16s, border-color 0.16s;

  svg {
    width: 13px;
    height: 13px;
  }
`

export const PrimaryButton = styled.button`
  ${buttonReset}
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: #ffffff;
  border: 1px solid transparent;

  &:hover {
    filter: brightness(1.05);
  }
`

export const SecondaryLink = styled.a`
  ${buttonReset}
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
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

  @media (max-width: 1100px) {
    position: static;
    max-height: none;
    overflow: visible;
    padding: 0;
    background: transparent;
    border: none;
  }
`

export const RailGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const RailGroupLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const RailNavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
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
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: transparent;
  border: 0;
  border-left: 2px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  text-align: left;
  cursor: pointer;
  transition: color 0.16s, border-color 0.16s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
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

export const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.012em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;

  @media (max-width: 640px) {
    font-size: 21px;
  }
`

/**
 * 모듈 SectionTitle 좌측 카테고리 점 — 페이지 안에서 카테고리 색이 여러 톤으로
 * 흩뿌려지는 노이즈를 줄이기 위해 작고 옅게. Hero CategoryChip이 이미 같은
 * 시그널을 강하게 전달하므로 여기서는 섹션 그루핑만.
 */
export const SectionTitleDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 10px;
  margin-bottom: 4px;
  opacity: 0.7;
  flex-shrink: 0;
`

export const SectionSubtitle = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

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

/* ───────────────────────── Cards ───────────────────────── */

/**
 * 카드 surface는 본문 흐름과 충돌해서 거의 사용하지 않음. 살아 있는 primitive는
 * - `CardGrid`: 자식 사건 리스트 그리드
 * - `CardMeta`: 보조 메타(uppercase·tabular)
 * 두 가지뿐. 빈 wrapper들은 정리됨.
 */
export const CardMeta = styled.div`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${DIGIT_DISPLAY}
`

export const CardGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols = 2 }) => $cols}, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
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
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  transition: border-color 0.15s, background 0.15s;

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
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)'};
  }
`

/* ───────────────────────── Definition list (모듈 데이터 표) ──────────── */

/**
 * 모듈에서 라벨-값 쌍을 sk할 때 사용. CardGrid보다 가벼움.
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

export const DefLabel = styled.dt`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding-top: 3px;

  @media (max-width: 640px) {
    margin-top: 8px;
  }
`

export const DefValue = styled.dd`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
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
  color: ${({ theme, $color }) => $color ?? theme.colors.text.tertiary};
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

/* ───────────────────────── Accent surfaces ───────────────────────── */

export const AccentSurface = styled.div`
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  border-radius: 8px;
  padding: 10px 12px;
`
