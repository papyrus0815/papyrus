import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiCalendar,
  FiExternalLink,
  FiGlobe,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getApiConnection } from '@/shared/api/client'
import {
  buildSeriesModalLaunchPayload,
  type EventSeriesItem,
  FORECAST_KIND_BADGE,
  listEventSeries,
  type SeriesModalLaunchPayload,
} from '@/shared/api/event-series'
import {
  addOrganizationCountryMembership,
  type CountryOrganizationMembershipDto,
  getCountryOrganizationMemberships,
  getOrganizations,
  INTERNATIONAL_ORG_TYPES,
  ORGANIZATION_COUNTRY_ROLE_LABEL,
  ORGANIZATION_TYPE_LABEL,
  type OrganizationCountryRole,
  removeOrganizationCountryMembership,
} from '@/shared/api/organizations'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { EventRegisterModal } from '@/widgets/event-form/ui/event-register-modal'

interface CountryInternationalOrgsSectionProps {
  country: UnifiedCountry
}

const ROLE_OPTIONS: OrganizationCountryRole[] = [
  'FOUNDER',
  'MEMBER',
  'DIALOGUE_PARTNER',
  'OBSERVER',
  'SECRETARIAT_HOST',
  'SUSPENDED',
  'EXPELLED',
  'OTHER',
]

function formatPeriodLabel(row: CountryOrganizationMembershipDto): string {
  const fmt = (era: 'BC' | 'AD' | null, yr: number | null) => {
    if (yr == null) return null
    return era === 'BC' ? `BC ${yr}년` : `${yr}년`
  }
  const startLabel = fmt(row.startEra, row.startYear)
  const endLabel = fmt(row.endEra, row.endYear)
  if (!startLabel && !endLabel) return '기간 미상'
  if (startLabel && !endLabel) return `${startLabel} ~ 현재`
  if (!startLabel && endLabel) return `~ ${endLabel}`
  return `${startLabel} ~ ${endLabel}`
}

export const CountryInternationalOrgsSection: React.FC<
  CountryInternationalOrgsSectionProps
