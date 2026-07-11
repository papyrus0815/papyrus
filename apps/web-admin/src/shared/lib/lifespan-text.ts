/**
 * 생몰 표기 단일 포맷터 (출생 정보 리뷰 §4-C).
 *
 * 생몰연도 렌더가 지면마다 3중 구현·6곳+ 산재돼 있고 전부 native Date 기반(BC-unsafe)이라
 * 값이 어긋날 수 있었다 — 새 지면은 반드시 이 포맷터를 쓰고, 기존 지면은 점진 합류한다.
 *
 * 입력은 부호 연도(signed year, BC 음수) — era 플래그+DATETIME 하이브리드의 부호화는
 * 서버(person-records compare) 또는 호출부 어댑터가 책임진다.
 *
 * circa(추정) 표기는 팀 canon '1500년경'(접미) — birth-death-cards의 '경'과 일치.
 */

/** 부호 연도 → "1500" | "BC 44". */
export function formatSignedYear(year: number): string {
  return year < 0 ? `BC ${-year}` : String(year)
}

/** 부호 연도 → 세기 라벨 "15세기" | "BC 5세기". (1401 → 15세기, -500 → BC 5세기) */
export function formatCenturyLabel(signedYear: number): string {
  const century = Math.floor((Math.abs(signedYear) - 1) / 100) + 1
  return signedYear < 0 ? `BC ${century}세기` : `${century}세기`
}

/** start–end가 정확히 한 세기(예: 1401–1500)를 이루면 세기 표기로 축약할 수 있다. (AD 양수만) */
function isCleanCentury(start: number, end: number): boolean {
  if (start <= 0 || end <= 0) return false
  const century = Math.floor((start - 1) / 100) + 1
  return start === (century - 1) * 100 + 1 && end === century * 100
}

/**
 * 활동시기(floruit) 한 줄 표기 — 생몰이 전면 미상일 때의 폴백.
 * - 범위: "fl. 1200–1250" (한 세기를 이루면 "fl. 15세기")
 * - 시작만: "fl. 1450~" / 종료만: "fl. ~1450"
 * - 없음: "" (호출부가 미상 표기를 결정)
 */
export function formatFloruit(start?: number | null, end?: number | null): string {
  if (start == null && end == null) return ''
  if (start != null && end != null) {
    if (isCleanCentury(start, end)) return `fl. ${formatCenturyLabel(start)}`
    return `fl. ${formatSignedYear(start)}–${formatSignedYear(end)}`
  }
  if (start != null) return `fl. ${formatSignedYear(start)}~`
  return `fl. ~${formatSignedYear(end as number)}`
}

export interface LifespanInput {
  /** 부호 연도. 미상이면 null */
  birthYear?: number | null
  deathYear?: number | null
  /** 추정(circa) 여부 — "1500년경" 접미 */
  birthApproximate?: boolean
  deathApproximate?: boolean
  /** true면 생존 인물로 간주해 사망측을 비운다 ("1950–") */
  isAlive?: boolean
  /** 활동시기(floruit) 부호 연도 — 생몰이 둘 다 미상일 때만 폴백으로 사용 */
  floruitStartYear?: number | null
  floruitEndYear?: number | null
}

/** 부호연도 → circa면 "1500년경", 아니면 "1500". */
function yearWithCirca(year: number, approximate?: boolean): string {
  return `${formatSignedYear(year)}${approximate ? '년경' : ''}`
}

/**
 * 생몰 범위 한 줄 표기.
 * - 둘 다 있음: "1500–1558" / "BC 100–BC 44" / "1500년경–1558"
 * - 출생만: "1500–?" (isAlive면 "1500–")
 * - 사망만: "?–1558"
 * - 둘 다 미상: floruit가 있으면 "fl. 15세기", 없으면 "" (호출부가 미상 표기를 결정)
 */
export function formatLifespan(input: LifespanInput): string {
  const birth =
    input.birthYear != null ? yearWithCirca(input.birthYear, input.birthApproximate) : null
  const death =
    input.deathYear != null ? yearWithCirca(input.deathYear, input.deathApproximate) : null
  if (birth == null && death == null) {
    return formatFloruit(input.floruitStartYear, input.floruitEndYear)
  }
  if (birth != null && death == null) {
    return input.isAlive ? `${birth}–` : `${birth}–?`
  }
  if (birth == null && death != null) return `?–${death}`
  return `${birth}–${death}`
}
