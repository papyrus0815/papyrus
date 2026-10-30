import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiChevronDown,
  FiEdit2,
  FiInfo,
  FiMessageSquare,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  ESTIMATE_METHOD_HINT,
  ESTIMATE_METHOD_LABEL,
  ESTIMATE_ROLE_HINT,
  ESTIMATE_ROLE_LABEL,
  SOURCE_TIER_LABEL,
} from '@/entities/evidence/lib/evidence-labels'
import {
  formatObservationExact,
  formatObservationValue,
  isUnverified,
  observationExtent,
} from '@/entities/evidence/lib/format-observation'
import { eventTypeFeatures } from '@/entities/event/model'
import { RADIUS } from '@/entities/event/ui/ledger-tokens'
import { deleteObservation, listMetricDefinitions, type Observation } from '@/shared/api/evidence'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, eventKeys, eventObservationsQueryOptions } from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'
import { ObservationFormModal, type ObservationSubjectOption } from './observation-form-modal'
import { withSideColors } from './side-colors'
import { buildSideCommentary } from './side-metrics-commentary.lib'
import {
  alternativesOf,
  buildMemberCells,
  buildSideMetricRows,
  centerOf,
  formatRate,
  lossRate,
  memberSum,
  representativeOf,
  sumMismatch,
} from './side-metrics.lib'

/** 산정 방식·지위 표지 — 값 옆 작은 칩. 지위는 같은 칸에 값이 여럿일 때만 뜻이 있다 */
function EstimateTags({ observation, showRole }: { observation: Observation; showRole: boolean }) {
  return (
    <>
      {showRole && observation.estimateRole && (
        <EstimateTag $role={observation.estimateRole} title={ESTIMATE_ROLE_HINT[observation.estimateRole]}>
          {ESTIMATE_ROLE_LABEL[observation.estimateRole]}
        </EstimateTag>
      )}
      {observation.method && (
        <EstimateTag title={ESTIMATE_METHOD_HINT[observation.method]}>{ESTIMATE_METHOD_LABEL[observation.method]}</EstimateTag>
      )}
    </>
  )
}

/** 인용 출처 한 줄 — '1차 사료 · 제목' (등급이 있으면 앞에) */
function sourceLine(observation: Observation): string {
  return observation.citations
    .map((citation) =>
      citation.source.tier ? `${SOURCE_TIER_LABEL[citation.source.tier]} · ${citation.source.title}` : citation.source.title,
    )
    .join(' / ')
}

