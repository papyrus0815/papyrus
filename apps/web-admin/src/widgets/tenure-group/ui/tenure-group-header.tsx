/**
 * Tenure Group Header Widget
 * FSD: widgets/tenure-group/ui
 */
import React from 'react'

import { FiChevronDown, FiUserCheck } from 'react-icons/fi'

import type { HeadOfStateDuringEvent } from '@/shared/api/government-positions'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import * as List from '../../../pages/events/styles/list.styles'

interface TenureGroupHeaderProps {
  headOfState: HeadOfStateDuringEvent
  otherHeadsOfState: HeadOfStateDuringEvent[]
  isExpanded: boolean
  onToggleExpansion: () => void
  /** 재위 시작 연도(표시 시 헤더 안에 "Y년 재위 시작" 한 블록으로) */
  startYear?: number | null
}

export const TenureGroupHeader: React.FC<TenureGroupHeaderProps> = ({
  headOfState,
  otherHeadsOfState,
  isExpanded,
  onToggleExpansion,
  startYear,
}) => {
  return (
    <List.TenureGroupHeader $depth={0}>
      <List.TenureGroupTitle>
        <FiUserCheck />
        {startYear != null && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(99, 102, 241, 0.8)',
            }}
          >
            {startYear}년 재위 시작
          </span>
        )}
      </List.TenureGroupTitle>
      <List.TenureGroupAvatar>
        {headOfState.person.profileImageUrl ? (
          <img
            src={headOfState.person.profileImageUrl}
            alt={getPersonDisplayName(headOfState.person)}
          />
        ) : (
          <>
            {(headOfState.person.surname || '')[0]}
            {headOfState.person.name[0]}
          </>
        )}
      </List.TenureGroupAvatar>
      <List.TenureGroupInfo>
        <span>{getPersonDisplayName(headOfState.person)}</span>
        <List.TenureGroupBadge>
          {headOfState.country.name}
        </List.TenureGroupBadge>
        {(() => {
          // tenure의 실제 구조에서 showPositionInfo 확인
          const actualTenure = headOfState.person.governmentPositions?.find(
            (gp: any) => gp.startDate === headOfState.tenure.startDate,
          )

          // 재임 기간 표시
          const startYear = headOfState.tenure.startDate
            ? new Date(headOfState.tenure.startDate).getFullYear()
            : null
          const endYear = headOfState.tenure.endDate
            ? new Date(headOfState.tenure.endDate).getFullYear()
            : null
          const tenurePeriod = startYear
            ? `${startYear}${endYear ? `~${endYear}` : '~현재'}`
            : ''

          // showPositionInfo가 false면 직책 정보 표시 안 함
          if (
            actualTenure &&
            (actualTenure as { showPositionInfo?: boolean }).showPositionInfo === false
          ) {
            return (
              <span style={{ color: 'rgba(99, 102, 241, 0.6)' }}>
                재임 {tenurePeriod}
              </span>
            )
          }

          // showPositionInfo가 true이거나 없으면 직책 정보 표시
          const { tenure: tenureInfo, position } = headOfState
          const parts = []
          if (tenureInfo.termNumber) parts.push(`제${tenureInfo.termNumber}대`)
          if (position.title) parts.push(position.title)
          if (tenurePeriod) parts.push(`(${tenurePeriod})`)

          return (
            <span style={{ color: 'rgba(99, 102, 241, 0.6)' }}>
              {parts.length > 0 ? parts.join(' ') : '집권 시작'}
            </span>
          )
        })()}
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
            <>+{otherHeadsOfState.length}명</>
          )}
        </List.TenureGroupExpandButton>
      )}
    </List.TenureGroupHeader>
  )
}
