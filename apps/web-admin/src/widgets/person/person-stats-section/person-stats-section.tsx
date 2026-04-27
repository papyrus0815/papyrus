/**
 * 인물 능력치(6축 레이더) + 성격 태그 — 사용자별 평가 (읽기 전용 표시).
 *
 * 편집·삭제는 PersonStatsEditModal로 분리. 본 섹션은 다음만 담당:
 * - 평가가 없으면 컴팩트 placeholder + "평가 시작" CTA (큰 빈 차트 없음)
 * - 평가가 있으면 6축 레이더 + 가로 막대 + 성격 태그 + 메모
 * - 헤더 액션: 평가 시작 / 수정 (삭제는 모달 footer로 이동 — 위험 분리)
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { FiEdit2, FiGitMerge, FiPlus, FiTarget } from 'react-icons/fi'
import styled from 'styled-components'

import {
  type PersonStats,
  type PersonStatsBody,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
  PERSON_TRAIT_META,
  getMyStats,
  getMyTraits,
} from '@/shared/api/person-stats'
import { usePersonEvaluationIndex } from '@/shared/lib/person-evaluation-index'
import { pathKeys } from '@/shared/router'
import { usePersonInfographicFilterStore } from '@/widgets/person-infographic/model/filter.store'

import { PersonStatsEditModal } from './person-stats-edit-modal'

type Props = {
  personId: string
  personName?: string
}

export function PersonStatsSection({ personId, personName }: Props) {
  const navigate = useNavigate()
  const setStatsView = usePersonInfographicFilterStore((s) => s.setView)
  // 리스트에서 미리 캐시된 bulk 인덱스가 있으면 첫 진입이 즉시 표시됨 (캐시 히트)
  const evalIndex = usePersonEvaluationIndex()
  const indexed = evalIndex.get(personId)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['person-stats', personId],
    queryFn: () => getMyStats(personId),
    staleTime: 30_000,
    initialData: indexed?.stats ?? undefined,
  })

  const { data: traits = [], isLoading: traitsLoading } = useQuery({
    queryKey: ['person-traits', personId],
    queryFn: () => getMyTraits(personId),
    staleTime: 30_000,
    initialData: indexed && indexed.traits.length > 0 ? indexed.traits : undefined,
  })

  const [modalOpen, setModalOpen] = useState(false)

  const hasAnyStat = useMemo(() => {
    if (!stats) return false
    return PERSON_STAT_KEYS.some((k) => stats[k] != null)
  }, [stats])

  // #7: 점수가 하나라도 있거나 태그가 있으면 "평가 있음" — 라벨 분기에 일관성 부여
  const hasEvaluation = hasAnyStat || traits.length > 0

  const isLoading = statsLoading || traitsLoading

  return (
    <Root aria-label="능력치 · 성격">
      <HeaderRow>
        <SectionHeading>
          <FiTarget size={14} strokeWidth={2.2} />
          <span>능력치 · 성격</span>
          <ScopeBadge>내 평가</ScopeBadge>
        </SectionHeading>
        <HeaderActions>
          {hasEvaluation && (
            <CompareBtn
              type="button"
              onClick={() => {
                // C1: stats view의 비교 sub-tab으로 점프 + 자동 추가
                sessionStorage.setItem('person-stats:pending-compare', personId)
                setStatsView('stats')
                navigate(pathKeys.history.dashboardPersons())
              }}
              title="능력치 인포그래픽의 비교 view로 이동해 다른 인물과 비교"
            >
              <FiGitMerge size={12} /> 비교
            </CompareBtn>
          )}
          <PrimaryHeaderBtn
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={isLoading}
          >
            {hasEvaluation ? (
              <>
                <FiEdit2 size={13} /> 수정
              </>
            ) : (
              <>
                <FiPlus size={13} /> 평가 시작
              </>
            )}
          </PrimaryHeaderBtn>
        </HeaderActions>
      </HeaderRow>

      {hasEvaluation ? (
        <BodyRow>
          {hasAnyStat && (
            <ChartCol>
              <RadarChartView stats={stats} />
            </ChartCol>
          )}

          <ContentCol $fullWidth={!hasAnyStat}>
            {hasAnyStat && (
              <StatList>
                {PERSON_STAT_KEYS.map((key) => {
                  const v = stats?.[key] ?? null
                  return (
                    <StatItem key={key}>
                      <StatItemLabel>{PERSON_STAT_META[key].label}</StatItemLabel>
                      <StatItemBar>
                        <StatItemBarFill
                          style={{
                            width: `${v ?? 0}%`,
                            background: PERSON_STAT_META[key].color,
                          }}
                        />
                      </StatItemBar>
                      <StatItemValue>{v ?? '—'}</StatItemValue>
                    </StatItem>
                  )
                })}
              </StatList>
            )}

            {traits.length > 0 && (
              <TraitChipReadRow>
                {traits.map((t) => {
                  const meta = PERSON_TRAIT_META[t.trait]
                  return (
                    <TraitChip key={t.id} $tone={meta.tone}>
                      {meta.label}
                      {t.intensity != null && (
                        <TraitIntensityBadge $tone={meta.tone}>
                          {'•'.repeat(t.intensity)}
                        </TraitIntensityBadge>
                      )}
                    </TraitChip>
                  )
                })}
              </TraitChipReadRow>
            )}

            {stats?.notes && <NotesQuote>{stats.notes}</NotesQuote>}
          </ContentCol>
        </BodyRow>
      ) : (
        // #3: 빈 상태 — 큰 점선 차트 제거, 한 줄 placeholder + CTA만
        <EmptyCompact>
          <EmptyText>
            아직 이 인물에 대한 내 평가가 없습니다.
          </EmptyText>
          <EmptyCtaBtn type="button" onClick={() => setModalOpen(true)} disabled={isLoading}>
            <FiPlus size={13} /> 평가 시작
          </EmptyCtaBtn>
        </EmptyCompact>
      )}

      <PersonStatsEditModal
        open={modalOpen}
        personId={personId}
        personName={personName}
        initialStats={stats}
        initialTraits={traits}
        canDelete={!!stats || traits.length > 0}
        onClose={() => setModalOpen(false)}
      />
    </Root>
  )
}

/** 6축 레이더 차트 — recharts */
function RadarChartView({
  stats,
}: {
  stats: PersonStatsBody | PersonStats | null | undefined
}) {
  const data = PERSON_STAT_KEYS.map((key) => ({
    axis: PERSON_STAT_META[key].label,
    value: (stats as Record<string, unknown> | null | undefined)?.[key] as
      | number
      | null
      | undefined,
  })).map((d) => ({ ...d, value: d.value ?? 0 }))

  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="능력치"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.32}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

