/**
 * Tenure Group Footer Widget
 * FSD: widgets/tenure-group/ui
 */
import React from 'react'

import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'

import * as List from '../../../pages/events/styles/list.styles'

interface TenureGroupFooterProps {
  headOfState: HeadOfStateDuringEvent
  /** 퇴임 연도(표시 시 "Y년 퇴임"을 한 블록에 포함) */
  endYear?: number | null
}

export const TenureGroupFooter: React.FC<TenureGroupFooterProps> = ({
  headOfState,
  endYear,
}) => {
  const label = (() => {
    const { tenure, position } = headOfState
    const parts = []
    if (tenure.termNumber) parts.push(`제${tenure.termNumber}대`)
    if (position.title) parts.push(position.title)
    const title = parts.length > 0 ? parts.join(' ') : position.title
    return `${headOfState.person.surname || ''}${headOfState.person.name} ${title} 집권기 종료`
  })()
  return (
    <List.TenureGroupFooter>
      {endYear != null ? `${endYear}년 퇴임 · ` : ''}
      {label}
    </List.TenureGroupFooter>
  )
}
