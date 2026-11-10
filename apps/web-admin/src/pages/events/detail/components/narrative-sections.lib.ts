/**
 * 배경·전개·여파 번호 단락의 **순수 로직** — 분류·직렬화·서버 동기화.
 *
 * UI(narrative-sections.tsx)와 분리한 이유: 조판 파일은 rich-text 에디터까지 끌고 와
 * 단위 테스트에서 로드할 수 없다(detail-network.lib.ts와 같은 분리).
 */

/**
 * eventSections 한 배열 안에서 배경/전개/여파를 가르는 sectionType 태그.
 * 전개는 레거시 값이 'content'·'process'·'narrative'·null로 섞여 있어 *배경도 여파도
 * 아닌 것* 전부를 전개로 본다(새로 만드는 전개 단락만 'narrative'로 기록).
 *
 * ⚠️ 여파('aftermath')를 따로 가르지 않던 시절엔 시드가 쓴 여파 장(章) 90개(60사건)가
 * 전개 번호 단락 사이에 섞여 그려졌다 — 여파 섹션에는 요약(event.aftermath)만 나왔다.
 */
export const BACKGROUND_TYPE = 'background'
export const NARRATIVE_TYPE = 'narrative'
export const AFTERMATH_TYPE = 'aftermath'

export type SectionKind = 'background' | 'narrative' | 'aftermath'

export const sectionKindOf = (sectionType?: string | null): SectionKind =>
  sectionType === BACKGROUND_TYPE
    ? 'background'
    : sectionType === AFTERMATH_TYPE
      ? 'aftermath'
      : 'narrative'

export const isBackgroundSection = (sectionType?: string | null) =>
  sectionKindOf(sectionType) === 'background'

export interface SectionRow {
  /** 클라이언트 임시 키 — React 리스트 식별·child 컴포넌트 인스턴스 보존용. */
  key: string
  /**
   * 마지막으로 매핑된 서버 row id(있다면). 서버 저장이 id 자연키 머지로 바뀌어(D2) 이 id를
   * 다시 보내면 **같은 단락이 고쳐지고 id가 유지된다** — 단락이 가리키는 하위 사건이 살아남는다.
   */
  serverId?: string
  title: string
  content: string
  sectionType?: string
  /** 이 단락이 서술하는 하위 사건(D2). undefined=모름(보내지 않아 서버 값 유지) */
  subjectEventId?: string | null
}

/**
 * server 응답과 로컬 rows를 매핑한다. 핵심 목표는 **child 컴포넌트 키 보존**
 * — InlineText/InlineRichText는 자체 draft state를 들고 있어 key가 바뀌면 input이
 * unmount/remount되며 IME·커서·미저장 입력이 끊어진다.
 *
 * 매핑 전략(우선순위 순):
 *  1) **길이가 같을 때**: positional join. server[i] ↔ prev[i] 키 그대로 가져가고
 *     content/title은 *prev가 server보다 새로우면 prev 우선* — 즉, 사용자가 막 친
 *     값이 in-flight 응답(이전 상태 반영)으로 덮이지 않도록 한다. 동일성은
 *     "serverId가 같거나 prev의 serverId가 없으면 prev가 더 최신"으로 판정.
 *  2) **길이가 다를 때**: content-aware fallback. 동일한 (title, content, sectionType)
 *     이 있으면 키 보존. 아니면 새 row.
 *  3) 매칭 못한 prev row(아직 commit 안 된 빈 tail 등)는 끝에 append — 사용자 입력
 *     손실 방지.
 */
