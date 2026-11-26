import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiBookOpen,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  usePoliticalSystems,
  useCreatePoliticalSystem,
  useDeletePoliticalSystem,
  useUpdatePoliticalSystem,
  type PoliticalSystem,
} from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  headOfGovernmentTitleOf,
  headOfStateTitleOf,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
} from '@/entities/political-system/model/political-system'
import { GovMorePopover } from '@/features/government-info/ui/gov-more-popover'
import { GOV_BRAND } from '@/features/government-info/ui/government-ledger.styles'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import {
  doesCabinetMatchPoliticalSystem,
  resolveCabinetEffectiveDates,
  shouldHideCabinetFromExecutiveTimeline,
} from '@/shared/lib/ministry-department/department-cabinet-matcher'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { getSignedDateChronologyKey } from '@/shared/lib/tenure-person-utils'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { notify } from '@/shared/ui/toast'

import { ChamberCatalogSection } from '@/widgets/chamber/chamber-catalog-section'

import { PoliticalSystemFormModal } from './political-system-form.modal'

const EMPTY_FACT_LABELS = [
  '국가원수 · 정부수반',
  '입법부 · 의회 구성',
  '국가 구조 (단일·연방)',
  '정당 체제',
] as const

interface HeadRegisterTarget {
  positionId: string | null
  positionTitle: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  historicalCountryId: string | null
}

interface Props {
  /** 현대 국가 ID — 주면 연결된 과거 국가의 정체까지 함께 온다 */
  countryId?: string
  /** 과거 국가 ID */
  historicalCountryId?: string
  /** 새로 등록할 때 어느 국가에 붙일지. 보통 위 둘 중 채워진 쪽 */
  countryName?: string
  /** 해당 헌정 체제 시기의 역대 내각 목록으로 이동 */
  onOpenCabinetsByRegime?: (regimeId: string) => void
}

/**
 * 정체·헌정 탭 — 대통령제/의원내각제/전제군주제, 단원제/양원제를 시대별 헌정 연혁으로 표시.
 */
