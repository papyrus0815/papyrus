/**
 * 국가 상세 — 선거·투표 / 정당 블록 공용 UI (다크·라이트 테마, 인물 등록 모달과 톤 맞춤)
 */
import styled from 'styled-components'

import { glassOrSolidMixin } from '@/shared/styles/mixins'

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
  max-width: 340px;
  flex-shrink: 0;
  padding-right: 16px;
  margin-right: 8px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 900px) {
    max-width: none;
    border-right: none;
    padding-right: 0;
    margin-right: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

export const DetailColumn = styled.div`
  flex: 1;
  min-width: 280px;
  min-height: 280px;
`

/** 선거 목록 항목 */
export const ElectionNavButton = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? 'rgba(99, 102, 241, 0.55)'
        : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.12)'
        : 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
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
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
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

/** 네이티브 select — Input과 동일 톤 */
export const FormSelectNative = styled.select`
  width: 100%;
  max-width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

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

/** 정당 블록 카드 */
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

export const EmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
