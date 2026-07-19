/**
 * 배우자 상세 섹션 — 개요 탭. 혼인 기간·메모 중 하나라도 있는 배우자만 표시.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출 — 순수 표시 컴포넌트)
 */
import { FiUsers } from 'react-icons/fi'

import { MARRIAGE_RANK_LABELS } from '@/shared/lib/marriage-rank-labels'
import {
  formatPartialDateKo,
  partialDateFromResponse,
  partialDateFromStructured,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { formatPeriod } from './helpers'
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
  /** 사망자면 진행형 기간의 끝을 '현재' 대신 '미상'으로 폴백(재임·재위 규약과 통일) */
  isDeceased?: boolean
}

export function SpouseDetailSection({
  spouseRelations,
  isDeceased,
}: SpouseDetailSectionProps) {
  // 구조화 연/월/일 우선(BC·고대는 DateTime null), 레거시 행은 ISO+era+precision 폴백 —
  // 정밀도만큼만 표기해 01-01 채움이 '1월 1일'로 둔갑하지 않게 한다.
  const marriageDateLabel = (
    rel: NonNullable<PersonDetailData['spouseRelations']>[number],
    side: 'Start' | 'End',
  ): string =>
    formatPartialDateKo(
      partialDateFromStructured(
        rel[`marriage${side}Year`],
        rel[`marriage${side}Month`],
        rel[`marriage${side}Day`],
        rel[`marriage${side}Era`],
      ) ||
        partialDateFromResponse(
          rel[`marriage${side}Date`],
          rel[`marriage${side}Era`],
          rel[`marriage${side}Precision`],
        ),
    )
  const rels = (spouseRelations ?? []).filter(
    (rel) =>
      rel.note ||
      rel.marriageRank ||
      rel.marriageStartDate ||
      rel.marriageEndDate ||
      rel.marriageStartYear != null ||
      rel.marriageEndYear != null,
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
        {rels.map((rel, idx) => {
          const sp = rel.spouse ?? null
          const name = sp ? getPersonDisplayName(sp, true) : '이름 없음'
          const start = marriageDateLabel(rel, 'Start')
          const end = marriageDateLabel(rel, 'End')
          // 종료일만 있는 관계가 단독 날짜로 보이면 혼인일로 오독됨 —
          // formatPeriod가 '~ 종료일' 접두·진행형 폴백을 일괄 처리.
          const period = formatPeriod(start, end, isDeceased ? '미상' : '현재')
          const rankLabel = rel.marriageRank
            ? MARRIAGE_RANK_LABELS[rel.marriageRank] ?? rel.marriageRank
            : null
          return (
            <SpouseDetailItem key={rel.id ?? `spouse-${idx}`}>
              <SpouseDetailHeader>
                <SpouseDetailName>
                  {name}
                  {rankLabel ? ` (${rankLabel})` : ''}
                </SpouseDetailName>
                {period && <SpouseDetailPeriod>{period}</SpouseDetailPeriod>}
              </SpouseDetailHeader>
              {rel.note && <SpouseDetailNote>{rel.note}</SpouseDetailNote>}
            </SpouseDetailItem>
          )
        })}
      </SpouseDetailList>
    </section>
  )
}