export function syncRowsWithServer(
  prev: SectionRow[],
  server: Array<{
    id: string
    title?: string | null
    content?: string | null
    sectionType?: string | null
    subjectEventId?: string | null
  }>,
  nextKey: () => string,
): SectionRow[] {
  // (1) 같은 길이 — positional join (race-safe).
  if (prev.length === server.length) {
    return server.map((section, index) => {
      const prevRow = prev[index]
      const serverTitle = section.title ?? ''
      const serverContent = section.content ?? ''
      const serverType = section.sectionType ?? undefined

      // prev가 in-flight 상태(아직 새 serverId 미수령)거나, 사용자가 친 값이 더 새
      // 보이면 prev 값을 유지. 그렇지 않으면 server 값 채택.
      const prevIsAhead =
        prevRow.serverId === undefined ||
        (prevRow.serverId !== section.id &&
          (prevRow.title !== serverTitle ||
            prevRow.content !== serverContent ||
            prevRow.sectionType !== serverType))

      if (prevIsAhead) {
        // prev 값 그대로 두고 serverId만 갱신.
        return { ...prevRow, serverId: section.id, subjectEventId: section.subjectEventId ?? null }
      }
      // server 값 채택 — 키 보존.
      return {
        key: prevRow.key,
        serverId: section.id,
        title: serverTitle,
        content: serverContent,
        sectionType: serverType,
        subjectEventId: section.subjectEventId ?? null,
      }
    })
  }

  // (2) 길이 불일치 — content-aware fallback.
  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: SectionRow[] = []

  for (const section of server) {
    const serverTitle = section.title ?? ''
    const serverContent = section.content ?? ''
    const serverType = section.sectionType ?? undefined
    // 우선 동일 serverId — drop-and-recreate라 보통 안 맞지만, 같은 응답 사이클에서
    // 이미 매핑된 row가 있다면 그쪽 우선.
    let matchedIdx = prev.findIndex(
      (row, index) => !prevUsed[index] && row.serverId === section.id,
    )
    if (matchedIdx < 0) {
      for (let index = 0; index < prev.length; index++) {
        if (prevUsed[index]) continue
        const row = prev[index]
        if (
          row.title === serverTitle &&
          row.content === serverContent &&
          row.sectionType === serverType
        ) {
          matchedIdx = index
          break
        }
      }
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push({ ...prev[matchedIdx], serverId: section.id, subjectEventId: section.subjectEventId ?? null })
    } else {
      next.push({
        key: nextKey(),
        serverId: section.id,
        title: serverTitle,
        content: serverContent,
        sectionType: serverType,
        subjectEventId: section.subjectEventId ?? null,
      })
    }
  }

  for (let index = 0; index < prev.length; index++) {
    if (!prevUsed[index]) next.push(prev[index])
  }

  return next
}

/**
 * 배경·전개·여파 세 묶음을 **하나의 eventSections 배열**로 직렬화한다.
 *
 * 서버는 PUT마다 eventSections를 통째로 delete-and-recreate하므로, 한 묶음만 보내면
 * 나머지가 통째로 사라진다 — 어떤 변경이든 항상 세 묶음을 합쳐 보낸다.
 * order는 배경 → 전개 → 여파 순 통산이고, 이 순서가 다음 GET의 분리·정렬을 되돌린다.
 *
 * 빈 row(title·content 모두 비어 있음)는 제외 — 사용자가 "+추가"만 누르고 아직 채우지
 * 않은 로컬 row가 서버로 새지 않게 한다. 반대로 title이 비어 있어도 content가 있으면
 * 그대로 보낸다(빈 제목을 placeholder 문자열로 강제 치환하지 않는다).
 */
export function mergeSectionPayload(
  backgroundRows: SectionRow[],
  narrativeRows: SectionRow[],
  aftermathRows: SectionRow[],
): Array<{
  id?: string
  title: string
  content: string
  order: number
  sectionType: string
  subjectEventId?: string | null
}> {
  /* id를 실어 보내면 서버가 그 단락을 고친다(id 유지) — 하위 사건 연결은 모를 때 싣지 않는다(3상) */
  const serialize = (rows: SectionRow[], fallbackType: string) =>
    rows
      .filter((row) => row.title.trim() || row.content.trim())
      .map((row) => ({
        ...(row.serverId ? { id: row.serverId } : {}),
        title: row.title.trim(),
        content: row.content,
        sectionType: row.sectionType ?? fallbackType,
        ...(row.subjectEventId !== undefined ? { subjectEventId: row.subjectEventId } : {}),
      }))

  return [
    ...serialize(backgroundRows, BACKGROUND_TYPE),
    ...serialize(narrativeRows, NARRATIVE_TYPE),
    ...serialize(aftermathRows, AFTERMATH_TYPE),
  ].map((section, index) => ({ ...section, order: index }))
}


/**
 * 단락 제목 끝의 시기 '(1945-1950)'·'(1870년 12월)'을 떼어 타임라인 날짜 줄로 올린다.
 * 괄호가 **연도(숫자)로 시작할 때만** — '(First Dymitriad, 1604~1606년)'처럼 이름이 앞선 괄호는
 * 제목의 일부라 건드리지 않는다. 실측 648개 제목 중 45개가 이 꼴이다. 읽기 표시 전용(저장값 불변).
 */
const TITLE_PERIOD = /\s*\(\s*((?:서기|기원전|BC|AD|B\.C\.|A\.D\.|약)?\s*\d[^()]*)\)\s*$/i

/**
 * 제목 가운데 대시·콜론 바로 앞의 괄호 시기 — '안세이 5개국 조약 (1858) — 카나가와에서 통상 조약으로',
 * '제1차 회담(8월 19일 저녁) — 의제 제시', '제1기(1700–1706): 스웨덴의 공세'.
 * '3번(三藩)'처럼 숫자가 아닌 괄호는 건드리지 않는다.
 */
