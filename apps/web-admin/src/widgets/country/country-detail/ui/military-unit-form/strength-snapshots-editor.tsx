import React from 'react'

import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { parseQuickObservationInput } from '@/entities/evidence/lib/parse-quick-observation'
import * as S from '@/pages/events/create/event-create.styles'
import {
  createObservation,
  deleteObservation,
  type EstimateMethod,
  type StructuredPointInput,
  updateObservation,
} from '@/shared/api/evidence'
import type { MilitaryUnitObservationDto } from '@/shared/api/military-unit'

import { StructuredPartsDateField } from './structured-parts-date-field'
import * as FormS from './styles'

export type StrengthBasisKind = 'wartime' | 'peacetime' | 'actual'

export interface UnitStrengthSnapshotDraft {
  localId: string
  basisKind: StrengthBasisKind
  method: EstimateMethod
  era: 'AD' | 'BC'
  year: string
  month: string
  day: string
  /** 총병력 (명) — 숫자·범위(15,000~18,000)·근사(약 15,000)·하한(10,000+) 지원 */
  totalStrength: string
  /** 장교 (명) */
  officers: string
  /** 부사관 (명) */
  ncos: string
  /** 병 (명) */
  enlisted: string
  /** 일선 전투병력 (명) */
  combatPersonnel: string
  /** 예하 편제 수 (개) */
  subUnitsCount: string
  /** 예하 편제 단위 (사단·여단·연대·대대·전대·비행단 등) */
  subUnitsLabel: string
  /** 전차·돌격포 (대) */
  tanks: string
  /** 장갑차·보병전투차 (대) */
  afvs: string
  /** 화포·자주포·박격포 (문) */
  artillery: string
  /** 작전 항공기·함재기 (기) */
  aircraft: string
  /** 배속 함정 (척) */
  vessels: string
  /** 편제표·사료 기준 메모 */
  basisNote: string
  /** 수정 모드일 때 지표 키별 기존 Observation ID */
  existingIdsByMetric: Record<string, string>
}

const TOTAL_METRIC_BY_BASIS: Record<StrengthBasisKind, string> = {
  wartime: 'military.unit.authorized_wartime',
  peacetime: 'military.unit.authorized_peacetime',
  actual: 'military.unit.actual_strength',
}

const ALL_TOTAL_METRIC_KEYS = new Set<string>([
  'military.unit.authorized_wartime',
  'military.unit.authorized_peacetime',
  'military.unit.actual_strength',
  'military.personnel',
])

let nextSnapshotSeq = 1
export function createEmptyStrengthSnapshot(
  defaults?: Partial<Pick<UnitStrengthSnapshotDraft, 'era' | 'year'>> & {
    branch?: string
  },
): UnitStrengthSnapshotDraft {
  const defaultSubLabel =
    defaults?.branch === 'NAVY' || defaults?.branch === 'COAST_GUARD'
      ? '전대'
      : defaults?.branch === 'AIR_FORCE' || defaults?.branch === 'SPACE_FORCE'
        ? '비행대대'
        : '사단·연대'
  return {
    localId: `snap-${Date.now()}-${nextSnapshotSeq++}`,
    basisKind: 'wartime',
    method: 'OFFICIAL_CLAIM',
    era: defaults?.era ?? 'AD',
    year: defaults?.year ?? '',
    month: '',
    day: '',
    totalStrength: '',
    officers: '',
    ncos: '',
    enlisted: '',
    combatPersonnel: '',
    subUnitsCount: '',
    subUnitsLabel: defaultSubLabel,
    tanks: '',
    afvs: '',
    artillery: '',
    aircraft: '',
    vessels: '',
    basisNote: '',
    existingIdsByMetric: {},
  }
}

