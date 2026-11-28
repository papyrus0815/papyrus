import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBookOpen,
  FiCheckSquare,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiFileText,
  FiFlag,
  FiLink,
  FiPlus,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  usePoliticalSystems,
  useCreatePoliticalSystem,
  useDeletePoliticalSystem,
  usePromotePoliticalSystemHeadPositions,
  useUpdatePoliticalSystem,
  type PoliticalSystem,
} from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  diagnosePoliticalSystemsIntegrity,
  ELECTORAL_SYSTEM_TYPE_LABEL,
  findPoliticalSystemAtDate,
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  HEAD_SELECTION_METHOD_LABEL,
  headOfGovernmentTitleOf,
  headOfStateTitleOf,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
  WAR_POWER_AUTHORITY_LABEL,
} from '@/entities/political-system/model/political-system'
import { getElections } from '@/shared/api/election'
import {
  DIGIT_DISPLAY,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
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
import { pathKeys } from '@/shared/router'
import { PrimaryActionButton } from '@/shared/ui/primary-action-button'
import { getSignedDateChronologyKey } from '@/shared/lib/tenure-person-utils'
import { LedgerTableSkeleton } from '@/shared/ui/ledger-skeleton'
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

/** 연도 칸 글자 — '1603' · '기원전 52' */
function yearLabelOf(era: 'BC' | 'AD' | null, year: number | null): string | null {
  if (year == null) return null
  return era === 'BC' ? `기원전 ${year}` : String(year)
}

function buildSystemStartDateHint(system: PoliticalSystem): string | null {
  if (system.startYear == null) return null
  const prefix = system.startEra === 'BC' ? '-' : ''
  const yearPart =
    system.startEra === 'BC'
      ? String(system.startYear)
      : String(system.startYear).padStart(4, '0')
  const monthPart =
    system.startMonth != null
      ? `-${String(system.startMonth).padStart(2, '0')}`
      : ''
  const dayPart =
    system.startMonth != null && system.startDay != null
      ? `-${String(system.startDay).padStart(2, '0')}`
      : ''
  return `${prefix}${yearPart}${monthPart}${dayPart}`
}

function isMonarchicalStateSlot(system: PoliticalSystem, title: string): boolean {
  if (system.headOfStatePosition?.isMonarchical === true) return true
  if (system.headOfStatePosition?.isMonarchical === false) return false
  if (
    system.governmentForm === 'ABSOLUTE_MONARCHY' ||
    system.governmentForm === 'CONSTITUTIONAL_MONARCHY'
  ) {
    return true
  }
  return /국왕|여왕|황제|천황|대공|술탄|차르|샤|파라오|칸|군주|태왕|가한/i.test(
    title,
  )
}

interface HeadRegisterTarget {
  positionId: string | null
  positionTitle: string
  positionType: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'
  historicalCountryId: string | null
  isMonarchical?: boolean
  initialStartDate?: string | null
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
  /** 해당 헌정 체제 소속으로 행정부·내각 등록 모달 열기 */
  onRegisterCabinetForRegime?: (regimeId: string) => void
}

/**
 * 정체·헌정 탭 — 대통령제/의원내각제/전제군주제, 단원제/양원제를 시대별 헌정 연혁으로 표시.
 */
export function PoliticalSystemTab({
  countryId,
  historicalCountryId,
  countryName,
  onOpenCabinetsByRegime,
  onRegisterCabinetForRegime,
}: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const routeCountryId = countryId ?? historicalCountryId ?? ''
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
  const promoteHeadsMutation = usePromotePoliticalSystemHeadPositions()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [polityFilterId, setPolityFilterId] = useState<string>('ALL')
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false)
  const [headRegisterTarget, setHeadRegisterTarget] =
    useState<HeadRegisterTarget | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [registerPersonId, setRegisterPersonId] = useState<string | null>(null)

  const electionsQuery = useQuery({
    queryKey: [
      'elections-for-system-diagnostics',
      countryId ?? '',
      historicalCountryId ?? '',
    ],
    queryFn: () =>
      typeof getElections === 'function'
        ? getElections({
            countryId: countryId || undefined,
            historicalCountryId: historicalCountryId || undefined,
          })
        : Promise.resolve([]),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

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

  const matchedElectionsBySystemId = useMemo(() => {
    const resultMap = new Map<
      string,
      { count: number; previewTitles: string[]; extraCount: number }
    >()
    const rawElections = electionsQuery.data ?? []
    if (rawElections.length === 0 || allSystems.length === 0) return resultMap

    const sortedElections = [...rawElections].sort((left, right) =>
      String(left.pollDate ?? '').localeCompare(String(right.pollDate ?? '')),
    )

    const grouped = new Map<string, string[]>()
    for (const elItem of sortedElections) {
      const matchedSys = findPoliticalSystemAtDate(allSystems, {
        countryId: elItem.countryId,
        historicalCountryId: elItem.historicalCountryId,
        isoDate: elItem.pollDate,
        fallbackToCurrent: false,
      })
      if (!matchedSys) continue
      const titles = grouped.get(matchedSys.id) ?? []
      const label = (elItem.shortName ?? elItem.name ?? '').trim()
      if (label && !titles.includes(label)) {
        titles.push(label)
      } else if (!label) {
        titles.push(elItem.id)
      }
      grouped.set(matchedSys.id, titles)
    }

    for (const sysItem of allSystems) {
      const matchingCount = sortedElections.filter((elItem) => {
        const matchedSys = findPoliticalSystemAtDate(allSystems, {
          countryId: elItem.countryId,
          historicalCountryId: elItem.historicalCountryId,
          isoDate: elItem.pollDate,
          fallbackToCurrent: false,
        })
        return matchedSys?.id === sysItem.id
      }).length
      if (matchingCount === 0) continue
      const distinctTitles = grouped.get(sysItem.id) ?? []
      resultMap.set(sysItem.id, {
        count: matchingCount,
        previewTitles: distinctTitles.slice(0, 2),
        extraCount: Math.max(0, matchingCount - Math.min(distinctTitles.length, 2)),
      })
    }

    return resultMap
  }, [allSystems, electionsQuery.data])

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

  const integrityIssues = useMemo(
    () =>
      diagnosePoliticalSystemsIntegrity({
        systems: allSystems,
        electionDates: (electionsQuery.data ?? []).map((el) => ({
          id: el.id,
          name: el.name,
          pollDate: el.pollDate,
          countryId: el.countryId,
          historicalCountryId: el.historicalCountryId,
        })),
        cabinetDates: (cabinetsQuery.data ?? [])
          .filter(
            (cab) =>
              !shouldHideCabinetFromExecutiveTimeline(cab.headTenure, cab),
          )
          .map((cab) => ({
            id: cab.id,
            name: cab.name,
            politicalSystemId: (cab as { politicalSystemId?: string | null })
              .politicalSystemId,
            startDate: resolveCabinetEffectiveDates(cab).startDate,
            countryId: cab.countryId,
            historicalCountryId:
              cab.historicalCountryId ?? cab.headTenure?.historicalCountryId,
          })),
      }),
    [allSystems, electionsQuery.data, cabinetsQuery.data],
  )

  const hasUnlinkedHeadPositions = useMemo(
    () => integrityIssues.some((issue) => issue.kind === 'UNLINKED_HEAD_POSITION'),
    [integrityIssues],
  )

  const handleBatchPromoteHeadPositions = async () => {
    try {
      const result = await promoteHeadsMutation.mutateAsync({
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        createMissingDefinitions: true,
      })
      if (result.updatedSystemCount > 0) {
        notify.success(
          `수기 수반 직함 ${result.updatedSystemCount}개 체제를 관직 카탈로그 정본에 연결했습니다.${
            result.createdDefinitionCount > 0
              ? ` (신규 직위 ${result.createdDefinitionCount}건 생성)`
              : ''
          }`,
        )
      } else {
        notify.info('연결할 미연결 수기 수반 직함이 없습니다.')
      }
    } catch {
      notify.error('수기 수반 직함 일괄 연결에 실패했습니다.')
    }
  }

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

      {integrityIssues.length > 0 ? (
        <DiagnosticsSurface aria-label="헌정 연표 정합성 진단">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <DiagnosticsHeaderBtn
              type="button"
              onClick={() => setDiagnosticsExpanded((prev) => !prev)}
              aria-expanded={diagnosticsExpanded}
              style={{ flex: 1, minWidth: 220 }}
            >
              <span className="title-group">
                <FiAlertTriangle size={13.5} aria-hidden />
                <strong>헌정 연표 점검 {integrityIssues.length}건</strong>
                <span className="sub">
                  {integrityIssues[0]?.title}
                  {integrityIssues.length > 1
                    ? ` 외 ${integrityIssues.length - 1}건`
                    : ''}
                </span>
              </span>
              {diagnosticsExpanded ? (
                <FiChevronUp size={14} aria-hidden />
              ) : (
                <FiChevronDown size={14} aria-hidden />
              )}
            </DiagnosticsHeaderBtn>
            {hasUnlinkedHeadPositions ? (
              <DiagnosticsFixBtn
                type="button"
                disabled={promoteHeadsMutation.isPending}
                onClick={() => void handleBatchPromoteHeadPositions()}
                style={{ marginRight: 10 }}
              >
                <FiLink size={12} aria-hidden style={{ marginRight: 4 }} />
                {promoteHeadsMutation.isPending
                  ? '카탈로그 연결 중…'
                  : '미연결 수반 직함 일괄 연결'}
              </DiagnosticsFixBtn>
            ) : null}
          </div>
          {diagnosticsExpanded ? (
            <DiagnosticsList>
              {integrityIssues.map((issue, idx) => {
                const targetSys = issue.systemIds?.[0]
                  ? allSystems.find((sys) => sys.id === issue.systemIds![0])
                  : null
                return (
                  <DiagnosticsItem key={`${issue.kind}-${idx}`} $severity={issue.severity}>
                    <div className="body">
                      <strong>{issue.title}</strong>
                      <span>{issue.detail}</span>
                    </div>
                    <div style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
                      {issue.kind === 'UNLINKED_HEAD_POSITION' ? (
                        <DiagnosticsFixBtn
                          type="button"
                          disabled={promoteHeadsMutation.isPending}
                          onClick={() => void handleBatchPromoteHeadPositions()}
                        >
                          일괄 카탈로그 연결
                        </DiagnosticsFixBtn>
                      ) : null}
                      {targetSys ? (
                        <DiagnosticsFixBtn
                          type="button"
                          onClick={() => openEdit(targetSys)}
                        >
                          체제 수정
                        </DiagnosticsFixBtn>
                      ) : null}
                    </div>
                  </DiagnosticsItem>
                )
              })}
            </DiagnosticsList>
          ) : null}
        </DiagnosticsSurface>
      ) : null}

      {query.isLoading ? (
        <LedgerTableSkeleton
          rows={5}
          columns={4}
          showToolbar={false}
          label="정체·헌정 체제를 불러오는 중"
        />
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
        /*
          한 체제 = 한 줄. 행정부 연표와 같은 문법 — 왼쪽 연도 칸(시작 크게 · 끝 작게) + 이어지는 축 + 본문.
          예전엔 체제마다 테두리 카드 · 회색 상자 4개(국가원수 · 정부수반 · 하원 · 상원) · 카드마다 '수정' 단추가
          서 있어 네 체제가 화면 두 장을 넘겼고, 설명 글은 900px 한 줄로 늘어져 읽히지 않았다.
          넓은 칸에선 본문을 둘로 — 왼쪽 이름 · 형태 · 구성, 오른쪽 설명 · 역대 내각. 수정은 ⋯ 안에.
        */
        <RegimeList aria-label="헌정 체제 연혁">
          {systems.map((system, sysIndex) => {
            const hos = headOfStateTitleOf(system)
            const hog = headOfGovernmentTitleOf(system)
            const isDistinctDual = Boolean(hos && hog && hos !== hog)
            const fallbackTitle = system.governmentForm
              ? GOVERNMENT_FORM_LABEL[system.governmentForm]
              : '헌정 체제'
            const displayName = system.name || fallbackTitle
            const matchedInfo = matchedCabinetsBySystemId.get(system.id)
            const matchedElections = matchedElectionsBySystemId.get(system.id)
            const startLabel = yearLabelOf(system.startEra, system.startYear)
            const endLabel =
              yearLabelOf(system.endEra, system.endYear) ??
              (system.isCurrent ? '현재' : null)
            /* muted = 값 뒤 옅은 꼬리(' (상징)' · ' · 466석') — 구분 기호까지 담는다 */
            const facts: Array<{ key: string; label: string; value: string; muted?: string }> = []
            if (hos) {
              const hosMutedParts: string[] = []
              if (system.headOfStateHasPower === false) hosMutedParts.push('상징')
              if (system.headSelectionMethod) {
                hosMutedParts.push(
                  HEAD_SELECTION_METHOD_LABEL[system.headSelectionMethod],
                )
              }
              if (system.headOfStateTermYears != null) {
                const limitStr =
                  system.headOfStateTermLimit === 1
                    ? ' 단임'
                    : system.headOfStateTermLimit != null
                      ? ` 최대 ${system.headOfStateTermLimit}임`
                      : ''
                hosMutedParts.push(`${system.headOfStateTermYears}년${limitStr}`)
              }
              facts.push({
                key: 'hos',
                label: isDistinctDual ? '국가원수' : '국가원수 · 정부수반',
                value: hos,
                muted:
                  hosMutedParts.length > 0
                    ? ` (${hosMutedParts.join(' · ')})`
                    : undefined,
              })
            }
            if (hog && (!hos || isDistinctDual)) {
              facts.push({
                key: 'hog',
                label: '정부수반',
                value: hog,
                muted: system.headOfGovernmentHasPower === false ? ' (상징)' : undefined,
              })
            }
            if (system.lowerHouseName) {
              const lowerMetaParts: string[] = []
              if (system.lowerHouseSeats != null) {
                lowerMetaParts.push(
                  `${system.lowerHouseSeats.toLocaleString()}석`,
                )
              }
              if (system.lowerHouseTermYears != null) {
                lowerMetaParts.push(`임기 ${system.lowerHouseTermYears}년`)
              }
              if (system.electoralSystem) {
                lowerMetaParts.push(
                  ELECTORAL_SYSTEM_TYPE_LABEL[system.electoralSystem],
                )
              }
              if (system.electoralThresholdPercent != null) {
                lowerMetaParts.push(
                  `봉쇄 ${system.electoralThresholdPercent}%`,
                )
              }
              facts.push({
                key: 'lower',
                label: primaryHouseLabel(system.legislatureType),
                value: system.lowerHouseName,
                muted:
                  lowerMetaParts.length > 0
                    ? ` · ${lowerMetaParts.join(' · ')}`
                    : undefined,
              })
            }
            if (system.legislatureType === 'BICAMERAL' && system.upperHouseName) {
              const upperMetaParts: string[] = []
              if (system.upperHouseSeats != null) {
                upperMetaParts.push(
                  `${system.upperHouseSeats.toLocaleString()}석`,
                )
              }
              if (system.upperHouseTermYears != null) {
                upperMetaParts.push(`임기 ${system.upperHouseTermYears}년`)
              }
              facts.push({
                key: 'upper',
                label: '상원',
                value: system.upperHouseName,
                muted:
                  upperMetaParts.length > 0
                    ? ` · ${upperMetaParts.join(' · ')}`
                    : undefined,
              })
            }
            if (
              system.warPowerAuthority ||
              system.commanderInChiefPosition ||
              system.warPowerNotes
            ) {
              const primaryWarLabel = system.warPowerAuthority
                ? WAR_POWER_AUTHORITY_LABEL[system.warPowerAuthority]
                : system.commanderInChiefPosition
                  ? `통수권: ${system.commanderInChiefPosition.title}`
                  : '헌법 단서'
              const warTail: string[] = []
              if (
                system.warPowerAuthority &&
                system.commanderInChiefPosition?.title
              ) {
                warTail.push(`통수권 ${system.commanderInChiefPosition.title}`)
              }
              if (system.warConsentChamber?.name) {
                warTail.push(`${system.warConsentChamber.name} 동의`)
              }
              if (system.warPowerNotes?.trim()) {
                warTail.push(system.warPowerNotes.trim())
              }
              facts.push({
                key: 'warPower',
                label: '개전 · 통수권',
                value: primaryWarLabel,
                muted:
                  warTail.length > 0 ? ` (${warTail.join(' · ')})` : undefined,
              })
            }
            const tags = [
              system.governmentForm
                ? { key: 'form', label: GOVERNMENT_FORM_LABEL[system.governmentForm], tone: 'form' as const }
                : null,
              system.legislatureType
                ? { key: 'legislature', label: LEGISLATURE_TYPE_LABEL[system.legislatureType], tone: undefined }
                : null,
              system.stateStructure
                ? { key: 'structure', label: STATE_STRUCTURE_LABEL[system.stateStructure], tone: undefined }
                : null,
              system.partySystem
                ? { key: 'party', label: PARTY_SYSTEM_LABEL[system.partySystem], tone: undefined }
                : null,
            ].filter((tagItem): tagItem is NonNullable<typeof tagItem> => tagItem != null)
            const hasCabinets = Boolean(matchedInfo && matchedInfo.count > 0)
            const hasElections = Boolean(
              matchedElections && matchedElections.count > 0,
            )
            const hasBasisLinks = Boolean(
              system.constitutionLaw || system.foundingEvent,
            )
            const hasProse =
              Boolean(system.notes) ||
              hasCabinets ||
              hasElections ||
              hasBasisLinks
            const showPolity =
              (historicalCountryId == null ||
                system.historicalCountryId !== historicalCountryId) &&
              system.historicalCountryId != null

            return (
              <RegimeRow key={system.id}>
                <YearCol>
                  <span className="start">{startLabel ?? '?'}</span>
                  {endLabel ? <span className="end">– {endLabel}</span> : null}
                </YearCol>
                <AxisCol
                  aria-hidden
                  $first={sysIndex === 0}
                  $last={sysIndex === systems.length - 1}
                >
                  <AxisNode $current={Boolean(system.isCurrent)} />
                </AxisCol>

                <RegimeBody $hasProse={hasProse}>
                  <RegimeMain>
                    <TitleLine>
                      <Name>{displayName}</Name>
                      {system.isCurrent ? <CurrentChip>현행</CurrentChip> : null}
                      {showPolity ? (
                        <PastChip>
                          <PolityDot aria-hidden />
                          {system.historicalCountry?.name ?? '구성·과거 국가'}
                        </PastChip>
                      ) : null}
                    </TitleLine>

                    {tags.length > 0 ? (
                      <Tags>
                        {tags.map((tagItem) => (
                          <Tag key={tagItem.key} $tone={tagItem.tone}>
                            {tagItem.label}
                          </Tag>
                        ))}
                      </Tags>
                    ) : null}

                    {facts.length > 0 ? (
                      <FactList>
                        {facts.map((fact) => (
                          <div key={fact.key}>
                            <dt>{fact.label}</dt>
                            <dd>
                              {fact.value}
                              {fact.muted ? <Muted>{fact.muted}</Muted> : null}
                            </dd>
                          </div>
                        ))}
                      </FactList>
                    ) : null}
                  </RegimeMain>

                  {hasProse ? (
                    <RegimeProse>
                      {hasBasisLinks ? (
                        <BasisLinkRow aria-label="헌정 근거 및 출범 사건">
                          {system.constitutionLaw ? (
                            <BasisLinkChip
                              type="button"
                              onClick={() => {
                                const targetCountryId =
                                  system.historicalCountryId ??
                                  routeCountryId
                                if (!targetCountryId) return
                                navigate(
                                  `${pathKeys.countryLaws(targetCountryId)}?lawId=${encodeURIComponent(system.constitutionLaw!.id)}`,
                                )
                              }}
                              title="법령 탭에서 이 근거 헌법 보기"
                            >
                              <FiFileText size={12} aria-hidden />
                              <span className="kicker">근거 헌법</span>
                              <strong>{system.constitutionLaw.name}</strong>
                            </BasisLinkChip>
                          ) : null}
                          {system.foundingEvent ? (
                            <BasisLinkChip
                              type="button"
                              onClick={() =>
                                navigate(
                                  pathKeys.events.detail(
                                    system.foundingEvent!.id,
                                  ),
                                )
                              }
                              title="출범 계기 사건 상세 보기"
                            >
                              <FiFlag size={12} aria-hidden />
                              <span className="kicker">출범 사건</span>
                              <strong>{system.foundingEvent.title}</strong>
                            </BasisLinkChip>
                          ) : null}
                        </BasisLinkRow>
                      ) : null}
                      {system.notes ? <Notes>{system.notes}</Notes> : null}
                      {matchedInfo && hasCabinets ? (
                        <CabinetLine>
                          <FiUsers size={12.5} aria-hidden />
                          <span className="names">
                            {matchedInfo.leaderNames.length > 0 ? (
                              <>
                                <strong>{matchedInfo.leaderNames.join(' · ')}</strong>
                                {matchedInfo.extraLeaderCount > 0
                                  ? ` 외 ${matchedInfo.extraLeaderCount}명`
                                  : ''}
                              </>
                            ) : (
                              `연결된 행정부·내각 ${matchedInfo.count}개`
                            )}
                          </span>
                          {onOpenCabinetsByRegime ? (
                            <CabinetLinkBtn
                              type="button"
                              onClick={() => onOpenCabinetsByRegime(system.id)}
                            >
                              역대 내각 {matchedInfo.count}개
                              <FiArrowRight size={12} aria-hidden />
                            </CabinetLinkBtn>
                          ) : null}
                        </CabinetLine>
                      ) : null}
                      {matchedElections && hasElections ? (
                        <CabinetLine>
                          <FiCheckSquare size={12.5} aria-hidden />
                          <span className="names">
                            {matchedElections.previewTitles.length > 0 ? (
                              <>
                                <strong>
                                  {matchedElections.previewTitles.join(' · ')}
                                </strong>
                                {matchedElections.extraCount > 0
                                  ? ` 외 ${matchedElections.extraCount}건`
                                  : ''}
                              </>
                            ) : (
                              `치러진 선거 ${matchedElections.count}건`
                            )}
                          </span>
                          <CabinetLinkBtn
                            type="button"
                            onClick={() => {
                              const targetCountryId =
                                system.historicalCountryId &&
                                !countryId
                                  ? system.historicalCountryId
                                  : routeCountryId
                              if (!targetCountryId) return
                              navigate(
                                `${pathKeys.countryElections(targetCountryId)}?regimeId=${encodeURIComponent(system.id)}`,
                              )
                            }}
                          >
                            치러진 선거 {matchedElections.count}건
                            <FiArrowRight size={12} aria-hidden />
                          </CabinetLinkBtn>
                        </CabinetLine>
                      ) : null}
                    </RegimeProse>
                  ) : null}

                  <RowMenu>
                    <GovMorePopover
                      triggerSize="sm"
                      ariaLabel={`${displayName} 관리 메뉴`}
                      title="체제 수정 · 수장·내각 등록 · 삭제"
                      actions={[
                        {
                          key: 'edit-system',
                          label: '체제 수정',
                          icon: <FiEdit2 size={13.5} />,
                          onClick: () => openEdit(system),
                        },
                        ...(system.governmentForm !== 'ABSOLUTE_MONARCHY'
                          ? [
                              {
                                key: 'register-cabinet',
                                label: '이 체제 행정부·내각 등록',
                                icon: <FiUsers size={13.5} />,
                                onClick: () => {
                                  if (onRegisterCabinetForRegime) {
                                    onRegisterCabinetForRegime(system.id)
                                    return
                                  }
                                  if (!routeCountryId) return
                                  navigate(
                                    `${pathKeys.countryGovernment(routeCountryId)}?regimeId=${encodeURIComponent(system.id)}&createCabinet=1`,
                                  )
                                },
                              },
                            ]
                          : []),
                        ...(hos
                          ? [
                              {
                                key: 'register-hos',
                                label: `${hos} 인물 등록`,
                                icon: <FiUserPlus size={13.5} />,
                                onClick: () =>
                                  openHeadRegister({
                                    positionId: system.headOfStatePositionId ?? null,
                                    positionTitle: hos,
                                    positionType: 'HEAD_OF_STATE' as const,
                                    historicalCountryId: system.historicalCountryId ?? null,
                                    isMonarchical: isMonarchicalStateSlot(
                                      system,
                                      hos,
                                    ),
                                    initialStartDate:
                                      buildSystemStartDateHint(system),
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
                                    positionId: system.headOfGovernmentPositionId ?? null,
                                    positionTitle: hog,
                                    positionType: 'HEAD_OF_GOVERNMENT' as const,
                                    historicalCountryId: system.historicalCountryId ?? null,
                                    isMonarchical: false,
                                    initialStartDate:
                                      buildSystemStartDateHint(system),
                                  }),
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
                  </RowMenu>
                </RegimeBody>
              </RegimeRow>
            )
          })}
        </RegimeList>
      )}

      <ChamberCatalogSection
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        defaultLegislatureType={currentSystem?.legislatureType ?? null}
      />

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
              isMonarchical: false,
              initialStartDate: buildSystemStartDateHint(saved),
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
              isMonarchical: isMonarchicalStateSlot(saved, hos),
              initialStartDate: buildSystemStartDateHint(saved),
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
          initialStartDate={headRegisterTarget.initialStartDate ?? null}
          defaultMonarchical={Boolean(headRegisterTarget.isMonarchical)}
          defaultDefinitionTitle={
            headRegisterTarget.isMonarchical
              ? headRegisterTarget.positionTitle
              : undefined
          }
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

/* 연도 칸 · 축 칸 폭과 노드 높이(이름 줄 가운데) — 행정부 연표와 같은 값 */
const YEAR_COL_PX = 88
const AXIS_COL_PX = 22
const NODE_TOP_PX = 26
/** 이 폭(체제 목록 칸)부터 본문을 두 칸(이름·구성 | 설명·내각)으로 */
const REGIME_WIDE_PX = 860

const RegimeList = styled.ol`
  container-type: inline-size;
  list-style: none;
  margin: 0;
  padding: 0;
`

const RegimeRow = styled.li`
  display: grid;
  grid-template-columns: ${YEAR_COL_PX}px ${AXIS_COL_PX}px minmax(0, 1fr);
  column-gap: 12px;

  @container (max-width: 560px) {
    grid-template-columns: 58px 18px minmax(0, 1fr);
    column-gap: 8px;
  }
`

const YearCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: ${NODE_TOP_PX - 11}px;
  text-align: right;
  ${DIGIT_DISPLAY}

  .start {
    font-size: 19px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.text.primary};
    word-break: keep-all;
  }
  .end {
    margin-top: 3px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
  }

  @container (max-width: 560px) {
    .start {
      font-size: 16px;
    }
  }
`

const AxisCol = styled.div<{ $first: boolean; $last: boolean }>`
  position: relative;

  &::before {
    content: '';
    display: ${({ $first }) => ($first ? 'none' : 'block')};
    position: absolute;
    left: 50%;
    top: 0;
    height: ${NODE_TOP_PX}px;
    margin-left: -1px;
    border-left: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
  &::after {
    content: '';
    display: ${({ $last }) => ($last ? 'none' : 'block')};
    position: absolute;
    left: 50%;
    top: ${NODE_TOP_PX}px;
    bottom: 0;
    margin-left: -1px;
    border-left: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const AxisNode = styled.span<{ $current: boolean }>`
  position: absolute;
  z-index: 1;
  left: 50%;
  top: ${NODE_TOP_PX}px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid
    ${({ $current, theme }) =>
      $current ? '#10b981' : theme.mode === 'dark' ? '#64748b' : '#94a3b8'};
  background: ${({ $current, theme }) =>
    $current ? '#10b981' : theme.colors.background.primary};
`

/* 행 사이는 가는 선 하나 — 테두리 카드 대신. ⋯는 오른쪽 위에 */
const RegimeBody = styled.div<{ $hasProse: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px 40px;
  min-width: 0;
  padding: 16px 40px 20px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  li:last-child > & {
    border-bottom: none;
  }

  @container (min-width: ${REGIME_WIDE_PX}px) {
    grid-template-columns: ${({ $hasProse }) =>
      $hasProse ? 'minmax(0, 1fr) minmax(0, 1.05fr)' : 'minmax(0, 1fr)'};
  }
`

const RegimeMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const RegimeProse = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;

  @container (min-width: ${REGIME_WIDE_PX}px) {
    padding-top: 4px;
  }
`

const RowMenu = styled.div`
  position: absolute;
  top: 12px;
  right: 0;
`

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 24px;
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

/* 국가원수 · 정부수반 · 하원 · 상원 — 회색 상자 대신 이름표 + 값만, 칸 사이는 간격으로 */
const FactList = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px 20px;

  /* 폰 폭은 두 칸 — 150px면 한 칸씩 내려가 네 줄이 됐다 */
  @container (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
  }

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-left: 10px;
    border-left: 2px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
  dt {
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  dd {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.primary};
    word-break: keep-all;
  }
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* 설명 — 넓은 칸에선 오른쪽 반 칸이라 한 줄이 40자 남짓, 좁으면 72자에서 끊는다 */
const Notes = styled.p`
  margin: 0;
  max-width: 72ch;
  font-size: 13px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: keep-all;
`

const PolityDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.72;
  flex-shrink: 0;
`

/* 이 체제 아래 수반들 + 역대 내각으로 — 예전 점선 띠·파란 상자 단추 대신 글자 한 줄 */
const CabinetLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  .names {
    min-width: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CabinetLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const BasisLinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const BasisLinkChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : '#f8fafc'};
  font: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    color 0.14s ease;

  .kicker {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
  }
`

const DiagnosticsSurface = styled.div`
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.35)'
        : 'rgba(217, 119, 6, 0.3)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.08)'
      : 'rgba(254, 243, 199, 0.5)'};
  overflow: hidden;
`

const DiagnosticsHeaderBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fbbf24' : '#92400e'};
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  text-align: left;

  .title-group {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }
  .sub {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 12px;
  }
`

const DiagnosticsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 12px 10px;
`

const DiagnosticsItem = styled.div<{ $severity: 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 7px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.78)'};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;

  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  strong {
    font-weight: 700;
    color: ${({ theme, $severity }) =>
      $severity === 'warning'
        ? theme.mode === 'dark'
          ? '#fbbf24'
          : '#b45309'
        : theme.colors.text.primary};
  }
  span {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const DiagnosticsFixBtn = styled.button`
  flex-shrink: 0;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? GOV_BRAND.primaryDark : GOV_BRAND.primary};
  }
`
