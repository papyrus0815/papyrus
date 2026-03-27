/**
 * 국가 상세 — 선거·투표 / 정당 블록 공용 UI (다크·라이트 테마, 인물 등록 모달과 톤 맞춤)
 */
import styled from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'

/** 본문 패널 */
export const PoliticsTabPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 32px;
  min-height: 320px;
`

export const SectionHeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

export const SectionKicker = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  margin-bottom: 6px;
`

export const SectionLead = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 560px;
  line-height: 1.55;
`

export const SplitMainRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
`

export const ListColumn = styled.div`
  width: 100%;
  max-width: 360px;
  flex-shrink: 0;
  padding-right: 20px;
  margin-right: 4px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  min-height: 0;

  @media (max-width: 900px) {
    max-width: none;
    border-right: none;
    padding-right: 0;
    margin-right: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

/** 정당 블록과 선거 스플릿 사이 구역 구분 */
export const PoliticsTabSubsection = styled.section`
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const SubsectionHeaderBlock = styled.div`
  margin-bottom: 14px;
`

export const SubsectionHeading = styled.h2`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 선거 목록만 세로 스크롤 — 상세는 고정 */
export const ElectionListScrollArea = styled.div`
  flex: 1;
  min-height: 120px;
  max-height: min(520px, calc(100vh - 280px));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-right: -4px;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 7px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'};
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`

/** 선거 목록 — 항목 간 간격 */
export const ElectionListStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const DetailColumn = styled.div`
  flex: 1;
  min-width: 280px;
  min-height: 280px;
`

/** 선거 상세 본문 — 목록 옆 패널에 은은한 프레임 */
export const ElectionDetailSurface = styled.div`
  padding: 20px 20px 22px;
  border-radius: 16px;
  min-height: 0;
`

/** 선거 미선택·로딩 안내 */
export const ElectionDetailEmptyCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 220px;
  padding: 28px 20px;
  border-radius: 16px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(248, 250, 252, 0.65)'};
  text-align: center;
`

export const ElectionDetailEmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const ElectionDetailEmptyHint = styled.p`
  margin: 0;
  max-width: 320px;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 선거 목록 항목 — 카드형 · 선택 시 강조 */
export const ElectionNavButton = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.2s ease,
    transform 0.16s ease;

  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'rgba(99, 102, 241, 0.42)' : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)'
        : 'linear-gradient(145deg, rgba(99, 102, 241, 0.14) 0%, rgba(255, 255, 255, 0.95) 100%)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(248, 250, 252, 0.85)'};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 0 0 1px rgba(99, 102, 241, 0.2), 0 10px 28px rgba(0, 0, 0, 0.35)'
        : '0 6px 20px rgba(99, 102, 241, 0.12), 0 1px 0 rgba(255, 255, 255, 0.8) inset'
      : '0 1px 2px rgba(15, 23, 42, 0.04)'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
    transform: translateY(-1px);
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.65);
    outline-offset: 2px;
  }
`

export const ElectionNavTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`

export const ElectionNavMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  margin-top: 2px;
`

/** 선거 목록 — 종료일(실제·투표·임기) 한 줄 */
export const ElectionNavEndLine = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  margin-top: 4px;
  line-height: 1.35;
`

/** 정당 집계 — 득표율 인포그래픽(원·도넛) */
export const PartyShareInfographic = styled.div`
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.09) 0%, rgba(0, 0, 0, 0) 55%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 45%)'};
`

export const PartyShareInfographicTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 14px;
`

/** 좌: 반원 도넛 / 우: 범례 */
export const PartyShareDonutLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 20px 28px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

/** 위쪽 반원만 보이도록 하단 클립 */
export const PartyShareDonutClip = styled.div`
  width: 100%;
  max-width: 280px;
  height: min(118px, 32vw);
  max-height: 130px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
`

export const PartyShareDonutInner = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(236px, 86vw);
  height: min(236px, 86vw);
  max-width: 240px;
  max-height: 240px;
`

export const PartyShareDonutRing = styled.div<{ $gradient: string }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: ${({ $gradient }) => $gradient};
  box-shadow:
    0 4px 24px rgba(15, 23, 42, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
`

export const PartyShareDonutHole = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56%;
  height: 56%;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow: inset 0 2px 8px rgba(15, 23, 42, 0.08);
`

export const PartyShareLegend = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const PartyShareLegendItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`