export function formatObsToInputText(obs: MilitaryUnitObservationDto): string {
  const prefix = obs.approx ? '약 ' : ''
  if (obs.low != null && obs.high != null) {
    return `${prefix}${Number(obs.low).toLocaleString('ko-KR')}~${Number(obs.high).toLocaleString('ko-KR')}`
  }
  if (obs.atLeast && obs.low != null) {
    return `${prefix}${Number(obs.low).toLocaleString('ko-KR')}+`
  }
  if (obs.value != null) {
    const num = Number(obs.value)
    return Number.isFinite(num)
      ? `${prefix}${num.toLocaleString('ko-KR')}`
      : `${prefix}${obs.value}`
  }
  return ''
}

/** 서버에서 내려온 부대 측정값 배열을 시점·메모 기준 스냅샷 카드들로 묶어 복원한다 */
export function hydrateStrengthSnapshots(
  observations: ReadonlyArray<MilitaryUnitObservationDto> | undefined | null,
  fallbackBranch?: string,
): UnitStrengthSnapshotDraft[] {
  if (!observations || observations.length === 0) {
    return [createEmptyStrengthSnapshot({ branch: fallbackBranch })]
  }

  const groups = new Map<string, UnitStrengthSnapshotDraft>()

  for (const obs of observations) {
    const dateKey = obs.start
      ? `${obs.start.era}:${obs.start.year}:${obs.start.month ?? ''}:${obs.start.day ?? ''}`
      : 'no-date'
    const noteKey = (obs.note ?? '').trim()
    const baseGroupKey = `${dateKey}|${noteKey}`

    // 같은 시점·메모 그룹 안에 이미 같은 지표가 들어있으면 새 스냅샷 슬롯으로 분리한다 (평시 정원 vs 전시 정원 동시 기록 수용)
    let targetKey = baseGroupKey
    let suffix = 0
    while (groups.has(targetKey)) {
      const candidate = groups.get(targetKey)!
      const collidesTotal =
        ALL_TOTAL_METRIC_KEYS.has(obs.metricKey) &&
        candidate.totalStrength.trim() !== ''
      const collidesSameMetric = Boolean(
        candidate.existingIdsByMetric[obs.metricKey],
      )
      if (!collidesTotal && !collidesSameMetric) break
      suffix += 1
      targetKey = `${baseGroupKey}#${suffix}`
    }

    let snap = groups.get(targetKey)
    if (!snap) {
      snap = createEmptyStrengthSnapshot({ branch: fallbackBranch })
      if (obs.start) {
        snap.era = obs.start.era
        snap.year = String(obs.start.year)
        snap.month = obs.start.month != null ? String(obs.start.month) : ''
        snap.day = obs.start.day != null ? String(obs.start.day) : ''
      }
      snap.basisNote = noteKey
      if (obs.method) snap.method = obs.method
      groups.set(targetKey, snap)
    }

    const formatted = formatObsToInputText(obs)
    snap.existingIdsByMetric[obs.metricKey] = obs.id

    if (obs.metricKey === 'military.unit.authorized_peacetime') {
      snap.basisKind = 'peacetime'
      snap.totalStrength = formatted
    } else if (obs.metricKey === 'military.unit.actual_strength') {
      snap.basisKind = 'actual'
      snap.totalStrength = formatted
    } else if (
      obs.metricKey === 'military.unit.authorized_wartime' ||
      obs.metricKey === 'military.personnel'
    ) {
      snap.basisKind = 'wartime'
      snap.totalStrength = formatted
    } else if (obs.metricKey === 'military.unit.officers') {
      snap.officers = formatted
    } else if (obs.metricKey === 'military.unit.ncos') {
      snap.ncos = formatted
    } else if (obs.metricKey === 'military.unit.enlisted') {
      snap.enlisted = formatted
    } else if (obs.metricKey === 'military.unit.combat_personnel') {
      snap.combatPersonnel = formatted
    } else if (obs.metricKey === 'military.unit.sub_units_count') {
      snap.subUnitsCount = formatted
      if (obs.qualifier?.trim()) snap.subUnitsLabel = obs.qualifier.trim()
    } else if (obs.metricKey === 'military.tanks') {
      snap.tanks = formatted
    } else if (obs.metricKey === 'military.afv') {
      snap.afvs = formatted
    } else if (obs.metricKey === 'military.artillery') {
      snap.artillery = formatted
    } else if (obs.metricKey === 'military.aircraft') {
      snap.aircraft = formatted
    } else if (obs.metricKey === 'military.vessels') {
      snap.vessels = formatted
    }
  }

  return groups.size > 0
    ? [...groups.values()]
    : [createEmptyStrengthSnapshot({ branch: fallbackBranch })]
}

