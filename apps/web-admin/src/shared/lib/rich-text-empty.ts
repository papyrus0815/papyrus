import { sanitizeRichTextHtml } from './sanitize-rich-text-html'

/**
 * RichTextEditor가 만든 HTML이 *시각적으로* 비어 있는지 판정.
 *
 * 사용 시점:
 *  - 저장 시 빈 본문을 `null`로 정규화할 때
 *  - 읽기 모드에서 placeholder 노출 분기
 *
 * 규칙:
 *  - sanitize 후 텍스트가 비어 있고
 *  - figure/img/hr/table/iframe 등 *시각 콘텐츠 태그*도 없으면 비어 있음으로 본다.
 *
 * 이전엔 사용처마다(`!html.replace(/<[^>]*>/g,'')` 등) 다른 규칙으로 판정해
 * "어떤 화면에선 비었음, 다른 화면에선 내용 있음"이라는 round-trip 불일치가 났음.
 * 한 곳에 집중해 그 위험을 줄인다.
 */
export function isVisuallyEmptyRichText(
  html: string | null | undefined,
): boolean {
  const raw = html?.trim() ?? ''
  if (raw === '') return true
  const safe = sanitizeRichTextHtml(raw)
  if (!safe.trim()) return true
  // 시각 콘텐츠 태그 — 이게 있으면 텍스트가 비어도 "내용 있음"
  if (/<(?:img|figure|hr|table|iframe|video|audio|svg)\b/i.test(safe)) {
    return false
  }
  // 텍스트만 따로 보고 — 태그·NBSP·zero-width 모두 제거
  const text = safe
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;| /g, ' ')
    .replace(/[​‌‍﻿]/g, '')
    .trim()
  return text.length === 0
}
