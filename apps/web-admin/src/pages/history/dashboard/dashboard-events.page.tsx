/**
 * /history/dashboard/events          — 전체 사건 연대표
 * /history/dashboard/events/:eventId — 사건 상세
 * /history/dashboard/events/:eventId/edit — 사건 수정 폼
 *
 * 국가 컨텍스트 없이 전체 범위의 연대표를 표시.
 * 국가 상세 내의 연대표 탭(/history/country/:id/events)은 country.page에서 처리.
 */
import { motion } from 'framer-motion'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { EventsTimelineSection } from '@/widgets/country/country-detail/ui/events-timeline-section.widget'
import { HistoryShell } from '@/widgets/history-shell'

import { DashboardEventDetailPage } from '../country/dashboard-event-detail.page'

export default function DashboardEventsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ eventId?: string }>()
  const [searchParams] = useSearchParams()

  const eventId = params.eventId ?? null
  const isEdit = !!eventId && location.pathname.endsWith('/edit')

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
          {isEdit ? (
            <EventsTimelineSection
              countryId={undefined}
              initialFormFromSearchParams={false}
              onNavigateToForm={() => {}}
              editEventId={eventId!}
              onEditBack={() =>
                navigate(pathKeys.history.dashboardEventDetail(eventId!))
              }
              onEditSuccess={() =>
                navigate(pathKeys.history.dashboardEventDetail(eventId!))
              }
            />
          ) : eventId ? (
            <DashboardEventDetailPage />
          ) : (
            <EventsTimelineSection
              countryId={undefined}
              initialFormFromSearchParams={
                searchParams.get('form') === 'create'
              }
              onNavigateToForm={() => {}}
            />
          )}
        </motion.div>
      }
    />
  )
}
