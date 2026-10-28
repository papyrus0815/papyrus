import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertTriangle, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import {
  formatObservationExact,
  formatObservationValue,
  isUnverified,
  observationExtent,
} from '@/entities/evidence/lib/format-observation'
import { eventTypeFeatures } from '@/entities/event/model'
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import { deleteObservation, type Observation } from '@/shared/api/evidence'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys, eventObservationsQueryOptions } from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'
import { ObservationFormModal, type ObservationSubjectOption } from './observation-form-modal'
import { withSideColors } from './side-colors'
import { buildSideMetricRows, formatRate, lossRate } from './side-metrics.lib'

interface ModuleMetricsProps {
  event: EventDetail
}

const NEUTRAL = '#64748b'

/**
 * 수치(D3) — 병력·사상자·비용 같은 측정값. 숫자의 정본이 본문이 아니라 여기 있다.
 *
 * 맨 위는 **진영 비교표** — 진영 값은 '지표 행 × 진영 열' 한 표에, 칸마다 값 + 행 눈금 막대(범위는 수염).
 * 동원 병력과 손실이 다 있으면 손실률(계산) 줄. 아래는 진영 밖 대상(사건 전체·참여국)별 목록.
 * 출처가 검증되지 않은 값은 숨기지 않고 막대를 흐리게 그린다.
 */
