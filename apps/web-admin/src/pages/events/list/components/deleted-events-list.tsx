/**
 * 삭제된 사건 패널 — 탭이 'deleted'일 때 노출.
 * 비어있을 땐 EmptyResults, 있으면 클릭해 상세로 이동.
 */
import React from 'react'

import { useNavigate } from 'react-router-dom'

import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'

import type { HistoricalEvent } from '../../create/events.types'
import * as PageStyles from '../../styles/list-page.styles'

interface Props {
  deletedEvents: HistoricalEvent[]
}

export const DeletedEventsListPanel: React.FC<Props> = ({ deletedEvents }) => {
  const navigate = useNavigate()

  return (
    <PageStyles.DeletedEventsPanel>
      {deletedEvents.length === 0 ? (
        <PageStyles.EmptyResults>
          <PageStyles.EmptyResultsTitle>
            삭제된 사건이 없습니다
          </PageStyles.EmptyResultsTitle>
          <PageStyles.EmptyResultsHint>
            여기엔 삭제된 사건들이 표시됩니다 (관리자만 접근).
          </PageStyles.EmptyResultsHint>
        </PageStyles.EmptyResults>
      ) : (
        <PageStyles.DeletedEventsList>
          {deletedEvents.map((d) => (
            <PageStyles.DeletedEventRow
              key={d.id}
              onClick={() => navigate(pathKeys.events.detail(d.id))}
            >
              <PageStyles.DeletedEventTitle>{d.title}</PageStyles.DeletedEventTitle>
              <PageStyles.DeletedEventMeta>
                {d.startDate
                  ? (parseIsoDateParts(d.startDate)?.year ?? '?') + '년'
                  : '날짜 미정'}
                {d.category ? ` · ${d.category}` : ''}
              </PageStyles.DeletedEventMeta>
            </PageStyles.DeletedEventRow>
          ))}
        </PageStyles.DeletedEventsList>
      )}
    </PageStyles.DeletedEventsPanel>
  )
}
