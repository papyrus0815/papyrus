/**
 * 지도 우측 브리핑 — 고른 나라가 있으면 그 나라의 그해 수장·교전·동맹,
 * 없으면 그해 전체 요약(교전 목록)을 보여준다.
 */
import styled from 'styled-components'

import { formatScrubberYear } from '@/shared/ui/year-scrubber'

import type {
  AtlasEdge,
  AtlasNode,
  AtlasRuler,
  RulerKind,
} from '../lib/atlas-model'
import { TITLE_RANK_META } from '../lib/title-rank'

const KIND_LABEL: Record<RulerKind, string> = {
  MONARCH: '군주',
  HEAD_OF_STATE: '국가원수',
  HEAD_OF_GOVERNMENT: '정부수반',
}

/** 비고는 장문(수백 자)이 흔하다 — 브리핑에는 첫머리만 */
const NOTE_PREVIEW_CHARS = 180

interface Props {
  year: number
  node: AtlasNode | null
  nodes: AtlasNode[]
  edges: AtlasEdge[]
  isRelationsLoading: boolean
  onSelect: (countryId: string | null) => void
  onOpenPerson: (personId: string) => void
  onOpenEvent: (eventId: string) => void
}

function periodText(ruler: AtlasRuler): string {
  const start = formatScrubberYear(ruler.startYear)
  return ruler.endYear == null
    ? `${start} ~ 재임 중`
    : `${start} ~ ${formatScrubberYear(ruler.endYear)}`
}

function notePreview(note: string): string {
  const firstParagraph = note.split(/\n\s*\n/)[0] ?? note
  return firstParagraph.length > NOTE_PREVIEW_CHARS
    ? `${firstParagraph.slice(0, NOTE_PREVIEW_CHARS)}…`
    : firstParagraph
}

