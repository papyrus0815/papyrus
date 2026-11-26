import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'

/* ─── Container-Query Dossier Shell (무카드 에디토리얼 2단 장부 레이아웃) ─── */

export const DetailContainer = styled.div<{ $compact?: boolean }>`
  container-type: inline-size;
  container-name: unitdetail;
  width: 100%;
  min-width: 0;
`

export const EmbeddedTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 0 14px;
  margin-bottom: 18px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const EmbeddedTopLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const EmbeddedBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const EmbeddedCrumbTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const EmbeddedTopRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

export const DossierGrid = styled.div<{ $compact?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'hero'
    'aside'
    'tabs'
    'main';
  gap: 24px;
  align-items: start;

  ${({ $compact }) =>
    !$compact &&
    css`
      @container unitdetail (min-width: 880px) {
        grid-template-columns: minmax(0, 1fr) clamp(288px, 24cqi, 348px);
        grid-template-rows: auto auto 1fr;
        grid-template-areas:
          'hero aside'
          'tabs aside'
          'main aside';
        gap: 24px clamp(32px, 3.2cqi, 52px);
      }
    `}
`

export const HeroArea = styled.header`
  grid-area: hero;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding-bottom: 4px;
`

export const AsideArea = styled.aside<{ $compact?: boolean }>`
  grid-area: aside;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  padding: 18px 0;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  ${({ $compact }) =>
    !$compact &&
    css`
      @container unitdetail (min-width: 880px) {
        position: sticky;
        top: 20px;
        padding: 2px 0 8px clamp(24px, 2.4cqi, 36px);
        border-top: none;
        border-bottom: none;
        border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
      }
    `}
`

export const TabsArea = styled.div`
  grid-area: tabs;
  position: sticky;
  top: 0;
  z-index: 4;
  min-width: 0;
  padding-top: 4px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

export const MainArea = styled.div`
  grid-area: main;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

/* ─── Hero Typography & Identity (무카드 오픈 히어로) ─── */

export const HeroEyebrowRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const EyebrowAccent = styled.span`
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const EyebrowDot = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.6;
  user-select: none;
`

export const LifecycleIndicator = styled.span<{ $disbanded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $disbanded }) =>
    $disbanded
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $disbanded }) => ($disbanded ? '#94a3b8' : '#10b981')};
  }
`

export const HeroIdentityRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;
  min-width: 0;
`

export const InsigniaImg = styled.img<{ $compact?: boolean }>`
  width: ${({ $compact }) => ($compact ? '48px' : '64px')};
  height: ${({ $compact }) => ($compact ? '48px' : '64px')};
  border-radius: 10px;
  object-fit: contain;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'};
  padding: 4px;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const HeroTitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`

export const UnitTitle = styled.h1<{ $compact?: boolean }>`
  margin: 0;
  font-size: ${({ $compact }) =>
    $compact ? '20px' : 'clamp(24px, 2.4vw, 30px)'};
  font-weight: 850;
  line-height: 1.22;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

export const AbbrSpan = styled.span`
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SubtitleStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 13.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const NickSpan = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ForeignTitle = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const MottoLine = styled.div`
  font-size: 13px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const HeroLeadProse = styled.div`
  margin-top: 2px;
  max-width: 72ch;
  font-size: 14px;
  line-height: 1.74;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: keep-all;
`

/* ─── Right Aside Fact Ledger (우측 사실 장부) ─── */

export const FactSheetBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

export const FactSheetTitle = styled.h2`
  margin: 0;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FactList = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const FactRow = styled.div`
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
  padding: 8.5px 0;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12.5px;
  line-height: 1.45;
`

export const FactTerm = styled.dt`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

export const FactDesc = styled.dd`
  margin: 0;
  min-width: 0;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
  word-break: keep-all;
`

export const ChainBreadcrumb = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 5px;
  font-size: 12.5px;
  line-height: 1.45;
`

export const ChainSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  user-select: none;
`

/* ─── Open Editorial Sections (박스 없는 수평 헤어라인 섹션) ─── */

export const EditorialSection = styled.section<{ $compactEmpty?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $compactEmpty }) => ($compactEmpty ? '0' : '16px')};
  padding: ${({ $compactEmpty }) => ($compactEmpty ? '16px 0' : '26px 0')};
  min-width: 0;

  &:first-child {
    padding-top: 8px;
  }

  & + & {
    border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

export const SectionHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
`

export const SectionHeadLeft = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
`

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.022em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SectionCount = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SectionEmptyInline = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const RowActions = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

/* ─── Quantitative Strength & Equipment Sheet (정량 병력 · 장비 시트) ─── */

export const StrengthSnapshotsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

export const StrengthSnapshotBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }
`

export const SnapshotHeaderLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
`