> = ({ country }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const countryId = country.type === 'modern' ? country.id : undefined
  const historicalCountryId =
    country.type === 'historical' ? country.id : undefined

  const [addingOpen, setAddingOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedRole, setSelectedRole] =
    useState<OrganizationCountryRole>('MEMBER')
  const [joinYear, setJoinYear] = useState('')
  const [modalPrefill, setModalPrefill] =
    useState<SeriesModalLaunchPayload | null>(null)

  const membershipsQuery = useQuery({
    queryKey: ['country-org-memberships', countryId, historicalCountryId],
    queryFn: () =>
      getCountryOrganizationMemberships(getApiConnection(), {
        countryId,
        historicalCountryId,
      }),
    enabled: Boolean(countryId || historicalCountryId),
  })

  const hostedSeriesQuery = useQuery({
    queryKey: ['event-series', 'hosted-by-country', countryId],
    queryFn: () => listEventSeries({ hostedByCountryId: countryId }),
    enabled: Boolean(countryId),
  })

  const candidateOrgsQuery = useQuery({
    queryKey: ['organizations', 'international-candidates'],
    queryFn: () =>
      getOrganizations(getApiConnection(), { types: INTERNATIONAL_ORG_TYPES }),
    enabled: addingOpen,
    staleTime: 60_000,
  })

  const memberships = useMemo(
    () =>
      (membershipsQuery.data ?? []).filter(
        (member) => member.organization.type !== 'COMPANY',
      ),
    [membershipsQuery.data],
  )
  const upcomingHostedSeries = hostedSeriesQuery.data ?? []

  const availableOrgs = useMemo(() => {
    const joinedIds = new Set(
      memberships.map((member) => member.organizationId),
    )
    return (candidateOrgsQuery.data ?? []).filter(
      (org) => !joinedIds.has(org.id),
    )
  }, [candidateOrgsQuery.data, memberships])

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) throw new Error('가입 기구·협의체를 선택하세요.')
      const yr = joinYear.trim() ? Number.parseInt(joinYear.trim(), 10) : null
      return addOrganizationCountryMembership(getApiConnection(), selectedOrgId, {
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        role: selectedRole,
        startEra: yr != null && yr < 0 ? 'BC' : yr != null ? 'AD' : null,
        startYear: yr != null && Number.isFinite(yr) ? Math.abs(yr) : null,
      })
    },
    onSuccess: () => {
      notify.success(`${country.name}의 가입 기구·협의체를 연결했습니다.`)
      setSelectedOrgId('')
      setJoinYear('')
      setAddingOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['country-org-memberships'],
      })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (err) =>
      notify.error(
        err instanceof Error ? err.message : '가입 기구 연결에 실패했습니다.',
      ),
  })

  const handleRemove = async (row: CountryOrganizationMembershipDto) => {
    const ok = await confirm({
      title: '가입 기록 해제',
      message: `${country.name}을(를) ‘${row.organization.name}’ 회원국 목록에서 제외할까요?`,
      confirmLabel: '제외',
      danger: true,
    })
    if (!ok) return
    try {
      await removeOrganizationCountryMembership(
        getApiConnection(),
        row.organizationId,
        row.id,
      )
      notify.success('가입 기록을 해제했습니다.')
      void queryClient.invalidateQueries({
        queryKey: ['country-org-memberships'],
      })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch {
      notify.error('가입 기록 해제에 실패했습니다.')
    }
  }

  return (
    <SectionWrap aria-label="가입 국제기구 및 다자협의체">
      <SectionHead>
        <HeadTitleGroup>
          <HeadTitle>
            <FiGlobe size={15} />
            가입 국제기구 · 다자협의체 · 동맹
            {memberships.length > 0 && (
              <CountPill>{memberships.length}</CountPill>
            )}
          </HeadTitle>
          <HeadDesc>
            {country.name}이(가) 참여하는 국제기구(UN·WTO·아세안 등), 다자 협의체(쿼드·APEC·G7·G20 등), 군사동맹 및 차기 의장국 일정을 한곳에서 확인합니다.
          </HeadDesc>
        </HeadTitleGroup>

        <HeadActions>
          <SecondaryBtn
            type="button"
            onClick={() => navigate('/organizations?view=international')}
          >
            <FiExternalLink size={13} />
            국제·기구 허브
          </SecondaryBtn>
          <PrimaryOutlineBtn
            type="button"
            onClick={() => setAddingOpen((prev) => !prev)}
          >
            <FiPlus size={13} />
            가입 기구 연결
          </PrimaryOutlineBtn>
        </HeadActions>
      </SectionHead>

      {addingOpen && (
        <QuickAddBar>
          <QuickSelect
            aria-label="연결할 국제기구 또는 다자협의체 선택"
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
          >
            <option value="">국제기구·다자협의체·동맹 선택…</option>
            {availableOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
                {org.shortName ? ` (${org.shortName})` : ''} ·{' '}
                {ORGANIZATION_TYPE_LABEL[org.type] ?? org.type}
              </option>
            ))}
          </QuickSelect>
          <QuickSelect
            aria-label="참여 지위 선택"
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value as OrganizationCountryRole)
            }
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ORGANIZATION_COUNTRY_ROLE_LABEL[role]}
              </option>
            ))}
          </QuickSelect>
          <QuickYearInput
            type="number"
            placeholder="가입 연도 (예: 1989)"
            value={joinYear}
            onChange={(e) => setJoinYear(e.target.value)}
          />
          <SaveSmallBtn
            type="button"
            disabled={!selectedOrgId || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? '연결 중…' : '연결'}
          </SaveSmallBtn>
          <CancelSmallBtn type="button" onClick={() => setAddingOpen(false)}>
            취소
          </CancelSmallBtn>
        </QuickAddBar>
      )}

      {upcomingHostedSeries.length > 0 && (
        <HostedBanner aria-label="차기 의장국 및 개최 예정 정기 회의">
          <HostedBannerLabel>
            <FiCalendar size={13} />
            차기 개최 · 의장국 예정 회의 ({upcomingHostedSeries.length}건)
          </HostedBannerLabel>
          <HostedSeriesList>
            {upcomingHostedSeries.map((series: EventSeriesItem) => {
              const badge = FORECAST_KIND_BADGE[series.forecast.kind]
              return (
                <HostedSeriesItem key={series.id}>
                  <HostedSeriesInfo>
                    <Link
                      to={
                        series.organizationId
                          ? `/organizations?selected=${encodeURIComponent(series.organizationId)}&tab=series`
                          : `/organizations?view=series`
                      }
                    >
                      <strong>{series.title}</strong>
                    </Link>
                    <HostedKindTag $Estimated={Boolean(series.forecast.hostCountryIsEstimated)}>
                      {series.forecast.hostCountryIsEstimated
                        ? '순번 의장국 예상'
                        : badge.label}
                    </HostedKindTag>
                    <HostedHeadline>{series.forecast.headline}</HostedHeadline>
                  </HostedSeriesInfo>
                  <div>
                    {series.forecast.scheduledEventId ? (
                      <SmallSeriesLink
                        to={pathKeys.events.detail(
                          series.forecast.scheduledEventId,
                        )}
                      >
                        예정 사건 보기 →
                      </SmallSeriesLink>
                    ) : (
                      <SmallCreateBtn
                        type="button"
                        onClick={() =>
                          setModalPrefill(buildSeriesModalLaunchPayload(series))
                        }
                      >
                        <FiPlus size={12} /> 차기 회차 등록
                      </SmallCreateBtn>
                    )}
                  </div>
                </HostedSeriesItem>
              )
            })}
          </HostedSeriesList>
        </HostedBanner>
      )}

      {membershipsQuery.isLoading ? (
        <EmptyLine>가입 기구 목록을 불러오는 중…</EmptyLine>
      ) : memberships.length === 0 ? (
        <EmptyLine>
          아직 연결된 국제기구·다자협의체·동맹이 없습니다. 상단{' '}
          <strong>가입 기구 연결</strong> 또는 <strong>국제·기구 허브</strong>에서 회원국으로 추가하면 자동으로 표시됩니다.
        </EmptyLine>
      ) : (
        <OrgGrid>
          {memberships.map((row) => (
            <OrgCard key={row.id}>
              <OrgCardTop>
                <OrgNameBlock>
                  <OrgLink
                    to={`/organizations?selected=${encodeURIComponent(row.organization.id)}`}
                  >
                    {row.organization.name}
                    {row.organization.shortName && (
                      <OrgShort>({row.organization.shortName})</OrgShort>
                    )}
                  </OrgLink>
                  <OrgSubMeta>
                    <span>
                      {ORGANIZATION_TYPE_LABEL[row.organization.type] ??
                        row.organization.type}
                    </span>
                    {row.organization.countryMemberCount > 0 && (
                      <span>· 회원 {row.organization.countryMemberCount}개국</span>
                    )}
                    {row.organization.eventSeriesCount > 0 && (
                      <span>
                        · 정기회의 {row.organization.eventSeriesCount}종
                      </span>
                    )}
                  </OrgSubMeta>
                </OrgNameBlock>

                <OrgRightMeta>
                  <RoleBadge $role={row.role}>
                    {ORGANIZATION_COUNTRY_ROLE_LABEL[row.role] ?? row.role}
                  </RoleBadge>
                  <RemoveIconBtn
                    type="button"
                    title="가입 기록 해제"
                    onClick={() => void handleRemove(row)}
                  >
                    <FiTrash2 size={12} />
                  </RemoveIconBtn>
                </OrgRightMeta>
              </OrgCardTop>

              <PeriodLine>
                <span>참여 기간: {formatPeriodLabel(row)}</span>
                {row.notes && <span>· {row.notes}</span>}
              </PeriodLine>

              {row.statusHistory && row.statusHistory.length > 0 && (
                <HistoryFlow aria-label="지위 변천 이력">
                  {row.statusHistory.map((phase, idx) => (
                    <HistoryStep key={idx}>
                      {idx > 0 && <span aria-hidden>→ </span>}
                      <strong>
                        {ORGANIZATION_COUNTRY_ROLE_LABEL[phase.role] ??
                          phase.role}
                      </strong>
                      {(phase.startYear || phase.endYear) && (
                        <span>
                          {' '}
                          (
                          {phase.startYear
                            ? `${phase.startEra === 'BC' ? 'BC ' : ''}${phase.startYear}`
                            : ''}
                          ~
                          {phase.endYear
                            ? `${phase.endEra === 'BC' ? 'BC ' : ''}${phase.endYear}`
                            : '현재'}
                          )
                        </span>
                      )}
                    </HistoryStep>
                  ))}
                </HistoryFlow>
              )}
            </OrgCard>
          ))}
        </OrgGrid>
      )}

      {modalPrefill && (
        <EventRegisterModal
          isOpen
          onClose={() => setModalPrefill(null)}
          initialDomain={modalPrefill.initialDomain}
          initialEventType={modalPrefill.initialEventType}
          initialCountries={modalPrefill.initialCountries}
          initialSeriesPrefill={modalPrefill.initialSeriesPrefill}
        />
      )}
    </SectionWrap>
  )
}

