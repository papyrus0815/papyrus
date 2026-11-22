import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowRight, FiPlus } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerHairline,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import {
  type EventSide,
  listEventSideUnits,
  listEventSideWeapons,
  type SideOutcome,
  type SideUnitView,
  syncEventSides,
  toSideInputs,
} from '@/shared/api/event-sides'
import { type UpdateEventDto } from '@/shared/api/events'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys } from '../use-event-detail'
import { type PatchOptions } from '../use-undoable-patch'
import { countrySideMapOf, effectivePersonSide } from './actors/actors.lib'
import {
  HeaderControlBtn,
  SectionHintText,
  SideQuickAddBtn,
} from './actors/actors.styles'
import { SIDE_PALETTE, withSideColors } from './side-colors'
import {
  type DoctrineFieldKey,
  SideDoctrineComparison,
  SideWeaponsSection,
  SubEventSidesRollupPanel,
} from './side-doctrine-and-weapons'
import { type AvailableMilitaryUnitItem, SideOrbatSection } from './side-orbat-tree'
import { SIDE_OUTCOME_LABEL } from './side-outcome'

interface ModuleSidesProps {
  event: EventDetail
  onPatch?: (patch: UpdateEventDto, opts?: PatchOptions) => void
  focusUnitId?: string | null
  onJumpToActors?: () => void
  onStartSides?: () => Promise<void>
}

/**
 * 전력 · 편제 (`#module-sides`) — 각 진영에 투입된 군사 부대(전투서열), 병기·장비, 작전 목표·교리를 다룬다.
 *
 * 진영 생성·이름·승패 지정과 국가·인물·정당·조직 배정은 `참여` 탭으로 일원화되었으며,
 * 이 섹션은 군사 편제(ORBAT)·장비·교리 분석만 전담한다.
 */