/** 득표 분포 범례 — `fill`은 hex 또는 hsl(...) */
export const PartyShareSwatch = styled.span<{ $fill: string }>`
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  border-radius: 50%;
  background: ${({ $fill }) => $fill};
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
`

export const PartyShareLegendBody = styled.div`
  min-width: 0;
  flex: 1;
`

export const PartyShareName = styled.span`
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const PartyShareStats = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: block;
  margin-top: 2px;
  white-space: normal;
`

/** 툴바 버튼 — 인물 등록 SubmitButton 계열 */
export const ToolbarPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: background 0.2s ease;
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const ToolbarGhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

export const ToolbarDangerBtn = styled(ToolbarGhostBtn)`
  border-color: rgba(220, 38, 38, 0.45);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
  &:hover:not(:disabled) {
    border-color: rgba(220, 38, 38, 0.65);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220,38,38,0.12)' : '#fef2f2'};
  }
`

export const ToolbarGhostBtnSm = styled(ToolbarGhostBtn)`
  padding: 5px 9px;
  font-size: 11px;
`

export const ToolbarDangerBtnSm = styled(ToolbarDangerBtn)`
  padding: 5px 9px;
  font-size: 11px;
`

/** 선거·정당 상단 — 아이콘 전용 (원형, 얇은 테두리) */
export const DetailHeaderIconBtn = styled.button<{
  $variant?: 'default' | 'danger'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'danger'
        ? 'transparent'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(15, 23, 42, 0.08)'};
  border-radius: 999px;
  background: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(255,255,255,0.92)'};
  color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? theme.mode === 'dark'
        ? '#f87171'
        : '#dc2626'
      : theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
  &:hover {
    border-color: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? 'rgba(220, 38, 38, 0.4)'
        : 'rgba(99, 102, 241, 0.35)'};
    background: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? theme.mode === 'dark'
          ? 'rgba(220, 38, 38, 0.14)'
          : '#fef2f2'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#f8fafc'};
    color: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? theme.mode === 'dark'
          ? '#fca5a5'
          : '#b91c1c'
        : theme.colors.text.primary};
    box-shadow: ${({ $variant }) =>
      $variant === 'danger' ? 'none' : '0 2px 12px rgba(99, 102, 241, 0.12)'};
  }
`

/** 섹션별 「추가」 — 채움색 버튼 대신 라인·캡슐형 */
export const SubsectionAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #4f46e5;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'rgba(99, 102, 241, 0.06)'};
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(99, 102, 241, 0.12)'};
    border-color: rgba(99, 102, 241, 0.45);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** 테이블 행 끝 — 아이콘 묶음 */
export const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  flex-wrap: nowrap;
`

export const RowIconBtn = styled.button<{ $variant?: 'default' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? theme.mode === 'dark'
        ? '#f87171'
        : '#dc2626'
      : theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  &:hover {
    background: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? theme.mode === 'dark'
          ? 'rgba(220, 38, 38, 0.14)'
          : '#fef2f2'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#f1f5f9'};
    color: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? theme.mode === 'dark'
          ? '#fca5a5'
          : '#b91c1c'
        : theme.colors.text.primary};
  }
`

/** 데이터 테이블 카드 */
export const DataTableCard = styled.div`
  overflow: auto;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
`

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

export const DataTh = styled.th`
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
`

export const DataTd = styled.td`
  padding: 10px 12px;
  font-size: 13px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  vertical-align: middle;
`

export const DataTr = styled.tr`
  transition: background 0.12s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  }
  &:last-child td {
    border-bottom: none;
  }
`

export const DetailTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

export const DetailMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const DetailDescription = styled.p`
  margin: 10px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const DetailToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

export const SubsectionLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const BallotAddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`

/** 국민투표·주민투표 — 투표 안 블록 */
export const ReferendumBallotPanel = styled.div`
  margin-top: 4px;
  padding: 16px 18px 18px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, rgba(0, 0, 0, 0) 52%)'
      : 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 48%)'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.85)'};
`

export const ReferendumBallotPanelHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e0f2fe'};
`

export const ReferendumBallotPanelTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`

export const ReferendumBallotPanelIcon = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  color: #0284c7;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(14, 165, 233, 0.15)'
      : 'rgba(14, 165, 233, 0.12)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(14, 165, 233, 0.25)'
        : 'rgba(14, 165, 233, 0.22)'};
`

