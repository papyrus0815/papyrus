/**
 * 위치 글 → 지도 검색어. 위치 글이 있는 87건 중 좌표가 있는 건 2건뿐이라, '지도에 찍기'를 열면 글의 첫 장소로
 * 미리 검색해 대부분 한 번 고르면 끝나게 한다. 글은 '잉글랜드 런던 — 서머셋 하우스'·'광둥성·푸젠성… 일대 (…)'·
 * '발미 풍차 언덕 *현 프랑스 …)'처럼 여러 곳·설명·괄호 주석이 섞여 있어(87건 중 56건이 여러 곳) 첫 덩어리만 쓴다.
 */
const SEPARATORS = /\s*(?:—|–|―|\/|·|,|，|、|→|~|∼|;|；|\.\s|\s및\s|\s또는\s)\s*/
const TRAILING_AREA_WORDS = /\s*(?:일대|인근|부근|근처|주변|전역|지역|일원)$/

export function placeQueryFromText(text: string | null | undefined): string {
  if (!text) return ''
  const cleaned = text
    // 괄호 주석('(현 튀르키예 이스탄불)', '(大月市)')과 '*현 …' 같은 덧말
    .replace(/[(（[][^)）\]]*[)）\]]?/g, ' ')
    .replace(/\*.*$/, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const first = cleaned.split(SEPARATORS).find((part) => part.trim().length >= 2)?.trim() ?? ''
  const withoutArea = first.replace(TRAILING_AREA_WORDS, '').trim()
  // 너무 긴 설명문이면 앞 세 낱말만 — 문장째 넣으면 아무것도 못 찾는다
  const words = withoutArea.split(' ')
  return (words.length > 4 ? words.slice(0, 3).join(' ') : withoutArea).slice(0, 60)
}

function cleanCandidateToken(raw: string): string {
  const stripped = raw
    .replace(/^[(*\s]+|[)）\]\s]+$/g, '')
    .replace(/^(?:현|현재)\s+/, '')
    .replace(TRAILING_AREA_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (stripped.length < 2) return ''
  // 순수 한자·연도만 있는 괄호 주석은 검색 후보에서 제외
  if (/^[\d\s~-]+$/.test(stripped)) return ''
  const words = stripped.split(' ')
  return (words.length > 5 ? words.slice(0, 4).join(' ') : stripped).slice(0, 60)
}

/**
 * 위치 텍스트 및 맥락 힌트(사건명·참여국 등)에서 지도 검색에 바로 쓸 수 있는 후보 키워드 목록을 추출한다.
 * - '(현 튀르키예 이스탄불)'이나 '*현 프랑스 그랑테스트 마른주 발미' 같은 현대 지명을 함께 추출해
 *   옛 지명으로 검색되지 않을 때 원클릭으로 현대 지명을 검색할 수 있게 한다.
 * - '잉글랜드 런던 — 서머셋 하우스'나 '광둥성·푸젠성 (광저우·후먼)'처럼 복합 지명의 각 부분도 후보로 제공한다.
 */
export function extractPlaceSearchCandidates(
  text: string | null | undefined,
  contextHints: ReadonlyArray<string | null | undefined> = [],
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  const push = (raw: string) => {
    const token = cleanCandidateToken(raw)
    if (!token || seen.has(token)) return
    seen.add(token)
    result.push(token)
  }

  if (text && text.trim()) {
    const primary = placeQueryFromText(text)
    if (primary) push(primary)

    // 1. '*현 ...' 또는 '(현 ...)' 현대 지명 추출
    const starModernMatch = text.match(/\*\s*(?:현|현재)\s*([^)）\]]+)/)
    if (starModernMatch?.[1]) {
      push(starModernMatch[1])
    }
    const parenMatches = text.matchAll(/[(（[]([^)）\]]+)[)）\]]?/g)
    for (const match of parenMatches) {
      const inner = match[1]?.trim() ?? ''
      if (!inner) continue
      if (/^(?:현|현재)\s+/.test(inner)) {
        push(inner)
      } else {
        for (const sub of inner.split(SEPARATORS)) {
          // 순수 한자 병기(예: 大月市)가 아닌 한글/영문 포함 지명만 추가
          if (/[가-힣a-zA-Z]/.test(sub)) {
            push(sub)
          }
        }
      }
    }

    // 2. 본문 구분자(—, ·, / 등)로 나뉜 개별 장소 추출
    const mainWithoutNotes = text
      .replace(/[(（[][^)）\]]*[)）\]]?/g, ' ')
      .replace(/\*.*$/, ' ')
    for (const part of mainWithoutNotes.split(SEPARATORS)) {
      push(part)
    }
  }

  for (const hint of contextHints) {
    if (hint && hint.trim()) {
      push(hint)
    }
  }

  return result.slice(0, 6)
}

/**
 * 한 줄에 '대표 장소 — 세부 장소/현 지명'이나 '옛 지명 (현 ...)' 형태로 섞여 있는 위치 문자열을
 * `label`(장소 이름)과 `note`(위치 메모)로 분리한다. 분리할 구분이 없으면 null을 반환한다.
 */
export function splitLocationLabelAndNote(
  rawLabel: string | null | undefined,
): { label: string; note: string } | null {
  if (!rawLabel) return null
  const trimmed = rawLabel.trim()
  if (!trimmed) return null

  // 1. '*현 ...' 패턴 분리 (예: '발미 풍차 언덕 *현 프랑스 그랑테스트 마른주 발미)')
  const starIdx = trimmed.indexOf('*')
  if (starIdx > 0) {
    const head = trimmed.slice(0, starIdx).trim()
    const tail = trimmed
      .slice(starIdx + 1)
      .replace(/[)）\]]+$/, '')
      .trim()
    if (head.length >= 2 && tail.length >= 2) {
      return { label: head, note: tail }
    }
  }

  // 2. ' — ' / ' – ' / ' ― ' 대시 구분자 분리 (예: '잉글랜드 런던 — 서머셋 하우스')
  const dashMatch = trimmed.match(/^(.+?)\s+(?:—|–|―)\s+(.+)$/)
  if (dashMatch) {
    const head = dashMatch[1].trim()
    const tail = dashMatch[2].trim()
    if (head.length >= 2 && tail.length >= 2) {
      return { label: head, note: tail }
    }
  }

  // 3. 끝에 붙은 '(현 ...)' 또는 '(현재 ...)' 괄호 주석 분리
  const modernParenMatch = trimmed.match(
    /^(.+?)\s*[(（]\s*((?:현|현재)\s+[^)）]+)[)）]$/,
  )
  if (modernParenMatch) {
    const head = modernParenMatch[1].trim()
    const tail = modernParenMatch[2].trim()
    if (head.length >= 2 && tail.length >= 2) {
      return { label: head, note: tail }
    }
  }

  return null
}
