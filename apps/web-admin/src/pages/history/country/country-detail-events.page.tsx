/**
 * /history/country/:countryId/events — 사건 연대표 탭 (라우터 레벨로 분리)
 *
 * 셸은 CountryDetailShell이 공유 — 좌측 리스트/모달/데이터는 동일.
 * 우측만 EventsTimelineSection.
 */
import { motion } from 'framer-motion'

import { useNavigate, useSearchParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { EventsTimelineSection } from '@/widgets/country/country-detail/ui/events-timeline-section.widget'

import { CountryDetailShell } from './country-detail-shell'

export default function CountryDetailEventsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  return (
    <CountryDetailShell
      renderRight={({ selectedId }) => (
        <motion.div
          key={`events-${selectedId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ width: '100%', minHeight: '100%' }}
        >
          <EventsTimelineSection
            countryId={selectedId ?? undefined}
            initialFormFromSearchParams={searchParams.get('form') === 'create'}
            onNavigateToForm={(toForm) => {
              if (!selectedId) return
              navigate(
                toForm
                  ? pathKeys.history.countryEvents(selectedId, 'create')
                  : pathKeys.history.countryEvents(selectedId),
              )
            }}
          />
        </motion.div>
      )}
    />
  )
}
