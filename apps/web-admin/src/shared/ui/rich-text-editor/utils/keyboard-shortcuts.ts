/**
 * 줄 시작 마크다운 단축키 + 끝부분 URL 자동링크의 *순수 판정* 로직.
 * handleKeyDown 안의 DOM 조작과 분리해 단위 테스트 가능하게 둔다.
 * (원본: rich-text-editor.tsx handleKeyDown 인라인 판정 추출 — 동작 보존)
 */

export type BlockTransform =
  | { kind: 'list'; cmd: 'insertUnorderedList' | 'insertOrderedList' }
  | { kind: 'heading'; level: 1 | 2 | 3 }
  | { kind: 'quote' }
  | { kind: 'hr' }

/**
 * 캐럿 직전 블록 텍스트(textBefore)가 마크다운 트리거와 정확히 일치하면 변환 종류를 반환.
 * 예: '#'→heading1, '-'/'*'→불릿, '1.'→번호, '>'→인용, '---'→수평선.
 */
export function detectMarkdownBlock(textBefore: string): BlockTransform | null {
  if (textBefore === '*' || textBefore === '-') {
    return { kind: 'list', cmd: 'insertUnorderedList' }
  }
  if (textBefore === '1.') return { kind: 'list', cmd: 'insertOrderedList' }
  if (textBefore === '#') return { kind: 'heading', level: 1 }
  if (textBefore === '##') return { kind: 'heading', level: 2 }
  if (textBefore === '###') return { kind: 'heading', level: 3 }
  if (textBefore === '>') return { kind: 'quote' }
  if (textBefore === '---') return { kind: 'hr' }
  return null
}

/**
 * textBefore 끝이 공백 없는 http(s)://… 또는 www.… 이면 URL/href/시작오프셋을 반환.
 * www. 로 시작하면 https:// 를 붙인다. startIdx는 textBefore 내 URL 시작 문자 오프셋.
 */
export function detectTrailingUrl(
  textBefore: string,
): { url: string; href: string; startIdx: number } | null {
  const wordMatch = textBefore.match(
    /(^|\s)((?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,!?;:'"()])$/,
  )
  if (!wordMatch) return null
  const url = wordMatch[2]
  const href = url.startsWith('www.') ? `https://${url}` : url
  const startIdx = (textBefore.length - url.length) | 0
  return { url, href, startIdx }
}
