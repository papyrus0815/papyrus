/**
 * 능력치 개요 sub-tab — A(leaderboard) + B(평가 패턴) + B2(시대 추이) + G(진행률).
 */
import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FiDownload, FiUpload } from 'react-icons/fi'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styled, { css, useTheme } from 'styled-components'

import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  MiniSvgSparkline,
  StackedSegmentBar,
  type SegmentSlice,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  MOTION,
  RADIUS,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import {
  type PersonStatKey,
  type PersonTrait,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
  PERSON_TRAIT_META,
  getAllMyEvaluations,
  upsertMyEvaluation,
} from '@/shared/api/person-stats'
import type { PersonEvaluationSummary } from '@/shared/lib/person-evaluation-index'
import { notify } from '@/shared/ui/toast'
import { centuryOf } from '../../model/century'
import type { AdaptedPerson } from '../../model/types'

import { BRAND, hairline, surface } from '../_shared/catalog.styles'
import {
  ChartShell,
  EmptyHint,
  getTooltipStyle,
  traitToneBg,
  traitToneBgDark,
  traitToneFg,
  traitToneFgDark,
  useChartTheme,
} from './shared'

interface Props {
  people: AdaptedPerson[]
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
  onPersonClick: (id: string) => void
}

/** 활동·출생·사망연도 → 세기 sortKey (음수=BC, 양수=AD). 연도 없으면 null */
function personCenturySortKey(person: AdaptedPerson): number | null {
  const refYear = person.activityYear ?? person.born ?? person.died
  if (refYear == null || !Number.isFinite(refYear)) return null
  return centuryOf(Math.round(refYear)).sortKey
}

function personLifespan(person: AdaptedPerson): number | null {
  if (
    person.age != null &&
    Number.isFinite(person.age) &&
    person.age > 0 &&
    person.age <= 130
  ) {
    return Math.round(person.age)
  }
  if (
    person.born != null &&
    person.died != null &&
    person.died > person.born &&
    person.died - person.born <= 130
  ) {
    return Math.round(person.died - person.born)
  }
  return null
}

function formatCenturyKey(c: number): string {
  return c < 0 ? `BC ${-c}세기` : `${c}세기`
}

const LEADER_PREVIEW_COUNT = 5

