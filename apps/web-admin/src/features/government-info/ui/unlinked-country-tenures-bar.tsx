import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
} from 'react-icons/fi'
import styled from 'styled-components'

import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

export interface UnlinkedTenureTargetOption {
  id: string
  label: string
  historicalCountryId?: string | null
}

export interface UnlinkedCountryTenuresBarProps {
  mode: 'DEPARTMENT' | 'MILITARY_UNIT'
  effectiveCountryId: string | undefined
  isHistorical?: boolean
  targetOptions: UnlinkedTenureTargetOption[]
  onRequestCreateTarget?: (historicalCountryId: string | null) => void
}

interface CountryTenureRow {
  id: string
  personId: string
  positionType?: string | null
  title?: string | null
  rankTitle?: string | null
  administrationDepartmentId?: string | null
  militaryUnitId?: string | null
  historicalCountryId?: string | null
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  person?: {
    id: string
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: 'SURNAME_FIRST' | 'GIVEN_FIRST' | null
  } | null
  positionDefinition?: {
    id: string
    title: string
    positionType?: string | null
  } | null
  administrationDepartment?: { id: string; name: string } | null
  militaryUnit?: { id: string; name: string } | null
  historicalCountry?: { id: string; name: string } | null
}

function formatCompactYearMonth(
  era?: string | null,
  year?: number | null,
  month?: number | null,
): string {
  if (year == null || year <= 0) return ''
  const eraPrefix = era === 'BC' ? 'BC ' : ''
  const monthSuffix =
    month != null ? `.${String(month).padStart(2, '0')}` : ''
  return `${eraPrefix}${year}${monthSuffix}`
}

function formatCompactPeriod(tenureRow: CountryTenureRow): string {
  const startLabel = formatCompactYearMonth(
    tenureRow.startEra,
    tenureRow.startYear,
    tenureRow.startMonth,
  )
  const endLabel = formatCompactYearMonth(
    tenureRow.endEra,
    tenureRow.endYear,
    tenureRow.endMonth,
  )
  if (startLabel && endLabel) return `${startLabel} ~ ${endLabel}`
  if (startLabel) return `${startLabel} ~`
  if (endLabel) return `~ ${endLabel}`
  return ''
}

