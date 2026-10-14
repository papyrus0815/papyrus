/**
 * 기업 상세 — narrative-first click-to-edit 문서 레이아웃.
 * 사건 상세(events/detail/styles.ts)의 페이지 셸을 차용하되, events ledger-tokens
 * 대신 theme 토큰만 사용해 결합을 끊는다.
 */
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

const hairline = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
const hairlineStrong = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'

/* ───────────────────────── Page Shell ───────────────────────── */

/**
 * 전역 body overflow hidden 때문에 페이지 자체를 *내부 스크롤 컨테이너*로 만들어야
 * sticky·hash scroll이 정상 동작한다(사건 상세 동일 패턴).
 */
export const Page = styled.div`
  /* 헤더 오프셋·스크롤 컨테이너는 ContentLayout이 준다 (좌측 기업 목록 사이드바 도입 시
     companiesRoutes가 그 안으로 이동). 자체 오프셋을 유지하면 두 번 밀린다. */
  min-height: 100%;
  /* 자체 스크롤 컨테이너를 만들지 않는다 — overflow:auto/hidden이면 탭 바 sticky가 이 상자에
     붙어(실제로는 스크롤하지 않으므로) 영영 붙지 않는다. 가로 넘침만 clip으로 자른다. */
  overflow-x: clip;

  /*
   * 빈 선택 칸 안내('출처 (선택)', '리포트 제목 (선택)', '투자의견 근거…')가 기울임 본문색으로
   * 카드마다 대여섯 개씩 서 있어, 값보다 안내가 더 눈에 띄었다. 이 문서에서만 한 톤 낮춘다
   * (공용 inline-edit 키트는 사건 상세도 쓰므로 건드리지 않는다).
   */
  [data-empty='true'],
  [data-empty='true'] * {
    font-style: normal;
  }
  [data-empty='true'] {
    color: ${({ theme }) => theme.colors.text.tertiary};
    opacity: 0.75;
  }

  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => hairlineStrong(theme.mode)} transparent;
`

export const PageInner = styled.div`
  /* 전체 화면 — 폭 캡 없이 뷰포트 끝까지(좌우 패딩만). */
  width: 100%;
  padding: 28px clamp(24px, 3vw, 56px) 96px;

  @media (max-width: 768px) {
    padding: 16px 16px 72px;
  }
`

export const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  margin-bottom: 14px;
`

export const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

/** 탭 패널 영역 — 예전 200px 세로 레일 열을 없애 본문이 전폭을 쓴다(좌측엔 이미 기업 사이드바가 있다). */
export const Body = styled.div`
  margin-top: 28px;

  @media (max-width: 768px) {
    margin-top: 20px;
  }
`

export const Main = styled.main`
  min-width: 0;
  width: 100%;
`

const panelFade = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
`

/** 주제 그룹 패널 — 활성 그룹만 표시(나머지는 display:none으로 마운트 유지·상태 보존). */
export const GroupPanel = styled.div<{ $active: boolean }>`
  display: ${({ $active }) => ($active ? 'block' : 'none')};
  animation: ${panelFade} 0.18s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/**
 * 그룹 내부 — 전체폭을 2단으로 채워 세로 길이 절감(차트 등 wide 섹션은 전폭 span).
 * $aside: 본문+사이드 카드용 비대칭 2단(개요 탭 = 서술 넓게 + 요약 카드 좁게).
 */
/**
 * 탭 패널 격자.
 *
 * 문법을 하나로 맞춘다(2026-10-13): 예전엔 $reading 탭(연혁·사업)만 **가운데 정렬**이라
 * 탭을 옮길 때마다 본문 시작선이 43px ↔ 80px로 튀었다. 이제 모든 탭이 같은 왼쪽 선에서 시작한다.
 *   $reading: 서술형 한 단(연혁·제품) — 줄 길이 상한 880px
 *   $aside:   서술 + 우측 요약(개요) — 서술 단은 $reading과 같은 폭
 *   기본:     2단(재무·운영)
 */
export const GroupGrid = styled.div<{ $aside?: boolean; $reading?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $aside, $reading }) =>
    $reading
      ? 'minmax(0, 880px)'
      : $aside
        ? 'minmax(0, 880px) minmax(280px, 340px)'
        : 'repeat(2, minmax(0, 1fr))'};
  justify-content: start;
  gap: 40px 56px;
  align-items: start;

  /* 첫 섹션은 탭 바가 곧 위 경계라 구분선을 겹쳐 긋지 않는다.
     (2단 격자는 모두 전폭 섹션으로 시작한다 — 재무=주가, 운영=업종. 첫 줄에 반폭 두 칸을
      두게 되면 둘째 칸도 여기서 빼 줄 것) */
  & > :first-child {
    border-top: 0;
    padding-top: 0;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 36px;
  }
`