export const SnapshotBasisTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SnapshotDateLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const SnapshotNoteText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SnapshotDeltaSpan = styled.span<{ $positive: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme, $positive }) =>
    $positive
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.mode === 'dark'
        ? '#fca5a5'
        : '#be123c'};
`

export const RankBreakdownWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 2px;
`

export const RankBreakdownTrack = styled.div`
  display: flex;
  width: 100%;
  max-width: 360px;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  gap: 1.5px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
`

export const RankBreakdownSeg = styled.span<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => Math.max(2, $pct)}%;
  height: 100%;
  background: ${({ $color }) => $color};
`

export const RankBreakdownLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  i {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
`

export const StrengthMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const StrengthMetricCell = styled.div<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 10px 0;
  min-width: 0;

  .metric-label {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .metric-value {
    font-size: ${({ $highlight }) => ($highlight ? '19px' : '16px')};
    font-weight: ${({ $highlight }) => ($highlight ? 820 : 740)};
    letter-spacing: -0.02em;
    ${DIGIT_DISPLAY}
    color: ${({ theme, $highlight }) =>
      $highlight ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }

  .metric-unit {
    margin-left: 2px;
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const StrengthNarrativeProse = styled.div`
  max-width: 74ch;
  font-size: 13.5px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: keep-all;
`

/* ─── Subordinate Units Directory & Architectural Tree ─── */

export const SubUnitDirectoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  column-gap: 28px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const SubUnitRowBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 11px 4px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;

  .sub-meta {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .sub-name {
    font-size: 13.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    transition: color 0.12s ease;
  }

  .open-icon {
    opacity: 0;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    flex-shrink: 0;
    transition: opacity 0.12s ease, transform 0.12s ease;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};

    .sub-name {
      color: ${({ theme }) => ledgerAccent(theme.mode)};
    }

    .open-icon {
      opacity: 1;
      transform: translate(1px, -1px);
    }
  }
`

export const SubUnitRowText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const SubViewSegment = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 7px;
`

export const SubViewSegBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 5px;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`

export const SubTreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const SubTreeNodeWrap = styled.div<{ $child?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;

  ${({ $child, theme }) =>
    $child
      ? css`
          &::before {
            content: '';
            position: absolute;
            left: -16px;
            top: 18px;
            width: 12px;
            border-top: 1px solid ${ledgerHairlineStrong(theme.mode)};
            pointer-events: none;
          }
        `
      : ''}
`

export const SubTreeRow = styled.div<{ $depth?: number }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  padding: 9px 8px 9px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 13px;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const SubTreeChildren = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 13px;
  padding-left: 16px;
  border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const SubTreeToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  }
`

export const SubTreeSpacer = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;

  &::after {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/* ─── Lineage List (전신 · 후신 개편 계보) ─── */

export const LineageList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const LineageRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 2px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const LineageRowMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  min-width: 0;
  font-size: 13px;
`

export const LineageDirectionTag = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const LineageKindText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const LineageYearText = styled.span`
  font-size: 12px;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const LineageNote = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* ─── Narrative Dossier 2-Column Open Grid (임무 · 관할 · 전투 · 수훈) ─── */

export const DossierProseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 24px 36px;
`

export const DossierProseItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const DossierProseLabel = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const DossierProseBody = styled.div`
  font-size: 13.5px;
  line-height: 1.72;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  word-break: keep-all;
`

/* ─── Inline Forms (무카드 수평 헤어라인 인라인 편집 줄) ─── */

export const InlineFormBox = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 2px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  box-sizing: border-box;
`

export const InlineFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
`

export const FormSelect = styled.select`
  appearance: none;
  height: 32px;
  padding: 0 26px 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background-color: ${({ theme }) => ledgerBackground(theme.mode)};
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 550;
  min-width: 128px;
  flex: 1 1 150px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const FormInput = styled.input`
  height: 32px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  flex: 1 1 150px;
`

/* ─── Flat Hairline Ledger Tables (지휘관 · 참전 · 지령 · 함정) ─── */

export const TableWrap = styled.div`
  overflow-x: auto;
`

export const LedgerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    padding: 8px 10px;
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    white-space: nowrap;

    &:first-child {
      padding-left: 2px;
    }

    &:last-child {
      padding-right: 2px;
    }
  }

  td {
    padding: 11px 10px;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    vertical-align: middle;

    &:first-child {
      padding-left: 2px;
    }

    &:last-child {
      padding-right: 2px;
    }
  }

  td.num {
    ${DIGIT_DISPLAY}
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
  }

  tbody tr:hover td {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const PersonCellRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const PersonAvatarCircle = styled.span`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const OrdinalText = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  ${DIGIT_DISPLAY}
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PartyTag = styled.span<{ $color?: string | null }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $color }) => $color || '#94a3b8'};
  }