export function OverviewPane({
  people,
  evaluated,
  evalIndex,
  onPersonClick,
}: Props) {
  const theme = useTheme()
  const mode = theme.mode === 'dark' ? 'dark' : 'light'
  const chart = useChartTheme()
  const axisTickColor = chart.tick
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [selectedTrait, setSelectedTrait] = useState<PersonTrait | null>(null)
  const [leaderExpanded, setLeaderExpanded] = useState(false)

  const exportEvaluations = async () => {
    try {
      const data = await getAllMyEvaluations()
      const json = JSON.stringify(
        { exportedAt: new Date().toISOString(), version: 1, ...data },
        null,
        2,
      )
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.href = url
      a.download = `person-evaluations-${ts}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notify.success(`${data.stats.length}건의 stats + ${data.traits.length}건의 태그를 내보냈습니다.`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '내보내기 실패')
    }
  }

  const importEvaluations = async (file: File) => {
    setImporting(true)
    setImportStatus(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const stats = Array.isArray(parsed.stats) ? parsed.stats : []
      const traits = Array.isArray(parsed.traits) ? parsed.traits : []

      // personId별로 stats + traits 묶기
      type Body = {
        stats?: Record<string, number | null | string>
        traits?: { items: Array<{ trait: string; intensity?: number | null; note?: string | null }> }
      }
      const byPerson = new Map<string, Body>()
      for (const s of stats) {
        if (!s?.personId) continue
        const cur = byPerson.get(s.personId) ?? {}
        cur.stats = {
          politics: s.politics ?? null,
          military: s.military ?? null,
          diplomacy: s.diplomacy ?? null,
          intellect: s.intellect ?? null,
          charisma: s.charisma ?? null,
          administration: s.administration ?? null,
          notes: s.notes ?? null,
        }
        byPerson.set(s.personId, cur)
      }
      for (const t of traits) {
        if (!t?.personId) continue
        const cur = byPerson.get(t.personId) ?? {}
        if (!cur.traits) cur.traits = { items: [] }
        cur.traits.items.push({
          trait: t.trait,
          intensity: t.intensity ?? null,
          note: t.note ?? null,
        })
        byPerson.set(t.personId, cur)
      }

      // upsert per person
      let success = 0
      let failed = 0
      const total = byPerson.size
      let i = 0
      for (const [pid, body] of byPerson.entries()) {
        i += 1
        setImportStatus(`처리 중 (${i}/${total})…`)
        try {
          await upsertMyEvaluation(pid, body as Parameters<typeof upsertMyEvaluation>[1])
          success += 1
        } catch {
          failed += 1
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['my-evaluations'] })
      setImportStatus(`완료 — 성공 ${success}명, 실패 ${failed}명`)
      notify.success(`${success}명 평가를 가져왔습니다.${failed > 0 ? ` (${failed}명 실패)` : ''}`)
    } catch (err) {
      setImportStatus('파싱 또는 처리 실패')
      notify.error(
        err instanceof Error ? `가져오기 실패: ${err.message}` : '가져오기 실패',
      )
    } finally {
      setImporting(false)
    }
  }
  // G. 진행률
  const totalCount = people.length
  const evaluatedCount = evaluated.length
  const progressPct = totalCount === 0 ? 0 : Math.round((evaluatedCount / totalCount) * 100)

  // G. 미평가 인물 중 영향력 높은 순 톱 10
  const unevaluatedTop = useMemo(
    () =>
      people
        .filter((p) => !evalIndex.get(p.id)?.hasEvaluation)
        .sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0))
        .slice(0, 10),
    [people, evalIndex],
  )

  // A0. 종합 평균(6축 평균) leaderboard
  const overallLeaderboard = useMemo(() => {
    const rows: Array<{ person: AdaptedPerson; value: number }> = []
    for (const p of evaluated) {
      const avg = evalIndex.get(p.id)?.statsAverage
      if (avg != null) rows.push({ person: p, value: Math.round(avg) })
    }
    rows.sort((a, b) => b.value - a.value)
    return rows.slice(0, 10)
  }, [evaluated, evalIndex])

  // A. 6축 leaderboard
  const leaderboardByAxis = useMemo(() => {
    const result: Record<PersonStatKey, Array<{ person: AdaptedPerson; value: number }>> = {
      politics: [], military: [], diplomacy: [], intellect: [], charisma: [], administration: [],
    }
    for (const key of PERSON_STAT_KEYS) {
      const rows: Array<{ person: AdaptedPerson; value: number }> = []
      for (const p of evaluated) {
        const v = evalIndex.get(p.id)?.stats?.[key]
        if (v != null) rows.push({ person: p, value: v as number })
      }
      rows.sort((a, b) => b.value - a.value)
      result[key] = rows.slice(0, 10)
    }
    return result
  }, [evaluated, evalIndex])

  // B. 6축 평균
  const axisAverages = useMemo(() => {
    return PERSON_STAT_KEYS.map((key) => {
      let sum = 0
      let count = 0
      for (const p of evaluated) {
        const v = evalIndex.get(p.id)?.stats?.[key]
        if (v != null) {
          sum += v as number
          count += 1
        }
      }
      return {
        axis: PERSON_STAT_META[key].label,
        key,
        avg: count > 0 ? Math.round(sum / count) : 0,
        count,
      }
    })
  }, [evaluated, evalIndex])

  // B2. 시대별(세기별) 6축 평균 추이 — 시대 순서대로
  const eraTrend = useMemo(() => {
    const buckets = new Map<
      number,
      { sums: Record<PersonStatKey, number>; counts: Record<PersonStatKey, number>; n: number }
    >()
    for (const p of evaluated) {
      const c = personCenturySortKey(p)
      if (c == null) continue
      let b = buckets.get(c)
      if (!b) {
        b = {
          sums: { politics: 0, military: 0, diplomacy: 0, intellect: 0, charisma: 0, administration: 0 },
          counts: { politics: 0, military: 0, diplomacy: 0, intellect: 0, charisma: 0, administration: 0 },
          n: 0,
        }
        buckets.set(c, b)
      }
      b.n += 1
      const stats = evalIndex.get(p.id)?.stats
      if (!stats) continue
      for (const key of PERSON_STAT_KEYS) {
        const v = stats[key]
        if (v != null) {
          b.sums[key] += v as number
          b.counts[key] += 1
        }
      }
    }
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b)
    return sortedKeys.map((c) => {
      const b = buckets.get(c)!
      const row: Record<string, number | string> = {
        century: c < 0 ? `BC ${-c}c` : `${c}c`,
        n: b.n,
      }
      for (const key of PERSON_STAT_KEYS) {
        row[PERSON_STAT_META[key].label] = b.counts[key] > 0 ? Math.round(b.sums[key] / b.counts[key]) : 0
      }
      return row
    })
  }, [evaluated, evalIndex])

  // A. 트레이트 빈도 (top 12) + 각 트레이트 보유 인물 목록
  const { traitFrequency, peopleByTrait } = useMemo(() => {
    const counts = new Map<PersonTrait, number>()
    const byTrait = new Map<PersonTrait, AdaptedPerson[]>()
    for (const p of evaluated) {
      const traits = evalIndex.get(p.id)?.traits ?? []
      for (const t of traits) {
        counts.set(t.trait, (counts.get(t.trait) ?? 0) + 1)
        const list = byTrait.get(t.trait) ?? []
        list.push(p)
        byTrait.set(t.trait, list)
      }
    }
    const freq = Array.from(counts.entries())
      .map(([trait, count]) => ({ trait, count, meta: PERSON_TRAIT_META[trait] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
    return { traitFrequency: freq, peopleByTrait: byTrait }
  }, [evaluated, evalIndex])

  // D4. 트레이트 페어 — 같은 인물에 자주 함께 부여된 태그 쌍 (top 10)
  const traitPairs = useMemo(() => {
    const pairCount = new Map<string, { a: PersonTrait; b: PersonTrait; count: number }>()
    for (const p of evaluated) {
      const traits = (evalIndex.get(p.id)?.traits ?? []).map((t) => t.trait)
      // 정렬하여 (a,b) 정규화 — (a,b)와 (b,a) 동일시
      const sorted = [...traits].sort()
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i]!
          const b = sorted[j]!
          const key = `${a}|${b}`
          const cur = pairCount.get(key)
          if (cur) cur.count += 1
          else pairCount.set(key, { a, b, count: 1 })
        }
      }
    }
    return Array.from(pairCount.values())
      .filter((p) => p.count >= 2) // 1회 동시 부여는 노이즈
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [evaluated, evalIndex])

  // 수동 능력치 평가가 0건일 때 표시할 객관적 역사 인물 인포그래픽 (세기별 평균 수명 · 수명 구간 · 재임/관직 Top 8)
  const objectiveInfographics = useMemo(() => {
    const centuryAgeBuckets = new Map<number, { sum: number; count: number }>()
    let ageSum = 0
    let ageCount = 0
    let under40 = 0
    let from40to59 = 0
    let from60to79 = 0
    let over80 = 0
    let aliveCount = 0
    let unknownAgeCount = 0

    let monarchCount = 0
    let headOfStateCount = 0
    const officeCandidates: Array<{
      person: AdaptedPerson
      roleTag: '군주' | '국가원수' | '관직'
      activeSpanYears: number | null
      score: number
    }> = []

    for (const p of people) {
      if (p.isAlive) {
        aliveCount += 1
      } else {
        const age = personLifespan(p)
        if (age != null) {
          ageSum += age
          ageCount += 1
          if (age < 40) under40 += 1
          else if (age < 60) from40to59 += 1
          else if (age < 80) from60to79 += 1
          else over80 += 1

          const c = personCenturySortKey(p)
          if (c != null) {
            const bucket = centuryAgeBuckets.get(c) ?? { sum: 0, count: 0 }
            bucket.sum += age
            bucket.count += 1
            centuryAgeBuckets.set(c, bucket)
          }
        } else {
          unknownAgeCount += 1
        }
      }

      if (p.isMonarch) monarchCount += 1
      if (p.isHeadOfState) headOfStateCount += 1

      const hasOffice =
        p.isMonarch || p.isHeadOfState || Boolean(p.primaryTitle?.trim())
      if (hasOffice) {
        const span =
          p.activityStart != null &&
          p.activityEnd != null &&
          p.activityEnd > p.activityStart &&
          p.activityEnd - p.activityStart <= 100
            ? Math.round(p.activityEnd - p.activityStart)
            : null
        officeCandidates.push({
          person: p,
          roleTag: p.isMonarch ? '군주' : p.isHeadOfState ? '국가원수' : '관직',
          activeSpanYears: span,
          score: p.influence ?? 0,
        })
      }
    }

    const sortedCenturies = Array.from(centuryAgeBuckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([c, b]) => ({
        century: c,
        label: formatCenturyKey(c),
        year: c < 0 ? c * 100 + 50 : (c - 1) * 100 + 50,
        avgAge: Math.round(b.sum / b.count),
        count: b.count,
      }))

    const sparkPoints = sortedCenturies.map((item) => ({
      year: item.year,
      value: item.avgAge,
    }))
    const overallAvgAge = ageCount > 0 ? Math.round(ageSum / ageCount) : null
    const peakCentury =
      sortedCenturies.length > 0
        ? sortedCenturies.reduce((best, cur) =>
            cur.avgAge > best.avgAge ? cur : best,
          )
        : null
    const lowCentury =
      sortedCenturies.length > 0
        ? sortedCenturies.reduce((worst, cur) =>
            cur.avgAge < worst.avgAge ? cur : worst,
          )
        : null

    const safeAgeTotal = Math.max(1, ageCount)
    const lifespanSlices: SegmentSlice[] = [
      {
        key: 'under40',
        label: '~39세 (요절·청년)',
        value: under40,
        color: mode === 'dark' ? '#f87171' : '#dc2626',
        meta: `${Math.round((under40 / safeAgeTotal) * 100)}%`,
      },
      {
        key: '40to59',
        label: '40–59세 (중년)',
        value: from40to59,
        color: mode === 'dark' ? '#fbbf24' : '#d97706',
        meta: `${Math.round((from40to59 / safeAgeTotal) * 100)}%`,
      },
      {
        key: '60to79',
        label: '60–79세 (장수)',
        value: from60to79,
        color: ledgerAccent(mode),
        meta: `${Math.round((from60to79 / safeAgeTotal) * 100)}%`,
      },
      {
        key: '80plus',
        label: '80세+ (고령)',
        value: over80,
        color: mode === 'dark' ? '#2dd4bf' : '#0f766e',
        meta: `${Math.round((over80 / safeAgeTotal) * 100)}%`,
      },
    ].filter((slice) => slice.value > 0)

    const fallbackPool =
      officeCandidates.length > 0
        ? officeCandidates
        : people.map((p) => ({
            person: p,
            roleTag: '관직' as const,
            activeSpanYears: null,
            score: p.influence ?? 0,
          }))

    const topOfficeHolders = fallbackPool
      .slice()
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.activeSpanYears ?? 0) - (a.activeSpanYears ?? 0) ||
          a.person.name.localeCompare(b.person.name, 'ko'),
      )
      .slice(0, 8)
    const maxOfficeScore = Math.max(
      1,
      ...topOfficeHolders.map((entry) => entry.score),
    )

    return {
      sortedCenturies,
      sparkPoints,
      overallAvgAge,
      ageCount,
      aliveCount,
      unknownAgeCount,
      peakCentury,
      lowCentury,
      lifespanSlices,
      monarchCount,
      headOfStateCount,
      officeTotalCount: officeCandidates.length,
      topOfficeHolders,
      maxOfficeScore,
    }
  }, [people, mode])

  const evaluationDataControls = (
    <DataActionsRow>
      <DataActionBtn type="button" onClick={() => exportEvaluations()}>
        <FiDownload size={13} /> 내보내기
      </DataActionBtn>
      <DataActionBtn
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
      >
        <FiUpload size={13} /> {importing ? '가져오는 중…' : '가져오기'}
      </DataActionBtn>
      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) importEvaluations(file)
        }}
      />
    </DataActionsRow>
  )

  return (
    <Grid>
      {evaluatedCount === 0 ? (
        <>
          {/* 객관적 역사 인물 인포그래픽 1: 세기별 평균 수명 추이 */}
          <LedgerBentoCard>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>세기별 평균 수명 추이</BentoCardTitle>
              </BentoCardTitleGroup>
              <BentoCardBadge>
                생몰 확인 {objectiveInfographics.ageCount.toLocaleString()}명
              </BentoCardBadge>
            </BentoCardHeader>
            <BentoCardBody>
              {objectiveInfographics.overallAvgAge == null ? (
                <EmptyHint>생몰 연도가 확인된 인물이 없습니다.</EmptyHint>
              ) : (
                <>
                  <ObjectiveKpiRow>
                    <ObjectiveKpiItem>
                      <span>전체 평균</span>
                      <strong>{objectiveInfographics.overallAvgAge}세</strong>
                    </ObjectiveKpiItem>
                    {objectiveInfographics.peakCentury && (
                      <ObjectiveKpiItem>
                        <span>최장수 세기</span>
                        <strong>
                          {objectiveInfographics.peakCentury.label} (
                          {objectiveInfographics.peakCentury.avgAge}세)
                        </strong>
                      </ObjectiveKpiItem>
                    )}
                    {objectiveInfographics.lowCentury &&
                      objectiveInfographics.sortedCenturies.length > 1 && (
                        <ObjectiveKpiItem>
                          <span>최단명 세기</span>
                          <strong>
                            {objectiveInfographics.lowCentury.label} (
                            {objectiveInfographics.lowCentury.avgAge}세)
                          </strong>
                        </ObjectiveKpiItem>
                      )}
                  </ObjectiveKpiRow>
                  {objectiveInfographics.sparkPoints.length >= 2 ? (
                    <>
                      <MiniSvgSparkline
                        points={objectiveInfographics.sparkPoints}
                        color={ledgerAccent(mode)}
                        height={92}
                        formatValue={(val) => `${Math.round(val)}세`}
                      />
                      <CenturyRangeCaption>
                        <span>
                          {objectiveInfographics.sortedCenturies[0]!.label} (
                          {objectiveInfographics.sortedCenturies[0]!.avgAge}세)
                        </span>
                        <span>
                          총 {objectiveInfographics.sortedCenturies.length}개 세기
                        </span>
                        <span>
                          {
                            objectiveInfographics.sortedCenturies[
                              objectiveInfographics.sortedCenturies.length - 1
                            ]!.label
                          }{' '}
                          (
                          {
                            objectiveInfographics.sortedCenturies[
                              objectiveInfographics.sortedCenturies.length - 1
                            ]!.avgAge
                          }
                          세)
                        </span>
                      </CenturyRangeCaption>
                    </>
                  ) : (
                    <EmptyHint>
                      단일 세기 데이터만 존재합니다 (
                      {objectiveInfographics.sortedCenturies[0]?.label ?? '—'} 평균{' '}
                      {objectiveInfographics.overallAvgAge}세).
                    </EmptyHint>
                  )}
                </>
              )}
            </BentoCardBody>
          </LedgerBentoCard>

          {/* 객관적 역사 인물 인포그래픽 2: 수명 구간 분포 */}
          <LedgerBentoCard>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>수명 구간 분포</BentoCardTitle>
              </BentoCardTitleGroup>
              <BentoCardBadge>
                {objectiveInfographics.aliveCount > 0
                  ? `생존 ${objectiveInfographics.aliveCount.toLocaleString()}명 별도`
                  : `총 ${totalCount.toLocaleString()}명`}
              </BentoCardBadge>
            </BentoCardHeader>
            <BentoCardBody>
              {objectiveInfographics.lifespanSlices.length === 0 ? (
                <EmptyHint>수명 구간을 산출할 생몰 기록이 없습니다.</EmptyHint>
              ) : (
                <>
                  <StackedSegmentBar
                    slices={objectiveInfographics.lifespanSlices}
                    height={14}
                    showPercent
                  />
                  <LifespanBandGrid>
                    {objectiveInfographics.lifespanSlices.map((slice) => (
                      <LifespanBandRow key={slice.key}>
                        <LifespanDot style={{ background: slice.color }} />
                        <LifespanBandLabel>{slice.label}</LifespanBandLabel>
                        <LifespanBandStat>
                          <strong>{slice.value.toLocaleString()}명</strong>
                          <span>{slice.meta}</span>
                        </LifespanBandStat>
                      </LifespanBandRow>
                    ))}
                  </LifespanBandGrid>
                  {(objectiveInfographics.aliveCount > 0 ||
                    objectiveInfographics.unknownAgeCount > 0) && (
                    <ObjectiveMetaFoot>
                      {objectiveInfographics.aliveCount > 0 &&
                        `현존 인물 ${objectiveInfographics.aliveCount.toLocaleString()}명`}
                      {objectiveInfographics.aliveCount > 0 &&
                        objectiveInfographics.unknownAgeCount > 0 &&
                        ' · '}
                      {objectiveInfographics.unknownAgeCount > 0 &&
                        `생몰 미상 ${objectiveInfographics.unknownAgeCount.toLocaleString()}명`}
                    </ObjectiveMetaFoot>
                  )}
                </>
              )}
            </BentoCardBody>
          </LedgerBentoCard>

          {/* 객관적 역사 인물 인포그래픽 3: 재임·관직 보유 인물 Top 8 비례 막대 */}
          <LedgerBentoCard $span={2}>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>재임·관직 보유 인물 Top 8</BentoCardTitle>
              </BentoCardTitleGroup>
              <OfficeSummaryBadges>
                <BentoCardBadge>
                  직함·재임 {objectiveInfographics.officeTotalCount.toLocaleString()}명
                </BentoCardBadge>
                {objectiveInfographics.monarchCount > 0 && (
                  <BentoCardBadge>
                    군주 {objectiveInfographics.monarchCount.toLocaleString()}명
                  </BentoCardBadge>
                )}
                {objectiveInfographics.headOfStateCount > 0 && (
                  <BentoCardBadge>
                    수반 {objectiveInfographics.headOfStateCount.toLocaleString()}명
                  </BentoCardBadge>
                )}
              </OfficeSummaryBadges>
            </BentoCardHeader>
            <BentoCardBody>
              {objectiveInfographics.topOfficeHolders.length === 0 ? (
                <EmptyHint>표시할 인물이 없습니다.</EmptyHint>
              ) : (
                <OfficeBarList>
                  {objectiveInfographics.topOfficeHolders.map((entry, idx) => {
                    const { person, roleTag, activeSpanYears, score } = entry
                    const pct = Math.max(
                      6,
                      Math.round(
                        (score / objectiveInfographics.maxOfficeScore) * 100,
                      ),
                    )
                    const metaText = [
                      person.primaryTitle,
                      person.country && person.country !== '미상'
                        ? person.country
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <OfficeBarRow
                        key={person.id}
                        type="button"
                        onClick={() => onPersonClick(person.id)}
                      >
                        <OfficeRank>{idx + 1}</OfficeRank>
                        <OfficeIdentity>
                          <OfficeNameLine>
                            <OfficeName>{person.name}</OfficeName>
                            <OfficeRoleBadge $role={roleTag}>
                              {roleTag}
                            </OfficeRoleBadge>
                          </OfficeNameLine>
                          {metaText && <OfficeSubMeta>{metaText}</OfficeSubMeta>}
                        </OfficeIdentity>
                        <OfficeBarTrack>
                          <OfficeBarFill
                            style={{
                              width: `${pct}%`,
                              background: ledgerAccent(mode),
                            }}
                          />
                        </OfficeBarTrack>
                        <OfficeMetricValue>
                          <strong>{score}</strong>
                          <span>
                            {activeSpanYears != null
                              ? `활동 ${activeSpanYears}년`
                              : '영향력'}
                          </span>
                        </OfficeMetricValue>
                      </OfficeBarRow>
                    )
                  })}
                </OfficeBarList>
              )}
            </BentoCardBody>
          </LedgerBentoCard>

          {/* 하단 컴팩트 수동 평가 프롬프트 */}
          <CompactEvalPromptCard $span={2}>
            <CompactEvalHeader>
              <div>
                <CompactEvalTitle>
                  수동 능력치 평가 안내{' '}
                  <CompactEvalCount>
                    0 / {totalCount.toLocaleString()}명 완료
                  </CompactEvalCount>
                </CompactEvalTitle>
                <CardHint>
                  인물 상세에서 6축 능력치·성격 태그를 기록하면 축별 리더보드와 세기별 추이 분석이 함께 표시됩니다.
                </CardHint>
              </div>
              {evaluationDataControls}
            </CompactEvalHeader>
            {importStatus && <ImportStatusText>{importStatus}</ImportStatusText>}
            {unevaluatedTop.length > 0 && (
              <CompactRecommendStrip>
                <CompactRecommendLabel>평가 추천</CompactRecommendLabel>
                {unevaluatedTop.slice(0, 6).map((p) => (
                  <TraitPersonChip
                    key={p.id}
                    type="button"
                    onClick={() => onPersonClick(p.id)}
                  >
                    {p.name}
                    <span>{p.country}</span>
                  </TraitPersonChip>
                ))}
              </CompactRecommendStrip>
            )}
          </CompactEvalPromptCard>
        </>
      ) : (
        /* G. 진행률 + D1. 평가 데이터 내보내기/가져오기 통합 */
        <Card $span={2}>
          <CardHeaderRow>
            <div>
              <CardTitle>평가 진행률</CardTitle>
              <CardHint>현재 필터 범위 내 평가 완료율 · JSON 백업/복원</CardHint>
            </div>
            {evaluationDataControls}
          </CardHeaderRow>
          {importStatus && <ImportStatusText>{importStatus}</ImportStatusText>}

          <ProgressRow>
            <ProgressBig>
              <ProgressNum>{evaluatedCount}</ProgressNum>
              <ProgressOf>/ {totalCount}명</ProgressOf>
              <ProgressPct>{progressPct}%</ProgressPct>
            </ProgressBig>
            <ProgressTrack>
              <ProgressFill style={{ width: `${progressPct}%` }} />
            </ProgressTrack>
          </ProgressRow>

          {unevaluatedTop.length > 0 && (
            <>
              <CardSubTitle>영향력 높은 미평가 인물 (추천)</CardSubTitle>
              <RecommendList>
                {unevaluatedTop.map((p) => (
                  <RecommendItem
                    key={p.id}
                    type="button"
                    onClick={() => onPersonClick(p.id)}
                  >
                    <RecommendName title={p.name}>{p.name}</RecommendName>
                    <RecommendCountry>{p.country}</RecommendCountry>
                    <RecommendInfluence>{p.influence ?? 0}</RecommendInfluence>
                  </RecommendItem>
                ))}
              </RecommendList>
            </>
          )}
        </Card>
      )}

      {evaluatedCount > 0 && (
        <>
          {/* B. 평가 패턴 */}
          <Card>
            <CardTitle>나의 평가 패턴</CardTitle>
            <CardHint>축별 평균 점수 (필터 범위 내)</CardHint>
            <ChartShell $h={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={axisAverages} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="axis" tick={{ fontSize: 11, fill: axisTickColor }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axisTickColor }} width={28} />
                  <Tooltip
                    contentStyle={getTooltipStyle(chart)}
                    formatter={(v: number) => [`${v}점`, '평균']}
                  />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {axisAverages.map((d, i) => (
                      <Cell key={i} fill={PERSON_STAT_META[d.key].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          </Card>

          {/* B2. 시대 추이 */}
          <Card>
            <CardTitle>시대별 능력치 추이</CardTitle>
            <CardHint>세기 순 평균 점수 (평가된 인물 기준)</CardHint>
            {eraTrend.length < 2 ? (
              <EmptyHint>최소 2개 세기에 평가된 인물이 필요합니다.</EmptyHint>
            ) : (
              <ChartShell $h={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={eraTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="century" tick={{ fontSize: 11, fill: axisTickColor }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axisTickColor }} width={28} />
                    <Tooltip contentStyle={getTooltipStyle(chart)} />
                    {PERSON_STAT_KEYS.map((key) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={PERSON_STAT_META[key].label}
                        stroke={PERSON_STAT_META[key].color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>
            )}
          </Card>

          {/* A. Leaderboard */}
          <Card $span={2}>
            <CardHeaderRow>
              <CardTitle>종합 & 축별 순위</CardTitle>
              {overallLeaderboard.length > LEADER_PREVIEW_COUNT && (
                <DataActionBtn
                  type="button"
                  onClick={() => setLeaderExpanded((prev) => !prev)}
                >
                  {leaderExpanded ? '상위 5명만 보기' : '10위까지 더보기'}
                </DataActionBtn>
              )}
            </CardHeaderRow>
            <LeaderGrid>
              <LeaderColumn $highlight>
                <LeaderColTitle>
                  <LeaderColDot style={{ background: BRAND.primary }} />
                  종합 평균
                </LeaderColTitle>
                {overallLeaderboard.length === 0 ? (
                  <LeaderEmpty>—</LeaderEmpty>
                ) : (
                  overallLeaderboard
                    .slice(0, leaderExpanded ? 10 : LEADER_PREVIEW_COUNT)
                    .map((row, i) => {
                      const rank = i + 1
                      return (
                        <LeaderRow
                          key={row.person.id}
                          type="button"
                          onClick={() => onPersonClick(row.person.id)}
                        >
                          <LeaderRank $rank={rank}>{rank}</LeaderRank>
                          <LeaderName $rank={rank}>{row.person.name}</LeaderName>
                          <LeaderValue $rank={rank} style={{ color: BRAND.primary }}>
                            {row.value}
                          </LeaderValue>
                        </LeaderRow>
                      )
                    })
                )}
              </LeaderColumn>

              {PERSON_STAT_KEYS.map((key) => {
                const meta = PERSON_STAT_META[key]
                const list = leaderboardByAxis[key].slice(
                  0,
                  leaderExpanded ? 10 : LEADER_PREVIEW_COUNT,
                )
                return (
                  <LeaderColumn key={key}>
                    <LeaderColTitle>
                      <LeaderColDot style={{ background: meta.color }} />
                      {meta.label}
                    </LeaderColTitle>
                    {list.length === 0 ? (
                      <LeaderEmpty>—</LeaderEmpty>
                    ) : (
                      list.map((row, i) => {
                        const rank = i + 1
                        return (
                          <LeaderRow
                            key={row.person.id}
                            type="button"
                            onClick={() => onPersonClick(row.person.id)}
                          >
                            <LeaderRank $rank={rank}>{rank}</LeaderRank>
                            <LeaderName $rank={rank}>{row.person.name}</LeaderName>
                            <LeaderValue $rank={rank} style={{ color: meta.color }}>
                              {row.value}
                            </LeaderValue>
                          </LeaderRow>
                        )
                      })
                    )}
                  </LeaderColumn>
                )
              })}
            </LeaderGrid>
          </Card>

          {/* A. 트레이트 빈도 */}
          <Card>
            <CardTitle>자주 부여한 성격</CardTitle>
            <CardHint>상위 12개 · 태그를 클릭하면 해당 인물 목록을 봅니다</CardHint>
            {traitFrequency.length === 0 ? (
              <EmptyHint>부여한 태그가 없습니다.</EmptyHint>
            ) : (
              <>
                <TraitFreqList>
                  {traitFrequency.map(({ trait, count, meta }) => {
                    const active = selectedTrait === trait
                    return (
                      <TraitFreqRow
                        key={trait}
                        type="button"
                        $active={active}
                        onClick={() =>
                          setSelectedTrait((prev) => (prev === trait ? null : trait))
                        }
                      >
                        <TraitFreqLabel $tone={meta.tone}>{meta.label}</TraitFreqLabel>
                        <TraitFreqBar>
                          <TraitFreqFill
                            $tone={meta.tone}
                            style={{
                              width: `${(count / Math.max(1, traitFrequency[0]!.count)) * 100}%`,
                            }}
                          />
                        </TraitFreqBar>
                        <TraitFreqCount>{count}</TraitFreqCount>
                      </TraitFreqRow>
                    )
                  })}
                </TraitFreqList>
                {selectedTrait && (peopleByTrait.get(selectedTrait)?.length ?? 0) > 0 && (
                  <TraitPeopleBox>
                    <TraitPeopleHeader>
                      <span>
                        <strong>{PERSON_TRAIT_META[selectedTrait].label}</strong> 보유 인물 (
                        {peopleByTrait.get(selectedTrait)!.length}명)
                      </span>
                      <TraitCloseBtn type="button" onClick={() => setSelectedTrait(null)}>
                        닫기
                      </TraitCloseBtn>
                    </TraitPeopleHeader>
                    <TraitPeopleChips>
                      {peopleByTrait.get(selectedTrait)!.map((p) => (
                        <TraitPersonChip
                          key={p.id}
                          type="button"
                          onClick={() => onPersonClick(p.id)}
                        >
                          {p.name}
                          <span>{p.country}</span>
                        </TraitPersonChip>
                      ))}
                    </TraitPeopleChips>
                  </TraitPeopleBox>
                )}
              </>
            )}
          </Card>

          {/* D4. 트레이트 페어 — 같은 인물에 자주 함께 부여된 태그 쌍 */}
          <Card>
            <CardTitle>자주 함께 부여된 태그</CardTitle>
            <CardHint>같은 인물에 동시에 부여된 태그 쌍 (2회 이상)</CardHint>
            {traitPairs.length === 0 ? (
              <EmptyHint>2회 이상 동시 부여된 태그 쌍이 없습니다.</EmptyHint>
            ) : (
              <PairList>
                {traitPairs.map(({ a, b, count }) => {
                  const aMeta = PERSON_TRAIT_META[a]
                  const bMeta = PERSON_TRAIT_META[b]
                  return (
                    <PairRow key={`${a}|${b}`}>
                      <PairChip $tone={aMeta.tone}>{aMeta.label}</PairChip>
                      <PairConn>+</PairConn>
                      <PairChip $tone={bMeta.tone}>{bMeta.label}</PairChip>
                      <PairCount>{count}회</PairCount>
                    </PairRow>
                  )
                })}
              </PairList>
            )}
          </Card>
        </>
      )}
    </Grid>
  )
}

// ─── styled ───────────────────────────────────────────────────────────────────

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.section<{ $span?: number }>`
  ${({ $span }) =>
    $span && $span > 1
      ? css`
          grid-column: 1 / -1;
        `
      : ''}
  padding: 16px 18px;
  border-radius: 14px;
  background: ${surface};
  border: 1px solid ${hairline};
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const CardHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const CardSubTitle = styled.h4`
  margin: 6px 0 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CardHint = styled.p`
  margin: 2px 0 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ProgressRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ProgressBig = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`

const ProgressNum = styled.span`
  font-size: 26px;
  font-weight: 700;
  color: ${BRAND.primary};
  font-variant-numeric: tabular-nums;
`

const ProgressOf = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ProgressPct = styled.span`
  margin-left: auto;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const ProgressTrack = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoftHover};
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  background: ${BRAND.primary};
  border-radius: 999px;
  transition: width 0.3s ease;
`

const RecommendList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 6px;
`

const RecommendItem = styled.button`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.015)'};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
  &:hover {
    border-color: ${BRAND.primaryBorder};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const RecommendName = styled.span`
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RecommendCountry = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RecommendInfluence = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const AxisLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AxisLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  strong {
    margin-left: 2px;
    color: ${({ theme }) => theme.colors.text.primary};
    font-variant-numeric: tabular-nums;
  }
`

const AxisLegendDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
`

const LeaderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
`

const LeaderColumn = styled.div<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  ${({ $highlight, theme }) =>
    $highlight &&
    css`
      padding: 8px 10px;
      margin: -8px -4px;
      border-radius: 10px;
      background: ${theme.mode === 'dark'
        ? BRAND.primarySoftDark
        : BRAND.primarySoft};
      border: 1px solid ${BRAND.primaryBorder};
    `}
`

const LeaderColTitle = styled.h4`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LeaderColDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
`

const LeaderEmpty = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 6px 0;
`

/** 1·2·3위 메달 색 — gold/silver/bronze. 인덱스는 (rank-1) */
const MEDAL_COLORS = ['#f59e0b', '#9ca3af', '#b45309'] as const

const LeaderRow = styled.button`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

/**
 * 1·2·3위는 메달 색으로 강조, 나머지는 무채색.
 * 행 자체는 같은 높이/패딩으로 유지 — 위계는 색·굵기로만 표현.
 */
const LeaderRank = styled.span<{ $rank: number }>`
  font-variant-numeric: tabular-nums;
  font-size: 10.5px;
  font-weight: ${({ $rank }) => ($rank <= 3 ? 800 : 600)};
  text-align: center;
  color: ${({ $rank, theme }) =>
    $rank <= 3 ? MEDAL_COLORS[$rank - 1] : theme.colors.text.tertiary};
`

const LeaderName = styled.span<{ $rank: number }>`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  font-weight: ${({ $rank }) => ($rank === 1 ? 700 : $rank <= 3 ? 600 : 500)};
  color: ${({ theme }) => theme.colors.text.primary};
`

const LeaderScoreWrap = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`

const LeaderValue = styled.span<{ $rank: number }>`
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: right;
  font-weight: ${({ $rank }) => ($rank === 1 ? 800 : 700)};
  font-size: ${({ $rank }) => ($rank === 1 ? '13px' : '11.5px')};
`

const LeaderScoreTrack = styled.span`
  width: 36px;
  height: 2.5px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  overflow: hidden;
`

const LeaderScoreFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 999px;
`

const TraitFreqList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TraitFreqRow = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 90px 1fr 30px;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.activeLight : theme.colors.hover};
  }
