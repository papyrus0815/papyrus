/**
 * 회담/외교 이벤트 상태 관리 Hook
 * FSD: features/event-create/model
 */
import { useState } from 'react'

import type { ConferenceEvent } from '../../../pages/events/types/conference-event.types'

export const useConferenceEvent = () => {
  const [conferenceEvent, setConferenceEvent] = useState<ConferenceEvent>({
    participants: [],
    treaties: [],
    countryTerms: [],
  })

  return {
    conferenceEvent,
    setConferenceEvent,
  }
}

export type ConferenceEventState = ReturnType<typeof useConferenceEvent>