/**
 * 격자 칸.
 * $card는 이제 **상자가 아니라 구분선 섹션**이다. 바깥 테두리 상자 안에 제품 카드·컨센서스 패널이
 * 또 상자로 들어가 테두리가 이중으로 겹쳤고, 개요·연혁(무상자)과 사업·재무·운영(상자)이 한 문서에서
 * 두 문법으로 갈렸다. 상자는 '항목 하나'(제품 카드 등)에만 쓰고, 섹션은 위 구분선과 여백으로 나눈다.
 */
export const GridCell = styled.div<{
  $wide?: boolean
  $card?: boolean
  /** 개요 우측 요약 카드 — 왼쪽 서술이 길어져도 탭 바 아래에 붙어 따라온다 */
  $sticky?: boolean
}>`
  min-width: 0;
  ${({ $wide }) => ($wide ? 'grid-column: 1 / -1;' : '')}
  ${({ $sticky }) => ($sticky ? 'position: sticky; top: 64px;' : '')}
  ${({ theme, $card }) =>
    $card
      ? `border-top: 1px solid ${hairline(theme.mode)}; padding-top: 28px;`
      : ''}

  @media (max-width: 900px) {
    position: static;
  }
`

/** 개요 탭 왼쪽 — 개요·설립 배경·관련 사건·최근 연혁을 같은 간격으로 쌓는다 */
export const OverviewStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`

/* ───────────────────────── Hero ───────────────────────── */

export const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
`

export const HeroIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: 14px;
  }
`

export const Logo = styled.div<{ $hasLogo?: boolean }>`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 750;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  background: ${({ theme, $hasLogo }) =>
    $hasLogo
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#f1f5f9'
      : theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : '#eef2ff'};
  border: 1px solid ${({ theme }) => hairline(theme.mode)};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 26px;
    height: 26px;
  }
`

export const HeroNameRow = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* 좁은 폭에서는 이름 칸이 로고 옆 남은 폭을 다 가져 '기본 정보 수정'이 다음 줄로 내려간다
     (이름 옆에 끼면 이름이 두 줄로 쪼개지고 전역 떠 있는 아바타와 겹쳤다) */
  @media (max-width: 640px) {
    flex-basis: calc(100% - 82px);
  }
`

export const HeroTitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
  min-width: 0;
`

export const HeroName = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;

  @media (max-width: 640px) {
    font-size: 23px;
  }
`

/** 상태 — 색 점 + 옅은 틴트 알약. 안쪽은 InlineSelect(클릭해 바꾼다). */
export const StatusPill = styled.span<{ $tone: string | null }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 오른쪽은 InlineSelect의 편집 아이콘 자리가 여백 역할을 한다 */
  padding: 2px 4px 2px 9px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  background: ${({ $tone, theme }) =>
    $tone ? `${$tone}1f` : theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $tone }) => $tone ?? '#a1a1aa'};
  }
`

export const HeroSubName = styled.div`
  /* 칸 사이 간격은 InlineText의 편집 아이콘 자리(28px)가 맡는다 — 구분 기호를 따로 두면 이중 간격 */
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const HeroActions = styled.div`
  flex-shrink: 0;
  align-self: flex-start;
  display: flex;
  gap: 6px;
`

export const DeleteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => hairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, background 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.error ?? '#dc2626'};
    border-color: ${({ theme }) => theme.colors.error ?? '#dc2626'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.1)' : 'rgba(239,68,68,0.05)'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export const EditBasicsBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => hairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

/**
 * 사실 띠 — 라벨(위)·값(아래) 칸을 세로 헤어라인으로 나눈 한 줄.
 * 폭이 모자라 줄이 바뀌어도 **각 줄의 첫 칸이 왼쪽 끝에 붙도록**, 모든 칸에 같은 왼쪽
 * 패딩·선을 주고 목록 전체를 그만큼 왼쪽으로 당긴 뒤 바깥 틀이 잘라 낸다.
 * (첫 칸만 선을 빼는 방식은 둘째 줄 첫 칸이 들여쓰기·선을 단 채 남았다.)
 */
export const FactStripFrame = styled.div`
  overflow: hidden;
  padding: 14px 0;
  border-top: 1px solid ${({ theme }) => hairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => hairline(theme.mode)};
`

export const FactStrip = styled.dl`
  margin: 0 0 0 -25px;
  display: flex;
  flex-wrap: wrap;
  row-gap: 14px;
`

export const Fact = styled.div`
  min-width: 0;
  padding: 0 24px;
  border-left: 1px solid ${({ theme }) => hairline(theme.mode)};

  dt {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-bottom: 4px;
  }

  dd {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }
`

export const FactEmpty = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 400;
`

export const FactNote = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

export const FactLink = styled.button`
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

export const ExternalLink = styled.a`
  display: inline-flex;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

/* ───────────────────────── Tabs ───────────────────────── */

/**
 * 가로 밑줄 탭 — 예전엔 200px 세로 레일이었다. 좌측 기업 사이드바 옆에 레일이 또 서서
 * 왼쪽에 기둥이 둘이었고, 본문 폭이 그만큼 줄었다. sticky라 긴 연혁을 읽다가도 바로 옮긴다.
 * ⚠️ 불투명 배경 필수 — 아래로 지나가는 본문이 비치면 안 된다.
 */
export const TabBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  margin-top: 22px;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => hairlineStrong(theme.mode)};

  &::-webkit-scrollbar {
    display: none;
  }
`

