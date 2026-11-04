/**
 * 현대 국가 상세 > '과거 국가' 탭
 * - 무컨테이너 헤어라인 4칸 KPI 요약 바 + 분류/검색 필터 바 + 2열 과거 국가 원장 + LineageFlow 계보도 통합
 */
import { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getStateTypeLabel } from '@/entities/historical-country/lib/utils'
import {
  type HistoricalCountryMembershipDto,
  type HistoricalCountryRelationDto,
  type HistoricalCountryTransitionDto,
  type HistoricalMembershipRole,
  type HistoricalRelationType,
  type TransitionEventType,
} from '@/shared/api/historical-countries'
import { getUploadImageUrl } from '@/shared/api/upload'
import { compareByCountryStart, formatCountryPeriod } from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'

import { classifyLinkedHistorical } from '../model/linked-historical-classify'
import {
  MEMBERSHIP_ROLE_LABELS,
  RELATION_TYPE_LABELS,
  TRANSITION_EVENT_LABELS,
  TRANSITION_SCOPE_LABELS,
} from '../model/linked-historical-labels'
import { useLinkedHistoricalData } from '../model/use-linked-historical-data.hook'
import * as DashboardStyles from './country-detail-dashboard.styles'
import { ChartSkeleton } from './dashboard-panels/chart-skeleton'
import { LineageFlow } from './dashboard-panels/lineage-flow'

export interface LinkedHistoricalCountriesSectionProps {
  country: UnifiedCountry
}

type HistoricalCountryItem = NonNullable<
  NonNullable<UnifiedCountry['historicalCountries']>[number]
>

type CategoryFilterKey =
  | 'all'
  | 'PREDECESSOR'
  | 'CONSTITUENT'
  | 'HERITAGE'
  | 'withRelations'

const EMPTY_RELS: {
  transitions: HistoricalCountryTransitionDto[]
  relations: HistoricalCountryRelationDto[]
  memberships: HistoricalCountryMembershipDto[]
} = { transitions: [], relations: [], memberships: [] }

const LINK_KIND_LABEL: Record<string, string> = {
  PREDECESSOR: '직계 전신',
  CONSTITUENT: '구성 정치체',
  HERITAGE: '역사 유산',
}

function toSignedYear(
  era: string | null | undefined,
  year: number | null | undefined,
): number | null {
  if (year == null) return null
  return era === 'BC' ? -Math.abs(year) : Math.abs(year)
}

function formatSignedYearShort(signedYear: number | null): string | null {
  if (signedYear == null) return null
  return signedYear < 0 ? `BC ${Math.abs(signedYear)}년` : `${signedYear}년`
}

