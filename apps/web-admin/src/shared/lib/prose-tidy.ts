/**
 * 읽기 화면의 본문 HTML 정리 — 편집기가 남긴 **빈 단락·빈 글꼴 태그**를 걷어낸다(저장값은 그대로).
 *
 * contentEditable 편집기는 줄을 띄우려 Enter를 두 번 치면 `<p><br></p>`를, 색을 지우면 `<font color="…"></font>`를
 * 남긴다. 단락 간격은 이미 CSS가 주는데 이것들이 그 위에 쌓여, 사건 상세 본문에서 구분선 앞뒤로 150px 가까운
 * 빈칸이 생겼다(실DB: 빈 단락이 든 본문 115개·55개 사건).
 * 표·목록 안의 빈 칸은 건드리지 않는다 — `<p>`만 본다.
 */
const EMPTY_FONT = /<font\b[^>]*>\s*<\/font>/gi
const EMPTY_PARAGRAPH = /<p\b[^>]*>(?:\s|&nbsp;|&#160;|<br\s*\/?>|<font\b[^>]*>\s*<\/font>)*<\/p>/gi

export function tidyProseHtml(html: string): string {
  if (!html) return html
  let next = html
  /* 빈 글꼴이 빈 글꼴을 감싼 경우까지 — 더 줄지 않을 때까지 */
  for (let guard = 0; guard < 4; guard += 1) {
    const stripped = next.replace(EMPTY_FONT, '')
    if (stripped === next) break
    next = stripped
  }
  return next.replace(EMPTY_PARAGRAPH, '')
}