const MID_PAREN_PERIOD =
  /^(.+?)\s*\(\s*((?:서기|기원전|BC|AD|B\.C\.|A\.D\.|약)?\s*(?:\d{3,4}(?:[년.~–—\-\s][^()]*)?|\d{1,2}\s*월[^()]*|\d{1,2}\s*[./\-]\s*\d{1,2}[^()]*))\)\s*([—–:]\s*.+)$/i

/**
 * 제목 앞·뒤(대시·콜론 뒤)에서 시점으로 인정하는 날짜·기간·시각·차수 표현.
 * - 연도 기반: '1870-04 ~ 1872-09의 약 2년 6개월', '1872~1880', '1853년 7월 8일 ~ 17일의 9일', '1970년대'
 * - 연도 생략 월·일·시각: '6월 21일 밤', '7월 17일~8월 2일 17일간', '6.25 ~ 9.15', '7-24', '02:00'
 * - 연대 범위·D-Day: '해방 이후 ~ 1970년대', '2010년대 ~ 현재', 'D-Day: 1950-06-25'
 */
const DATE_CORE =
  String.raw`(?:(?:서기|기원전|BC|AD|B\.C\.|A\.D\.|약)\s*)*(?:` +
  [
    String.raw`\d{3,4}(?:-\d{1,2}(?:-\d{1,2})?)?(?:\s*[~–—\-]\s*(?:현재|\d{1,4}(?:-\d{1,2}(?:-\d{1,2})?)?년?|\d{1,2}월(?:\s*\d{1,2}일)?))?(?:년대(?:\s*(?:초|중반|말|후반))?|년(?:\s*(?:말|초|중순|여름|봄|가을|겨울|\d{1,2}월(?:\s*(?:말|초|중순|\d{1,2}일(?:\s*[~–—\-]\s*(?:\d{1,2}월\s*)?\d{1,2}일)?|[~–—\-]\s*\d{1,2}월))?(?:\((?:음력|구력|신력|양력|현지)[^)]*\))?))?)?(?:\s*(?:부터|에서)\s*\d{3,4}년(?:\s*(?:봄|여름|가을|겨울|\d{1,2}월(?:\s*\d{1,2}일)?))?까지(?:\s*의\s*\d+년)?)?(?:\s*(?:새벽|오전|오후|저녁|밤|자정|정오)(?:\s*\d{1,2}시(?:\s*[~–—\-]\s*(?:정오|자정|\d{1,2}시))?)?)?(?:(?:\s*의\s*|\s+약\s*|\s*의\s*약\s*)(?:\d+\s*(?:년|개월|주|일간|일|시간|분)(?:\s+(?=\d))?)+)?`,
    String.raw`(?:1[0-2]|[1-9])월(?:\s*(?:말|초|중순|\d{1,2}일(?:\s*[~–—\-]\s*(?:\d{1,2}월\s*)?\d{1,2}일)?|[~–—\-]\s*(?:1[0-2]|[1-9])월))?(?:\s*(?:새벽|오전|오후|저녁|밤|자정|정오|\d+일간|의\s*\d+일))?`,
    String.raw`(?:1[0-2]|[1-9])[./](?:3[01]|[12]\d|0?[1-9])(?:\s*(?:저녁|밤|새벽|오전|오후|자정|정오))?(?:\s*[~–—\-]\s*(?:\d{3,4}\.)?(?:1[0-2]|[1-9])[./](?:3[01]|[12]\d|0?[1-9])?(?:\s*(?:저녁|밤|새벽|오전|오후|자정|정오))?)?`,
    String.raw`(?:1[0-2]|[1-9])-(?:3[01]|[12]\d|0?[1-9])(?:\s*[~–—\-]\s*(?:1[0-2]|[1-9])-(?:3[01]|[12]\d|0?[1-9]))?`,
    String.raw`\d{1,2}:\d{2}(?:\s*[~–—\-]\s*\d{1,2}:\d{2})?`,
    String.raw`(?:해방\s*이후\s*[~–—\-]\s*)?\d{3,4}년대(?:\s*(?:초|중반|말|후반))?(?:\s*[~–—\-]\s*(?:현재|\d{3,4}년대?))?`,
    String.raw`D-Day\s*[:：]\s*\d{4}-\d{2}-\d{2}`,
  ].join('|') +
  String.raw`)`

const BARE_PERIOD = new RegExp(String.raw`^(?:${DATE_CORE}|제?\s*\d+\s*(?:단계|차|기))$`, 'i')

/**
 * 제목 **앞**의 날짜 — '1997년 7월 8일 NATO 초청'·'1872-10-14 개통식'·'1970년대: 투기꾼'·'7-24 원폭 통보'·'4-12 1차 무스카트'.
 * 날짜 뒤에 공백이나 구분 기호가 와야 한다 — '1949년의 위기'처럼 낱말에 붙은 연도는 제목의 일부다.
 */