const SectionWrap = styled.section`
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const HeadTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const HeadTitle = styled.h3`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) => `${theme.colors.primary}14`};
  color: ${({ theme }) => theme.colors.primary};
`

const HeadDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeadActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`

const PrimaryOutlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}45`};
  background: ${({ theme }) => `${theme.colors.primary}0d`};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}18`};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const QuickAddBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const QuickSelect = styled.select`
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
`

const QuickYearInput = styled.input`
  width: 140px;
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;
`

const SaveSmallBtn = styled.button`
  height: 34px;
  padding: 0 13px;
  border-radius: 7px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const CancelSmallBtn = styled.button`
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  cursor: pointer;
`

const HostedBanner = styled.div`
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.3)'
        : 'rgba(16, 185, 129, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.08)'
      : 'rgba(16, 185, 129, 0.05)'};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const HostedBannerLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
`

const HostedSeriesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const HostedSeriesItem = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
`

const HostedSeriesInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  a {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`

const HostedKindTag = styled.span<{ $Estimated: boolean }>`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $Estimated, theme }) =>
    $Estimated
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.22)'
        : 'rgba(79,70,229,0.12)'
      : theme.mode === 'dark'
        ? 'rgba(16,185,129,0.22)'
        : 'rgba(16,185,129,0.14)'};
  color: ${({ $Estimated, theme }) =>
    $Estimated
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#4338ca'
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};
`

const HostedHeadline = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SmallSeriesLink = styled(Link)`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
`

const SmallCreateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
`

