import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PartyLinkFormModal, describeLink, partyLinkChoiceOf } from './party-link-sections'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/shared/api/political-party', () => ({
  ...jest.requireActual('@/shared/api/political-party'),
  politicalPartyApi: {
    getLinkCandidates: jest.fn(async () => [
      { id: 'dem', name: '더불어민주당', country: { id: 'kr', name: '대한민국' } },
    ]),
  },
}))
jest.mock('@/shared/ui/period-date-field/period-date-field', () => ({ PeriodDateField: () => null }))

describe('정당 관계 — 이 정당 입장의 읽기', () => {
  it('같은 위성 관계가 양쪽에서 다른 묶음으로 읽힌다', () => {
    expect(partyLinkChoiceOf('SATELLITE_OF', 'superior').group).toBe('위성정당')
    expect(partyLinkChoiceOf('SATELLITE_OF', 'subordinate').group).toBe('모당 — 이 정당이 그 위성')
    expect(partyLinkChoiceOf('SISTER_PARTY', 'peer').group).toBe('자매 정당')
  })

  it('확인 문장은 딸린 쪽을 앞에 둔다', () => {
    expect(describeLink('SATELLITE_OF', 'subordinate', '더불어시민당', '더불어민주당')).toBe('「더불어시민당」는 「더불어민주당」의 위성정당')
    expect(describeLink('FACTION_OF', 'superior', '자유민주당', '다나카파')).toBe('「다나카파」는 「자유민주당」 안의 계파')
  })
})

describe('정당 관계 모달', () => {
  it('상대를 고르고 위성 방향을 정해 저장한다', async () => {
    const onSubmit = jest.fn()
    renderWithTheme(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PartyLinkFormModal partyId="sat" partyName="더불어시민당" saving={false} onClose={() => undefined} onSubmit={onSubmit} />
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText(/^관계/), { target: { value: 'SATELLITE_OF:subordinate' } })
    fireEvent.click(await screen.findByRole('option', { name: /더불어민주당/ }))
    expect(screen.getByText('「더불어시민당」는 「더불어민주당」의 위성정당')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSubmit).toHaveBeenCalledWith({
      otherPartyId: 'dem',
      kind: 'SATELLITE_OF',
      role: 'subordinate',
      start: null,
      end: null,
      note: null,
    })
  })
})