const Root = styled.section`
  margin-top: 0;
`

// #1: 다른 섹션과 동일한 헤더 양식 (14px + 아이콘)
const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const SectionHeading = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.text.primary : '#0f172a'};
  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 영향력(canonical)과 구분하기 위한 출처 표기 */
const ScopeBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.25);
`

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`

const CompareBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  &:hover {
    background: rgba(99, 102, 241, 0.06);
    color: #6366f1;
    border-color: rgba(99, 102, 241, 0.45);
  }
`

const PrimaryHeaderBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: 1px solid rgba(99, 102, 241, 0.45);
  transition: opacity 0.12s ease;
  &:hover:not(:disabled) {
    opacity: 0.92;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const BodyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 320px) 1fr;
  gap: 24px;
  align-items: start;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const ChartCol = styled.div`
  position: relative;
`

// #5: 모바일에서 차트 높이 축소
const ChartShell = styled.div`
  width: 100%;
  height: 260px;
  @media (max-width: 720px) {
    height: 220px;
  }
`

const ContentCol = styled.div<{ $fullWidth?: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${({ $fullWidth }) =>
    $fullWidth &&
    `
    grid-column: 1 / -1;
  `}
`

// #3: 컴팩트 빈 상태 — 한 줄 안내 + CTA, 큰 차트 제거
const EmptyCompact = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.025)'};
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyCtaBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: 1px solid rgba(99, 102, 241, 0.45);
  flex-shrink: 0;
  transition: opacity 0.12s ease;
  &:hover:not(:disabled) {
    opacity: 0.92;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const StatList = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StatItem = styled.div`
  display: grid;
  grid-template-columns: 64px 1fr 32px;
  align-items: center;
  gap: 10px;
`

const StatItemLabel = styled.dt`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatItemBar = styled.div`
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
`

const StatItemBarFill = styled.div`
  height: 100%;
  border-radius: 999px;
  transition: width 0.18s ease;
`

const StatItemValue = styled.dd`
  margin: 0;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TraitChipReadRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const traitToneBg = (
  tone: 'positive' | 'negative' | 'neutral',
): { fg: string; bg: string; border: string } => {
  if (tone === 'positive')
    return {
      fg: '#0e7490',
      bg: 'rgba(207, 250, 254, 0.7)',
      border: 'rgba(103, 232, 249, 0.5)',
    }
  if (tone === 'negative')
    return {
      fg: '#9f1239',
      bg: 'rgba(255, 228, 230, 0.85)',
      border: 'rgba(251, 113, 133, 0.45)',
    }
  return {
    fg: '#475569',
    bg: 'rgba(241, 245, 249, 0.85)',
    border: 'rgba(148, 163, 184, 0.4)',
  }
}

const TraitChip = styled.span<{ $tone: 'positive' | 'negative' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.01em;
  color: ${({ $tone }) => traitToneBg($tone).fg};
  background: ${({ $tone }) => traitToneBg($tone).bg};
  border: 1px solid ${({ $tone }) => traitToneBg($tone).border};
`

const TraitIntensityBadge = styled.span<{
  $tone: 'positive' | 'negative' | 'neutral'
}>`
  font-size: 10px;
  letter-spacing: 1px;
  line-height: 1;
  opacity: 0.8;
  color: ${({ $tone }) => traitToneBg($tone).fg};
`

// #6: 메모는 인용구 스타일 — 좌측 컬러바로 평가 근거임을 시각적으로 강조
const NotesQuote = styled.blockquote`
  margin: 0;
  padding: 8px 12px;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-left: 3px solid #6366f1;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)'};
  border-radius: 0 6px 6px 0;
  font-style: italic;
`
