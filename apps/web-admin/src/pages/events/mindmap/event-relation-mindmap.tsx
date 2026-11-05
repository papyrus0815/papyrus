/**
 * 상세 › 연관의 '연결 지도'.
 *
 * - 묶음 사건(최상위 포함): 그 사건 아래 **전체** 나무(묶음 → 국면 → 사건) + 하위끼리·바깥과의 연결 전부 — 상위에서는
 *   모든 마인드맵이 한 그림에 보여야 한다(사용자 지시). 데이터는 조망 응답을 그대로(같은 캐시).
 * - 단일 사건: 그 사건을 가운데 두고 상위·하위·관련(1~2단). 묶음 밖 인과 사슬(NSPM-2 → 5건)은 여기서 걷는다.
 * 마디를 누르면 그 사건 상세로(가서 다시 펼친다).
 */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { getEventOverview, getEventRelationGraph } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import { pathKeys } from '@/shared/router'
import { metaText } from '@/pages/events/styles/theme'

import { buildGantt, collectionGroups, orderedDescendants, outlineNumbers } from '../overview/event-overview.lib'
import { groupColor } from '../overview/overview.styles'
import { buildEgoMindmap } from './ego-mindmap.lib'
import { type RelationType, buildSurveyMindmap, defaultCollapsed } from './survey-mindmap.lib'
import { useMindmapRelationActions } from './use-mindmap-relation-actions'

const MindmapCanvas = lazy(() => import('./mindmap-canvas'))

export function EventRelationMindmap({ eventId, isCollection = false }: { eventId: string; isCollection?: boolean }) {
  return isCollection ? <CollectionMindmap eventId={eventId} /> : <EgoMindmap eventId={eventId} />
}

