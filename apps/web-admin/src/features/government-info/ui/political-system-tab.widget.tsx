import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiBookOpen,
  FiEdit2,
  FiPlus,
  FiTrash2,
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
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { notify } from '@/shared/ui/toast'

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
}

/**
 * 정체·헌정 탭 — 대통령제/의원내각제/전제군주제, 단원제/양원제를 시대별 헌정 연혁으로 표시.
 */
export function PoliticalSystemTab({
  countryId,
  historicalCountryId,
  countryName,
}: Props) {
  const queryClient = useQueryClient()
  const scope = { countryId, historicalCountryId }
  const query = usePoliticalSystems(scope)
  const createMutation = useCreatePoliticalSystem()
  const updateMutation = useUpdatePoliticalSystem()
  const deleteMutation = useDeletePoliticalSystem()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [headRegisterTarget, setHeadRegisterTarget] =
    useState<HeadRegisterTarget | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [registerPersonId, setRegisterPersonId] = useState<string | null>(null)

  const tenuresQuery = useQuery({
    queryKey: [
      'tenures-by-country',
      countryId || undefined,
      historicalCountryId,
    ],
    queryFn: () =>
      personCareerApi.getTenuresByCountry({
        countryId: countryId || undefined,
        historicalCountryId,
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

  const systems = useMemo(
    () => [...(query.data ?? [])].sort(comparePoliticalSystems),
    [query.data],
  )

  const currentSystem = useMemo(
    () => systems.find((sysItem) => sysItem.isCurrent) ?? null,
    [systems],
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
          <ToolbarCaption>
            헌법 개정·체제 전환마다 기간별 통치형태·의회·원수 직함을 기록합니다.
          </ToolbarCaption>
        </ToolbarMeta>

        <PrimaryAddBtn type="button" onClick={openCreate}>
          <FiPlus size={15} />
          정체·헌정 추가
        </PrimaryAddBtn>
      </ToolbarSurface>

      {query.isLoading ? (
        <LoadingHint>헌정 체제 기록을 불러오는 중…</LoadingHint>
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
          <PrimaryAddBtn type="button" onClick={openCreate}>
            <FiPlus size={15} />
            첫 정체·헌정 체제 등록
          </PrimaryAddBtn>
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
                        {historicalCountryId == null &&
                        system.historicalCountryId != null ? (
                          <PastChip>
                            🏛️ {system.historicalCountry?.name ?? '과거 국가'}
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
                      <ActionBtn
                        type="button"
                        $danger
                        onClick={() => void handleDelete(system)}
                      >
                        <FiTrash2 size={12} />
                        삭제
                      </ActionBtn>
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
                            <InlineRegisterBtn
                              type="button"
                              onClick={() =>
                                openHeadRegister({
                                  positionId:
                                    system.headOfStatePositionId ?? null,
                                  positionTitle: hos,
                                  positionType: 'HEAD_OF_STATE',
                                  historicalCountryId:
                                    system.historicalCountryId ?? null,
                                })
                              }
                            >
                              + 수장 등록
                            </InlineRegisterBtn>
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
                            <InlineRegisterBtn
                              type="button"
                              onClick={() =>
                                openHeadRegister({
                                  positionId:
                                    system.headOfGovernmentPositionId ?? null,
                                  positionTitle: hog,
                                  positionType: 'HEAD_OF_GOVERNMENT',
                                  historicalCountryId:
                                    system.historicalCountryId ?? null,
                                })
                              }
                            >
                              + 수장 등록
                            </InlineRegisterBtn>
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
                </RegimeCard>
              </TimelineRow>
            )
          })}
        </TimelineList>
      )}

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
          defaultCountryId={countryId}
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

const ToolbarCaption = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PrimaryAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.14s ease;

  &:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
`

const LoadingHint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  padding: 36px 0;
`

const EmptyCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 24px;
  border-radius: 12px;
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
    theme.mode === 'dark'
      ? 'rgba(37, 99, 235, 0.16)'
      : 'rgba(37, 99, 235, 0.08)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
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

const InlineRegisterBtn = styled.button`
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.35)'
        : 'rgba(37, 99, 235, 0.25)'};
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
  cursor: pointer;

  &:hover {
    background: rgba(37, 99, 235, 0.08);
    border-color: #2563eb;
  }
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
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`

const ActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $danger, theme }) =>
      $danger
        ? theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.35)'
          : '#fecaca'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'};
  color: ${({ $danger, theme }) =>
    $danger
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#dc2626'
      : theme.colors.text.secondary};
  transition:
    background 0.14s,
    border-color 0.14s;

  &:hover {
    background: ${({ $danger, theme }) =>
      $danger
        ? theme.mode === 'dark'
          ? 'rgba(239, 68, 68, 0.15)'
          : '#fff1f2'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : '#f8fafc'};
  }
`