export function ModuleMetrics({ event }: ModuleMetricsProps) {
  const queryClient = useQueryClient()
  const { data: observations = [] } = useQuery(eventObservationsQueryOptions(event.id))
  const [editing, setEditing] = useState<Observation | 'new' | null>(null)

  /* 색 없는 진영은 순서대로 팔레트 — 비교 막대가 둘 다 같은 회색이면 어느 편인지 모른다 */
  const sides = useMemo(() => withSideColors(event.sides ?? []), [event.sides])
  /* 지표 추천·첫 대상·빈 안내는 형식이, 형식이 정하지 않으면 분야가 정한다(경제 사건에 '병력·사상자'를 권하지 않게) */
  const features = eventTypeFeatures(event.type, event.domain)

  /** 측정값 대상 선택지 — 사건 전체 · 진영 · 참여국 줄 */
  const subjects = useMemo<ObservationSubjectOption[]>(() => {
    const options: ObservationSubjectOption[] = [
      { subjectType: 'EVENT', subjectId: event.id, label: '사건 전체', color: null },
    ]
    for (const side of sides) {
      options.push({ subjectType: 'EVENT_SIDE', subjectId: side.id, label: side.name, color: side.color })
    }
    for (const country of [...(event.relatedHistoricalCountries ?? []), ...(event.relatedCountries ?? [])]) {
      if (!country.participantId) continue
      options.push({
        subjectType: 'EVENT_PARTICIPANT',
        subjectId: country.participantId,
        label: country.name,
        color: sides.find((side) => side.id === country.sideId)?.color ?? null,
      })
    }
    return options
  }, [event.id, event.relatedCountries, event.relatedHistoricalCountries, sides])

  const subjectOf = (observation: Observation) =>
    subjects.find(
      (option) => option.subjectType === observation.subjectType && option.subjectId === observation.subjectId,
    )

  /**
   * 진영 비교표 — 진영 대상 측정값은 '지표 행 × 진영 열' 표 하나로(side-metrics.lib).
   * 예전엔 막대 차트와 진영별 목록이 같은 값을 두 번 보였다. 열은 측정값이 하나라도 있는 진영만.
   */
  const sideRows = useMemo(() => buildSideMetricRows(observations, sides.map((side) => side.id)), [observations, sides])
  const tableSides = useMemo(
    () => sides.filter((side) => sideRows.some((row) => row.cells.has(side.id))),
    [sides, sideRows],
  )
  /* 손실률(파생) — 동원 병력과 손실 지표가 하나씩 있는 진영만. 한 진영이라도 있으면 줄을 세운다 */
  const lossRates = useMemo(
    () => new Map(tableSides.map((side) => [side.id, lossRate(sideRows, side.id)] as const)),
    [tableSides, sideRows],
  )
  const hasLossRate = [...lossRates.values()].some(Boolean)

  /** 목록 — 비교표에 든 진영 값을 뺀 나머지(사건 전체 → 참여국) */
  const grouped = useMemo(() => {
    const groups = new Map<string, Observation[]>()
    for (const observation of observations) {
      if (observation.subjectType === 'EVENT_SIDE' && sides.some((side) => side.id === observation.subjectId)) continue
      const key = `${observation.subjectType}:${observation.subjectId}`
      groups.set(key, [...(groups.get(key) ?? []), observation])
    }
    return subjects
      .map((option) => ({ option, rows: groups.get(`${option.subjectType}:${option.subjectId}`) ?? [] }))
      .filter((group) => group.rows.length > 0)
  }, [observations, subjects, sides])

  const unverifiedCount = observations.filter(isUnverified).length
  /**
   * 전부 미검증이면 행마다 '출처 미검증'을 달지 않는다 — 위 경고 한 줄이 이미 말한다(보불전쟁: 경고 1 + 배지 17).
   * 검증된 값과 섞여 있을 때만 미검증 행에 배지를 단다(그때는 어느 값인지가 정보다).
   */
  const allUnverified = observations.length > 0 && unverifiedCount === observations.length

  const remove = async (observation: Observation) => {
    const ok = await confirm({
      title: '이 수치를 지울까요?',
      message: `${observation.metric.name} ${formatObservationValue(observation)} — 출처 인용도 함께 지워집니다.`,
      confirmLabel: '지우기',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteObservation(observation.id)
      await queryClient.invalidateQueries({ queryKey: eventKeys.observations(event.id) })
      notify.success('수치를 지웠습니다')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '지우지 못했습니다')
    }
  }

  return (
    <S.Section id="module-metrics">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.metrics} />
          수치
        </S.SectionTitle>
        {observations.length > 0 && <S.SectionSubtitle>{observations.length}</S.SectionSubtitle>}
        <S.SectionActions>
          <AddButton type="button" onClick={() => setEditing('new')}>
            <FiPlus /> 수치 추가
          </AddButton>
        </S.SectionActions>
      </S.SectionHeader>

      {unverifiedCount > 0 && (
        <Warning role="note">
          <FiAlertTriangle aria-hidden="true" />
          {allUnverified ? '이 사건의 수치는 모두' : `${unverifiedCount}개 수치는`} 출처가 검증되지 않았습니다 — 기존
          시드가 출처 없이 넣은 값입니다.
        </Warning>
      )}

      {sideRows.length > 0 && (
        <TableScroll>
          <SideTable aria-label="진영별 수치">
            <thead>
              <tr>
                <th scope="col">지표</th>
                {tableSides.map((side) => (
                  <th key={side.id} scope="col">
                    <SideSwatch style={{ background: side.color }} aria-hidden />
                    {side.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sideRows.map((row) => {
                /* 막대 눈금은 행(지표)마다 — 병력과 사상자를 한 자로 재면 작은 쪽이 다 0이 된다 */
                const max = Math.max(
                  ...[...row.cells.values()].flat().map((observation) => observationExtent(observation)?.high ?? 0),
                )
                return (
                  <tr key={row.key}>
                    <th scope="row">{row.name}</th>
                    {tableSides.map((side) => {
                      const cell = row.cells.get(side.id) ?? []
                      if (cell.length === 0) return <EmptyCell key={side.id}>—</EmptyCell>
                      return (
                        <td key={side.id}>
                          {cell.map((observation) => {
                            const extent = observationExtent(observation)
                            const scale = (value: number) => (max > 0 ? (value / max) * 100 : 0)
                            return (
                              <CellEntry key={observation.id}>
                                <CellTop>
                                  <CellValue title={formatObservationExact(observation)}>
                                    {formatObservationValue(observation)}
                                  </CellValue>
                                  <CellActions>
                                    <IconButton
                                      type="button"
                                      onClick={() => setEditing(observation)}
                                      aria-label={`${side.name} ${row.name} 수정`}
                                    >
                                      <FiEdit2 />
                                    </IconButton>
                                    <IconButton
                                      type="button"
                                      onClick={() => void remove(observation)}
                                      aria-label={`${side.name} ${row.name} 지우기`}
                                    >
                                      <FiTrash2 />
                                    </IconButton>
                                  </CellActions>
                                </CellTop>
                                {extent && (
                                  <BarTrack aria-hidden>
                                    <Bar
                                      style={{ width: `${scale(extent.center)}%`, background: side.color }}
                                      $unverified={isUnverified(observation)}
                                    />
                                    {extent.high > extent.low && (
                                      <Whisker
                                        style={{
                                          left: `${scale(extent.low)}%`,
                                          width: `${scale(extent.high) - scale(extent.low)}%`,
                                        }}
                                      />
                                    )}
                                  </BarTrack>
                                )}
                                {(observation.qualifier || (isUnverified(observation) && !allUnverified)) && (
                                  <CellNote>
                                    {observation.qualifier}
                                    {isUnverified(observation) && !allUnverified && (
                                      <SourceBadge $unverified>출처 미검증</SourceBadge>
                                    )}
                                  </CellNote>
                                )}
                              </CellEntry>
                            )
                          })}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {hasLossRate && (
                <DerivedRow>
                  <th scope="row" title="손실 지표 ÷ 동원 병력 — 저장된 값이 아니라 위 두 줄로 계산한 값">
                    손실률
                    <DerivedHint>계산</DerivedHint>
                  </th>
                  {tableSides.map((side) => {
                    const derived = lossRates.get(side.id)
                    return derived ? (
                      <td key={side.id} title={`${derived.lossName} ÷ 동원 병력`}>
                        <CellValue>{formatRate(derived.rate)}</CellValue>
                        <CellNote>{derived.lossName} ÷ 동원 병력</CellNote>
                      </td>
                    ) : (
                      <EmptyCell key={side.id}>—</EmptyCell>
                    )
                  })}
                </DerivedRow>
              )}
            </tbody>
          </SideTable>
        </TableScroll>
      )}

      {grouped.map(({ option, rows }) => (
        <SubjectBlock key={`${option.subjectType}:${option.subjectId}`}>
          <SubjectName $color={option.color ?? NEUTRAL}>{option.label}</SubjectName>
          <Rows>
            {rows.map((observation) => {
              const quote = observation.citations.map((citation) => citation.quote).filter(Boolean).join('\n')
              const unverified = isUnverified(observation)
              return (
                <Row key={observation.id}>
                  <RowMetric title={observation.metric.definition ?? undefined}>{observation.metric.name}</RowMetric>
                  <RowValue title={formatObservationExact(observation)}>{formatObservationValue(observation)}</RowValue>
                  <RowDetail>
                    {observation.qualifier && <span>{observation.qualifier}</span>}
                    {!(unverified && allUnverified) && (
                      <SourceBadge $unverified={unverified} title={quote || undefined}>
                        {unverified
                          ? '출처 미검증'
                          : observation.citations.map((citation) => citation.source.title).join(' · ')}
                      </SourceBadge>
                    )}
                  </RowDetail>
                  <RowActions>
                    <IconButton type="button" onClick={() => setEditing(observation)} aria-label={`${observation.metric.name} 수정`}>
                      <FiEdit2 />
                    </IconButton>
                    <IconButton type="button" onClick={() => void remove(observation)} aria-label={`${observation.metric.name} 지우기`}>
                      <FiTrash2 />
                    </IconButton>
                  </RowActions>
                </Row>
              )
            })}
          </Rows>
        </SubjectBlock>
      ))}

      {observations.length === 0 && (
        <S.HelperText>{features.metricsEmptyHint}</S.HelperText>
      )}

      {editing && (
        <ObservationFormModal
          eventId={event.id}
          subjects={subjects}
          suggestedMetricKeys={features.metricPresets}
          preferredSubjectType={features.metricSubject === 'side' ? 'EVENT_SIDE' : 'EVENT'}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          subjectLabelOf={(observation) => subjectOf(observation)?.label ?? ''}
        />
      )}
    </S.Section>
  )
}

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)')};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const Warning = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  font-size: 12.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.14)')};

  svg {
    flex-shrink: 0;
  }
`

/* 값 칸은 고정 폭 — auto면 값 글자 길이에 따라 막대 트랙 폭이 달라져 같은 지표 안에서 축이 어긋난다 */

const BarTrack = styled.div`
  position: relative;
  height: 14px;
  border-radius: 3px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)')};
`

const Bar = styled.div<{ $unverified: boolean }>`
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  opacity: ${({ $unverified }) => ($unverified ? 0.55 : 0.9)};
`

const Whisker = styled.div`
  position: absolute;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background: ${({ theme }) => theme.colors.text.primary};
  opacity: 0.55;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    width: 2px;
    height: 10px;
    background: inherit;
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
`

const SubjectBlock = styled.div`
  & + & {
    margin-top: 16px;
  }
`

const SubjectName = styled.h3<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${({ $color }) => $color};
  }
`

const Rows = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: minmax(110px, 24%) minmax(90px, auto) 1fr auto;
  align-items: baseline;
  gap: 4px 12px;
  padding: 6px 0;
  border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)')};
  font-size: 13px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr auto;

    & > :nth-child(3) {
      grid-column: 1 / -1;
    }
  }
`

const RowMetric = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowValue = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RowDetail = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SourceBadge = styled.span<{ $unverified: boolean }>`
  padding: 0 6px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme, $unverified }) =>
    $unverified ? (theme.mode === 'dark' ? '#fcd34d' : '#92400e') : theme.colors.text.secondary};
  border: 1px solid
    ${({ theme, $unverified }) =>
      $unverified ? 'rgba(217,119,6,0.45)' : theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)'};
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

const RowActions = styled.span`
  display: inline-flex;
  gap: 2px;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/* ── 진영 비교표 ── */

/** 진영이 많으면 가로로 넘친다 — 표만 따로 스크롤 */
const TableScroll = styled.div`
  overflow-x: auto;
  margin-bottom: 22px;
`

const SideTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 8px 12px 8px 0;
    text-align: left;
    vertical-align: top;
    border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)')};
  }

  thead th {
    border-top: none;
    padding-bottom: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
  }

  /* 지표 열 — 행 머리. 값 열이 같은 폭으로 나란히 서도록 지표 열만 고정 비율 */
  tbody th {
    width: 22%;
    min-width: 110px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  td {
    min-width: 150px;
  }
`

const SideSwatch = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 2px;
  vertical-align: 1px;
`

const EmptyCell = styled.td`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CellEntry = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  & + & {
    margin-top: 10px;
  }
`

const CellTop = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`

const CellValue = styled.span`
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 칸 안 수정·지우기 — 값에 손이 닿을 때만(터치 환경은 상시) */
const CellActions = styled.span`
  display: inline-flex;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.14s;

  td:hover &,
  td:focus-within & {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
`

const CellNote = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow-wrap: anywhere;
`

/** 파생(계산) 줄 — 저장된 값과 구분되게 위 선을 점선으로 */
const DerivedRow = styled.tr`
  th,
  td {
    border-top-style: dashed;
  }
`

const DerivedHint = styled.span`
  margin-left: 6px;
  padding: 0 5px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.16)')};
  font-size: 10.5px;
  font-weight: 600;
`
