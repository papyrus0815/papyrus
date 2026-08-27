/**
 * 사건의 「시대」 — 빅토리아 시대, 건륭제 시대.
 *
 * 새 테이블을 만들지 않는다. 시대는 이미 있는 **재위(SovereignReign)** 에서 파생한다.
 * 195건의 재위가 768~1989년을 덮고 있고, 사용자가 든 두 예(빅토리아·건륭제)가 모두
 * 그 안에 있다.
 *
 * ## 왜 "사건의 연도가 재위 기간에 들면 그 시대"가 아닌가
 *
 * 재위는 서로 겹친다. 1900년 사건은 빅토리아·무쓰히토·빌헬름·니콜라이 2세 재위에 **동시에**
 * 든다. 연도만 보면 모든 사건이 수십 개 시대에 걸려 분류가 무의미해진다.
 *
 * 그래서 **사건이 실제로 걸린 나라의 재위**만 그 사건의 시대로 삼는다. 1880년 일본 사건은
 * 무쓰히토 시대이지 빅토리아 시대가 아니다.
 *
 * 그래도 한 사건이 여러 시대에 드는 경우는 남는다 — 1차대전 사건은 독일·러시아 양쪽에
 * 걸리므로 빌헬름 시대이자 니콜라이 2세 시대다. 이건 버그가 아니라 사실이라 양쪽에 넣는다
 * (실측: 155건 중 46건이 2개 이상).
 */

/** 재위 한 건에서 뽑아낸 시대 */
export interface EventEraDto {
  /** SovereignReign.id — 시대의 식별자 */
  id: string
  /** 화면에 쓸 이름 — '빅토리아 시대', '건륭제 시대' */
  label: string
  /** 라벨의 출처. 연호가 채워지면 자동으로 그쪽으로 승격된다 */
  labelSource: 'regnalEra' | 'regnalName' | 'personName'
  personId: string
  personName: string
  /** 군주 초상 — 시대 머리에 동그란 얼굴로 쓴다. 실측 134명 중 73명만 있어 폴백 필수 */
  personImageUrl: string | null
  /** 소속 국가(역사) 이름 — 같은 이름의 군주를 가르는 데 필요 */
  countryName: string | null
  historicalCountryId: string | null
  startYear: number
  endYear: number | null
  /** 이 시대에 속한 사건 id */
  eventIds: string[]
}

/** 재위 행에서 시대 이름을 정한다. 연호 > 왕호 > 인물명 순. */
export function resolveEraLabel(input: {
  eraName?: string | null
  regnalName?: string | null
  personName: string
}): { label: string; labelSource: EventEraDto['labelSource'] } {
  // 연호(RegnalEra)가 있으면 그게 가장 정확하다 — '무쓰히토 시대'보다 '메이지 시대'.
  // 지금 regnal_era 테이블은 0행이라 실제로는 아래 두 갈래만 쓰이지만, 연호를 채우는
  // 순간 이름이 저절로 승격되도록 순서를 여기 박아둔다.
  if (input.eraName?.trim()) {
    return { label: `${input.eraName.trim()} 시대`, labelSource: 'regnalEra' }
  }
  if (input.regnalName?.trim()) {
    return { label: `${input.regnalName.trim()} 시대`, labelSource: 'regnalName' }
  }
  return { label: `${input.personName} 시대`, labelSource: 'personName' }
}

/**
 * 재위 기간에서 연도를 꺼낸다.
 *
 * 재위 195건 중 구조화 컬럼(start_year)이 찬 건 4건뿐이고 나머지는 DATETIME이다.
 * 구조화 축을 먼저 보고 없으면 DATETIME에서 연도를 뽑는다 — 구조화 축이 진실이라는
 * 규약은 지키되 실데이터가 아직 그쪽으로 안 옮겨온 현실을 함께 받는다.
 */
export function reignYear(
  era: string | null,
  year: number | null,
  date: Date | null,
): number | null {
  if (year != null) return era === 'BC' ? -year : year
  if (date != null) return date.getUTCFullYear()
  return null
}