export const ReferendumBallotPanelTitles = styled.div`
  min-width: 0;
`

export const ReferendumBallotPanelKicker = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 4px;
`

export const ReferendumBallotPanelTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.35;
`

export const ReferendumBallotAddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 14px;

  input[type='text'] {
    flex: 1 1 200px;
    min-width: 0;
  }
`

/** 투표 안별 득표 비중 — 가로 막대 */
export const ReferendumBallotBars = styled.div`
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const ReferendumBallotBarKicker = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 2px;
`

export const ReferendumBallotBarRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  align-items: center;
`

export const ReferendumBallotBarLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ReferendumBallotBarValue = styled.div`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
`

export const ReferendumBallotBarTrack = styled.div`
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
  overflow: hidden;
`

export const ReferendumBallotBarFill = styled.div<{
  $widthPct: number
  $fill: string
}>`
  height: 100%;
  width: ${({ $widthPct }) => `${Math.min(100, Math.max(0, $widthPct))}%`};
  border-radius: inherit;
  background: ${({ $fill }) => $fill};
  box-shadow: inset 0 -1px 0 rgba(15, 23, 42, 0.08);
  transition: width 0.35s ease;
`

export { FormSelectNative } from '@/shared/ui/form-select-native'

export const InlineTextInput = styled.input`
  flex: 1;
  min-width: 160px;
  padding: 12px 14px;
  font-size: 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

export const ElectedBadge = styled.span`
  margin-left: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #34d399;
`

/** 정당 블록 카드 (레거시·일부 화면 호환용) */
export const PartyBlockCard = styled.div`
  ${({ theme }) => glassOrSolidMixin(theme)}
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 1px 3px rgba(0, 0, 0, 0.06)'};
`

/** 정당 목록 — 선거 목록 카드(ElectionNavButton)와 동일 토큰(16px·그림자·호버) */
export const PartyListWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
`

export const PartyRowCard = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'rgba(99, 102, 241, 0.42)' : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'linear-gradient(145deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.04) 100%)'
        : 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(248, 250, 252, 0.92)'};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 0 0 1px rgba(99, 102, 241, 0.15), 0 8px 22px rgba(0, 0, 0, 0.28)'
        : '0 4px 16px rgba(99, 102, 241, 0.1), 0 1px 0 rgba(255, 255, 255, 0.85) inset'
      : '0 1px 2px rgba(15, 23, 42, 0.04)'};
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.2s ease,
    transform 0.16s ease;
  font: inherit;
  color: inherit;

  &:hover {
    border-color: ${({ $active, theme }) =>
      $active ? 'rgba(99, 102, 241, 0.55)' : theme.colors.border.medium};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.16)'
          : 'rgba(99, 102, 241, 0.09)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : '#f1f5f9'};
    transform: translateY(-1px);
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.65);
    outline-offset: 2px;
  }
`

/** 정당 상세 로고와 동일한 브랜드 링 개념(축소) */
export const PartyRowAvatar = styled.div<{ $ring?: string | null }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid
    ${({ theme, $ring }) => ($ring ? `${$ring}55` : theme.colors.border.light)};
  box-shadow: ${({ $ring }) => ($ring ? `0 0 0 2px ${$ring}30` : 'none')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 18px;
`

export const PartyRowAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
`

export const PartyRowBody = styled.div`
  flex: 1;
  min-width: 0;
`

export const PartyRowTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const PartyRowMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const PartyRowChevron = styled.span<{ $active?: boolean }>`
  flex-shrink: 0;
  color: ${({ $active, theme }) =>
    $active ? '#6366f1' : theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  transition: color 0.15s ease;
`

/** 정당 목록 — 인포그래픽: 스펙트럼 + 연정 띠 + 타일 카드 */
export const PartyInfographicSection = styled.div`
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
`

export const PartyInfographicKicker = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

export const PartyInfographicKickerLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const PartyInfographicKickerTitle = styled.span`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PartyInfographicKickerDesc = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.45;
`

export const PartyIdeologySpectrumWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const PartyIdeologySpectrumLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PartyIdeologySpectrumTrack = styled.div`
  position: relative;
  height: 30px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(90deg, #312e81 0%, #5b21b6 22%, #475569 50%, #be123c 78%, #881337 100%)'
      : 'linear-gradient(90deg, #4f46e5 0%, #9333ea 24%, #94a3b8 50%, #ea580c 76%, #dc2626 100%)'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'inset 0 0 0 1px rgba(255,255,255,0.12)'
      : 'inset 0 0 0 1px rgba(15,23,42,0.06)'};
  opacity: 0.92;
`

export const PartyIdeologySpectrumDot = styled.div<{
  $leftPct: number
  $fill: string
}>`
  position: absolute;
  bottom: 7px;
  left: ${({ $leftPct }) => $leftPct}%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)'};
  background: ${({ $fill }) => $fill};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  pointer-events: none;
