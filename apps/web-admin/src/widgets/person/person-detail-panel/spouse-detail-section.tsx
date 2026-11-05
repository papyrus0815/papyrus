/**
 * 배우자 상세 섹션 — 개요 탭.
 * - 혼인 기간·메모·서열·다배우자 소생 자녀 표시
 * - 추정 배우자(자녀 FK 기반) 노출 및 1-Click 정식 배우자 승격 (D1)
 * - 기등록 자녀의 출생 서열(birthOrder) 및 반대편 부모(생모·생부) 인라인 빠른 정리 (D2)
 */
import { FiCheck, FiUsers, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  MARRIAGE_END_REASON_LABELS,
  MARRIAGE_END_REASON_OPTIONS,
  MARRIAGE_RANK_LABELS,
  MARRIAGE_RANK_OPTIONS,
  marriageRankOrder,
  resolvePerspectiveMarriageRankLabel,
  type MarriageEndReasonToken,
  type MarriageRankToken,
} from '@/shared/lib/marriage-rank-labels'
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

export interface InferredSpouseSummary {
  id: string
  name: string
  gender?: string | null
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  country?: { defaultNameDisplayOrder?: string | null } | null
}

interface SpouseDetailSectionProps {
  spouseRelations: PersonDetailData['spouseRelations']
  /** 본인의 자녀 목록 — 배우자별 소생 자녀 표시 및 다중 배우자 필터링에 사용 */
  childrenList?: PersonDetailData['children']
  /** BFS 가계도에서 자녀의 반대편 부모로 발견된 추정 배우자 목록 */
  inferredSpouses?: InferredSpouseSummary[]
  /** 본인 ID (자녀의 반대편 부모 판별용) */
  egoId?: string
  /** 본인 성별 (관점 인식 서열 라벨 및 반대편 부모 성별 필터링용) */
  egoGender?: string | null
  /** 사망자면 진행형 기간의 끝을 '현재' 대신 '미상'으로 폴백(재임·재위 규약과 통일) */
  isDeceased?: boolean
  /** 배우자·소생 자녀 이름 클릭 시 인물 모달/상세로 이동 */
  onPersonClick?: (personId: string) => void
  /** 배우자 연결 해제 핸들러(편집 권한 있을 때) */
  onUnlinkSpouse?: (spouseId: string, spouseName: string) => void
  /** 기등록 배우자의 혼인 서열 1-Click 변경 핸들러 */
  onChangeSpouseRank?: (spouseId: string, rank: MarriageRankToken | null) => void
  /** 기등록 배우자의 혼인 종료 사유(사별·이혼·폐위 등) 1-Click 변경 핸들러 */
  onChangeSpouseEndReason?: (spouseId: string, reason: MarriageEndReasonToken | null) => void
  /** 추정 배우자를 정식 배우자(PersonSpouse)로 1-Click 승격 등록하는 핸들러 */
  onPromoteInferredSpouse?: (spouseId: string, rank: MarriageRankToken | null) => void
  /** 자녀의 출생 서열(birthOrder), 성별 서열(genderBirthOrder), 반대편 부모(생모·생부) 인라인 빠른 수정 핸들러 */
  onQuickUpdateChild?: (
    childId: string,
    patch: {
      birthOrder?: number | null
      genderBirthOrder?: number | null
      otherParentId?: string | null
    },
  ) => void
}