/** 계산한 수(나라 합·차이)를 같은 표기로 — 원래 값의 지표·통화를 빌려 '약 63.7만명'처럼 */
function syntheticOf(base: Observation, value: number): Observation {
  return { ...base, value: String(Math.round(value)), low: null, high: null, atLeast: false, approx: base.approx }
}

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
  /** 편집 대상 — 기존 값, 또는 새 값(비교표 빈 칸에서 열면 그 진영·지표를 미리 고른다) */
  const [editing, setEditing] = useState<
    Observation | { kind: 'new'; subjectId?: string; metricKey?: string } | null
  >(null)
  /** 지표 이름 — 빈 비교표의 행 머리(추천 지표) */
  const { data: metricDefinitions = [] } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: listMetricDefinitions,
    staleTime: 10 * 60_000,
    enabled: (event.sides ?? []).length > 0 || observations.length > 0,
  })

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
  /** 참여국 줄 → (진영, 이름) — 진영에 든 나라만. 그 나라 몫은 비교표 진영 칸 아래로 들어간다 */
  const participantSide = useMemo(() => {
    const map = new Map<string, { sideId: string; name: string }>()
    for (const country of [...(event.relatedHistoricalCountries ?? []), ...(event.relatedCountries ?? [])]) {
      if (country.participantId && country.sideId && sides.some((side) => side.id === country.sideId)) {
        map.set(country.participantId, { sideId: country.sideId, name: country.name })
      }
    }
    return map
  }, [event.relatedCountries, event.relatedHistoricalCountries, sides])
  const memberCells = useMemo(() => buildMemberCells(observations, participantSide), [observations, participantSide])
  /** 비교표 행 — 진영 값 지표 + 나라 몫만 있는 지표(진영 값이 아직 없어도 나라 합으로 비교된다) */
  const comparedRows = useMemo(() => {
    const extra = [...memberCells.keys()]
      .filter((key) => !sideRows.some((row) => row.key === key))
      .map((key) => {
        const any = [...(memberCells.get(key)?.values() ?? [])].flat()[0]
        return { key, name: any?.observation.metric.name ?? key, cells: new Map<string, Observation[]>() }
      })
    return [...sideRows, ...extra]
  }, [sideRows, memberCells])
  /**
   * 빈 비교표 — 진영은 있는데 값이 하나도 없으면 추천 지표(형식이 권하는 앞 3개) 행 × 모든 진영 열을 빈 칸으로 세운다.
   * 예전엔 수치 모듈 자체가 숨어 '모듈 추가 ▾'를 찾아야 했다(1차대전: 진영 2·수치 0).
   */
  const placeholderRows = useMemo(() => {
    if (comparedRows.length > 0 || sides.length === 0) return []
    return features.metricPresets
      .slice(0, 3)
      .map((key) => metricDefinitions.find((definition) => definition.key === key))
      .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition))
      .map((definition) => ({ key: definition.key, name: definition.name, cells: new Map<string, Observation[]>() }))
  }, [comparedRows.length, sides.length, features.metricPresets, metricDefinitions])
  const tableRows = comparedRows.length > 0 ? comparedRows : placeholderRows
  const tableSides = useMemo(
    () =>
      comparedRows.length > 0
        ? sides.filter((side) =>
            comparedRows.some((row) => row.cells.has(side.id) || memberCells.get(row.key)?.has(side.id)),
          )
        : sides,
    [sides, comparedRows, memberCells],
  )
  /** 해설 — 진영 둘의 병력·손실·손실률을 문장으로(side-metrics-commentary.lib) */
  const commentary = useMemo(
    () => buildSideCommentary(sideRows, tableSides, (observation) => formatObservationValue(observation as Observation)),
    [sideRows, tableSides],
  )
  /** 다른 추정치를 펼친 칸 — `지표:진영` */
  const [openAlternatives, setOpenAlternatives] = useState<Set<string>>(() => new Set())
  const toggleAlternatives = (key: string) =>
    setOpenAlternatives((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  /** 지표 정의를 펼친 행 — ⓘ */
  const [openDefinitions, setOpenDefinitions] = useState<Set<string>>(() => new Set())
  const definitionOf = (key: string) =>
    metricDefinitions.find((definition) => definition.key === key)?.definition ??
    observations.find((observation) => observation.metric.key === key)?.metric.definition ??
    null
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
      // 진영에 든 나라 몫은 비교표 진영 칸 아래에 있다
      if (observation.subjectType === 'EVENT_PARTICIPANT' && participantSide.has(observation.subjectId)) continue
      const key = `${observation.subjectType}:${observation.subjectId}`
      groups.set(key, [...(groups.get(key) ?? []), observation])
    }
    return subjects
      .map((option) => ({ option, rows: groups.get(`${option.subjectType}:${option.subjectId}`) ?? [] }))
      .filter((group) => group.rows.length > 0)
  }, [observations, subjects, sides, participantSide])

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
          {unverifiedCount > 0 && (
            /* 배너 대신 머리 칩 — 시드 값 72개가 전부 미검증이라 배너가 늘 떠 있었다 */
            <UnverifiedChip
              title={`${allUnverified ? '이 사건의 수치는 모두' : `${unverifiedCount}개 수치는`} 출처가 검증되지 않았습니다 — 기존 시드가 출처 없이 넣은 값입니다. 값을 눌러 출처를 달 수 있습니다.`}
            >
              <FiAlertTriangle aria-hidden="true" />
              출처 미검증 {unverifiedCount}
            </UnverifiedChip>
          )}
          {/* 출처 서고 — 이 사건 수치의 출처를 등급·관점까지 손보는 곳 */}
          <LibraryLink
            to={
              observations[0]?.citations[0]
                ? pathKeys.sources(observations[0].citations[0].source.id)
                : pathKeys.sources()
            }
          >
            출처 서고
          </LibraryLink>
          <AddButton type="button" onClick={() => setEditing({ kind: 'new' })}>
            <FiPlus /> 수치 추가
          </AddButton>
        </S.SectionActions>
      </S.SectionHeader>

      {commentary.length > 0 && (
        /* 해설 — 표를 읽기 전에 '그래서 무슨 뜻인가'. 값이 말하는 것만(배수·손실률), 추정 오차 안쪽은 '비슷' */
        <Commentary aria-label="수치 해설">
          <CommentaryTitle>
            <FiMessageSquare aria-hidden />
            한눈에
          </CommentaryTitle>
          <ul>
            {commentary.map((line) => (
              <li key={line.label}>
                <span className="label">{line.label}</span>
                <strong>{line.verdict}</strong>
                <span className="evidence">{line.evidence}</span>
              </li>
            ))}
          </ul>
        </Commentary>
      )}

      {tableRows.length > 0 && (
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
              {tableRows.map((row) => {
                /* 막대 눈금은 행(지표)마다 — 병력과 사상자를 한 자로 재면 작은 쪽이 다 0이 된다 */
                const max = Math.max(
                  ...[...row.cells.values()].flat().map((observation) => observationExtent(observation)?.high ?? 0),
                )
                return (
                  <tr key={row.key}>
                    <th scope="row">
                      <MetricHead>
                        {row.name}
                        {definitionOf(row.key) && (
                          <InfoButton
                            type="button"
                            aria-expanded={openDefinitions.has(row.key)}
                            aria-label={`${row.name} 정의`}
                            onClick={() =>
                              setOpenDefinitions((previous) => {
                                const next = new Set(previous)
                                if (next.has(row.key)) next.delete(row.key)
                                else next.add(row.key)
                                return next
                              })
                            }
                          >
                            <FiInfo aria-hidden />
                          </InfoButton>
                        )}
                      </MetricHead>
                      {openDefinitions.has(row.key) && <MetricDefinitionText>{definitionOf(row.key)}</MetricDefinitionText>}
                    </th>
                    {tableSides.map((side) => {
                      const cell = row.cells.get(side.id) ?? []
                      /* 큰 나라부터 — 진영 값에서 누가 얼마를 냈는지 위에서부터 읽힌다 */
                      const members = [...(memberCells.get(row.key)?.get(side.id) ?? [])].sort(
                        (left, right) => (centerOf(right.observation) ?? 0) - (centerOf(left.observation) ?? 0),
                      )
                      const sum = memberSum(members)
                      /* 경합 추정치 — 채택값 하나를 앞에, 나머지는 '다른 추정 N'으로 접는다 */
                      const representative = representativeOf(cell)
                      const alternatives = alternativesOf(cell)
                      const shown = alternatives.length > 0 && representative ? [representative] : cell
                      const alternativesKey = `${row.key}:${side.id}`
                      const sideValue = representative && !representative.atLeast ? centerOf(representative) : null
                      const gap = sumMismatch(sideValue, sum)
                      const unit = members[0]?.observation ?? cell[0]
                      /** 나라 몫 — 진영 칸 아래 '그 진영 나라들'(진영 값과 견주게 합·어긋남) */
                      const memberBlock =
                        members.length > 0 ? (
                          <MemberFigures>
                            {members.map((member) => (
                              <li key={member.observation.id}>
                                <span>{member.name}</span>
                                <span className="value" title={formatObservationExact(member.observation)}>
                                  {formatObservationValue(member.observation)}
                                </span>
                                <MemberActions>
                                  <IconButton type="button" onClick={() => setEditing(member.observation)} aria-label={`${member.name} ${row.name} 수정`}>
                                    <FiEdit2 />
                                  </IconButton>
                                </MemberActions>
                              </li>
                            ))}
                            {sum !== null && cell.length > 0 && members.length > 1 && (
                              <li className={gap !== null ? 'sum mismatch' : 'sum'}>
                                <span>나라 합</span>
                                <span className="value">{formatObservationValue(syntheticOf(unit, sum))}</span>
                                {gap !== null && (
                                  <span className="gap" title="진영 값과 나라별 값의 합이 5% 넘게 다릅니다 — 빠진 나라가 있거나 기준이 다른 값일 수 있습니다">
                                    진영 값과 {formatObservationValue(syntheticOf(unit, Math.abs(gap)))} {gap > 0 ? '모자람' : '넘침'}
                                  </span>
                                )}
                              </li>
                            )}
                          </MemberFigures>
                        ) : null
                      if (cell.length === 0 && members.length > 0) {
                        /* 진영 값이 없고 나라 몫만 있으면 — 나라 합을 계산 값으로 세운다 */
                        return (
                          <td key={side.id}>
                            {sum !== null && (
                              <CellTop>
                                <CellValue>{formatObservationValue(syntheticOf(unit, sum))}</CellValue>
                                <DerivedHint title="진영 값이 없어 나라별 값을 더했습니다">나라 합</DerivedHint>
                              </CellTop>
                            )}
                            {memberBlock}
                          </td>
                        )
                      }
                      if (cell.length === 0) {
                        /* 빈 칸 = 그 진영·그 지표로 바로 적는 자리 */
                        return (
                          <EmptyCell key={side.id}>
                            <AddCellButton
                              type="button"
                              $always={placeholderRows.length > 0}
                              onClick={() => setEditing({ kind: 'new', subjectId: side.id, metricKey: row.key })}
                              aria-label={`${side.name} ${row.name} 추가`}
                            >
                              <span className="dash" aria-hidden>
                                —
                              </span>
                              <span className="add">
                                <FiPlus aria-hidden />
                                추가
                              </span>
                            </AddCellButton>
                          </EmptyCell>
                        )
                      }
                      return (
                        <td key={side.id}>
                          {shown.map((observation) => {
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
                                {(observation.qualifier ||
                                  observation.method ||
                                  (cell.length > 1 && observation.estimateRole) ||
                                  (isUnverified(observation) && !allUnverified)) && (
                                  <CellNote>
                                    <EstimateTags observation={observation} showRole={cell.length > 1} />
                                    {observation.qualifier}
                                    {isUnverified(observation) && !allUnverified && (
                                      <SourceBadge $unverified>출처 미검증</SourceBadge>
                                    )}
                                  </CellNote>
                                )}
                                {observation.note && <ObservationNote>{observation.note}</ObservationNote>}
                              </CellEntry>
                            )
                          })}
                          {alternatives.length > 0 && (
                            <AlternativeBlock>
                              <AlternativeToggle
                                type="button"
                                aria-expanded={openAlternatives.has(alternativesKey)}
                                onClick={() => toggleAlternatives(alternativesKey)}
                              >
                                다른 추정 {alternatives.length}
                                <FiChevronDown aria-hidden />
                              </AlternativeToggle>
                              {openAlternatives.has(alternativesKey) && (
                                <AlternativeList>
                                  {alternatives.map((observation) => (
                                    <li key={observation.id}>
                                      <span className="value" title={formatObservationExact(observation)}>
                                        {formatObservationValue(observation)}
                                      </span>
                                      <EstimateTags observation={observation} showRole />
                                      {!isUnverified(observation) && <span className="source">{sourceLine(observation)}</span>}
                                      {observation.note && <ObservationNote>{observation.note}</ObservationNote>}
                                      <MemberActions>
                                        <IconButton
                                          type="button"
                                          onClick={() => setEditing(observation)}
                                          aria-label={`${side.name} ${row.name} 다른 추정 수정`}
                                        >
                                          <FiEdit2 />
                                        </IconButton>
                                      </MemberActions>
                                    </li>
                                  ))}
                                </AlternativeList>
                              )}
                            </AlternativeBlock>
                          )}
                          {memberBlock}
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
                    <EstimateTags
                      observation={observation}
                      showRole={rows.filter((other) => other.metric.key === observation.metric.key).length > 1}
                    />
                    {observation.qualifier && <span>{observation.qualifier}</span>}
                    {observation.note && <ObservationNote as="span">{observation.note}</ObservationNote>}
                    {!(unverified && allUnverified) && (
                      <SourceBadge $unverified={unverified} title={quote || undefined}>
                        {unverified
                          ? '출처 미검증'
                          : sourceLine(observation)}
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

      {/* 빈 비교표가 서 있으면 그 자체가 안내다 — 문장은 진영도 없을 때만 */}
      {observations.length === 0 && placeholderRows.length === 0 && (
        <S.HelperText>{features.metricsEmptyHint}</S.HelperText>
      )}

      {editing && (
        <ObservationFormModal
          eventId={event.id}
          subjects={subjects}
          suggestedMetricKeys={features.metricPresets}
          preferredSubjectType={features.metricSubject === 'side' ? 'EVENT_SIDE' : 'EVENT'}
          initial={'kind' in editing ? null : editing}
          presetSubject={
            'kind' in editing && editing.subjectId
              ? { subjectType: 'EVENT_SIDE', subjectId: editing.subjectId }
              : null
          }
          presetMetricKey={'kind' in editing ? (editing.metricKey ?? null) : null}
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
  border: none;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
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

const LibraryLink = styled(Link)`
  padding: 4px 8px;
  border-radius: ${RADIUS.SM};
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
`

const UnverifiedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 650;
  cursor: help;
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
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  &:nth-child(odd) {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.025)')};
  }

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
  background: ${({ theme, $unverified }) =>
    $unverified
      ? theme.mode === 'dark'
        ? 'rgba(251,191,36,0.12)'
        : 'rgba(251,191,36,0.16)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(15,23,42,0.06)'};
  cursor: ${({ title }) => (title ? 'help' : 'default')};
`

/** 줄 단추(✎·🗑) — 줄에 들어왔을 때만(보오전쟁: 국가별 8줄 × 단추 2개가 늘 떠 있었다) */
const RowActions = styled.span`
  display: inline-flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.14s;
  li:hover > &,
  li:focus-within > & {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 1;
  }
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
  }
  /* 선 대신 줄무늬 — 표에도 구분선을 쓰지 않는다 */
  tbody tr:nth-child(odd) > * {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.025)')};
  }
  tbody tr > :first-child {
    padding-left: 10px;
    border-radius: 8px 0 0 8px;
  }
  tbody tr > :last-child {
    border-radius: 0 8px 8px 0;
  }

  thead th {
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

/** 빈 칸 '— / + 추가' — 평소엔 '—', 줄에 들어오면 '+ 추가'. 빈 비교표($always)에선 늘 '+ 추가' */
const AddCellButton = styled.button<{ $always?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  margin-left: -8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ $always, theme }) =>
    $always ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)') : 'transparent'};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  .dash {
    display: ${({ $always }) => ($always ? 'none' : 'inline')};
  }
  .add {
    display: ${({ $always }) => ($always ? 'inline-flex' : 'none')};
    align-items: center;
    gap: 4px;
  }
  svg {
    width: 12px;
    height: 12px;
  }
  tr:hover &,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
  tr:hover & .dash,
  &:focus-visible .dash {
    display: none;
  }
  tr:hover & .add,
  &:focus-visible .add {
    display: inline-flex;
  }
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

/** 파생(계산) 줄 — 저장된 값과 구분되게 글자를 기울이고 바탕을 비운다(선은 쓰지 않는다) */
const DerivedRow = styled.tr`
  && > * {
    background: transparent;
    font-style: italic;
  }
`

const DerivedHint = styled.span`
  margin-left: 6px;
  padding: 0 5px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  font-size: 10.5px;
  font-style: normal;
  font-weight: 600;
`

/** 해설 상자 — 표 위 '한눈에'. 선 없이 옅은 면 */
const Commentary = styled.section`
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)')};
  ul {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .label {
    min-width: 88px;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  strong {
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .evidence {
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CommentaryTitle = styled.h3`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text.secondary};
  svg {
    width: 13px;
    height: 13px;
  }
`

const MetricHead = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

/** ⓘ — 지표 정의 펼치기(마우스 title 말고 누르면 글로) */
const InfoButton = styled.button`
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 50%;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  svg {
    width: 12px;
    height: 12px;
  }
  &:hover,
  &[aria-expanded='true'] {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const MetricDefinitionText = styled.p`
  margin: 4px 0 0;
  font-size: 11.5px;
  font-weight: 400;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: normal;
`

/** 수치 설명 — 이 숫자를 어떻게 읽어야 하나(산정 방식·학설 차이) */
const ObservationNote = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-line;
`

/** 진영 칸 아래 나라 몫 */
const MemberFigures = styled.ul`
  margin: 8px 0 0;
  padding: 6px 8px;
  list-style: none;
  border-radius: 8px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.85)')};
  display: flex;
  flex-direction: column;
  gap: 2px;
  li {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .value {
    margin-left: auto;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sum {
    margin-top: 2px;
    padding-top: 4px;
    flex-wrap: wrap;
    font-weight: 650;
  }
  .gap {
    flex-basis: 100%;
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
  }
`

/** 나라 몫 ✎ — 자리를 차지하지 않게 줄 위에 띄운다(숨겨도 폭을 먹어 이름·값이 두 줄로 꺾였다) */
const MemberActions = styled.span`
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.primary};
  opacity: 0;
  li:hover > &,
  li:focus-within > & {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 1;
  }
`

/** 산정 방식·지위 칩 — 채택은 진하게, 논쟁은 호박색 글자(선 없이 면만) */
const EstimateTag = styled.span<{ $role?: string }>`
  padding: 0 6px;
  border-radius: ${RADIUS.PILL};
  font-size: 10.5px;
  font-style: normal;
  font-weight: 650;
  cursor: help;
  color: ${({ theme, $role }) =>
    $role === 'DISPUTED'
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#92400e'
      : $role === 'PREFERRED'
        ? theme.colors.text.primary
        : theme.colors.text.secondary};
  background: ${({ theme, $role }) =>
    $role === 'DISPUTED'
      ? theme.mode === 'dark'
        ? 'rgba(251,191,36,0.12)'
        : 'rgba(251,191,36,0.16)'
      : $role === 'PREFERRED'
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(15,23,42,0.1)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(15,23,42,0.05)'};
`

/** 다른 추정치 — 채택값 아래 접힌 묶음 */
const AlternativeBlock = styled.div`
  margin-top: 6px;
`

const AlternativeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  margin-left: -7px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  svg {
    width: 12px;
    height: 12px;
    transition: transform 0.15s;
  }
  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }
  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
`

const AlternativeList = styled.ul`
  margin: 4px 0 0;
  padding: 6px 8px;
  list-style: none;
  border-radius: 8px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.85)')};
  display: flex;
  flex-direction: column;
  gap: 4px;
  li {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 6px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .value {
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .source {
    flex-basis: 100%;
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
