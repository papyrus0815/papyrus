/**
 * 행정부 상세 — 각료 목록 카드 그리드
 */
import React from 'react'

import { FiChevronRight, FiUser } from 'react-icons/fi'

import type { GovernmentCabinetTenureItem } from '@/shared/api/person-career'
import { calcAgeAtTenure } from '@/shared/lib/tenure-person-utils'

import {
  calcTenureDuration,
  formatDate,
  getPersonName,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

export type CabinetMinisterCardsProps = {
  selectedMinisterId: string | null
  /** 각료 재임 목록 */
  ministers: GovernmentCabinetTenureItem[]
  onSelectMinister: (tenureId: string) => void
  onMentionPerson: (personId: string) => void
}

export function CabinetMinisterCards({
  selectedMinisterId,
  ministers,
  onSelectMinister,
  onMentionPerson,
}: CabinetMinisterCardsProps) {
  return (
    <CabS.MinisterCardGrid>
      {ministers.map((tenure) => {
        const mThumb = tenure.person?.profileImageUrl ?? null
        const mName = getPersonName(tenure.person)
        const mPos = tenure.positionDefinition?.title ?? tenure.title ?? '—'
        const mStartFull = tenure.startDate ? formatDate(tenure.startDate) : '—'
        const mEndFull = tenure.endDate ? formatDate(tenure.endDate) : '현재'
        const mDuration = calcTenureDuration(tenure.startDate, tenure.endDate)
        const mAge = calcAgeAtTenure(tenure.person, tenure.startDate)
        const mAchCount = Array.isArray(tenure.achievements)
          ? tenure.achievements.length
          : 0
        return (
          <CabS.MinisterCard
            key={tenure.id}
            $selected={selectedMinisterId === tenure.id}
            onClick={() => {
              onSelectMinister(tenure.id)
            }}
          >
            <CabS.MinisterCardThumb
              onClick={(e) => {
                if (tenure.person?.id) {
                  e.stopPropagation()
                  onMentionPerson(tenure.person.id)
                }
              }}
              style={{
                cursor: tenure.person?.id ? 'pointer' : 'default',
              }}
              title={tenure.person?.id ? `${mName} 인물 정보 보기` : undefined}
            >
              {mThumb ? (
                <CabS.MinisterCardThumbImg src={mThumb} alt={mName} />
              ) : (
                <CabS.MinisterCardThumbPlaceholder>
                  <FiUser size={18} />
                </CabS.MinisterCardThumbPlaceholder>
              )}
              {mAchCount > 0 && (
                <CabS.MinisterCardBadge>{mAchCount}</CabS.MinisterCardBadge>
              )}
            </CabS.MinisterCardThumb>
            <CabS.MinisterCardInfo>
              <CabS.MinisterCardName>{mName}</CabS.MinisterCardName>
              <CabS.MinisterCardPos>{mPos}</CabS.MinisterCardPos>
              <CabS.MinisterCardRange>
                {mStartFull} – {mEndFull}
                {mDuration && (
                  <CabS.CabMinisterCardDurationHint>
                    ({mDuration})
                  </CabS.CabMinisterCardDurationHint>
                )}
                {mAge != null && (
                  <CabS.MinisterCardAge>취임 {mAge}세</CabS.MinisterCardAge>
                )}
              </CabS.MinisterCardRange>
            </CabS.MinisterCardInfo>
            <CabS.MinisterCardChevron>
              <FiChevronRight size={14} />
            </CabS.MinisterCardChevron>
          </CabS.MinisterCard>
        )
      })}
    </CabS.MinisterCardGrid>
  )
}
