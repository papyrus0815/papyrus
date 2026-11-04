/**
 * 정체(政體) 섹션 — 이 나라가 대통령제인지 의원내각제인지, 단원제인지 양원제인지.
 *
 * 정체 도메인은 원래 국가 상세 → 행정조직 → '정체' 탭에만 있었다. 세 번 눌러야 닿는
 * 자리라 "그런 기능이 없다"로 읽혔고, 실제로 14줄이 등록된 나라가 프랑스·미국 둘뿐이다.
 * 대시보드는 "이 나라가 어떤 나라인가"에 답하는 지면이니 **체제**가 여기서 먼저 읽혀야
 * 한다 — 수반이 누구인지보다 앞이다(행정조직 탭 순서와 같은 판단).
 *
 * 여기서 바로 등록·수정한다. 요약만 보여주고 편집은 탭으로 보내면 진입점이 다시 세 번
 * 누르기가 된다. 탭과 **같은 폼 모달**을 쓰므로 두 지면의 규칙이 갈라지지 않는다.
 */
import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import {
  usePoliticalSystems,
  useCreatePoliticalSystem,
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
  resolveCurrentSystem,
  STATE_STRUCTURE_LABEL,
  summarize,
} from '@/entities/political-system/model/political-system'
import { PoliticalSystemFormModal } from '@/features/government-info/ui/political-system-form.modal'
import { personCareerApi } from '@/shared/api/person-career'
import { getAllPersons } from '@/shared/api/persons'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { notify } from '@/shared/ui/toast'

import { IconLandmark } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { ChartSkeleton } from './chart-skeleton'
import { SectionHelpPopover } from './section-help-popover'

interface HeadRegisterTarget {
  positionId: string | null
  positionTitle: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  historicalCountryId: string | null
}

interface Props {
  /** 현대 국가 ID — 주면 브리지로 연결된 과거 국가의 정체까지 함께 온다 */
  countryId?: string
  /** 과거 국가 ID */
  historicalCountryId?: string
  countryName: string
  /** '시대별 전체 보기' — 행정조직 정체 탭으로 */
  onOpenAll: () => void
}

function stripDuplicateHouseLabel(label: string, name?: string | null): string | null {
  const trimmed = name?.trim() ?? ''
  if (!trimmed || trimmed === label) return null
  if (trimmed.startsWith(`${label} `)) {
    return trimmed.slice(label.length + 1).trim() || null
  }
  return trimmed
}

interface SpecItem {
  key: string
  label: string
  value: string
  note?: string
  empty?: boolean
  headAction?: HeadRegisterTarget
}