const LEADING_PERIOD = new RegExp(
  String.raw`^(?:(\d+(?:\.\d+)*\.\s+))?(${DATE_CORE})(?:(\s*[:：—–,]\s*)|\s+)(\S.+)$`,
  'i',
)

/** '1단계: 선전포고와 성지의 파괴'·'1차 — 방공망 무력화'처럼 단계·차수가 구분 기호와 함께 앞서는 제목 */
const STAGE_PREFIX = /^(?:(\d+(?:\.\d+)*\.\s+))?(제?\s*\d+\s*(?:단계|차|기))\s*[:：—–]\s*(\S.+)$/i

/**
 * 대시·콜론 **뒤 전체**가 날짜·기간인 제목 —
 * '부설 공사 — 1870-04 ~ 1872-09의 약 2년 6개월', '1차 내항 — 1853년 7월 8일 ~ 17일의 9일', '발령 경위: 6월 21일 밤'.
 */
const TRAILING_FULL_PERIOD = new RegExp(
  String.raw`^(.+?)\s*(?:[—–]|[:：])\s*(${DATE_CORE})\s*$`,
  'i',
)

/**
 * 대시 바로 뒤에 날짜가 오고 그 뒤에 짧은 설명이 이어지는 제목 —
 * '통합과 칙허 — 1602-03-20 의회 칙허', '발발과 초기 남진 — 6.25 ~ 9.15 부산교두보의 11주'.
 */
const TRAILING_PREFIX_PERIOD = new RegExp(
  String.raw`^(.+?)\s*([—–])\s*(${DATE_CORE})\s+([가-힣A-Za-z].+)$`,
  'i',
)

const HEADING_PATTERN = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi

const headingText = (inner: string) =>
  inner
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const escapeHtmlText = (raw: string) =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const unwrapOuterParens = (raw: string) => {
  const trimmed = raw.trim()
  const fullParen = /^\(\s*([^()]+?)\s*\)$/.exec(trimmed)
  if (fullParen) return fullParen[1].trim()
  const leadingParenSep = /^\(\s*([^()]+?)\s*\)\s*[:：—–]\s*(.+)$/.exec(trimmed)
  if (leadingParenSep) return `${leadingParenSep[1].trim()} — ${leadingParenSep[2].trim()}`
  return trimmed
}

const cleanStepTitle = (raw: string) =>
  raw
    .replace(/^\d+(?:\.\d+)*\.(?:\s+|(?=[가-힣A-Za-z"'“‘\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]))/u, '')
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}•·]\s*/u, '')
    .trim()

const conciseClause = (raw: string) => {
  let text = raw.trim().replace(/\s+[—–]\s+.*$/, '')
  const sentence = /^([^.]{2,60}?(?:다|함|됨|음|임))(?:\.\s+|\.$)/.exec(text)
  if (sentence) text = sentence[1]
  else {
    const dot = /^([^.]{2,55})\.\s+/.exec(text)
    if (dot) text = dot[1]
  }
  text = text.replace(/\.$/, '').trim()
  if (text.length > 48) text = `${text.slice(0, 46).trim()}…`
  return text
}

const pad2 = (n: string) => n.padStart(2, '0')

/**
 * 타임라인 시점 열에 맞춘 숫자형 축약 라벨 —
 * '1870-04 ~ 1872-09의 약 2년 6개월' → '1870.04–1872.09', '1605년 1월 31일' → '1605.01.31',
 * '4-12' → '04.12'처럼 들쭉날쭉한 날짜 표기를 균일한 숫자 점(YYYY.MM.DD) 형식으로 정돈한다(원문·splitTitlePeriod 계약은 불변).
 */
export function compactTimelinePeriod(period: string | null | undefined): string | null {
  if (!period) return null
  let s = period
    .trim()
    .replace(/^D-Day\s*[:：]\s*/i, '')
    .replace(/\s*\((?:음력|구력|신력|양력|현지)[^)]*\)/g, '')
    .replace(/(?<=\d(?:년|월|일|\d))(?:\s*의\s*약?\s*|\s+약\s+|\s+)(?:\d+\s*(?:년|개월|주|일간|시간|분)\s*|\d+\s*일\s*)+$/g, (match, offset, full: string) =>
      /의|약|개월|주|일간|시간|분/.test(match) && !/\d월\s*$/.test(full.slice(0, offset)) ? '' : match,
    )
    .trim()

  s = s.replace(/(\d{3,4})년\s*(\d{1,2})월\s*(\d{1,2})일/g, (_, y: string, m: string, d: string) => `${y}.${pad2(m)}.${pad2(d)}`)
  s = s.replace(/(\d{3,4})년\s*(\d{1,2})월/g, (_, y: string, m: string) => `${y}.${pad2(m)}`)
  s = s.replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (_, y: string, m: string, d: string) => `${y}.${pad2(m)}.${pad2(d)}`)
  s = s.replace(/\b(\d{4})-(0[1-9]|1[0-2])\b(?!-\d)/g, (_, y: string, m: string) => `${y}.${pad2(m)}`)
  s = s.replace(/(?<!\d\.)(\d{1,2})월\s*(\d{1,2})일/g, (_, m: string, d: string) => `${pad2(m)}.${pad2(d)}`)
  s = s.replace(/(?<=\d)\s*[~–—-]\s*(\d{1,2})월/g, (_, m: string) => `–${pad2(m)}`)
  s = s.replace(/(?<=\d)\s*[~–—-]\s*(\d{1,2})일/g, (_, d: string) => `–${pad2(d)}`)
  s = s.replace(/(?<![.\d])(1[0-2]|[1-9])[-./](3[01]|[12]\d|0?[1-9])(?![.\d])/g, (_, m: string, d: string) => `${pad2(m)}.${pad2(d)}`)
  s = s.replace(/(?<=\d)\s*[~–—-]\s*(?=\d)/g, '–')
  s = s.replace(/^((?:기원전\s*|BC\s*)?\d{3,4}(?:–\d{1,4})?)년$/i, '$1')

  return s.trim() || period.trim()
}

