import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowRight, FiCalendar, FiMapPin, FiShield, FiUser, FiUsers } from 'react-icons/fi'
import { Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { SIDE_UNIT_ROLE_LABEL } from '@/pages/events/detail/components/side-orbat.lib'
import { SIDE_OUTCOME_LABEL } from '@/pages/events/detail/components/side-outcome'
import {
  militaryUnitApi,
  type MilitaryUnitDatePartsDto,
  type MilitaryUnitEventLinkDto,
  type MilitaryUnitLineageDto,
} from '@/shared/api/military-unit'
import { formatSpanLabel } from '@/pages/events/detail/components/development-timeline.lib'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'

const BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동',
  OTHER: '기타',
}

interface UnitDetailResponse {
  id: string
  name: string
  nameLocal?: string | null
  nameEn?: string | null
  abbreviation?: string | null
  unitType?: string | null
  branch?: string | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  description?: string | null
  established?: MilitaryUnitDatePartsDto | null
  disbanded?: MilitaryUnitDatePartsDto | null
  establishedDate?: string | null
  disbandedDate?: string | null
  predecessors?: MilitaryUnitLineageDto[]
  successors?: MilitaryUnitLineageDto[]
  eventRelations?: MilitaryUnitEventLinkDto[]
  countryId?: string | null
  historicalCountryId?: string | null
  country?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
  administrationDepartment?: {
    id: string
    name: string
    abbreviation?: string | null
  } | null
  parentUnit?: {
    id: string
    name: string
    unitType?: string | null
  } | null
  subUnits?: Array<{
    id: string
    name: string
    unitType?: string | null
    branch?: string | null
  }>
  commanders?: Array<{
    id: string
    personId: string
    rank?: string | null
    role?: string | null
    startDate?: string | null
    endDate?: string | null
    isCurrent?: boolean | null
    person?: {
      id: string
      name: string
      surname?: string | null
    } | null
  }>
  sideDeployedUnits?: Array<{
    id: string
    role?: string | null
    note?: string | null
    parentUnit?: {
      id: string
      name: string
      unitType?: string | null
    } | null
    commander?: {
      id: string
      name: string
      surname?: string | null
    } | null
    deployedWeapons?: Array<{
      id: string
      quantity?: number | null
      note?: string | null
      weapon?: { id: string; name: string; weaponType?: string | null } | null
      groundVehicle?: { id: string; name: string; vehicleType?: string | null } | null
      aircraft?: { id: string; name: string; aircraftType?: string | null } | null
      navalVessel?: { id: string; name: string; vesselType?: string | null } | null
    }>
    mapFeatures?: Array<{
      id: string
      eventId: string
      geometryType: 'POINT' | 'ARROW' | 'LINE' | 'POLYGON'
      title: string
      description?: string | null
      color?: string | null
    }>
    metrics?: Array<{
      id: string
      metricKey: string
      metricName: string
      unit?: string | null
      value?: string | null
      low?: string | null
      high?: string | null
      approx?: boolean
      atLeast?: boolean
    }>
    side?: {
      id: string
      name: string
      color?: string | null
      outcome?: string | null
      event?: {
        id: string
        title: string
        startDate?: string | null
        startDatePrecision?: string | null
        endDate?: string | null
        endDatePrecision?: string | null
        domain?: string | null
        type?: string | null
      } | null
    } | null
  }>
  navalVessels?: Array<{
    id: string
    name: string
    vesselType?: string | null
    vesselClass?: string | null
  }>
}

