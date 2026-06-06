/**
 * 배우자 상세 섹션 — 개요 탭. 혼인 기간·메모 중 하나라도 있는 배우자만 표시.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출 — 순수 표시 컴포넌트)
 */
import { FiUsers } from 'react-icons/fi'

import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { formatIsoDateKo } from './helpers'
import {
  CountMuted,
  OverviewSectionHeaderRow,
  OverviewSectionHeading,
  SpouseDetailHeader,
  SpouseDetailItem,
  SpouseDetailList,
  SpouseDetailName,
  SpouseDetailNote,
  SpouseDetailPeriod,
} from './person-detail-panel.styles'
import type { PersonDetailData } from './types'

interface SpouseDetailSectionProps {
  spouseRelations: PersonDetailData['spouseRelations']
}

export function SpouseDetailSection({
  spouseRelations,
}: SpouseDetailSectionProps) {
  const rels = (spouseRelations ?? []).filter(
    (r) => r.note || r.marriageStartDate || r.marriageEndDate,
  )
  if (rels.length === 0) return null

  return (
    <section aria-label="배우자 상세">
      <OverviewSectionHeaderRow>
        <OverviewSectionHeading>
          <FiUsers size={14} strokeWidth={2.2} />
          <span>배우자 상세</span>
          {rels.length > 1 && <CountMuted>{rels.length}</CountMuted>}
        </OverviewSectionHeading>
      </OverviewSectionHeaderRow>
      <SpouseDetailList>
        {rels.map((r, idx) => {
          const sp = r.spouse ?? null
          const name = sp ? getPersonDisplayName(sp, true) : '이름 없음'
          const start = formatIsoDateKo(r.marriageStartDate)
          const end = formatIsoDateKo(r.marriageEndDate)
          const period = [start, end].filter(Boolean).join(' ~ ')
          return (
            <SpouseDetailItem key={r.id ?? `spouse-${idx}`}>
              <SpouseDetailHeader>
                <SpouseDetailName>{name}</SpouseDetailName>
                {period && <SpouseDetailPeriod>{period}</SpouseDetailPeriod>}
              </SpouseDetailHeader>
              {r.note && <SpouseDetailNote>{r.note}</SpouseDetailNote>}
            </SpouseDetailItem>
          )
        })}
      </SpouseDetailList>
    </section>
  )
}
