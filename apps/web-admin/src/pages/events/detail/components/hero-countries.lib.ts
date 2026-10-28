/**
 * 히어로 국가 줄 — 어떤 나라를 어떤 묶음으로 보일지(순수 로직, hero-countries.spec.ts).
 *
 * 예전엔 현대국가와 역사국가 사이에 `—`를 그어 1차세계대전이 `미국 — 독일 제국 · 오스트리아-헝가리 …`로
 * 나왔다. 그 `—`는 '현대/역사' 구분일 뿐인데 전쟁 사건에선 "미국 대 독일"로 읽혔다(미국은 협상국 편).
 * - 진영이 둘 이상이고 나라가 진영에 들어가 있으면 **진영별 줄**로 묶는다(진영 30건, 소속 114줄).
 * - 아니면 한 줄 — 현대·역사를 같은 `·`로 잇고, 역사국가는 글꼴(기울임)로만 구분한다.
 */

export interface HeroCountry {
  id: string
  name: string
  historical: boolean
  sideId?: string | null
}

export interface HeroCountryGroup {
  /** 진영 id — 진영 없는 줄(또는 진영에 안 든 나라)은 null */
  sideId: string | null
  /** 줄 머리 — 진영명. 진영 없는 한 줄이면 null, 진영 줄들 뒤의 나머지는 '그 밖' */
  label: string | null
  countries: HeroCountry[]
  /** 이 줄에서 잘린 수 — '외 N' */
  overflow: number
}

interface SideRef {
  id: string
  name: string
  parentSideId?: string | null
  sortOrder?: number
}

/**
 * 진영별로 가른다 — 하위 진영 소속은 맨 위 진영으로 접는다(히어로·참여 탭은 편이 몇인지만 말한다).
 * 나라가 든 진영이 **둘 미만**이면 null(편이 하나면 대립이 아니라 묶을 이유가 없다).
 * 진영에 안 든 것은 마지막 `sideId: null` 묶음(라벨 '그 밖').
 */
export function groupBySide<T extends { sideId?: string | null }>(
  items: ReadonlyArray<T>,
  sides: ReadonlyArray<SideRef>,
): Array<{ sideId: string | null; label: string; items: T[] }> | null {
  const byId = new Map(sides.map((side) => [side.id, side]))
  const rootOf = (sideId: string): SideRef | undefined => {
    let side = byId.get(sideId)
    const seen = new Set<string>()
    while (side?.parentSideId && byId.has(side.parentSideId) && !seen.has(side.id)) {
      seen.add(side.id)
      side = byId.get(side.parentSideId)
    }
    return side
  }
  const roots = sides
    .filter((side) => !side.parentSideId || !byId.has(side.parentSideId))
    .slice()
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
  const rootIdOf = (item: T) => (item.sideId ? rootOf(item.sideId)?.id ?? null : null)

  const grouped = roots
    .map((side) => ({
      sideId: side.id as string | null,
      label: side.name,
      items: items.filter((item) => rootIdOf(item) === side.id),
    }))
    .filter((group) => group.items.length > 0)
  if (grouped.length < 2) return null
  const rest = items.filter((item) => rootIdOf(item) === null)
  return rest.length > 0 ? [...grouped, { sideId: null, label: '그 밖', items: rest }] : grouped
}

export function groupHeroCountries(
  modern: ReadonlyArray<{ id: string; name: string; sideId?: string | null }>,
  historical: ReadonlyArray<{ id: string; name: string; sideId?: string | null }>,
  sides: ReadonlyArray<SideRef>,
  cap: number,
): HeroCountryGroup[] {
  const all: HeroCountry[] = [
    ...modern.map((country) => ({ ...country, historical: false })),
    ...historical.map((country) => ({ ...country, historical: true })),
  ]
  if (all.length === 0) return []

  const groups = groupBySide(all, sides)
  if (!groups) {
    return [{ sideId: null, label: null, countries: all.slice(0, cap), overflow: Math.max(0, all.length - cap) }]
  }
  /* 줄마다 같은 몫 — 한쪽 진영이 크다고 다른 쪽이 '외 N'으로만 남으면 대립 구도가 안 보인다 */
  const perLine = Math.max(3, Math.ceil(cap / groups.length))
  return groups.map((group) => ({
    sideId: group.sideId,
    label: group.label,
    countries: group.items.slice(0, perLine),
    overflow: Math.max(0, group.items.length - perLine),
  }))
}
