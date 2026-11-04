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