export function countFilledStrengthFields(
  snapshots: ReadonlyArray<UnitStrengthSnapshotDraft>,
): number {
  let count = 0
  for (const snap of snapshots) {
    const fields = [
      snap.totalStrength,
      snap.officers,
      snap.ncos,
      snap.enlisted,
      snap.combatPersonnel,
      snap.subUnitsCount,
      snap.tanks,
      snap.afvs,
      snap.artillery,
      snap.aircraft,
      snap.vessels,
    ]
    count += fields.filter((val) => val.trim().length > 0).length
  }
  return count
}

function parseSnapshotStartPoint(
  snap: UnitStrengthSnapshotDraft,
): { ok: true; point: StructuredPointInput | null } | { ok: false; error: string } {
  const yTrim = snap.year.trim()
  const mTrim = snap.month.trim()
  const dTrim = snap.day.trim()
  if (!yTrim) {
    if (mTrim || dTrim) {
      return { ok: false, error: '병력 기준 시점의 연도를 입력해 주세요.' }
    }
    return { ok: true, point: null }
  }
  const yNum = Number.parseInt(yTrim, 10)
  if (!Number.isInteger(yNum) || yNum < 1) {
    return { ok: false, error: '병력 기준 연도는 1 이상의 정수여야 합니다.' }
  }
  let mNum: number | null = null
  if (mTrim) {
    mNum = Number.parseInt(mTrim, 10)
    if (!Number.isInteger(mNum) || mNum < 1 || mNum > 12) {
      return { ok: false, error: '병력 기준 월은 1~12 사이여야 합니다.' }
    }
  }
  let dNum: number | null = null
  if (dTrim) {
    if (mNum == null) {
      return { ok: false, error: '병력 기준 일자를 적으려면 월도 입력해 주세요.' }
    }
    dNum = Number.parseInt(dTrim, 10)
    if (!Number.isInteger(dNum) || dNum < 1 || dNum > 31) {
      return { ok: false, error: '병력 기준 일은 1~31 사이여야 합니다.' }
    }
  }
  return {
    ok: true,
    point: {
      era: snap.era,
      year: yNum,
      month: mNum,
      day: dNum,
    },
  }
}

export function validateStrengthSnapshots(
  snapshots: ReadonlyArray<UnitStrengthSnapshotDraft>,
): string | null {
  for (let idx = 0; idx < snapshots.length; idx += 1) {
    const snap = snapshots[idx]
    const entries: Array<{ label: string; raw: string }> = [
      { label: '총병력', raw: snap.totalStrength },
      { label: '장교 수', raw: snap.officers },
      { label: '부사관 수', raw: snap.ncos },
      { label: '병사 수', raw: snap.enlisted },
      { label: '전투병력 수', raw: snap.combatPersonnel },
      { label: '예하 편제 수', raw: snap.subUnitsCount },
      { label: '전차 수', raw: snap.tanks },
      { label: '장갑차 수', raw: snap.afvs },
      { label: '화포 수', raw: snap.artillery },
      { label: '항공기 수', raw: snap.aircraft },
      { label: '함정 수', raw: snap.vessels },
    ]
    const hasAnyValue = entries.some((e) => e.raw.trim().length > 0)
    if (!hasAnyValue) continue

    const dateRes = parseSnapshotStartPoint(snap)
    if (!dateRes.ok) return dateRes.error

    for (const entry of entries) {
      if (!entry.raw.trim()) continue
      const parsed = parseQuickObservationInput(entry.raw)
      if (!parsed.ok) {
        return `병력·전력 편제 #${idx + 1} [${entry.label}]: ${parsed.error}`
      }
    }
  }
  return null
}

