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
  type GovernmentForm,
} from '@/entities/political-system/model/political-system'
import { PoliticalSystemFormModal } from '@/features/government-info/ui/political-system-form.modal'
import { notify } from '@/shared/ui/toast'

import { IconLandmark } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { ChartSkeleton } from './chart-skeleton'
import { SectionHelpPopover } from './section-help-popover'

const QUICK_POLITY_PRESETS: GovernmentForm[] = [
  'PRESIDENTIAL',
  'PARLIAMENTARY',
  'SEMI_PRESIDENTIAL',
  'CONSTITUTIONAL_MONARCHY',
  'ABSOLUTE_MONARCHY',
  'ONE_PARTY',
]

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
}

function buildSpecs(system: PoliticalSystem): SpecItem[] {
  const specs: SpecItem[] = []

  const headOfState = headOfStateTitleOf(system)
  if (headOfState) {
    specs.push({
      key: 'hos',
      label: '국가원수',
      value: headOfState,
      note: system.headOfStateHasPower === false ? '상징' : '실권',
    })
  }

  const headOfGovernment = headOfGovernmentTitleOf(system)
  const isUnifiedExecutive =
    system.governmentForm === 'PRESIDENTIAL' ||
    system.governmentForm === 'ABSOLUTE_MONARCHY'
  if (headOfGovernment) {
    specs.push({
      key: 'hog',
      label: '정부수반',
      value: headOfGovernment,
      note: system.headOfGovernmentHasPower === false ? '상징' : '실권',
    })
  } else if (isUnifiedExecutive && headOfState) {
    specs.push({
      key: 'hog',
      label: '정부수반',
      value: `${headOfState} 겸임`,
    })
  }

  if (system.lowerHouseName || system.lowerHouseSeats != null) {
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

  if (
    system.legislatureType === 'BICAMERAL' &&
    (system.upperHouseName || system.upperHouseSeats != null)
  ) {
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

  if (system.stateStructure) {
    specs.push({
      key: 'structure',
      label: '국가 구조',
      value: STATE_STRUCTURE_LABEL[system.stateStructure],
    })
  }

  if (system.partySystem) {
    specs.push({
      key: 'party',
      label: '정당제',
      value: PARTY_SYSTEM_LABEL[system.partySystem],
    })
  }

  return specs
}

export function PoliticalSystemPanel({
  countryId,
  historicalCountryId,
  countryName,
  onOpenAll,
}: Props) {
  const scope = { countryId, historicalCountryId }
  const query = usePoliticalSystems(scope)
  const createMutation = useCreatePoliticalSystem()
  const updateMutation = useUpdatePoliticalSystem()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [presetForm, setPresetForm] = useState<GovernmentForm | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)

  const systems = useMemo(
    () => [...(query.data ?? [])].sort(comparePoliticalSystems),
    [query.data],
  )
  const current = useMemo(() => resolveCurrentSystem(systems), [systems])
  const reverseChronological = useMemo(
    () => [...systems].reverse(),
    [systems],
  )
  const activeSystem = useMemo(() => {
    if (!current) return null
    if (!selectedSystemId) return current
    return systems.find((item) => item.id === selectedSystemId) ?? current
  }, [systems, current, selectedSystemId])

  const openCreate = (preset: GovernmentForm | null = null) => {
    setEditing(null)
    setPresetForm(preset)
    setFormOpen(true)
  }

  const headline = activeSystem
    ? [
        activeSystem.governmentForm &&
          GOVERNMENT_FORM_LABEL[activeSystem.governmentForm],
        activeSystem.legislatureType &&
          LEGISLATURE_TYPE_LABEL[activeSystem.legislatureType],
      ].filter(Boolean)
    : []

  const specs = activeSystem ? buildSpecs(activeSystem) : []

  return (
    <S.Section>
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
          {activeSystem && (
            <S.SectionAction
              type="button"
              onClick={() => {
                setEditing(activeSystem)
                setPresetForm(null)
                setFormOpen(true)
              }}
            >
              수정
            </S.SectionAction>
          )}
          <S.SectionAction type="button" onClick={() => openCreate(null)}>
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
      ) : !activeSystem ? (
        <EmptyPresetRow role="group" aria-label="정체 빠른 등록">
          <EmptyPresetHint>체제 선택</EmptyPresetHint>
          {QUICK_POLITY_PRESETS.map((formKey) => (
            <EmptyPresetChip
              key={formKey}
              type="button"
              onClick={() => openCreate(formKey)}
            >
              + {GOVERNMENT_FORM_LABEL[formKey]}
            </EmptyPresetChip>
          ))}
        </EmptyPresetRow>
      ) : (
        <OpenBody>
          <Head>
            <HeadLeft>
              <Headline>
                {headline.length > 0 ? (
                  headline.map((text, index) => (
                    <HeadlinePart key={text}>
                      {index > 0 && <HeadlineDot aria-hidden>·</HeadlineDot>}
                      {text}
                    </HeadlinePart>
                  ))
                ) : (
                  <HeadlinePart>{summarize(activeSystem)}</HeadlinePart>
                )}
              </Headline>
              <Meta>
                {activeSystem.name && (
                  <SystemName>{activeSystem.name}</SystemName>
                )}
                <Period>{formatPeriod(activeSystem)}</Period>
                {activeSystem.isCurrent && <NowChip>현행</NowChip>}
                {historicalCountryId == null &&
                  activeSystem.historicalCountryId != null && (
                    <PastChip>
                      {activeSystem.historicalCountry?.name ?? '과거 국가'}
                    </PastChip>
                  )}
              </Meta>
            </HeadLeft>

            {reverseChronological.length > 1 && (
              <EraTabsRow role="tablist" aria-label="시대별 정체 선택">
                {reverseChronological.map((system) => {
                  const isSelected = system.id === activeSystem.id
                  return (
                    <EraTabPill
                      key={system.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      $active={isSelected}
                      onClick={() => setSelectedSystemId(system.id)}
                    >
                      <EraTabPeriod>{formatPeriod(system)}</EraTabPeriod>
                      <EraTabName>
                        {system.name || summarize(system)}
                      </EraTabName>
                      {system.isCurrent && <EraTabNow>현행</EraTabNow>}
                    </EraTabPill>
                  )
                })}
              </EraTabsRow>
            )}
          </Head>

          {specs.length > 0 && (
            <SpecsRow>
              {specs.map((spec) => (
                <SpecCell key={spec.key}>
                  <SpecKey>{spec.label}</SpecKey>
                  <SpecValue>
                    {spec.value}
                    {spec.note && <SpecNote>{spec.note}</SpecNote>}
                  </SpecValue>
                </SpecCell>
              ))}
            </SpecsRow>
          )}

          {activeSystem.notes && <NotesRow>{activeSystem.notes}</NotesRow>}
        </OpenBody>
      )}

      <PoliticalSystemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        initialGovernmentForm={presetForm}
        defaultIsCurrent={systems.length === 0}
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        onSubmit={async (dto) => {
          if (editing) {
            await updateMutation.mutateAsync({ id: editing.id, dto })
            notify.success('정체가 수정되었습니다')
          } else {
            await createMutation.mutateAsync({
              ...dto,
              countryId: countryId ?? null,
              historicalCountryId: historicalCountryId ?? null,
            })
            notify.success('정체가 추가되었습니다')
          }
          setFormOpen(false)
        }}
      />
    </S.Section>
  )
}

const OpenBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const EmptyPresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const EmptyPresetHint = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 4px;
`

const EmptyPresetChip = styled.button`
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.48);
    background: rgba(99, 102, 241, 0.07);
    color: #4f46e5;
  }
`

const EraTabsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const EraTabPill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'rgba(99, 102, 241, 0.5)' : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : '#eef2ff'
      : 'transparent'};
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.22)'
          : '#e0e7ff'
        : theme.colors.hover};
  }
`

const EraTabPeriod = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EraTabName = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EraTabNow = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: rgba(16, 185, 129, 0.16);
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
`

const HeadLeft = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
  min-width: 0;
`

/* 체제 이름이 주인공이다 — 기간·별칭보다 확실히 크게 */
const Headline = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadlinePart = styled.span`
  display: inline-flex;
  align-items: baseline;
`

const HeadlineDot = styled.span`
  margin: 0 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Meta = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const SystemName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Period = styled.span`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NowChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: rgba(16, 185, 129, 0.16);
`

const PastChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.16);
`

const SpecsRow = styled.dl`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 6px;
`

const SpecCell = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  padding-right: 16px;
  margin-right: 16px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    padding-right: 0;
    margin-right: 0;
    border-right: none;
  }
`

const SpecKey = styled.dt`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpecValue = styled.dd`
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SpecNote = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NotesRow = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`
