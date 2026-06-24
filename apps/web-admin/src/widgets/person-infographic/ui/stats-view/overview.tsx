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
import type { AdaptedPerson } from '../../model/types'

import { ChartShell, EmptyHint, traitToneBg, traitToneFg } from './shared'

interface Props {
  people: AdaptedPerson[]
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
  onPersonClick: (id: string) => void
}

/** 출생년 → 세기 키 (음수=BC). 출생년 없으면 null */
function centuryOf(person: AdaptedPerson): number | null {
  if (person.born == null) return null
  return person.born >= 0 ? Math.ceil(person.born / 100) : -Math.ceil(-person.born / 100)
}

export function OverviewPane({
  people,
  evaluated,
  evalIndex,
  onPersonClick,
}: Props) {
  const theme = useTheme()
  // recharts 축/툴팁 색은 테마 토큰으로 — 다크모드에서 하드코딩 회색·연한 보더가 안 보이던 문제 보정
  const axisTickColor = theme.colors.text.tertiary
  const tooltipBorder = `1px solid ${theme.colors.border.default}`
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

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
      const c = centuryOf(p)
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

  // A. 트레이트 빈도 (top 12)
  const traitFrequency = useMemo(() => {
    const counts = new Map<PersonTrait, number>()
    for (const p of evaluated) {
      const traits = evalIndex.get(p.id)?.traits ?? []
      for (const t of traits) {
        counts.set(t.trait, (counts.get(t.trait) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([trait, count]) => ({ trait, count, meta: PERSON_TRAIT_META[trait] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
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

  return (
    <Grid>
      {/* G. 진행률 */}
      <Card $span={2}>
        <CardTitle>평가 진행률</CardTitle>
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
                <RecommendItem key={p.id} type="button" onClick={() => onPersonClick(p.id)}>
                  <RecommendName>{p.name}</RecommendName>
                  <RecommendCountry>{p.country}</RecommendCountry>
                  <RecommendInfluence>★ {p.influence ?? 0}</RecommendInfluence>
                </RecommendItem>
              ))}
            </RecommendList>
          </>
        )}
      </Card>

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
                contentStyle={{ borderRadius: 8, fontSize: 12, border: tooltipBorder }}
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
        <AxisLegend>
          {axisAverages.map((d) => (
            <AxisLegendItem key={d.key}>
              <AxisLegendDot style={{ background: PERSON_STAT_META[d.key].color }} />
              {d.axis} <strong>{d.avg}</strong>
            </AxisLegendItem>
          ))}
        </AxisLegend>
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
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: tooltipBorder }} />
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
        <CardTitle>축별 톱 10</CardTitle>
        <LeaderGrid>
          {PERSON_STAT_KEYS.map((key) => {
            const meta = PERSON_STAT_META[key]
            const list = leaderboardByAxis[key]
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
        <CardHint>상위 12개 (필터 범위 내)</CardHint>
        {traitFrequency.length === 0 ? (
          <EmptyHint>부여한 태그가 없습니다.</EmptyHint>
        ) : (
          <TraitFreqList>
            {traitFrequency.map(({ trait, count, meta }) => (
              <TraitFreqRow key={trait}>
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
            ))}
          </TraitFreqList>
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

      {/* D1. 평가 export/import */}
      <Card>
        <CardTitle>평가 데이터</CardTitle>
        <CardHint>JSON으로 백업·복원. 파일에는 stats + traits 전부 포함</CardHint>
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
        {importStatus && <ImportStatusText>{importStatus}</ImportStatusText>}
      </Card>

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
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const CardTitle = styled.h3`
  margin: 0;
  font-size: 13px;
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
  margin: 0;
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
  color: #6366f1;
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
  background: rgba(99, 102, 241, 0.1);
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #4f46e5);
  border-radius: 999px;
  transition: width 0.3s ease;
`

const RecommendList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RecommendItem = styled.button`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const RecommendName = styled.span`
  font-weight: 600;
`

const RecommendCountry = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RecommendInfluence = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
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

const LeaderColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  grid-template-columns: 18px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border: none;
  border-radius: 5px;
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

const LeaderValue = styled.span<{ $rank: number }>`
  font-variant-numeric: tabular-nums;
  font-weight: ${({ $rank }) => ($rank === 1 ? 800 : 700)};
  font-size: ${({ $rank }) => ($rank === 1 ? '13px' : '11.5px')};
`

const TraitFreqList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TraitFreqRow = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr 30px;
  align-items: center;
  gap: 8px;
`

const TraitFreqLabel = styled.span<{ $tone: 'positive' | 'neutral' | 'negative' }>`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ $tone }) => traitToneFg[$tone]};
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
  background: ${({ $tone }) => traitToneBg[$tone]};
  border-bottom: 2px solid ${({ $tone }) => traitToneFg[$tone]};
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
  color: ${({ $tone }) => traitToneFg[$tone]};
  background: ${({ $tone }) => traitToneBg[$tone]};
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
