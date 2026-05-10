/**
 * /history/country/:countryId/events — 사건 연대표 탭 (라우터 분리).
 *
 * Shell이 layout route라 motion wrapper·데이터·모달을 모두 떠안고 — 이 페이지는
 * EventsTimelineSection만 그린다.
 */
import { useNavigate, useSearchParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { EventsTimelineSection } from '@/widgets/country/country-detail/ui/events-timeline-section.widget'

import { useCountryDetailShellContext } from './country-detail-shell'

export default function CountryDetailEventsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedId } = useCountryDetailShellContext()

  return (
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
  )
}
