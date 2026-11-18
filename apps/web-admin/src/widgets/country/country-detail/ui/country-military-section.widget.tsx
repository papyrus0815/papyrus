import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiBarChart2,
  FiCheck,
  FiExternalLink,
  FiMoreHorizontal,
  FiPlus,
} from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  ledgerElevated,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import { useConstituentHistoricalPolities } from '@/features/government-info/model/use-constituent-historical-polities'
import { GovernmentMilitaryTab } from '@/features/government-info/ui/government-military-tab.widget'
import { EVENTS_LIMIT_ALL, getAllEvents } from '@/shared/api/events'
import { type MilitaryUnit, militaryUnitApi } from '@/shared/api/military-unit'
import {
  administrationDepartmentsByCountryQueryKey,
  administrationDepartmentsByHistoricalCountryQueryKey,
} from '@/shared/lib/ministry-department/ministry-department-query-keys'
import { pathKeys } from '@/shared/router'
import { AddButton } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabBadge,
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import * as DashboardStyles from './country-detail-dashboard.styles'
import {
  countryTabCanvasPadding,
  LedgerIconButton,
} from './country-ledger-primitives'
import { CountryMilitaryWarsPanel } from './country-military-wars-panel'
import { MilitaryUnitFormModal } from './military-unit-form.modal'

export interface CountryMilitarySectionProps {
  country: UnifiedCountry
}

type MilitarySubTab = 'units' | 'wars'

const HIGH_AND_OPERATIONAL_TYPES = new Set<string>([
  'SUPREME_COMMAND',
  'GENERAL_STAFF',
  'SERVICE_HQ',
  'THEATER',
  'ARMY_GROUP',
  'FRONT',
  'MILITARY_DISTRICT',
  'FIELD_ARMY',
  'FLEET',
  'AIR_FLEET',
  'CORPS',
  'AIR_CORPS',
])