export function UnlinkedCountryTenuresBar({
  mode,
  effectiveCountryId,
  isHistorical = false,
  targetOptions,
  onRequestCreateTarget,
}: UnlinkedCountryTenuresBarProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [selectedTargetByTenureId, setSelectedTargetByTenureId] = useState<
    Record<string, string>
  >({})
  const [savingTenureId, setSavingTenureId] = useState<string | null>(null)

  const tenuresQuery = useQuery({
    queryKey: [
      'government-positions',
      'country-tenures',
      isHistorical ? 'historical' : 'modern',
      effectiveCountryId ?? '',
    ],
    queryFn: async () => {
      if (!effectiveCountryId) return []
      const rows = await personCareerApi.getTenuresByCountry(
        isHistorical
          ? { historicalCountryId: effectiveCountryId }
          : { countryId: effectiveCountryId },
      )
      return (Array.isArray(rows) ? rows : []) as CountryTenureRow[]
    },
    enabled: Boolean(effectiveCountryId),
    staleTime: 60_000,
  })

  const unlinkedTenures = useMemo(() => {
    const allRows = tenuresQuery.data ?? []
    return allRows.filter((tenureItem) => {
      const resolvedType =
        tenureItem.positionType ??
        tenureItem.positionDefinition?.positionType ??
        ''
      if (mode === 'DEPARTMENT') {
        const isMinisterial =
          resolvedType === 'CABINET_MINISTER' ||
          resolvedType === 'VICE_MINISTER'
        const hasDept = Boolean(
          tenureItem.administrationDepartmentId ||
            tenureItem.administrationDepartment?.id,
        )
        return isMinisterial && !hasDept
      }
      const isCommander = resolvedType === 'MILITARY_COMMANDER'
      const hasUnit = Boolean(
        tenureItem.militaryUnitId || tenureItem.militaryUnit?.id,
      )
      return isCommander && !hasUnit
    })
  }, [tenuresQuery.data, mode])

  if (unlinkedTenures.length === 0) {
    return null
  }

  const targetNoun = mode === 'DEPARTMENT' ? '소속 부처' : '소속 군사조직'
  const roleNoun = mode === 'DEPARTMENT' ? '각료·차관' : '군 지휘관'

  const handleLinkTenure = async (tenureRow: CountryTenureRow) => {
    const chosenTargetId = selectedTargetByTenureId[tenureRow.id]
    if (!chosenTargetId) {
      notify.error(`연결할 ${targetNoun}을 먼저 선택해 주세요.`)
      return
    }
    setSavingTenureId(tenureRow.id)
    try {
      await personCareerApi.updateGovernmentPositionTenure(
        tenureRow.id,
        mode === 'DEPARTMENT'
          ? { administrationDepartmentId: chosenTargetId }
          : { militaryUnitId: chosenTargetId },
      )
      invalidateTenureQueries(queryClient)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['government-positions', 'country-tenures'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['administration-departments'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['military-units'],
        }),
      ])
      notify.success(`${targetNoun} 연결을 완료했습니다.`)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `${targetNoun} 연결 중 오류가 발생했습니다.`
      notify.error(message)
    } finally {
      setSavingTenureId(null)
    }
  }

  return (
    <BannerWrap>
      <BannerHeader
        type="button"
        onClick={() => setExpanded((prevExpanded) => !prevExpanded)}
      >
        <HeaderLeft>
          <AlertIconBox>
            <FiAlertCircle size={15} />
          </AlertIconBox>
          <HeaderTextGroup>
            <HeaderTitle>
              {targetNoun} 미지정 {roleNoun} 보직 {unlinkedTenures.length}건
            </HeaderTitle>
            <HeaderSub>
              인물 경력에는 등록되어 있으나 {targetNoun} 마스터와 아직 연결되지
              않은 보직입니다. 클릭해 바로 연결하세요.
            </HeaderSub>
          </HeaderTextGroup>
        </HeaderLeft>
        <ToggleBadge>
          {expanded ? '접기' : '빠른 연결 열기'}
          {expanded ? (
            <FiChevronDown size={14} />
          ) : (
            <FiChevronRight size={14} />
          )}
        </ToggleBadge>
      </BannerHeader>

      {expanded && (
        <RowList>
          {unlinkedTenures.map((tenureItem) => {
            const personLabel = tenureItem.person
              ? getPersonDisplayName(tenureItem.person)
              : '이름 미상'
            const roleTitle =
              tenureItem.title?.trim() ||
              tenureItem.positionDefinition?.title?.trim() ||
              roleNoun
            const periodLabel = formatCompactPeriod(tenureItem)
            const sortedOptions = [...targetOptions].sort((leftOpt, rightOpt) => {
              const leftEraMatch =
                Boolean(tenureItem.historicalCountryId) &&
                leftOpt.historicalCountryId === tenureItem.historicalCountryId
              const rightEraMatch =
                Boolean(tenureItem.historicalCountryId) &&
                rightOpt.historicalCountryId === tenureItem.historicalCountryId
              if (leftEraMatch !== rightEraMatch) {
                return leftEraMatch ? -1 : 1
              }
              return leftOpt.label.localeCompare(rightOpt.label, 'ko')
            })
            const chosenValue = selectedTargetByTenureId[tenureItem.id] ?? ''
            const isSaving = savingTenureId === tenureItem.id

            return (
              <TenureRow key={tenureItem.id}>
                <TenureInfo>
                  <PersonLinkBtn
                    type="button"
                    onClick={() => {
                      if (tenureItem.personId) {
                        navigate(
                          pathKeys.persons.detail({ id: tenureItem.personId }),
                        )
                      }
                    }}
                  >
                    {personLabel}
                  </PersonLinkBtn>
                  {tenureItem.rankTitle && (
                    <RankChip>{tenureItem.rankTitle}</RankChip>
                  )}
                  <RoleTitle>{roleTitle}</RoleTitle>
                  {!isHistorical && tenureItem.historicalCountry?.name && (
                    <EraChip>🏛️ {tenureItem.historicalCountry.name}</EraChip>
                  )}
                  {periodLabel && <PeriodSpan>{periodLabel}</PeriodSpan>}
                </TenureInfo>

                <AssignControls>
                  <TargetSelect
                    value={chosenValue}
                    disabled={isSaving}
                    onChange={(changeEvent) => {
                      const nextTargetId = changeEvent.target.value
                      setSelectedTargetByTenureId((prevMap) => ({
                        ...prevMap,
                        [tenureItem.id]: nextTargetId,
                      }))
                    }}
                  >
                    <option value="">{targetNoun} 선택…</option>
                    {sortedOptions.map((optItem) => {
                      const isSameEra =
                        Boolean(tenureItem.historicalCountryId) &&
                        optItem.historicalCountryId ===
                          tenureItem.historicalCountryId
                      return (
                        <option key={optItem.id} value={optItem.id}>
                          {isSameEra ? `★ ${optItem.label}` : optItem.label}
                        </option>
                      )
                    })}
                  </TargetSelect>

                  <LinkBtn
                    type="button"
                    disabled={!chosenValue || isSaving}
                    onClick={() => void handleLinkTenure(tenureItem)}
                  >
                    {isSaving ? (
                      '연결 중…'
                    ) : (
                      <>
                        <FiCheck size={13} />
                        연결
                      </>
                    )}
                  </LinkBtn>

                  {onRequestCreateTarget && (
                    <CreateShortcutBtn
                      type="button"
                      title={`새 ${targetNoun} 등록`}
                      onClick={() =>
                        onRequestCreateTarget(
                          tenureItem.historicalCountryId ?? null,
                        )
                      }
                    >
                      <FiPlus size={12} />
                      신규
                    </CreateShortcutBtn>
                  )}
                </AssignControls>
              </TenureRow>
            )
          })}
        </RowList>
      )}
    </BannerWrap>
  )
}