`

export const InlineLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 650;
  text-decoration: none;
  transition: color 0.12s ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

export const InlineEntityBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: inherit;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
  transition: color 0.12s ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

export const DeploymentEventCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
`

export const DeploymentSubLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 11.5px;
`

export const SurveyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

export const ParentWarHintLink = styled(Link)`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

export const OutcomeSpan = styled.span<{
  $tone?: 'win' | 'loss' | 'draw' | 'neutral'
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $tone }) =>
    $tone === 'win'
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : $tone === 'loss'
        ? theme.mode === 'dark'
          ? '#fca5a5'
          : '#be123c'
        : $tone === 'draw'
          ? theme.mode === 'dark'
            ? '#fcd34d'
            : '#b45309'
          : theme.colors.text.secondary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) =>
      $tone === 'win'
        ? '#10b981'
        : $tone === 'loss'
          ? '#ef4444'
          : $tone === 'draw'
            ? '#f59e0b'
            : '#94a3b8'};
  }
`

export const SideOutcomeStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
`

export const QuickAppendStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin-top: 8px;
  padding: 16px 0 4px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const QuickAppendLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const QuickAppendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.12s ease;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const DossierEmptyLead = styled.p`
  margin: 0;
  padding: 14px 0 6px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ChipStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
`

export const QuietMetaItem = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const InheritedHint = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const MutedSpan = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const CommanderSearchWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const CommanderSearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  width: 148px;
`

export const CommanderSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

export const UnlinkedBarBox = styled.div`
  padding: 4px 0;
`

export const LoadingBox = styled.div`
  padding: 56px 20px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* ─── Continuity Strip & Sibling Units Switcher (전신·후신 및 동급 편제 탐색) ─── */

export const ContinuityStrip = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12.5px;
`

export const ContinuityJumpBtn = styled.button`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;

  .dir-tag {
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .target-name {
    font-weight: 680;
    transition: color 0.12s ease;
  }

  .target-year {
    font-size: 11.5px;
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover .target-name {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

export const SiblingUnitsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

export const SiblingUnitsList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const SiblingUnitBtn = styled.button<{ $current?: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 6px 7px ${({ $current }) => ($current ? '8px' : '4px')};
  border: none;
  border-left: 2px solid
    ${({ theme, $current }) =>
      $current ? ledgerAccent(theme.mode) : 'transparent'};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $current }) =>
    $current ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $current }) =>
    $current ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $current }) => ($current ? 750 : 550)};
  text-align: left;
  cursor: ${({ $current }) => ($current ? 'default' : 'pointer')};
  transition: background 0.12s ease, color 0.12s ease;

  .sib-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .sib-type {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ theme, $current }) =>
      $current ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

/* ─── Tenure Duration & Proportion Bar (지휘관 재임 길이 막대) ─── */

export const TenureSpanStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 132px;
`

export const TenureSpanLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  ${DIGIT_DISPLAY}
`

export const TenureDurationSub = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const TenureBarTrack = styled.div`
  width: 100%;
  max-width: 148px;
  height: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.06)'};
  overflow: hidden;
`

export const TenureBarFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => Math.max(4, Math.min(100, $pct))}%;
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: 0.72;
`

export const InlineFieldSlot = styled.div<{ $minW?: number; $flex?: string }>`
  flex: ${({ $flex }) => $flex || '1 1 200px'};
  min-width: ${({ $minW }) => ($minW ? `${$minW}px` : '160px')};
`