export function AtlasFocusPanel({
  year,
  node,
  nodes,
  edges,
  isRelationsLoading,
  onSelect,
  onOpenPerson,
  onOpenEvent,
}: Props) {
  const nameOf = (id: string) =>
    nodes.find((entry) => entry.country.id === id)?.country.name ?? '?'

  if (!node) {
    const wars = edges.filter((edge) => edge.kind === 'war')
    const allies = edges.filter((edge) => edge.kind === 'ally')
    const rulerCount = nodes.reduce(
      (sum, entry) => sum + entry.rulers.length,
      0,
    )
    return (
      <Panel aria-label={`${formatScrubberYear(year)}년 요약`}>
        <Eyebrow>{formatScrubberYear(year)}년 한눈에</Eyebrow>
        <Stats>
          <Stat>
            <small>지도 위 나라</small>
            <strong>{nodes.length}</strong>
          </Stat>
          <Stat>
            <small>재임 중 수장</small>
            <strong>{rulerCount}</strong>
          </Stat>
          <Stat>
            <small>교전 전선</small>
            <strong style={{ color: '#ef4444' }}>{wars.length}</strong>
          </Stat>
          <Stat>
            <small>동맹</small>
            <strong style={{ color: '#3b82f6' }}>{allies.length}</strong>
          </Stat>
        </Stats>
        <SectionTitle>이 해의 교전</SectionTitle>
        {isRelationsLoading ? (
          <Muted>사건을 불러오는 중…</Muted>
        ) : wars.length === 0 ? (
          <Muted>
            이 해에 걸친 교전 기록이 없습니다. 전쟁 사건에 참여국의 <b>진영</b>
            (또는 주도국·대상국 역할)을 입력하면 지도에 전선이 그려집니다.
          </Muted>
        ) : (
          <RelationList>
            {wars.map((edge) => (
              <RelationItem key={edge.key} $tone="war">
                <CountryButton type="button" onClick={() => onSelect(edge.aId)}>
                  {nameOf(edge.aId)}
                </CountryButton>
                <span aria-hidden>⚔</span>
                <CountryButton type="button" onClick={() => onSelect(edge.bId)}>
                  {nameOf(edge.bId)}
                </CountryButton>
                {edge.eventId && (
                  <EventLink
                    type="button"
                    onClick={() => onOpenEvent(edge.eventId!)}
                  >
                    {edge.label}
                    {edge.extraCount > 0 && ` 외 ${edge.extraCount}`}
                  </EventLink>
                )}
              </RelationItem>
            ))}
          </RelationList>
        )}
        <Hint>
          핀이나 아래 표의 행을 누르면 그 나라의 수장과 교전·동맹 상대를 봅니다.
        </Hint>
      </Panel>
    )
  }

  const rankMeta = TITLE_RANK_META[node.country.rank]
  const myEdges = edges.filter(
    (edge) => edge.aId === node.country.id || edge.bId === node.country.id,
  )
  const otherId = (edge: AtlasEdge) =>
    edge.aId === node.country.id ? edge.bId : edge.aId

  return (
    <Panel aria-label={`${node.country.name} 브리핑`}>
      <HeadRow>
        <div>
          <Eyebrow>{formatScrubberYear(year)}년</Eyebrow>
          <CountryName>{node.country.name}</CountryName>
          <RankLine style={{ color: rankMeta.color }}>
            {rankMeta.glyph} {rankMeta.label}
          </RankLine>
          <Muted>
            존속{' '}
            {node.country.startYear != null
              ? formatScrubberYear(node.country.startYear)
              : '?'}{' '}
            ~{' '}
            {node.country.endYear != null
              ? formatScrubberYear(node.country.endYear)
              : ''}
          </Muted>
        </div>
        <CloseLink type="button" onClick={() => onSelect(null)}>
          전체 요약
        </CloseLink>
      </HeadRow>

      {node.rulers.length === 0 ? (
        <Muted>
          이 해의 수장 기록이 없습니다. (교전·동맹에 걸려 지도에 표시됨)
        </Muted>
      ) : (
        node.rulers.map((ruler) => (
          <RulerCard key={ruler.id} style={{ borderLeftColor: rankMeta.color }}>
            <KindTag style={{ background: rankMeta.color }}>
              {/* 군주는 나라의 칭호 등급(황제·국왕…), 수반은 실제 직함 */}
              {ruler.kind === 'MONARCH'
                ? `${rankMeta.glyph} ${rankMeta.shortLabel}`
                : (ruler.title ?? KIND_LABEL[ruler.kind])}
            </KindTag>
            <RulerName
              type="button"
              onClick={() => onOpenPerson(ruler.personId)}
            >
              {ruler.name}
            </RulerName>
            <Stats>
              <Stat>
                <small>이 해 기준</small>
                <strong>즉위 {year - ruler.startYear + 1}년차</strong>
              </Stat>
              <Stat>
                <small>재위·재임</small>
                <strong>{periodText(ruler)}</strong>
              </Stat>
            </Stats>
            {ruler.notes && <Note>{notePreview(ruler.notes)}</Note>}
          </RulerCard>
        ))
      )}

      <SectionTitle>교전 · 동맹</SectionTitle>
      {isRelationsLoading ? (
        <Muted>사건을 불러오는 중…</Muted>
      ) : myEdges.length === 0 ? (
        <Muted>이 해에 기록된 대외 교전·동맹이 없습니다.</Muted>
      ) : (
        <RelationList>
          {myEdges.map((edge) => (
            <RelationItem key={edge.key} $tone={edge.kind}>
              <span aria-hidden>{edge.kind === 'war' ? '⚔' : '🤝'}</span>
              <CountryButton
                type="button"
                onClick={() => onSelect(otherId(edge))}
              >
                {nameOf(otherId(edge))}
              </CountryButton>
              {edge.eventId ? (
                <EventLink
                  type="button"
                  onClick={() => onOpenEvent(edge.eventId!)}
                >
                  {edge.label}
                </EventLink>
              ) : (
                <EventText>{edge.label}</EventText>
              )}
            </RelationItem>
          ))}
        </RelationList>
      )}
    </Panel>
  )
}

const Panel = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const HeadRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
`

const CountryName = styled.h2`
  margin: 2px 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RankLine = styled.div`
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 700;
`

const CloseLink = styled.button`
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
`

const Stat = styled.div`
  padding: 7px 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
  small {
    display: block;
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    font-size: 14px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    font-variant-numeric: tabular-nums;
  }
`

const RulerCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-left: 3px solid;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const KindTag = styled.span`
  align-self: flex-start;
  padding: 1px 7px;
  border-radius: 5px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
`

const RulerName = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  font-size: 17px;
  font-weight: 800;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const Note = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SectionTitle = styled.h3`
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelationList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const RelationItem = styled.li<{ $tone: 'war' | 'ally' }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  padding: 6px 9px;
  border-radius: 7px;
  font-size: 12px;
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'war' ? 'rgba(239,68,68,0.45)' : 'rgba(59,130,246,0.4)'};
  background: ${({ $tone }) =>
    $tone === 'war' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.07)'};
`

const CountryButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`

const EventLink = styled.button`
  flex-basis: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const EventText = styled.span`
  flex-basis: 100%;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Muted = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Hint = styled(Muted)`
  margin-top: auto;
  padding-top: 8px;
  font-size: 11px;
`
