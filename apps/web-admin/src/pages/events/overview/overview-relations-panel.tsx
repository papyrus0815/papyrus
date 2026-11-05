/**
 * 조망 › 연결 — '왜(서로 어떻게 이어지나)'. 트리 안 사건이 낀 관련 사건(event_relation)을 한곳에.
 *
 * 왜: 상세의 연관 탭은 그 사건 하나의 연결만 본다. 프랑스 혁명 루트는 자기 연결이 0이라, 하위끼리의 인과
 * (바스티유 습격 → 연맹제, 니스 병합 → 이탈리아 원정…) 9개가 루트에선 하나도 안 보였다.
 *
 * - 안쪽 연결: 둘 다 이 트리 안. 연관 탭과 같은 종류 차례·이름(EVENT_RELATION_LABELS)으로 묶는다.
 *   묶음(가지)을 건너는 연결은 '가지를 건넘' 표지 — 큰 흐름 사이의 인과라 따로 눈에 걸리게.
 * - 바깥 연결: 한쪽이 트리 밖. 이 묶음이 무엇을 낳았나/무엇에서 왔나. 누르면 그 사건 상세로.
 * - 간트 화살표는 전개 보기의 '연결 보기' 토글(GanttPanel)이 같은 데이터로 그린다.
 */
import { Suspense, lazy, useMemo, useState } from 'react'

import { FiArrowRight, FiCornerDownRight } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { type EventOverviewNode, type EventOverviewRelation } from '@/shared/api/event-overview'
import { DIRECTED_RELATION_TYPES, EVENT_RELATION_LABELS } from '@/shared/api/event-relations'
import { pathKeys } from '@/shared/router'
import { metaText } from '@/pages/events/styles/theme'

import { buildChainMindmap } from '../mindmap/chain-mindmap.lib'
import {
  RELATION_DASH,
  RELATION_TYPE_NAME,
  type RelationType,
  buildSurveyMindmap,
  defaultCollapsed,
} from '../mindmap/survey-mindmap.lib'
import { type OverviewGrouping } from './event-overview.lib'
import * as S from './overview.styles'

import { useMindmapRelationActions } from '../mindmap/use-mindmap-relation-actions'

const MindmapCanvas = lazy(() => import('../mindmap/mindmap-canvas'))

/** 보기 — 마인드맵(기본)·목록. 사람마다 고른 것을 기억(편의 상태라 브라우저 저장소) */
const VIEW_KEY = 'survey-relations-view'
function readView(): 'map' | 'list' {
  /* 휴대폰 폭은 고른 적이 없으면 목록부터 — 390px에 맞춘 마인드맵은 0.26배라 글자가 3px였다(전체 화면으로는 연다) */
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  try {
    const stored = window.localStorage.getItem(VIEW_KEY)
    if (stored === 'list' || stored === 'map') return stored
    return narrow ? 'list' : 'map'
  } catch {
    return narrow ? 'list' : 'map'
  }
}

const TYPE_ORDER: ReadonlyArray<EventOverviewRelation['type']> = [
  'LED_TO',
  'INFLUENCED',
  'RESPONSE_TO',
  'CONCURRENT',
  'RELATED',
]

interface RelationsPanelProps {
  root: EventOverviewNode
  /** 전개 순서의 하위 전부 — 마인드맵 나무 */
  ordered: ReadonlyArray<EventOverviewNode>
  dateLabelById?: Map<string, string>
  relations: ReadonlyArray<EventOverviewRelation>
  nodeById: Map<string, EventOverviewNode>
  numberById: Map<string, string>
  grouping: OverviewGrouping
  visibleIds: Set<string> | null
  hotId: string | null
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
  onShowOnGantt?: () => void
}

