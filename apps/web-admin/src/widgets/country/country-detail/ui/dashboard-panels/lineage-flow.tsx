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
}

export function LineageFlow({ historicalCountries }: LineageFlowProps) {
  // era 인지 비교기로 시간순 정렬 — BC 국가가 역순으로 이어지던 문제(F7) 해소
  const nodes = [...historicalCountries].sort(compareByCountryStart).map(toNode)

  // 화살표(→)로 잇지 않는다 — 이 목록엔 직계 계승뿐 아니라 당대 병존 구성국·느슨한
  // 고대조상까지 섞여 있어(검토서 R1) 선형 계승을 그리면 거짓 주장이 된다. 관련
  // 역사국가를 칩으로만 나열하고, 현대 국가를 종단 칩으로 덧붙이지 않는다.
  return (
    <S.LineageFlow>
      {nodes.map((node) => (
        <S.LineageChip key={node.id}>
          <S.LineageChipBody>
            <S.LineageName>{node.name}</S.LineageName>
            {node.yearsLabel && (
              <S.LineageYears>{node.yearsLabel}</S.LineageYears>
            )}
          </S.LineageChipBody>
        </S.LineageChip>
      ))}
    </S.LineageFlow>
  )
}