`

const TraitPeopleBox = styled.div`
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${hairline};
  background: ${({ theme }) => theme.colors.background.secondary};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TraitPeopleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TraitCloseBtn = styled.button`
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const TraitPeopleChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TraitPersonChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid ${hairline};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  > span {
    font-size: 10.5px;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    border-color: ${BRAND.primaryBorder};
    color: ${BRAND.primary};
  }
`

const TraitFreqLabel = styled.span<{ $tone: 'positive' | 'neutral' | 'negative' }>`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ $tone, theme }) =>
    theme.mode === 'dark' ? traitToneFgDark[$tone] : traitToneFg[$tone]};
`

const TraitFreqBar = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  overflow: hidden;
`

const TraitFreqFill = styled.div<{ $tone: 'positive' | 'neutral' | 'negative' }>`
  height: 100%;
  background: ${({ $tone, theme }) =>
    theme.mode === 'dark' ? traitToneBgDark[$tone] : traitToneBg[$tone]};
  border-bottom: 2px solid
    ${({ $tone, theme }) =>
      theme.mode === 'dark' ? traitToneFgDark[$tone] : traitToneFg[$tone]};
  border-radius: 999px;
  transition: width 0.2s ease;
`

const TraitFreqCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const PairList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const PairRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
`

const PairChip = styled.span<{ $tone: 'positive' | 'neutral' | 'negative' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $tone, theme }) =>
    theme.mode === 'dark' ? traitToneFgDark[$tone] : traitToneFg[$tone]};
  background: ${({ $tone, theme }) =>
    theme.mode === 'dark' ? traitToneBgDark[$tone] : traitToneBg[$tone]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PairConn = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
`

const PairCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const DataActionsRow = styled.div`
  display: inline-flex;
  gap: 8px;
  margin-top: 4px;
`

const DataActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.active};
    border-color: ${({ theme }) => theme.colors.active};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const HiddenFileInput = styled.input`
  display: none;
`

const ImportStatusText = styled.p`
  margin: 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LedgerBentoCard = styled(BentoCard)<{ $span?: number }>`
  ${({ $span }) =>
    $span && $span > 1
      ? css`
          grid-column: 1 / -1;
        `
      : ''}
  box-shadow: none;
  border: 1px solid
    ${({ theme }) =>
      ledgerHairlineStrong(theme.mode === 'dark' ? 'dark' : 'light')};
`

const ObjectiveKpiRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-bottom: 6px;
  border-bottom: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
`

const ObjectiveKpiItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    font-size: 10.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    ${DIGIT_DISPLAY}
    font-size: 13.5px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CenturyRangeCaption = styled.div`
  ${DIGIT_DISPLAY}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LifespanBandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  margin-top: 4px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const LifespanBandRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
  background: ${({ theme }) =>
    ledgerSubtleFill(theme.mode === 'dark' ? 'dark' : 'light')};
`

const LifespanDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
`

const LifespanBandLabel = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LifespanBandStat = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 11px;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ObjectiveMetaFoot = styled.div`
  ${DIGIT_DISPLAY}
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding-top: 2px;
`

const OfficeSummaryBadges = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
`

const OfficeBarList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 14px;
  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`

const OfficeBarRow = styled.button`
  display: grid;
  grid-template-columns: 18px minmax(110px, 1.15fr) minmax(72px, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  transition:
    background ${MOTION.fast} ease,
    border-color ${MOTION.fast} ease;

  &:hover {
    background: ${({ theme }) =>
      ledgerHoverFill(theme.mode === 'dark' ? 'dark' : 'light')};
    border-color: ${({ theme }) =>
      ledgerAccentBorder(theme.mode === 'dark' ? 'dark' : 'light')};
  }
  &:focus-visible {
    outline: 2px solid
      ${({ theme }) => ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
    outline-offset: 1px;
  }
`

const OfficeRank = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

const OfficeIdentity = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const OfficeNameLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
`

const OfficeName = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const OfficeRoleBadge = styled.span<{ $role: '군주' | '국가원수' | '관직' }>`
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: ${RADIUS.XS};
  font-size: 9.5px;
  font-weight: 700;
  border: 1px solid
    ${({ theme }) =>
      ledgerAccentBorder(theme.mode === 'dark' ? 'dark' : 'light')};
  background: ${({ theme }) =>
    ledgerAccentSubtle(theme.mode === 'dark' ? 'dark' : 'light')};
  color: ${({ theme }) =>
    ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
`

const OfficeSubMeta = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const OfficeBarTrack = styled.span`
  height: 7px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) =>
    ledgerSubtleFill(theme.mode === 'dark' ? 'dark' : 'light')};
  border: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
  overflow: hidden;
`

const OfficeBarFill = styled.span`
  display: block;
  height: 100%;
  border-radius: ${RADIUS.PILL};
  transition: width ${MOTION.normal} ease;
`

const OfficeMetricValue = styled.span`
  ${DIGIT_DISPLAY}
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  min-width: 48px;

  strong {
    font-size: 12px;
    font-weight: 800;
    color: ${({ theme }) =>
      ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
  }
  span {
    font-size: 9.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CompactEvalPromptCard = styled(Card)`
  padding: 12px 16px;
  gap: 8px;
  box-shadow: none;
`

const CompactEvalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const CompactEvalTitle = styled.h3`
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const CompactEvalCount = styled.span`
  ${DIGIT_DISPLAY}
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) =>
    ledgerAccent(theme.mode === 'dark' ? 'dark' : 'light')};
  background: ${({ theme }) =>
    ledgerAccentSubtle(theme.mode === 'dark' ? 'dark' : 'light')};
  border: 1px solid
    ${({ theme }) =>
      ledgerAccentBorder(theme.mode === 'dark' ? 'dark' : 'light')};
`

const CompactRecommendStrip = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid
    ${({ theme }) => ledgerHairline(theme.mode === 'dark' ? 'dark' : 'light')};
`

const CompactRecommendLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`
