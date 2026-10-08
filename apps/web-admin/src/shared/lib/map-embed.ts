/**
 * 본문 지도 블록 — 구글 지도를 캡처 대신 **퍼가기(iframe)** 로 끼워 넣는다.
 *
 * API 키 없이 되는 두 갈래만 쓴다.
 *  - 구글 지도 '공유 → 지도 퍼가기' (`/maps/embed?pb=…`) — 장소·검색·길찾기
 *  - 구글 내 지도(My Maps) (`/maps/d/embed?mid=…`) — 지점·선·영역을 직접 그린 지도
 * 그 밖에 흔히 붙여 넣는 것(브라우저 주소창의 지도 주소, 장소 이름)은 키 없는 검색 퍼가기
 * (`maps.google.com/maps?q=…&output=embed`)로 바꾼다.
 *
 * 보안: 본문 새니타이저는 iframe을 **이 모듈이 허용하는 주소일 때만** 남긴다(isAllowedMapEmbedSrc).
 */

export type MapEmbedKind = 'embed' | 'mymaps' | 'search'

export interface MapEmbed {
  src: string
  kind: MapEmbedKind
}

export type ParseMapResult = { ok: true; embed: MapEmbed } | { ok: false; reason: string }

const SHORT_LINK_REASON =
  '짧은 공유 링크(maps.app.goo.gl)는 열 수 없어요 — 구글 지도에서 "공유 → 지도 퍼가기"의 코드나, 브라우저 주소창의 전체 주소를 붙여 주세요.'

/** 키 없이 쓰는 검색 퍼가기 주소 */
const searchEmbed = (query: string, zoom?: number): MapEmbed => {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('output', 'embed')
  if (zoom != null && Number.isFinite(zoom)) params.set('z', String(Math.round(zoom)))
  return { src: `https://maps.google.com/maps?${params.toString()}`, kind: 'search' }
}

/** 붙여 넣은 iframe 코드에서 src만 꺼낸다 */
function srcFromIframe(input: string): string | null {
  const match = input.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i)
  return match ? match[1].replace(/&amp;/g, '&') : null
}

function toUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

const isGoogleHost = (host: string) =>
  /^(www\.)?google\.[a-z.]+$/i.test(host) || /^maps\.google\.[a-z.]+$/i.test(host)

/**
 * 사용자가 붙여 넣거나 입력한 것 → 퍼가기 주소.
 *
 * - `<iframe src=…>` 코드 → 그 src(허용 주소일 때)
 * - `/maps/embed?…`, `/maps/d/embed?…` → 그대로
 * - My Maps 보기·편집 주소(`/maps/d/viewer|edit?mid=…`) → `/maps/d/embed?mid=…`
 * - 지도 주소의 `/place/이름/` → 그 이름 검색, `@위도,경도,줌z` → 그 좌표
 * - URL이 아닌 글자 → 장소 이름 검색
 */
export function parseMapInput(raw: string): ParseMapResult {
  const input = raw.trim()
  if (!input) return { ok: false, reason: '장소 이름이나 구글 지도 주소를 넣어 주세요.' }

  const iframeSrc = srcFromIframe(input)
  if (iframeSrc) {
    return isAllowedMapEmbedSrc(iframeSrc)
      ? { ok: true, embed: { src: iframeSrc, kind: iframeSrc.includes('/maps/d/') ? 'mymaps' : 'embed' } }
      : { ok: false, reason: '구글 지도의 퍼가기 코드가 아니에요.' }
  }

  if (!/^https?:\/\//i.test(input)) {
    if (/^(maps\.app\.goo\.gl|goo\.gl)\//i.test(input)) return { ok: false, reason: SHORT_LINK_REASON }
    return { ok: true, embed: searchEmbed(input) }
  }

  const url = toUrl(input)
  if (!url) return { ok: false, reason: '주소를 읽을 수 없어요.' }
  if (/(^|\.)goo\.gl$/i.test(url.hostname)) return { ok: false, reason: SHORT_LINK_REASON }
  if (!isGoogleHost(url.hostname) || !url.pathname.startsWith('/maps')) {
    return { ok: false, reason: '구글 지도 주소가 아니에요.' }
  }

  // My Maps
  const myMapsId = url.searchParams.get('mid')
  if (url.pathname.startsWith('/maps/d/') && myMapsId) {
    return {
      ok: true,
      embed: { src: `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(myMapsId)}`, kind: 'mymaps' },
    }
  }

  // 이미 퍼가기 주소
  if (url.pathname.startsWith('/maps/embed')) {
    const src = `https://www.google.com${url.pathname}${url.search}`
    return { ok: true, embed: { src, kind: 'embed' } }
  }
  if (url.searchParams.get('output') === 'embed') {
    return { ok: true, embed: { src: `https://maps.google.com/maps${url.search}`, kind: 'search' } }
  }

  // 일반 지도 주소 — /place/이름/@위도,경도,줌z
  const decodedPath = decodeURIComponent(url.pathname)
  const at = decodedPath.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/)
  const place = decodedPath.match(/\/maps\/(?:place|search)\/([^/@]+)/)
  if (place) {
    const name = place[1].replace(/\+/g, ' ').trim()
    return { ok: true, embed: searchEmbed(name, at ? Number(at[3]) : undefined) }
  }
  if (at) return { ok: true, embed: searchEmbed(`${at[1]},${at[2]}`, Number(at[3])) }
  const query = url.searchParams.get('q') ?? url.searchParams.get('query')
  if (query) return { ok: true, embed: searchEmbed(query) }

  return { ok: false, reason: '이 주소에서 장소를 찾지 못했어요 — 장소 이름이나 퍼가기 코드를 넣어 주세요.' }
}

/**
 * 본문에 남겨도 되는 iframe 주소 — 구글 지도 퍼가기 세 갈래만. 새니타이저가 쓴다.
 * 호스트를 정확히 본다(`google.com.evil.example` 같은 꼬리 붙이기 차단).
 */
export function isAllowedMapEmbedSrc(src: string | null | undefined): boolean {
  if (!src) return false
  const url = toUrl(src)
  if (!url || url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  if ((host === 'www.google.com' || host === 'google.com') && url.pathname.startsWith('/maps/embed')) return true
  if ((host === 'www.google.com' || host === 'google.com') && url.pathname.startsWith('/maps/d/embed')) return true
  if (host === 'maps.google.com' && url.pathname === '/maps' && url.searchParams.get('output') === 'embed') return true
  return false
}

/** 본문에 넣는 지도 블록 HTML — figure 안 iframe(+설명). 크기는 CSS가 정한다(16:10) */
export function mapEmbedHtml(embed: MapEmbed, caption: string): string {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const title = caption.trim() || '지도'
  return (
    `<figure class="map-embed" data-type="map-embed" contenteditable="false">` +
    `<iframe src="${escape(embed.src)}" title="${escape(title)}" loading="lazy" ` +
    `referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>` +
    (caption.trim() ? `<figcaption>${escape(caption.trim())}</figcaption>` : '') +
    `</figure>`
  )
}

/** 붙여넣기 자동 변환 대상인가 — 장소 이름(평문)은 아니고, 지도 주소·퍼가기 코드만 */
export function looksLikeMapPaste(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || (trimmed.includes('\n') && !/<iframe/i.test(trimmed))) return false
  if (/<iframe[^>]+google\.[a-z.]+\/maps/i.test(trimmed)) return true
  return /^https?:\/\/(www\.|maps\.)?google\.[a-z.]+\/maps/i.test(trimmed)
}
