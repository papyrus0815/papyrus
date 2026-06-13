/**
 * rich-text-editor 캐럿/빈 블록 정리 관련 순수 DOM 헬퍼.
 * React 상태/props에 의존하지 않으므로 컴포넌트 밖으로 분리해 단위 테스트 가능하게 둔다.
 * (원본: rich-text-editor.tsx 인라인 정의를 동작 변경 없이 추출)
 */

/** P/DIV 빈 블록 판정 — 미디어/구조 요소 없이 텍스트가 공백(또는 zero-width space)뿐. */
export function isEmptyRichBlock(el: Element | null): el is HTMLElement {
  if (!el) return false
  if (el.tagName !== 'P' && el.tagName !== 'DIV') return false
  if (el.querySelector('img, figure, table, ul, ol, blockquote, pre, hr'))
    return false
  return (el.textContent ?? '').replace(/​/g, '').trim() === ''
}

/**
 * node 바로 앞의 연속 빈 블록 제거. 본문 뒤 Enter로 만든 빈 줄에 블록(이미지·구분선)을
 * 넣을 때 execCommand insertHTML이 캐럿 단락을 분할하며 남기는 빈 <p>를 정리한다.
 */
export function removeEmptyBlocksBefore(node: Element): void {
  let prev = node.previousElementSibling
  while (isEmptyRichBlock(prev)) {
    const toRemove = prev
    prev = prev.previousElementSibling
    toRemove.remove()
  }
}

/**
 * 에디터 루트 기준 *문자 오프셋*으로 caret Range를 만든다. innerHTML 전체 교체 후
 * 캐럿을 복원할 때, 교체 전에 잡아 둔 노드(detached)를 쓰지 않고 텍스트 길이로
 * 재계산해 안전하게 복원하기 위함.
 */
export function caretRangeFromCharOffset(
  root: HTMLElement,
  target: number,
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let remaining = target
  let last: Text | null = null
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    const len = text.data.length
    if (remaining <= len) {
      const range = document.createRange()
      range.setStart(text, remaining)
      range.collapse(true)
      return range
    }
    remaining -= len
    last = text
    node = walker.nextNode()
  }
  const range = document.createRange()
  if (last) range.setStart(last, last.data.length)
  else range.selectNodeContents(root)
  range.collapse(false)
  return range
}
