import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiColumns,
  FiGitCommit,
  FiLayers,
  FiMapPin,
  FiShield,
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
  DEPARTMENT_KIND_LABEL,
  EVENT_DEPARTMENT_ROLE_LABEL,
  type EventDepartmentRoleValue,
} from '@/shared/api/administration-department'
import { getUploadImageUrl } from '@/shared/api/upload'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { parseDepartmentDescription } from '@/shared/lib/ministry-department/ministry-department-utils'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

import {
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
  const listSearch = readGovernmentListSearch(location.state)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

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

  if (!department) {
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

  const polity = resolveDepartmentPolityInfo(department)
  const periodLabel = formatIsoShortPeriod(
    department.establishedDate,
    department.abolishedDate,
    !polity.isHistorical && !department.abolished,
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

  return (
    <DetailShell>
      <TopNavBar>
        <BackBtn type="button" onClick={() => navigate(backUrl)}>
          <FiArrowLeft size={14} />
          <span>전 국가 부처·기관 목록</span>
        </BackBtn>

        {polity.countryGovernmentUrl && (
          <CountryOpenLink to={polity.countryGovernmentUrl}>
            <span>{polity.polityName} 정부·행정 탭에서 열기·편집</span>
            <FiArrowRight size={13} />
          </CountryOpenLink>
        )}
      </TopNavBar>

      <HeroCard>
        <HeroMetaRow>
          <MetaChips>
            <PolityPill $historical={polity.isHistorical}>
              <span>
                {polity.flagEmoji ?? (polity.isHistorical ? '🏛️' : '🏳️')}
              </span>
              <span>{polity.polityName}</span>
            </PolityPill>
            {department.category && (
              <AccentPill>{department.category.name}</AccentPill>
            )}
            <NeutralPill>
              {DEPARTMENT_KIND_LABEL[department.kind] ?? department.kind}
            </NeutralPill>
          </MetaChips>

          <PeriodMono>
            <FiCalendar size={12} />
            <span>{periodLabel}</span>
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
            {effectiveHeadquarters && (
              <HeroLocation>
                <FiMapPin size={12} />
                <span>본부·소재지: {effectiveHeadquarters}</span>
              </HeroLocation>
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

      {hasLineage && (
        <SectionBlock>
          <SectionHeader>
            <SectionTitle>
              <FiGitCommit size={14} />
              <span>상하위 편제 · 전후 계보 · 직할 군부대</span>
            </SectionTitle>
          </SectionHeader>

          <LineageGrid>
            {department.parent && (
              <LineageCard
                to={pathKeys.government.departmentDetail(department.parent.id)}
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
                  군사 편제 개편 ({TRANSITION_KIND_KO[milSucc.kind] ?? milSucc.kind}
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

      <SectionBlock>
        <SectionHeader>
          <SectionTitle>
            <FiUsers size={14} />
            <span>역대 장관 · 기관장 재임 목록</span>
          </SectionTitle>
          <SectionCount>{tenures.length}명</SectionCount>
        </SectionHeader>

        {tenuresQuery.isLoading ? (
          <EmptyCard>역대 재임 기록을 불러오는 중입니다…</EmptyCard>
        ) : tenures.length === 0 ? (
          <EmptyCard>등록된 장관·기관장 재임 기록이 없습니다.</EmptyCard>
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
                  <TenureRoleCol>{posTitle}</TenureRoleCol>
                  <TenureCabCol>
                    {linkedCabId && (
                      <CabinetChipLink
                        to={pathKeys.government.cabinetDetail(linkedCabId)}
                        state={{ governmentListSearch: listSearch }}
                      >
                        {linkedCabName ?? '소속 내각 보기'} →
                      </CabinetChipLink>
                    )}
                  </TenureCabCol>
                </TenureRowItem>
              )
            })}
          </TenureTable>
        )}
      </SectionBlock>

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

      <PersonInlineModal
        personId={selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        onEdit={() => setSelectedPersonId(null)}
      />
    </DetailShell>
  )
}

export default GovernmentDepartmentDetailPage

/* ─── Styled Components ─────────────────────────────────────────────────── */

const DetailShell = styled.div`
  max-width: 1020px;
  margin: 0 auto;
  padding: 24px 28px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

const CountryOpenLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
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

const PolityPill = styled.span<{ $historical: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: ${RADIUS.SM};
  font-size: 12px;
  font-weight: 700;
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
`

const AccentPill = styled.span`
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const NeutralPill = styled.span`
  padding: 3px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PeriodMono = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 5px;
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

const HeroLocation = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  justify-content: flex-end;
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

const EmptyCard = styled.div`
  padding: 28px 18px;
  text-align: center;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
