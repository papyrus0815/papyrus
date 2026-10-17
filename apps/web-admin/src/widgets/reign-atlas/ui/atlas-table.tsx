/**
 * 지도 아래 동시 통치 비교표 — 지도와 양방향 연동.
 * 행을 고르면 지도 핀이 선택되고, 선택된 나라의 교전 상대 행은 붉게·동맹 행은 푸르게 물든다.
 */
import { useMemo, useState } from 'react'

import styled, { css } from 'styled-components'

import { formatScrubberYear } from '@/shared/ui/year-scrubber'

import type { AtlasEdge, AtlasNode } from '../lib/atlas-model'
import { TITLE_RANK_META, type TitleRank } from '../lib/title-rank'

type SortMode = 'name' | 'tenure' | 'war'

interface Props {
  year: number
  nodes: AtlasNode[]
  edges: AtlasEdge[]
  selectedId: string | null
  warPeers: ReadonlySet<string>
  allyPeers: ReadonlySet<string>
  /** 칭호 필터 — 표는 맞지 않는 행을 거른다 */
  rankFilter: TitleRank | null
  warOnly: boolean
  onToggleWarOnly: () => void
  onSelect: (countryId: string | null) => void
}

export function AtlasTable({
  year,
  nodes,
  edges,
  selectedId,
  warPeers,
  allyPeers,
  rankFilter,
  warOnly,
  onToggleWarOnly,
  onSelect,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('war')

  const relationsById = useMemo(() => {
    const map = new Map<string, { wars: string[]; allies: string[] }>()
    const nameById = new Map(
      nodes.map((node) => [node.country.id, node.country.name]),
    )
    const entry = (id: string) => {
      const existing = map.get(id)
      if (existing) return existing
      const created = { wars: [] as string[], allies: [] as string[] }
      map.set(id, created)
      return created
    }
    for (const edge of edges) {
      const aName = nameById.get(edge.aId) ?? '?'
      const bName = nameById.get(edge.bId) ?? '?'
      const bucket = edge.kind === 'war' ? 'wars' : 'allies'
      entry(edge.aId)[bucket].push(bName)
      entry(edge.bId)[bucket].push(aName)
    }
    return map
  }, [nodes, edges])

  const rows = useMemo(() => {
    const filtered = nodes.filter(
      (node) =>
        (!rankFilter || node.country.rank === rankFilter) &&
        (!warOnly ||
          (relationsById.get(node.country.id)?.wars.length ?? 0) > 0),
    )
    const tenureOf = (node: AtlasNode) =>
      node.rulers[0] ? year - node.rulers[0].startYear + 1 : -1
    filtered.sort((left, right) => {
      if (sortMode === 'tenure') return tenureOf(right) - tenureOf(left)
      if (sortMode === 'war') {
        const warDiff =
          (relationsById.get(right.country.id)?.wars.length ?? 0) -
          (relationsById.get(left.country.id)?.wars.length ?? 0)
        if (warDiff !== 0) return warDiff
      }
      return left.country.name.localeCompare(right.country.name, 'ko')
    })
    return filtered
  }, [nodes, relationsById, rankFilter, warOnly, sortMode, year])

  return (
    <Wrap aria-label={`${formatScrubberYear(year)}년 동시 통치 비교표`}>
      <Toolbar>
        <Title>
          <YearMark>{formatScrubberYear(year)}</YearMark>년 동시 통치 비교표
          <Count>{rows.length}개국</Count>
        </Title>
        <Controls>
          <Chip
            type="button"
            $active={warOnly}
            $tone="war"
            aria-pressed={warOnly}
            onClick={onToggleWarOnly}
          >
            교전 중인 나라만
          </Chip>
          <Divider aria-hidden />
          {(
            [
              ['war', '교전 많은 순'],
              ['tenure', '재위 연차 순'],
              ['name', '가나다순'],
            ] as const
          ).map(([mode, label]) => (
            <Chip
              key={mode}
              type="button"
              $active={sortMode === mode}
              aria-pressed={sortMode === mode}
              onClick={() => setSortMode(mode)}
            >
              {label}
            </Chip>
          ))}
        </Controls>
      </Toolbar>
      <Scroll>
        {rows.length === 0 ? (
          <Empty>
            {warOnly
              ? '이 해에 교전 중인 나라가 없습니다.'
              : rankFilter
                ? `이 해에 ${TITLE_RANK_META[rankFilter].label} 칭호의 나라가 없습니다.`
                : '이 해에 표시할 나라가 없습니다.'}
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th scope="col">칭호</th>
                <th scope="col">나라</th>
                <th scope="col">수장</th>
                <th scope="col">재위·재임</th>
                <th scope="col">이 해 기준</th>
                <th scope="col">교전 · 동맹 상대</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((node) => {
                const id = node.country.id
                const relations = relationsById.get(id)
                const ruler = node.rulers[0]
                let tone: 'selected' | 'war' | 'ally' | null = null
                if (selectedId === id) tone = 'selected'
                else if (warPeers.has(id)) tone = 'war'
                else if (allyPeers.has(id)) tone = 'ally'
                return (
                  <BodyRow
                    key={id}
                    $tone={tone}
                    $dimmed={!!selectedId && tone == null}
                    tabIndex={0}
                    aria-selected={selectedId === id}
                    onClick={() => onSelect(selectedId === id ? null : id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(selectedId === id ? null : id)
                      }
                    }}
                  >
                    <td>
                      <RankPill
                        style={{
                          background: TITLE_RANK_META[node.country.rank].color,
                        }}
                      >
                        {TITLE_RANK_META[node.country.rank].glyph}{' '}
                        {TITLE_RANK_META[node.country.rank].shortLabel}
                      </RankPill>
                    </td>
                    <td>
                      <CountryName>{node.country.name}</CountryName>
                    </td>
                    <td>
                      {ruler ? (
                        <RulerCell>
                          <strong>{ruler.name}</strong>
                          {ruler.title && <Sub>{ruler.title}</Sub>}
                          {year === ruler.startYear && (
                            <NewBadge>즉위</NewBadge>
                          )}
                          {node.rulers.length > 1 && (
                            <Sub>외 {node.rulers.length - 1}명</Sub>
                          )}
                        </RulerCell>
                      ) : (
                        <Sub>기록 없음</Sub>
                      )}
                    </td>
                    <td>
                      {ruler && (
                        <Period>
                          {formatScrubberYear(ruler.startYear)} ~{' '}
                          {ruler.endYear != null
                            ? formatScrubberYear(ruler.endYear)
                            : '재임 중'}
                        </Period>
                      )}
                    </td>
                    <td>
                      {ruler && <b>{year - ruler.startYear + 1}년차</b>}
                      {ruler?.endYear != null && (
                        <Sub> / {ruler.endYear - ruler.startYear + 1}년</Sub>
                      )}
                    </td>
                    <td>
                      {relations?.wars.map((name) => (
                        <Badge key={`w-${name}`} $tone="war">
                          ⚔ {name}
                        </Badge>
                      ))}
                      {relations?.allies.map((name) => (
                        <Badge key={`a-${name}`} $tone="ally">
                          🤝 {name}
                        </Badge>
                      ))}
                      {!relations && <Sub>—</Sub>}
                    </td>
                  </BodyRow>
                )
              })}
            </tbody>
          </Table>
        )}
      </Scroll>
    </Wrap>
  )
}

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px 8px;
`

const Title = styled.h2`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const YearMark = styled.span`
  color: #ef4444;
  font-variant-numeric: tabular-nums;
`