function compareChildOrder(a: any, b: any): number {
  const ao = a?.birthOrder
  const bo = b?.birthOrder
  if (ao != null && bo != null && ao !== bo) return ao - bo

  const ag = (a?.gender ?? '').toUpperCase()
  const bg = (b?.gender ?? '').toUpperCase()
  const ago = a?.genderBirthOrder
  const bgo = b?.genderBirthOrder
  if (
    ag &&
    ag === bg &&
    (ag === 'MALE' || ag === 'FEMALE') &&
    ago != null &&
    bgo != null &&
    ago !== bgo
  ) {
    return ago - bgo
  }

  const signedBirthYear = (p: any): number => {
    const rawYear =
      p?.birthYear ??
      (p?.birthDate ? new Date(p.birthDate).getUTCFullYear() : null)
    if (rawYear == null || Number.isNaN(rawYear)) return Number.POSITIVE_INFINITY
    return p?.birthEra === 'BC' ? -Math.abs(rawYear) : rawYear
  }
  const ay = signedBirthYear(a)
  const by = signedBirthYear(b)
  if (ay !== by) return ay - by

  const aoFallback = ao ?? Number.POSITIVE_INFINITY
  const boFallback = bo ?? Number.POSITIVE_INFINITY
  if (aoFallback !== boFallback) return aoFallback - boFallback

  const signedFloruit = (p: any): number => {
    if (p?.floruitStartYear == null) return Number.POSITIVE_INFINITY
    return p?.floruitEra === 'BC'
      ? -Math.abs(p.floruitStartYear)
      : p.floruitStartYear
  }
  const af = signedFloruit(a)
  const bf = signedFloruit(b)
  if (af !== bf) return af - bf

  const agoFallback = ago ?? Number.POSITIVE_INFINITY
  const bgoFallback = bgo ?? Number.POSITIVE_INFINITY
  if (agoFallback !== bgoFallback) return agoFallback - bgoFallback

  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
}