export function MilitaryUnitDetailSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedUnitId = searchParams.get('unitId')

  const allUnitsQuery = useQuery({
    queryKey: ['military-units', 'all-overview'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 60_000,
  })

  const detailQuery = useQuery({
    queryKey: ['military-unit', 'detail', selectedUnitId],
    queryFn: () =>
      militaryUnitApi.getById(selectedUnitId!) as unknown as Promise<UnitDetailResponse>,
    enabled: Boolean(selectedUnitId),
    staleTime: 30_000,
  })

  const selectUnit = (unitId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('unitId', unitId)
    setSearchParams(next)
  }

  const allUnits = useMemo(
    () => (allUnitsQuery.data ?? []) as UnitDetailResponse[],
    [allUnitsQuery.data],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [unitTypeFilter, setUnitTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  const countryOptions = useMemo(() => {
    const names = new Set<string>()
    for (const unitItem of allUnits) {
      const countryName = unitItem.historicalCountry?.name ?? unitItem.country?.name
      if (countryName) names.add(countryName)
    }
    return [...names].sort((left, right) => left.localeCompare(right, 'ko'))
  }, [allUnits])

  const unitTypeOptions = useMemo(() => {
    const types = new Set<string>()
    for (const unitItem of allUnits) {
      if (unitItem.unitType) types.add(unitItem.unitType)
    }
    return [...types]
  }, [allUnits])

  const filteredOverviewUnits = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase()
    return allUnits.filter((unitItem) => {
      const countryName =
        unitItem.historicalCountry?.name ?? unitItem.country?.name ?? '국가 미지정'
      if (countryFilter && countryName !== countryFilter) return false
      if (unitTypeFilter && unitItem.unitType !== unitTypeFilter) return false
      if (branchFilter && unitItem.branch !== branchFilter) return false
      if (queryLower) {
        const hay = [
          unitItem.name,
          unitItem.abbreviation,
          unitItem.nameLocal,
          unitItem.nameEn,
          unitItem.nickname,
          countryName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(queryLower)) return false
      }
      return true
    })
  }, [allUnits, searchQuery, countryFilter, unitTypeFilter, branchFilter])

  if (!selectedUnitId) {
    return (
      <PageWrap>
        <HeroCard>
          <HeroTopRow>
            <HeroTitleGroup>
              <BadgeRow>
                <PrimaryBadge>
                  <FiShield size={12} /> 군사 부대 편제 · 전투서열 도메인
                </PrimaryBadge>
              </BadgeRow>
              <HeroTitle>
                군사 부대 총람 ({filteredOverviewUnits.length} / {allUnits.length}개 부대)
              </HeroTitle>
              <HeroSubtitle>
                좌측 목록이나 아래 카드에서 부대를 선택하면 상급·예하 편제 트리, 역대 지휘관 임기, 참전 작전·전투 타임라인을 한눈에 볼 수 있습니다.
              </HeroSubtitle>
            </HeroTitleGroup>
          </HeroTopRow>

          {allUnits.length > 0 && (
            <OverviewFilterRow>
              <OverviewFilterInput
                type="search"
                placeholder="부대명·별칭·국가 검색 (예: 제2기갑집단, 중부집단군)"
                value={searchQuery}
                onChange={(changeEvent) => setSearchQuery(changeEvent.target.value)}
              />
              <OverviewFilterSelect
                value={countryFilter}
                onChange={(changeEvent) => setCountryFilter(changeEvent.target.value)}
                aria-label="국가 필터"
              >
                <option value="">전체 국가 ({countryOptions.length})</option>
                {countryOptions.map((nameItem) => (
                  <option key={nameItem} value={nameItem}>
                    {nameItem}
                  </option>
                ))}
              </OverviewFilterSelect>
              <OverviewFilterSelect
                value={unitTypeFilter}
                onChange={(changeEvent) => setUnitTypeFilter(changeEvent.target.value)}
                aria-label="부대 규모 필터"
              >
                <option value="">전체 규모</option>
                {unitTypeOptions.map((typeItem) => (
                  <option key={typeItem} value={typeItem}>
                    {militaryUnitTypeLabelKo(typeItem)}
                  </option>
                ))}
              </OverviewFilterSelect>
              <OverviewFilterSelect
                value={branchFilter}
                onChange={(changeEvent) => setBranchFilter(changeEvent.target.value)}
                aria-label="병종 필터"
              >
                <option value="">전체 병종</option>
                {Object.entries(BRANCH_LABELS).map(([branchKey, branchName]) => (
                  <option key={branchKey} value={branchKey}>
                    {branchName}
                  </option>
                ))}
              </OverviewFilterSelect>
            </OverviewFilterRow>
          )}
        </HeroCard>

        {allUnits.length === 0 ? (
          <EmptyCard>
            아직 등록된 군사 부대가 없습니다. 국가 상세 → 행정조직 → 군사 탭에서 부대를 등록하세요.
          </EmptyCard>
        ) : filteredOverviewUnits.length === 0 ? (
          <EmptyCard>검색·필터 조건에 맞는 군사 부대가 없습니다.</EmptyCard>
        ) : (
          <UnitGrid>
            {filteredOverviewUnits.map((unitItem) => {
              const countryName =
                unitItem.historicalCountry?.name ?? unitItem.country?.name ?? '국가 미지정'
              const typeLabel = unitItem.unitType
                ? militaryUnitTypeLabelKo(unitItem.unitType)
                : null
              return (
                <UnitSummaryCard
                  key={unitItem.id}
                  type="button"
                  onClick={() => selectUnit(unitItem.id)}
                >
                  <UnitSummaryTop>
                    {typeLabel && <SmallBadge>{typeLabel}</SmallBadge>}
                    <CountryTag>{countryName}</CountryTag>
                  </UnitSummaryTop>
                  <UnitSummaryName>
                    {unitItem.name}
                    {unitItem.abbreviation ? ` (${unitItem.abbreviation})` : ''}
                  </UnitSummaryName>
                  {unitItem.nickname && <UnitSummaryNick>“{unitItem.nickname}”</UnitSummaryNick>}
                </UnitSummaryCard>
              )
            })}
          </UnitGrid>
        )}
      </PageWrap>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <PageWrap>
        <EmptyCard>부대 상세 정보를 불러오는 중입니다…</EmptyCard>
      </PageWrap>
    )
  }

  const unit = detailQuery.data
  if (!unit) {
    return (
      <PageWrap>
        <EmptyCard>선택한 부대를 찾을 수 없습니다.</EmptyCard>
      </PageWrap>
    )
  }

  const countryName = unit.historicalCountry?.name ?? unit.country?.name ?? null
  const countryIdForLink = unit.country?.id ?? unit.historicalCountry?.id ?? null
  const unitTypeLabel = unit.unitType ? militaryUnitTypeLabelKo(unit.unitType) : null
  const branchLabel = unit.branch ? (BRANCH_LABELS[unit.branch] ?? unit.branch) : null
  const subUnits = unit.subUnits ?? []
  const commanders = unit.commanders ?? []
  const predecessors = unit.predecessors ?? []
  const successors = unit.successors ?? []
  const eventRelations = unit.eventRelations ?? []
  const deployments = (unit.sideDeployedUnits ?? []).filter((dep) => dep.side?.event)
  const vessels = unit.navalVessels ?? []

  const formatPartsOrIso = (
    parts: MilitaryUnitDatePartsDto | null | undefined,
    iso: string | null | undefined,
    fallback: string,
  ): string => {
    if (parts?.year && parts.year > 0) {
      const prefix = parts.era === 'BC' ? 'BC ' : ''
      const monthPart =
        parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
      const dayPart =
        parts.month != null && parts.day != null
          ? `.${String(parts.day).padStart(2, '0')}`
          : ''
      return `${prefix}${parts.year}${monthPart}${dayPart}`
    }
    if (iso) return iso.slice(0, 10)
    return fallback
  }

  return (
    <PageWrap>
      <HeroCard>
        <HeroTopRow>
          <HeroTitleGroup>
            <BadgeRow>
              {unitTypeLabel && <PrimaryBadge>{unitTypeLabel}</PrimaryBadge>}
              {branchLabel && <SecondaryBadge>{branchLabel}</SecondaryBadge>}
              {countryName && countryIdForLink && (
                <CountryLink
                  to={`${pathKeys.countryMilitary(countryIdForLink)}?unitId=${encodeURIComponent(unit.id)}`}
                >
                  🏳️ {countryName} 군사 편제 ↗
                </CountryLink>
              )}
              {unit.administrationDepartment && (
                <SecondaryBadge>
                  🏛️ {unit.administrationDepartment.name}
                  {unit.administrationDepartment.abbreviation
                    ? ` (${unit.administrationDepartment.abbreviation})`
                    : ''}
                </SecondaryBadge>
              )}
            </BadgeRow>
            <HeroTitle>
              {unit.name}
              {unit.abbreviation ? ` (${unit.abbreviation})` : ''}
              {unit.nickname && <NicknameSpan> “{unit.nickname}”</NicknameSpan>}
            </HeroTitle>
            {(unit.nameLocal || unit.nameEn) && (
              <HeroSubtitle>
                {[unit.nameLocal, unit.nameEn].filter(Boolean).join(' · ')}
              </HeroSubtitle>
            )}
            {unit.motto && <HeroSubtitle>표어: {unit.motto}</HeroSubtitle>}
          </HeroTitleGroup>
        </HeroTopRow>

        <MetaRow>
          {(unit.established?.year ||
            unit.disbanded?.year ||
            unit.establishedDate ||
            unit.disbandedDate) && (
            <MetaItem>
              <FiCalendar size={13} />
              <span>
                존속:{' '}
                {formatPartsOrIso(unit.established, unit.establishedDate, '?')} ~{' '}
                {formatPartsOrIso(unit.disbanded, unit.disbandedDate, '현재')}
              </span>
            </MetaItem>
          )}
          {unit.garrison && (
            <MetaItem>
              <FiMapPin size={13} />
              <span>주둔지: {unit.garrison}</span>
            </MetaItem>
          )}
          {unit.strength && (
            <MetaItem>
              <FiUsers size={13} />
              <span>편제 규모: {unit.strength}</span>
            </MetaItem>
          )}
        </MetaRow>

        {unit.description && <DescriptionBox>{unit.description}</DescriptionBox>}
      </HeroCard>

      {/* 1. 편제 계통 (상급 부대 → 현재 부대 → 예하 부대) + 전신·후신 계보 */}
      <SectionCard>
        <SectionTitle>편제 계통 · 계보 (Command Hierarchy &amp; Lineage)</SectionTitle>
        <HierarchyFlow>
          {unit.parentUnit ? (
            <HierarchyNodeBtn
              type="button"
              onClick={() => selectUnit(unit.parentUnit!.id)}
              title="상급 부대 상세로 이동"
            >
              <SmallBadge>
                {unit.parentUnit.unitType
                  ? militaryUnitTypeLabelKo(unit.parentUnit.unitType)
                  : '상급 부대'}
              </SmallBadge>
              <strong>{unit.parentUnit.name}</strong>
            </HierarchyNodeBtn>
          ) : (
            <HierarchyRootNote>최상위 편제 (상급 부대 없음)</HierarchyRootNote>
          )}

          <FiArrowRight size={14} />

          <CurrentUnitPill>
            {unitTypeLabel && <SmallBadge>{unitTypeLabel}</SmallBadge>}
            <strong>
              {unit.name}
              {unit.abbreviation ? ` (${unit.abbreviation})` : ''}
            </strong>
          </CurrentUnitPill>
        </HierarchyFlow>

        {(predecessors.length > 0 || successors.length > 0) && (
          <SubUnitSection>
            <SubSectionLabel>전신 · 후신 개편 계보</SubSectionLabel>
            <HierarchyFlow>
              {predecessors.map((predItem) => {
                if (predItem.targetType === 'DEPARTMENT' && predItem.department) {
                  return countryIdForLink ? (
                    <CountryLink
                      key={predItem.transitionId}
                      to={`${pathKeys.countryGovernment(countryIdForLink)}?departmentId=${encodeURIComponent(predItem.department.id)}`}
                    >
                      🏛️ [전신 부처] {predItem.department.name}
                      {predItem.year
                        ? ` (${predItem.era === 'BC' ? 'BC ' : ''}${predItem.year})`
                        : ''}
                    </CountryLink>
                  ) : (
                    <SecondaryBadge key={predItem.transitionId}>
                      🏛️ [전신 부처] {predItem.department.name}
                    </SecondaryBadge>
                  )
                }
                if (predItem.unit) {
                  return (
                    <HierarchyNodeBtn
                      key={predItem.transitionId}
                      type="button"
                      onClick={() => selectUnit(predItem.unit!.id)}
                    >
                      <SmallBadge>전신 부대</SmallBadge>
                      <strong>{predItem.unit.name}</strong>
                    </HierarchyNodeBtn>
                  )
                }
                return null
              })}
              {successors.map((succItem) =>
                succItem.unit ? (
                  <HierarchyNodeBtn
                    key={succItem.transitionId}
                    type="button"
                    onClick={() => selectUnit(succItem.unit!.id)}
                  >
                    <SmallBadge>후신 부대</SmallBadge>
                    <strong>{succItem.unit.name}</strong>
                  </HierarchyNodeBtn>
                ) : null,
              )}
            </HierarchyFlow>
          </SubUnitSection>
        )}

        {subUnits.length > 0 && (
          <SubUnitSection>
            <SubSectionLabel>예하 편제 ({subUnits.length}개 부대)</SubSectionLabel>
            <UnitGrid>
              {subUnits.map((sub) => (
                <UnitSummaryCard
                  key={sub.id}
                  type="button"
                  onClick={() => selectUnit(sub.id)}
                >
                  <UnitSummaryTop>
                    {sub.unitType && (
                      <SmallBadge>{militaryUnitTypeLabelKo(sub.unitType)}</SmallBadge>
                    )}
                  </UnitSummaryTop>
                  <UnitSummaryName>{sub.name}</UnitSummaryName>
                </UnitSummaryCard>
              ))}
            </UnitGrid>
          </SubUnitSection>
        )}
      </SectionCard>

      {eventRelations.length > 0 && (
        <SectionCard>
          <SectionTitle>
            지령 · 작전 관여 사건 ({eventRelations.length}건)
          </SectionTitle>
          <Table>
            <thead>
              <tr>
                <th>시기</th>
                <th>사건 · 지령</th>
                <th>관여 성격</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {eventRelations.map((relItem) => (
                <tr key={relItem.relationId}>
                  <td>
                    {relItem.event.startYear
                      ? `${relItem.event.startEra === 'BC' ? 'BC ' : ''}${relItem.event.startYear}`
                      : '—'}
                  </td>
                  <td>
                    <EventLink to={pathKeys.events.detail(relItem.event.id)}>
                      {relItem.event.title}
                    </EventLink>
                  </td>
                  <td>
                    <SmallBadge>{relItem.role}</SmallBadge>
                  </td>
                  <td>{relItem.roleDescription || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </SectionCard>
      )}

      {/* 2. 역대 지휘관 */}
      <SectionCard>
        <SectionTitle>역대 지휘관 ({commanders.length}명)</SectionTitle>
        {commanders.length === 0 ? (
          <EmptyNote>등록된 지휘관 임기 기록이 없습니다.</EmptyNote>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>지휘관</th>
                <th>계급 · 직책</th>
                <th>재임 기간</th>
              </tr>
            </thead>
            <tbody>
              {commanders.map((cmd) => {
                const fullName = cmd.person
                  ? [cmd.person.name, cmd.person.surname].filter(Boolean).join(' ')
                  : '인물 미상'
                const startStr = cmd.startDate ? cmd.startDate.slice(0, 10) : '?'
                const endStr = cmd.endDate
                  ? cmd.endDate.slice(0, 10)
                  : cmd.isCurrent
                    ? '현임'
                    : '?'
                return (
                  <tr key={cmd.id}>
                    <td>
                      <PersonLink to={pathKeys.personsTimelineDetail(cmd.personId)}>
                        <FiUser size={12} /> {fullName}
                      </PersonLink>
                    </td>
                    <td>{[cmd.rank, cmd.role].filter(Boolean).join(' · ') || '지휘관'}</td>
                    <td>
                      {startStr} ~ {endStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </SectionCard>

      {/* 3. 참전 작전·전투 타임라인 (SideDeployedUnit 역방향 연결) */}
      <SectionCard>
        <SectionTitle>참전 작전 · 전투 타임라인 ({deployments.length}건)</SectionTitle>
        {deployments.length === 0 ? (
          <EmptyNote>
            아직 이 부대가 투입된 사건·작전이 없습니다. 사건 상세 → 진영 → 전투서열(ORBAT)에서 이 부대를 투입하면 자동으로 여기에 집계됩니다.
          </EmptyNote>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>시기</th>
                <th>작전 · 전투(사건)</th>
                <th>소속 진영 · 결과</th>
                <th>작전 편제 · 지휘관 · 역할</th>
                <th>부대 수치 · 투입 병기</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep) => {
                const ev = dep.side!.event!
                const side = dep.side!
                const dateLabel =
                  formatSpanLabel({
                    id: ev.id,
                    title: ev.title,
                    startDate: ev.startDate,
                    startDatePrecision: ev.startDatePrecision,
                    endDate: ev.endDate,
                    endDatePrecision: ev.endDatePrecision,
                  }) || '날짜 미상'
                const roleLabel =
                  dep.role && dep.role in SIDE_UNIT_ROLE_LABEL
                    ? SIDE_UNIT_ROLE_LABEL[dep.role as keyof typeof SIDE_UNIT_ROLE_LABEL]
                    : null
                const outcomeLabel =
                  side.outcome && side.outcome in SIDE_OUTCOME_LABEL
                    ? SIDE_OUTCOME_LABEL[side.outcome as keyof typeof SIDE_OUTCOME_LABEL]
                    : null
                const commanderName = dep.commander
                  ? [dep.commander.name, dep.commander.surname].filter(Boolean).join(' ')
                  : null
                const weapons = dep.deployedWeapons ?? []
                const mapFeatures = dep.mapFeatures ?? []
                const unitMetrics = dep.metrics ?? []
                return (
                  <tr key={dep.id}>
                    <td>{dateLabel}</td>
                    <td>
                      <EventLink to={pathKeys.events.detail(ev.id)}>{ev.title}</EventLink>
                    </td>
                    <td>
                      <strong>{side.name}</strong>
                      {outcomeLabel ? ` (${outcomeLabel})` : ''}
                    </td>
                    <td>
                      <DeploymentDetailStack>
                        {dep.parentUnit && (
                          <InlineActionLink
                            type="button"
                            onClick={() => selectUnit(dep.parentUnit!.id)}
                            title="작전 당시 배속 상급 부대로 이동"
                          >
                            상급: ⚔️ {dep.parentUnit.name}
                          </InlineActionLink>
                        )}
                        {dep.commander && commanderName && (
                          <PersonLink to={pathKeys.personsTimelineDetail(dep.commander.id)}>
                            🎖️ {commanderName}
                          </PersonLink>
                        )}
                        {([roleLabel, dep.note].filter(Boolean).join(' — ') || (!dep.parentUnit && !dep.commander ? '—' : '')) && (
                          <span>{[roleLabel, dep.note].filter(Boolean).join(' — ')}</span>
                        )}
                      </DeploymentDetailStack>
                    </td>
                    <td>
                      <DeploymentDetailStack>
                        {unitMetrics.map((metricItem) => {
                          const rawVal = metricItem.value ?? metricItem.low ?? metricItem.high
                          const formattedVal =
                            rawVal != null && Number.isFinite(Number(rawVal))
                              ? Number(rawVal).toLocaleString()
                              : rawVal ?? ''
                          return (
                            <SmallBadge key={metricItem.id}>
                              📉 {metricItem.metricName}: {metricItem.approx ? '약 ' : ''}
                              {formattedVal}
                              {metricItem.unit ? ` ${metricItem.unit}` : ''}
                            </SmallBadge>
                          )
                        })}
                        {weapons.map((weaponEntry) => {
                          const assetName =
                            weaponEntry.groundVehicle?.name ??
                            weaponEntry.aircraft?.name ??
                            weaponEntry.navalVessel?.name ??
                            weaponEntry.weapon?.name ??
                            '병기'
                          const countParts = [
                            weaponEntry.quantity != null ? `${weaponEntry.quantity.toLocaleString()}기` : null,
                            weaponEntry.note ? weaponEntry.note : null,
                          ].filter(Boolean)
                          return (
                            <SmallBadge key={weaponEntry.id}>
                              🛡️ {assetName}
                              {countParts.length > 0 ? ` (${countParts.join(' · ')})` : ''}
                            </SmallBadge>
                          )
                        })}
                        {mapFeatures.map((featItem) => {
                          const geomIcon =
                            featItem.geometryType === 'ARROW'
                              ? '➔'
                              : featItem.geometryType === 'POLYGON'
                                ? '🕸️'
                                : featItem.geometryType === 'LINE'
                                  ? '➖'
                                  : '📍'
                          return (
                            <EventLink
                              key={featItem.id}
                              to={`${pathKeys.events.detail(featItem.eventId)}?tab=survey&sv=map&unit=${encodeURIComponent(unit.id)}`}
                              title={featItem.description ?? '조망 지도에서 기동 축선·포위망 보기'}
                              style={{ fontSize: 11.5 }}
                            >
                              {geomIcon} {featItem.title} ↗
                            </EventLink>
                          )
                        })}
                        {unitMetrics.length === 0 && weapons.length === 0 && mapFeatures.length === 0 && <span>—</span>}
                      </DeploymentDetailStack>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </SectionCard>

      {vessels.length > 0 && (
        <SectionCard>
          <SectionTitle>배속 함정 ({vessels.length}척)</SectionTitle>
          <UnitGrid>
            {vessels.map((vessel) => (
              <VesselCard key={vessel.id}>
                <SmallBadge>{vessel.vesselType ?? '함정'}</SmallBadge>
                <strong>{vessel.name}</strong>
                {vessel.vesselClass && <CountryTag>{vessel.vesselClass}</CountryTag>}
              </VesselCard>
            ))}
          </UnitGrid>
        </SectionCard>
      )}
    </PageWrap>
  )
}

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  max-width: 1120px;
  margin: 0 auto;
`

const DeploymentDetailStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
`

const InlineActionLink = styled.button`
  padding: 1px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const HeroCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 24px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const HeroTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const OverviewFilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
`

const OverviewFilterInput = styled.input`
  flex: 2 1 220px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
`

const OverviewFilterSelect = styled.select`
  flex: 1 1 130px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
`

const HeroTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const PrimaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ theme }) => `${theme.colors.primary}20`};
  color: ${({ theme }) => theme.colors.primary};
`

const SecondaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CountryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    text-decoration: underline;
  }
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NicknameSpan = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const DescriptionBox = styled.p`
  margin: 4px 0 0;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 13.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-line;
`

const SectionCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 22px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HierarchyFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

const HierarchyNodeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const HierarchyRootNote = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CurrentUnitPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 2px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}12`};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`

const SubUnitSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`

const SubSectionLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const UnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
`

const UnitSummaryCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const UnitSummaryTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 6px;
`

const SmallBadge = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CountryTag = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const UnitSummaryName = styled.strong`
  font-size: 13.5px;
  font-weight: 700;
`

const UnitSummaryNick = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  }

  th {
    font-size: 11.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PersonLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const EventLink = styled(Link)`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const EmptyCard = styled.div`
  padding: 32px;
  border-radius: 12px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const EmptyNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const VesselCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 13px;
`
