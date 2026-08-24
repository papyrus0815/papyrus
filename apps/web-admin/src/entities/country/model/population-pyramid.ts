/**
 * 인구 피라미드 — 연령대 × 성별 인구의 단일 출처.
 *
 * DB(`country_demographic_indicator`)에는 9개 연령대 × 남/여 = 18개 컬럼이 처음부터
 * 있었지만 DTO에서 잘려 화면까지 한 번도 올라온 적이 없었다. 등록 폼과 대시보드 차트가
 * 같은 순서·같은 라벨을 쓰도록 여기 한 곳에서만 정의한다.
 *
 * BigInt 컬럼이라 API는 문자열로 주고받는다 — 숫자로 바꾸는 지점도 여기로 모은다.
 */
import type { DemographicIndicator } from '@/shared/api/country-indicators'

export interface AgeBracket {
  /** 필드 접미사 — `maleAge${key}` / `femaleAge${key}` */
  key: string
  /** 차트 축 라벨 — 좁은 축에 들어가야 해서 짧다 */
  label: string
  /** 폼·문장용 라벨. '80+' 뒤에 '세'를 붙이면 '80+세'가 되므로 따로 둔다 */
  formLabel: string
}

/** 아래(어린 연령)에서 위(고령)로 — 피라미드는 이 순서로 쌓인다. */
export const AGE_BRACKETS: AgeBracket[] = [
  { key: '0To9', label: '0–9', formLabel: '0–9세' },
  { key: '10To19', label: '10–19', formLabel: '10–19세' },
  { key: '20To29', label: '20–29', formLabel: '20–29세' },
  { key: '30To39', label: '30–39', formLabel: '30–39세' },
  { key: '40To49', label: '40–49', formLabel: '40–49세' },
  { key: '50To59', label: '50–59', formLabel: '50–59세' },
  { key: '60To69', label: '60–69', formLabel: '60–69세' },
  { key: '70To79', label: '70–79', formLabel: '70–79세' },
  { key: '80Plus', label: '80+', formLabel: '80세 이상' },
]

export const maleFieldOf = (bracket: AgeBracket) => `maleAge${bracket.key}`
export const femaleFieldOf = (bracket: AgeBracket) => `femaleAge${bracket.key}`

/** 등록 폼·차트가 함께 도는 18개 필드 키 (남·여 쌍으로 나열). */
export const PYRAMID_FIELD_KEYS: string[] = AGE_BRACKETS.flatMap((bracket) => [
  maleFieldOf(bracket),
  femaleFieldOf(bracket),
])

/** BigInt 문자열 → 숫자. 빈 값·파싱 실패는 0으로 (차트에서 빈 칸으로 보인다). */
function toCount(value: unknown): number {
  if (value == null || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export interface PyramidRow {
  bracket: string
  male: number
  female: number
  /** 남성은 축 왼쪽으로 뻗어야 해서 음수로 그린다. 라벨은 절댓값을 쓸 것. */
  maleSigned: number
  total: number
}

/** 한 해 지표 → 피라미드 행 9개. 값이 하나도 없으면 빈 배열. */
export function toPyramidRows(
  indicator: DemographicIndicator | null | undefined,
): PyramidRow[] {
  if (!indicator) return []
  const source = indicator as unknown as Record<string, unknown>
  const rows = AGE_BRACKETS.map((bracket) => {
    const male = toCount(source[maleFieldOf(bracket)])
    const female = toCount(source[femaleFieldOf(bracket)])
    return {
      bracket: bracket.label,
      male,
      female,
      maleSigned: -male,
      total: male + female,
    }
  })
  return rows.some((row) => row.total > 0) ? rows : []
}

/** 그 해에 피라미드를 그릴 값이 있는가. */
export function hasPyramidData(
  indicator: DemographicIndicator | null | undefined,
): boolean {
  return toPyramidRows(indicator).length > 0
}

/** 피라미드 값의 남·여 합계 — 총인구(population)와 별개로 실제 입력의 합이다. */
export function pyramidTotals(rows: PyramidRow[]) {
  return rows.reduce(
    (acc, row) => ({
      male: acc.male + row.male,
      female: acc.female + row.female,
      total: acc.total + row.total,
    }),
    { male: 0, female: 0, total: 0 },
  )
}
