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
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import { deleteObservation, type Observation } from '@/shared/api/evidence'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys, eventObservationsQueryOptions } from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'
import { ObservationFormModal, type ObservationSubjectOption } from './observation-form-modal'

interface ModuleMetricsProps {
  event: EventDetail
}

const NEUTRAL = '#64748b'

/**
 * 수치(D3) — 병력·사상자·비용 같은 측정값. 숫자의 정본이 본문이 아니라 여기 있다.
 *
 * 맨 위는 **진영 비교** — 같은 지표를 두 진영 이상이 가지면 막대로 나란히 그린다(범위는 수염).
 * 아래는 대상(사건 전체·진영·참여국)별 목록. 출처가 검증되지 않은 값은 숨기지 않고 표시한다.
 */
export function ModuleMetrics({ event }: ModuleMetricsProps) {
  const queryClient = useQueryClient()
  const { data: observations = [] } = useQuery(eventObservationsQueryOptions(event.id))
  const [editing, setEditing] = useState<Observation | 'new' | null>(null)

  const sides = useMemo(() => event.sides ?? [], [event.sides])

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

  /** 진영 비교 — 진영 대상 측정값을 지표별로 묶어, 진영 둘 이상이 가진 지표만 */
  const comparisons = useMemo(() => {
    const byMetric = new Map<string, { name: string; rows: Array<{ observation: Observation; side: (typeof sides)[number] }> }>()
    for (const observation of observations) {
      if (observation.subjectType !== 'EVENT_SIDE') continue
      const side = sides.find((candidate) => candidate.id === observation.subjectId)
      if (!side || !observationExtent(observation)) continue
      const group = byMetric.get(observation.metric.key) ?? { name: observation.metric.name, rows: [] }
      group.rows.push({ observation, side })
      byMetric.set(observation.metric.key, group)
    }
    return [...byMetric.entries()]
      .filter(([, group]) => new Set(group.rows.map((row) => row.side.id)).size >= 2)
      .map(([key, group]) => ({ key, ...group }))
  }, [observations, sides])

  /** 목록 — 대상 순서(사건 → 진영 → 참여국)대로 */
  const grouped = useMemo(() => {
    const groups = new Map<string, Observation[]>()
    for (const observation of observations) {
      const key = `${observation.subjectType}:${observation.subjectId}`
      groups.set(key, [...(groups.get(key) ?? []), observation])
    }
    return subjects
      .map((option) => ({ option, rows: groups.get(`${option.subjectType}:${option.subjectId}`) ?? [] }))
      .filter((group) => group.rows.length > 0)
  }, [observations, subjects])

  const unverifiedCount = observations.filter(isUnverified).length

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
        {observations.length > 0 && <S.SectionSubtitle>{observations.length}개</S.SectionSubtitle>}
        <S.SectionActions>
          <AddButton type="button" onClick={() => setEditing('new')}>
            <FiPlus /> 수치 추가
          </AddButton>
        </S.SectionActions>
      </S.SectionHeader>

      {unverifiedCount > 0 && (
        <Warning role="note">
          <FiAlertTriangle aria-hidden="true" />
          {unverifiedCount}개 수치는 출처가 검증되지 않았습니다 — 기존 시드가 출처 없이 넣은 값입니다.
        </Warning>
      )}

      {comparisons.length > 0 && (
        <Comparison aria-label="진영 비교">
          <ComparisonTitle>진영 비교</ComparisonTitle>
          {comparisons.map((comparison) => {
            const max = Math.max(
              ...comparison.rows.map((row) => observationExtent(row.observation)?.high ?? 0),
            )
            return (
              <ComparisonMetric key={comparison.key}>
                <ComparisonMetricName>{comparison.name}</ComparisonMetricName>
                {comparison.rows.map(({ observation, side }) => {
                  const extent = observationExtent(observation)!
                  const scale = (value: number) => (max > 0 ? (value / max) * 100 : 0)
                  return (
                    <BarRow key={observation.id} title={formatObservationExact(observation)}>
                      <BarLabel>
                        {side.name}
                        {observation.qualifier && <BarQualifier>{observation.qualifier}</BarQualifier>}
                      </BarLabel>
                      <BarTrack>
                        <Bar
                          style={{ width: `${scale(extent.center)}%`, background: side.color ?? NEUTRAL }}
                          $unverified={isUnverified(observation)}
                        />
                        {extent.high > extent.low && (
                          <Whisker
                            style={{
                              left: `${scale(extent.low)}%`,
                              width: `${scale(extent.high) - scale(extent.low)}%`,
                            }}
                            aria-hidden="true"
                          />
                        )}
                      </BarTrack>
                      <BarValue>{formatObservationValue(observation)}</BarValue>
                    </BarRow>
                  )
                })}
              </ComparisonMetric>
            )
          })}
        </Comparison>
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
                    <SourceBadge $unverified={unverified} title={quote || undefined}>
                      {unverified
                        ? '출처 미검증'
                        : observation.citations.map((citation) => citation.source.title).join(' · ')}
                    </SourceBadge>
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
        <S.HelperText>
          병력·사상자·비용 같은 숫자를 출처와 함께 기록하면 진영별 비교가 여기 그려집니다.
        </S.HelperText>
      )}

      {editing && (
        <ObservationFormModal
          eventId={event.id}
          subjects={subjects}
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

const Comparison = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 22px;
  padding: 16px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)')};
`

const ComparisonTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ComparisonMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ComparisonMetricName = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* 값 칸은 고정 폭 — auto면 값 글자 길이에 따라 막대 트랙 폭이 달라져 같은 지표 안에서 축이 어긋난다 */
const BarRow = styled.div`
  display: grid;
  grid-template-columns: minmax(80px, 30%) 1fr 108px;
  align-items: center;
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr auto;

    & > :nth-child(2) {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
`

const BarLabel = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarQualifier = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow-wrap: anywhere;
`

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

const BarValue = styled.div`
  text-align: right;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
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