`

export const PartyIdeologySpectrumEnds = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 2px;
`

export const PartyCoalitionStrip = styled.div`
  display: flex;
  width: 100%;
  height: 11px;
  border-radius: 999px;
  overflow: hidden;
  gap: 3px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'inset 0 0 0 1px rgba(255,255,255,0.1)'
      : 'inset 0 0 0 1px rgba(15,23,42,0.07)'};
`

export const PartyCoalitionSegment = styled.div<{ $color: string }>`
  flex: 1 1 0;
  min-width: 4px;
  height: 100%;
  background: ${({ $color }) => $color};
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.1) saturate(1.05);
  }
`

export const PartyInfographicGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(228px, 1fr));
  gap: 14px;
  width: 100%;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

export const PartyInfographicCard = styled.button<{ $accent?: string | null }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  width: 100%;
  min-height: 176px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  font: inherit;
  color: inherit;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.98) 100%)'
      : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 10px 32px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255, 255, 255, 0.04)'
      : '0 4px 18px rgba(15, 23, 42, 0.07), 0 1px 0 rgba(255, 255, 255, 0.9) inset'};
  transition:
    border-color 0.18s ease,
    box-shadow 0.2s ease,
    transform 0.16s ease;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    z-index: 1;
    background: ${({ $accent, theme }) =>
      $accent ?? (theme.mode === 'dark' ? '#818cf8' : '#6366f1')};
    border-radius: 20px 0 0 20px;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) =>
      theme.mode === 'dark'
        ? '0 14px 40px rgba(0, 0, 0, 0.48)'
        : '0 12px 32px rgba(15, 23, 42, 0.1)'};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.65);
    outline-offset: 2px;
  }
`

export const PartyInfographicCardHero = styled.div<{ $tint?: string | null }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 16px 10px;
  min-height: 96px;
  position: relative;
  z-index: 0;
  background: ${({ $tint, theme }) =>
    $tint
      ? theme.mode === 'dark'
        ? `radial-gradient(ellipse 95% 85% at 50% 20%, ${$tint}40 0%, transparent 68%)`
        : `radial-gradient(ellipse 95% 85% at 50% 18%, ${$tint}30 0%, transparent 65%)`
      : 'transparent'};
`

export const PartyInfographicLogo = styled.div<{ $ring?: string | null }>`
  width: 58px;
  height: 58px;
  border-radius: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid
    ${({ theme, $ring }) => ($ring ? `${$ring}55` : theme.colors.border.light)};
  box-shadow: ${({ $ring }) =>
    $ring
      ? `0 0 0 3px ${$ring}26, 0 10px 22px rgba(15, 23, 42, 0.2)`
      : '0 8px 18px rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 22px;
`

export const PartyInfographicLogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
`

export const PartyInfographicStatusPill = styled.span<{ $dissolved: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  padding: 4px 8px;
  border-radius: 999px;
  ${({ $dissolved, theme }) =>
    $dissolved
      ? `
    color: ${theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
    background: ${theme.mode === 'dark' ? 'rgba(248,113,113,0.18)' : 'rgba(254,226,226,0.96)'};
  `
      : `
    color: ${theme.mode === 'dark' ? '#86efac' : '#15803d'};
    background: ${theme.mode === 'dark' ? 'rgba(34,197,94,0.16)' : 'rgba(220,252,231,0.96)'};
  `}
`

export const PartyInfographicCardBody = styled.div`
  padding: 0 14px 14px;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 0;
`

export const PartyInfographicPartyName = styled.div`
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

export const PartyInfographicShortRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const PartyInfographicShortBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(99, 102, 241, 0.09)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PartyInfographicMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PartyInfographicPositionChip = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(129, 140, 248, 0.22)'
      : 'rgba(99, 102, 241, 0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
`

export const PartyInfographicFootHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  gap: 4px;
`

/**
 * 정당 상세 — 단일 카드로 감싸지 않고, 세로 스택 + 구분선만 사용
 */
export const PartyDetailLayout = styled.div`
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-width: 0;
`

export const PartyDetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 0 14px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
  flex-shrink: 0;
  background: transparent;
`

export const PartyDetailTopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 0;
`

export const PartyDetailBreadcrumbSep = styled.span`
  font-size: 11px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1'};
  padding: 0 2px;
  user-select: none;
`

export const PartyDetailCrumbTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#1e293b')};
  padding: 6px 4px;
  max-width: min(280px, 46vw);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PartyDetailTopActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
`

/** 목록 — 테두리 없는 텍스트형 뒤로가기 */
export const PartyDetailBackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px 6px 2px;
  margin: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    color 0.15s ease,
    background 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'};
  }