/** 저장된 군부대 ID에 대해 모든 스냅샷 측정값(Observation)을 생성·갱신·삭제 동기화한다 */
export async function syncStrengthSnapshotsForUnit(
  unitId: string,
  snapshots: ReadonlyArray<UnitStrengthSnapshotDraft>,
  initialObservations: ReadonlyArray<MilitaryUnitObservationDto>,
): Promise<void> {
  const keptObservationIds = new Set<string>()

  for (const snap of snapshots) {
    const dateRes = parseSnapshotStartPoint(snap)
    const startPoint = dateRes.ok ? dateRes.point : null
    const cleanNote = snap.basisNote.trim() || null

    const totalMetricKey = TOTAL_METRIC_BY_BASIS[snap.basisKind]
    // basisKind가 바뀌었을 수 있으므로 이전 총병력 observation ID를 이어받는다
    const existingTotalId =
      snap.existingIdsByMetric[totalMetricKey] ??
      snap.existingIdsByMetric['military.unit.authorized_wartime'] ??
      snap.existingIdsByMetric['military.unit.authorized_peacetime'] ??
      snap.existingIdsByMetric['military.unit.actual_strength'] ??
      snap.existingIdsByMetric['military.personnel']

    const fieldSpecs: Array<{
      metricKey: string
      raw: string
      existingId?: string
      qualifier?: string | null
    }> = [
      {
        metricKey: totalMetricKey,
        raw: snap.totalStrength,
        existingId: existingTotalId,
      },
      {
        metricKey: 'military.unit.officers',
        raw: snap.officers,
        existingId: snap.existingIdsByMetric['military.unit.officers'],
      },
      {
        metricKey: 'military.unit.ncos',
        raw: snap.ncos,
        existingId: snap.existingIdsByMetric['military.unit.ncos'],
      },
      {
        metricKey: 'military.unit.enlisted',
        raw: snap.enlisted,
        existingId: snap.existingIdsByMetric['military.unit.enlisted'],
      },
      {
        metricKey: 'military.unit.combat_personnel',
        raw: snap.combatPersonnel,
        existingId: snap.existingIdsByMetric['military.unit.combat_personnel'],
      },
      {
        metricKey: 'military.unit.sub_units_count',
        raw: snap.subUnitsCount,
        existingId: snap.existingIdsByMetric['military.unit.sub_units_count'],
        qualifier: snap.subUnitsLabel.trim() || null,
      },
      {
        metricKey: 'military.tanks',
        raw: snap.tanks,
        existingId: snap.existingIdsByMetric['military.tanks'],
      },
      {
        metricKey: 'military.afv',
        raw: snap.afvs,
        existingId: snap.existingIdsByMetric['military.afv'],
      },
      {
        metricKey: 'military.artillery',
        raw: snap.artillery,
        existingId: snap.existingIdsByMetric['military.artillery'],
      },
      {
        metricKey: 'military.aircraft',
        raw: snap.aircraft,
        existingId: snap.existingIdsByMetric['military.aircraft'],
      },
      {
        metricKey: 'military.vessels',
        raw: snap.vessels,
        existingId: snap.existingIdsByMetric['military.vessels'],
      },
    ]

    for (const spec of fieldSpecs) {
      const trimmed = spec.raw.trim()
      if (!trimmed) continue
      const parsed = parseQuickObservationInput(trimmed)
      if (!parsed.ok) continue

      if (spec.existingId) {
        keptObservationIds.add(spec.existingId)
        await updateObservation(spec.existingId, {
          metricKey: spec.metricKey,
          value: parsed.data.value,
          low: parsed.data.low,
          high: parsed.data.high,
          approx: parsed.data.approx,
          atLeast: parsed.data.atLeast,
          qualifier: spec.qualifier ?? null,
          start: startPoint,
          note: cleanNote,
          method: snap.method,
          estimateRole: 'PREFERRED',
        })
      } else {
        await createObservation({
          subjectType: 'MILITARY_UNIT',
          subjectId: unitId,
          metricKey: spec.metricKey,
          value: parsed.data.value,
          low: parsed.data.low,
          high: parsed.data.high,
          approx: parsed.data.approx,
          atLeast: parsed.data.atLeast,
          qualifier: spec.qualifier ?? null,
          start: startPoint,
          note: cleanNote,
          method: snap.method,
          estimateRole: 'PREFERRED',
        })
      }
    }
  }

  for (const oldObs of initialObservations) {
    if (!keptObservationIds.has(oldObs.id)) {
      await deleteObservation(oldObs.id)
    }
  }
}

