/**
 * 수장 지도 아틀라스 — 한 해를 골라 "누가 어디를 다스렸고, 누가 누구와 싸우고 손잡았나"를 지도로.
 *
 * 연표(역대 수장 비교)가 시간축을 가로로 늘어놓는다면, 이 지면은 시간을 한 점에 세우고
 * 공간을 편다. 두 지면은 `?year=`를 공유해 서로 오간다.
 *
 * URL: `?year=1756&sel=<역사국가 id>` — 연도·선택 나라가 공유 링크에 실린다.
 */
import { useCallback, useMemo, useState } from 'react'

import { FiAlertCircle, FiBarChart2, FiHelpCircle } from 'react-icons/fi'
import { useNavigate, useSearchParams } from 'react-router'
import styled, { css, useTheme } from 'styled-components'

import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import {
  YearScrubber,
  type YearScrubberMilestone,
} from '@/shared/ui/year-scrubber'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { PersonDetailModal } from '@/widgets/person/person-detail-panel/person-detail-modal'

import { useAtlasSources } from '../api/use-atlas-sources'
import {
  type AuditTarget,
  auditAtlasData,
  coverageByCentury,
} from '../lib/atlas-audit'
import {
  type RulerKind,
  buildEdges,
  buildNodes,
  busiestYear,
  isFrontLineEvent,
  normalizeCountries,
  normalizeRulers,
  pickEraHeadline,
} from '../lib/atlas-model'
import {
  TITLE_RANK_META,
  TITLE_RANK_ORDER,
  type TitleRank,
} from '../lib/title-rank'
import { AtlasAuditModal } from './atlas-audit-modal'
import { AtlasFocusPanel } from './atlas-focus-panel'
import { AtlasGuideModal } from './atlas-guide-modal'
import { AtlasMap } from './atlas-map'
import { AtlasTable } from './atlas-table'
import { EraHeadline } from './era-headline'

const NOW_YEAR = new Date().getFullYear()
const FALLBACK_YEAR = 1756
/** 분수령 칩 상한 — 칩 줄은 가로 스크롤 한 줄이라 이 정도면 충분하다 */
const MAX_MILESTONES = 80

const KIND_FILTERS: Array<{ kind: RulerKind; label: string }> = [
  { kind: 'MONARCH', label: '군주' },
  { kind: 'HEAD_OF_STATE', label: '국가원수' },
  { kind: 'HEAD_OF_GOVERNMENT', label: '정부수반' },
]

function parseYearParam(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const year = Number(raw)
  return Number.isInteger(year) ? year : null
}

