/**
 * 리치텍스트 HTML → 한 줄 평문 (`plainTextToRichTextHtml`의 반대 방향).
 *
 * 목록 행처럼 서식 없이 한 줄로 요약해 보여 줄 자리용. 블록 경계(문단·div·줄바꿈·목록)는
 * 공백으로 바꿔 '첫 줄<div>둘째 줄</div>'이 '첫 줄둘째 줄'로 붙지 않게 하고, 연속 공백은 하나로 접는다.
 * 이미 평문이면 공백만 정리해 돌려준다(시드가 넣은 평문과 에디터 HTML이 공존하는 필드).
 *
 * 별도 모듈인 이유: rich-text-read-view는 업로드 클라이언트(import.meta)를 끌어와 jest에서
 * 컴파일되지 않는다. 이 함수는 의존성 없이 테스트돼야 한다.
 */
const BLOCK_TAG =
  /<\/?(?:p|div|br|li|ul|ol|h[1-6]|blockquote|figure|figcaption|tr|td|th|table)\b[^>]*>/gi

export function richTextToPlainText(html: string | null | undefined): string {
  const raw = html ?? ''
  if (!/<[a-z/!]/i.test(raw)) return raw.replace(/\s+/g, ' ').trim()
  const spaced = raw.replace(BLOCK_TAG, ' ')
  let text: string
  if (typeof DOMParser !== 'undefined') {
    text = new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? ''
  } else {
    text = spaced
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
  }
  return text.replace(/\s+/g, ' ').trim()
}
