/**
 * 단순 대시보드 뷰 공통 페이지.
 *
 * - dynasty · ethnicity — 전용 위젯을 그대로 렌더
 * - legislature · military — 안내 플레이스홀더 (기능 구현 전)
 *
 * 뷰 타입은 URL에서 자동 파싱.
 */
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { DynastySection } from '@/widgets/country/country-detail/ui/dynasty-section.widget'
import { EthnicityDashboardSection } from '@/widgets/country/country-detail/ui/ethnicity-dashboard-section.widget'
import {
  HistoryShell,
  LeftFilterSlot,
  type DashboardContentView,
} from '@/widgets/history-shell'

const PLACEHOLDERS: Partial<
  Record<
    DashboardContentView,
    { title: string; desc: string; fullPath?: string; fullLabel?: string }
  >
> = {
  legislature: {
    title: '저원 (입법 기관)',
    desc: '조직·입법 기관 정보를 관리합니다.',
    fullPath: '/organizations/',
    fullLabel: '전체 보기',
  },
  military: {
    title: '군사',
    desc: '국가를 선택한 뒤 행정조직 → 중앙부처에서 국방 관련 부처를 열고 「군부대 등록」으로 부대를 등록합니다.',
  },
}

function deriveView(pathname: string): DashboardContentView {
  if (pathname.includes('/dashboard/dynasty')) return 'dynasty'
  if (pathname.includes('/dashboard/ethnicity')) return 'ethnicity'
  if (pathname.includes('/dashboard/legislature')) return 'legislature'
  if (pathname.includes('/dashboard/military')) return 'military'
  return 'stats'
}

export default function DashboardSimplePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const view = deriveView(location.pathname)

  const renderRight = () => {
    if (view === 'dynasty') return <DynastySection />
    if (view === 'ethnicity') return <EthnicityDashboardSection />
    const ph = PLACEHOLDERS[view]
    if (!ph) return null
    return (
      <DashboardMenuContentPanel>
        <DashboardMenuContentTitle>{ph.title}</DashboardMenuContentTitle>
        <DashboardMenuContentDesc>{ph.desc}</DashboardMenuContentDesc>
        {ph.fullPath && ph.fullLabel && (
          <DashboardMenuContentButton
            type="button"
            onClick={() => navigate(ph.fullPath!)}
          >
            {ph.fullLabel}
          </DashboardMenuContentButton>
        )}
      </DashboardMenuContentPanel>
    )
  }

  return (
    <HistoryShell
      left={({ listCollapsed, toggleListCollapsed }) => (
        <LeftFilterSlot
          view={view}
          collapsed={listCollapsed}
          onToggleCollapse={toggleListCollapsed}
        />
      )}
      right={
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', minHeight: '100%' }}
        >
          {renderRight()}
        </motion.div>
      }
    />
  )
}

// ─── 로컬 스타일 ──────────────────────────────────────────────────────────────

const DashboardMenuContentPanel = styled.div`
  padding: 32px 24px;
  min-height: 100%;
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`

const DashboardMenuContentTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DashboardMenuContentDesc = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  max-width: 360px;
`

const DashboardMenuContentButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: ${theme.colors.text.primary};
          &:hover {
            background: rgba(99, 106, 242, 0.15);
            border-color: rgba(99, 106, 242, 0.4);
            color: #ffffff;
          }
        `
      : css`
          border: 1px solid ${theme.colors.border.default};
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.primary};
          &:hover {
            background: ${theme.colors.background.secondary};
            border-color: ${theme.colors.primary};
            color: ${theme.colors.primary};
          }
        `}
`