export interface TimelineSubStep {
  id: string
  period: string | null
  title: string
}

/** 단락 본문의 소제목 — 목차가 긴 단락 안까지 가리키게 한다. 빈 소제목은 번호를 받지 않는다 */
export function extractProseHeadings(
  html: string | null | undefined,
  anchorId: string,
): Array<{ id: string; label: string }> {
  const headings: Array<{ id: string; label: string }> = []
  for (const match of (html ?? '').matchAll(HEADING_PATTERN)) {
    const label = headingText(match[2])
    if (label) headings.push({ id: `${anchorId}-h${headings.length + 1}`, label })
  }
  return headings
}

const STANDALONE_BLOCK_PATTERN = /<(p|div|figcaption)\b([^>]*)>((?:(?!<\/?\1\b)[\s\S])*?)<\/\1>/gi

function isStandaloneBoldInner(inner: string): string | null {
  const stripped = inner
    .replace(/<\/?(?:span|font)\b[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  const boldMatch = /^<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>$/i.exec(stripped)
  if (!boldMatch || /<(?:b|strong)\b/i.test(boldMatch[1])) return null
  const text = headingText(boldMatch[1])
  if (!text || text.length < 3 || text.length > 72) return null
  if (/[다요]\.$/.test(text) || /^["“]/.test(text) || /^💡/.test(text) || /^\[.+\]$/.test(text)) return null
  return text
}

function extractStandaloneBoldHeadings(html: string): string[] {
  const out: string[] = []
  const leadingBold = /^\s*<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>\s*(?=<(?:div|p|ul|ol)\b)/i.exec(html)
  if (leadingBold) {
    const text = headingText(leadingBold[1])
    if (text && text.length >= 3 && text.length <= 72 && !/[다요]\.$/.test(text)) out.push(text)
  }
  for (const match of html.matchAll(STANDALONE_BLOCK_PATTERN)) {
    const text = isStandaloneBoldInner(match[3])
    if (text) out.push(text)
  }
  return out
}

const LIST_BLOCK_PATTERN = /<(ul|ol)\b([^>]*)>([\s\S]*?)<\/\1>/gi
const LIST_ITEM_PATTERN = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi

function parseLiTimelineStep(rawInner: string): { period: string | null; title: string } | null {
  let plain = headingText(rawInner)
  if (!plain) return null
  plain = plain.replace(/^\d+\.\s+/, '').replace(/^\(\d[^()]*\)\s*(?=\d)/, '')
  const colon = /^(?!D-Day\s*[:：])(.+?)\s*[:：]\s+([\s\S]+)$/i.exec(plain)
  if (colon) {
    const head = colon[1].trim()
    const tail = colon[2].trim()
    if (BARE_PERIOD.test(head)) {
      const title = cleanStepTitle(conciseClause(tail))
      return title ? { period: head, title } : null
    }
    if (head.length <= 48) {
      const split = splitTitlePeriod(head)
      const title = cleanStepTitle(split.title) || split.title
      return title ? { period: split.period, title } : null
    }
    return null
  }
  const split = splitTitlePeriod(plain)
  if (split.period) {
    const title = cleanStepTitle(conciseClause(split.title)) || split.title
    return title ? { period: split.period, title } : null
  }
  return null
}

function extractParagraphTimelineSteps(html: string): Array<{ period: string | null; title: string }> {
  const out: Array<{ period: string | null; title: string }> = []
  for (const match of html.matchAll(STANDALONE_BLOCK_PATTERN)) {
    const plain = headingText(match[3])
    if (!plain || plain.length < 6) continue
    const labelColon = /^(?!D-Day\s*[:：])([가-힣A-Za-z·\s]{2,16})\s*[:：]\s+([\s\S]+)$/i.exec(plain)
    if (labelColon) {
      const head = labelColon[1].trim()
      const title = cleanStepTitle(conciseClause(labelColon[2]))
      if (title) {
        out.push({ period: head, title })
        continue
      }
    }
    const split = splitTitlePeriod(plain)
    if (split.period) {
      const title = cleanStepTitle(conciseClause(split.title))
      if (title) out.push({ period: split.period, title })
    }
  }
  return out
}

/**
 * 전개(timeline) 줄여 보기용 서브 마디 추출.
 *
 * 실DB 단일 사건 전개의 64건(1단락 사건) 중 `<h2>~<h4>` 소제목이 있는 것은 15건뿐이고,
 * 31건은 `<ul>/<ol><li>`(`4-12 1차 무스카트: ...`, `11-27 알레포 진군: ...`)나 단독 굵은 줄(`<p><b>1단계: ...</b></p>`)로
 * 시간 단계를 적었다. 소제목이 없을 때 이 단계들도 시기+제목 마디로 뽑아 1단락 사건도 타임라인 축으로 읽히게 한다.
 */
export function extractTimelineSteps(
  html: string | null | undefined,
  anchorId: string,
): TimelineSubStep[] {
  const source = html ?? ''
  const proseHeadings = extractProseHeadings(source, anchorId)
  if (proseHeadings.length > 0) {
    return proseHeadings.map((heading) => {
      const split = splitTitlePeriod(heading.label)
      return {
        id: heading.id,
        period: split.period,
        title: cleanStepTitle(split.title) || split.title,
      }
    })
  }

  const boldHeadings = extractStandaloneBoldHeadings(source)
  if (boldHeadings.length >= 2) {
    return boldHeadings.map((label, index) => {
      const split = splitTitlePeriod(label)
      return {
        id: `${anchorId}-s${index + 1}`,
        period: split.period,
        title: cleanStepTitle(split.title) || split.title,
      }
    })
  }

  const liSteps: Array<{ period: string | null; title: string }> = []
  for (const match of source.matchAll(LIST_ITEM_PATTERN)) {
    const parsed = parseLiTimelineStep(match[2])
    if (parsed) liSteps.push(parsed)
  }
  if (liSteps.length >= 2) {
    return liSteps.map((step, index) => ({
      id: `${anchorId}-s${index + 1}`,
      period: step.period,
      title: step.title,
    }))
  }

  const paragraphSteps = extractParagraphTimelineSteps(source)
  if (paragraphSteps.length >= 2) {
    return paragraphSteps.map((step, index) => ({
      id: `${anchorId}-s${index + 1}`,
      period: step.period,
      title: step.title,
    }))
  }

  return []
}

/**
 * 본문 목록(`<ul>`·`<ol>`) 안의 시간순 불릿 — `<li>` 2개 이상이 날짜·시각·차수로 시작하면
 * 타임라인 서브 목록(`data-type="tl-list"`)으로 표시해 산문 안에서도 시간의 흐름이 읽히게 한다.
 */
const TIMELINE_LI_LEADING =
  /^\s*(?:<(?:strong|b)>\s*|\*\s*)?((?:(?:서기|기원전|BC|AD|약)\s*)?(?:\d{3,4}(?:[-./~–—]\d{1,4}(?:[-./]\d{1,2})?|년(?:\s*\d{1,2}월(?:\s*\d{1,2}일)?)?)?|(?:1[0-2]|[1-9])[-./](?:3[01]|[12]\d|0?[1-9])(?:\s*[~–—]\s*(?:1[0-2]|[1-9])?[-./]?(?:3[01]|[12]\d|0?[1-9]))?(?:\s+\d{1,2}:\d{2})?|(?:1[0-2]|[1-9])월\s*\d{1,2}일(?:\s*[~–—]\s*(?:\d{1,2}월\s*)?\d{1,2}일)?|\d{1,2}:\d{2}(?:\s*[~–—]\s*\d{1,2}:\d{2})?)(?:\s+(?:제?\d+차(?:\s+[가-힣A-Za-z]+)?|\([^)]+\)))?)(?:\s*<\/(?:strong|b)>|\s*\*)?(?:\s*[:：—–]\s*|\s+)(?=\S)/i

export function decorateTimelineProseLists(html: string): string {
  return html.replace(LIST_BLOCK_PATTERN, (wholeList, listTag: string, listAttrs: string, listInner: string) => {
    const items = [...listInner.matchAll(LIST_ITEM_PATTERN)]
    if (items.length < 2) return wholeList
    let matchedCount = 0
    for (const item of items) {
      const plain = headingText(item[2])
      if (TIMELINE_LI_LEADING.test(plain)) matchedCount += 1
    }
    if (matchedCount < 2) return wholeList

    const nextInner = listInner.replace(LIST_ITEM_PATTERN, (wholeLi, liAttrs: string, liInner: string) => {
      const match = TIMELINE_LI_LEADING.exec(liInner)
      if (!match) return wholeLi
      const timeLabel = headingText(match[1])
      if (!timeLabel) return wholeLi
      const rest = liInner.slice(match[0].length).trim()
      if (!rest) return wholeLi
      return `<li${liAttrs} data-type="tl-item"><span data-type="tl-time">${escapeHtmlText(timeLabel)}</span><span data-type="tl-text">${rest}</span></li>`
    })
    return `<${listTag}${listAttrs} data-type="tl-list">${nextInner}</${listTag}>`
  })
}

/** 읽기 HTML의 소제목에 앵커를 단다(저장값 불변) — 번호는 extractProseHeadings/extractTimelineSteps와 같은 규칙 */
export function addHeadingAnchors(
  html: string,
  anchorId: string,
  options?: { timeline?: boolean },
): string {
  let ordinal = 0
  const withHeadings = html.replace(HEADING_PATTERN, (whole, level: string, inner: string) => {
    const plain = headingText(inner)
    if (!plain) return whole
    ordinal += 1
    const id = `${anchorId}-h${ordinal}`
    if (!options?.timeline) {
      return `<h${level} id="${id}">${inner}</h${level}>`
    }
    const { period, title: strippedTitle } = splitTitlePeriod(plain)
    if (period && strippedTitle && strippedTitle !== plain) {
      const hasNestedTags = /<(?:a|span|font)\b/i.test(inner)
      const bodyHtml = hasNestedTags ? inner : escapeHtmlText(strippedTitle)
      return `<h${level} id="${id}" data-type="tl-heading"><span data-type="tl-period">${escapeHtmlText(period)}</span><span>${bodyHtml}</span></h${level}>`
    }
    return `<h${level} id="${id}" data-type="tl-heading">${inner}</h${level}>`
  })
  if (!options?.timeline) return withHeadings

  let decorated = decorateTimelineProseLists(withHeadings)
  if (ordinal === 0) {
    const boldHeadings = extractStandaloneBoldHeadings(decorated)
    if (boldHeadings.length >= 2) {
      let stepIdx = 0
      decorated = decorated.replace(
        /^\s*<(b|strong)\b([^>]*)>([\s\S]*?)<\/\1>(?=\s*<(?:div|p|ul|ol)\b)/i,
        (whole, tag: string, attrs: string, inner: string) => {
          const text = headingText(inner)
          if (text && text.length >= 3 && text.length <= 72 && !/[다요]\.$/.test(text)) {
            stepIdx += 1
            return `<${tag}${attrs} id="${anchorId}-s${stepIdx}">${inner}</${tag}>`
          }
          return whole
        },
      )
      decorated = decorated.replace(STANDALONE_BLOCK_PATTERN, (whole, tag: string, attrs: string, inner: string) => {
        if (!isStandaloneBoldInner(inner)) return whole
        stepIdx += 1
        return `<${tag}${attrs} id="${anchorId}-s${stepIdx}">${inner}</${tag}>`
      })
    } else {
      let stepIdx = 0
      decorated = decorated.replace(LIST_ITEM_PATTERN, (whole, attrs: string, inner: string) => {
        if (!parseLiTimelineStep(inner)) return whole
        stepIdx += 1
        return `<li${attrs} id="${anchorId}-s${stepIdx}">${inner}</li>`
      })
    }
  }
  return decorated
}

export function splitTitlePeriod(title: string): { title: string; period: string | null } {
  const match = TITLE_PERIOD.exec(title)
  if (match && match.index !== 0) {
    return { title: unwrapOuterParens(title.slice(0, match.index)), period: match[1].trim() }
  }

  const trimmed = title.trim()
  const mid = MID_PAREN_PERIOD.exec(trimmed)
  if (mid) return { title: `${mid[1].trim()} ${mid[3].trim()}`, period: mid[2].trim() }

  const trailingFull = TRAILING_FULL_PERIOD.exec(trimmed)
  if (trailingFull) {
    const candidate = trailingFull[2].trim()
    if (!/^\d{1,2}$/.test(candidate)) {
      return { title: trailingFull[1].trim(), period: candidate }
    }
  }

  const trailingPrefix = TRAILING_PREFIX_PERIOD.exec(trimmed)
  if (trailingPrefix) {
    const candidate = trailingPrefix[3].trim()
    const rest = trailingPrefix[4].trim()
    if (
      !/^\d{1,4}$/.test(candidate) &&
      !/^(?:의|에|로|부터|에서)\b/.test(rest) &&
      !/부터\s*\d/.test(rest) &&
      !/^과\s+\d{4}/.test(rest)
    ) {
      return {
        title: `${trailingPrefix[1].trim()} ${trailingPrefix[2]} ${rest}`,
        period: candidate,
      }
    }
  }

  const leading = LEADING_PERIOD.exec(trimmed)
  if (leading) {
    const numPrefix = leading[1] ?? ''
    const candidate = leading[2].trim()
    const explicitSep = Boolean(leading[3])
    const rest = unwrapOuterParens(leading[4].trim())
    const isBareYearWithoutSep = /^\d{3,4}$/.test(candidate) && !explicitSep
    const startsWithConjunctionYear = /^(?:과|와)\s+\d/.test(rest)
    const isMultiYearHeadline = /^\d{3,4}년$/.test(candidate) && /\b\d{4}년/.test(rest) && !explicitSep
    if (!isBareYearWithoutSep && !startsWithConjunctionYear && !isMultiYearHeadline) {
      return { title: `${numPrefix}${rest}`.trim(), period: candidate }
    }
  }

  const stage = STAGE_PREFIX.exec(trimmed)
  if (stage) {
    const numPrefix = stage[1] ?? ''
    return {
      title: `${numPrefix}${unwrapOuterParens(stage[3])}`.trim(),
      period: stage[2].replace(/\s+/g, ''),
    }
  }

  return { title, period: null }
}

/* ───────────────────────── 긴 배경 줄여 보기 ───────────────────────── */

/**
 * 이 글자수를 넘는 배경은 '줄여 보기'를 쓸 수 있다(요약 + 단락 제목만).
 * 실DB 504건 중 배경 있는 161건의 중앙값이 1,184자(본문 880px·15.5px에서 약 600px, 한 화면 남짓) —
 * 그보다 긴 배경(78건)부터 전개를 화면 아래로 밀어낸다.
 */
export const LONG_BACKGROUND_CHARS = 1200
/** 줄여 보기에서 요약을 몇 줄로 자를지 판정하는 글자수 — 이보다 짧으면 요약은 자르지 않는다 */
export const LEAD_CLAMP_CHARS = 240

/** 태그·엔티티를 걷어낸 글자수 — 길이 판정용(화면 측정은 content-visibility 추정 높이에 속는다) */
export function plainTextLength(html?: string | null): number {
  if (!html) return 0
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, '_')
    .replace(/\s+/g, ' ')
    .trim().length
}

/** 배경 전체(요약 + 번호 단락 제목·본문)의 글자수 */
export function backgroundLength(
  leadHtml: string | null | undefined,
  rows: ReadonlyArray<{ title?: string | null; content?: string | null }>,
): number {
  return rows.reduce(
    (sum, row) => sum + plainTextLength(row.title) + plainTextLength(row.content),
    plainTextLength(leadHtml),
  )
}

/**
 * 처음 열었을 때 배경을 줄여 둘까.
 *
 * 길기만 해서는 안 된다 — 긴 배경 48건(2,500자↑) 중 13건은 전개·여파가 **둘 다 없어** 배경이 곧
 * 본문 전부다. 그걸 줄이면 읽을 것을 숨긴다. 뒤에 읽을 본문(전개·여파·하위 사건)이 있을 때만 줄인다 —
 * 배경이 전개를 화면 아래로 밀어내는 게 줄여 보기가 푸는 문제다.
 */
export function shouldCollapseBackground(input: {
  length: number
  hasFollowingContent: boolean
}): boolean {
  return input.length > LONG_BACKGROUND_CHARS && input.hasFollowingContent
}

/**
 * 전개·여파의 처음 접힘 — 배경과 달리 '뒤에 본문이 있나'를 보지 않는다(전개는 본론, 여파는 끝이라).
 * 전개는 본론이라 아주 길 때만(5,000자 초과 29건 — 일본 최초 철도 전개 16,267px), 여파는 2,500자 초과(36건).
 * 그보다 짧아도 1,200자를 넘으면 '줄여 보기' 버튼은 늘 있다.
 */
export const LONG_NARRATIVE_CHARS = 5000
export const LONG_AFTERMATH_CHARS = 2500

export function shouldCollapseLongSection(kind: 'narrative' | 'aftermath', length: number): boolean {
  return length > (kind === 'narrative' ? LONG_NARRATIVE_CHARS : LONG_AFTERMATH_CHARS)
}
