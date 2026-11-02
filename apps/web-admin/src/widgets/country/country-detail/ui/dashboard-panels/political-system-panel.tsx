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

const SUMMARY_ROW_LIMIT = 4

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
  const [expanded, setExpanded] = useState(false)

  const systems = useMemo(
    () => [...(query.data ?? [])].sort(comparePoliticalSystems),
    [query.data],
  )
  const current = useMemo(() => resolveCurrentSystem(systems), [systems])
  /** 현행을 맨 위에 두고 나머지는 최신순으로 */
  const orderedSystems = useMemo(() => {
    const rev = [...systems].reverse()
    if (!current) return rev
    return [current, ...rev.filter((item) => item.id !== current.id)]
  }, [systems, current])

  const visibleSystems = expanded
    ? orderedSystems
    : orderedSystems.slice(0, SUMMARY_ROW_LIMIT)
  const hiddenCount = Math.max(0, orderedSystems.length - SUMMARY_ROW_LIMIT)

  const openCreate = (preset: GovernmentForm | null = null) => {
    setEditing(null)
    setPresetForm(preset)
    setFormOpen(true)
  }

  const openEdit = (system: PoliticalSystem) => {
    setEditing(system)
    setPresetForm(null)
    setFormOpen(true)
  }

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
      ) : orderedSystems.length === 0 ? (
        <TimelineRow $empty>
          <PeriodCol>
            <EmptyPeriodLabel>미등록</EmptyPeriodLabel>
          </PeriodCol>
          <BodyCol>
            <EmptyPresetRow role="group" aria-label="정체 빠른 등록">
              {QUICK_POLITY_PRESETS.map((formKey) => (
                <EmptyPresetChip
                  key={formKey}
                  type="button"
                  onClick={() => openCreate(formKey)}
                >
                  {GOVERNMENT_FORM_LABEL[formKey]}
                </EmptyPresetChip>
              ))}
            </EmptyPresetRow>
          </BodyCol>
        </TimelineRow>
      ) : (
        <TimelineList>
          {visibleSystems.map((system, rowIdx) => {
            const isPrimary = rowIdx === 0
            const headline = [
              system.governmentForm &&
                GOVERNMENT_FORM_LABEL[system.governmentForm],
              system.legislatureType &&
                LEGISLATURE_TYPE_LABEL[system.legislatureType],
            ].filter(Boolean)
            const specs = buildSpecs(system)

            return (
              <TimelineRow key={system.id}>
                <PeriodCol>
                  <Period $primary={isPrimary}>{formatPeriod(system)}</Period>
                  {system.isCurrent && <NowChip>현행</NowChip>}
                </PeriodCol>

                <BodyCol>
                  <TitleLine>
                    <Headline $primary={isPrimary}>
                      {headline.length > 0 ? (
                        headline.map((text, index) => (
                          <HeadlinePart key={text}>
                            {index > 0 && (
                              <HeadlineDot aria-hidden>·</HeadlineDot>
                            )}
                            {text}
                          </HeadlinePart>
                        ))
                      ) : (
                        <HeadlinePart>{summarize(system)}</HeadlinePart>
                      )}
                    </Headline>
                    {system.name && <SystemName>{system.name}</SystemName>}
                    {historicalCountryId == null &&
                      system.historicalCountryId != null && (
                        <PastChip>
                          {system.historicalCountry?.name ?? '과거 국가'}
                        </PastChip>
                      )}
                  </TitleLine>

                  {specs.length > 0 && (
                    <SpecsRow>
                      {specs.map((spec) => (
                        <SpecCell key={spec.key}>
                          <SpecKey>{spec.label}</SpecKey>
                          <SpecValue>
                            {spec.value}
                            {spec.note && <SpecNote>({spec.note})</SpecNote>}
                          </SpecValue>
                        </SpecCell>
                      ))}
                    </SpecsRow>
                  )}

                  {system.notes && <NotesRow>{system.notes}</NotesRow>}
                </BodyCol>

                <ActionCol>
                  <RowEditBtn type="button" onClick={() => openEdit(system)}>
                    수정
                  </RowEditBtn>
                </ActionCol>
              </TimelineRow>
            )
          })}

          {orderedSystems.length > SUMMARY_ROW_LIMIT && (
            <MoreRow>
              <MoreBtn
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? '접기' : `이전 정체 ${hiddenCount}개 더 보기`}
              </MoreBtn>
            </MoreRow>
          )}
        </TimelineList>
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

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
`

const TimelineRow = styled.div<{ $empty?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $empty }) =>
    $empty ? '136px minmax(0, 1fr)' : '136px minmax(0, 1fr) auto'};
  gap: 16px;
  align-items: baseline;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    padding-top: 2px;
    border-top: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr auto;
  }
`

const PeriodCol = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`

const EmptyPeriodLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BodyCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  @media (max-width: 640px) {
    grid-column: 1 / -1;
  }
`

const ActionCol = styled.div`
  display: inline-flex;
  align-items: center;
  justify-self: end;
`

const RowEditBtn = styled.button`
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EmptyPresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const EmptyPresetChip = styled.button`
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font-size: 12px;
  font-weight: 600;
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

const TitleLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  min-width: 0;
`

const Headline = styled.p<{ $primary?: boolean }>`
  margin: 0;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  font-size: ${({ $primary }) => ($primary ? '16.5px' : '14.5px')};
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
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
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Period = styled.span<{ $primary?: boolean }>`
  font-size: 13px;
  font-weight: ${({ $primary }) => ($primary ? 700 : 600)};
  font-variant-numeric: tabular-nums;
  color: ${({ $primary, theme }) =>
    $primary ? theme.colors.text.primary : theme.colors.text.secondary};
`

const NowChip = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  background: rgba(16, 185, 129, 0.16);
`

const PastChip = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
  background: rgba(245, 158, 11, 0.16);
`

const SpecsRow = styled.dl`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 4px;
`

const SpecCell = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding-right: 14px;
  margin-right: 14px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    padding-right: 0;
    margin-right: 0;
    border-right: none;
  }
`

const SpecKey = styled.dt`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpecValue = styled.dd`
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SpecNote = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NotesRow = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MoreRow = styled.div`
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
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