const BannerWrap = styled.div`
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.06);
  border-radius: 12px;
  overflow: hidden;
`

const BannerHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const AlertIconBox = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.16);
  color: #d97706;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const HeaderTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const HeaderTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors?.text ?? '#111827'};
`

const HeaderSub = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors?.textSecondary ?? '#6b7280'};
`

const ToggleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  flex-shrink: 0;
`

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(245, 158, 11, 0.22);
  max-height: 280px;
  overflow-y: auto;
`

const TenureRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid rgba(245, 158, 11, 0.14);

  &:last-child {
    border-bottom: none;
  }
`

const TenureInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 260px;
`

const PersonLinkBtn = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors?.primary ?? '#4f46e5'};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const RankChip = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
`

const RoleTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors?.text ?? '#1f2937'};
`

const EraChip = styled.span`
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(107, 114, 128, 0.12);
  color: ${({ theme }) => theme.colors?.textSecondary ?? '#4b5563'};
`

const PeriodSpan = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors?.textSecondary ?? '#6b7280'};
`

const AssignControls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const TargetSelect = styled.select`
  height: 30px;
  max-width: 240px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid rgba(107, 114, 128, 0.3);
  background: ${({ theme }) => theme.colors?.surface ?? '#ffffff'};
  color: ${({ theme }) => theme.colors?.text ?? '#111827'};
  font-size: 12px;
`

const LinkBtn = styled.button`
  height: 30px;
  padding: 0 10px;
  border-radius: 7px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const CreateShortcutBtn = styled.button`
  height: 30px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid rgba(107, 114, 128, 0.28);
  background: transparent;
  color: ${({ theme }) => theme.colors?.textSecondary ?? '#4b5563'};
  font-size: 11.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
`