export function CountryMilitarySection({
  country,
}: CountryMilitarySectionProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isHistorical = country.type === 'historical'

  const unitIdQuery = searchParams.get('unitId')?.trim() || ''
  const subQuery: MilitarySubTab =
    searchParams.get('sub') === 'wars' && !unitIdQuery ? 'wars' : 'units'

  const [focusMilitaryUnitId, setFocusMilitaryUnitId] = useState<string | null>(
    unitIdQuery || null,
  )
  const [militaryUnitModalOpen, setMilitaryUnitModalOpen] = useState(false)
  const [militaryUnitEditingId, setMilitaryUnitEditingId] = useState<
    string | null
  >(null)
  const [militaryDeptDefaultId, setMilitaryDeptDefaultId] = useState<
    string | null
  >(null)
  const [militaryParentDefaultId, setMilitaryParentDefaultId] = useState<
    string | null
  >(null)
  const [militaryHistCountryDefaultId, setMilitaryHistCountryDefaultId] =
    useState<string | null>(null)
  const [militaryBranchDefault, setMilitaryBranchDefault] = useState<
    string | null
  >(null)
  const [showHeadlineStats, setShowHeadlineStats] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  useEffect(() => {
    if (!headerMenuOpen) return
    const handlePointerDown = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement | null
      if (target?.closest('[data-country-military-menu]')) return
      setHeaderMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [headerMenuOpen])

  useEffect(() => {
    if (unitIdQuery) {
      setFocusMilitaryUnitId(unitIdQuery)
    }
  }, [unitIdQuery])

  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      !isHistorical && country.id ? country.id : '',
    )

  const { data: constituentPolities = [] } = useConstituentHistoricalPolities(
    isHistorical && country.id ? country.id : undefined,
  )

  const relatedHistoricalIds = useMemo(() => {
    const idSet = new Set<string>()
    if (isHistorical) {
      for (const item of constituentPolities) {
        if (item.id) idSet.add(item.id)
      }
    } else {
      for (const item of country.historicalCountries ?? []) {
        if (item.id) idSet.add(item.id)
      }
      for (const item of linkedHistoricalCountries) {
        if (item.id) idSet.add(item.id)
      }
    }
    return [...idSet].sort()
  }, [
    isHistorical,
    constituentPolities,
    country.historicalCountries,
    linkedHistoricalCountries,
  ])

  const relatedHistKey = relatedHistoricalIds.join(',')

  // GovernmentMilitaryTab과 동일한 캐시 키를 사용하여 중복 요청 방지
  const unitsSummaryQuery = useQuery({
    queryKey: [
      'military-units',
      'country-scope',
      isHistorical ? 'hist' : 'mod',
      country.id,
      relatedHistKey,
    ],
    queryFn: async () => {
      if (isHistorical) {
        const histIds = Array.from(
          new Set([country.id, ...relatedHistoricalIds]),
        )
        const results = await Promise.all(
          histIds.map((hid) =>
            militaryUnitApi.getAll({ historicalCountryId: hid }),
          ),
        )
        const dedup = new Map<string, MilitaryUnit>()
        for (const batch of results) {
          for (const unitItem of batch) dedup.set(unitItem.id, unitItem)
        }
        return [...dedup.values()]
      }
      const results = await Promise.all([
        militaryUnitApi.getAll({ countryId: country.id }),
        ...relatedHistoricalIds.map((hid) =>
          militaryUnitApi.getAll({ historicalCountryId: hid }),
        ),
      ])
      const dedup = new Map<string, MilitaryUnit>()
      for (const batch of results) {
        for (const unitItem of batch) dedup.set(unitItem.id, unitItem)
      }
      return [...dedup.values()]
    },
    staleTime: 1000 * 60 * 2,
  })

  const militaryEventsSummaryQuery = useQuery({
    queryKey: [
      'country-military-events',
      country.type,
      country.id,
      isHistorical ? relatedHistKey : 'auto-linked',
    ],
    queryFn: async () => {
      if (isHistorical) {
        const targetIds = Array.from(
          new Set([country.id, ...relatedHistoricalIds]),
        )
        return getAllEvents({
          historicalCountryIds: targetIds,
          domain: 'MILITARY',
          includeSubEvents: true,
          limit: EVENTS_LIMIT_ALL,
        })
      }
      // 현대 국가는 백엔드 EventController.getAllEvents에서 연결된 역사국가 ID를 자동 병합함
      return getAllEvents({
        countryId: country.id,
        domain: 'MILITARY',
        includeSubEvents: true,
        limit: EVENTS_LIMIT_ALL,
      })
    },
    staleTime: 60_000,
  })

  const headlineStats = useMemo(() => {
    const units = (unitsSummaryQuery.data ?? []) as Array<
      Omit<MilitaryUnit, 'tenures' | 'commanders' | 'sideDeployedUnits'> & {
        tenures?: Array<{ id: string }>
        commanders?: Array<{ id: string; tenureId?: string | null }>
        sideDeployedUnits?: Array<{ id: string }>
      }
    >
    let highCommandAndOps = 0
    let commanderTenures = 0
    let orbatDeployments = 0

    for (const unitItem of units) {
      if (unitItem.unitType && HIGH_AND_OPERATIONAL_TYPES.has(unitItem.unitType)) {
        highCommandAndOps += 1
      }
      const tCount = unitItem.tenures?.length ?? 0
      const legacyCount = (unitItem.commanders ?? []).filter(
        (cmdItem) => !cmdItem.tenureId,
      ).length
      commanderTenures += tCount + legacyCount
      orbatDeployments += unitItem.sideDeployedUnits?.length ?? 0
    }

    const milEvents = militaryEventsSummaryQuery.data ?? []
    const warCount = milEvents.filter((ev) => ev.type === 'WAR').length

    return {
      totalUnits: units.length,
      highCommandAndOps,
      commanderTenures,
      orbatDeployments,
      totalMilitaryEvents: milEvents.length,
      warCount,
    }
  }, [unitsSummaryQuery.data, militaryEventsSummaryQuery.data])

  const syncSelectedUnitParam = useCallback(
    (unitId: string | null) => {
      const nextParams = new URLSearchParams(searchParams)
      if (unitId) {
        nextParams.set('unitId', unitId)
        nextParams.delete('sub')
      } else {
        nextParams.delete('unitId')
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleSubTabChange = (nextTab: MilitarySubTab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab === 'wars') {
      nextParams.set('sub', 'wars')
      nextParams.delete('unitId')
    } else {
      nextParams.delete('sub')
    }
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <SectionCanvas aria-label="군사 사령부 및 전쟁사">
        <HeaderBar>
          <UnderlineTabNav aria-label="군사 하위 지면" style={{ flex: 1, borderBottom: 'none' }}>
            <UnderlineTabButton
              type="button"
              $active={subQuery === 'units'}
              onClick={() => handleSubTabChange('units')}
            >
              <span>편제 · 사령부</span>
              <UnderlineTabBadge $active={subQuery === 'units'}>
                {headlineStats.totalUnits.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
            <UnderlineTabButton
              type="button"
              $active={subQuery === 'wars'}
              onClick={() => handleSubTabChange('wars')}
            >
              <span>전쟁 · 참전사</span>
              <UnderlineTabBadge $active={subQuery === 'wars'}>
                {headlineStats.totalMilitaryEvents.toLocaleString('ko-KR')}
              </UnderlineTabBadge>
            </UnderlineTabButton>
          </UnderlineTabNav>

          <HeaderActions data-country-military-menu>
            {subQuery === 'wars' ? (
              <AddButton
                type="button"
                onClick={() => navigate(pathKeys.events.create())}
              >
                <FiPlus size={14} /> 군사 사건 등록
              </AddButton>
            ) : (
              <AddButton
                type="button"
                onClick={() => {
                  setMilitaryUnitEditingId(null)
                  setMilitaryDeptDefaultId(null)
                  setMilitaryParentDefaultId(null)
                  setMilitaryHistCountryDefaultId(
                    isHistorical ? country.id : null,
                  )
                  setMilitaryBranchDefault(null)
                  setMilitaryUnitModalOpen(true)
                }}
              >
                <FiPlus size={14} /> 사령부·부대 등록
              </AddButton>
            )}

            <HeaderMenuWrap>
              <LedgerIconButton
                type="button"
                aria-label="군사 화면 설정 및 이동 메뉴"
                aria-expanded={headerMenuOpen}
                title="요약 지표 표시 · 군사 카탈로그 이동"
                onClick={() => setHeaderMenuOpen((prev) => !prev)}
              >
                <FiMoreHorizontal size={16} />
              </LedgerIconButton>

              {headerMenuOpen ? (
                <HeaderDropdownMenu role="menu">
                  <HeaderDropdownItem
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowHeadlineStats((prev) => !prev)
                      setHeaderMenuOpen(false)
                    }}
                  >
                    <FiBarChart2 size={13} />
                    <span>요약 지표 카드 표시</span>
                    {showHeadlineStats ? (
                      <FiCheck size={13} style={{ marginLeft: 'auto' }} />
                    ) : null}
                  </HeaderDropdownItem>
                  <HeaderDropdownItem
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      if (subQuery === 'wars') {
                        setMilitaryUnitEditingId(null)
                        setMilitaryDeptDefaultId(null)
                        setMilitaryParentDefaultId(null)
                        setMilitaryHistCountryDefaultId(
                          isHistorical ? country.id : null,
                        )
                        setMilitaryBranchDefault(null)
                        setMilitaryUnitModalOpen(true)
                      } else {
                        navigate(pathKeys.events.create())
                      }
                    }}
                  >
                    <FiPlus size={13} />
                    <span>
                      {subQuery === 'wars'
                        ? '사령부·부대 등록'
                        : '군사 사건 등록'}
                    </span>
                  </HeaderDropdownItem>
                  <HeaderDropdownDivider />
                  <HeaderDropdownItem
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false)
                      navigate(
                        `${pathKeys.military()}?country=${encodeURIComponent(country.name)}`,
                      )
                    }}
                  >
                    <FiExternalLink size={13} />
                    <span>전체 군사 카탈로그에서 보기</span>
                  </HeaderDropdownItem>
                </HeaderDropdownMenu>
              ) : null}
            </HeaderMenuWrap>
          </HeaderActions>
        </HeaderBar>

        {showHeadlineStats ? (
          <DashboardStyles.SectionHeadlineStrip aria-label="군사 전력 요약 지표">
            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                전체 사령부 · 편제
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.totalUnits === 0}
              >
                {headlineStats.totalUnits > 0 ? (
                  <>
                    {headlineStats.totalUnits.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      개
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '미등록'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>

            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                상급지휘부 · 작전제대
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.highCommandAndOps === 0}
              >
                {headlineStats.highCommandAndOps > 0 ? (
                  <>
                    {headlineStats.highCommandAndOps.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      개
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '없음'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>

            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                역대 지휘관 · 참모
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.commanderTenures === 0}
              >
                {headlineStats.commanderTenures > 0 ? (
                  <>
                    {headlineStats.commanderTenures.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      건
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '미등록'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>

            <DashboardStyles.SectionHeadlineCell>
              <DashboardStyles.SectionHeadlineLabel>
                참전 · 관여 군사사건
              </DashboardStyles.SectionHeadlineLabel>
              <DashboardStyles.SectionHeadlineValue
                $muted={headlineStats.totalMilitaryEvents === 0}
              >
                {headlineStats.totalMilitaryEvents > 0 ? (
                  <>
                    {headlineStats.totalMilitaryEvents.toLocaleString('ko-KR')}
                    <DashboardStyles.SectionHeadlineUnit>
                      건
                    </DashboardStyles.SectionHeadlineUnit>
                  </>
                ) : (
                  '없음'
                )}
              </DashboardStyles.SectionHeadlineValue>
            </DashboardStyles.SectionHeadlineCell>
          </DashboardStyles.SectionHeadlineStrip>
        ) : null}

        {subQuery === 'wars' ? (
          <CountryMilitaryWarsPanel
            country={country}
            linkedHistoricalCountryIds={relatedHistoricalIds}
            units={unitsSummaryQuery.data ?? []}
            onSelectUnit={(targetUnitId) => {
              setFocusMilitaryUnitId(targetUnitId)
              syncSelectedUnitParam(targetUnitId)
            }}
          />
        ) : (
          <GovernmentMilitaryTab
            country={country}
            effectiveCountryId={country.id}
            focusUnitId={focusMilitaryUnitId}
            hidePrimaryCta
            onConsumedFocusUnit={() => setFocusMilitaryUnitId(null)}
            onSelectedUnitChange={syncSelectedUnitParam}
            onCreateUnit={(defaults) => {
              setMilitaryUnitEditingId(null)
              setMilitaryDeptDefaultId(
                defaults?.administrationDepartmentId ?? null,
              )
              setMilitaryParentDefaultId(defaults?.parentUnitId ?? null)
              setMilitaryHistCountryDefaultId(
                defaults?.historicalCountryId ??
                  (isHistorical ? country.id : null),
              )
              setMilitaryBranchDefault(defaults?.branch ?? null)
              setMilitaryUnitModalOpen(true)
            }}
            onEditUnit={(unitId) => {
              setMilitaryUnitEditingId(unitId)
              setMilitaryDeptDefaultId(null)
              setMilitaryParentDefaultId(null)
              setMilitaryHistCountryDefaultId(null)
              setMilitaryBranchDefault(null)
              setMilitaryUnitModalOpen(true)
            }}
            onNavigateToDepartment={(departmentId) => {
              navigate(
                `${pathKeys.countryGovernment(country.id)}?departmentId=${encodeURIComponent(departmentId)}`,
              )
            }}
          />
        )}
      </SectionCanvas>

      <MilitaryUnitFormModal
        isOpen={militaryUnitModalOpen}
        onClose={() => {
          setMilitaryUnitModalOpen(false)
          setMilitaryUnitEditingId(null)
          setMilitaryDeptDefaultId(null)
          setMilitaryParentDefaultId(null)
          setMilitaryHistCountryDefaultId(null)
          setMilitaryBranchDefault(null)
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: isHistorical
              ? administrationDepartmentsByHistoricalCountryQueryKey(country.id)
              : administrationDepartmentsByCountryQueryKey(country.id),
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-units'],
          })
          void queryClient.invalidateQueries({
            queryKey: ['military-unit'],
          })
        }}
        defaultCountryId={isHistorical ? null : country.id}
        defaultHistoricalCountryId={
          isHistorical ? country.id : (militaryHistCountryDefaultId ?? null)
        }
        defaultAdministrationDepartmentId={militaryDeptDefaultId}
        defaultParentUnitId={militaryParentDefaultId}
        defaultBranch={militaryBranchDefault}
        editingUnitId={militaryUnitEditingId}
        lockCountryAndDepartment={
          !militaryUnitEditingId &&
          Boolean(country.id && militaryDeptDefaultId) &&
          !militaryParentDefaultId
        }
      />
    </>
  )
}

const SectionCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${countryTabCanvasPadding}
  min-height: calc(100vh - 200px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`

const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  padding-bottom: 2px;
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const HeaderMenuWrap = styled.div`
  position: relative;
  display: inline-flex;
`

const HeaderDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 45;
  min-width: 210px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerElevated(theme.mode)};
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HeaderDropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const HeaderDropdownDivider = styled.div`
  height: 1px;
  margin: 4px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
`