function parseExactIntOrNull(raw: string): number | null {
  const cleaned = raw.replace(/[,\s명]/g, '')
  if (!/^\d+$/.test(cleaned)) return null
  return Number.parseInt(cleaned, 10)
}

export interface StrengthSnapshotsEditorProps {
  snapshots: UnitStrengthSnapshotDraft[]
  onChange: (next: UnitStrengthSnapshotDraft[]) => void
  branch: string
  defaultEstablishedEra?: 'AD' | 'BC'
  defaultEstablishedYear?: string
}

export const StrengthSnapshotsEditor: React.FC<StrengthSnapshotsEditorProps> = ({
  snapshots,
  onChange,
  branch,
  defaultEstablishedEra = 'AD',
  defaultEstablishedYear = '',
}) => {
  const updateSnapshot = (
    localId: string,
    patch: Partial<UnitStrengthSnapshotDraft>,
  ) => {
    onChange(
      snapshots.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    )
  }

  const handleAddSnapshot = () => {
    onChange([
      ...snapshots,
      createEmptyStrengthSnapshot({
        era: defaultEstablishedEra,
        year: defaultEstablishedYear,
        branch,
      }),
    ])
  }

  const handleRemoveSnapshot = (localId: string) => {
    if (snapshots.length <= 1) {
      onChange([createEmptyStrengthSnapshot({ branch })])
      return
    }
    onChange(snapshots.filter((item) => item.localId !== localId))
  }

  const isNaval = branch === 'NAVY' || branch === 'COAST_GUARD'
  const isAir = branch === 'AIR_FORCE' || branch === 'SPACE_FORCE'

  return (
    <>
      {snapshots.map((snap, index) => {
        const offNum = parseExactIntOrNull(snap.officers)
        const ncoNum = parseExactIntOrNull(snap.ncos)
        const enlNum = parseExactIntOrNull(snap.enlisted)
        const rankSum = (offNum ?? 0) + (ncoNum ?? 0) + (enlNum ?? 0)
        const hasAnyRankBreakdown =
          offNum !== null || ncoNum !== null || enlNum !== null
        const hasAnyFilled = countFilledStrengthFields([snap]) > 0
        const snapPrefix = snapshots.length > 1 ? `#${index + 1} ` : ''

        return (
          <React.Fragment key={snap.localId}>
            {index > 0 ? <SnapshotHairline /> : null}

            {/* 1. 편제 기준 · 기준 시점 (카드 없이 평면 FormRow) */}
            <S.FormRow>
              <S.FormLabel as="div">
                {snapPrefix}편제 기준
                <FormS.OptionalTag>(선택)</FormS.OptionalTag>
              </S.FormLabel>
              <S.FormField>
                <BasisControlBar>
                  <BasisSegmentGroup role="group" aria-label="병력 구분">
                    {(
                      [
                        { value: 'wartime', label: '전시 완편 정원' },
                        { value: 'peacetime', label: '평시 편제 정원' },
                        { value: 'actual', label: '시점별 실병력' },
                      ] as const
                    ).map((opt) => (
                      <BasisSegmentBtn
                        key={opt.value}
                        type="button"
                        aria-pressed={snap.basisKind === opt.value}
                        $active={snap.basisKind === opt.value}
                        onClick={() =>
                          updateSnapshot(snap.localId, { basisKind: opt.value })
                        }
                      >
                        {opt.label}
                      </BasisSegmentBtn>
                    ))}
                  </BasisSegmentGroup>

                  <MethodSelect
                    aria-label="수치 산출 방식"
                    value={snap.method}
                    onChange={(changeEvent) =>
                      updateSnapshot(snap.localId, {
                        method: changeEvent.target.value as EstimateMethod,
                      })
                    }
                  >
                    <option value="OFFICIAL_CLAIM">공식 편제표·발표</option>
                    <option value="COUNTED">명부·실제 집계</option>
                    <option value="ESTIMATED">연구자 추산</option>
                  </MethodSelect>

                  {snapshots.length > 1 || hasAnyFilled ? (
                    <ClearSnapBtn
                      type="button"
                      aria-label={
                        snapshots.length > 1
                          ? `병력 시점 #${index + 1} 제거`
                          : '병력 수치 비우기'
                      }
                      title={
                        snapshots.length > 1
                          ? `시점 #${index + 1} 제거`
                          : '입력한 수치 비우기'
                      }
                      onClick={() => handleRemoveSnapshot(snap.localId)}
                    >
                      <FiX size={14} />
                    </ClearSnapBtn>
                  ) : null}
                </BasisControlBar>

                <DateAndBasisGrid>
                  <MetricFieldWrap as="div">
                    <MetricFieldLabel>기준 시점</MetricFieldLabel>
                    <StructuredPartsDateField
                      era={snap.era}
                      year={snap.year}
                      month={snap.month}
                      day={snap.day}
                      ariaLabel={`${snapPrefix}병력 기준 시점`}
                      pickerTitle="병력·편제 기준 시점 선택"
                      onChange={(nextDate) =>
                        updateSnapshot(snap.localId, {
                          era: nextDate.era,
                          year: nextDate.year,
                          month: nextDate.month,
                          day: nextDate.day,
                        })
                      }
                    />
                  </MetricFieldWrap>

                  <MetricFieldWrap>
                    <MetricFieldLabel>사료 · 편제표 단서</MetricFieldLabel>
                    <S.Input
                      type="text"
                      placeholder="예: 1941.6 개전 KStN 편제표, 동부전선 투입 당시"
                      value={snap.basisNote}
                      onChange={(changeEvent) =>
                        updateSnapshot(snap.localId, {
                          basisNote: changeEvent.target.value,
                        })
                      }
                    />
                  </MetricFieldWrap>
                </DateAndBasisGrid>
              </S.FormField>
            </S.FormRow>

            {/* 2. 정량 병력 (카드 없이 평면 그리드) */}
            <S.FormRow>
              <S.FormLabel as="div">
                {snapPrefix}정량 병력
                <FormS.OptionalTag>(선택)</FormS.OptionalTag>
              </S.FormLabel>
              <S.FormField>
                <HintAndSumRow>
                  <S.Hint>
                    숫자 · 범위(<strong>15,000~18,000</strong>) · 근사(
                    <strong>약 15,000</strong>) · 하한(<strong>10,000+</strong>)
                    표기를 지원합니다.
                  </S.Hint>
                  {hasAnyRankBreakdown && rankSum > 0 ? (
                    <SumApplyBtn
                      type="button"
                      onClick={() =>
                        updateSnapshot(snap.localId, {
                          totalStrength: rankSum.toLocaleString('ko-KR'),
                        })
                      }
                    >
                      계급 합계 {rankSum.toLocaleString('ko-KR')}명 → 총병력 반영
                    </SumApplyBtn>
                  ) : null}
                </HintAndSumRow>

                <FlatMetricsGrid>
                  <MetricFieldWrap>
                    <MetricFieldLabel $primary>
                      <span>총병력</span>
                      <small>(명)</small>
                    </MetricFieldLabel>
                    <S.Input
                      type="text"
                      placeholder="예: 17,734"
                      value={snap.totalStrength}
                      onChange={(changeEvent) =>
                        updateSnapshot(snap.localId, {
                          totalStrength: changeEvent.target.value,
                        })
                      }
                    />
                  </MetricFieldWrap>
                  <MetricFieldWrap>
                    <MetricFieldLabel>
                      <span>장교</span>
                      <small>(명)</small>
                    </MetricFieldLabel>
                    <S.Input
                      type="text"
                      placeholder="예: 518"
                      value={snap.officers}
                      onChange={(changeEvent) =>
                        updateSnapshot(snap.localId, {
                          officers: changeEvent.target.value,
                        })
                      }
                    />
                  </MetricFieldWrap>
                  <MetricFieldWrap>
                    <MetricFieldLabel>
                      <span>부사관</span>
                      <small>(명)</small>
                    </MetricFieldLabel>
                    <S.Input
                      type="text"
                      placeholder="예: 2,573"
                      value={snap.ncos}
                      onChange={(changeEvent) =>
                        updateSnapshot(snap.localId, {
                          ncos: changeEvent.target.value,
                        })
                      }
                    />
                  </MetricFieldWrap>
                  <MetricFieldWrap>
                    <MetricFieldLabel>
                      <span>병사</span>
                      <small>(명)</small>
                    </MetricFieldLabel>
                    <S.Input
                      type="text"
                      placeholder="예: 14,643"
                      value={snap.enlisted}
                      onChange={(changeEvent) =>
                        updateSnapshot(snap.localId, {
                          enlisted: changeEvent.target.value,
                        })
                      }
                    />
                  </MetricFieldWrap>
                  <MetricFieldWrap>
                    <MetricFieldLabel>
                      <span>일선 전투병력</span>
                      <small>(명)</small>
                    </MetricFieldLabel>
                    <S.Input
                      type="text"
                      placeholder="전투원 수"
                      value={snap.combatPersonnel}
                      onChange={(changeEvent) =>
                        updateSnapshot(snap.localId, {
                          combatPersonnel: changeEvent.target.value,
                        })
                      }
                    />
                  </MetricFieldWrap>
                </FlatMetricsGrid>
              </S.FormField>
            </S.FormRow>

            {/* 3. 편제 장비 · 예하 부대 정수 (카드 없이 평면 그리드) */}
            <S.FormRow>
              <S.FormLabel as="div">
                {snapPrefix}편제 장비
                <FormS.OptionalTag>(선택)</FormS.OptionalTag>
              </S.FormLabel>
              <S.FormField>
                <FlatMetricsGrid>
                  <MetricFieldWrap as="div">
                    <MetricFieldLabel>
                      <span>예하 편제 수</span>
                    </MetricFieldLabel>
                    <SubUnitCountPair>
                      <S.Input
                        type="text"
                        placeholder="예: 3"
                        value={snap.subUnitsCount}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            subUnitsCount: changeEvent.target.value,
                          })
                        }
                      />
                      <S.Input
                        type="text"
                        aria-label="예하 편제 단위"
                        placeholder="단위(사단·연대)"
                        value={snap.subUnitsLabel}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            subUnitsLabel: changeEvent.target.value,
                          })
                        }
                      />
                    </SubUnitCountPair>
                  </MetricFieldWrap>

                  {(!isNaval && !isAir) || snap.tanks.trim() ? (
                    <MetricFieldWrap>
                      <MetricFieldLabel>
                        <span>전차 · 돌격포</span>
                        <small>(대)</small>
                      </MetricFieldLabel>
                      <S.Input
                        type="text"
                        placeholder="예: 196"
                        value={snap.tanks}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            tanks: changeEvent.target.value,
                          })
                        }
                      />
                    </MetricFieldWrap>
                  ) : null}

                  {(!isNaval && !isAir) || snap.afvs.trim() ? (
                    <MetricFieldWrap>
                      <MetricFieldLabel>
                        <span>장갑차 · IFV</span>
                        <small>(대)</small>
                      </MetricFieldLabel>
                      <S.Input
                        type="text"
                        placeholder="예: 140"
                        value={snap.afvs}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            afvs: changeEvent.target.value,
                          })
                        }
                      />
                    </MetricFieldWrap>
                  ) : null}

                  {!isAir || snap.artillery.trim() ? (
                    <MetricFieldWrap>
                      <MetricFieldLabel>
                        <span>화포 · 박격포</span>
                        <small>(문)</small>
                      </MetricFieldLabel>
                      <S.Input
                        type="text"
                        placeholder="예: 75"
                        value={snap.artillery}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            artillery: changeEvent.target.value,
                          })
                        }
                      />
                    </MetricFieldWrap>
                  ) : null}

                  {isAir ||
                  isNaval ||
                  branch === 'JOINT' ||
                  snap.aircraft.trim() ? (
                    <MetricFieldWrap>
                      <MetricFieldLabel>
                        <span>작전 항공기</span>
                        <small>(기)</small>
                      </MetricFieldLabel>
                      <S.Input
                        type="text"
                        placeholder="예: 120"
                        value={snap.aircraft}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            aircraft: changeEvent.target.value,
                          })
                        }
                      />
                    </MetricFieldWrap>
                  ) : null}

                  {isNaval || branch === 'JOINT' || snap.vessels.trim() ? (
                    <MetricFieldWrap>
                      <MetricFieldLabel>
                        <span>배속 함정</span>
                        <small>(척)</small>
                      </MetricFieldLabel>
                      <S.Input
                        type="text"
                        placeholder="예: 24"
                        value={snap.vessels}
                        onChange={(changeEvent) =>
                          updateSnapshot(snap.localId, {
                            vessels: changeEvent.target.value,
                          })
                        }
                      />
                    </MetricFieldWrap>
                  ) : null}
                </FlatMetricsGrid>
              </S.FormField>
            </S.FormRow>
          </React.Fragment>
        )
      })}

      <AddSnapshotActionRow>
        <S.AddButton type="button" onClick={handleAddSnapshot}>
          <FiPlus size={15} />
          다른 시점 병력·편제 추가
        </S.AddButton>
      </AddSnapshotActionRow>
    </>
  )
}

