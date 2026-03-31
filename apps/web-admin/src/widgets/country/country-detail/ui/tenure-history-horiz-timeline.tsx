import React, { memo, useMemo } from 'react'

import { FiChevronRight, FiLink2 } from 'react-icons/fi'

import type {
  CabinetListItemDto,
  GovernmentTenureAchievementItem,
} from '@/shared/api/person-career'

import { LinkedCabinetPeersRow } from './cabinet-linked-peers-panel.widget'
import {
  compareTenureAchievementsChronological,
  formatDate,
  getTenureAchievementDisplayBody,
  isLinkagePeerAchievement,
  stripHtmlToPlain,
  tenureAchievementPrimaryYearLabel,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

function tenureAchievementCardAriaLabel(
  achievement: GovernmentTenureAchievementItem,
  contextTenureId: string,
): string {
  const title = achievement.event?.title ?? achievement.title ?? '재임 기록'
  const y = tenureAchievementPrimaryYearLabel(achievement.startDate)
  const start = achievement.startDate
    ? formatDate(achievement.startDate)
    : '시작일 없음'
  const end = achievement.endDate ? formatDate(achievement.endDate) : '현재'
  const peer =
    isLinkagePeerAchievement(achievement, contextTenureId) ? ' 묶음 연동.' : ''
  return `${title}. ${y}. ${start}부터 ${end}까지.${peer} 상세 열기`
}

const TenureHistoryHorizAchievementColumn = memo(
  function TenureHistoryHorizAchievementColumn({
    achievement,
    contextTenureId,
    onSelectAchievement,
    showPeersRow,
    linkedCabinets,
    loadingLinkedCabinets,
  }: {
    achievement: GovernmentTenureAchievementItem
    contextTenureId: string
    onSelectAchievement: (id: string) => void
    showPeersRow: boolean
    linkedCabinets: CabinetListItemDto[]
    loadingLinkedCabinets: boolean
  }) {
    const cardBody = useMemo(
      () => getTenureAchievementDisplayBody(achievement),
      [achievement],
    )
    const excerpt = useMemo(
      () => (cardBody.trim() ? stripHtmlToPlain(cardBody, 140) : ''),
      [cardBody],
    )
    const linkagePeer = isLinkagePeerAchievement(
      achievement,
      contextTenureId,
    )

    return (
      <CabS.TenureHistoryHorizCol id={`cabinet-tenure-ach-${achievement.id}`}>
        <CabS.TenureHistoryHorizCard
          $linkagePeer={linkagePeer}
          role="button"
          tabIndex={0}
          aria-label={tenureAchievementCardAriaLabel(
            achievement,
            contextTenureId,
          )}
          onClick={() => onSelectAchievement(achievement.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectAchievement(achievement.id)
            }
          }}
        >
          <CabS.TenureHistoryInfographicCardBody>
            <CabS.TenureHistoryInfographicCardMain>
              {linkagePeer ? (
                <CabS.TenureHistoryLinkagePeerBadge>
                  <FiLink2 size={11} strokeWidth={2.5} aria-hidden />
                  묶음 연동
                </CabS.TenureHistoryLinkagePeerBadge>
              ) : null}
              <CabS.TenureHistoryDateStrip>
                <CabS.TenureHistoryYearBadge>
                  {tenureAchievementPrimaryYearLabel(achievement.startDate)}
                </CabS.TenureHistoryYearBadge>
                {(achievement.startDate || achievement.endDate) && (
                  <CabS.TenureHistoryDateRange>
                    {achievement.startDate
                      ? formatDate(achievement.startDate)
                      : '—'}
                    {' · '}
                    {achievement.endDate
                      ? formatDate(achievement.endDate)
                      : '현재'}
                  </CabS.TenureHistoryDateRange>
                )}
              </CabS.TenureHistoryDateStrip>
              <CabS.TenureHistoryInfographicTitle>
                {achievement.event?.title ?? achievement.title}
              </CabS.TenureHistoryInfographicTitle>
              {excerpt ? (
                <CabS.TenureHistoryInfographicExcerpt>
                  {excerpt}
                </CabS.TenureHistoryInfographicExcerpt>
              ) : null}
              {showPeersRow ? (
                <CabS.TenureHistoryTimelinePeersSlot>
                  <LinkedCabinetPeersRow
                    variant="card"
                    linkedCabinets={linkedCabinets}
                    loading={loadingLinkedCabinets}
                  />
                </CabS.TenureHistoryTimelinePeersSlot>
              ) : null}
            </CabS.TenureHistoryInfographicCardMain>
          </CabS.TenureHistoryInfographicCardBody>
          <CabS.TenureHistoryInfographicChevron aria-hidden>
            <FiChevronRight size={14} />
          </CabS.TenureHistoryInfographicChevron>
        </CabS.TenureHistoryHorizCard>
        <CabS.TenureHistoryHorizConnector aria-hidden />
        <CabS.TenureHistoryHorizSpineCell aria-hidden>
          <CabS.TenureHistoryHorizNode />
        </CabS.TenureHistoryHorizSpineCell>
      </CabS.TenureHistoryHorizCol>
    )
  },
)

export function TenureHistoryHorizTimeline({
  achievements,
  contextTenureId,
  onSelectAchievement,
  showPeersRow,
  linkedCabinets,
  loadingLinkedCabinets,
}: {
  achievements: GovernmentTenureAchievementItem[]
  /** 현재 보고 있는 재임(수반/각료) ID — 다른 재임에서 끌어온 병합 항목에 묶음 표시 */
  contextTenureId: string
  onSelectAchievement: (id: string) => void
  showPeersRow: boolean
  linkedCabinets: CabinetListItemDto[]
  loadingLinkedCabinets: boolean
}) {
  const sorted = useMemo(
    () => [...achievements].sort(compareTenureAchievementsChronological),
    [achievements],
  )

  return (
    <CabS.TenureHistoryTimelineShell>
      <CabS.TenureHistoryTimelineKicker>
        주요 사건 · 시간순 (왼쪽 → 오른쪽)
      </CabS.TenureHistoryTimelineKicker>
      <CabS.TenureHistoryHorizScroll>
        <CabS.TenureHistoryHorizTrack>
          {sorted.map((achievement) => (
            <TenureHistoryHorizAchievementColumn
              key={achievement.id}
              achievement={achievement}
              contextTenureId={contextTenureId}
              onSelectAchievement={onSelectAchievement}
              showPeersRow={showPeersRow}
              linkedCabinets={linkedCabinets}
              loadingLinkedCabinets={loadingLinkedCabinets}
            />
          ))}
        </CabS.TenureHistoryHorizTrack>
      </CabS.TenureHistoryHorizScroll>
    </CabS.TenureHistoryTimelineShell>
  )
}