function buildSpecs(
  system: PoliticalSystem,
  includeEmpty = false,
): SpecItem[] {
  const specs: SpecItem[] = []

  const headOfState = headOfStateTitleOf(system)
  const headOfGovernment = headOfGovernmentTitleOf(system)
  const hasDistinctDualHeads =
    Boolean(headOfState) &&
    Boolean(headOfGovernment) &&
    headOfState !== headOfGovernment

  if (hasDistinctDualHeads && headOfState && headOfGovernment) {
    specs.push({
      key: 'hos',
      label: '국가원수',
      value: headOfState,
      note: system.headOfStateHasPower === false ? '상징' : '실권',
      headAction: {
        positionId: system.headOfStatePositionId ?? null,
        positionTitle: headOfState,
        positionType: 'HEAD_OF_STATE',
        historicalCountryId: system.historicalCountryId ?? null,
      },
    })
    specs.push({
      key: 'hog',
      label: '정부수반',
      value: headOfGovernment,
      note: system.headOfGovernmentHasPower === false ? '상징' : '실권',
      headAction: {
        positionId: system.headOfGovernmentPositionId ?? null,
        positionTitle: headOfGovernment,
        positionType: 'HEAD_OF_GOVERNMENT',
        historicalCountryId: system.historicalCountryId ?? null,
      },
    })
  } else if (headOfState) {
    specs.push({
      key: 'hos',
      label: '국가원수 · 정부수반',
      value: headOfState,
      note: system.headOfStateHasPower === false ? '상징' : '실권',
      headAction: {
        positionId: system.headOfStatePositionId ?? null,
        positionTitle: headOfState,
        positionType: 'HEAD_OF_STATE',
        historicalCountryId: system.historicalCountryId ?? null,
      },
    })
  } else if (headOfGovernment) {
    specs.push({
      key: 'hog',
      label: '정부수반',
      value: headOfGovernment,
      note: system.headOfGovernmentHasPower === false ? '상징' : '실권',
      headAction: {
        positionId: system.headOfGovernmentPositionId ?? null,
        positionTitle: headOfGovernment,
        positionType: 'HEAD_OF_GOVERNMENT',
        historicalCountryId: system.historicalCountryId ?? null,
      },
    })
  } else if (includeEmpty) {
    specs.push({
      key: 'hos-empty',
      label: '국가원수 · 정부수반',
      value: '미등록',
      empty: true,
    })
  }

  const hasLower = Boolean(
    system.lowerHouseName || system.lowerHouseSeats != null,
  )
  const hasUpper = Boolean(
    system.legislatureType === 'BICAMERAL' &&
      (system.upperHouseName || system.upperHouseSeats != null),
  )

  if (hasLower) {
    const label = primaryHouseLabel(system.legislatureType ?? null)
    const distinctName = stripDuplicateHouseLabel(label, system.lowerHouseName)
    specs.push({
      key: 'lower',
      label,
      value:
        [
          distinctName,
          system.lowerHouseSeats != null
            ? `${system.lowerHouseSeats.toLocaleString()}석`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || label,
    })
  }

  if (hasUpper) {
    const label = '상원'
    const distinctName = stripDuplicateHouseLabel(label, system.upperHouseName)
    specs.push({
      key: 'upper',
      label,
      value:
        [
          distinctName,
          system.upperHouseSeats != null
            ? `${system.upperHouseSeats.toLocaleString()}석`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || label,
    })
  }

  if (!hasLower && !hasUpper && includeEmpty) {
    specs.push({
      key: 'legislature-empty',
      label: '입법부 · 의회',
      value: system.legislatureType
        ? LEGISLATURE_TYPE_LABEL[system.legislatureType]
        : '미등록',
      empty: !system.legislatureType,
    })
  }

  if (system.stateStructure) {
    specs.push({
      key: 'structure',
      label: '국가 구조',
      value: STATE_STRUCTURE_LABEL[system.stateStructure],
    })
  } else if (includeEmpty) {
    specs.push({
      key: 'structure-empty',
      label: '국가 구조',
      value: '미등록',
      empty: true,
    })
  }

  if (system.partySystem) {
    specs.push({
      key: 'party',
      label: '정당제',
      value: PARTY_SYSTEM_LABEL[system.partySystem],
    })
  } else if (includeEmpty) {
    specs.push({
      key: 'party-empty',
      label: '정당제',
      value: '미등록',
      empty: true,
    })
  }

  return specs
}

const PAST_ROW_LIMIT = 4

export function PoliticalSystemPanel({
  countryId,
  historicalCountryId,
  countryName,
  onOpenAll,
}: Props) {
  const queryClient = useQueryClient()
  const scope = { countryId, historicalCountryId }
  const query = usePoliticalSystems(scope)
  const createMutation = useCreatePoliticalSystem()
  const updateMutation = useUpdatePoliticalSystem()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [headRegisterTarget, setHeadRegisterTarget] =
    useState<HeadRegisterTarget | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [registerPersonId, setRegisterPersonId] = useState<string | null>(null)

  const tenuresQuery = useQuery({
    queryKey: ['tenures-by-country', countryId || undefined, historicalCountryId],
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

  const countHeadTenuresFor = (action: HeadRegisterTarget): number => {
    const rows = (tenuresQuery.data ?? []) as Array<{
      title?: string | null
      positionType?: string | null
      historicalCountryId?: string | null
      positionDefinition?: {
        id?: string | null
        title?: string | null
        positionType?: string | null
      } | null
    }>
    const targetTitle = action.positionTitle.trim().replace(/\s+/g, '')
    return rows.filter((row) => {
      if (
        action.historicalCountryId &&
        row.historicalCountryId &&
        row.historicalCountryId !== action.historicalCountryId
      ) {
        return false
      }
      if (
        action.positionId &&
        row.positionDefinition?.id &&
        row.positionDefinition.id === action.positionId
      ) {
        return true
      }
      const rowTitle = (
        row.title ??
        row.positionDefinition?.title ??
        ''
      )
        .trim()
        .replace(/\s+/g, '')
      if (rowTitle && targetTitle && rowTitle === targetTitle) {
        return true
      }
      return false
    }).length
  }

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
  const current = useMemo(() => resolveCurrentSystem(systems), [systems])
  const pastSystems = useMemo(
    () =>
      [...systems]
        .filter((item) => item.id !== current?.id)
        .reverse(),
    [systems, current],
  )

  const visiblePast = expanded
    ? pastSystems
    : pastSystems.slice(0, PAST_ROW_LIMIT)
  const hiddenPastCount = Math.max(0, pastSystems.length - PAST_ROW_LIMIT)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (system: PoliticalSystem) => {
    setEditing(system)
    setFormOpen(true)
  }

  const currentHeadline = current
    ? [
        current.governmentForm && GOVERNMENT_FORM_LABEL[current.governmentForm],
        current.legislatureType &&
          LEGISLATURE_TYPE_LABEL[current.legislatureType],
      ].filter(Boolean)
    : []
  const currentSpecs = current ? buildSpecs(current, true) : []
  const currentHos = current ? headOfStateTitleOf(current) : null
  const currentHog = current ? headOfGovernmentTitleOf(current) : null
  const hasDualCurrentHeads =
    Boolean(currentHos) && Boolean(currentHog) && currentHos !== currentHog
  const totalLegislatureSeats =
    current && (current.lowerHouseSeats != null || current.upperHouseSeats != null)
      ? (current.lowerHouseSeats ?? 0) + (current.upperHouseSeats ?? 0)
      : null

  return (
    <S.Section
      id="section-polity"
      data-section-count={systems.length > 0 ? String(systems.length) : undefined}
    >
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconLandmark />
        </S.SectionTitleIcon>
        <S.SectionTitleText>정체</S.SectionTitleText>
        <SectionHelpPopover sectionKey="politicalSystem" />
        {systems.length > 0 && (
          <S.SectionCountChip>{systems.length}개</S.SectionCountChip>
        )}
        <S.SectionHeaderActions>
          {current && (
            <S.SectionAction type="button" onClick={() => openEdit(current)}>
              수정
            </S.SectionAction>
          )}
          <S.SectionAction type="button" onClick={openCreate}>
            {systems.length > 0 ? '+ 추가' : '+ 정체 등록'}
          </S.SectionAction>
          {systems.length > 0 && (
            <S.SectionLink type="button" onClick={onOpenAll}>
              시대별 전체 보기
            </S.SectionLink>
          )}
        </S.SectionHeaderActions>
      </S.SectionTitleRow>

      {query.isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : !current ? (
        <PolityStack>
          <S.SectionHeadlineStrip>
            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>현행 · 대표 정부 형태</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue $muted>미등록</S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                대통령제 · 의원내각제 · 군주제 등
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>
            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>통치 수반 구조</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue $muted>미등록</S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                국가원수 · 정부수반 직책 구성
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>
            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>입법부 · 의회 체제</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue $muted>미등록</S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                단원제 · 양원제 및 의석 정원
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>
            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>국가 구조 · 정당제</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue $muted>미등록</S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                단일국가 · 연방제 · 정당 체제
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>
          </S.SectionHeadlineStrip>

          <EmptyActionRow>
            <EmptyActionText>
              아직 등록된 정체가 없습니다. 헌법 체제·통치 수반 직책·입법부 구성을 등록하면 수반 인물 등록과도 바로 연동됩니다.
            </EmptyActionText>
            <EmptyActionBtn type="button" onClick={openCreate}>
              + 첫 정체 등록
            </EmptyActionBtn>
          </EmptyActionRow>
        </PolityStack>
      ) : (
        <PolityStack>
          <S.SectionHeadlineStrip>
            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>현행 · 대표 정부 형태</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue>
                {current.governmentForm
                  ? GOVERNMENT_FORM_LABEL[current.governmentForm]
                  : summarize(current)}
                {current.isCurrent && (
                  <S.SectionHeadlineUnit>현행</S.SectionHeadlineUnit>
                )}
              </S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                {[
                  current.name,
                  formatPeriod(current),
                  pastSystems.length > 0
                    ? `변천 ${systems.length}개 체제`
                    : '단일 체제 기록',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>

            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>통치 수반 구조</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue
                $muted={!currentHos && !currentHog}
              >
                {hasDualCurrentHeads
                  ? `${currentHos} · ${currentHog}`
                  : (currentHos ?? currentHog ?? '미등록')}
              </S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                {hasDualCurrentHeads
                  ? '국가원수 · 정부수반 분리(이원)'
                  : currentHos || currentHog
                    ? '단일 통치 수반 체제'
                    : '수반 직책 미입력'}
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>

            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>입법부 · 의회 체제</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue $muted={!current.legislatureType}>
                {current.legislatureType
                  ? LEGISLATURE_TYPE_LABEL[current.legislatureType]
                  : '미등록'}
                {totalLegislatureSeats != null && totalLegislatureSeats > 0 && (
                  <S.SectionHeadlineUnit>
                    {totalLegislatureSeats.toLocaleString()}석
                  </S.SectionHeadlineUnit>
                )}
              </S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                {[current.lowerHouseName, current.upperHouseName]
                  .filter(Boolean)
                  .join(' · ') ||
                  (current.legislatureType
                    ? '의회 명칭 · 정원 제원'
                    : '의회 형태 미입력')}
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>

            <S.SectionHeadlineCell>
              <S.SectionHeadlineLabel>국가 구조 · 정당제</S.SectionHeadlineLabel>
              <S.SectionHeadlineValue
                $muted={!current.stateStructure && !current.partySystem}
              >
                {[
                  current.stateStructure &&
                    STATE_STRUCTURE_LABEL[current.stateStructure],
                  current.partySystem &&
                    PARTY_SYSTEM_LABEL[current.partySystem],
                ]
                  .filter(Boolean)
                  .join(' · ') || '미등록'}
              </S.SectionHeadlineValue>
              <S.SectionHeadlineSub>
                {pastSystems.length > 0
                  ? `과거 ${pastSystems.length}개 구 체제 변천 기록`
                  : '권력 분산 · 정당 경쟁 구도'}
              </S.SectionHeadlineSub>
            </S.SectionHeadlineCell>
          </S.SectionHeadlineStrip>

          <PrimaryBlock>
            <PrimaryHeadRow>
              <AccentBar aria-hidden />
              <PrimaryHeadline>
                {currentHeadline.length > 0 ? (
                  currentHeadline.map((text, index) => (
                    <HeadlinePart key={text}>
                      {index > 0 && <HeadlineDot aria-hidden>·</HeadlineDot>}
                      {text}
                    </HeadlinePart>
                  ))
                ) : (
                  <HeadlinePart>{summarize(current)}</HeadlinePart>
                )}
              </PrimaryHeadline>
              {current.name && <SystemName>{current.name}</SystemName>}
              <Period $primary>{formatPeriod(current)}</Period>
              {current.isCurrent && <NowChip>현행</NowChip>}
              {historicalCountryId == null &&
                current.historicalCountryId != null && (
                  <PastChip>
                    {current.historicalCountry?.name ?? '과거 국가'}
                  </PastChip>
                )}
            </PrimaryHeadRow>

            {currentSpecs.length > 0 && (
              <PrimarySpecStrip>
                {currentSpecs.map((spec) => {
                  const headCount = spec.headAction
                    ? countHeadTenuresFor(spec.headAction)
                    : 0
                  return (
                    <SpecColumn key={spec.key}>
                      <SpecColumnKey>{spec.label}</SpecColumnKey>
                      <SpecColumnValue $muted={spec.empty}>
                        <span>{spec.value}</span>
                        {spec.note && (
                          <PowerTag $symbolic={spec.note === '상징'}>
                            {spec.note}
                          </PowerTag>
                        )}
                        {spec.headAction && (
                          <HeadRegisterBtn
                            type="button"
                            $empty={headCount === 0}
                            onClick={() => openHeadRegister(spec.headAction!)}
                            title={`「${spec.value}」 직책으로 수장 인물 등록`}
                          >
                            {headCount === 0
                              ? '+ 인물 등록'
                              : `${headCount}명 · + 추가`}
                          </HeadRegisterBtn>
                        )}
                        {spec.empty && (
                          <HeadRegisterBtn
                            type="button"
                            $empty
                            onClick={() => openEdit(current)}
                            title={`「${spec.label}」 제원 입력`}
                          >
                            + 입력
                          </HeadRegisterBtn>
                        )}
                      </SpecColumnValue>
                    </SpecColumn>
                  )
                })}
              </PrimarySpecStrip>
            )}

            {current.notes && <NotesRow>{current.notes}</NotesRow>}
          </PrimaryBlock>

          {pastSystems.length > 0 && (
            <PastLedgerWrap>
              <PastHeaderBar>
                <PastHeaderTitle>
                  과거 정체 변천 원장 ({pastSystems.length}개 체제)
                </PastHeaderTitle>
                {pastSystems.length > PAST_ROW_LIMIT && (
                  <MoreBtn
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                  >
                    {expanded
                      ? '이전 정체 접기'
                      : `이전 정체 ${hiddenPastCount}개 더 보기`}
                  </MoreBtn>
                )}
              </PastHeaderBar>

              <PastLedgerGrid role="list" aria-label="과거 정체 변천 원장">
                {visiblePast.map((system) => {
                  const pastHeadline = [
                    system.governmentForm &&
                      GOVERNMENT_FORM_LABEL[system.governmentForm],
                    system.legislatureType &&
                      LEGISLATURE_TYPE_LABEL[system.legislatureType],
                  ].filter(Boolean)
                  const pastSpecs = buildSpecs(system)

                  return (
                    <PastLedgerCell key={system.id} role="listitem">
                      <PastCellTopRow>
                        <PastTitleLine>
                          <PastPeriodBadge>{formatPeriod(system)}</PastPeriodBadge>
                          <PastHeadline>
                            {pastHeadline.length > 0
                              ? pastHeadline.join(' · ')
                              : summarize(system)}
                          </PastHeadline>
                          {system.name && (
                            <PastSystemName>{system.name}</PastSystemName>
                          )}
                          {historicalCountryId == null &&
                            system.historicalCountryId != null && (
                              <PastChip>
                                {system.historicalCountry?.name ?? '과거 국가'}
                              </PastChip>
                            )}
                        </PastTitleLine>
                        <RowEditBtn
                          type="button"
                          onClick={() => openEdit(system)}
                        >
                          수정
                        </RowEditBtn>
                      </PastCellTopRow>

                      {pastSpecs.length > 0 && (
                        <InlineSpecs>
                          {pastSpecs.map((spec) => (
                            <InlineSpecItem key={spec.key}>
                              <InlineSpecKey>{spec.label}</InlineSpecKey>
                              <InlineSpecVal>
                                {spec.value}
                                {spec.note && (
                                  <InlineSpecNote>({spec.note})</InlineSpecNote>
                                )}
                              </InlineSpecVal>
                            </InlineSpecItem>
                          ))}
                        </InlineSpecs>
                      )}
                    </PastLedgerCell>
                  )
                })}
              </PastLedgerGrid>
            </PastLedgerWrap>
          )}
        </PolityStack>
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
                countryId: countryId ?? null,
                historicalCountryId: historicalCountryId ?? null,
              })
          setFormOpen(false)

          const savedHeadSpecs = buildSpecs(saved).filter(
            (spec): spec is SpecItem & { headAction: HeadRegisterTarget } =>
              Boolean(spec.headAction),
          )
          // 실권 수반 우선으로 아직 인물이 0명인 수장 카테고리를 찾는다
          const prioritized = [...savedHeadSpecs].sort((left, right) =>
            left.note === '실권' && right.note !== '상징' ? -1 : 1,
          )
          const unfilled = prioritized.find(
            (spec) => countHeadTenuresFor(spec.headAction) === 0,
          )
          if (unfilled) {
            notify.success(
              `정체가 저장되었습니다. 이어서 「${unfilled.value}」 수장 인물을 등록해 보세요.`,
            )
            openHeadRegister(unfilled.headAction)
          } else {
            notify.success(
              editing ? '정체가 수정되었습니다' : '정체가 추가되었습니다',
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
    </S.Section>
  )
}

const PolityStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const PrimaryBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const PrimaryHeadRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  min-width: 0;
`

const AccentBar = styled.span<{ $muted?: boolean }>`
  width: 3.5px;
  height: 18px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $muted, theme }) =>
    $muted ? theme.colors.border.medium : '#6366f1'};
`

const PrimaryHeadline = styled.p<{ $muted?: boolean }>`
  margin: 0;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  font-size: ${({ $muted }) => ($muted ? '16px' : '19px')};
  font-weight: ${({ $muted }) => ($muted ? 700 : 800)};
  letter-spacing: -0.025em;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.primary};
`

const HeadlinePart = styled.span`
  display: inline-flex;
  align-items: baseline;
`

const HeadlineDot = styled.span`
  margin: 0 7px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SystemName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Period = styled.span<{ $primary?: boolean }>`
  font-size: ${({ $primary }) => ($primary ? '13.5px' : '12.5px')};
  font-weight: ${({ $primary }) => ($primary ? 700 : 600)};
  font-variant-numeric: tabular-nums;
  color: ${({ $primary, theme }) =>
    $primary ? theme.colors.text.secondary : theme.colors.text.tertiary};
`

const NowChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: rgba(16, 185, 129, 0.15);
`

const PastChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.15);
`

/**
 * 상·하단 1px · 셀 간 1px 수직 헤어라인으로 구성된 무컨테이너 정체 스펙 원장 그리드.
 */
const PrimarySpecStrip = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SpecColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 16px;
  min-width: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-right: none;
  }

  @media (max-width: 640px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

    &:last-child {
      border-bottom: none;
    }
  }
`

const SpecColumnKey = styled.dt`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpecColumnValue = styled.dd<{ $muted?: boolean }>`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14.5px;
  font-weight: ${({ $muted }) => ($muted ? 700 : 800)};
  letter-spacing: -0.015em;
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.primary};
`

const PowerTag = styled.span<{ $symbolic?: boolean }>`
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ $symbolic, theme }) =>
    $symbolic
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'};
  background: ${({ $symbolic, theme }) =>
    $symbolic
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'
      : 'rgba(99, 102, 241, 0.12)'};
`

const HeadRegisterBtn = styled.button<{ $empty?: boolean }>`
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid
    ${({ $empty, theme }) =>
      $empty ? 'rgba(99, 102, 241, 0.45)' : theme.colors.border.light};
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $empty, theme }) =>
    $empty
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  }
`

const EmptyActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 6px 2px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EmptyActionText = styled.span`
  flex: 1 1 260px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyActionBtn = styled.button`
  appearance: none;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  cursor: pointer;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
  }
`

/**
 * 과거 정체 변천 원장 — 2열 헤어라인 원장 그리드.
 */
const PastLedgerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
`

const PastHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const PastHeaderTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PastLedgerGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const PastLedgerCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 11px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (min-width: 760px) {
    &:nth-child(odd) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
      padding-right: 16px;
    }

    &:nth-child(even) {
      padding-left: 16px;
    }

    &:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      border-right: none;
      padding-right: 4px;
    }
  }
`

const PastCellTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const PastPeriodBadge = styled.span`
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const PastTitleLine = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const PastHeadline = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PastSystemName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InlineSpecs = styled.dl`
  margin: 0;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
`

const InlineSpecItem = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
`

const InlineSpecKey = styled.dt`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InlineSpecVal = styled.dd`
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InlineSpecNote = styled.span`
  margin-left: 3px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowEditBtn = styled.button`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  font-size: 11.5px;
  font-weight: 600;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const NotesRow = styled.p`
  margin: 0;
  padding-left: 13px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MoreBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`
