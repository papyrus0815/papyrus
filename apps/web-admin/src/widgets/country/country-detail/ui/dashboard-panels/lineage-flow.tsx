import {
  compareByCountryStart,
  formatCountryPeriod,
  getCountryYearRange,
  type CountryPeriodShape,
} from '@/shared/lib/country-period'
import * as S from '../country-detail-dashboard.styles'

interface LineageNode {
  id: string
  name: string
  yearsLabel: string | null
  /** 시작 연도(부호 연도). 세기 구분자 계산에만 쓴다 — 미상이면 null */
  startYear: number | null
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
    startYear: getCountryYearRange(source).start,
  }
}

/**
 * 부호 연도 → 세기 라벨. 1871 → '19세기', -753 → '기원전 8세기'.
 * (BC는 -1~-100이 기원전 1세기다 — 0년이 없으므로 AD와 같은 식으로 올림 처리)
 */
function centuryLabelOf(signedYear: number): string {
  if (signedYear < 0) {
    return `기원전 ${Math.ceil(Math.abs(signedYear) / 100)}세기`
  }
  return `${Math.ceil(signedYear / 100)}세기`
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
  //
  // 다만 칩만 12~47개 늘어놓으면 시간축이 사라진다(독일 47개). 정렬은 시간순인데
  // 화면에서는 그냥 목록으로 읽혔다. 세기가 바뀌는 자리에 구분자를 세워 흐름을 되살린다.
  let lastCentury: string | null = null

  return (
    <S.LineageFlow>
      {nodes.map((node) => {
        const century =
          node.startYear != null ? centuryLabelOf(node.startYear) : null
        const showMarker = century != null && century !== lastCentury
        if (century != null) lastCentury = century
        return (
          <S.LineageChip key={node.id}>
            {showMarker && (
              <S.LineageCenturyMark aria-hidden>{century}</S.LineageCenturyMark>
            )}
            <S.LineageChipBody>
              <S.LineageName>{node.name}</S.LineageName>
              {node.yearsLabel && (
                <S.LineageYears>{node.yearsLabel}</S.LineageYears>
              )}
            </S.LineageChipBody>
          </S.LineageChip>
        )
      })}
    </S.LineageFlow>
  )
}
