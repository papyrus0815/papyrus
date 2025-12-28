/**
 * Tenure Group Footer Widget
 * FSD: widgets/tenure-group/ui
 */

import React from 'react'

import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'

import * as List from '../../../pages/events/styles/list.styles'

interface TenureGroupFooterProps {
  headOfState: HeadOfStateDuringEvent
}

export const TenureGroupFooter: React.FC<TenureGroupFooterProps> = ({
  headOfState,
}) => {
  return (
    <List.TenureGroupFooter>
      {headOfState.person.surname || ''}
      {headOfState.person.name} {headOfState.position.title} 집권기 종료
    </List.TenureGroupFooter>
  )
}

