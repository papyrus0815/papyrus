/**
 * '하위 사건으로 나누기'(단일 → 묶음)의 **순수 로직** — 행 초기값·날짜 해석·전송 형태.
 *
 * 서버 계약(POST /events/:id/split): 전개 단락 **전부**의 행선지를 받는다. 하나라도 빠지면 400.
 * 날짜는 상세 PUT과 같은 ISO 규약(BC는 음수 연도) + 정밀도.
 */
import { splitTitlePeriod } from './narrative-sections.lib'

export type SplitTarget = 'CHILD' | 'BACKGROUND' | 'AFTERMATH' | 'DROP'

export interface SplitRow {
  sectionId: string
  /** 원래 단락 제목 */
  sectionTitle: string
  /** 단락이 이미 가리키는 하위 사건 — 있으면 새로 만들지 않고 그 사건으로 옮긴다 */
  subjectEventId?: string | null
  to: SplitTarget
  /** 새 하위 사건 제목 */
  title: string
  /** 사용자가 적은 날짜 — '1854', '1854-11', '1854-11-05', 'BC 480' */
  start: string
  end: string
}

export interface ParsedDate {
  iso: string
  precision: 'year' | 'month' | 'day'
}

const DATE_TEXT = /^(?:(BC|B\.C\.|기원전|-)\s*)?(\d{1,4})(?:\s*[-./년]\s*(\d{1,2})(?:\s*[-./월]\s*(\d{1,2}))?)?\s*(?:일|년|월)?$/i

/** 사람이 적은 날짜 한 칸 → ISO + 정밀도. 빈 칸은 null, 못 읽으면 undefined. */
export function parseDateText(text: string): ParsedDate | null | undefined {
  const trimmed = text.trim()
  if (!trimmed) return null
  const match = DATE_TEXT.exec(trimmed)
  if (!match) return undefined
  const [, bcMark, yearText, monthText, dayText] = match
  const year = parseInt(yearText, 10)
  const month = monthText ? parseInt(monthText, 10) : null
  const day = dayText ? parseInt(dayText, 10) : null
  if (year < 1 || (month != null && (month < 1 || month > 12)) || (day != null && (day < 1 || day > 31))) {
    return undefined
  }
  const pad = (value: number) => String(value).padStart(2, '0')
  const iso = `${bcMark ? '-' : ''}${year}-${pad(month ?? 1)}-${pad(day ?? 1)}`
  return { iso, precision: day != null ? 'day' : month != null ? 'month' : 'year' }
}

/**
 * 단락 제목 끝 괄호의 시기 '(1700–1706)'·'(1876년 8월)'를 날짜 두 칸으로 미리 채운다.
 * 제목은 괄호를 뗀 것을 새 하위 사건 제목 초안으로 쓴다.
 */
export function draftFromSectionTitle(sectionTitle: string): { title: string; start: string; end: string } {
  const { title, period } = splitTitlePeriod(sectionTitle)
  if (!period) return { title: sectionTitle.trim(), start: '', end: '' }
  const [startText, endText = ''] = period.split(/\s*[~–—]\s*|\s+-\s+/)
  const canonical = (part: string): string => {
    const parsed = parseDateText(part.replace(/[년월일]\s*$/, '').trim())
    if (!parsed) return ''
    const [sign, body] = parsed.iso.startsWith('-') ? ['BC ', parsed.iso.slice(1)] : ['', parsed.iso]
    const [year, month, day] = body.split('-')
    const kept = parsed.precision === 'year' ? [year] : parsed.precision === 'month' ? [year, month] : [year, month, day]
    return sign + kept.join('-')
  }
  return { title: title.trim(), start: canonical(startText), end: endText ? canonical(endText) : '' }
}

export function initialSplitRows(
  sections: ReadonlyArray<{ id: string; title?: string | null; subjectEventId?: string | null }>,
): SplitRow[] {
  return sections.map((section) => {
    const draft = draftFromSectionTitle(section.title ?? '')
    return {
      sectionId: section.id,
      sectionTitle: section.title ?? '',
      subjectEventId: section.subjectEventId ?? null,
      to: 'CHILD',
      ...draft,
    }
  })
}

/** 행 하나의 입력 오류 — 없으면 null */
export function rowError(row: SplitRow): string | null {
  if (row.to !== 'CHILD' || row.subjectEventId) return null
  if (!row.title.trim()) return '하위 사건 제목을 적어 주세요'
  if (parseDateText(row.start) === undefined) return '시작 날짜를 읽을 수 없습니다 (예: 1854, 1854-11-05, BC 480)'
  if (parseDateText(row.end) === undefined) return '끝 날짜를 읽을 수 없습니다'
  return null
}

export interface SplitPayloadEntry {
  sectionId: string
  to: SplitTarget
  title?: string
  startDate?: string
  startDatePrecision?: 'year' | 'month' | 'day'
  endDate?: string
  endDatePrecision?: 'year' | 'month' | 'day'
}

export function buildSplitPayload(rows: SplitRow[]): SplitPayloadEntry[] {
  return rows.map((row) => {
    if (row.to !== 'CHILD' || row.subjectEventId) return { sectionId: row.sectionId, to: row.to }
    const start = parseDateText(row.start)
    const end = parseDateText(row.end)
    return {
      sectionId: row.sectionId,
      to: 'CHILD',
      title: row.title.trim(),
      ...(start ? { startDate: start.iso, startDatePrecision: start.precision } : {}),
      ...(end ? { endDate: end.iso, endDatePrecision: end.precision } : {}),
    }
  })
}

/** 바닥 요약 — '하위 3 · 배경 1 · 버리기 1' */
export function summarizeRows(rows: SplitRow[]): string {
  const counts = { CHILD: 0, BACKGROUND: 0, AFTERMATH: 0, DROP: 0 }
  for (const row of rows) counts[row.to] += 1
  return [
    counts.CHILD > 0 && `하위 사건 ${counts.CHILD}`,
    counts.BACKGROUND > 0 && `배경 ${counts.BACKGROUND}`,
    counts.AFTERMATH > 0 && `여파 ${counts.AFTERMATH}`,
    counts.DROP > 0 && `버리기 ${counts.DROP}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
