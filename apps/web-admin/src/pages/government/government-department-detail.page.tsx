import React, { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiColumns,
  FiEdit2,
  FiGitCommit,
  FiLayers,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import {
  administrationDepartmentApi,
  type AdministrationDepartmentTenureItem,
  DEPARTMENT_KIND_LABEL,
  EVENT_DEPARTMENT_ROLE_LABEL,
  type EventDepartmentRoleValue,
} from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { personCareerApi } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import {
  parseDepartmentDescription,
  resolveDepartmentLifecycleStatus,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { HeadquartersMapPreview } from '@/shared/ui/headquarters-location-field'
import {
  type EditableInstitutionTenure,
  InstitutionAppointmentModal,
} from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import { GovernmentDepartmentFormModal } from './components/government-department-form-modal'
import {
  calculateTenureSpanInfo,
  formatIsoShortPeriod,
  readGovernmentListSearch,
  resolveDepartmentPolityInfo,
} from './government-helpers'

const TRANSITION_KIND_KO: Record<string, string> = {
  RENAME: '개칭',
  MERGE: '통합',
  SPLIT: '분할',
  REORGANIZE: '개편',
  ABSORBED: '흡수',
}

export function GovernmentDepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const listSearch = readGovernmentListSearch(location.state)

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [countryModalTarget, setCountryModalTarget] =
    useState<CountryInlineModalTarget | null>(null)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false)
  const [appointModalOpen, setAppointModalOpen] = useState<boolean>(false)
  const [editingTenure, setEditingTenure] =
    useState<EditableInstitutionTenure | null>(null)

  const deptQuery = useQuery({
    queryKey: ['global-department-detail', departmentId],
    queryFn: () => administrationDepartmentApi.getById(departmentId!),
    enabled: Boolean(departmentId),
    staleTime: 60_000,
  })

  const tenuresQuery = useQuery({
    queryKey: ['administration-department-tenures', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getTenuresByDepartmentId(departmentId!),
    enabled: Boolean(departmentId),
    staleTime: 60_000,
  })

  const eventsQuery = useQuery({
    queryKey: ['administration-department-events', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getDepartmentEvents(departmentId!),
    enabled: Boolean(departmentId),
    staleTime: 60_000,
  })

  const department = deptQuery.data ?? null
  const resolvedPolity = useMemo(
    () => (department ? resolveDepartmentPolityInfo(department) : null),
    [department],
  )

  const polityCabinetsQuery = useQuery({
    queryKey: [
      'dept-detail-polity-cabinets',
      resolvedPolity?.modernCountryId ?? '',
      resolvedPolity?.historicalCountryId ?? '',
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        ...(resolvedPolity?.historicalCountryId
          ? { historicalCountryId: resolvedPolity.historicalCountryId }
          : resolvedPolity?.modernCountryId
            ? { countryId: resolvedPolity.modernCountryId }
            : {}),
        take: 500,
      }),
    enabled: Boolean(
      appointModalOpen &&
        (resolvedPolity?.modernCountryId ||
          resolvedPolity?.historicalCountryId),
    ),
    staleTime: 60_000,
  })

  useDocumentTitle(
    department?.name ? `${department.name} · 전 국가 기관` : '국가기관 상세',
  )

  if (!departmentId) return null

  const backUrl = listSearch
    ? `${pathKeys.government.list()}${listSearch}`
    : pathKeys.government.list({ tab: 'departments' })

  if (deptQuery.isLoading) {
    return <DetailShell>기관 정보를 불러오는 중입니다…</DetailShell>
  }

  if (!department || !resolvedPolity) {
    return (
      <DetailShell>
        <TopNavBar>
          <BackBtn type="button" onClick={() => navigate(backUrl)}>
            <FiArrowLeft size={14} />
            <span>전 국가 부처·기관 목록</span>
          </BackBtn>
        </TopNavBar>
        <EmptyCard>해당 기관 정보를 찾을 수 없습니다.</EmptyCard>
      </DetailShell>
    )
  }

  const polity = resolvedPolity
  const lifecycleStatus = resolveDepartmentLifecycleStatus(department)
  const isOngoingDept = lifecycleStatus === 'ACTIVE'
  const isAbolished = lifecycleStatus === 'ABOLISHED'
  const isSuperseded = lifecycleStatus === 'SUPERSEDED'
  const periodLabel = formatIsoShortPeriod(
    department.establishedDate,
    department.abolishedDate,
    isOngoingDept,
  )
  const spanInfo = calculateTenureSpanInfo(
    department.establishedDate,
    department.abolishedDate,
    isOngoingDept,
    1200,
  )
  const logoUrl = department.thumbnailUrl
    ? getUploadImageUrl(department.thumbnailUrl)
    : null
  const parsedDesc = parseDepartmentDescription(department.description)
  const effectiveHeadquarters =
    department.headquarters?.trim() ||
    parsedDesc.defense?.headquarters?.trim() ||
    null
  const effectiveMission =
    department.primaryMission?.trim() ||
    parsedDesc.defense?.missionScope?.trim() ||
    null
  const effectiveOrgStructure =
    department.orgStructure?.trim() ||
    parsedDesc.defense?.orgStructure?.trim() ||
    null
  const effectiveBudgetNote =
    department.budgetNote?.trim() ||
    parsedDesc.defense?.budgetOrForcesNote?.trim() ||
    null
  const cleanOverview = parsedDesc.cleanDescription?.trim() || null
  const tenures = tenuresQuery.data ?? []
  const deptEvents = eventsQuery.data ?? []
  const hasLineage =
    Boolean(department.parent) ||
    department.children.length > 0 ||
    department.predecessors.length > 0 ||
    department.successors.length > 0 ||
    (department.militaryUnitSuccessors?.length ?? 0) > 0 ||
    department.militaryUnits.length > 0

  const hasMissingSecondaryDomains =
    tenures.length === 0 || !hasLineage || deptEvents.length === 0

  const handleOpenCreateAppointment = () => {
    setEditingTenure(null)
    setAppointModalOpen(true)
  }

  const handleOpenEditTenure = (tenureRow: AdministrationDepartmentTenureItem) => {
    const personLabel = tenureRow.person
      ? getPersonDisplayName(tenureRow.person)
      : null
    setEditingTenure({
      id: tenureRow.id,
      personId: tenureRow.person?.id ?? tenureRow.personId ?? null,
      personName: personLabel,
      positionType: tenureRow.positionType ?? null,
      positionDefinitionId:
        tenureRow.positionDefinitionId ?? tenureRow.positionDefinition?.id ?? null,
      title: tenureRow.title ?? tenureRow.positionDefinition?.title ?? null,
      rankTitle: tenureRow.rankTitle ?? null,
      ordinal: tenureRow.ordinal ?? null,
      partyId: tenureRow.partyId ?? tenureRow.party?.id ?? null,
      administrationDepartmentId:
        tenureRow.administrationDepartmentId ?? department.id,
      cabinetId: tenureRow.cabinetId ?? null,
      cabinetIds: (tenureRow.cabinets ?? []).map((cab) => cab.id),
      startDate: tenureRow.startDate,
      endDate: tenureRow.endDate,
      startEra: tenureRow.startEra ?? null,
      startYear: tenureRow.startYear ?? null,
      startMonth: tenureRow.startMonth ?? null,
      startDay: tenureRow.startDay ?? null,
      endEra: tenureRow.endEra ?? null,
      endYear: tenureRow.endYear ?? null,
      endMonth: tenureRow.endMonth ?? null,
      endDay: tenureRow.endDay ?? null,
      notes: tenureRow.notes ?? null,
    })
    setAppointModalOpen(true)
  }

  const handleDeleteTenure = async (
    tenureRow: AdministrationDepartmentTenureItem,
  ) => {
    const personLabel = tenureRow.person
      ? getPersonDisplayName(tenureRow.person)
      : '인물 미상'
    const roleLabel =
      tenureRow.title ?? tenureRow.positionDefinition?.title ?? '재임 기록'
    const confirmed = await confirm({
      title: '재임 기록 삭제',
      message: `${personLabel} (${roleLabel}) 재임 기록을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      cancelLabel: '취소',
      danger: true,
    })
    if (!confirmed) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenureRow.id)
      invalidateTenureQueries(queryClient)
      void queryClient.invalidateQueries({
        queryKey: ['administration-department-tenures', departmentId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['global-departments'],
      })
      notify.success('재임 기록이 삭제되었습니다.')
    } catch (deleteError) {
      notify.error(
        getApiErrorMessage(deleteError, '재임 기록 삭제에 실패했습니다.'),
      )
    }
  }

  return (
    <DetailShell>
      <TopNavBar>
        <BackBtn type="button" onClick={() => navigate(backUrl)}>
          <FiArrowLeft size={14} />
          <span>전 국가 부처·기관 목록</span>
        </BackBtn>

        <NavActionGroup>
          <ActionSecondaryBtn
            type="button"
            onClick={() => setEditModalOpen(true)}
          >
            <FiEdit2 size={13} />
            <span>기관 정보 수정</span>
          </ActionSecondaryBtn>
          <ActionPrimaryBtn
            type="button"
            onClick={handleOpenCreateAppointment}
          >
            <FiPlus size={14} />
            <span>수장 · 인사 임명</span>
          </ActionPrimaryBtn>
          {polity.countryGovernmentUrl && (
            <CountryOpenLink to={polity.countryGovernmentUrl}>
              <span>{polity.polityName} 정부 탭</span>
              <FiArrowRight size={13} />
            </CountryOpenLink>
          )}
        </NavActionGroup>
      </TopNavBar>

      <HeroCard>
        <HeroMetaRow>
          <MetaChips>
            <PolityPillBtn
              type="button"
              $historical={polity.isHistorical}
              onClick={() => {
                if (polity.historicalCountryId) {
                  setCountryModalTarget({
                    kind: 'historical',
                    id: polity.historicalCountryId,
                    name: polity.polityName,
                  })
                } else if (polity.modernCountryId) {
                  setCountryModalTarget({
                    kind: 'modern',
                    id: polity.modernCountryId,
                    name: polity.polityName,
                  })
                }
              }}
            >
              {polity.flagEmoji ? <span>{polity.flagEmoji}</span> : null}
              <span>{polity.polityName}</span>
            </PolityPillBtn>
            {department.category && (
              <AccentPillLink
                to={pathKeys.government.list({
                  tab: 'departments',
                  categoryId: department.category.id,
                })}
                title={`전 세계·시대별 「${department.category.name}」 직능 부처·기관 비교 목록 보기`}
              >
                {department.category.name} · 타국 비교 →
              </AccentPillLink>
            )}
            <NeutralPill>
              {DEPARTMENT_KIND_LABEL[department.kind] ?? department.kind}
            </NeutralPill>
            {isSuperseded ? (
              <NeutralPill>개편·이관 기관</NeutralPill>
            ) : isAbolished ? (
              <NeutralPill>폐지 기관</NeutralPill>
            ) : !isOngoingDept ? (
              <NeutralPill>역사 기관</NeutralPill>
            ) : null}
          </MetaChips>

          <PeriodMono>
            <FiCalendar size={12} />
            <span>{periodLabel}</span>
            <HeroDurationChip $ongoing={isOngoingDept}>
              {spanInfo.durationLabel}
            </HeroDurationChip>
          </PeriodMono>
        </HeroMetaRow>

        <HeroMainRow>
          {logoUrl ? (
            <EmblemImg src={logoUrl} alt={department.name} />
          ) : (
            <EmblemFallback>
              <FiColumns size={22} />
            </EmblemFallback>
          )}
          <HeroInfoCol>
            <HeroTitle>{department.name}</HeroTitle>
            {(department.nameLocal ||
              department.nameEn ||
              department.abbreviation) && (
              <HeroSubline>
                {[
                  department.abbreviation ? `[${department.abbreviation}]` : null,
                  department.nameLocal,
                  department.nameEn,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </HeroSubline>
            )}
            {(effectiveHeadquarters ||
              (department.headquartersLatitude != null &&
                department.headquartersLongitude != null)) && (
              <HeadquartersMapPreview
                showHeadline
                defaultExpanded={
                  department.headquartersLatitude != null &&
                  department.headquartersLongitude != null
                }
                headquarters={effectiveHeadquarters}
                latitude={department.headquartersLatitude}
                longitude={department.headquartersLongitude}
                countryName={polity.polityName}
                departmentName={department.name}
              />
            )}
            {effectiveMission && (
              <HeroDescription>{effectiveMission}</HeroDescription>
            )}
            {cleanOverview && cleanOverview !== effectiveMission && (
              <HeroDescription>{cleanOverview}</HeroDescription>
            )}
          </HeroInfoCol>
        </HeroMainRow>

        {(effectiveOrgStructure || effectiveBudgetNote) && (
          <MetaSpecGrid>
            {effectiveOrgStructure && (
              <MetaSpecCard>
                <MetaSpecLabel>편제 · 하부 직제</MetaSpecLabel>
                <MetaSpecBody>{effectiveOrgStructure}</MetaSpecBody>
              </MetaSpecCard>
            )}
            {effectiveBudgetNote && (
              <MetaSpecCard>
                <MetaSpecLabel>예산 · 정원 · 전력 규모</MetaSpecLabel>
                <MetaSpecBody>{effectiveBudgetNote}</MetaSpecBody>
              </MetaSpecCard>
            )}
          </MetaSpecGrid>
        )}
      </HeroCard>

      {/* ─── Lineage & Continuity Flow Strip ─── */}
      <ContinuityFlowStrip aria-label="전신·후신 및 상하위 조직 계보">
        <ContinuitySlot $align="left">
          {department.predecessors.length > 0 ? (
            department.predecessors.map((predItem) => (
              <ContinuityNavLink
                key={predItem.transitionId}
                to={pathKeys.government.departmentDetail(
                  predItem.department.id,
                )}
                state={{ governmentListSearch: listSearch }}
              >
                <FiArrowLeft size={13} />
                <ContinuitySlotTexts>
                  <ContinuityRoleLabel>
                    전신 기관 (
                    {TRANSITION_KIND_KO[predItem.kind] ?? predItem.kind}
                    {predItem.year ? ` · ${predItem.year}` : ''})
                  </ContinuityRoleLabel>
                  <ContinuityTargetName>
                    {predItem.department.name}
                  </ContinuityTargetName>
                </ContinuitySlotTexts>
              </ContinuityNavLink>
            ))
          ) : department.parent ? (
            <ContinuityNavLink
              to={pathKeys.government.departmentDetail(department.parent.id)}
              state={{ governmentListSearch: listSearch }}
            >
              <FiArrowLeft size={13} />
              <ContinuitySlotTexts>
                <ContinuityRoleLabel>상위 소속 기관</ContinuityRoleLabel>
                <ContinuityTargetName>
                  {department.parent.name}
                </ContinuityTargetName>
              </ContinuitySlotTexts>
            </ContinuityNavLink>
          ) : (
            <ContinuityMutedPlaceholder>
              <ContinuityRoleLabel>전신 · 상위 기관</ContinuityRoleLabel>
              <span>기록된 전신 기관 없음 (독립·신설)</span>
            </ContinuityMutedPlaceholder>
          )}
        </ContinuitySlot>

        <ContinuityCenterNode>
          <ContinuityCurrentTop>
            <span>현재 열람</span>
            {department.parent ? (
              <ContinuityParentBadge
                to={pathKeys.government.departmentDetail(department.parent.id)}
                state={{ governmentListSearch: listSearch }}
              >
                상위: {department.parent.name}
              </ContinuityParentBadge>
            ) : null}
          </ContinuityCurrentTop>
          <ContinuityCurrentTitle>{department.name}</ContinuityCurrentTitle>
          <ContinuityBarWrap>
            <ContinuityTrack>
              <ContinuityFill
                $pct={spanInfo.barPct}
                $ongoing={isOngoingDept}
              />
            </ContinuityTrack>
            <ContinuityDurLabel $ongoing={isOngoingDept}>
              {spanInfo.durationLabel}
            </ContinuityDurLabel>
          </ContinuityBarWrap>
        </ContinuityCenterNode>

        <ContinuitySlot $align="right">
          {department.successors.length > 0 ||
          (department.militaryUnitSuccessors?.length ?? 0) > 0 ? (
            <>
              {department.successors.map((succItem) => (
                <ContinuityNavLink
                  key={succItem.transitionId}
                  to={pathKeys.government.departmentDetail(
                    succItem.department.id,
                  )}
                  state={{ governmentListSearch: listSearch }}
                  $align="right"
                >
                  <ContinuitySlotTexts $align="right">
                    <ContinuityRoleLabel>
                      후신 기관 (
                      {TRANSITION_KIND_KO[succItem.kind] ?? succItem.kind}
                      {succItem.year ? ` · ${succItem.year}` : ''})
                    </ContinuityRoleLabel>
                    <ContinuityTargetName>
                      {succItem.department.name}
                    </ContinuityTargetName>
                  </ContinuitySlotTexts>
                  <FiArrowRight size={13} />
                </ContinuityNavLink>
              ))}
              {(department.militaryUnitSuccessors ?? []).map((milSucc) => (
                <ContinuityNavLink
                  key={milSucc.transitionId}
                  to={pathKeys.militaryUnitDetail(milSucc.militaryUnit.id)}
                  $align="right"
                >
                  <ContinuitySlotTexts $align="right">
                    <ContinuityRoleLabel>
                      군사 편제 이관 (
                      {TRANSITION_KIND_KO[milSucc.kind] ?? milSucc.kind}
                      {milSucc.year ? ` · ${milSucc.year}` : ''})
                    </ContinuityRoleLabel>
                    <ContinuityTargetName>
                      {milSucc.militaryUnit.name}
                    </ContinuityTargetName>
                  </ContinuitySlotTexts>
                  <FiArrowRight size={13} />
                </ContinuityNavLink>
              ))}
            </>
          ) : (
            <ContinuityMutedPlaceholder $align="right">
              <ContinuityRoleLabel>후신 기관</ContinuityRoleLabel>
              <span>
                {isOngoingDept
                  ? '현존 기관 (운영 중)'
                  : '기록된 후신 기관 없음'}
              </span>
            </ContinuityMutedPlaceholder>
          )}
        </ContinuitySlot>
      </ContinuityFlowStrip>

      {/* ─── 2-Column Body Grid (Left Main Narrative + Right Sticky Facts Rail) ─── */}
      <DetailBodyGrid>
        <DetailMainColumn>
          {/* Primary Section: 역대 장관 · 기관장 재임 목록 */}
          <SectionBlock>
            <SectionHeader>
              <SectionTitle>
                <FiUsers size={14} />
                <span>역대 장관 · 기관장 재임 목록</span>
              </SectionTitle>
              <SectionHeaderRight>
                <SectionCount>{tenures.length}명</SectionCount>
                <SmallAddBtn
                  type="button"
                  onClick={handleOpenCreateAppointment}
                >
                  <FiPlus size={12} />
                  <span>재임 추가</span>
                </SmallAddBtn>
              </SectionHeaderRight>
            </SectionHeader>

            {tenuresQuery.isLoading ? (
              <CompactEmptyHint>
                역대 재임 기록을 불러오는 중입니다…
              </CompactEmptyHint>
            ) : tenures.length === 0 ? (
              <CompactEmptyHint>
                <span>등록된 장관·기관장 재임 기록이 아직 없습니다.</span>
                <SmallAddBtn
                  type="button"
                  onClick={handleOpenCreateAppointment}
                >
                  <FiPlus size={12} />
                  <span>첫 수장·인사 임명하기</span>
                </SmallAddBtn>
              </CompactEmptyHint>
            ) : (
              <TenureTable>
                {tenures.map((tenureRow) => {
                  const personName = tenureRow.person
                    ? getPersonDisplayName(tenureRow.person)
                    : '인물 미상'
                  const posTitle =
                    tenureRow.title ??
                    tenureRow.positionDefinition?.title ??
                    '장관·기관장'
                  const linkedCabId =
                    tenureRow.cabinetId ?? tenureRow.cabinets?.[0]?.id ?? null
                  const linkedCabName = tenureRow.cabinets?.[0]?.name ?? null

                  return (
                    <TenureRowItem key={tenureRow.id}>
                      <TenurePeriodCol>
                        {formatIsoShortPeriod(
                          tenureRow.startDate,
                          tenureRow.endDate,
                          false,
                        )}
                      </TenurePeriodCol>
                      <TenurePersonBtn
                        type="button"
                        onClick={() => {
                          if (tenureRow.person?.id) {
                            setSelectedPersonId(tenureRow.person.id)
                          }
                        }}
                      >
                        {personName}
                      </TenurePersonBtn>
                      <TenureRoleCol>
                        {tenureRow.ordinal ? `제${tenureRow.ordinal}대 ` : ''}
                        {posTitle}
                      </TenureRoleCol>
                      <TenureCabCol>
                        {linkedCabId && (
                          <CabinetChipLink
                            to={pathKeys.government.cabinetDetail(linkedCabId)}
                            state={{ governmentListSearch: listSearch }}
                          >
                            {linkedCabName ?? '소속 내각 보기'} →
                          </CabinetChipLink>
                        )}
                        <TenureRowActionBtn
                          type="button"
                          title="재임 기록 수정"
                          aria-label={`${personName} 재임 기록 수정`}
                          onClick={() => handleOpenEditTenure(tenureRow)}
                        >
                          <FiEdit2 size={12} />
                        </TenureRowActionBtn>
                        <TenureRowActionBtn
                          type="button"
                          $danger
                          title="재임 기록 삭제"
                          aria-label={`${personName} 재임 기록 삭제`}
                          onClick={() => {
                            void handleDeleteTenure(tenureRow)
                          }}
                        >
                          <FiTrash2 size={12} />
                        </TenureRowActionBtn>
                      </TenureCabCol>
                    </TenureRowItem>
                  )
                })}
              </TenureTable>
            )}
          </SectionBlock>

          {hasLineage && (
            <SectionBlock>
              <SectionHeader>
                <SectionTitle>
                  <FiGitCommit size={14} />
                  <span>
                    상하위 편제 · 전후 계보
                    {department.militaryUnits.length > 0
                      ? ' · 직할 군부대'
                      : ''}
                  </span>
                </SectionTitle>
              </SectionHeader>

              <LineageGrid>
                {department.parent && (
                  <LineageCard
                    to={pathKeys.government.departmentDetail(
                      department.parent.id,
                    )}
                    state={{ governmentListSearch: listSearch }}
                  >
                    <LineageRole>상위 기관</LineageRole>
                    <LineageName>{department.parent.name}</LineageName>
                  </LineageCard>
                )}

                {department.children.map((childDept) => (
                  <LineageCard
                    key={childDept.id}
                    to={pathKeys.government.departmentDetail(childDept.id)}
                    state={{ governmentListSearch: listSearch }}
                  >
                    <LineageRole>산하 기관</LineageRole>
                    <LineageName>{childDept.name}</LineageName>
                  </LineageCard>
                ))}

                {department.predecessors.map((predItem) => (
                  <LineageCard
                    key={predItem.transitionId}
                    to={pathKeys.government.departmentDetail(
                      predItem.department.id,
                    )}
                    state={{ governmentListSearch: listSearch }}
                  >
                    <LineageRole>
                      전신 ({TRANSITION_KIND_KO[predItem.kind] ?? predItem.kind}
                      {predItem.year ? ` · ${predItem.year}` : ''})
                    </LineageRole>
                    <LineageName>← {predItem.department.name}</LineageName>
                  </LineageCard>
                ))}

                {department.successors.map((succItem) => (
                  <LineageCard
                    key={succItem.transitionId}
                    to={pathKeys.government.departmentDetail(
                      succItem.department.id,
                    )}
                    state={{ governmentListSearch: listSearch }}
                  >
                    <LineageRole>
                      후신 ({TRANSITION_KIND_KO[succItem.kind] ?? succItem.kind}
                      {succItem.year ? ` · ${succItem.year}` : ''})
                    </LineageRole>
                    <LineageName>{succItem.department.name} →</LineageName>
                  </LineageCard>
                ))}

                {(department.militaryUnitSuccessors ?? []).map((milSucc) => (
                  <LineageCard
                    key={milSucc.transitionId}
                    to={pathKeys.militaryUnitDetail(milSucc.militaryUnit.id)}
                  >
                    <LineageRole>
                      군사 편제 개편 (
                      {TRANSITION_KIND_KO[milSucc.kind] ?? milSucc.kind}
                      {milSucc.year ? ` · ${milSucc.year}` : ''})
                    </LineageRole>
                    <LineageName>
                      <FiShield size={12} /> {milSucc.militaryUnit.name} →
                    </LineageName>
                  </LineageCard>
                ))}

                {department.militaryUnits.map((unitItem) => (
                  <LineageCard
                    key={unitItem.id}
                    to={pathKeys.militaryUnitDetail(unitItem.id)}
                  >
                    <LineageRole>소속 군사 사령부·부대</LineageRole>
                    <LineageName>
                      <FiShield size={12} /> {unitItem.name}
                    </LineageName>
                  </LineageCard>
                ))}
              </LineageGrid>
            </SectionBlock>
          )}

          {deptEvents.length > 0 && (
            <SectionBlock>
              <SectionHeader>
                <SectionTitle>
                  <FiLayers size={14} />
                  <span>관여한 역사 사건</span>
                </SectionTitle>
                <SectionCount>{deptEvents.length}건</SectionCount>
              </SectionHeader>

              <LineageGrid>
                {deptEvents.map((evLink) => (
                  <LineageCard
                    key={evLink.relationId}
                    to={`/events/${evLink.event.id}`}
                  >
                    <LineageRole>
                      {EVENT_DEPARTMENT_ROLE_LABEL[
                        evLink.role as EventDepartmentRoleValue
                      ] ?? evLink.role}
                    </LineageRole>
                    <LineageName>{evLink.event.title}</LineageName>
                  </LineageCard>
                ))}
              </LineageGrid>
            </SectionBlock>
          )}

          {/* ─── Bottom Fill-In Action Strip (Events Detail Pattern) ─── */}
          {hasMissingSecondaryDomains ? (
            <FillInStrip>
              <FillInLabel>더 채울 수 있는 기록</FillInLabel>
              <FillInActions>
                {tenures.length === 0 ? (
                  <FillInBtn
                    type="button"
                    onClick={handleOpenCreateAppointment}
                  >
                    <FiPlus size={12} />
                    <span>수장 · 인사 임명</span>
                  </FillInBtn>
                ) : null}
                <FillInBtn
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                >
                  <FiEdit2 size={12} />
                  <span>기관 설명 · 계보 · 소재지 편집</span>
                </FillInBtn>
                {polity.countryGovernmentUrl && deptEvents.length === 0 ? (
                  <FillInLink to={polity.countryGovernmentUrl}>
                    <span>관여 사건 · 산하 편제 관리 ({polity.polityName})</span>
                    <FiArrowRight size={12} />
                  </FillInLink>
                ) : null}
              </FillInActions>
            </FillInStrip>
          ) : null}
        </DetailMainColumn>

        {/* ─── Right Sticky Facts Rail ─── */}
        <DetailFactsRail aria-label="기관 요약 팩트">
          <FactsCard>
            <FactsCardHeader>부처 · 국가기관 요약</FactsCardHeader>
            <FactsList>
              <FactRow>
                <FactKey>국가 · 정체</FactKey>
                <FactVal>
                  <PolityPillBtn
                    type="button"
                    $historical={polity.isHistorical}
                    onClick={() => {
                      if (polity.historicalCountryId) {
                        setCountryModalTarget({
                          kind: 'historical',
                          id: polity.historicalCountryId,
                          name: polity.polityName,
                        })
                      } else if (polity.modernCountryId) {
                        setCountryModalTarget({
                          kind: 'modern',
                          id: polity.modernCountryId,
                          name: polity.polityName,
                        })
                      }
                    }}
                  >
                    {polity.flagEmoji ? <span>{polity.flagEmoji}</span> : null}
                    <span>{polity.polityName}</span>
                  </PolityPillBtn>
                </FactVal>
              </FactRow>

              <FactRow>
                <FactKey>기관 종류</FactKey>
                <FactVal>
                  {DEPARTMENT_KIND_LABEL[department.kind] ?? department.kind}
                </FactVal>
              </FactRow>

              {department.category ? (
                <FactRow>
                  <FactKey>담당 분야</FactKey>
                  <FactVal>
                    <FactInlineLink
                      to={pathKeys.government.list({
                        tab: 'departments',
                        categoryId: department.category.id,
                      })}
                      title={`전 세계·시대별 「${department.category.name}」 직능 기관 비교 목록으로 이동`}
                    >
                      {department.category.name} · 타국 비교 →
                    </FactInlineLink>
                  </FactVal>
                </FactRow>
              ) : null}

              {department.parent ? (
                <FactRow>
                  <FactKey>상위 기관</FactKey>
                  <FactVal>
                    <FactInlineLink
                      to={pathKeys.government.departmentDetail(
                        department.parent.id,
                      )}
                      state={{ governmentListSearch: listSearch }}
                    >
                      {department.parent.name} →
                    </FactInlineLink>
                  </FactVal>
                </FactRow>
              ) : null}

              <FactRow>
                <FactKey>설립일</FactKey>
                <FactVal $mono>{spanInfo.startText}</FactVal>
              </FactRow>

              <FactRow>
                <FactKey>종료·상태</FactKey>
                <FactVal $mono>
                  {isOngoingDept
                    ? '현존 (운영 중)'
                    : isSuperseded
                      ? spanInfo.endText !== '—'
                        ? `${spanInfo.endText} (개편·이관)`
                        : '개편·이관'
                      : isAbolished
                        ? spanInfo.endText !== '—'
                          ? `${spanInfo.endText} (폐지)`
                          : '폐지'
                        : spanInfo.endText !== '—'
                          ? `${spanInfo.endText} (역사 기관)`
                          : '역사 기관'}
                </FactVal>
              </FactRow>

              <FactRow>
                <FactKey>존속 기간</FactKey>
                <FactVal $mono>
                  <FactDurationRow>
                    <ContinuityTrack>
                      <ContinuityFill
                        $pct={spanInfo.barPct}
                        $ongoing={isOngoingDept}
                      />
                    </ContinuityTrack>
                    <ContinuityDurLabel $ongoing={isOngoingDept}>
                      {spanInfo.durationLabel}
                    </ContinuityDurLabel>
                  </FactDurationRow>
                </FactVal>
              </FactRow>

              {effectiveHeadquarters ? (
                <FactRow>
                  <FactKey>본부 소재지</FactKey>
                  <FactVal>{effectiveHeadquarters}</FactVal>
                </FactRow>
              ) : null}

              <FactRow>
                <FactKey>역대 인사</FactKey>
                <FactVal $mono>{tenures.length}명</FactVal>
              </FactRow>

              {department.children.length > 0 ||
              department.militaryUnits.length > 0 ? (
                <FactRow>
                  <FactKey>산하 조직</FactKey>
                  <FactVal $mono>
                    {[
                      department.children.length > 0
                        ? `기관 ${department.children.length}개`
                        : null,
                      department.militaryUnits.length > 0
                        ? `군부대 ${department.militaryUnits.length}개`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </FactVal>
                </FactRow>
              ) : null}

              {deptEvents.length > 0 ? (
                <FactRow>
                  <FactKey>관여 사건</FactKey>
                  <FactVal $mono>{deptEvents.length}건</FactVal>
                </FactRow>
              ) : null}
            </FactsList>

            {polity.countryGovernmentUrl ? (
              <FactsFooterLink to={polity.countryGovernmentUrl}>
                <span>{polity.polityName} 전체 기관·부처 보기</span>
                <FiArrowRight size={12} />
              </FactsFooterLink>
            ) : null}
          </FactsCard>
        </DetailFactsRail>
      </DetailBodyGrid>

      <GovernmentDepartmentFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editingDepartment={department}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: ['global-department-detail', departmentId],
          })
          void queryClient.invalidateQueries({
            queryKey: ['global-departments'],
          })
        }}
      />

      <InstitutionAppointmentModal
        isOpen={appointModalOpen}
        onClose={() => {
          setAppointModalOpen(false)
          setEditingTenure(null)
        }}
        contextType="DEPARTMENT"
        countryId={polity.modernCountryId}
        historicalCountryId={polity.historicalCountryId}
        countryName={polity.polityName}
        departmentId={department.id}
        departmentName={department.name}
        departmentKind={department.kind}
        availableCabinets={polityCabinetsQuery.data ?? []}
        editingTenure={editingTenure}
        onSaved={() => {
          setEditingTenure(null)
          invalidateTenureQueries(queryClient)
          void queryClient.invalidateQueries({
            queryKey: ['administration-department-tenures', departmentId],
          })
          void queryClient.invalidateQueries({
            queryKey: ['global-departments'],
          })
        }}
      />

      <PersonInlineModal
        personId={selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        onEdit={() => setSelectedPersonId(null)}
      />

      <CountryInlineModal
        target={countryModalTarget}
        onClose={() => setCountryModalTarget(null)}
        onSwitch={(nextTarget) => setCountryModalTarget(nextTarget)}
      />
    </DetailShell>
  )
}

export default GovernmentDepartmentDetailPage

/* ─── Styled Components ─────────────────────────────────────────────────── */

const DetailShell = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px 28px 64px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const NavActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ActionPrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #4338ca;
  }
`

const ActionSecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CountryOpenLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
`

const HeroCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const HeroMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const MetaChips = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const PolityPillBtn = styled.button<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $historical }) =>
      $historical
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.32)'
          : 'rgba(180, 83, 9, 0.24)'
        : ledgerHairlineStrong(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.14)'
        : 'rgba(245, 158, 11, 0.1)'
      : ledgerChipFill(theme.mode)};
  color: ${({ theme, $historical }) =>
    $historical
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#b45309'
      : theme.colors.text.primary};

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const AccentPillLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition: border-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const NeutralPill = styled.span`
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroDurationChip = styled.span<{ $ongoing?: boolean }>`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: ${({ theme, $ongoing }) =>
    $ongoing ? 'rgba(16, 185, 129, 0.14)' : ledgerAccentSubtle(theme.mode)};
  color: ${({ theme, $ongoing }) =>
    $ongoing ? '#10b981' : ledgerAccent(theme.mode)};
`

const PeriodMono = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroMainRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`

const EmblemImg = styled.img`
  width: 56px;
  height: 56px;
  border-radius: ${RADIUS.SM};
  object-fit: contain;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
`

const EmblemFallback = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${RADIUS.SM};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const HeroInfoCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const HeroTitle = styled.h1`
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeroSubline = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroDescription = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaSpecGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const MetaSpecCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 13px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
`

const MetaSpecLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaSpecBody = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* ─── Continuity Flow Strip ─── */

const ContinuityFlowStrip = styled.nav`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 1.15fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
  padding: 10px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const ContinuitySlot = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  justify-content: center;
  gap: 4px;
  min-width: 0;
`

const ContinuityNavLink = styled(Link)<{ $align?: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  min-width: 0;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    background: ${({ theme }) => ledgerSurface(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const ContinuitySlotTexts = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  gap: 2px;
  min-width: 0;
`

const ContinuityRoleLabel = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContinuityTargetName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`

const ContinuityMutedPlaceholder = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  gap: 2px;
  padding: 8px 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContinuityCenterNode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  min-width: 0;
`

const ContinuityCurrentTop = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const ContinuityParentBadge = styled(Link)`
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ContinuityCurrentTitle = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`

const ContinuityBarWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 180px;
`

const ContinuityTrack = styled.span`
  flex: 1;
  min-width: 48px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  overflow: hidden;
`

const ContinuityFill = styled.span<{ $pct: number; $ongoing?: boolean }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => Math.max(8, Math.min(100, $pct))}%;
  border-radius: 999px;
  background: ${({ theme, $ongoing }) =>
    $ongoing ? '#10b981' : ledgerAccent(theme.mode)};
`

const ContinuityDurLabel = styled.span<{ $ongoing?: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $ongoing }) =>
    $ongoing ? '#10b981' : theme.colors.text.secondary};
  white-space: nowrap;
`

/* ─── 2-Column Body & Sticky Facts Rail ─── */

const DetailBodyGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const DetailMainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
`

const DetailFactsRail = styled.aside`
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 960px) {
    position: static;
    order: -1;
  }
`

const FactsCard = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const FactsCardHeader = styled.div`
  padding: 11px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const FactsList = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
`

const FactRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
  }
`

const FactKey = styled.dt`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const FactVal = styled.dd<{ $mono?: boolean }>`
  ${({ $mono }) => ($mono ? DIGIT_DISPLAY : '')}
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: right;
  min-width: 0;
`

const FactInlineLink = styled(Link)`
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;
  font-weight: 700;

  &:hover {
    text-decoration: underline;
  }
`

const FactDurationRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 110px;
`

const FactsFooterLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    filter: brightness(0.97);
  }
`

const SectionBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const SectionHeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

const SmallAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
`

const SectionTitle = styled.h2`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionCount = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
`

const LineageCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 14px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const LineageRole = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TenureTable = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const TenureRowItem = styled.div`
  display: grid;
  grid-template-columns: 150px 180px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 4px;
  }
`

const TenurePeriodCol = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TenurePersonBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const TenureRoleCol = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TenureCabCol = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
`

const TenureRowActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: ${RADIUS.XS};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    color 0.14s ease,
    border-color 0.14s ease,
    background 0.14s ease;

  &:hover {
    color: ${({ $danger, theme }) =>
      $danger ? '#ef4444' : ledgerAccent(theme.mode)};
    border-color: ${({ $danger, theme }) =>
      $danger ? 'rgba(239, 68, 68, 0.35)' : ledgerAccentBorder(theme.mode)};
    background: ${({ $danger, theme }) =>
      $danger ? 'rgba(239, 68, 68, 0.08)' : ledgerHoverFill(theme.mode)};
  }
`

const CabinetChipLink = styled(Link)`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CompactEmptyHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FillInStrip = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 15px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : '#f8fafc'};
`

const FillInLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FillInActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const FillInBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const FillInLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
`

const EmptyCard = styled.div`
  padding: 28px 18px;
  text-align: center;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
