/**
 * Other Heads of State List Widget
 * FSD: widgets/tenure-group/ui
 */

import React from 'react'

import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'

import * as List from '../../../pages/events/styles/list.styles'

interface OtherHeadsOfStateListProps {
  otherHeadsOfState: HeadOfStateDuringEvent[]
}

export const OtherHeadsOfStateList: React.FC<OtherHeadsOfStateListProps> = ({
  otherHeadsOfState,
}) => {
  return (
    <List.OtherHeadsOfStateList>
      {otherHeadsOfState.map((otherHead) => (
        <List.OtherHeadOfStateRow
          key={`${otherHead.person.id}-${otherHead.tenure.startDate}`}
        >
          <List.OtherHeadAvatar>
            {otherHead.person.profileImageUrl ? (
              <img
                src={otherHead.person.profileImageUrl}
                alt={`${otherHead.person.surname || ''}${otherHead.person.name}`}
              />
            ) : (
              <>
                {(otherHead.person.surname || '')[0]}
                {otherHead.person.name[0]}
              </>
            )}
          </List.OtherHeadAvatar>
          <List.OtherHeadInfo>
            <strong>
              {otherHead.person.surname || ''}
              {otherHead.person.name}
            </strong>
            <span>|</span>
            <span>{otherHead.country.name}</span>
            <span>{otherHead.position.title}</span>
            <span>|</span>
            <span>
              {new Date(otherHead.tenure.startDate).getFullYear()}~
              {otherHead.tenure.endDate
                ? new Date(otherHead.tenure.endDate).getFullYear()
                : '현재'}
            </span>
          </List.OtherHeadInfo>
        </List.OtherHeadOfStateRow>
      ))}
    </List.OtherHeadsOfStateList>
  )
}

