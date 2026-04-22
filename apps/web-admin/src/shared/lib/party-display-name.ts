/**
 * 정당 이름 표시용 공용 헬퍼.
 * - `getPartyDisplayName`: 폼·테이블·다이얼로그·aria-label 등 공간이 충분한 맥락에서 사용.
 *   약칭이 있으면 `정식명 (약칭)`, 없으면 정식명만.
 * - `getPartyShortName`: 도넛·범례 등 공간이 제한된 차트 내부 라벨에서 사용.
 *   약칭 우선, 없으면 정식명.
 */
export type PartyDisplayFields = {
  name: string
  shortName?: string | null
}

export function getPartyDisplayName(
  p: PartyDisplayFields | null | undefined,
): string {
  if (!p) return ''
  const name = p.name?.trim() ?? ''
  const short = p.shortName?.trim() ?? ''
  if (short && short !== name) return `${name} (${short})`
  return name
}

export function getPartyShortName(
  p: PartyDisplayFields | null | undefined,
): string {
  if (!p) return ''
  const short = p.shortName?.trim()
  if (short) return short
  return p.name?.trim() ?? ''
}
