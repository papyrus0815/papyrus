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
export const GroupGrid = styled.div<{ $aside?: boolean; $reading?: boolean }>`
  display: grid;
  /* $reading: 서술형(연혁·제품) — 신문 칼럼식 단일 폭으로 중앙 정렬(2단은 너무 좁고
     전폭은 줄이 너무 길어 가독성 저하). $aside: 본문+사이드. 기본: 2단. */
  grid-template-columns: ${({ $aside, $reading }) =>
    $reading
      ? 'minmax(0, 880px)'
      : $aside
        ? 'minmax(0, 760px) minmax(280px, 360px)'
        : 'repeat(2, minmax(0, 1fr))'};
  /* $aside는 왼쪽부터 붙여 소개 글과 요약 카드 사이에 빈 들판이 생기지 않게 한다 */
  justify-content: ${({ $reading, $aside }) =>
    $reading ? 'center' : $aside ? 'start' : 'stretch'};
  gap: 32px 40px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 28px;
  }
`

export const GridCell = styled.div<{ $wide?: boolean; $card?: boolean }>`
  min-width: 0;
  ${({ $wide }) => ($wide ? 'grid-column: 1 / -1;' : '')}
  /* 카드 경계 — 2단에서 인접 모듈을 시각적으로 구획(투명 배경 + 하어라인, 안쪽 패널과
     배경 충돌 없음). 콘텐츠 높이 차로 인한 ragged는 카드 경계로 흡수된다. */
  ${({ theme, $card }) =>
    $card
      ? `border: 1px solid ${hairline(theme.mode)}; border-radius: 12px; padding: 22px 24px;`
      : ''}
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

export const EditBasicsBtn = styled.button`
  flex-shrink: 0;
  align-self: flex-start;
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

export const RowMetaLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const RowFieldLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
  font-size: 12px;
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

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 0 14px 16px;
  border-left: 2px dashed ${({ theme }) => hairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13.5px;
  line-height: 1.6;
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
