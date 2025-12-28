/**
 * 군사 이벤트 상태 관리 Hook
 * FSD: features/event-create/model
 */
import { useState } from 'react'

import type { MilitaryEvent } from '@/shared/types/military-event.types'

import type {
  BelligerentSide,
  CasualtyData,
  MilitaryConflictDetails,
} from '../../../pages/events/create/military-event-form'
import type { EventBelligerentsGraph } from '../../../pages/events/types/belligerents-graph.types'

export const useMilitaryEventState = () => {
  // 정규화된 구조
  const [militaryEvent, setMilitaryEvent] = useState<MilitaryEvent>({
    belligerentSides: [],
    relations: [],
    militaryDetails: {
      conflictType: undefined,
      combatTypes: [],
    },
    casualties: [],
    warCost: '',
  })

  // 레거시 구조 (하위 호환성)
  const [belligerents, setBelligerents] = useState<BelligerentSide[]>([])
  const [belligerentsGraph, setBelligerentsGraph] =
    useState<EventBelligerentsGraph>({
      countries: [],
      relations: [],
    })
  const [casualties, setCasualties] = useState<{
    [sideId: string]: CasualtyData
  }>({})
  const [militaryDetails, setMilitaryDetails] =
    useState<MilitaryConflictDetails>({
      type: 'battle',
      combatType: ['land'],
      outcome: '',
    })
  const [warCost, setWarCost] = useState('')

  return {
    // 정규화된 구조
    militaryEvent,
    setMilitaryEvent,

    // 레거시 구조
    belligerents,
    setBelligerents,
    belligerentsGraph,
    setBelligerentsGraph,
    casualties,
    setCasualties,
    militaryDetails,
    setMilitaryDetails,
    warCost,
    setWarCost,
  }
}

export type MilitaryEventState = ReturnType<typeof useMilitaryEventState>
