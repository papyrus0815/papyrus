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
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  overflow-y: auto;
  overflow-x: hidden;
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

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`

export const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export const Body = styled.div`
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
  margin-top: 28px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 16px;
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
        ? 'minmax(0, 1.8fr) minmax(280px, 1fr)'
        : 'repeat(2, minmax(0, 1fr))'};
  justify-content: ${({ $reading }) => ($reading ? 'center' : 'stretch')};
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
      ? `border: 1px solid ${hairline(theme.mode)}; border-radius: 16px; padding: 22px 24px;`
      : ''}
`

/* ───────────────────────── Hero ───────────────────────── */

export const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
`

export const HeroIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

export const Logo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const HeroNameRow = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const HeroName = styled.div`
  font-size: 26px;
  font-weight: 750;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

export const HeroSubName = styled.div`
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
`

export const HeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 26px;
  align-items: center;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const HeroMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  > svg:first-child {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`

export const HeroMetaLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 4px;
`

/* ───────────────────────── Rail ───────────────────────── */

export const Rail = styled.aside`
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
  max-height: calc(100vh - var(--header-height, 64px) - 60px);
  overflow-y: auto;
  scrollbar-width: thin;

  @media (max-width: 1100px) {
    position: static;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
`

export const RailLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 2px;

  @media (max-width: 1100px) {
    display: none;
  }
`

export const RailNav = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  @media (max-width: 1100px) {
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
`

export const RailItem = styled.button<{ $active: boolean }>`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 9px 12px;
  font: inherit;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.hover : 'transparent'};
  border: 0;
  border-left: 2px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  border-radius: 0 8px 8px 0;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, color 0.16s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 6px;
  }

  @media (max-width: 1100px) {
    width: auto;
    white-space: nowrap;
    border-left: 0;
    border-radius: 999px;
    padding: 7px 16px;
    border: 1px solid
      ${({ theme, $active }) =>
        $active ? theme.colors.primary : theme.colors.border.default};
  }
`

export const RailItemLabel = styled.span`
  font-size: 13.5px;
  font-weight: 650;
  color: inherit;
`

export const RailItemHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 1100px) {
    display: none;
  }
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
  font-size: 22px;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.012em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: 20px;
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