export function ModuleSides({
  event,
  focusUnitId,
  onJumpToActors,
  onStartSides,
}: ModuleSidesProps) {
  const queryClient = useQueryClient()
  const sides = useMemo(() => event.sides ?? [], [event.sides])
  const coloredSides = useMemo(() => withSideColors(sides), [sides])
  const [busy, setBusy] = useState(false)
  const [openedWeaponsSides, setOpenedWeaponsSides] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const persons = useMemo(() => event.relatedPersons ?? [], [event.relatedPersons])
  const countrySideByKey = useMemo(
    () => countrySideMapOf(event.relatedCountries, event.relatedHistoricalCountries),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )

  const personCountBySideId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const personEntry of persons) {
      const effective = effectivePersonSide(personEntry, countrySideByKey)
      if (!effective.sideId) continue
      counts.set(effective.sideId, (counts.get(effective.sideId) ?? 0) + 1)
    }
    return counts
  }, [persons, countrySideByKey])

  const sideUnitsQuery = useQuery<SideUnitView[]>({
    queryKey: eventKeys.sideUnits(event.id),
    queryFn: () => listEventSideUnits(event.id),
    enabled: sides.length > 0,
    staleTime: 30_000,
  })

  const sideWeaponsQuery = useQuery({
    queryKey: eventKeys.sideWeapons(event.id),
    queryFn: () => listEventSideWeapons(event.id),
    enabled: sides.length > 0,
    staleTime: 30_000,
  })

  const allMilitaryUnitsQuery = useQuery<AvailableMilitaryUnitItem[]>({
    queryKey: ['military-units', 'all-for-event-sides'],
    queryFn: () => militaryUnitApi.getAll() as Promise<AvailableMilitaryUnitItem[]>,
    enabled: sides.length > 0,
    staleTime: 60_000,
  })

  const weaponCountBySideId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const weapon of sideWeaponsQuery.data ?? []) {
      counts.set(weapon.sideId, (counts.get(weapon.sideId) ?? 0) + 1)
    }
    return counts
  }, [sideWeaponsQuery.data])

  const sideUnitsBySideId = useMemo(() => {
    const map = new Map<string, SideUnitView[]>()
    for (const unitEntry of sideUnitsQuery.data ?? []) {
      const list = map.get(unitEntry.sideId) ?? []
      list.push(unitEntry)
      map.set(unitEntry.sideId, list)
    }
    return map
  }, [sideUnitsQuery.data])

  const totalUnitCount = sideUnitsQuery.data?.length ?? 0
  const totalWeaponCount = sideWeaponsQuery.data?.length ?? 0

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.observations(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.sideUnits(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.sideWeapons(event.id) }),
    ])
  }

  const updateDoctrineField = async (
    targetSide: EventSide,
    field: DoctrineFieldKey,
    value: string | null,
  ) => {
    setBusy(true)
    try {
      await syncEventSides(
        event.id,
        toSideInputs(sides).map((input) =>
          input.id === targetSide.id ? { ...input, [field]: value } : input,
        ),
      )
      await refresh()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '교리 정보를 저장하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  const openWeaponsForSide = (sideId: string) => {
    setOpenedWeaponsSides((previous) => new Set(previous).add(sideId))
  }

  const subtitleParts = [
    totalUnitCount > 0 ? `부대 ${totalUnitCount}` : null,
    totalWeaponCount > 0 ? `병기 ${totalWeaponCount}` : null,
  ].filter(Boolean)

  return (
    <S.Section id="module-sides" aria-busy={busy}>
      <S.SectionHeaderGroup>
        <S.SectionHeader>
          <S.SectionTitle>전투서열 · 병기 · 교리</S.SectionTitle>
          {subtitleParts.length > 0 && (
            <S.SectionSubtitle>{subtitleParts.join(' · ')}</S.SectionSubtitle>
          )}
          <S.SectionActions>
            {sides.length > 0 && onJumpToActors && (
              <HeaderControlBtn type="button" onClick={onJumpToActors}>
                참여 탭에서 진영·주체 관리
                <FiArrowRight size={12} aria-hidden />
              </HeaderControlBtn>
            )}
          </S.SectionActions>
        </S.SectionHeader>
        <SectionHintText>
          각 진영에 투입된 군사 부대(전투서열), 병기·장비, 작전 목표·전술을 기록합니다. 참여 국가·인물 배정과 진영 이름·승패는 참여 탭에서 관리합니다.
        </SectionHintText>
      </S.SectionHeaderGroup>

      {sides.length === 0 ? (
        <S.EmptyGuide>
          <S.EmptyGuideBody>
            <S.EmptyGuideTitle>대립 진영을 나누고 전투서열 · 병기를 기록하세요</S.EmptyGuideTitle>
            <S.EmptyGuideDesc>
              교전 양측의 진영이 만들어지면 진영별 투입 부대(군단·사단·함대), 주요 병기·장비, 작전 목표·교리를 나란히 기록할 수 있습니다.
            </S.EmptyGuideDesc>
          </S.EmptyGuideBody>
          <S.EmptyGuideActions>
            {onStartSides && (
              <S.EmptyPrimaryAction
                type="button"
                onClick={() => void onStartSides()}
                disabled={busy}
              >
                <FiPlus aria-hidden />
                대립 진영 만들기
              </S.EmptyPrimaryAction>
            )}
            {onJumpToActors && (
              <S.EmptySecondaryAction type="button" onClick={onJumpToActors}>
                참여 탭에서 당사국 먼저 연결
                <FiArrowRight size={13} aria-hidden />
              </S.EmptySecondaryAction>
            )}
          </S.EmptyGuideActions>
        </S.EmptyGuide>
      ) : (
        <>
          <SideDoctrineComparison
            sides={coloredSides}
            disabled={busy}
            onSaveField={(targetSide, field, value) =>
              void updateDoctrineField(targetSide, field, value)
            }
          />

          {event.kind === 'COLLECTION' && (
            <SubEventSidesRollupPanel eventId={event.id} domain={event.domain} />
          )}

          <SideGrid>
            {sides.map((side) => {
              const sideColor =
                coloredSides.find((colored) => colored.id === side.id)?.color ?? SIDE_PALETTE[0]
              const sideUnitRows = sideUnitsBySideId.get(side.id) ?? []
              const weaponCount = weaponCountBySideId.get(side.id) ?? 0
              const showWeapons =
                weaponCount > 0 || openedWeaponsSides.has(side.id) || sideWeaponsQuery.isError
              const countryCount = side.participants.length
              const personCount = personCountBySideId.get(side.id) ?? 0
              const memberSummary = [
                countryCount > 0 ? `국가 ${countryCount}` : null,
                personCount > 0 ? `인물 ${personCount}` : null,
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <SideColumn key={side.id} $color={sideColor}>
                  <SideColumnHead>
                    <SideIdentity>
                      <SideSwatchDot $color={sideColor} aria-hidden />
                      <SideTitleText>{side.name}</SideTitleText>
                      {side.outcome && (
                        <OutcomeBadge $outcome={side.outcome} title={side.outcomeNote ?? undefined}>
                          {SIDE_OUTCOME_LABEL[side.outcome]}
                        </OutcomeBadge>
                      )}
                      {memberSummary && <MemberCountMeta>{memberSummary}</MemberCountMeta>}
                    </SideIdentity>

                    {!showWeapons && !sideWeaponsQuery.isLoading && (
                      <SideQuickAddBtn
                        type="button"
                        onClick={() => openWeaponsForSide(side.id)}
                      >
                        <FiPlus size={11} aria-hidden />
                        병기·장비 추가
                      </SideQuickAddBtn>
                    )}
                  </SideColumnHead>

                  <SideOrbatSection
                    eventId={event.id}
                    sideId={side.id}
                    sideName={side.name}
                    sideColor={sideColor}
                    sideUnits={sideUnitRows}
                    unitsError={sideUnitsQuery.isError}
                    onRetryUnits={() => void sideUnitsQuery.refetch()}
                    pickerError={allMilitaryUnitsQuery.isError}
                    onRetryPicker={() => void allMilitaryUnitsQuery.refetch()}
                    pickerLoading={allMilitaryUnitsQuery.isLoading}
                    allSideUnits={sideUnitsQuery.data ?? []}
                    availableUnits={
                      (allMilitaryUnitsQuery.data ?? []) as AvailableMilitaryUnitItem[]
                    }
                    sideCountryIds={
                      new Set(
                        side.participants
                          .map((participant) => participant.countryId)
                          .filter((id): id is string => Boolean(id)),
                      )
                    }
                    sideHistoricalCountryIds={
                      new Set(
                        side.participants
                          .map((participant) => participant.historicalCountryId)
                          .filter((id): id is string => Boolean(id)),
                      )
                    }
                    candidatePersonIds={persons.map((personEntry) => personEntry.personId)}
                    focusUnitId={focusUnitId}
                    onRefresh={refresh}
                  />

                  {showWeapons && (
                    <SideWeaponsSection
                      eventId={event.id}
                      sideId={side.id}
                      sideName={side.name}
                      sideColor={sideColor}
                      sideUnits={sideUnitRows}
                      initialAdding={weaponCount === 0 && !sideWeaponsQuery.isError}
                    />
                  )}
                </SideColumn>
              )
            })}
          </SideGrid>
        </>
      )}
    </S.Section>
  )
}

const SideGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 28px 36px;
  align-items: start;
`

const SideColumn = styled.section<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 14px 0 16px;
  border-top: 2px solid ${({ $color }) => $color};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const SideColumnHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SideIdentity = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
`

const SideSwatchDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 2.5px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const SideTitleText = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MemberCountMeta = styled.span`
  font-size: 12px;
  color: ${metaText};
  ${DIGIT_DISPLAY}
`

const OutcomeBadge = styled.span<{ $outcome: SideOutcome }>`
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 700;
  background: ${({ $outcome, theme }) =>
    $outcome === 'VICTORY'
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(16, 185, 129, 0.14)'
      : $outcome === 'DEFEAT'
        ? theme.mode === 'dark'
          ? 'rgba(244, 63, 94, 0.2)'
          : 'rgba(244, 63, 94, 0.12)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.08)'};
  color: ${({ $outcome, theme }) =>
    $outcome === 'VICTORY'
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#047857'
      : $outcome === 'DEFEAT'
        ? theme.mode === 'dark'
          ? '#fb7185'
          : '#be123c'
        : theme.colors.text.secondary};
`