/** 묶음 — 아래 전체 나무 + 모든 연결(조망 응답) */
function CollectionMindmap({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const [mode, setMode] = useState<'links' | 'all'>('all')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const [hiddenTypes] = useState<ReadonlySet<RelationType>>(() => new Set())
  const { data, isLoading, isError } = useQuery({
    queryKey: eventKeys.overview(eventId),
    queryFn: () => getEventOverview(eventId),
    staleTime: 30_000,
  })
  const relationActions = useMindmapRelationActions()
  /* 처음 받은 때 한 번 — 국면·깊은 묶음을 접은 채로 시작(펼친 상태는 그 뒤로 사람이 정한다) */
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (!data || seeded) return
    setCollapsed(defaultCollapsed(data.root, data.descendants))
    setSeeded(true)
  }, [data, seeded])
  const prepared = useMemo(() => {
    if (!data) return null
    const gantt = buildGantt(data.root, data.descendants, 'children')
    const ordered = orderedDescendants(gantt)
    return {
      ordered,
      numberById: outlineNumbers(ordered, data.root.id),
      grouping: collectionGroups(ordered, gantt),
      dateLabelById: new Map(gantt.rows.map((row) => [row.node.id, row.dateLabel])),
    }
  }, [data])
  const mindmap = useMemo(() => {
    if (!data || !prepared) return null
    const groupIndex = new Map(prepared.grouping.groups.map((group) => [group.id, group.index]))
    return buildSurveyMindmap({
      root: data.root,
      ordered: prepared.ordered,
      relations: data.relations ?? [],
      numberById: prepared.numberById,
      dateLabelById: prepared.dateLabelById,
      colorOf: (id) => {
        const groupId = prepared.grouping.groupIdOf.get(id)
        const index = groupId !== undefined ? groupIndex.get(groupId) : undefined
        return index !== undefined ? groupColor(index, theme.mode) : null
      },
      groupOf: (id) => prepared.grouping.groupIdOf.get(id) ?? null,
      mode,
      collapsed,
      hiddenTypes,
    })
  }, [data, prepared, theme.mode, mode, collapsed, hiddenTypes])

  if (isLoading) return <Loading>연결 지도를 모으는 중…</Loading>
  if (isError || !data || !mindmap || !prepared) return <Note>연결 지도를 불러오지 못했습니다.</Note>
  const relationCount = data.relations?.length ?? 0

  return (
    <Wrap>
      <Toolbar>
        <Switch role="group" aria-label="마디 범위">
          <button type="button" aria-pressed={mode === 'all'} onClick={() => setMode('all')}>
            전체 {prepared.ordered.length}
          </button>
          <button type="button" aria-pressed={mode === 'links'} onClick={() => setMode('links')} disabled={relationCount === 0}>
            연결만
          </button>
        </Switch>
        {mode === 'all' && (
          <Switch role="group" aria-label="펼침">
            <button type="button" aria-pressed={collapsed.size > 0} onClick={() => setCollapsed(defaultCollapsed(data.root, data.descendants))}>
              국면까지
            </button>
            <button type="button" aria-pressed={collapsed.size === 0} onClick={() => setCollapsed(new Set())}>
              모두 펼치기
            </button>
          </Switch>
        )}
        <Note as="span">
          아래 사건 전부와 연결 {relationCount}개 · 국면 ▸를 누르면 펼침 · 선을 누르면 이유 · 마디 끝 ●을 끌어 놓으면 새 연결
        </Note>
      </Toolbar>
      <Suspense fallback={<Loading>지도를 싣는 중…</Loading>}>
        <MindmapCanvas
          data={mindmap}
          height={mode === 'all' ? 600 : 520}
          onOpen={(id) => navigate(pathKeys.events.detail(id.startsWith('ext:') ? id.slice(4) : id))}
          onToggle={(id) =>
            setCollapsed((previous) => {
              const next = new Set(previous)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }
          fullscreenTitle={`${data.root.title} — 연결 지도`}
          onCreateRelation={relationActions.create}
          onUpdateRelation={relationActions.update}
          onDeleteRelation={relationActions.remove}
        />
      </Suspense>
    </Wrap>
  )
}

/** 단일 사건 — 가운데 두고 상위·하위·관련 1~2단 */
function EgoMindmap({ eventId }: { eventId: string }) {
  const navigate = useNavigate()
  const [hops, setHops] = useState<1 | 2>(2)
  const { data, isLoading, isError } = useQuery({
    queryKey: eventKeys.relationGraph(eventId),
    queryFn: () => getEventRelationGraph(eventId, 2),
    staleTime: 30_000,
  })
  const mindmap = useMemo(() => (data ? buildEgoMindmap(data, hops) : null), [data, hops])
  const relationActions = useMindmapRelationActions()
  const relationCount = data?.relations.length ?? 0
  const farCount = data?.nodes.filter((node) => node.hop === 2).length ?? 0

  if (isLoading) return <Loading>연결 지도를 모으는 중…</Loading>
  if (isError || !data || !mindmap) return <Note>연결 지도를 불러오지 못했습니다.</Note>
  if (data.nodes.length <= 1) {
    return <Note>아직 이 사건과 이어진 상위·하위·관련 사건이 없습니다 — 아래에서 이으면 여기에 지도로 그려집니다.</Note>
  }

  return (
    <Wrap>
      <Toolbar>
        <Switch role="group" aria-label="관련 사건 몇 단까지">
          <button type="button" aria-pressed={hops === 1} onClick={() => setHops(1)}>
            바로 이어진 것
          </button>
          <button type="button" aria-pressed={hops === 2} onClick={() => setHops(2)} disabled={farCount === 0}>
            관련의 관련까지{farCount > 0 ? ` +${farCount}` : ''}
          </button>
        </Switch>
        <Note as="span">
          왼쪽 = 상위·원인, 오른쪽 = 하위·결과 · 관계 {relationCount}개 · 선을 누르면 이유 · 마디 끝 ●을 끌어 놓으면 새 연결
          {data.truncated && ' · 마디가 많아 일부만'}
        </Note>
      </Toolbar>
      <Suspense fallback={<Loading>지도를 싣는 중…</Loading>}>
        <MindmapCanvas
          data={mindmap}
          height={Math.min(560, Math.max(320, 120 + mindmap.specs.size * 22))}
          onOpen={(id) => navigate(pathKeys.events.detail(id))}
          fullscreenTitle={`${data.nodes.find((node) => node.id === data.centerId)?.title ?? ''} — 연결 지도`}
          onCreateRelation={relationActions.create}
          onUpdateRelation={relationActions.update}
          onDeleteRelation={relationActions.remove}
        />
      </Suspense>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
`

const Switch = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};

  button {
    padding: 4px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    font: inherit;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;

    &[aria-pressed='true'] {
      font-weight: 700;
      color: ${({ theme }) => theme.colors.text.primary};
      background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#ffffff')};
    }
    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.colors.primary};
    }
  }
`

const Note = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${metaText};
`

const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  border-radius: 12px;
  font-size: 13px;
  color: ${metaText};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)')};
`
