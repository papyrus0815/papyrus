/**
 * 중앙부처 상세 — `cabinets-section.widget.tsx` 행정부 상세와 동일 토큰·컴포넌트
 * (HeadProfileBlock / CabDetailTopBar / ProfileSection 등 CSS 그대로 이식)
 */
import styled from 'styled-components'

/* ── 행정부 상세 상단 바 (CabDetailTopBar 동일) ── */
export const DeptDetailTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 14px;
  border-bottom: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
  margin-bottom: 8px;
  flex-shrink: 0;
`

export const DeptDetailTopLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 0;
`

/** CabDetailBackBtn 동일 */
export const DeptDetailBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 4px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.14s;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  }
`

export const DeptBreadcrumbSep = styled.span`
  font-size: 11px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
  padding: 12px 0 8px;
  user-select: none;
`

export const DeptCrumbTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#1e293b')};
  padding: 6px 4px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DeptDetailTopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
`

/** 상단 우측 — 수정·삭제를 한 덩어리로 (행정부 상세 툴바와 동일 톤) */
export const DeptDetailActionsGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

/** 상단 수정 — 인디고 보더 고스트 */
export const DeptTopEditBtn = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(129, 140, 250, 0.35)' : '#c7d2fe'};
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.14s,
    background 0.14s,
    color 0.14s;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(165, 180, 252, 0.55)' : '#818cf8'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
  }
`

/** 상단 삭제 — 레드 보더 (수정 버튼과 높이·모서리 통일) */
export const DeptTopDeleteBtn = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fca5a5' : '#dc2626'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'transparent' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220, 38, 38, 0.4)' : '#fecaca'};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.14s,
    border-color 0.14s,
    color 0.14s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fff1f2'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.55)' : '#f87171'};
    color: #ef4444;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35);
  }
`

/** 행정부 상세 HeadProfileBlock 과 동일 — 썸네일 중앙·상단 반원 겹침 */
const DEPT_PROFILE_AVATAR_PX = 132
const DEPT_PROFILE_AVATAR_RADIUS = DEPT_PROFILE_AVATAR_PX / 2

export const DeptProfileBlock = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
  margin-top: ${DEPT_PROFILE_AVATAR_RADIUS}px;
  margin-bottom: 16px;
  padding: ${DEPT_PROFILE_AVATAR_RADIUS + 20}px 20px 28px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf0'};
  border-radius: 16px;
  overflow: visible;
`

export const DeptProfileAvatar = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
  z-index: 2;
  flex-shrink: 0;
  width: ${DEPT_PROFILE_AVATAR_PX}px;
  height: ${DEPT_PROFILE_AVATAR_PX}px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 12px 40px rgba(0,0,0,0.35)'
      : '0 10px 32px rgba(15, 23, 42, 0.08)'};
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.28)' : '#94a3b8'};
  }
`

export const DeptProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 560px;
  width: 100%;
  min-width: 0;
`

export const DeptProfileNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-wrap: wrap;
`

export const DeptCategoryBadge = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 5px;
  padding: 2px 7px;
  letter-spacing: 0.01em;
  flex-shrink: 0;
`

export const DeptProfileName = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  letter-spacing: -0.03em;
  line-height: 1.25;
  text-align: center;
  word-break: keep-all;
`

export const DeptPosBadge = styled.span`
  display: inline-block;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 6px;
  padding: 2px 10px;
  width: fit-content;
`

export const DeptTenureRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
`

export const DeptTenureDates = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#64748b')};
  font-weight: 500;
`

/** 프로필 히어로 하단 — 1행: 확장 2행: 편집·탐색 */
export const DeptProfileActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 18px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8ecf0'};
  width: 100%;
  max-width: 480px;
`

export const DeptProfileActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
`

const actionHeight = '36px'

export const DeptActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: ${actionHeight};
  padding: 0 15px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#334155')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.14s,
    background 0.14s;
  white-space: nowrap;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.22)' : '#cbd5e1'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : '#f8fafc'};
  }
`

export const DeptActionBtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: ${actionHeight};
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.14s,
    box-shadow 0.14s;
  &:hover {
    background: #4f46e5;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.28);
  }
`

export const DeptActionBtnTeal = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: ${actionHeight};
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #0d9488;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s, box-shadow 0.14s;
  &:hover {
    background: #0f766e;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.28);
  }
`


/* HeadTenureInfoSection 동일 */
export const DeptInfoSection = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border: 1.5px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
  border-radius: 12px;
  margin-bottom: 0;
`

export const DeptInfoSectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#374151')};
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

export const DeptInfoDot = styled.span<{ $color?: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => p.$color ?? '#6366f1'};
  flex-shrink: 0;
  display: inline-block;
`

export const DeptInfoText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#475569')};
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
`

/* ProfileSection 동일 */
export const ProfileSection = styled.div`
  padding: 20px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const ProfileSectionLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  color: #b0bac9;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 7px;
`

export const DetailRoot = styled.div`
  padding: 8px 4px 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 280px;
`

export const DefenseBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'};
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(165,180,252,0.2)' : '#e0e7ff'};
  flex-shrink: 0;
`

export const UnitsRow = styled.div`
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
`

export const UnitsLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #b0bac9;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-right: 4px;
`

export const UnitChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
`

export const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 12px;
`

export const MetaPanel = styled.div`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f0f2f7'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafafa'};
`

export const MetaPanelLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #b0bac9;
  margin-bottom: 6px;
`

export const MetaPanelBody = styled.div`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#334155')};
  white-space: pre-wrap;
`