const Count = styled.span`
  margin-left: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Controls = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
`

const Divider = styled.span`
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: ${({ theme }) => theme.colors.border.light};
`

const Chip = styled.button<{ $active: boolean; $tone?: 'war' }>`
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  ${({ $active, $tone, theme }) =>
    $active &&
    ($tone === 'war'
      ? css`
          border-color: #ef4444;
          background: #ef4444;
          color: #ffffff;
        `
      : css`
          border-color: ${theme.colors.primary};
          background: ${theme.colors.activeLight};
          color: ${theme.colors.primary};
        `)}
`

const Scroll = styled.div`
  overflow-x: auto;
  padding: 0 16px 12px;
`

const Empty = styled.p`
  margin: 20px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Table = styled.table`
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  th {
    padding: 7px 10px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.text.tertiary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.medium};
    white-space: nowrap;
  }
  td {
    padding: 8px 10px;
    vertical-align: middle;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const BodyRow = styled.tr<{
  $tone: 'selected' | 'war' | 'ally' | null
  $dimmed: boolean
}>`
  cursor: pointer;
  transition:
    background 0.12s,
    opacity 0.12s;
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.activeLight};
    outline: none;
  }
  ${({ $tone, theme }) =>
    $tone === 'selected' &&
    css`
      background: ${theme.colors.activeLight};
      box-shadow: inset 3px 0 0 ${theme.colors.primary};
    `}
  ${({ $tone }) =>
    $tone === 'war' &&
    css`
      background: rgba(239, 68, 68, 0.1);
      box-shadow: inset 3px 0 0 #ef4444;
    `}
  ${({ $tone }) =>
    $tone === 'ally' &&
    css`
      background: rgba(59, 130, 246, 0.09);
      box-shadow: inset 3px 0 0 #3b82f6;
    `}
  ${({ $dimmed }) =>
    $dimmed &&
    css`
      opacity: 0.4;
    `}
`

const CountryName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RulerCell = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RankPill = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`

const Sub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NewBadge = styled.span`
  padding: 0 5px;
  border-radius: 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  line-height: 15px;
`

const Period = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const Badge = styled.span<{ $tone: 'war' | 'ally' }>`
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  ${({ $tone }) =>
    $tone === 'war'
      ? css`
          border: 1px solid rgba(239, 68, 68, 0.5);
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        `
      : css`
          border: 1px solid rgba(59, 130, 246, 0.45);
          background: rgba(59, 130, 246, 0.08);
          color: #2563eb;
        `}
`
