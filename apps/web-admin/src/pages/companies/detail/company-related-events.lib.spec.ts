import type { CompanyRelatedEvent } from '@/shared/api/company'

import { isSameFact, relatedEventIsoDate, relatedEventPrecision } from './company-related-events.lib'

const event = (patch: Partial<CompanyRelatedEvent>): CompanyRelatedEvent => ({
  relationId: 'r',
  eventId: 'e',
  title: '국영 가스 콘체른 가스프롬 출범',
  role: 'FOUNDED',
  roleDescription: null,
  startYear: 1989,
  startMonth: 8,
  startDay: 8,
  domain: 'ECONOMY',
  ...patch,
})

describe('company-related-events.lib', () => {
  it('사건 날짜를 연혁과 같은 YYYY-MM-DD로, 모르는 월·일은 1', () => {
    expect(relatedEventIsoDate(event({}))).toBe('1989-08-08')
    expect(relatedEventIsoDate(event({ startMonth: null, startDay: null }))).toBe('1989-01-01')
    expect(relatedEventIsoDate(event({ startYear: -44, startMonth: 3, startDay: 15 }))).toBe('-0044-03-15')
    expect(relatedEventPrecision(event({ startDay: null }))).toBe('month')
  })

  it('같은 날·같은 제목이면 같은 사실(공백·부호 무시)', () => {
    const row = { title: '국영 가스 콘체른 "가스프롬" 출범', occurredAt: '1989-08-08T00:00:00.000Z', occurredAtPrecision: null }
    expect(isSameFact(row, event({}))).toBe(true)
  })

  it('한쪽 제목이 다른 쪽을 품어도 같은 사실', () => {
    const row = { title: '가스프롬 출범', occurredAt: '1989-08-08', occurredAtPrecision: null }
    expect(isSameFact(row, event({}))).toBe(true)
  })

  it('날짜가 다르거나 제목이 다르면 다른 사실', () => {
    expect(isSameFact({ title: '가스프롬 출범', occurredAt: '1989-08-09', occurredAtPrecision: null }, event({}))).toBe(false)
    expect(isSameFact({ title: '본사 이전', occurredAt: '1989-08-08', occurredAtPrecision: null }, event({}))).toBe(false)
  })

  it('연혁이 년만이면 연도까지만 맞춘다', () => {
    expect(isSameFact({ title: '가스프롬 출범', occurredAt: '1989-01-01', occurredAtPrecision: 'year' }, event({}))).toBe(true)
  })
})
