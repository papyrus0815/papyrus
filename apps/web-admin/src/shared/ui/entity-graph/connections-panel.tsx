/**
 * 연결 패널 — 엔티티 하나와 이어진 모든 엔티티를 묶음(국가·직위·가문·가족·관계·사건·조직·조약·군사)별로.
 *
 * 모든 상세 화면이 **같은 부품**을 쓴다(설계 docs/entity-graph-design.md §7). 반대쪽 화면을
 * 따로 짤 필요 없이 서버 투영의 역방향이 '참여 인물'·'재임자'·'관련 사건'을 채운다.
 */
import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import {
  type EntityConnectionTarget,
  type EntityKind,
  entityConnectionKeys,
  getEntityConnections,
} from '@/shared/api/entity-graph'

import { buildConnectionSections, formatConnectionPeriod } from './connections.lib'
import { EntityChip } from './entity-chip'

interface ConnectionsPanelProps {
  kind: EntityKind
  id: string
  /** 칩을 누를 때 호스트가 가로챌 수 있다(미리보기 모달 등). 없으면 상세 경로로 이동 */
  onOpen?: (target: EntityConnectionTarget) => void
  /** onOpen으로 여는 종류 — 예: 인물·사건·가문은 모달, 나머지는 상세 경로 */
  openableKinds?: readonly EntityKind[]
}

/** 한 묶음에서 처음 보여줄 줄 수 — 넘치면 '모두 보기' */
const ROWS_PER_SECTION = 8

export function ConnectionsPanel({ kind, id, onOpen, openableKinds }: ConnectionsPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: entityConnectionKeys.of(kind, id),
    queryFn: () => getEntityConnections(kind, id),
    staleTime: 60_000,
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (isLoading) return <Muted>연결을 불러오는 중…</Muted>
  if (isError || !data) return <Muted>연결을 불러오지 못했습니다.</Muted>

  const sections = buildConnectionSections(data)
  if (sections.length === 0) {
    return <Muted>아직 이어진 엔티티가 없습니다.</Muted>
  }

  return (
    <Sections>
      {sections.map((section) => {
        const open = !!expanded[section.group]
        const rows = open ? section.edges : section.edges.slice(0, ROWS_PER_SECTION)
        const hiddenRows = section.edges.length - rows.length
        return (
          <Section key={section.group} aria-label={section.label}>
            <SectionHead>
              <SectionLabel>{section.label}</SectionLabel>
              <SectionCount>{section.edges.length + section.omitted}</SectionCount>
            </SectionHead>
            <Rows>
              {rows.map((edge) => {
                const period = formatConnectionPeriod(edge.period)
                return (
                  <Row
                    key={`${edge.relation}:${edge.direction}:${edge.relationLabel}:${edge.target.kind}:${edge.target.id}`}
                  >
                    <Relation>{edge.relationLabel}</Relation>
                    <ChipCell>
                      <EntityChip
                        target={edge.target}
                        onOpen={onOpen}
                        openableKinds={openableKinds}
                      />
                      {edge.role && <Role title={edge.role}>{edge.role}</Role>}
                    </ChipCell>
                    <Meta>
                      {(edge.count ?? 1) > 1 && <Count>{edge.count}건</Count>}
                      {period ?? edge.target.subtitle ?? ''}
                    </Meta>
                  </Row>
                )
              })}
            </Rows>
            {(hiddenRows > 0 || section.omitted > 0) && (
              <MoreLine>
                {hiddenRows > 0 && (
                  <MoreButton
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [section.group]: true }))}
                  >
                    {hiddenRows}개 더 보기
                  </MoreButton>
                )}
                {section.omitted > 0 && (
                  <Muted as="span">외 {section.omitted}건은 해당 화면에서</Muted>
                )}
              </MoreLine>
            )}
          </Section>
        )
      })}
    </Sections>
  )
}

const Sections = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 18px 28px;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SectionLabel = styled.h4`
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SectionCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

/* 관계 이름 열(고정) · 칩+역할 · 기간(오른쪽) — 훑어 내려가기 쉽게 같은 x에서 시작 */
const Row = styled.li`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 28px;
`

const Relation = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ChipCell = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  /* 칩(대상 이름)이 먼저 — 긴 역할 문구가 칩을 '프랑...'으로 줄이지 않게 칩은 덜 줄고 역할이 말줄임 */
  > :first-child {
    flex-shrink: 0;
    max-width: 70%;
  }
`

const Role = styled.span`
  min-width: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Meta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const Count = styled.span`
  padding: 0 6px;
  border-radius: 999px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MoreLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const MoreButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const Muted = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
