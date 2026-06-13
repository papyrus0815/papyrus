import * as S from '../country-detail-dashboard.styles'

interface LineageNode {
  id: string
  name: string
  yearsLabel: string | null
  startYearForSort: number
}

interface HistoricalCountryYearShape {
  startYear?: number | null
  endYear?: number | null
}

/** 전체/경량 역사 국가 DTO 공통 — 여기서 실제로 쓰는 필드만 요구 */
type LineageSource = {
  id: string
  name?: string | null
} & HistoricalCountryYearShape

function getYears(h: LineageSource): {
  start: number | null
  end: number | null
} {
  const shape = h as HistoricalCountryYearShape
  return {
    start: shape.startYear ?? null,
    end: shape.endYear ?? null,
  }
}

function toNode(h: LineageSource): LineageNode {
  const { start, end } = getYears(h)
  const yearsLabel =
    start == null && end == null ? null : `${start ?? ''}–${end ?? ''}`
  return {
    id: h.id,
    name: (h as { name?: string }).name ?? '미상',
    yearsLabel,
    startYearForSort: start ?? 0,
  }
}

export interface LineageFlowProps {
  /** 시간순 정렬 전 historical countries (전체/경량 DTO 모두 허용) */
  historicalCountries: LineageSource[]
  /** 현재 국가 노드(연결의 마지막) */
  currentName: string
}

export function LineageFlow({
  historicalCountries,
  currentName,
}: LineageFlowProps) {
  const nodes = [...historicalCountries]
    .map(toNode)
    .sort((a, b) => a.startYearForSort - b.startYearForSort)

  const items: Array<
    | { kind: 'chip'; node: LineageNode | { id: '__current'; name: string; yearsLabel: string | null } }
    | { kind: 'arrow'; key: string }
  > = []
  for (let i = 0; i < nodes.length; i++) {
    items.push({ kind: 'chip', node: nodes[i] as LineageNode })
    items.push({ kind: 'arrow', key: `arr-${i}` })
  }
  items.push({
    kind: 'chip',
    node: { id: '__current', name: currentName, yearsLabel: '현재' },
  })

  return (
    <S.LineageFlow>
      {items.map((it) =>
        it.kind === 'chip' ? (
          <S.LineageChip key={it.node.id}>
            <S.LineageChipBody>
              <S.LineageName>{it.node.name}</S.LineageName>
              {it.node.yearsLabel && (
                <S.LineageYears>{it.node.yearsLabel}</S.LineageYears>
              )}
            </S.LineageChipBody>
          </S.LineageChip>
        ) : (
          <S.LineageArrow key={it.key} aria-hidden>
            →
          </S.LineageArrow>
        ),
      )}
    </S.LineageFlow>
  )
}
