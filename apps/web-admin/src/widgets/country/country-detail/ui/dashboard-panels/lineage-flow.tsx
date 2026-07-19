import {
  compareByCountryStart,
  formatCountryPeriod,
  type CountryPeriodShape,
} from '@/shared/lib/country-period'
import * as S from '../country-detail-dashboard.styles'

interface LineageNode {
  id: string
  name: string
  yearsLabel: string | null
}

/** 전체/경량 역사 국가 DTO 공통 — 여기서 실제로 쓰는 필드만 요구 */
type LineageSource = {
  id: string
  name?: string | null
} & CountryPeriodShape

function toNode(source: LineageSource): LineageNode {
  // era를 반영한 공용 포맷터 — BC는 '기원전', 종료 미상은 '미상'(‘현재’ 아님)
  const yearsLabel = formatCountryPeriod(source, { variant: 'short' })
  return {
    id: source.id,
    name: source.name ?? '미상',
    yearsLabel: yearsLabel || null,
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
  // era 인지 비교기로 시간순 정렬 — BC 국가가 역순으로 이어지던 문제(F7) 해소
  const nodes = [...historicalCountries].sort(compareByCountryStart).map(toNode)

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
