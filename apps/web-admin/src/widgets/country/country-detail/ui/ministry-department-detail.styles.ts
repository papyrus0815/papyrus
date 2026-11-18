/**
 * 중앙부처·국가기관 상세 스타일 — 사건 페이지 DetailPanel 플랫 원장 규격
 * 중첩 카드 박스를 없애고 1px 헤어라인 섹션 분할 + 중성 타이포그래피로 구성
 */
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { GOV_BRAND, GOV_ROW_HAIRLINE } from '@/features/government-info/ui/government-ledger.styles'

const govHairline = ({ theme }: { theme: { mode?: string } }) =>
  theme.mode === 'dark' ? GOV_ROW_HAIRLINE.dark : GOV_ROW_HAIRLINE.light

export const DetailRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
`

/* ── 상단 브레드크럼 & 액션 툴바 (사건 DetailPanelHeader 규격) ── */
export const DeptDetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 18px;
  border-bottom: 1px solid ${govHairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : '#fafafa'};
  flex-shrink: 0;
`

export const DeptDetailTopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

export const DeptDetailBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.1)'};
  cursor: pointer;
  transition:
    color 0.14s ease,
    background 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(20,19,34,0.04)'};
  }
`

export const DeptBreadcrumbSep = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  user-select: none;
`

export const DeptCrumbTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DeptDetailTopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-end;
`

export const DeptDetailActionsGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

export const DeptTopGhostBtn = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.1)'};
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,34,0.2)'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,34,0.04)'};
  }
`

export const DeptTopGhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.1)'};
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;

  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryInkDark : GOV_BRAND.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? GOV_BRAND.primaryBorderDark
        : GOV_BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  }
`

export const DeptTopTealBtn = styled(DeptTopGhostBtn)`
  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryInkDark : GOV_BRAND.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? GOV_BRAND.primaryBorderDark
        : GOV_BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  }
`

export const DeptTopEditBtn = styled(DeptTopGhostBtn)`
  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryInkDark : GOV_BRAND.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? GOV_BRAND.primaryBorderDark
        : GOV_BRAND.primaryBorder};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  }
`

export const DeptTopDeleteBtn = styled(DeptTopGhostBtn)`
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220, 38, 38, 0.14)' : '#fff1f2'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.45)' : '#fecaca'};
  }
`

/* ── 플랫 기관 아이덴티티 헤더 블록 ── */
export const DeptIdentityCard = styled.div`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid ${govHairline};
`

export const DeptIdentityMain = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;

  @media (max-width: 560px) {
    flex-direction: column;
    gap: 10px;
  }
`

export const DeptEmblemFrame = styled.div<{ $isDefense?: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 10px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ theme, $isDefense }) =>
      $isDefense
        ? theme.mode === 'dark'
          ? 'rgba(45, 212, 191, 0.28)'
          : '#99f6e4'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(20, 19, 34, 0.1)'};
  background: ${({ theme, $isDefense }) =>
    $isDefense
      ? theme.mode === 'dark'
        ? 'rgba(13, 148, 136, 0.14)'
        : '#f0fdfa'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : '#f8fafc'};
  color: ${({ theme, $isDefense }) =>
    $isDefense
      ? theme.mode === 'dark'
        ? '#5eead4'
        : '#0d9488'
      : theme.colors.text.secondary};
`

export const DeptIdentityBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

export const DeptBadgeStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

export type DeptStatusVisualTone =
  | 'active'
  | 'superseded'
  | 'historical'
  | 'abolished'

export const DeptStatusBadge = styled.span<{
  $abolished?: boolean
  $tone?: DeptStatusVisualTone
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  color: ${({ theme, $abolished, $tone }) => {
    const resolved = $tone ?? ($abolished ? 'abolished' : 'active')
    if (resolved === 'superseded') {
      return theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'
    }
    if (resolved === 'historical') {
      return theme.mode === 'dark' ? '#fcd34d' : '#b45309'
    }
    if (resolved === 'abolished') {
      return theme.colors.text.secondary
    }
    return theme.mode === 'dark' ? '#6ee7b7' : '#047857'
  }};
  background: ${({ theme, $abolished, $tone }) => {
    const resolved = $tone ?? ($abolished ? 'abolished' : 'active')
    if (resolved === 'superseded') {
      return theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff'
    }
    if (resolved === 'historical') {
      return theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb'
    }
    if (resolved === 'abolished') {
      return theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.05)'
    }
    return theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5'
  }};
`