export function ReignAtlas() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme?.mode === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const sources = useAtlasSources()

  const [enabledKinds, setEnabledKinds] = useState<Set<RulerKind>>(
    () => new Set(['MONARCH', 'HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT']),
  )
  const [warOnly, setWarOnly] = useState(false)
  /** 칭호 필터 — null = 전체. 지도는 흐리게, 표는 행을 거른다 */
  const [rankFilter, setRankFilter] = useState<TitleRank | null>(null)
  const [personId, setPersonId] = useState<string | null>(null)
  // `?check=1`로 들어오면 점검 창을 연 채로 시작 (점검 링크 공유용)
  const [guideOpen, setGuideOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(
    () => searchParams.get('check') === '1',
  )
  const [eventId, setEventId] = useState<string | null>(null)

  const countries = useMemo(
    () => normalizeCountries(sources.countries),
    [sources.countries],
  )
  const allRulers = useMemo(
    () => [
      ...normalizeRulers(sources.reigns, true),
      ...normalizeRulers(sources.heads, false),
    ],
    [sources.reigns, sources.heads],
  )
  const rulers = useMemo(
    () => allRulers.filter((entry) => enabledKinds.has(entry.ruler.kind)),
    [allRulers, enabledKinds],
  )

  const bounds = useMemo(() => {
    const starts = allRulers.map((entry) => entry.ruler.startYear)
    const min = starts.length > 0 ? Math.min(...starts) : 1500
    return { min, max: NOW_YEAR }
  }, [allRulers])

  const urlYear = parseYearParam(searchParams.get('year'))
  const defaultYear = useMemo(
    () => busiestYear(allRulers, bounds.min, bounds.max) ?? FALLBACK_YEAR,
    [allRulers, bounds],
  )
  const year = Math.min(
    bounds.max,
    Math.max(bounds.min, urlYear ?? defaultYear),
  )
  const selectedId = searchParams.get('sel')

  const updateParams = useCallback(
    (patch: { year?: number; sel?: string | null }) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (patch.year !== undefined) next.set('year', String(patch.year))
          if (patch.sel !== undefined) {
            if (patch.sel) next.set('sel', patch.sel)
            else next.delete('sel')
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )
  const setYear = useCallback(
    (next: number) => updateParams({ year: next }),
    [updateParams],
  )
  const setSelected = useCallback(
    (next: string | null) => updateParams({ sel: next }),
    [updateParams],
  )

  // 수장이 있는 나라를 먼저 정하고(현대국가 FK 관계선의 착지 우선순위), 관계선에 걸린 나라를 더한다
  const edges = useMemo(() => {
    const rulerHolderIds = new Set(
      buildNodes(countries, rulers, year).map((node) => node.country.id),
    )
    return buildEdges(
      sources.events,
      sources.treaties,
      countries,
      year,
      rulerHolderIds,
    )
  }, [sources.events, sources.treaties, countries, rulers, year])
  const nodes = useMemo(() => {
    const edgeIds = new Set(edges.flatMap((edge) => [edge.aId, edge.bId]))
    return buildNodes(countries, rulers, year, edgeIds)
  }, [countries, rulers, year, edges])

  // 선택된 나라가 그해 지도에 없으면(멸망·수장 없음) 선택은 URL에 두되 강조하지 않는다
  const activeSelectedId =
    selectedId && nodes.some((node) => node.country.id === selectedId)
      ? selectedId
      : null
  const selectedNode =
    nodes.find((node) => node.country.id === activeSelectedId) ?? null

  const { warPeers, allyPeers } = useMemo(() => {
    const wars = new Set<string>()
    const allies = new Set<string>()
    if (activeSelectedId) {
      for (const edge of edges) {
        if (edge.aId !== activeSelectedId && edge.bId !== activeSelectedId)
          continue
        const other = edge.aId === activeSelectedId ? edge.bId : edge.aId
        ;(edge.kind === 'war' ? wars : allies).add(other)
      }
    }
    return { warPeers: wars, allyPeers: allies }
  }, [edges, activeSelectedId])

  /** 분수령 칩 = 지도에 전선을 그리는 최상위 사건의 시작 연도 */
  const milestones = useMemo<YearScrubberMilestone[]>(() => {
    const picked: YearScrubberMilestone[] = []
    for (const event of sources.events) {
      if ((event as { parentEventId?: string | null }).parentEventId) continue
      if (!isFrontLineEvent(event)) continue
      const parts = parseIsoDateParts(event.startDate)
      if (!parts) continue
      picked.push({ id: event.id, year: parts.year, label: event.title })
    }
    picked.sort((left, right) => left.year - right.year)
    return picked.slice(0, MAX_MILESTONES)
  }, [sources.events])

  const headline = useMemo(
    () => pickEraHeadline(sources.events, year),
    [sources.events, year],
  )
  const warCount = edges.filter((edge) => edge.kind === 'war').length
  const allyCount = edges.length - warCount

  const rankCounts = useMemo(() => {
    const counts = new Map<TitleRank, number>()
    for (const node of nodes)
      counts.set(node.country.rank, (counts.get(node.country.rank) ?? 0) + 1)
    return counts
  }, [nodes])

  // 점검은 수장 종류 필터와 무관하게 전체 기록 기준
  const audit = useMemo(
    () =>
      auditAtlasData({
        countryInputs: sources.countries,
        countries,
        rulers: allRulers,
        events: sources.events,
        treaties: sources.treaties,
      }),
    [sources.countries, countries, allRulers, sources.events, sources.treaties],
  )
  // 해마다 관계선을 다시 계산하므로 창을 열 때만
  const coverage = useMemo(
    () =>
      auditOpen
        ? coverageByCentury({
            rulers: allRulers,
            events: sources.events,
            treaties: sources.treaties,
            countries,
            minYear: bounds.min,
            maxYear: bounds.max,
          })
        : [],
    [auditOpen, allRulers, sources.events, sources.treaties, countries, bounds],
  )

  const openAuditTarget = (target: AuditTarget) => {
    if (target.kind === 'person') {
      // 인물은 지면을 떠나지 않고 창으로 — 점검 창은 닫아 겹침을 피한다
      setAuditOpen(false)
      setPersonId(target.id)
      return
    }
    if (target.kind === 'event') navigate(pathKeys.events.detail(target.id))
    else if (target.kind === 'country')
      navigate(pathKeys.countryDetail(target.id))
    else navigate(pathKeys.treaties.detail(target.id))
  }

  const toggleKind = (kind: RulerKind) => {
    setEnabledKinds((previous) => {
      const next = new Set(previous)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  const countriesWithoutCoords = sources.countries.length - countries.length

  return (
    <Wrapper>
      <Header>
        <div>
          <Title>수장 지도</Title>
          <Subtitle>
            한 해를 골라 그해 각국의 군주·수반을 지도 위에 놓고, 사건 진영·동맹
            조약에서 교전(붉은 선)과 동맹(푸른 선)을 읽어 옵니다.
          </Subtitle>
        </div>
        <HeaderActions>
          <KindFilters role="group" aria-label="수장 종류">
            {KIND_FILTERS.map(({ kind, label }) => (
              <KindChip
                key={kind}
                type="button"
                $active={enabledKinds.has(kind)}
                aria-pressed={enabledKinds.has(kind)}
                onClick={() => toggleKind(kind)}
              >
                {label}
              </KindChip>
            ))}
          </KindFilters>
          <HelpBadge
            type="button"
            onClick={() => setGuideOpen(true)}
            aria-label="수장 지도 안내"
            title="이 지도는 어떻게 그려지나요?"
          >
            <FiHelpCircle size={16} />
          </HelpBadge>
          <AuditButton
            type="button"
            onClick={() => setAuditOpen(true)}
            disabled={sources.isBaseLoading}
            title="지도에 안 나오는 원인 모아 보기"
          >
            <FiAlertCircle size={13} />
            데이터 점검
            {!sources.isBaseLoading &&
              !sources.isRelationsLoading &&
              audit.total > 0 && <AuditBadge>{audit.total}</AuditBadge>}
          </AuditButton>
          <TimelineLink
            type="button"
            onClick={() => navigate(pathKeys.headsOfState(year))}
          >
            <FiBarChart2 size={13} />
            연표로 보기
          </TimelineLink>
        </HeaderActions>
      </Header>

      <YearScrubber
        value={year}
        min={bounds.min}
        max={bounds.max}
        onChange={setYear}
        milestones={milestones}
        trailing={
          <Summary>
            나라 <strong>{nodes.length}</strong> · 교전{' '}
            <strong style={{ color: '#ef4444' }}>{warCount}</strong> · 동맹{' '}
            <strong style={{ color: '#3b82f6' }}>{allyCount}</strong>
          </Summary>
        }
      />

      {sources.error ? (
        <StateBox role="alert">
          지도 데이터를 불러오지 못했습니다: {String(sources.error)}
        </StateBox>
      ) : sources.isBaseLoading ? (
        <StateBox>지도 데이터를 불러오는 중…</StateBox>
      ) : (
        <>
          <RankTabs role="radiogroup" aria-label="칭호 등급">
            <RankLabel>칭호</RankLabel>
            <RankTab
              type="button"
              role="radio"
              aria-checked={rankFilter == null}
              $active={rankFilter == null}
              onClick={() => setRankFilter(null)}
            >
              전체 <b>{nodes.length}</b>
            </RankTab>
            {TITLE_RANK_ORDER.map((rank) => {
              const count = rankCounts.get(rank) ?? 0
              const meta = TITLE_RANK_META[rank]
              return (
                <RankTab
                  key={rank}
                  type="button"
                  role="radio"
                  aria-checked={rankFilter === rank}
                  $active={rankFilter === rank}
                  $empty={count === 0}
                  onClick={() =>
                    setRankFilter(rankFilter === rank ? null : rank)
                  }
                  title={meta.label}
                >
                  <i style={{ background: meta.color }} aria-hidden />
                  {meta.glyph} {meta.label} <b>{count}</b>
                </RankTab>
              )
            })}
          </RankTabs>

          <Stage>
            <MapSlot>
              <AtlasMap
                year={year}
                nodes={nodes}
                edges={edges}
                selectedId={activeSelectedId}
                warPeers={warPeers}
                allyPeers={allyPeers}
                rankFilter={rankFilter}
                isDark={isDark}
                onSelect={setSelected}
                onOpenEvent={setEventId}
              />
              <EraHeadline
                year={year}
                headline={headline}
                warCount={warCount}
                allyCount={allyCount}
                isLoading={sources.isRelationsLoading}
                onOpenEvent={setEventId}
              />
            </MapSlot>
            <AtlasFocusPanel
              year={year}
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              isRelationsLoading={sources.isRelationsLoading}
              onSelect={setSelected}
              onOpenPerson={setPersonId}
              onOpenEvent={setEventId}
            />
          </Stage>

          <AtlasTable
            year={year}
            nodes={nodes}
            edges={edges}
            selectedId={activeSelectedId}
            warPeers={warPeers}
            allyPeers={allyPeers}
            rankFilter={rankFilter}
            warOnly={warOnly}
            onToggleWarOnly={() => setWarOnly((value) => !value)}
            onSelect={setSelected}
          />

          {countriesWithoutCoords > 0 && (
            <Footnote>
              좌표가 없는 역사국가 {countriesWithoutCoords}곳은 지도에 올리지
              못했습니다. 현대국가로만 연결된 기록은 그해 존속하던 연결
              역사국가의 핀에 얹었습니다.
            </Footnote>
          )}
        </>
      )}

      {/* 데이터가 다 온 뒤에 연다 — 처음 탭(문제 있는 갈래)을 빈 점검으로 고르지 않게 */}
      <AtlasGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenAudit={() => setAuditOpen(true)}
      />
      {auditOpen && !sources.isBaseLoading && !sources.isRelationsLoading && (
        <AtlasAuditModal
          isOpen
          onClose={() => setAuditOpen(false)}
          audit={audit}
          coverage={coverage}
          onOpenTarget={openAuditTarget}
          onJumpYear={(target) => {
            setAuditOpen(false)
            setYear(target)
          }}
        />
      )}
      <PersonDetailModal
        personId={personId}
        onClose={() => setPersonId(null)}
      />
      <EventInlineModal
        eventId={eventId}
        onClose={() => setEventId(null)}
        onNavigate={(id) => navigate(pathKeys.events.detail(id))}
      />
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 32px 32px;
  background: ${({ theme }) => theme.colors.background.primary};
  font-variant-numeric: tabular-nums;
  @media (max-width: 760px) {
    padding: 14px 16px 24px;
  }
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Subtitle = styled.p`
  margin: 4px 0 0;
  max-width: 68ch;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const KindFilters = styled.div`
  display: inline-flex;
  gap: 4px;
`

const KindChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  ${({ $active, theme }) =>
    $active &&
    css`
      border-color: ${theme.colors.border.medium};
      color: ${theme.colors.text.primary};
    `}
`

const TimelineLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const HelpBadge = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const AuditButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const AuditBadge = styled.span`
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
`

const Summary = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  strong {
    font-weight: 800;
  }
`

const Stage = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 14px;
  height: 540px;
  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }
`

const RankTabs = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const RankLabel = styled.span`
  margin-right: 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RankTab = styled.button<{ $active: boolean; $empty?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${({ $empty }) => ($empty ? 0.45 : 1)};
  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  b {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  ${({ $active, theme }) =>
    $active &&
    css`
      border-color: ${theme.colors.text.primary};
      background: ${theme.colors.text.primary};
      color: ${theme.colors.background.primary};
      opacity: 1;
    `}
`

const MapSlot = styled.div`
  position: relative;
  min-height: 0;
  @media (max-width: 1180px) {
    height: 460px;
  }
`

const StateBox = styled.div`
  padding: 48px 16px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  border-radius: 12px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Footnote = styled.p`
  margin: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