const EmptyLine = styled.div`
  padding: 18px 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OrgGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const OrgCard = styled.div`
  padding: 15px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 0.14s ease;

  &:nth-child(odd) {
    border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  @media (max-width: 860px) {
    &:nth-child(odd) {
      border-right: none;
    }
  }
`

const OrgCardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

const OrgNameBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const OrgLink = styled(Link)`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const OrgShort = styled.span`
  margin-left: 4px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const OrgSubMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OrgRightMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const RoleBadge = styled.span<{ $role: OrganizationCountryRole }>`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $role, theme }) =>
    $role === 'FOUNDER'
      ? theme.mode === 'dark'
        ? 'rgba(245,158,11,0.2)'
        : '#fef3c7'
      : $role === 'SUSPENDED' || $role === 'EXPELLED'
        ? theme.mode === 'dark'
          ? 'rgba(244,63,94,0.2)'
          : '#ffe4e6'
        : theme.mode === 'dark'
          ? 'rgba(99,102,241,0.2)'
          : '#eef2ff'};
  color: ${({ $role, theme }) =>
    $role === 'FOUNDER'
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#92400e'
      : $role === 'SUSPENDED' || $role === 'EXPELLED'
        ? theme.mode === 'dark'
          ? '#fda4af'
          : '#be123c'
        : theme.mode === 'dark'
          ? '#c7d2fe'
          : '#3730a3'};
`

const RemoveIconBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 3px;
  cursor: pointer;
  display: inline-flex;
  &:hover {
    color: #ef4444;
  }
`

const PeriodLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HistoryFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HistoryStep = styled.span`
  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
