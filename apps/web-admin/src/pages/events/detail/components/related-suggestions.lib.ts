/**
 * 같은 키워드의 사건 — 관련 사건으로 이을 후보.
 *
 * 관련 사건 연결은 518건 중 21건에만 있었다(15행). 반면 키워드는 245건이 쓰고, 고유 2,036개 중 310개를
 * 두 사건 이상이 같이 쓴다 — 이미 적어 둔 키워드가 '이 사건과 이어지는 사건'을 말하고 있다.
 *
 * 점수는 겹친 키워드마다 희소도 가중(흔한 '1914'보다 드문 '레이 차관 사기 사건'이 무겁다). 두 개 이상
 * 겹쳐야 후보가 된다 — 하나만 겹치면 '1914'·'오스만 제국' 같은 넓은 말 하나로 묶인다.
 */

export interface KeywordEvent {
  id: string
  title: string
  keywords?: string[] | null
  parentEventId?: string | null
}

export interface RelatedSuggestion {
  id: string
  title: string
  /** 겹친 키워드 — 드문 것부터 */
  shared: string[]
  score: number
}

const normalize = (keyword: string) => keyword.trim().toLowerCase()

/**
 * @param current 지금 사건
 * @param others 비교할 사건 전부(하위 포함, 지금 사건이 섞여 있어도 된다)
 * @param excludeIds 이미 이어진 사건 — 상위·하위·형제·관련 사건
 */
export function keywordSuggestions(
  current: KeywordEvent,
  others: ReadonlyArray<KeywordEvent>,
  excludeIds: ReadonlySet<string> = new Set(),
  limit = 5,
): RelatedSuggestion[] {
  const mine = new Map<string, string>()
  for (const keyword of current.keywords ?? []) {
    const key = normalize(keyword)
    if (key) mine.set(key, keyword.trim())
  }
  if (mine.size < 2) return []

  /* 키워드가 몇 사건에 나오는가 — 희소도 가중의 분모 */
  const frequency = new Map<string, number>()
  for (const event of others) {
    for (const key of new Set((event.keywords ?? []).map(normalize).filter(Boolean))) {
      frequency.set(key, (frequency.get(key) ?? 0) + 1)
    }
  }

  const results: RelatedSuggestion[] = []
  for (const event of others) {
    if (event.id === current.id || excludeIds.has(event.id)) continue
    const theirs = new Set((event.keywords ?? []).map(normalize).filter(Boolean))
    const sharedKeys = [...mine.keys()].filter((key) => theirs.has(key))
    if (sharedKeys.length < 2) continue
    sharedKeys.sort((left, right) => (frequency.get(left) ?? 1) - (frequency.get(right) ?? 1))
    const score = sharedKeys.reduce((sum, key) => sum + 1 / Math.log2(1 + (frequency.get(key) ?? 1)), 0)
    results.push({ id: event.id, title: event.title, shared: sharedKeys.map((key) => mine.get(key) ?? key), score })
  }
  return results.sort((left, right) => right.score - left.score || left.title.localeCompare(right.title)).slice(0, limit)
}
