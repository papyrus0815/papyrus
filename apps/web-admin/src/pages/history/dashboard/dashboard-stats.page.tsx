/**
 * /history/dashboard — 통계 대시보드 페이지
 *
 * 통계는 필터가 필요 없으므로 fullScreen 모드. 좌측 패널 없음.
 */
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

import { useModernCountryPersonCounts } from '@/entities/person/api'
import { pathKeys } from '@/shared/router'
import { CountryDashboard } from '@/widgets/country/country-dashboard/ui/country-dashboard'
import { CountryFormModal } from '@/widgets/country/country-form/ui/country-form-modal'
import { useCountryFormModal } from '@/widgets/country/country-form/model/use-country-form-modal.hook'
import { HistoryShell, useHistoryCoreData } from '@/widgets/history-shell'

import { useRegistrationFeed } from '../country/use-registration-feed.hook'

export default function DashboardStatsPage() {
  const navigate = useNavigate()
  const { continents } = useHistoryCoreData()
  const {
    personFeed: registrationFeed,
    countryFeed: countryRegistrationFeed,
    eventFeed: recentEvents,
  } = useRegistrationFeed()

  const {
    data: modernCountryPersonCountRows,
    isLoading: isLoadingPersonCounts,
  } = useModernCountryPersonCounts({ enabled: true })

  const personCountByModernCountryId: Record<string, number> = {}
  for (const row of modernCountryPersonCountRows ?? []) {
    personCountByModernCountryId[row.countryId] = row.count
  }

  const countryForm = useCountryFormModal()

  return (
    <HistoryShell
      fullScreen
      right={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', minHeight: '100%' }}
        >
          <CountryDashboard
            isLoading={false}
            onCountryEdit={countryForm.openEdit}
            registrationFeed={registrationFeed}
            recentEvents={recentEvents}
            countryRegistrationFeed={countryRegistrationFeed}
            personCountByModernCountryId={personCountByModernCountryId}
            isLoadingPersonCounts={isLoadingPersonCounts}
            onRegistrationPersonClick={(item) => {
              if (item.type === 'person' && item.countryId) {
                navigate(
                  pathKeys.history.countryPersons(item.countryId, 'list'),
                )
              }
            }}
          />
        </motion.div>
      }
    >
      <CountryFormModal
        isOpen={countryForm.isOpen}
        onClose={countryForm.close}
        editing={countryForm.editing}
        continents={continents}
        onSave={countryForm.save}
      />
    </HistoryShell>
  )
}