export function LinkedHistoricalCountriesSection({
  country,
}: LinkedHistoricalCountriesSectionProps) {
  const navigate = useNavigate()
  const rawList = country.historicalCountries ?? []
  const list = useMemo(
    () => [...rawList].sort(compareByCountryStart),
    [rawList],
  )
  const count = list.length

  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterKey>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const linkedIds = useMemo(() => list.map((item) => item.id), [list])
  const {
    transitions,
    relations,
    memberships,
    isLoading: isLinkedDataLoading,
  } = useLinkedHistoricalData(linkedIds)

  const idToCountry = useMemo(() => {
    const map = new Map<string, HistoricalCountryItem>()
    for (const item of list) {
      map.set(item.id, item)
    }
    return map
  }, [list])

  /** 국가별 변천·수평·소속 관계 집계 */
  const countryRelations = useMemo(() => {
    const map = new Map<
      string,
      {
        transitions: HistoricalCountryTransitionDto[]
        relations: HistoricalCountryRelationDto[]
        memberships: HistoricalCountryMembershipDto[]
      }
    >()
    for (const item of list) {
      map.set(item.id, { transitions: [], relations: [], memberships: [] })
    }
    for (const transition of transitions) {
      map.get(transition.predecessorId)?.transitions.push(transition)
      if (transition.successorId !== transition.predecessorId) {
        map.get(transition.successorId)?.transitions.push(transition)
      }
    }
    for (const relation of relations) {
      map.get(relation.subjectCountryId)?.relations.push(relation)
      if (relation.objectCountryId !== relation.subjectCountryId) {
        map.get(relation.objectCountryId)?.relations.push(relation)
      }
    }
    for (const membership of memberships) {
      map.get(membership.historicalCountryId)?.memberships.push(membership)
      if (membership.memberCountryId !== membership.historicalCountryId) {
        map.get(membership.memberCountryId)?.memberships.push(membership)
      }
    }
    return map
  }, [list, transitions, relations, memberships])

  /** 직계 전신 / 구성 정치체 / 역사 유산 분류 */
  const classification = useMemo(() => {
    const kindById = new Map<string, string>()
    const hasServerKind =
      list.length > 0 && list.every((item) => item.linkKind != null)
    if (hasServerKind) {
      for (const item of list) {
        kindById.set(item.id, String(item.linkKind))
      }
    } else {
      const { kindById: clientKind } = classifyLinkedHistorical({
        nodes: list.map((item) => ({
          id: item.id,
          startYear: toSignedYear(item.startEra, item.startYear),
          endYear: toSignedYear(item.endEra, item.endYear),
        })),
        transitions: transitions.map((transition) => ({
          predecessorId: transition.predecessorId,
          successorId: transition.successorId,
        })),
        memberships: memberships.map((membership) => ({
          historicalCountryId: membership.historicalCountryId,
          memberCountryId: membership.memberCountryId,
          isLeadingMember: membership.isLeadingMember,
        })),
      })
      for (const [nodeId, kind] of clientKind) {
        kindById.set(nodeId, kind)
      }
    }

    const predecessors = list.filter(
      (item) => kindById.get(item.id) === 'PREDECESSOR',
    )
    const constituents = list.filter(
      (item) => kindById.get(item.id) === 'CONSTITUENT',
    )
    const heritage = list.filter(
      (item) => kindById.get(item.id) === 'HERITAGE',
    )
    return { kindById, predecessors, constituents, heritage }
  }, [list, transitions, memberships])

  /** 통사 연도 범위 */
  const spanSummary = useMemo(() => {
    let minSigned: number | null = null
    let maxSigned: number | null = null
    for (const item of list) {
      const startSigned = toSignedYear(item.startEra, item.startYear)
      const endSigned = toSignedYear(item.endEra, item.endYear)
      if (startSigned != null) {
        minSigned =
          minSigned == null ? startSigned : Math.min(minSigned, startSigned)
        maxSigned =
          maxSigned == null ? startSigned : Math.max(maxSigned, startSigned)
      }
      if (endSigned != null) {
        minSigned =
          minSigned == null ? endSigned : Math.min(minSigned, endSigned)
        maxSigned =
          maxSigned == null ? endSigned : Math.max(maxSigned, endSigned)
      }
    }
    return {
      minLabel: formatSignedYearShort(minSigned),
      maxLabel: formatSignedYearShort(maxSigned),
      totalYears:
        minSigned != null && maxSigned != null && maxSigned >= minSigned
          ? maxSigned - minSigned
          : null,
    }
  }, [list])

  const withRelationsCount = useMemo(
    () =>
      list.filter((item) => {
        const rels = countryRelations.get(item.id) ?? EMPTY_RELS
        return (
          rels.transitions.length +
            rels.relations.length +
            rels.memberships.length >
          0
        )
      }).length,
    [list, countryRelations],
  )

  const filteredList = useMemo(() => {
    const lowered = searchQuery.trim().toLowerCase()
    return list.filter((item) => {
      const resolvedKind =
        classification.kindById.get(item.id) ?? item.linkKind ?? null
      const rels = countryRelations.get(item.id) ?? EMPTY_RELS
      const hasAnyRel =
        rels.transitions.length +
          rels.relations.length +
          rels.memberships.length >
        0

      if (
        categoryFilter === 'PREDECESSOR' ||
        categoryFilter === 'CONSTITUENT' ||
        categoryFilter === 'HERITAGE'
      ) {
        if (resolvedKind !== categoryFilter) return false
      } else if (categoryFilter === 'withRelations' && !hasAnyRel) {
        return false
      }

      if (!lowered) return true
      const stateTypeLabel = item.stateType
        ? getStateTypeLabel(item.stateType)
        : ''
      const kindLabel = resolvedKind ? (LINK_KIND_LABEL[resolvedKind] ?? '') : ''
      const searchable = [
        item.name,
        item.enName,
        stateTypeLabel,
        kindLabel,
        formatCountryPeriod(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(lowered)
    })
  }, [list, classification.kindById, countryRelations, categoryFilter, searchQuery])

  const enrichedForLineage = useMemo(
    () =>
      filteredList.map((item) => ({
        ...item,
        linkKind:
          classification.kindById.get(item.id) ?? item.linkKind ?? null,
      })),
    [filteredList, classification.kindById],
  )

  const renderRelationSummaries = (item: HistoricalCountryItem) => {
    const rels = countryRelations.get(item.id) ?? EMPTY_RELS
    const chips: Array<{ key: string; label: string; highlight?: boolean }> = []

    for (const transition of rels.transitions) {
      const isIncoming = transition.successorId === item.id
      const otherId = isIncoming
        ? transition.predecessorId
        : transition.successorId
      const otherName =
        idToCountry.get(otherId)?.name ??
        (isIncoming ? transition.predecessorName : transition.successorName) ??
        '미상'
      const eventLabel =
        TRANSITION_EVENT_LABELS[transition.eventType as TransitionEventType] ??
        transition.eventType
      const scopeText = transition.transitionScope
        ? ` · ${TRANSITION_SCOPE_LABELS[transition.transitionScope] ?? transition.transitionScope}`
        : ''
      chips.push({
        key: `tr-${transition.id}-${isIncoming ? 'in' : 'out'}`,
        label: isIncoming
          ? `전신 ← ${otherName} (${eventLabel}${scopeText})`
          : `후신 → ${otherName} (${eventLabel}${scopeText})`,
        highlight: true,
      })
    }

    for (const membership of rels.memberships) {
      const isParent = membership.historicalCountryId === item.id
      const otherName = isParent
        ? (idToCountry.get(membership.memberCountryId)?.name ??
          membership.memberName)
        : (idToCountry.get(membership.historicalCountryId)?.name ??
          membership.parentName)
      const roleLabel =
        MEMBERSHIP_ROLE_LABELS[membership.role as HistoricalMembershipRole] ??
        membership.role
      const leaderSuffix = membership.isLeadingMember ? '·주축' : ''
      chips.push({
        key: `mem-${membership.id}-${isParent ? 'parent' : 'member'}`,
        label: isParent
          ? `하위포함 ⊃ ${otherName ?? '미상'} (${roleLabel}${leaderSuffix})`
          : `상위소속 ⊂ ${otherName ?? '미상'} (${roleLabel}${leaderSuffix})`,
      })
    }

    for (const relation of rels.relations) {
      const isSubject = relation.subjectCountryId === item.id
      const otherId = isSubject
        ? relation.objectCountryId
        : relation.subjectCountryId
      const otherName =
        idToCountry.get(otherId)?.name ??
        (isSubject ? relation.objectCountryName : relation.subjectCountryName) ??
        '미상'
      const relLabel =
        RELATION_TYPE_LABELS[relation.relationType as HistoricalRelationType] ??
        relation.relationType
      chips.push({
        key: `rel-${relation.id}`,
        label: `${relLabel}: ${otherName}`,
      })
    }

    return chips
  }

  const filterBarNode = (
    <FilterChipGroup role="tablist" aria-label="과거 국가 계보 분류 필터">
      <FilterChip
        type="button"
        role="tab"
        aria-selected={categoryFilter === 'all'}
        $active={categoryFilter === 'all'}
        onClick={() => setCategoryFilter('all')}
      >
        전체 <FilterChipCount>{count}</FilterChipCount>
      </FilterChip>
      <FilterChip
        type="button"
        role="tab"
        aria-selected={categoryFilter === 'PREDECESSOR'}
        $active={categoryFilter === 'PREDECESSOR'}
        onClick={() => setCategoryFilter('PREDECESSOR')}
      >
        직계 전신{' '}
        <FilterChipCount>{classification.predecessors.length}</FilterChipCount>
      </FilterChip>
      {classification.constituents.length > 0 && (
        <FilterChip
          type="button"
          role="tab"
          aria-selected={categoryFilter === 'CONSTITUENT'}
          $active={categoryFilter === 'CONSTITUENT'}
          onClick={() => setCategoryFilter('CONSTITUENT')}
        >
          구성 정치체{' '}
          <FilterChipCount>{classification.constituents.length}</FilterChipCount>
        </FilterChip>
      )}
      {classification.heritage.length > 0 && (
        <FilterChip
          type="button"
          role="tab"
          aria-selected={categoryFilter === 'HERITAGE'}
          $active={categoryFilter === 'HERITAGE'}
          onClick={() => setCategoryFilter('HERITAGE')}
        >
          역사 유산{' '}
          <FilterChipCount>{classification.heritage.length}</FilterChipCount>
        </FilterChip>
      )}
      {withRelationsCount > 0 && (
        <FilterChip
          type="button"
          role="tab"
          aria-selected={categoryFilter === 'withRelations'}
          $active={categoryFilter === 'withRelations'}
          onClick={() => setCategoryFilter('withRelations')}
        >
          관계 보유 <FilterChipCount>{withRelationsCount}</FilterChipCount>
        </FilterChip>
      )}
    </FilterChipGroup>
  )

  return (
    <DashboardStyles.DashboardRoot>
      <SectionWrap>
        <HeadRow>
          <HeadText>
            <Title>과거 국가 · 역사 계보</Title>
            <Description>
              {country.name}에 연결된 역사적 국가의 직계 전신·구성 정치체·유산 분류와 변천·소속·수평 외교 관계를 원장 및 흐름도로 확인합니다.
            </Description>
          </HeadText>

          <ModeSwitchGroup role="tablist" aria-label="과거 국가 보기 방식">
            <ModeSwitchBtn
              type="button"
              role="tab"
              aria-selected={viewMode === 'list'}
              $active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              2열 원장
            </ModeSwitchBtn>
            <ModeSwitchBtn
              type="button"
              role="tab"
              aria-selected={viewMode === 'flow'}
              $active={viewMode === 'flow'}
              onClick={() => setViewMode('flow')}
            >
              계보 흐름도
            </ModeSwitchBtn>
          </ModeSwitchGroup>
        </HeadRow>

        <DashboardStyles.SectionHeadlineStrip aria-label="연결된 과거 국가 요약 지표">
          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              연결된 과거 국가
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={count === 0}>
              {count > 0 ? (
                <>
                  {count.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>개국</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '미등록'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {spanSummary.minLabel && spanSummary.maxLabel
                ? `${spanSummary.minLabel} ~ ${spanSummary.maxLabel}${spanSummary.totalYears ? ` (${spanSummary.totalYears.toLocaleString('ko-KR')}년)` : ''}`
                : '연결된 역사 국가 존속 범위'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              계보 역할 분포
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue $muted={count === 0}>
              {count > 0 ? (
                <>
                  직계 {classification.predecessors.length}
                  <DashboardStyles.SectionHeadlineUnit>개국</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '—'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {count > 0
                ? `구성 정치체 ${classification.constituents.length} · 역사 유산 ${classification.heritage.length}`
                : '전신·구성국·유산 자동 분류'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              계승 · 소속 관계
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={transitions.length + memberships.length === 0}
            >
              {transitions.length + memberships.length > 0 ? (
                <>
                  {(transitions.length + memberships.length).toLocaleString(
                    'ko-KR',
                  )}
                  <DashboardStyles.SectionHeadlineUnit>건</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              변천 {transitions.length}건 · 소속·구성 {memberships.length}건
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>

          <DashboardStyles.SectionHeadlineCell>
            <DashboardStyles.SectionHeadlineLabel>
              수평 외교 · 교전 관계
            </DashboardStyles.SectionHeadlineLabel>
            <DashboardStyles.SectionHeadlineValue
              $muted={relations.length === 0}
            >
              {relations.length > 0 ? (
                <>
                  {relations.length.toLocaleString('ko-KR')}
                  <DashboardStyles.SectionHeadlineUnit>건</DashboardStyles.SectionHeadlineUnit>
                </>
              ) : (
                '없음'
              )}
            </DashboardStyles.SectionHeadlineValue>
            <DashboardStyles.SectionHeadlineSub>
              {relations.length > 0
                ? `관계 보유 국가 ${withRelationsCount}/${count}개국`
                : '동맹·조공·전쟁·동군연합 기록 없음'}
            </DashboardStyles.SectionHeadlineSub>
          </DashboardStyles.SectionHeadlineCell>
        </DashboardStyles.SectionHeadlineStrip>

        {isLinkedDataLoading ? (
          <ChartSkeleton variant="bars" rows={5} />
        ) : count === 0 ? (
          <EmptySpecGrid>
            <EmptySpecCell>
              <EmptySpecTitle>
                1. 과거 국가에서 현대 국가({country.name}) 연결
              </EmptySpecTitle>
              <EmptySpecDesc>
                역사적 국가 상세의 기본 정보 수정에서 「연결할 현대 국가」로 {country.name}을(를) 지정하면 이 탭과 대시보드 계보에 즉시 반영됩니다.
              </EmptySpecDesc>
            </EmptySpecCell>
            <EmptySpecCell>
              <EmptySpecTitle>
                2. 전신 · 구성 정치체 · 역사 유산 자동 분류
              </EmptySpecTitle>
              <EmptySpecDesc>
                연결된 역사 국가들 사이에 계승·변천이나 소속·구성 관계를 입력하면 직계 전신, 구성 정치체, 역사 유산으로 자동 분류됩니다.
              </EmptySpecDesc>
            </EmptySpecCell>
          </EmptySpecGrid>
        ) : viewMode === 'flow' ? (
          <FlowSectionWrap>
            <LineageFlow
              historicalCountries={enrichedForLineage}
              modernEndpoint={{
                id: country.id,
                name: country.name,
                flagEmoji: country.flagEmoji,
                thumbnailUrl: country.thumbnailUrl,
                isoCode: country.isoCode,
              }}
              onSelect={(targetId) =>
                navigate(pathKeys.countryDetail(targetId))
              }
              toolbarLeft={filterBarNode}
            />

            {transitions.length + memberships.length + relations.length > 0 && (
              <SubLedgerSection aria-label="변천·소속·수평 관계 원장">
                <SubLedgerHead>
                  <SubLedgerTitle>
                    국가 간 변천 · 소속 · 외교 관계 원장
                  </SubLedgerTitle>
                  <SubLedgerCount>
                    총{' '}
                    {(
                      transitions.length +
                      memberships.length +
                      relations.length
                    ).toLocaleString('ko-KR')}
                    건
                  </SubLedgerCount>
                </SubLedgerHead>
                <RelationLedgerGrid>
                  {transitions.map((transition) => (
                    <RelationLedgerCell key={`tr-${transition.id}`}>
                      <RelationKindBadge $tone="transition">
                        변천 ·{' '}
                        {TRANSITION_EVENT_LABELS[
                          transition.eventType as TransitionEventType
                        ] ?? transition.eventType}
                      </RelationKindBadge>
                      <RelationMainText>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(transition.predecessorId),
                            )
                          }
                        >
                          {idToCountry.get(transition.predecessorId)?.name ??
                            transition.predecessorName ??
                            '전임'}
                        </RelationNodeBtn>
                        <RelationArrow>→</RelationArrow>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(transition.successorId),
                            )
                          }
                        >
                          {idToCountry.get(transition.successorId)?.name ??
                            transition.successorName ??
                            '후임'}
                        </RelationNodeBtn>
                      </RelationMainText>
                    </RelationLedgerCell>
                  ))}

                  {memberships.map((membership) => (
                    <RelationLedgerCell key={`mem-${membership.id}`}>
                      <RelationKindBadge $tone="membership">
                        소속 ·{' '}
                        {MEMBERSHIP_ROLE_LABELS[
                          membership.role as HistoricalMembershipRole
                        ] ?? membership.role}
                        {membership.isLeadingMember ? ' (주축)' : ''}
                      </RelationKindBadge>
                      <RelationMainText>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(
                                membership.historicalCountryId,
                              ),
                            )
                          }
                        >
                          {idToCountry.get(membership.historicalCountryId)
                            ?.name ??
                            membership.parentName ??
                            '상위'}
                        </RelationNodeBtn>
                        <RelationArrow>⊃</RelationArrow>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(
                                membership.memberCountryId,
                              ),
                            )
                          }
                        >
                          {idToCountry.get(membership.memberCountryId)?.name ??
                            membership.memberName ??
                            '하위'}
                        </RelationNodeBtn>
                      </RelationMainText>
                    </RelationLedgerCell>
                  ))}

                  {relations.map((relation) => (
                    <RelationLedgerCell key={`rel-${relation.id}`}>
                      <RelationKindBadge $tone="relation">
                        관계 ·{' '}
                        {RELATION_TYPE_LABELS[
                          relation.relationType as HistoricalRelationType
                        ] ?? relation.relationType}
                      </RelationKindBadge>
                      <RelationMainText>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(relation.subjectCountryId),
                            )
                          }
                        >
                          {idToCountry.get(relation.subjectCountryId)?.name ??
                            relation.subjectCountryName ??
                            '주체'}
                        </RelationNodeBtn>
                        <RelationArrow>↔</RelationArrow>
                        <RelationNodeBtn
                          type="button"
                          onClick={() =>
                            navigate(
                              pathKeys.countryDetail(relation.objectCountryId),
                            )
                          }
                        >
                          {idToCountry.get(relation.objectCountryId)?.name ??
                            relation.objectCountryName ??
                            '대상'}
                        </RelationNodeBtn>
                      </RelationMainText>
                    </RelationLedgerCell>
                  ))}
                </RelationLedgerGrid>
              </SubLedgerSection>
            )}
          </FlowSectionWrap>
        ) : (
          <>
            <FilterToolbar>
              {filterBarNode}
              <SearchInput
                type="search"
                value={searchQuery}
                onChange={(changeEvent) =>
                  setSearchQuery(changeEvent.target.value)
                }
                placeholder="국호 · 영문명 · 체제 · 연도 검색…"
                aria-label="과거 국가 검색"
              />
            </FilterToolbar>

            {filteredList.length === 0 ? (
              <NoMatchRow>
                선택한 분류나 검색어와 일치하는 과거 국가가 없습니다.
              </NoMatchRow>
            ) : (
              <CountryLedgerGrid>
                {filteredList.map((item) => {
                  const resolvedKind =
                    classification.kindById.get(item.id) ??
                    item.linkKind ??
                    null
                  const kindLabel = resolvedKind
                    ? LINK_KIND_LABEL[resolvedKind]
                    : null
                  const stateTypeLabel = item.stateType
                    ? getStateTypeLabel(item.stateType)
                    : null
                  const periodLabel = formatCountryPeriod(item)
                  const relationChips = renderRelationSummaries(item)

                  return (
                    <CountryLedgerCell key={item.id}>
                      <CountryRowButton
                        type="button"
                        onClick={() =>
                          navigate(pathKeys.countryDetail(item.id))
                        }
                      >
                        <CountryThumb>
                          {item.thumbnailUrl ? (
                            <img
                              src={getUploadImageUrl(item.thumbnailUrl)}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span>{item.name.slice(0, 1)}</span>
                          )}
                        </CountryThumb>

                        <CountryMainCol>
                          <CountryTitleRow>
                            <CountryNameText>{item.name}</CountryNameText>
                            {item.enName && (
                              <CountryEnNameText>{item.enName}</CountryEnNameText>
                            )}
                          </CountryTitleRow>

                          <CountryMetaRow>
                            {kindLabel && (
                              <KindBadge $kind={resolvedKind ?? ''}>
                                {kindLabel}
                              </KindBadge>
                            )}
                            {stateTypeLabel && stateTypeLabel !== '미분류' && (
                              <StateBadge>{stateTypeLabel}</StateBadge>
                            )}
                            <PeriodText>{periodLabel}</PeriodText>
                          </CountryMetaRow>

                          {relationChips.length > 0 && (
                            <RelationChipRow>
                              {relationChips.slice(0, 4).map((chip) => (
                                <RelationChip
                                  key={chip.key}
                                  $highlight={chip.highlight}
                                >
                                  {chip.label}
                                </RelationChip>
                              ))}
                              {relationChips.length > 4 && (
                                <RelationChip>
                                  외 {relationChips.length - 4}건
                                </RelationChip>
                              )}
                            </RelationChipRow>
                          )}
                        </CountryMainCol>

                        <DetailActionLabel>상세 →</DetailActionLabel>
                      </CountryRowButton>
                    </CountryLedgerCell>
                  )
                })}
              </CountryLedgerGrid>
            )}
          </>
        )}
      </SectionWrap>
    </DashboardStyles.DashboardRoot>
  )
}

const SectionWrap = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
`

const HeadRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
`

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModeSwitchGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
`

const ModeSwitchBtn = styled.button<{ $active: boolean }>`
  padding: 5px 11px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
  }
