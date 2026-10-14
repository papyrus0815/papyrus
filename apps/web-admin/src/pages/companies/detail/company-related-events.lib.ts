/**
 * 기업 ↔ 사건 연결 표시 규약 — 개요 '관련 사건'과 연혁 타임라인의 사건 노드가 함께 쓴다.
 * (두 파일이 서로를 import하면 순환이 생겨 여기로 뺐다.)
 */
import type { MouseEvent } from 'react'

import type { CompanyEventRole, CompanyRelatedEvent } from '@/shared/api/company'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal/country-inline-modal'

/** 역할 라벨·색 — 선택지 순서도 이 객체의 키 순서를 따른다(자주 쓰는 것부터) */
export const COMPANY_EVENT_ROLE_META: Record<CompanyEventRole, { label: string; tone: string }> =
  {
    PRINCIPAL: { label: '주체', tone: '#2563eb' },
    FOUNDED: { label: '설립', tone: '#16a34a' },
    PARTICIPANT: { label: '참여', tone: '#0891b2' },
    ACQUIRER: { label: '인수', tone: '#7c3aed' },
    ACQUIRED: { label: '피인수', tone: '#9333ea' },
    BENEFICIARY: { label: '수혜', tone: '#65a30d' },
    VICTIM: { label: '피해', tone: '#dc2626' },
    CONTRACTOR: { label: '시공', tone: '#0d9488' },
    DISSOLVED: { label: '해산', tone: '#64748b' },
    OTHER: { label: '기타', tone: '#64748b' },
  }

export const COMPANY_EVENT_ROLE_ORDER = Object.keys(
  COMPANY_EVENT_ROLE_META,
) as CompanyEventRole[]

/** 부호 연도·월·일 → '1989년 8월 8일' / '기원전 44년' */
export function relatedEventDateLabel(event: CompanyRelatedEvent): string | null {
  if (event.startYear == null) return null
  const year =
    event.startYear < 0 ? `기원전 ${-event.startYear}년` : `${event.startYear}년`
  if (event.startMonth == null) return year
  if (event.startDay == null) return `${year} ${event.startMonth}월`
  return `${year} ${event.startMonth}월 ${event.startDay}일`
}

/**
 * 사건 날짜를 연혁의 occurredAt과 같은 모양(YYYY-MM-DD)으로 — 타임라인 정렬·연도 표지용.
 * 모르는 월·일은 1로 채운다(연혁의 '년만' 저장 규약과 같다). 연도가 없으면 null.
 */
export function relatedEventIsoDate(event: CompanyRelatedEvent): string | null {
  if (event.startYear == null) return null
  const year = String(Math.abs(event.startYear)).padStart(4, '0')
  const month = String(event.startMonth ?? 1).padStart(2, '0')
  const day = String(event.startDay ?? 1).padStart(2, '0')
  return `${event.startYear < 0 ? '-' : ''}${year}-${month}-${day}`
}

/** 정밀도 — 연혁 행과 같은 이름(year·month·day) */
export function relatedEventPrecision(event: CompanyRelatedEvent): 'year' | 'month' | 'day' {
  if (event.startMonth == null) return 'year'
  if (event.startDay == null) return 'month'
  return 'day'
}

/** 제목 비교용 정규화 — 공백·문장부호를 걷고 소문자로 */
const normalizeTitle = (title: string) =>
  title.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')

/**
 * 연혁 행과 사건이 같은 사실인가 — 같은 날짜(연혁 정밀도까지)이고 제목이 같거나 한쪽이 다른 쪽을 품을 때.
 * 같으면 타임라인에 사건 노드를 따로 그리지 않고 연혁 행에 '사건' 링크만 붙인다(이중 표기 방지, 검토 F5).
 */
export function isSameFact(
  row: { title: string; occurredAt: string | null; occurredAtPrecision: 'year' | 'month' | 'day' | null },
  event: CompanyRelatedEvent,
): boolean {
  const eventDate = relatedEventIsoDate(event)
  if (!row.occurredAt || !eventDate) return false
  const length =
    row.occurredAtPrecision === 'year' ? 4 : row.occurredAtPrecision === 'month' ? 7 : 10
  if (row.occurredAt.slice(0, length) !== eventDate.slice(0, length)) return false
  const left = normalizeTitle(row.title)
  const right = normalizeTitle(event.title)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

/** 사건 미리보기 모달에 넘길 것 — 어느 사건인지 + 이 기업의 역할 */
export interface EventPreviewRequest {
  eventId: string
  role?: string | null
  note?: string | null
}

/**
 * 사건 링크의 클릭 가로채기 — 평범한 왼쪽 클릭이면 페이지 이동 대신 미리보기 모달을 연다.
 * Ctrl/⌘·Shift·가운데 클릭은 그대로 두어 새 탭 열기가 살아 있다(href는 링크에 남긴다).
 */
export function previewOnClick(
  onEventClick: ((request: EventPreviewRequest) => void) | undefined,
  request: EventPreviewRequest,
) {
  return (clickEvent: MouseEvent<HTMLElement>) => {
    if (!onEventClick || !shouldInterceptEntityClick(clickEvent)) return
    clickEvent.preventDefault()
    onEventClick(request)
  }
}

/** 관련 사건 → 미리보기 요청(역할 라벨을 붙여서) */
export function previewRequestOf(event: CompanyRelatedEvent): EventPreviewRequest {
  const meta = COMPANY_EVENT_ROLE_META[event.role] ?? COMPANY_EVENT_ROLE_META.OTHER
  return { eventId: event.eventId, role: meta.label, note: event.roleDescription }
}
