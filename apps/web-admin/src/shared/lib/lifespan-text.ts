/**
 * 생몰 표기 단일 포맷터 (출생 정보 리뷰 §4-C).
 *
 * 생몰연도 렌더가 지면마다 3중 구현·6곳+ 산재돼 있고 전부 native Date 기반(BC-unsafe)이라
 * 값이 어긋날 수 있었다 — 새 지면은 반드시 이 포맷터를 쓰고, 기존 지면은 점진 합류한다.
 *
 * 입력은 부호 연도(signed year, BC 음수) — era 플래그+DATETIME 하이브리드의 부호화는
 * 서버(person-records compare) 또는 호출부 어댑터가 책임진다.
 */

/** 부호 연도 → "1500" | "BC 44". */
export function formatSignedYear(year: number): string {
  return year < 0 ? `BC ${-year}` : String(year)
}

export interface LifespanInput {
  /** 부호 연도. 미상이면 null */
  birthYear?: number | null
  deathYear?: number | null
  /** 추정(circa) 여부 — "약 1500" 접두 */
  birthApproximate?: boolean
  deathApproximate?: boolean
  /** true면 생존 인물로 간주해 사망측을 비운다 ("1950–") */
  isAlive?: boolean
}

/**
 * 생몰 범위 한 줄 표기.
 * - 둘 다 있음: "1500–1558" / "BC 100–BC 44" / "약 1500–1558"
 * - 출생만: "1500–?" (isAlive면 "1500–")
 * - 사망만: "?–1558"
 * - 둘 다 미상: "" (호출부가 미상 표기를 결정 — 강제 문구를 심지 않는다)
 */
export function formatLifespan(input: LifespanInput): string {
  const birth =
    input.birthYear != null
      ? `${input.birthApproximate ? '약 ' : ''}${formatSignedYear(input.birthYear)}`
      : null
  const death =
    input.deathYear != null
      ? `${input.deathApproximate ? '약 ' : ''}${formatSignedYear(input.deathYear)}`
      : null
  if (birth == null && death == null) return ''
  if (birth != null && death == null) {
    return input.isAlive ? `${birth}–` : `${birth}–?`
  }
  if (birth == null && death != null) return `?–${death}`
  return `${birth}–${death}`
}
