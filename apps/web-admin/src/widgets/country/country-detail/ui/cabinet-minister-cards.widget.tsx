/**
 * 행정부 상세 — 각료 목록 카드 그리드
 */
import React from 'react'

import { FiArrowUpRight, FiChevronRight, FiEdit2, FiUser } from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import type { GovernmentCabinetTenureItem } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { calcAgeAtTenure } from '@/shared/lib/tenure-person-utils'

import {
  calcTenureDuration,
  formatDate,
  getPersonName,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

const DeptJumpChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  margin-right: 4px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  transition: all 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CardActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const CardEditButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0.75;
  transition: all 0.14s ease;

  &:hover {
    opacity: 1;
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export type CabinetMinisterCardsProps = {
  selectedMinisterId: string | null
  /** 각료 재임 목록 */
  ministers: GovernmentCabinetTenureItem[]
  onSelectMinister: (tenureId: string) => void
  onMentionPerson: (personId: string) => void
  onEditMinister?: (tenure: GovernmentCabinetTenureItem) => void
  onOpenDepartmentDetail?: (departmentId: string) => void
  resolveDepartment?: (
    tenure: GovernmentCabinetTenureItem,
  ) => { id: string; name: string } | null
}

export function CabinetMinisterCards({
  selectedMinisterId,
  ministers,
  onSelectMinister,
  onMentionPerson,
  onEditMinister,
  onOpenDepartmentDetail,
  resolveDepartment,
}: CabinetMinisterCardsProps) {
  return (
    <CabS.MinisterCardGrid>
      {ministers.map((tenure) => {
        const rawThumb = tenure.person?.profileImageUrl ?? null
        const mThumb = rawThumb ? getUploadImageUrl(rawThumb) || rawThumb : null
        const mName = getPersonName(tenure.person)
        const mPos = tenure.title ?? tenure.positionDefinition?.title ?? '—'
        const mStartFull = tenure.startDate ? formatDate(tenure.startDate) : '—'
        const mEndFull = tenure.endDate ? formatDate(tenure.endDate) : '현재'
        const mDuration = calcTenureDuration(tenure.startDate, tenure.endDate)
        const mAge = calcAgeAtTenure(tenure.person, tenure.startDate)
        const mAchCount = Array.isArray(tenure.achievements)
          ? tenure.achievements.length
          : 0
        const matchedDept =
          (tenure.administrationDepartment?.id &&
          tenure.administrationDepartment?.name
            ? {
                id: tenure.administrationDepartment.id,
                name: tenure.administrationDepartment.name,
              }
            : null) ?? resolveDepartment?.(tenure) ?? null

        return (
          <CabS.MinisterCard
            key={tenure.id}
            $selected={selectedMinisterId === tenure.id}
            onClick={() => {
              onSelectMinister(tenure.id)
            }}
          >
            <CabS.MinisterCardThumb
              onClick={(clickEvent) => {
                if (tenure.person?.id) {
                  clickEvent.stopPropagation()
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
              <CabS.MinisterCardPos>
                {matchedDept && onOpenDepartmentDetail ? (
                  <DeptJumpChip
                    type="button"
                    title={`${matchedDept.name} 중앙부처 상세로 이동`}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation()
                      onOpenDepartmentDetail(matchedDept.id)
                    }}
                  >
                    {matchedDept.name}
                    <FiArrowUpRight size={10} />
                  </DeptJumpChip>
                ) : matchedDept ? (
                  `${matchedDept.name} · `
                ) : null}
                {mPos}
                {tenure.rankTitle ? ` (${tenure.rankTitle})` : ''}
                {tenure.party?.name
                  ? ` · ${tenure.party.shortName || tenure.party.name}`
                  : ''}
              </CabS.MinisterCardPos>
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
            <CardActionGroup>
              {onEditMinister && (
                <CardEditButton
                  type="button"
                  title="각료 임명 정보 수정"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    onEditMinister(tenure)
                  }}
                >
                  <FiEdit2 size={12} />
                </CardEditButton>
              )}
              <CabS.MinisterCardChevron>
                <FiChevronRight size={14} />
              </CabS.MinisterCardChevron>
            </CardActionGroup>
          </CabS.MinisterCard>
        )
      })}
    </CabS.MinisterCardGrid>
  )
}
