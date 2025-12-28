/**
 * Tenure Group Header Widget
 * FSD: widgets/tenure-group/ui
 */

import React from 'react'
import { FiChevronDown, FiUserCheck } from 'react-icons/fi'

import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'

import * as List from '../../../pages/events/styles/list.styles'

interface TenureGroupHeaderProps {
  headOfState: HeadOfStateDuringEvent
  otherHeadsOfState: HeadOfStateDuringEvent[]
  isExpanded: boolean
  onToggleExpansion: () => void
}

export const TenureGroupHeader: React.FC<TenureGroupHeaderProps> = ({
  headOfState,
  otherHeadsOfState,
  isExpanded,
  onToggleExpansion,
}) => {
  return (
    <List.TenureGroupHeader $depth={0}>
      <List.TenureGroupTitle>
        <FiUserCheck />
      </List.TenureGroupTitle>
      <List.TenureGroupAvatar>
        {headOfState.person.profileImageUrl ? (
          <img
            src={headOfState.person.profileImageUrl}
            alt={`${headOfState.person.surname || ''}${headOfState.person.name}`}
          />
        ) : (
          <>
            {(headOfState.person.surname || '')[0]}
            {headOfState.person.name[0]}
          </>
        )}
      </List.TenureGroupAvatar>
      <List.TenureGroupInfo>
        <span>
          {headOfState.person.surname || ''}
          {headOfState.person.name}
        </span>
        <List.TenureGroupBadge>{headOfState.country.name}</List.TenureGroupBadge>
        <span style={{ color: 'rgba(99, 102, 241, 0.6)' }}>집권 시작</span>
      </List.TenureGroupInfo>
      {otherHeadsOfState && otherHeadsOfState.length > 0 && (
        <List.TenureGroupExpandButton
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpansion()
          }}
        >
          {isExpanded ? (
            <>
              <FiChevronDown size={12} />
              접기
            </>
          ) : (
            <>
              +{otherHeadsOfState.length}명
            </>
          )}
        </List.TenureGroupExpandButton>
      )}
    </List.TenureGroupHeader>
  )
}