`

/** @deprecated PartyDetailBackLink 사용 */
export const PartyDetailBackBtn = PartyDetailBackLink

/** 정당 상세 히어로 — 구분선 아래 일반 흐름 (로고·상단 border 비겹침) */
export const PartyDetailHero = styled.div`
  padding: 20px 0 8px;
  margin: 0;
  border: none;
  background: transparent;
`

export const PartyDetailHeroStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
  text-align: center;
`

export const PartyDetailLogoHero = styled.div<{ $ring?: string | null }>`
  width: 156px;
  height: 156px;
  border-radius: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 20px;
  border: 1px solid
    ${({ theme, $ring }) =>
      $ring
        ? `${$ring}55`
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : '#e8ecf0'};
  box-shadow: ${({ $ring }) =>
    $ring
      ? `0 0 0 3px ${$ring}22, 0 16px 48px rgba(15, 23, 42, 0.1)`
      : '0 16px 48px rgba(15, 23, 42, 0.09)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PartyDetailHeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 18px;
`

export const PartyDetailLogo = styled.div<{ $ring?: string | null }>`
  width: 84px;
  height: 84px;
  border-radius: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid
    ${({ theme, $ring }) =>
      $ring
        ? `${$ring}55`
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : '#e8ecf0'};
  box-shadow: ${({ $ring }) =>
    $ring ? `0 0 0 3px ${$ring}22` : '0 1px 3px rgba(15, 23, 42, 0.06)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PartyDetailLogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

export const PartyDetailHeading = styled.div`
  flex: 1;
  min-width: 0;
`

export const PartyDetailName = styled.h3`
  margin: 0 0 14px;
  font-size: clamp(1.25rem, 2.8vw, 1.45rem);
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.035em;
  line-height: 1.15;
`

/** 중앙 히어로용 제목 */
export const PartyDetailHeroTitle = styled.h2`
  margin: 0 0 12px;
  max-width: 100%;
  font-size: clamp(1.35rem, 3.2vw, 1.65rem);
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.04em;
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
`

export const PartyDetailChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

export const PartyDetailChipRowCenter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  max-width: 100%;
`

/** 중립 톤 배지 — 과한 보라 대신 슬레이트 계열 */
export const PartyDetailChip = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.22)' : '#e2e8f0'};
  border-radius: 999px;
  padding: 5px 12px;
  max-width: 100%;
`

export const PartyDetailChipMuted = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 6px;
  letter-spacing: 0.02em;
`

export const PartyDetailSub = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

export const PartyDetailMetaSection = styled.div`
  padding: 20px 0 4px;
  margin-top: 0;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#eef2f7'};
`

/** 메타 — 패널 안에 또 박스를 두지 않고 라벨·값만 그리드로 배치 */
export const PartyDetailMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px 20px;
`

export const PartyDetailMetaTile = styled.div`
  min-width: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
`

export const PartyDetailMetaTileLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 6px;
`

export const PartyDetailMetaTileValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.45;
  word-break: break-word;
`

/** 선거 상세 — 요약 래퍼(박스 없음) */
export const ElectionDetailSummaryPanel = styled.div`
  margin-top: 14px;
`

export const ElectionDetailBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
`

export const ElectionDetailTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: none;
`

export const ElectionDetailStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: none;
`

export const ElectionDetailStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
  gap: 10px 12px;
`

export const ElectionDetailStatCard = styled.div`
  min-width: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
`

export const ElectionDetailStatLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 6px;
`

export const ElectionDetailStatValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
  word-break: break-word;
