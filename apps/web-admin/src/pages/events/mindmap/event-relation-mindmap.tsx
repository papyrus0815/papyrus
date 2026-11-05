/**
 * 상세 › 연관의 '연결 지도' — 이 사건을 가운데 두고 상위·하위·관련(1~2단)을 마인드맵으로.
 *
 * 묶음 밖 사건의 인과 사슬(NSPM-2 → 5건, 랑고바르드 섬 9개)은 조망 마인드맵(최상위 아래만)에는 안 들어온다 —
 * 여기서는 사건 하나에서 출발해 관련의 관련까지 걸어 나간다. 마디를 누르면 그 사건 상세로(가서 다시 펼친다).
 */
import { Suspense, lazy, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { getEventRelationGraph } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import { pathKeys } from '@/shared/router'
import { metaText } from '@/pages/events/styles/theme'

import { buildEgoMindmap } from './ego-mindmap.lib'
import { useMindmapRelationActions } from './use-mindmap-relation-actions'

const MindmapCanvas = lazy(() => import('./mindmap-canvas'))

export function EventRelationMindmap({ eventId }: { eventId: string }) {
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
