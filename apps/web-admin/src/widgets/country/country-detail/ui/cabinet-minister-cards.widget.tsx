/**
 * 행정부 상세 — 각료 목록 카드 그리드
 *
 * - 넓은 칸(≥860px)은 두 열 — 한 열이면 18명 내각이 1,350px 세로로 늘어섰다.
 * - 진행 중인 내각에서 현직과 이미 물러난 각료가 섞이면 '현직' · '물러난 각료' 두 묶음으로 나눈다
 *   (예전엔 임명일 순 한 줄이라 바뀐 장관이 현직 사이에 끼어 있었다).
 * - '취임 NN세'는 짙은 인디고 꼬리표에서 날짜 줄의 옅은 글자로 — 행마다 가장 눈에 띄는 게 나이였다.
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

const GridContainer = styled.div`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const GroupLabel = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};

  .count {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 칸 사이 1px 선을 배경색으로 내던 원래 격자를 두 열에서도 쓰도록 — 홀수 줄 마지막 빈칸이 회색 덩어리가 되지 않게 배경은 투명, 선은 카드 그림자로 */
const MinisterGrid = styled(CabS.MinisterCardGrid)`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  background: transparent;

  @container (min-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const MinisterRow = styled(CabS.MinisterCard)`
  &,
  &:first-child,
  &:last-child {
    border-radius: 0;
  }
  box-shadow: inset 0 -1px 0
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f0f2f7')};

  @container (min-width: 860px) {
    &:nth-child(odd) {
      box-shadow:
        inset 0 -1px 0
          ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f0f2f7')},
        inset -1px 0 0
          ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f0f2f7')};
    }
  }
`

const AgeText = styled.span`
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  const todayIso = new Date().toISOString().slice(0, 10)
  const isServing = (tenure: GovernmentCabinetTenureItem) =>
    !tenure.endDate || String(tenure.endDate).slice(0, 10) >= todayIso
  const servingMinisters = ministers.filter(isServing)
  const formerMinisters = ministers.filter((tenure) => !isServing(tenure))
  const groups =
    servingMinisters.length > 0 && formerMinisters.length > 0
      ? [
          { key: 'serving', label: '현직', items: servingMinisters },
          { key: 'former', label: '물러난 각료', items: formerMinisters },
        ]
      : [{ key: 'all', label: null, items: ministers }]

  const renderCard = (tenure: GovernmentCabinetTenureItem) => {
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
          <MinisterRow
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
                {mAge != null && <AgeText>취임 {mAge}세</AgeText>}
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
          </MinisterRow>
        )
  }

  return (
    <GridContainer>
      {groups.map((group) => (
        <div key={group.key}>
          {group.label ? (
            <GroupLabel>
              {group.label}
              <span className="count">{group.items.length}명</span>
            </GroupLabel>
          ) : null}
          <MinisterGrid>{group.items.map(renderCard)}</MinisterGrid>
        </div>
      ))}
    </GridContainer>
  )
}
