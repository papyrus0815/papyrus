/**
 * 비교 sub-tab — 다중 인물 레이더 overlay (최대 5명).
 *
 * 외부 진입점: window 이벤트 'stats-view:compare-add' 로 personId 받아 자동 추가.
 * (인물 상세에서 "비교" 버튼 → 매트릭스로 점프 + 자동 선택용 — C1)
 */
import { useEffect, useMemo, useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import styled from 'styled-components'

import {
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
} from '@/shared/api/person-stats'
import type { PersonEvaluationSummary } from '@/shared/lib/person-evaluation-index'
import { usePersonInfographicFilterStore } from '../../model/filter.store'
import type { AdaptedPerson } from '../../model/types'

import { ChartShell, EmptyHint, useChartTheme } from './shared'

const PALETTE = ['#6366f1', '#dc2626', '#0891b2', '#7c3aed', '#f59e0b']

interface Props {
  people: AdaptedPerson[]
  evaluated: AdaptedPerson[]
  evalIndex: Map<string, PersonEvaluationSummary>
  onPersonClick: (id: string) => void
}

export function ComparePane({ people, evaluated, evalIndex, onPersonClick }: Props) {
  const chart = useChartTheme()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const pinnedList = usePersonInfographicFilterStore((s) => s.pinned)

  // C1: 외부에서 비교 추가 이벤트 받음 — 인물 상세 "비교" 버튼이 트리거
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (!id) return
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev
        if (prev.length >= 5) return prev
        return [...prev, id]
      })
    }
    window.addEventListener('stats-view:compare-add', handler)
    return () => window.removeEventListener('stats-view:compare-add', handler)
  }, [])

  const sortedEvaluated = useMemo(
    () =>
      [...evaluated].sort(
        (a, b) =>
          (evalIndex.get(b.id)?.statsAverage ?? 0) -
          (evalIndex.get(a.id)?.statsAverage ?? 0),
      ),
    [evaluated, evalIndex],
  )

  const pinnedEvaluated = useMemo(() => {
    const pinnedSet = new Set(pinnedList)
    return sortedEvaluated.filter((p) => pinnedSet.has(p.id))
  }, [sortedEvaluated, pinnedList])

  const candidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = q
      ? sortedEvaluated.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.country.toLowerCase().includes(q),
        )
      : sortedEvaluated
    return list.filter((p) => !selectedIds.includes(p.id)).slice(0, 30)
  }, [sortedEvaluated, searchQuery, selectedIds])

  // 계열 키는 id로 — 동명이인을 추가해도 서로 덮어쓰지 않도록(표시명은 Radar name에).
  const radarData = useMemo(() => {
    return PERSON_STAT_KEYS.map((key) => {
      const row: Record<string, string | number> = {
        axis: PERSON_STAT_META[key].label,
      }
      for (const id of selectedIds) {
        const stats = evalIndex.get(id)?.stats
        if (!stats) continue
        row[id] = stats[key] ?? 0
      }
      return row
    })
  }, [selectedIds, evalIndex])

  const selectedPersons = useMemo(
    () =>
      selectedIds
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is AdaptedPerson => p != null),
    [selectedIds, people],
  )

  const addPerson = (id: string) => {
    if (selectedIds.length >= 5 || selectedIds.includes(id)) return
    setSelectedIds((prev) => [...prev, id])
    setSearchQuery('')
  }

  const removePerson = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  const showDropdown =
    (inputFocused || searchQuery.trim() !== '') &&
    candidates.length > 0 &&
    selectedIds.length < 5

  return (
    <Wrap>
      <Controls>
        <SearchBox>
          <SearchInput
            type="search"
            placeholder="평가된 인물 이름·국가 검색 (클릭하여 목록 보기)…"
            value={searchQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => window.setTimeout(() => setInputFocused(false), 160)}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={selectedIds.length >= 5}
          />
          <LimitHint>{selectedIds.length} / 5명 선택</LimitHint>
          {selectedIds.length > 0 && (
            <ClearBtn type="button" onClick={() => setSelectedIds([])}>
              모두 해제
            </ClearBtn>
          )}
        </SearchBox>
        {showDropdown && (
          <CandidateList>
            {candidates.map((p) => (
              <Candidate
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addPerson(p.id)}
              >
                <strong>{p.name}</strong>
                <CandidateMeta>
                  {p.country} · 평균 {evalIndex.get(p.id)?.statsAverage ?? '—'}
                </CandidateMeta>
              </Candidate>
            ))}
          </CandidateList>
        )}
      </Controls>

      {selectedPersons.length > 0 && (
        <SelectedRow>
          {selectedPersons.map((p, i) => (
            <SelectedChip key={p.id} $color={PALETTE[i % PALETTE.length]!}>
              <SelectedDot style={{ background: PALETTE[i % PALETTE.length] }} />
              <SelectedName onClick={() => onPersonClick(p.id)}>{p.name}</SelectedName>
              <RemoveBtn type="button" onClick={() => removePerson(p.id)} aria-label={`${p.name} 비교에서 제외`}>
                ×
              </RemoveBtn>
            </SelectedChip>
          ))}
        </SelectedRow>
      )}

      {selectedPersons.length === 0 ? (
        <EmptyWrap>
          <EmptyHint>
            비교할 인물을 검색하거나 아래 추천 인물에서 바로 선택하세요. (최대 5명 동시 비교)
          </EmptyHint>
          {sortedEvaluated.length > 0 && (
            <>
              <QuickActions>
                {sortedEvaluated.length >= 2 && (
                  <QuickPresetBtn
                    type="button"
                    onClick={() =>
                      setSelectedIds(
                        sortedEvaluated.slice(0, 3).map((p) => p.id),
                      )
                    }
                  >
                    상위 평가 인물 {Math.min(3, sortedEvaluated.length)}명 바로 비교
                  </QuickPresetBtn>
                )}
                {pinnedEvaluated.length > 0 && (
                  <QuickPresetBtn
                    type="button"
                    onClick={() =>
                      setSelectedIds(
                        pinnedEvaluated.slice(0, 5).map((p) => p.id),
                      )
                    }
                  >
                    고정한 평가 인물 ({Math.min(5, pinnedEvaluated.length)}명) 비교
                  </QuickPresetBtn>
                )}
              </QuickActions>
              <QuickChipsRow>
                {sortedEvaluated.slice(0, 12).map((p) => (
                  <QuickPersonChip
                    key={p.id}
                    type="button"
                    onClick={() => addPerson(p.id)}
                  >
                    + {p.name}
                    <span>
                      {p.country} · 평균 {evalIndex.get(p.id)?.statsAverage ?? '—'}
                    </span>
                  </QuickPersonChip>
                ))}
              </QuickChipsRow>
            </>
          )}
        </EmptyWrap>
      ) : (
        <ChartShell $h={460}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="80%">
              <PolarGrid stroke="rgba(148,163,184,0.4)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: chart.axisLabel, fontWeight: 600 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${chart.border}` }} />
              {selectedPersons.map((p, i) => (
                <Radar
                  key={p.id}
                  name={p.name}
                  dataKey={p.id}
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.16}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </ChartShell>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const SearchInput = styled.input`
  flex: 1;
  max-width: 360px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 8px;
  outline: none;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    border-color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.background.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LimitHint = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const CandidateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  max-height: 240px;
  overflow-y: auto;
  max-width: 380px;
`

const Candidate = styled.button`
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: flex-start;
  padding: 6px 10px;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const CandidateMeta = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SelectedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const SelectedChip = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}14`};
`

const SelectedDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`

const SelectedName = styled.span`
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`

const RemoveBtn = styled.button`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.06);
  }
`

const ClearBtn = styled.button`
  border: none;
  background: transparent;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const QuickActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const QuickPresetBtn = styled.button`
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    opacity: 0.88;
  }
`

const QuickChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const QuickPersonChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  > span {
    font-size: 11px;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    border-color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.hover};
  }
`