export function PoliticalSystemTab({
  countryId,
  historicalCountryId,
  countryName,
  onOpenCabinetsByRegime,
}: Props) {
  const queryClient = useQueryClient()
  const isHistoricalPolity = Boolean(historicalCountryId)
  const scope = {
    countryId,
    historicalCountryId,
    includeConstituents: isHistoricalPolity,
  }
  const query = usePoliticalSystems(scope)
  const createMutation = useCreatePoliticalSystem()
  const updateMutation = useUpdatePoliticalSystem()
  const deleteMutation = useDeletePoliticalSystem()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [polityFilterId, setPolityFilterId] = useState<string>('ALL')
  const [headRegisterTarget, setHeadRegisterTarget] =
    useState<HeadRegisterTarget | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [registerPersonId, setRegisterPersonId] = useState<string | null>(null)

  const tenuresQuery = useQuery({
    queryKey: [
      'tenures-by-country',
      countryId || undefined,
      historicalCountryId,
      isHistoricalPolity ? 'with-constituents' : 'direct',
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId,
        includeConstituents: isHistoricalPolity || undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const cabinetsQuery = useQuery<CabinetListItemDto[]>({
    queryKey: [
      'cabinets-by-country',
      countryId ?? '',
      historicalCountryId ?? null,
      ...(isHistoricalPolity ? (['with-constituents'] as const) : []),
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        includeConstituents: isHistoricalPolity || undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const personsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })

  const openHeadRegister = (target: HeadRegisterTarget) => {
    setHeadRegisterTarget(target)
    setRegisterPersonId(null)
    setPickerOpen(true)
  }

  const closeHeadRegister = () => {
    setPickerOpen(false)
    setRegisterPersonId(null)
    setHeadRegisterTarget(null)
  }

  const allSystems = useMemo(
    () => [...(query.data ?? [])].sort(comparePoliticalSystems),
    [query.data],
  )

  const polityChips = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number }>()
    for (const sysItem of allSystems) {
      const targetId = sysItem.historicalCountryId ?? '__MODERN__'
      const targetLabel = sysItem.historicalCountryId
        ? `${sysItem.historicalCountry?.name ?? '과거·구성 국가'}`
        : `${countryName ?? '현대 본국'}`
      const existing = map.get(targetId)
      if (existing) {
        existing.count += 1
      } else {
        map.set(targetId, { id: targetId, label: targetLabel, count: 1 })
      }
    }
    return [...map.values()]
  }, [allSystems, countryName])

  const matchedCabinetsBySystemId = useMemo(() => {
    const resultMap = new Map<
      string,
      { count: number; leaderNames: string[]; extraLeaderCount: number }
    >()
    const rawCabinets = cabinetsQuery.data ?? []
    if (rawCabinets.length === 0) return resultMap

    const visibleCabinets = rawCabinets
      .filter(
        (cabItem) =>
          !shouldHideCabinetFromExecutiveTimeline(cabItem.headTenure, cabItem),
      )
      .sort((left, right) => {
        const leftKey =
          getSignedDateChronologyKey(
            resolveCabinetEffectiveDates(left).startDate,
          ) ?? 0
        const rightKey =
          getSignedDateChronologyKey(
            resolveCabinetEffectiveDates(right).startDate,
          ) ?? 0
        return leftKey - rightKey
      })

    for (const sysItem of allSystems) {
      const matching = visibleCabinets.filter((cabItem) =>
        doesCabinetMatchPoliticalSystem(cabItem, sysItem),
      )
      if (matching.length === 0) continue

      const distinctNames: string[] = []
      const seenNames = new Set<string>()
      for (const cabItem of matching) {
        const label = cabItem.headTenure?.person
          ? getPersonDisplayName({
              ...cabItem.headTenure.person,
              name: cabItem.headTenure.person.name ?? '',
            })
          : cabItem.name?.trim() || ''
        if (label && label !== '—' && !seenNames.has(label)) {
          seenNames.add(label)
          distinctNames.push(label)
        }
      }
      resultMap.set(sysItem.id, {
        count: matching.length,
        leaderNames: distinctNames.slice(0, 3),
        extraLeaderCount: Math.max(0, distinctNames.length - 3),
      })
    }
    return resultMap
  }, [allSystems, cabinetsQuery.data])

  const systems = useMemo(() => {
    if (polityFilterId === 'ALL') return allSystems
    if (polityFilterId === '__MODERN__') {
      return allSystems.filter((sysItem) => !sysItem.historicalCountryId)
    }
    return allSystems.filter(
      (sysItem) => sysItem.historicalCountryId === polityFilterId,
    )
  }, [allSystems, polityFilterId])

  const currentSystem = useMemo(
    () => allSystems.find((sysItem) => sysItem.isCurrent) ?? null,
    [allSystems],
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (system: PoliticalSystem) => {
    setEditing(system)
    setFormOpen(true)
  }

  const handleDelete = async (system: PoliticalSystem) => {
    const label = system.name || formatPeriod(system)
    if (
      !(await confirm({
        title: '정체·헌정 기록 삭제',
        message: `「${label}」 정체 기록을 삭제할까요?`,
        confirmLabel: '삭제',
        danger: true,
      }))
    ) {
      return
    }
    try {
      await deleteMutation.mutateAsync(system.id)
      notify.success('정체 기록을 삭제했습니다.')
    } catch {
      notify.error('정체 기록 삭제에 실패했습니다.')
    }
  }

  return (
    <TabWrap>
      <ToolbarSurface>
        <ToolbarMeta>
          <CountBadge>
            <FiBookOpen size={12.5} />
            헌정 체제 {systems.length}개
          </CountBadge>
          {currentSystem ? (
            <CurrentSummaryPill>
              <CurrentDot />
              현행:{' '}
              {currentSystem.name ||
                (currentSystem.governmentForm
                  ? GOVERNMENT_FORM_LABEL[currentSystem.governmentForm]
                  : '체제 등록됨')}
            </CurrentSummaryPill>
          ) : null}
          {polityChips.length > 1 ? (
            <PolityFilterSelect
              aria-label="소속 국가·구성국 필터"
              value={polityFilterId}
              onChange={(changeEvent) =>
                setPolityFilterId(changeEvent.target.value)
              }
            >
              <option value="ALL">전체 정치체 ({allSystems.length})</option>
              {polityChips.map((chipItem) => (
                <option key={chipItem.id} value={chipItem.id}>
                  {chipItem.label} ({chipItem.count})
                </option>
              ))}
            </PolityFilterSelect>
          ) : null}
        </ToolbarMeta>

        <PrimaryActionButton onClick={openCreate}>
          <FiPlus size={15} />
          정체·헌정 추가
        </PrimaryActionButton>
      </ToolbarSurface>

      {query.isLoading ? (
        <ChartSkeleton variant="bars" rows={4} />
      ) : systems.length === 0 ? (
        <EmptyCard>
          <EmptyIconCircle>
            <FiBookOpen size={22} />
          </EmptyIconCircle>
          <EmptyHeadline>등록된 정체·헌정 체제가 없습니다</EmptyHeadline>
          <EmptyDesc>
            왕정·제정·공화정(대통령제·의원내각제 등)과 의회 구성을 시대순으로
            등록하면 통치 구조 변천사가 한눈에 정리됩니다.
          </EmptyDesc>
          <EmptySpecPreview>
            {EMPTY_FACT_LABELS.map((label) => (
              <EmptySpecPill key={label}>{label}</EmptySpecPill>
            ))}
          </EmptySpecPreview>
          <PrimaryActionButton $size="lg" onClick={openCreate}>
            <FiPlus size={15} />
            첫 정체·헌정 체제 등록
          </PrimaryActionButton>
        </EmptyCard>
      ) : (
        <TimelineList>
          {systems.map((system, sysIndex) => {
            const hos = headOfStateTitleOf(system)
            const hog = headOfGovernmentTitleOf(system)
            const isDistinctDual = Boolean(hos && hog && hos !== hog)
            const hasSpecs = Boolean(
              hos ||
                hog ||
                system.lowerHouseName ||
                (system.legislatureType === 'BICAMERAL' &&
                  system.upperHouseName),
            )
            const fallbackTitle = system.governmentForm
              ? GOVERNMENT_FORM_LABEL[system.governmentForm]
              : '헌정 체제'
            const matchedInfo = matchedCabinetsBySystemId.get(system.id)

            return (
              <TimelineRow key={system.id}>
                <TimelineRailCol>
                  <RailNode $current={Boolean(system.isCurrent)} />
                  {sysIndex < systems.length - 1 ? <RailLine /> : null}
                </TimelineRailCol>

                <RegimeCard $current={Boolean(system.isCurrent)}>
                  <CardHeader>
                    <CardTitleBlock>
                      <TitleLine>
                        <PeriodPill $current={Boolean(system.isCurrent)}>
                          {formatPeriod(system)}
                        </PeriodPill>
                        <Name>{system.name || fallbackTitle}</Name>
                        {system.isCurrent ? (
                          <CurrentChip>현행 체제</CurrentChip>
                        ) : null}
                        {(historicalCountryId == null ||
                          system.historicalCountryId !== historicalCountryId) &&
                        system.historicalCountryId != null ? (
                          <PastChip>
                            <PolityDot aria-hidden />
                            {system.historicalCountry?.name ?? '구성·과거 국가'}
                          </PastChip>
                        ) : null}
                      </TitleLine>

                      {(system.governmentForm ||
                        system.legislatureType ||
                        system.stateStructure ||
                        system.partySystem) && (
                        <Tags>
                          {system.governmentForm ? (
                            <Tag $tone="form">
                              {GOVERNMENT_FORM_LABEL[system.governmentForm]}
                            </Tag>
                          ) : null}
                          {system.legislatureType ? (
                            <Tag $tone="legislature">
                              {LEGISLATURE_TYPE_LABEL[system.legislatureType]}
                            </Tag>
                          ) : null}
                          {system.stateStructure ? (
                            <Tag>
                              {STATE_STRUCTURE_LABEL[system.stateStructure]}
                            </Tag>
                          ) : null}
                          {system.partySystem ? (
                            <Tag>{PARTY_SYSTEM_LABEL[system.partySystem]}</Tag>
                          ) : null}
                        </Tags>
                      )}
                    </CardTitleBlock>

                    <RowActions>
                      <ActionBtn type="button" onClick={() => openEdit(system)}>
                        <FiEdit2 size={12} />
                        수정
                      </ActionBtn>
                      <GovMorePopover
                        triggerSize="sm"
                        ariaLabel={`${system.name || fallbackTitle} 관리 메뉴`}
                        title="체제 관리 및 수장 등록"
                        actions={[
                          ...(hos
                            ? [
                                {
                                  key: 'register-hos',
                                  label: `${hos} 인물 등록`,
                                  icon: <FiUserPlus size={13.5} />,
                                  onClick: () =>
                                    openHeadRegister({
                                      positionId:
                                        system.headOfStatePositionId ?? null,
                                      positionTitle: hos,
                                      positionType: 'HEAD_OF_STATE' as const,
                                      historicalCountryId:
                                        system.historicalCountryId ?? null,
                                    }),
                                },
                              ]
                            : []),
                          ...(hog && (!hos || isDistinctDual)
                            ? [
                                {
                                  key: 'register-hog',
                                  label: `${hog} 인물 등록`,
                                  icon: <FiUserPlus size={13.5} />,
                                  onClick: () =>
                                    openHeadRegister({
                                      positionId:
                                        system.headOfGovernmentPositionId ??
                                        null,
                                      positionTitle: hog,
                                      positionType:
                                        'HEAD_OF_GOVERNMENT' as const,
                                      historicalCountryId:
                                        system.historicalCountryId ?? null,
                                    }),
                                },
                              ]
                            : []),
                          ...(matchedInfo &&
                          matchedInfo.count > 0 &&
                          onOpenCabinetsByRegime
                            ? [
                                {
                                  key: 'open-cabinets',
                                  label: '역대 행정부·내각 보기',
                                  icon: <FiUsers size={13.5} />,
                                  badge: String(matchedInfo.count),
                                  onClick: () =>
                                    onOpenCabinetsByRegime(system.id),
                                },
                              ]
                            : []),
                          {
                            key: 'delete-system',
                            label: '정체 기록 삭제',
                            icon: <FiTrash2 size={13.5} />,
                            danger: true,
                            onClick: () => {
                              void handleDelete(system)
                            },
                          },
                        ]}
                      />
                    </RowActions>
                  </CardHeader>

                  {hasSpecs ? (
                    <SpecGrid>
                      {hos ? (
                        <SpecBox>
                          <FactKey>
                            {isDistinctDual
                              ? '국가원수'
                              : '국가원수 · 정부수반'}
                          </FactKey>
                          <FactValue>
                            <span>
                              {hos}
                              {system.headOfStateHasPower === false ? (
                                <Muted> (상징)</Muted>
                              ) : null}
                            </span>
                          </FactValue>
                        </SpecBox>
                      ) : null}

                      {hog && (!hos || isDistinctDual) ? (
                        <SpecBox>
                          <FactKey>정부수반</FactKey>
                          <FactValue>
                            <span>
                              {hog}
                              {system.headOfGovernmentHasPower === false ? (
                                <Muted> (상징)</Muted>
                              ) : null}
                            </span>
                          </FactValue>
                        </SpecBox>
                      ) : null}

                      {system.lowerHouseName ? (
                        <SpecBox>
                          <FactKey>
                            {primaryHouseLabel(system.legislatureType)}
                          </FactKey>
                          <FactValue>
                            <span>
                              {system.lowerHouseName}
                              {system.lowerHouseSeats != null
                                ? ` · ${system.lowerHouseSeats.toLocaleString()}석`
                                : ''}
                            </span>
                          </FactValue>
                        </SpecBox>
                      ) : null}

                      {system.legislatureType === 'BICAMERAL' &&
                      system.upperHouseName ? (
                        <SpecBox>
                          <FactKey>상원</FactKey>
                          <FactValue>
                            <span>
                              {system.upperHouseName}
                              {system.upperHouseSeats != null
                                ? ` · ${system.upperHouseSeats.toLocaleString()}석`
                                : ''}
                            </span>
                          </FactValue>
                        </SpecBox>
                      ) : null}
                    </SpecGrid>
                  ) : null}

                  {system.notes ? <Notes>{system.notes}</Notes> : null}

                  {matchedInfo && matchedInfo.count > 0 ? (
                    <RegimeCabinetLinkBar>
                      <RegimeCabinetSummary>
                        <FiUsers size={12.5} />
                        <span>
                          {matchedInfo.leaderNames.length > 0 ? (
                            <>
                              수반:{' '}
                              <strong>
                                {matchedInfo.leaderNames.join(' · ')}
                              </strong>
                              {matchedInfo.extraLeaderCount > 0
                                ? ` 외 ${matchedInfo.extraLeaderCount}명`
                                : ''}
                            </>
                          ) : (
                            `연결된 행정부·내각 ${matchedInfo.count}개`
                          )}
                        </span>
                      </RegimeCabinetSummary>
                      {onOpenCabinetsByRegime ? (
                        <RegimeCabinetBtn
                          type="button"
                          onClick={() => onOpenCabinetsByRegime(system.id)}
                        >
                          <span>역대 내각 {matchedInfo.count}개 보기</span>
                          <FiArrowRight size={12.5} />
                        </RegimeCabinetBtn>
                      ) : null}
                    </RegimeCabinetLinkBar>
                  ) : null}
                </RegimeCard>
              </TimelineRow>
            )
          })}
        </TimelineList>
      )}

      <ChamberCatalogSection countryId={countryId} historicalCountryId={historicalCountryId} />

      <PoliticalSystemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        defaultIsCurrent={systems.length === 0}
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        onSubmit={async (dto) => {
          const saved = editing
            ? await updateMutation.mutateAsync({ id: editing.id, dto })
            : await createMutation.mutateAsync({
                ...dto,
                countryId:
                  dto.countryId !== undefined
                    ? dto.countryId
                    : (countryId ?? null),
                historicalCountryId:
                  dto.historicalCountryId !== undefined
                    ? dto.historicalCountryId
                    : (historicalCountryId ?? null),
              })
          setFormOpen(false)

          const hog = headOfGovernmentTitleOf(saved)
          const hos = headOfStateTitleOf(saved)
          const rows = (tenuresQuery.data ?? []) as Array<{
            title?: string | null
            historicalCountryId?: string | null
            positionDefinition?: {
              id?: string | null
              title?: string | null
            } | null
          }>
          const hasTenureForTitle = (
            posId: string | null | undefined,
            titleText: string | null,
          ) => {
            if (!titleText) return true
            const norm = titleText.trim().replace(/\s+/g, '')
            return rows.some((rowItem) => {
              if (saved.historicalCountryId) {
                if (rowItem.historicalCountryId !== saved.historicalCountryId) {
                  return false
                }
              } else if (rowItem.historicalCountryId) {
                return false
              }
              return (
                Boolean(posId && rowItem.positionDefinition?.id === posId) ||
                (rowItem.title ?? rowItem.positionDefinition?.title ?? '')
                  .trim()
                  .replace(/\s+/g, '') === norm
              )
            })
          }

          if (hog && !hasTenureForTitle(saved.headOfGovernmentPositionId, hog)) {
            notify.success(
              `정체가 저장되었습니다. 이어서 「${hog}」 수장 인물을 등록해 보세요.`,
            )
            openHeadRegister({
              positionId: saved.headOfGovernmentPositionId ?? null,
              positionTitle: hog,
              positionType: 'HEAD_OF_GOVERNMENT',
              historicalCountryId: saved.historicalCountryId ?? null,
            })
          } else if (
            hos &&
            !hasTenureForTitle(saved.headOfStatePositionId, hos)
          ) {
            notify.success(
              `정체가 저장되었습니다. 이어서 「${hos}」 수장 인물을 등록해 보세요.`,
            )
            openHeadRegister({
              positionId: saved.headOfStatePositionId ?? null,
              positionTitle: hos,
              positionType: 'HEAD_OF_STATE',
              historicalCountryId: saved.historicalCountryId ?? null,
            })
          } else {
            notify.success(
              editing ? '정체가 수정되었습니다.' : '정체가 추가되었습니다.',
            )
          }
        }}
      />

      {pickerOpen && headRegisterTarget && (
        <PersonSelectModal
          persons={personsQuery.data ?? []}
          selectedPersonId={registerPersonId ?? ''}
          loading={personsQuery.isLoading}
          title={`${headRegisterTarget.positionTitle} 등록 — 인물 선택`}
          searchPlaceholder="등록할 수장 인물을 검색..."
          allowCreate
          defaultCountryId={countryId}
          defaultHistoricalCountryId={
            headRegisterTarget.historicalCountryId ??
            historicalCountryId ??
            undefined
          }
          onSelect={(personId) => {
            setRegisterPersonId(personId)
            setPickerOpen(false)
          }}
          onClose={closeHeadRegister}
        />
      )}

      {registerPersonId && headRegisterTarget && (
        <TenureRegisterPanel
          personId={registerPersonId}
          open
          onClose={closeHeadRegister}
          onSuccess={() => {
            void queryClient.invalidateQueries({
              queryKey: ['cabinets-by-country'],
            })
            void queryClient.invalidateQueries({
              queryKey: ['tenures-by-country'],
            })
            closeHeadRegister()
          }}
          initialCountryId={countryId}
          initialHistoricalCountryId={
            headRegisterTarget.historicalCountryId ??
            historicalCountryId ??
            null
          }
          initialPositionDefinitionId={headRegisterTarget.positionId}
          initialPositionTitle={headRegisterTarget.positionTitle}
          initialPositionType={headRegisterTarget.positionType}
        />
      )}
    </TabWrap>
  )
}

const TabWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ToolbarSurface = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 0 8px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(20, 19, 34, 0.06)'};
`

const ToolbarMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(20, 19, 34, 0.045)'};
  color: ${({ theme }) => theme.colors.text.primary};
`

const CurrentSummaryPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
`

const CurrentDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
`

const PolityFilterSelect = styled.select`
  height: 30px;
  padding: 0 26px 0 10px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(20, 19, 34, 0.1)'};
  cursor: pointer;
  outline: none;
`

const EmptyCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 24px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(20, 19, 34, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : '#ffffff'};
`

const EmptyIconCircle = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? GOV_BRAND.primaryInkDark : GOV_BRAND.primary};
`

const EmptyHeadline = styled.h4`
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.p`
  margin: 0;
  max-width: 480px;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptySpecPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 4px 0 6px;
`

const EmptySpecPill = styled.span`
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
`

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
`

const TimelineRow = styled.div`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
`

const TimelineRailCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 18px;
`

const RailNode = styled.span<{ $current?: boolean }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $current, theme }) =>
    $current
      ? '#10b981'
      : theme.mode === 'dark'
        ? '#64748b'
        : '#94a3b8'};
`

const RailLine = styled.span`
  flex: 1;
  width: 1px;
  margin-top: 6px;
  margin-bottom: -14px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(20, 19, 34, 0.12)'};
`

const RegimeCard = styled.article<{ $current?: boolean }>`
  margin-bottom: 10px;
  padding: 15px 18px;
  border-radius: 12px;
  border: 1px solid
    ${({ $current, theme }) =>
      $current
        ? theme.mode === 'dark'
          ? 'rgba(52, 211, 153, 0.32)'
          : '#a7f3d0'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(20, 19, 34, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : '#ffffff'};
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const CardTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
`

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const PeriodPill = styled.span<{ $current?: boolean }>`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 3px 9px;
  border-radius: 7px;
  background: ${({ $current, theme }) =>
    $current
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.16)'
        : '#dcfce7'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : '#f1f5f9'};
  color: ${({ $current, theme }) =>
    $current
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#15803d'
      : theme.colors.text.primary};
`

const Name = styled.h4`
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const chipCss = `
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
`

const PastChip = styled.span`
  ${chipCss}
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.16)'
      : 'rgba(217, 119, 6, 0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const CurrentChip = styled.span`
  ${chipCss}
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.18)'
      : 'rgba(22, 163, 74, 0.12)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#15803d')};
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Tag = styled.span<{ $tone?: 'form' | 'legislature' }>`
  ${chipCss}
  font-size: 11.5px;
  background: ${({ $tone, theme }) =>
    $tone === 'form'
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.08)'
      : $tone === 'legislature'
        ? theme.mode === 'dark'
          ? 'rgba(14, 165, 233, 0.18)'
          : 'rgba(14, 165, 233, 0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : '#f1f5f9'};
  color: ${({ $tone, theme }) =>
    $tone === 'form'
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'
      : $tone === 'legislature'
        ? theme.mode === 'dark'
          ? '#7dd3fc'
          : '#0369a1'
        : theme.colors.text.secondary};
`

const SpecGrid = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
`

const SpecBox = styled.div`
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#eef2f6'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FactKey = styled.dt`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FactValue = styled.dd`
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Notes = styled.p`
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    background 0.14s,
    color 0.14s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PolityDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.72;
  flex-shrink: 0;
`

const RegimeCabinetLinkBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
`

const RegimeCabinetSummary = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 0;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RegimeCabinetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.35)'
        : 'rgba(37, 99, 235, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(37, 99, 235, 0.14)'
      : 'rgba(37, 99, 235, 0.06)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8')};
  transition:
    background 0.14s,
    border-color 0.14s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.24)'
        : 'rgba(37, 99, 235, 0.12)'};
  }
`