export function RelationsPanel({
  root,
  ordered,
  dateLabelById,
  relations,
  nodeById,
  numberById,
  grouping,
  visibleIds,
  hotId,
  onHover,
  onOpen,
  onShowOnGantt,
}: RelationsPanelProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [view, setViewState] = useState<'map' | 'list'>(readView)
  const setView = (next: 'map' | 'list') => {
    setViewState(next)
    try {
      window.localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* 저장소가 막혀도 이번 화면은 바뀐다 */
    }
  }
  /*
   * 기본 = 관련 사건 사슬(원인 → 결과) — "관련된 사건을 보는 마인드맵". 소속 나무는 '묶음 위 연결'(연결 닿은 가지만)과
   * '소속 구조'(전부)로 고른다.
   */
  const [mode, setMode] = useState<'chains' | 'links' | 'all'>('chains')
  /* '전체' 첫 화면은 국면·깊은 묶음을 접어서 — 뿌리 → 묶음 → 국면(건수)이 한눈에, 펼쳐서 파고든다 */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => defaultCollapsed(root, ordered))
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<RelationType>>(() => new Set())
  const presentTypes = TYPE_ORDER.filter((type) => relations.some((relation) => relation.type === type))
  const groupIndex = useMemo(() => new Map(grouping.groups.map((group) => [group.id, group.index])), [grouping])
  const mindmap = useMemo(
    () =>
      mode === 'chains'
        ? buildChainMindmap({
            root,
            ordered,
            relations,
            numberById,
            colorOf: (id) => {
              const groupId = grouping.groupIdOf.get(id)
              const index = groupId !== undefined ? groupIndex.get(groupId) : undefined
              return index !== undefined ? S.groupColor(index, theme.mode) : null
            },
            groupOf: (id) => grouping.groupIdOf.get(id) ?? null,
            hiddenTypes,
          })
        : buildSurveyMindmap({
        root,
        ordered,
        relations,
        numberById,
        dateLabelById,
        colorOf: (id) => {
          const groupId = grouping.groupIdOf.get(id)
          const index = groupId !== undefined ? groupIndex.get(groupId) : undefined
          return index !== undefined ? S.groupColor(index, theme.mode) : null
        },
        mode,
        collapsed,
        hiddenTypes,
        groupOf: (id) => grouping.groupIdOf.get(id) ?? null,
      }),
    [root, ordered, relations, numberById, dateLabelById, grouping, groupIndex, theme.mode, mode, collapsed, hiddenTypes],
  )
  const relationActions = useMindmapRelationActions()
  const openFromMap = (id: string) => {
    if (id.startsWith('ext:')) navigate(pathKeys.events.detail(id.slice(4)))
    else if (nodeById.has(id)) onOpen(id)
  }
  const toggleCollapsed = (id: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleType = (type: RelationType) =>
    setHiddenTypes((previous) => {
      const next = new Set(previous)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  const inside = relations.filter((relation) => !relation.external)
  const outside = relations.filter((relation) => relation.external)
  const groupTitle = (id: string) => {
    const groupId = grouping.groupIdOf.get(id)
    return groupId ? (grouping.groups.find((group) => group.id === groupId)?.title ?? null) : null
  }
  const dimmed = (relation: EventOverviewRelation) =>
    visibleIds !== null &&
    ![relation.fromId, relation.toId].some((id) => id === root.id || visibleIds.has(id))

  const endpoint = (id: string) => {
    const node = nodeById.get(id)
    if (!node) return null
    const number = id === root.id ? '★' : (numberById.get(id) ?? '')
    return (
      <Endpoint
        type="button"
        onClick={() => onOpen(id)}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        data-hot={hotId === id ? '' : undefined}
        title={node.title}
      >
        <span className="number">{number}</span>
        <span className="title">{node.title}</span>
      </Endpoint>
    )
  }

  if (relations.length === 0) {
    return (
      <S.EmptyStrip>
        <strong>하위 사건끼리 이어 둔 관련 사건이 없습니다</strong> — 하위 사건 문서의 연관 탭에서 '직접 계기·배경·대응'으로
        이으면 여기에 모이고, 전개 간트에 화살표로 그려집니다.
      </S.EmptyStrip>
    )
  }

  return (
    <S.Panel $wide id="overview-relations" aria-labelledby="overview-relations-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-relations-title">연결</S.PanelTitle>
        <S.ViewSwitch role="group" aria-label="연결 보기 방식">
          <S.ViewSwitchItem type="button" $active={view === 'map'} aria-pressed={view === 'map'} onClick={() => setView('map')}>
            마인드맵
          </S.ViewSwitchItem>
          <S.ViewSwitchItem type="button" $active={view === 'list'} aria-pressed={view === 'list'} onClick={() => setView('list')}>
            목록
          </S.ViewSwitchItem>
        </S.ViewSwitch>
        <S.PanelNote style={{ flexBasis: '100%' }}>
          하위 사건끼리 {inside.length} · 이 묶음 밖과 {outside.length} — 각 사건 문서의 연관 탭에서 이은 것을 모았습니다
          {onShowOnGantt && inside.length > 0 && (
            <>
              {' · '}
              <S.TextButton type="button" onClick={onShowOnGantt}>
                전개 간트에 화살표로 보기
              </S.TextButton>
            </>
          )}
        </S.PanelNote>
      </S.PanelHead>

      {view === 'map' && (
        <>
          <MapToolbar>
            <S.ViewSwitch role="group" aria-label="마인드맵 보기">
              <S.ViewSwitchItem type="button" $active={mode === 'chains'} aria-pressed={mode === 'chains'} onClick={() => setMode('chains')}>
                관련 사건 사슬
              </S.ViewSwitchItem>
              <S.ViewSwitchItem type="button" $active={mode === 'links'} aria-pressed={mode === 'links'} onClick={() => setMode('links')}>
                묶음 위 연결
              </S.ViewSwitchItem>
              <S.ViewSwitchItem type="button" $active={mode === 'all'} aria-pressed={mode === 'all'} onClick={() => setMode('all')}>
                소속 구조 {ordered.length}
              </S.ViewSwitchItem>
            </S.ViewSwitch>
            {mode === 'all' && (
              <S.ViewSwitch role="group" aria-label="펼침">
                <S.ViewSwitchItem
                  type="button"
                  $active={collapsed.size > 0}
                  aria-pressed={collapsed.size > 0}
                  onClick={() => setCollapsed(defaultCollapsed(root, ordered))}
                >
                  국면까지
                </S.ViewSwitchItem>
                <S.ViewSwitchItem
                  type="button"
                  $active={collapsed.size === 0}
                  aria-pressed={collapsed.size === 0}
                  onClick={() => setCollapsed(new Set())}
                >
                  모두 펼치기
                </S.ViewSwitchItem>
              </S.ViewSwitch>
            )}
            {presentTypes.length > 1 && (
              <TypeFilter role="group" aria-label="관계 종류 거르기">
                {presentTypes.map((type) => (
                  <TypeChip key={type} type="button" aria-pressed={!hiddenTypes.has(type)} onClick={() => toggleType(type)}>
                    <svg width="22" height="6" aria-hidden="true">
                      <line x1="1" y1="3" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={RELATION_DASH[type] || undefined} strokeLinecap="round" />
                    </svg>
                    {RELATION_TYPE_NAME[type]}
                  </TypeChip>
                ))}
              </TypeFilter>
            )}
            <S.PanelNote>
              {mode === 'chains'
                ? '관련 사건만 원인 → 결과 사슬로 · 색 = 묶음 · 선을 누르면 이유, 마디 끝 ●을 끌어 다른 사건에 놓으면 새 연결'
                : mode === 'links'
                  ? '연결이 닿은 사건과 그 위 묶음 · 선을 누르면 이유'
                  : '국면 ▸를 누르면 펼침 · 접은 가지로 가는 연결은 그 가지에 모여 ×N · 선을 누르면 이유'}
            </S.PanelNote>
          </MapToolbar>
          <Suspense fallback={<MapLoading>마인드맵을 싣는 중…</MapLoading>}>
            <MindmapCanvas
              data={mindmap}
              height={mode === 'all' ? 640 : mode === 'chains' ? Math.min(640, Math.max(380, 140 + mindmap.specs.size * 22)) : 520}
              hotId={hotId}
              onOpen={openFromMap}
              onToggle={toggleCollapsed}
              fullscreenTitle={`${root.title} — 연결 마인드맵`}
              onCreateRelation={relationActions.create}
              onUpdateRelation={relationActions.update}
              onDeleteRelation={relationActions.remove}
            />
          </Suspense>
        </>
      )}

      {view === 'list' && TYPE_ORDER.map((type) => {
        const list = inside.filter((relation) => relation.type === type)
        if (list.length === 0) return null
        const label = EVENT_RELATION_LABELS[type]
        return (
          <TypeBlock key={type} aria-label={label.name}>
            <TypeHead>
              <LineSample $type={type} aria-hidden />
              {label.name}
              <S.Muted> {list.length}</S.Muted>
              <TypeHint>{label.hint}</TypeHint>
            </TypeHead>
            <ul>
              {list.map((relation) => {
                const fromGroup = groupTitle(relation.fromId)
                const toGroup = groupTitle(relation.toId)
                const crosses = fromGroup !== null && toGroup !== null && fromGroup !== toGroup
                return (
                  <RelationRow key={relation.id} data-dim={dimmed(relation) ? '' : undefined}>
                    <Pair>
                      {endpoint(relation.fromId)}
                      <Arrow aria-label={DIRECTED_RELATION_TYPES.has(type) ? label.outgoing : label.name}>
                        {DIRECTED_RELATION_TYPES.has(type) ? <FiArrowRight /> : '↔'}
                      </Arrow>
                      {endpoint(relation.toId)}
                    </Pair>
                    {(crosses || relation.description) && (
                      <RowMeta>
                        {crosses && (
                          <CrossTag title="서로 다른 묶음(큰 흐름) 사이의 연결">
                            가지를 건넘 · {fromGroup} → {toGroup}
                          </CrossTag>
                        )}
                        {relation.description && <span className="why">{relation.description}</span>}
                      </RowMeta>
                    )}
                  </RelationRow>
                )
              })}
            </ul>
          </TypeBlock>
        )
      })}

      {view === 'list' && outside.length > 0 && (
        <TypeBlock aria-label="이 묶음 밖과 이어진 사건">
          <TypeHead>
            이 묶음 밖과 이어진 사건<S.Muted> {outside.length}</S.Muted>
            <TypeHint>이 사건들이 무엇에서 왔고 무엇을 낳았나</TypeHint>
          </TypeHead>
          <ul>
            {outside.map((relation) => {
              const external = relation.external!
              const insideId = external.side === 'to' ? relation.fromId : relation.toId
              const label = EVENT_RELATION_LABELS[relation.type]
              const outsideLink = (
                <ExternalLink to={pathKeys.events.detail(external.id)} title={external.title}>
                  <FiCornerDownRight aria-hidden />
                  {external.title}
                  {external.startDate && <span className="date">{external.startDate.slice(0, 4)}</span>}
                </ExternalLink>
              )
              return (
                <RelationRow key={relation.id} data-dim={dimmed(relation) ? '' : undefined}>
                  <Pair>
                    {external.side === 'from' ? outsideLink : endpoint(insideId)}
                    <Arrow aria-label={label.name}>
                      {DIRECTED_RELATION_TYPES.has(relation.type) ? <FiArrowRight /> : '↔'}
                    </Arrow>
                    {external.side === 'from' ? endpoint(insideId) : outsideLink}
                  </Pair>
                  <RowMeta>
                    <span className="kind">{label.name}</span>
                    {relation.description && <span className="why">{relation.description}</span>}
                  </RowMeta>
                </RelationRow>
              )
            })}
          </ul>
        </TypeBlock>
      )}
    </S.Panel>
  )
}

const MapToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
`

const TypeFilter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const TypeChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &[aria-pressed='false'] {
    color: ${metaText};
    text-decoration: line-through;
    opacity: 0.7;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const MapLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 520px;
  border-radius: 12px;
  font-size: 13px;
  color: ${metaText};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)')};
`

const TypeBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
`

const TypeHead = styled.h3`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TypeHint = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${metaText};
`

const LineSample = styled.span<{ $type: EventOverviewRelation['type'] }>`
  display: inline-block;
  width: 22px;
  height: 0;
  border-top: 2px ${({ $type }) => ($type === 'LED_TO' ? 'solid' : $type === 'INFLUENCED' || $type === 'RESPONSE_TO' ? 'dashed' : 'dotted')}
    ${({ theme }) => theme.colors.text.secondary};
`

const RelationRow = styled.li`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};

  &[data-dim] {
    opacity: 0.45;
  }
`

const Pair = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
`

const Endpoint = styled.button`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  padding: 1px 4px;
  border: 0;
  border-radius: 4px;
  background: none;
  font: inherit;
  font-size: 13px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover,
  &[data-hot] {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  .number {
    flex-shrink: 0;
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
`

const Arrow = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: ${metaText};

  svg {
    width: 14px;
    height: 14px;
  }
`

const RowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  padding-left: 4px;
  font-size: 12px;
  color: ${metaText};

  .kind {
    font-weight: 600;
  }
  .why {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const CrossTag = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ExternalLink = styled(Link)`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: underline;
  text-decoration-color: ${({ theme }) => theme.colors.border.default};
  text-underline-offset: 3px;

  svg {
    align-self: center;
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    color: ${metaText};
  }
  .date {
    font-size: 11.5px;
    font-weight: 400;
    color: ${metaText};
  }
`
