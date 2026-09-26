import { type ReactNode } from 'react'

/**
 * `*강조*` — 시드·편집자가 평문/본문에 쓰는 한 겹 별표 강조 표기.
 *
 * 실측(2026-09-25): 사건 요약 9 · 배경 13 · 여파 12 · 본문 단락 68 · 참여 인물 비고 49 ·
 * 참여국 서술 28행이 쓰는데, 어느 읽기 뷰도 해석하지 않아 별표가 그대로 노출됐다.
 * 한글 이탤릭은 기울기만 흉내 내 읽기 어려워 굵기로 옮긴다.
 *
 * 줄(또는 태그)을 넘는 별표·짝 없는 별표는 그대로 둔다 — 각주 기호('3+*')를 먹지 않게.
 * 편집 진입 시엔 원문(별표 포함) 그대로 편집한다 — 읽기 표시만 바꾼다.
 */
const PLAIN_EMPHASIS = /\*([^*\n]+)\*/g
const HTML_TEXT_EMPHASIS = /\*([^*\n<>]+)\*/g

/** 평문 → ReactNode(`*x*` → <strong>x</strong>). 강조가 없으면 원문 문자열 그대로. */
export function renderEmphasis(text: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(PLAIN_EMPHASIS)) {
    const start = match.index ?? 0
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(<strong key={start}>{match[1]}</strong>)
    cursor = start + match[0].length
  }
  if (parts.length === 0) return text
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

/**
 * 리치텍스트 HTML → 같은 HTML(텍스트 조각 안의 `*x*`만 <strong>). 태그 안(속성값)은
 * 건드리지 않는다. 결과는 읽기 뷰의 sanitize를 그대로 거친다.
 */
export function emphasisToHtml(html: string): string {
  if (!html.includes('*')) return html
  return html
    .split(/(<[^>]*>)/)
    .map((segment) =>
      segment.startsWith('<')
        ? segment
        : segment.replace(HTML_TEXT_EMPHASIS, '<strong>$1</strong>'),
    )
    .join('')
}