`

const FilterToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FilterChipGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.active : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;

  &:hover {
    color: ${({ theme, $active }) =>
      $active ? theme.colors.active : theme.colors.text.primary};
  }
`

const FilterChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
`

const SearchInput = styled.input`
  width: min(260px, 100%);
  height: 30px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const CountryLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const CountryLedgerCell = styled.div`
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 780px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`

const CountryRowButton = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 12px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  }
`

const CountryThumb = styled.div`
  width: 38px;
  height: 28px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CountryMainCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`

const CountryTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

const CountryNameText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryEnNameText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CountryMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const KindBadge = styled.span<{ $kind: string }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $kind }) =>
    $kind === 'PREDECESSOR'
      ? theme.colors.active
      : theme.colors.text.secondary};
  background: ${({ theme, $kind }) =>
    $kind === 'PREDECESSOR'
      ? theme.colors.activeLight
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : '#f1f5f9'};
`

const StateBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
`

const PeriodText = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RelationChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 2px;
`

const RelationChip = styled.span<{ $highlight?: boolean }>`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
`

const DetailActionLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  flex-shrink: 0;
  align-self: center;

  ${CountryRowButton}:hover & {
    color: ${({ theme }) => theme.colors.active};
  }
`

const FlowSectionWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SubLedgerSection = styled.section`
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
`

const SubLedgerHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
`

const SubLedgerTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SubLedgerCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelationLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 780px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const RelationLedgerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 780px) {
    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
`

const RelationKindBadge = styled.span<{
  $tone: 'transition' | 'membership' | 'relation'
}>`
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  color: ${({ theme, $tone }) =>
    $tone === 'transition'
      ? theme.colors.active
      : theme.colors.text.secondary};
  background: ${({ theme, $tone }) =>
    $tone === 'transition'
      ? theme.colors.activeLight
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : '#f1f5f9'};
`

const RelationMainText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
  font-size: 13px;
`

const RelationNodeBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const RelationArrow = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NoMatchRow = styled.p`
  margin: 0;
  padding: 20px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EmptySpecGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const EmptySpecCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 14px;
  min-width: 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  @media (min-width: 720px) {
    & + & {
      border-top: none;
      border-left: 1px solid ${({ theme }) => theme.colors.border.light};
    }
  }
`

const EmptySpecTitle = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptySpecDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`
