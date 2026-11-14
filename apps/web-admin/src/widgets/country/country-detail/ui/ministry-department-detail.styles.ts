/**
 * 중앙부처·국가기관 상세 스타일 — 사건 페이지 DetailPanel 플랫 원장 규격
 * 중첩 카드 박스를 없애고 1px 헤어라인 섹션 분할 + 중성 타이포그래피로 구성
 */
import styled from 'styled-components'

import { GOV_BRAND, GOV_ROW_HAIRLINE } from '@/features/government-info/ui/government-ledger.styles'

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
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
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
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(20,19,34,0.1)'};
  border-radius: 7px;
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
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f8fafc'};
  }
`

export const DeptTopTealBtn = styled(DeptTopGhostBtn)`
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
  border-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(45, 212, 191, 0.28)' : '#99f6e4'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(13, 148, 136, 0.12)' : '#f0fdfa'};

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#99f6e4' : '#0f766e')};
    border-color: #14b8a6;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(13, 148, 136, 0.2)' : '#ccfbf1'};
  }
`

export const DeptTopEditBtn = styled(DeptTopGhostBtn)`
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : GOV_BRAND.primary};
  border-color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(59, 130, 246, 0.35)'
      : 'rgba(37, 99, 235, 0.25)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};

  &:hover {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#bfdbfe' : GOV_BRAND.primaryHover};
    border-color: ${GOV_BRAND.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.26)'
        : 'rgba(37, 99, 235, 0.12)'};
  }
`

export const DeptTopDeleteBtn = styled(DeptTopGhostBtn)`
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
  border-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(220, 38, 38, 0.32)' : '#fecaca'};

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fecaca' : '#b91c1c')};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220, 38, 38, 0.14)' : '#fff1f2'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.5)' : '#f87171'};
  }
`

/* ── 플랫 기관 아이덴티티 헤더 블록 ── */
export const DeptIdentityCard = styled.div`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
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

export const DeptStatusBadge = styled.span<{ $abolished?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  color: ${({ theme, $abolished }) =>
    $abolished
      ? theme.colors.text.secondary
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};
  background: ${({ theme, $abolished }) =>
    $abolished
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.05)'
      : theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.14)'
        : '#ecfdf5'};
`

export const DeptStatusDot = styled.span<{ $abolished?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $abolished }) => ($abolished ? '#94a3b8' : '#10b981')};
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
  font-weight: 800;
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

/* ── 위계 · 계보 · 소관 군부대 매트릭스 (플랫 원장 행) ── */
export const DeptRelationsMatrix = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 20px 14px;
  border-top: 1px solid ${GOV_ROW_HAIRLINE};
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
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
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
  border-bottom: 1px solid ${GOV_ROW_HAIRLINE};
`

export const MetaPanel = styled.div`
  padding: 14px 20px;
  border-right: 1px solid ${GOV_ROW_HAIRLINE};

  &:last-child {
    border-right: none;
  }
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