`

export const ElectionDetailStatCardWide = styled(ElectionDetailStatCard)`
  grid-column: 1 / -1;
`

/** 레거시 dl (다른 화면 호환) */
export const PartyDetailDl = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 10px 14px;
  font-size: 13px;
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    gap: 4px 0;
  }
`

export const PartyDetailDt = styled.dt`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  @media (max-width: 520px) {
    margin-top: 10px;
    &:first-of-type {
      margin-top: 0;
    }
  }
`

export const PartyDetailDd = styled.dd`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
  font-size: 13px;
  line-height: 1.5;
`

export const PartyDetailDesc = styled.p`
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

/** 설명 */
export const PartyDetailDescSection = styled.section`
  padding: 24px 0 8px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#eef2f7'};
  background: transparent;
`

/** 인물 상세 전기(Bio)와 동일 톤 — 라벨 행 */
export const PartyDescSectionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

export const PartyDescSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PartyDescOutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const PartyDescPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.28);
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
  &:hover:not(:disabled) {
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.38);
    opacity: 0.95;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const PartyDescBody = styled.div`
  background: transparent;
  padding: 4px 0 32px;
`

export const PartyDescProse = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: 0 16px;
`

/** 인물 전기 BioContent와 동일 — RichTextReadView 래퍼 */
export const PartyDescContent = styled(RichTextReadView)`
  font-size: 14.5px;
  line-height: 1.8;
  word-break: break-word;
  & p {
    margin: 0 0 0.75em;
  }
  & p:last-child {
    margin-bottom: 0;
  }
  & ul,
  & ol {
    margin: 8px 0;
    padding-left: 28px;
    list-style-position: outside;
  }
  & ul {
    list-style-type: disc;
  }
  & ol {
    list-style-type: decimal;
  }
  & li {
    margin: 4px 0;
    line-height: 1.55;
  }
`

export const PartyDescPlainText = styled.div`
  font-size: 14.5px;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 68ch;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const PartyDescEmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  padding: 4px 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 계보 블록 */
export const PartyDetailLineageSection = styled.section`
  padding: 18px 0 4px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#eef2f7'};
`

export const PartyDetailLineageIntro = styled.p`
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PartyDetailLineageGroupTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
`

export const PartyDetailLineageList = styled.ul`
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
`

export const PartyDetailLineageItem = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  font-size: 13px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#eef2f7'};

  &:last-child {
    border-bottom: none;
  }
`

export const PartyDetailLineageItemMain = styled.div`
  flex: 1;
  min-width: 0;
`

export const PartyDetailLineageMeta = styled.div`
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-word;
`

/** 전신/후신 연결 직전 — 기준일·메모 */
export const PartyLineageConfirmPanel = styled.div`
  margin-top: 14px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
`

export const PartyLineageConfirmSummary = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 14px;
  word-break: break-word;
  line-height: 1.45;
`

export const PartyLineageConfirmActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`

export const PartyLineageDateInput = styled.input`
  width: 100%;
  max-width: 220px;
  padding: 9px 12px;
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const PartyLineageTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
`

export const PartyDetailLineageAddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
`

/** 계보 추가 — 안쪽에 또 프레임을 두지 않고 여백만 */
export const PartyDetailLineageAddPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  margin-top: 4px;
`

export const PartyDetailLineageHint = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const PartyDetailLineageBtnPair = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

export const PartyDetailLineageActionBtn = styled.button`
  flex: 1;
  min-width: min(100%, 240px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover:not(:disabled) {
    border-color: rgba(99, 102, 241, 0.45);
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.1)'
        : 'rgba(99, 102, 241, 0.06)'};
    box-shadow: 0 1px 0 rgba(99, 102, 241, 0.08);
  }
  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  strong {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  small {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    line-height: 1.4;
  }
`

export const PartyDescriptionLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
`

export const PartyDescriptionLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

/** 인물 전기 BioEditorWrap과 동일 — 중앙 정렬 좁은 폭 */
export const PartyDescriptionEditorWrap = styled.div`
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
  min-height: 280px;
  max-height: min(480px, 55vh);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#fafafa'};
`

export const PartyDescriptionEditActions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 680px;
  margin: 16px auto 0;
  width: 100%;
`

/** @deprecated 상단 바(PartyDetailTopBar)로 이동 — 레거시 호환용 */
export const PartyDetailToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const EmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