export const DeptStatusDot = styled.span<{
  $abolished?: boolean
  $tone?: DeptStatusVisualTone
}>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $abolished, $tone }) => {
    const resolved = $tone ?? ($abolished ? 'abolished' : 'active')
    if (resolved === 'superseded') return '#6366f1'
    if (resolved === 'historical') return '#f59e0b'
    if (resolved === 'abolished') return '#94a3b8'
    return '#10b981'
  }};
`

export const DeptCategoryBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  border-radius: 5px;
  padding: 2px 7px;
  flex-shrink: 0;
`

export const DeptCategoryCompareLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primaryInkDark : GOV_BRAND.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? GOV_BRAND.primaryBorderDark
        : GOV_BRAND.primaryBorder};
  border-radius: 5px;
  padding: 2px 7px;
  flex-shrink: 0;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
  }
`

export const DefenseBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(13, 148, 136, 0.15)' : '#f0fdfa'};
  border-radius: 5px;
  flex-shrink: 0;
`

export const DeptProfileName = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  line-height: 1.3;
  word-break: keep-all;
`

export const DeptAbbrSpan = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: 6px;
`

export const DeptSubMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 1px;
`

export const DeptPosBadge = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const DeptTenureDates = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
`

export const DeptHqMetaTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#a5b4fc' : GOV_BRAND.primary};
  }
`

/* ── 위계 · 계보 · 소관 군부대 매트릭스 (플랫 원장 행) ── */
export const DeptRelationsMatrix = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 20px 14px;
  border-top: 1px solid ${govHairline};
`

export const DeptRelationRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;

  @media (max-width: 560px) {
    flex-direction: column;
    gap: 4px;
  }
`

export const UnitsLabel = styled.span`
  width: 88px;
  flex-shrink: 0;
  padding-top: 4px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: -0.01em;
`

export const UnitsChipList = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
`

export const UnitChip = styled.span<{ $tone?: 'default' | 'military' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $tone }) =>
    $tone === 'military'
      ? theme.mode === 'dark'
        ? '#5eead4'
        : '#0f766e'
      : theme.colors.text.primary};
  background: ${({ theme, $tone }) =>
    $tone === 'military'
      ? theme.mode === 'dark'
        ? 'rgba(13, 148, 136, 0.14)'
        : '#f0fdfa'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#ffffff'};
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'military'
        ? theme.mode === 'dark'
          ? 'rgba(45, 212, 191, 0.26)'
          : '#99f6e4'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(20,19,34,0.1)'};
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;

  &[role='button']:hover {
    border-color: ${({ $tone }) =>
      $tone === 'military' ? '#14b8a6' : GOV_BRAND.primary};
    background: ${({ theme, $tone }) =>
      $tone === 'military'
        ? theme.mode === 'dark'
          ? 'rgba(13, 148, 136, 0.22)'
          : '#ccfbf1'
        : theme.mode === 'dark'
          ? GOV_BRAND.primarySoftDark
          : GOV_BRAND.primarySoft};
  }
`

/* ── 개요 · 메타 섹션 (플랫 헤어라인 분할) ── */
export const DeptInfoSection = styled.div`
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid ${govHairline};
`

export const DeptInfoSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

export const DeptInfoDot = styled.span<{ $color?: string }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${(props) => props.$color ?? GOV_BRAND.primary};
  flex-shrink: 0;
  display: inline-block;
`

export const DeptInfoText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`

export const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1px;
  background: ${govHairline};
  border-bottom: 1px solid ${govHairline};
`

export const MetaPanel = styled.div`
  padding: 14px 20px;
  background: ${({ theme }) => theme.colors.background.primary};
`

export const MetaPanelLabel = styled.div`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 4px;
`

export const MetaPanelBody = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
`

export const DeptLocationSection = styled.div`
  padding: 14px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid ${govHairline};
`

export const DeptLocationHeader = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
`

export const DeptLocationValue = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.45;
`