function getSharedChildrenForSpouse(
  spouseId: string | null | undefined,
  childrenList: PersonDetailData['children'],
  egoId?: string | null,
) {
  if (!spouseId || !childrenList?.length) return []
  return childrenList
    .filter((child: any) => {
      const fId = child.fatherId ?? child.father?.id ?? null
      const mId = child.motherId ?? child.mother?.id ?? null
      const afId = child.adoptiveFatherId ?? child.adoptiveFather?.id ?? null
      const amId = child.adoptiveMotherId ?? child.adoptiveMother?.id ?? null
      if (egoId) {
        const isEgoBio = fId === egoId || mId === egoId
        const isEgoAdoptive = afId === egoId || amId === egoId || Boolean(child.isAdopted)
        if (isEgoBio && !isEgoAdoptive) {
          return fId === spouseId || mId === spouseId
        }
        if (isEgoAdoptive && !isEgoBio) {
          return afId === spouseId || amId === spouseId
        }
      }
      return fId === spouseId || mId === spouseId || afId === spouseId || amId === spouseId
    })
    .slice()
    .sort(compareChildOrder)
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
  opts?: { includeAll?: boolean; egoId?: string | null },
) {
  const list = spouseRelations ?? []
  const hasMultipleSpouses = list.length >= 2
  return list
    .filter((rel) => {
      if (opts?.includeAll || hasMultipleSpouses) return true
      const hasMeta = Boolean(
        rel.note ||
          rel.marriageRank ||
          rel.marriageEndReason ||
          rel.marriageStartDate ||
          rel.marriageEndDate ||
          rel.marriageStartYear != null ||
          rel.marriageEndYear != null,
      )
      if (hasMeta) return true
      if (rel.spouse?.id) {
        return getSharedChildrenForSpouse(rel.spouse.id, childrenList, opts?.egoId).length > 0
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
  egoId?: string | null,
): boolean {
  return filterVisibleSpouseRelations(spouseRelations, childrenList, { egoId }).length > 0
}

export function SpouseDetailSection({
  spouseRelations,
  childrenList,
  inferredSpouses,
  egoId,
  egoGender,
  isDeceased,
  onPersonClick,
  onUnlinkSpouse,
  onChangeSpouseRank,
  onChangeSpouseEndReason,
  onPromoteInferredSpouse,
  onQuickUpdateChild,
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

  const explicitIds = new Set(
    (spouseRelations ?? []).map((r) => r.spouse?.id).filter(Boolean) as string[],
  )
  const pendingInferred = (inferredSpouses ?? []).filter(
    (sp) => sp.id && !explicitIds.has(sp.id),
  )

  const isEditable = Boolean(
    onChangeSpouseRank || onChangeSpouseEndReason || onUnlinkSpouse,
  )
  const rels = filterVisibleSpouseRelations(spouseRelations, childrenList, {
    includeAll: isEditable,
    egoId,
  })
  const sortedChildren = (childrenList ?? []).slice().sort(compareChildOrder)
  const showQuickChildEditor = Boolean(onQuickUpdateChild && sortedChildren.length > 0)

  if (rels.length === 0 && pendingInferred.length === 0 && !showQuickChildEditor) {
    return null
  }

  // 자녀의 반대편 부모 후보 옵션 (명시 배우자 + 추정 배우자 + 자녀에 이미 지정된 공동 부모)
  const allSpouseOptions: Array<{ id: string; label: string; gender?: string | null }> = []
  const seenOptionIds = new Set<string>()
  for (const rel of spouseRelations ?? []) {
    const sp = rel.spouse
    if (!sp?.id || seenOptionIds.has(sp.id)) continue
    seenOptionIds.add(sp.id)
    const nm = getPersonDisplayName(sp, true)
    const rk = resolvePerspectiveMarriageRankLabel({
      marriageRank: rel.marriageRank,
      rankHolderId: rel.rankHolderId,
      viewerPersonId: egoId,
      viewerGender: egoGender,
      spouseId: sp.id,
      spouseGender: sp.gender,
    })
    allSpouseOptions.push({
      id: sp.id,
      label: rk ? `${nm} (${rk})` : nm,
      gender: sp.gender ?? null,
    })
  }
  for (const inf of pendingInferred) {
    if (!inf.id || seenOptionIds.has(inf.id)) continue
    seenOptionIds.add(inf.id)
    const nm = getPersonDisplayName(inf, true)
    allSpouseOptions.push({
      id: inf.id,
      label: `${nm} (추정)`,
      gender: inf.gender ?? null,
    })
  }
  for (const ch of childrenList ?? []) {
    const fId = ch.fatherId ?? ch.father?.id ?? null
    const mId = ch.motherId ?? ch.mother?.id ?? null
    const afId = ch.adoptiveFatherId ?? null
    const amId = ch.adoptiveMotherId ?? null
    const isAdoptedToEgo = Boolean(
      egoId && (afId === egoId || amId === egoId) && fId !== egoId && mId !== egoId,
    )
    const pairs: Array<[string | null, string | null | undefined, string]> = isAdoptedToEgo
      ? [
          [afId, ch.adoptiveFatherName, 'MALE'],
          [amId, ch.adoptiveMotherName, 'FEMALE'],
        ]
      : [
          [
            fId,
            ch.fatherName ?? (ch.father ? getPersonDisplayName(ch.father, true) : null),
            'MALE',
          ],
          [
            mId,
            ch.motherName ?? (ch.mother ? getPersonDisplayName(ch.mother, true) : null),
            'FEMALE',
          ],
        ]
    for (const [pid, pName, expectedGender] of pairs) {
      if (!pid || pid === egoId || seenOptionIds.has(pid)) continue
      seenOptionIds.add(pid)
      allSpouseOptions.push({
        id: pid,
        label: `${pName || pid} (공동 부모)`,
        gender: expectedGender,
      })
    }
  }

  const totalSpouseDisplayCount = rels.length + pendingInferred.length

  return (
    <section aria-label="배우자 상세">
      {totalSpouseDisplayCount > 0 && (
        <>
          <OverviewSectionHeaderRow>
            <OverviewSectionHeading>
              <FiUsers size={14} strokeWidth={2.2} />
              <span>배우자 상세</span>
              {totalSpouseDisplayCount > 1 && (
                <CountMuted>{totalSpouseDisplayCount}</CountMuted>
              )}
            </OverviewSectionHeading>
          </OverviewSectionHeaderRow>
          <SpouseDetailList>
            {rels.map((rel, idx) => {
              const sp = rel.spouse ?? null
              const spouseId = sp?.id ?? null
              const name = sp ? getPersonDisplayName(sp, true) : '이름 없음'
              const start = marriageDateLabel(rel, 'Start')
              const end = marriageDateLabel(rel, 'End')
              const endReasonLabel = rel.marriageEndReason
                ? MARRIAGE_END_REASON_LABELS[rel.marriageEndReason] ?? rel.marriageEndReason
                : null
              const rawPeriod = formatPeriod(start, end, isDeceased ? '미상' : '현재')
              const period =
                rawPeriod && endReasonLabel
                  ? `${rawPeriod} (${endReasonLabel})`
                  : rawPeriod || (endReasonLabel ? `혼인 종료: ${endReasonLabel}` : '')
              const rankLabel = resolvePerspectiveMarriageRankLabel({
                marriageRank: rel.marriageRank,
                rankHolderId: rel.rankHolderId,
                viewerPersonId: egoId,
                viewerGender: egoGender,
                spouseId,
                spouseGender: sp?.gender ?? null,
              })
              const interactive = Boolean(spouseId && onPersonClick)
              const sharedChildren = getSharedChildrenForSpouse(spouseId, childrenList, egoId)
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
                      {onChangeSpouseRank && spouseId && (
                        <SpouseRankSelect
                          aria-label={`${name} 혼인 서열 변경`}
                          value={rel.marriageRank ?? ''}
                          onChange={(e) => {
                            const val = (e.target.value || null) as MarriageRankToken | null
                            onChangeSpouseRank(spouseId, val)
                          }}
                        >
                          <option value="">서열 미지정</option>
                          {MARRIAGE_RANK_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </SpouseRankSelect>
                      )}
                      {onChangeSpouseEndReason && spouseId && (
                        <SpouseRankSelect
                          aria-label={`${name} 혼인 종료 사유 변경`}
                          value={rel.marriageEndReason ?? ''}
                          onChange={(e) => {
                            const val = (e.target.value || null) as MarriageEndReasonToken | null
                            onChangeSpouseEndReason(spouseId, val)
                          }}
                        >
                          <option value="">종료 사유 미지정</option>
                          {MARRIAGE_END_REASON_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </SpouseRankSelect>
                      )}
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
                          const isAdopted = Boolean(
                            child.isAdopted ??
                              (egoId &&
                                (child.adoptiveFatherId === egoId ||
                                  child.adoptiveMotherId === egoId) &&
                                child.fatherId !== egoId &&
                                child.motherId !== egoId),
                          )
                          const bioParentLabel =
                            isAdopted && (child.fatherName || child.motherName)
                              ? ` (양자·${child.fatherName ?? child.motherName} 소생)`
                              : isAdopted
                                ? ' (입양)'
                                : ''
                          return (
                            <SpouseChildChip
                              key={cId ?? `sc-${cIdx}`}
                              type="button"
                              disabled={!cClickable}
                              onClick={() => cId && onPersonClick?.(cId)}
                            >
                              {cName}
                              {bioParentLabel}
                            </SpouseChildChip>
                          )
                        })}
                      </SpouseChildrenChips>
                    </SpouseChildrenRow>
                  )}
                </SpouseDetailItem>
              )
            })}

            {/* D1: 추정 배우자(자녀 기록 기반) 노출 및 1-Click 정식 배우자 승격 */}
            {pendingInferred.map((inf) => {
              const name = getPersonDisplayName(inf, true)
              const interactive = Boolean(inf.id && onPersonClick)
              const sharedChildren = getSharedChildrenForSpouse(inf.id, childrenList, egoId)
              const egoIsFemaleWithMalePartner =
                (egoGender ?? '').toUpperCase() === 'FEMALE' &&
                (inf.gender ?? '').toUpperCase() !== 'FEMALE'
              return (
                <SpouseDetailItem key={`inferred-${inf.id}`}>
                  <SpouseDetailHeader>
                    <SpouseNameGroup>
                      <SpouseDetailName
                        as={interactive ? 'button' : 'span'}
                        {...(interactive
                          ? {
                              type: 'button' as const,
                              onClick: () => onPersonClick?.(inf.id),
                            }
                          : {})}
                      >
                        {name}
                      </SpouseDetailName>
                      <InferredSpouseBadge>추정 (자녀 기록 기반)</InferredSpouseBadge>
                    </SpouseNameGroup>
                    {onPromoteInferredSpouse && (
                      <SpouseHeaderRight>
                        <PromoteSpouseBtn
                          type="button"
                          onClick={() => onPromoteInferredSpouse(inf.id, 'PRIMARY')}
                          title={
                            egoIsFemaleWithMalePartner
                              ? `${name}과(와) 정실(본처) 혼인으로 정식 등록`
                              : `${name}을(를) 정실 배우자로 정식 등록`
                          }
                        >
                          <FiCheck size={11} />
                          <span>
                            {egoIsFemaleWithMalePartner ? '정실(본처)로 등록' : '정실 등록'}
                          </span>
                        </PromoteSpouseBtn>
                        <PromoteSpouseBtn
                          type="button"
                          onClick={() => onPromoteInferredSpouse(inf.id, 'CONCUBINE')}
                          title={
                            egoIsFemaleWithMalePartner
                              ? `${name}과(와) 후궁·측실 혼인으로 정식 등록`
                              : `${name}을(를) 후궁·첩으로 정식 등록`
                          }
                        >
                          <FiCheck size={11} />
                          <span>
                            {egoIsFemaleWithMalePartner ? '후궁·측실로 등록' : '후궁 등록'}
                          </span>
                        </PromoteSpouseBtn>
                        <PromoteSpouseBtn
                          type="button"
                          onClick={() => onPromoteInferredSpouse(inf.id, null)}
                          title={
                            egoIsFemaleWithMalePartner
                              ? `${name}을(를) 정식 배우자(부군)로 등록`
                              : `${name}을(를) 정식 배우자로 등록`
                          }
                        >
                          <FiCheck size={11} />
                          <span>
                            {egoIsFemaleWithMalePartner ? '부군(배우자) 등록' : '배우자 등록'}
                          </span>
                        </PromoteSpouseBtn>
                      </SpouseHeaderRight>
                    )}
                  </SpouseDetailHeader>
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
                              key={cId ?? `inf-sc-${cIdx}`}
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
        </>
      )}

      {/* D2: 기등록 자녀 출생 서열(birthOrder) 및 반대편 부모(생모·생부) 빠른 인라인 정리 */}
      {showQuickChildEditor && (
        <ChildQuickEditorDetails>
          <ChildQuickEditorSummary>
            자녀 서열·소생 빠른 정리 ({sortedChildren.length}명)
          </ChildQuickEditorSummary>
          <ChildQuickEditorList>
            {sortedChildren.map((child: any, idx: number) => {
              const cId = child.id as string | undefined
              if (!cId) return null
              const cName = getPersonDisplayName(child, true)
              const fId = (child.fatherId ?? child.father?.id ?? null) as string | null
              const mId = (child.motherId ?? child.mother?.id ?? null) as string | null
              const afId = (child.adoptiveFatherId ?? child.adoptiveFather?.id ?? null) as string | null
              const amId = (child.adoptiveMotherId ?? child.adoptiveMother?.id ?? null) as string | null
              const isAdoptedChild = Boolean(
                egoId &&
                  (afId === egoId || amId === egoId) &&
                  fId !== egoId &&
                  mId !== egoId,
              )
              const otherParentId = isAdoptedChild
                ? egoId && afId === egoId
                  ? amId
                  : egoId && amId === egoId
                    ? afId
                    : amId ?? afId
                : egoId && fId === egoId
                  ? mId
                  : egoId && mId === egoId
                    ? fId
                    : mId ?? fId
              const egoUpper = (egoGender ?? '').toUpperCase()
              const targetSlot:
                | 'fatherId'
                | 'motherId'
                | 'adoptiveFatherId'
                | 'adoptiveMotherId'
                | null = isAdoptedChild
                ? egoId && afId === egoId
                  ? 'adoptiveMotherId'
                  : egoId && amId === egoId
                    ? 'adoptiveFatherId'
                    : egoUpper === 'MALE'
                      ? 'adoptiveMotherId'
                      : egoUpper === 'FEMALE'
                        ? 'adoptiveFatherId'
                        : null
                : egoId && fId === egoId
                  ? 'motherId'
                  : egoId && mId === egoId
                    ? 'fatherId'
                    : egoUpper === 'MALE'
                      ? 'motherId'
                      : egoUpper === 'FEMALE'
                        ? 'fatherId'
                        : null
              const crossLineageParentSet = new Set(
                (isAdoptedChild ? [fId, mId] : [afId, amId]).filter(Boolean) as string[],
              )
              const rowSpouseOptions = allSpouseOptions.filter((opt) => {
                if (opt.id === cId) return false
                if (opt.id === otherParentId) return true
                if (crossLineageParentSet.has(opt.id)) return false
                const optGender = (opt.gender ?? '').toUpperCase()
                if (
                  (targetSlot === 'motherId' || targetSlot === 'adoptiveMotherId') &&
                  optGender === 'MALE'
                ) {
                  return false
                }
                if (
                  (targetSlot === 'fatherId' || targetSlot === 'adoptiveFatherId') &&
                  optGender === 'FEMALE'
                ) {
                  return false
                }
                return true
              })
              return (
                <ChildQuickRow key={cId}>
                  <ChildQuickIndex>{idx + 1}.</ChildQuickIndex>
                  <ChildQuickNameBtn
                    type="button"
                    onClick={() => onPersonClick?.(cId)}
                  >
                    {cName}
                    {isAdoptedChild
                      ? child.fatherName || child.motherName
                        ? ` (양자·${child.fatherName ?? child.motherName} 소생)`
                        : ' (양자녀)'
                      : child.adoptiveFatherName || child.adoptiveMotherName
                        ? ` (출계·${child.adoptiveFatherName ?? child.adoptiveMotherName} 입양)`
                        : ''}
                  </ChildQuickNameBtn>
                  <ChildQuickFieldLabel>
                    <span>통합 서열</span>
                    <ChildQuickOrderInput
                      key={`birthOrder-${cId}-${child.birthOrder ?? ''}`}
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={child.birthOrder ?? ''}
                      placeholder="-"
                      aria-label={`${cName} 출생 서열`}
                      onBlur={(e) => {
                        const raw = e.target.value.trim()
                        const nextOrder = raw ? Number.parseInt(raw, 10) : null
                        const normalized =
                          nextOrder != null && Number.isInteger(nextOrder) && nextOrder >= 1
                            ? nextOrder
                            : null
                        if (normalized !== (child.birthOrder ?? null)) {
                          onQuickUpdateChild?.(cId, { birthOrder: normalized })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                    />
                  </ChildQuickFieldLabel>
                  <ChildQuickFieldLabel>
                    <span>
                      {(child.gender ?? '').toUpperCase() === 'MALE'
                        ? '몇남'
                        : (child.gender ?? '').toUpperCase() === 'FEMALE'
                          ? '몇녀'
                          : '성별 서열'}
                    </span>
                    <ChildQuickOrderInput
                      key={`genderBirthOrder-${cId}-${child.genderBirthOrder ?? ''}`}
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={child.genderBirthOrder ?? ''}
                      placeholder="-"
                      aria-label={`${cName} 성별 출생 서열`}
                      onBlur={(e) => {
                        const raw = e.target.value.trim()
                        const nextOrder = raw ? Number.parseInt(raw, 10) : null
                        const normalized =
                          nextOrder != null && Number.isInteger(nextOrder) && nextOrder >= 1
                            ? nextOrder
                            : null
                        if (normalized !== (child.genderBirthOrder ?? null)) {
                          onQuickUpdateChild?.(cId, { genderBirthOrder: normalized })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                    />
                  </ChildQuickFieldLabel>
                  {rowSpouseOptions.length > 0 && (
                    <ChildQuickFieldLabel>
                      <span>{isAdoptedChild ? '반대편 양부모' : '반대편 부모'}</span>
                      <ChildQuickParentSelect
                        aria-label={`${cName} 반대편 부모 선택`}
                        value={otherParentId ?? ''}
                        onChange={(e) => {
                          const nextParentId = e.target.value || null
                          onQuickUpdateChild?.(cId, { otherParentId: nextParentId })
                        }}
                      >
                        <option value="">미지정</option>
                        {rowSpouseOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </ChildQuickParentSelect>
                    </ChildQuickFieldLabel>
                  )}
                </ChildQuickRow>
              )
            })}
          </ChildQuickEditorList>
        </ChildQuickEditorDetails>
      )}
    </section>
  )
}

const SpouseNameGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const InferredSpouseBadge = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#64748b')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.12)'};
`

const SpouseHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
`

const SpouseRankSelect = styled.select`
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const PromoteSpouseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)'};
  color: #6366f1;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.26)' : 'rgba(99, 102, 241, 0.16)'};
  }
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

const ChildQuickEditorDetails = styled.details`
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(248, 250, 252, 0.8)'};
`

const ChildQuickEditorSummary = styled.summary`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  user-select: none;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ChildQuickEditorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
`

const ChildQuickRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 12px;
`

const ChildQuickIndex = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  min-width: 18px;
`

const ChildQuickNameBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  min-width: 80px;
  text-align: left;
  &:hover {
    color: #6366f1;
    text-decoration: underline;
  }
`

const ChildQuickFieldLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChildQuickOrderInput = styled.input`
  width: 54px;
  padding: 3px 6px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChildQuickParentSelect = styled.select`
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
`
