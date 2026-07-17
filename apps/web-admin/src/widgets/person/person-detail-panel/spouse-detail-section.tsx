/**
 * 배우자 상세 섹션 — 개요 탭. 혼인 기간·메모 중 하나라도 있는 배우자만 표시.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출 — 순수 표시 컴포넌트)
 */
import { FiUsers } from 'react-icons/fi'

import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { formatIsoDateKo, formatPeriod } from './helpers'
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
          // 종료일만 있는 관계가 단독 날짜로 보이면 혼인일로 오독됨 —
          // formatPeriod가 '~ 종료일' 접두·진행형 폴백을 일괄 처리.
          const period = formatPeriod(start, end, isDeceased ? '미상' : '현재')
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