const SnapshotHairline = styled.div`
  margin: 6px 0 2px;
  border-top: 1px dashed ${({ theme }) => S.getC(theme).border.light};
`

const BasisControlBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
`

const BasisSegmentGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2.5px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'};
`

const BasisSegmentBtn = styled.button<{ $active: boolean }>`
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? theme.colors.activeLight
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const MethodSelect = styled.select`
  appearance: none;
  height: 31px;
  padding: 0 26px 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background-color: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  &:hover {
    border-color: ${({ theme }) => S.getC(theme).border.hover};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const ClearSnapBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => S.getC(theme).text.muted};
  cursor: pointer;
  transition: color 0.14s ease, background-color 0.14s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.error};
    background-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.12)'
        : 'rgba(239, 68, 68, 0.08)'};
    outline: none;
  }
`

const DateAndBasisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px 14px;
  margin-top: 4px;
  min-width: 0;
`

const HintAndSumRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const SumApplyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
`

const FlatMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  min-width: 0;
`

const MetricFieldWrap = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const MetricFieldLabel = styled.span<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 12px;
  font-weight: ${({ $primary }) => ($primary ? 700 : 600)};
  color: ${({ $primary, theme }) =>
    $primary ? theme.colors.text.primary : theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  small {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SubUnitCountPair = styled.div`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 5px;
`

const AddSnapshotActionRow = styled.div`
  display: flex;
  align-items: center;
  padding: 2px 0 6px;
`
