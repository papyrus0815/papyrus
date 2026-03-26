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
      $active ? 'rgba(99, 102, 241, 0.55)' : theme.colors.border.default};
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

/** 정당 목록 — 행정기구(organizations) OrgCard와 유사한 단일 깊이 카드 행 */
export const PartyListWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
`

export const PartyRowCard = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid
    ${({ $active, theme }) =>
      $active ? 'rgba(99, 102, 241, 0.55)' : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.12)'
        : 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : '#fff'};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  font: inherit;
  color: inherit;

  &:hover {
    border-color: ${({ $active, theme }) =>
      $active ? 'rgba(99, 102, 241, 0.65)' : theme.colors.border.medium};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.14)'
          : 'rgba(99, 102, 241, 0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : '#f8faff'};
  }
`

export const PartyRowAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
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

/**
 * 정당 상세 — 단일 표면(중첩 카드 없음). 행정조직 부처 상세 `DetailRoot` +
 * `DeptDetailTopBar` + 프로필 블록 패턴과 동일한 정보 위계.
 */
export const PartyDetailPanel = styled.div`
  margin-top: 14px;
  border-radius: 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e8ecf0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'};
  overflow: hidden;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 4px 24px rgba(0, 0, 0, 0.25)'
      : '0 1px 2px rgba(15, 23, 42, 0.04)'};
`

/** 행정부 `DeptDetailTopBar` 와 동일: 구분선만, 추가 카드 배경 없음 */
export const PartyDetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 20px 14px;
  border-bottom: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f0f2f7'};
  flex-shrink: 0;
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`

/** `DeptDetailBackBtn` 톤 */
export const PartyDetailBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 4px;
  margin: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  transition: color 0.14s ease;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  }
`

/** 로고·명칭 — 부처 `DeptProfileBlock` 과 유사한 단일 히어로 밴드(안에 박스 없음) */
export const PartyDetailHero = styled.div`
  padding: 24px 22px 22px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafbfc'};
`

export const PartyDetailHeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 18px;
`

export const PartyDetailLogo = styled.div`
  width: 76px;
  height: 76px;
  border-radius: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e8ecf0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'};
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
  margin: 0 0 12px;
  font-size: 1.35rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  line-height: 1.2;
`

export const PartyDetailChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

export const PartyDetailChip = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.12)'
      : 'rgba(99, 102, 241, 0.07)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(165, 180, 252, 0.2)' : '#e0e7ff'};
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

/** 메타 정보 — 별도 카드 없이 패딩만 (구분은 상단 히어로 border-bottom) */
export const PartyDetailMetaSection = styled.div`
  padding: 20px 22px 22px;
`

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

/** 설명 — 별도 박스 없이 상단 구분선만 (부처 `ProfileSection` 계열) */
export const PartyDetailDescSection = styled.section`
  padding: 22px 22px 26px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f0f2f7'};
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

/** RichTextEditor 저장 HTML 읽기 전용 */
export const PartyDescriptionReadHtml = styled(RichTextReadView)`
  font-size: 0.9375rem;
  line-height: 1.65;
  word-break: break-word;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};

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

export const PartyDescriptionEditorWrap = styled.div`
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
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
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
