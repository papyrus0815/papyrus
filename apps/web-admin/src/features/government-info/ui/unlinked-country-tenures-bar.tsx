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
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/shared/ui/searchable-select'
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
            const selectOptions: SearchableSelectOption[] = sortedOptions.map(
              (optItem) => {
                const isSameEra =
                  Boolean(tenureItem.historicalCountryId) &&
                  optItem.historicalCountryId === tenureItem.historicalCountryId
                return {
                  value: optItem.id,
                  label: optItem.label,
                  group: isSameEra ? '동일 시대·정체 기관' : '기타 기관',
                  meta: isSameEra ? '동일 시대' : undefined,
                }
              },
            )
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
                          pathKeys.personsTimelineDetail(tenureItem.personId),
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
                  <SelectSlot>
                    <SearchableSelect
                      size="sm"
                      options={selectOptions}
                      value={chosenValue}
                      disabled={isSaving}
                      placeholder={`${targetNoun} 선택…`}
                      searchPlaceholder={`${targetNoun} 이름 검색…`}
                      ariaLabel={`${personLabel} ${targetNoun} 선택`}
                      onChange={(nextTargetId) => {
                        setSelectedTargetByTenureId((prevMap) => ({
                          ...prevMap,
                          [tenureItem.id]: nextTargetId,
                        }))
                      }}
                    />
                  </SelectSlot>

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
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.32)'
        : 'rgba(245, 158, 11, 0.35)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.08)'
      : 'rgba(245, 158, 11, 0.05)'};
  border-radius: 12px;
  overflow: hidden;
`

const BannerHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.06)'
        : 'rgba(245, 158, 11, 0.04)'};
  }
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
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#d97706')};
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
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fef3c7' : theme.colors.text.primary};
`

const HeaderSub = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#cbd5e1' : theme.colors.text.secondary};
`

const ToggleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.16);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fde68a' : '#b45309')};
  flex-shrink: 0;
`

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(245, 158, 11, 0.2);
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
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : theme.colors.primary};
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
  background: rgba(99, 102, 241, 0.14);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4f46e5')};
`

const RoleTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#f1f5f9' : theme.colors.text.primary};
`

const EraChip = styled.span`
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(107, 114, 128, 0.12)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#cbd5e1' : theme.colors.text.secondary};
`

const PeriodSpan = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#94a3b8' : theme.colors.text.secondary};
`

const AssignControls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const SelectSlot = styled.div`
  width: 240px;
  max-width: 56vw;
`

const LinkBtn = styled.button`
  height: 34px;
  padding: 0 11px;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover:not(:disabled) {
    background: #4338ca;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const CreateShortcutBtn = styled.button`
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.16)'
        : 'rgba(107, 114, 128, 0.28)'};
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#cbd5e1' : theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15, 23, 42, 0.04)'};
  }
`
