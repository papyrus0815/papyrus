/**
 * 배우자 상세 섹션 — 개요 탭. 혼인 기간·메모 중 하나라도 있는 배우자만 표시.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출 — 순수 표시 컴포넌트)
 */
import { FiUsers, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { MARRIAGE_RANK_LABELS, marriageRankOrder } from '@/shared/lib/marriage-rank-labels'
import {
  formatPartialDateKo,
  partialDateFromResponse,
  partialDateFromStructured,
} from '@/shared/lib/partial-date-string'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { compareSiblings } from '@/widgets/person/person-genealogy-infographic/utils'

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
  /** 본인의 자녀 목록 — 배우자별 소생 자녀 표시 및 다중 배우자 필터링에 사용 */
  childrenList?: PersonDetailData['children']
  /** 사망자면 진행형 기간의 끝을 '현재' 대신 '미상'으로 폴백(재임·재위 규약과 통일) */
  isDeceased?: boolean
  /** 배우자·소생 자녀 이름 클릭 시 인물 모달/상세로 이동 */
  onPersonClick?: (personId: string) => void
  /** 배우자 연결 해제 핸들러(편집 권한 있을 때) */
  onUnlinkSpouse?: (spouseId: string, spouseName: string) => void
}

function getSharedChildrenForSpouse(
  spouseId: string | null | undefined,
  childrenList: PersonDetailData['children'],
) {
  if (!spouseId || !childrenList?.length) return []
  return childrenList
    .filter((child: any) => {
      const fId = child.fatherId ?? child.father?.id ?? null
      const mId = child.motherId ?? child.mother?.id ?? null
      return fId === spouseId || mId === spouseId
    })
    .slice()
    .sort(compareSiblings)
}

function signedMarriageStartYear(
  rel: NonNullable<PersonDetailData['spouseRelations']>[number],
): number {
  if (rel.marriageStartYear != null) {
    return rel.marriageStartEra === 'BC'
      ? -Math.abs(rel.marriageStartYear)
      : rel.marriageStartYear
  }
  if (rel.marriageStartDate) {
    const dt = new Date(rel.marriageStartDate)
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getUTCFullYear()
      return rel.marriageStartEra === 'BC' ? -Math.abs(y) : y
    }
  }
  return Number.POSITIVE_INFINITY
}

export function filterVisibleSpouseRelations(
  spouseRelations: PersonDetailData['spouseRelations'],
  childrenList?: PersonDetailData['children'],
) {
  const list = spouseRelations ?? []
  const hasMultipleSpouses = list.length >= 2
  return list
    .filter((rel) => {
      const hasMeta = Boolean(
        rel.note ||
          rel.marriageRank ||
          rel.marriageStartDate ||
          rel.marriageEndDate ||
          rel.marriageStartYear != null ||
          rel.marriageEndYear != null,
      )
      if (hasMeta) return true
      if (hasMultipleSpouses && rel.spouse?.id) {
        return getSharedChildrenForSpouse(rel.spouse.id, childrenList).length > 0
      }
      return false
    })
    .slice()
    .sort((a, b) => {
      const rankDiff =
        marriageRankOrder(a.marriageRank) - marriageRankOrder(b.marriageRank)
      if (rankDiff !== 0) return rankDiff
      return signedMarriageStartYear(a) - signedMarriageStartYear(b)
    })
}

export function hasVisibleSpouseDetails(
  spouseRelations: PersonDetailData['spouseRelations'],
  childrenList?: PersonDetailData['children'],
): boolean {
  return filterVisibleSpouseRelations(spouseRelations, childrenList).length > 0
}

export function SpouseDetailSection({
  spouseRelations,
  childrenList,
  isDeceased,
  onPersonClick,
  onUnlinkSpouse,
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
  const rels = filterVisibleSpouseRelations(spouseRelations, childrenList)
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
          const spouseId = sp?.id ?? null
          const name = sp ? getPersonDisplayName(sp, true) : '이름 없음'
          const start = marriageDateLabel(rel, 'Start')
          const end = marriageDateLabel(rel, 'End')
          // 종료일만 있는 관계가 단독 날짜로 보이면 혼인일로 오독됨 —
          // formatPeriod가 '~ 종료일' 접두·진행형 폴백을 일괄 처리.
          const period = formatPeriod(start, end, isDeceased ? '미상' : '현재')
          const rankLabel = rel.marriageRank
            ? MARRIAGE_RANK_LABELS[rel.marriageRank] ?? rel.marriageRank
            : null
          const interactive = Boolean(spouseId && onPersonClick)
          const sharedChildren = getSharedChildrenForSpouse(spouseId, childrenList)
          return (
            <SpouseDetailItem key={rel.id ?? `spouse-${idx}`}>
              <SpouseDetailHeader>
                <SpouseDetailName
                  as={interactive ? 'button' : 'span'}
                  {...(interactive
                    ? {
                        type: 'button' as const,
                        onClick: () => onPersonClick?.(spouseId!),
                      }
                    : {})}
                >
                  {name}
                  {rankLabel ? ` (${rankLabel})` : ''}
                </SpouseDetailName>
                <SpouseHeaderRight>
                  {period && <SpouseDetailPeriod>{period}</SpouseDetailPeriod>}
                  {onUnlinkSpouse && spouseId && (
                    <SpouseUnlinkBtn
                      type="button"
                      title={`${name} 배우자 연결 해제`}
                      aria-label={`${name} 배우자 연결 해제`}
                      onClick={() => onUnlinkSpouse(spouseId, name)}
                    >
                      <FiX size={12} strokeWidth={2.2} />
                      <span>해제</span>
                    </SpouseUnlinkBtn>
                  )}
                </SpouseHeaderRight>
              </SpouseDetailHeader>
              {rel.note && <SpouseDetailNote>{rel.note}</SpouseDetailNote>}
              {sharedChildren.length > 0 && (
                <SpouseChildrenRow>
                  <SpouseChildrenLabel>
                    소생 자녀 ({sharedChildren.length}명)
                  </SpouseChildrenLabel>
                  <SpouseChildrenChips>
                    {sharedChildren.map((child: any, cIdx: number) => {
                      const cId = child.id as string | undefined
                      const cName = getPersonDisplayName(child, true)
                      const cClickable = Boolean(cId && onPersonClick)
                      return (
                        <SpouseChildChip
                          key={cId ?? `sc-${cIdx}`}
                          type="button"
                          disabled={!cClickable}
                          onClick={() => cId && onPersonClick?.(cId)}
                        >
                          {cName}
                        </SpouseChildChip>
                      )
                    })}
                  </SpouseChildrenChips>
                </SpouseChildrenRow>
              )}
            </SpouseDetailItem>
          )
        })}
      </SpouseDetailList>
    </section>
  )
}

const SpouseHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const SpouseUnlinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.2)'};
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(254, 226, 226, 0.7)'};
  }
`

const SpouseChildrenRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-top: 6px;
`

const SpouseChildrenLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpouseChildrenChips = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
`

const SpouseChildChip = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'};
  }

  &:disabled {
    cursor: default;
  }
`