export const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 12px 11px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  white-space: nowrap;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  cursor: pointer;
  transition: color 0.14s;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -4px;
    border-radius: 8px;
  }
`

export const TabCount = styled.span`
  min-width: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
`

/* ───────────────────────── Section frame ───────────────────────── */

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
  gap: 4px 14px;
`

export const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.012em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: 17px;
  }
`

export const SectionSubtitle = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SectionActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

export const SectionBody = styled.div`
  font-size: 15.5px;
  line-height: 1.78;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 720px;
`

/* ───────────────────────── Rows (연혁·시설·업종) ───────────────────────── */

export const RowStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0;
  border-top: 1px solid ${({ theme }) => hairline(theme.mode)};

  &:first-child {
    border-top: none;
    padding-top: 2px;
  }
`

export const RowHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const RowIndex = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding-right: 12px;
  border-right: 1px solid ${({ theme }) => hairlineStrong(theme.mode)};
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const RowTitleHost = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const RowFieldLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
  font-size: 12px;
`

/**
 * 사양표 격자 — 라벨(위)·값(아래) 칸을 같은 열 폭으로 늘어놓는다.
 *
 * 예전엔 '라벨 값  라벨 값'을 한 줄에 이어 붙이는 flex 줄이라, 값 길이에 따라 칸이 밀려
 * 행마다 같은 항목(목표주가·통화·투자의견…)이 다른 자리에 섰다. 격자로 바꾸면 행과 행,
 * 줄과 줄 사이에서 같은 칸이 같은 열에 선다. 긴 값(리포트·링크·출처)은 `gridColumn: 'span 2'`.
 * 자식은 `<span><RowFieldLabel/>값</span>` 규약 — 라벨 없는 장식 요소는 값 칸 안에 넣을 것.
 */
export const RowMetaLine = styled.div`
  display: grid;
  /* 120px — 재무 2단(약 450px)에서도 3열이 서야 원래 한 줄이던 세 항목이 한 줄에 남는다(140px면 2열로 접혀 행이 두 배로 길어졌다) */
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px 20px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  > span {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
  }

  > span > ${RowFieldLabel} {
    margin-right: 0;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
`

/** 값 옆에 붙는 짧은 표지(↗ 상향 등)를 값과 한 줄로 묶는다 — RowMetaLine 칸 안에서 쓴다 */
export const ValueWithTag = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 8px;
  min-width: 0;

  /* 좁은 칸에서 표지가 '상/향'으로 세로로 쪼개지지 않게 — 자리가 모자라면 통째로 아랫줄로 */
  > * {
    white-space: nowrap;
  }
`

/**
 * 행 내부의 서술형(rich text) 필드 블록 — "설명"·"건설 배경"처럼 본문 에디터를
 * 라벨과 함께 한 줄 메타가 아닌 전체 너비 블록으로 둔다. 연혁의 본문 InlineRichText와
 * 동일한 시각 계층을 행 단위 보조 서술 필드에 부여한다.
 */
export const RowNarrative = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  & > ${RowFieldLabel} {
    margin-right: 0;
  }
`

export const ManageActions = styled.div`
  display: inline-flex;
  gap: 4px;
`

export const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => hairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.error ?? '#dc2626' : theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s, background 0.14s;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error ?? '#dc2626' : theme.colors.text.tertiary};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error ?? '#dc2626' : theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

export const ManageToggle = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text.tertiary : hairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

export const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 14px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => hairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.14s, color 0.14s, border-color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

/**
 * 연혁 행에서 '당시 주가·시총' 스냅샷 패널을 수동으로 펼치는 어포던스.
 * 자동노출(제품출시·재무·설비투자·자본정책·M&A) 외 종류(제휴·정부규제·마일스톤 등)도
 * 신규 행에서 스냅샷을 입력할 수 있게 한다 — 패널이 값에만 의존해 닭-달걀에 빠지지 않도록.
 */
export const SnapshotAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px dashed ${({ theme }) => hairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

/* ───────────────────────── 업종 칩 ───────────────────────── */

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

export const CategoryChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 5px 6px 5px 12px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
`

export const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

/* ───────────────────────── Empty / states ───────────────────────── */

/**
 * 빈 상태 안내 — 글 한 덩어리.
 * ⚠️ flex 열이면 안 된다: 안내문 속 <strong>이 별도 flex 항목이 되어
 *    '…좌우할 / 핵심 변수 / 를 기록하세요'처럼 문장이 세 줄로 끊겼다(연혁·주가·전망 3곳).
 */
export const EmptyState = styled.div`
  display: block;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => hairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13.5px;
  line-height: 1.6;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }
`

export const StateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 320px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 2px solid ${({ theme }) => hairlineStrong(theme.mode)};
  border-top-color: ${({ theme }) => theme.colors.primary};
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
