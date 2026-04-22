/**
 * /history/dashboard/persons
 * /history/dashboard/persons/:personId
 *
 * 인물 대시보드 — 인포그래픽 4뷰 + 필터 패널.
 * 인물 상세는 같은 페이지에서 PersonDetailPanel로 우측 렌더.
 */
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { HistoryShell, LeftFilterSlot } from '@/widgets/history-shell'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'
import { PersonInfographicPane } from '@/widgets/person-infographic'

export default function DashboardPersonsPage() {
  const navigate = useNavigate()
  const params = useParams<{ personId?: string }>()
  const personId = params.personId ?? null

  return (
    <HistoryShell
      left={({ listCollapsed, toggleListCollapsed }) => (
        <LeftFilterSlot
          view="person"
          collapsed={listCollapsed}
          onToggleCollapse={toggleListCollapsed}
        />
      )}
      right={
        personId ? (
          <DetailWrap>
            <PersonDetailPanel
              key={personId}
              personId={personId}
              onClose={() => navigate(pathKeys.history.dashboardPersons())}
              onEdit={(id) => navigate(pathKeys.persons.edit(id))}
              onLinkedPersonClick={(id) =>
                navigate(pathKeys.history.dashboardPersonDetail(id))
              }
              closeLabel="뒤로"
            />
          </DetailWrap>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%', minHeight: '100%' }}
          >
            <PersonInfographicPane
              onPersonClick={(id) =>
                navigate(pathKeys.history.dashboardPersonDetail(id))
              }
            />
          </motion.div>
        )
      }
    />
  )
}

const DetailWrap = styled.div`
  padding: 36px 32px 48px;
  background: ${({ theme }) => theme.colors.background.primary};
`
