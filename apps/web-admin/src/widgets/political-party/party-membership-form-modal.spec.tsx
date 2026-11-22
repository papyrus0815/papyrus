import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { createPartyMembership, updatePartyMembership } from '@/shared/api/election'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PartyMembershipFormModal } from './party-membership-form-modal'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/entities/person/api', () => ({
  usePersons: () => ({ data: [{ id: 'mussolini', name: '베니토 무솔리니' }] }),
}))
jest.mock('@/shared/api/election', () => ({
  getPoliticalParties: jest.fn(async () => [{ id: 'pnf', name: '국가 파시스트당', shortName: 'PNF' }]),
  createPartyMembership: jest.fn(async () => ({})),
  updatePartyMembership: jest.fn(async () => ({})),
}))

const withQuery = (node: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>
)

describe('소속·당직 모달 — 정당 지면·인물 지면 공용', () => {
  beforeEach(() => jest.clearAllMocks())

  it('인물 지면(정당 고르기) — 당직·대수·발기인·연도만 기간으로 저장', async () => {
    const onSaved = jest.fn()
    renderWithTheme(
      withQuery(
        <PartyMembershipFormModal
          anchor={{ kind: 'person', personId: 'mussolini', countryId: 'it' }}
          onClose={jest.fn()}
          onSaved={onSaved}
        />,
      ),
    )
    await screen.findByRole('option', { name: /국가 파시스트당/ })
    fireEvent.change(screen.getByLabelText(/^정당/), { target: { value: 'pnf' } })
    fireEvent.change(screen.getByLabelText('역할'), { target: { value: 'LEADERSHIP' } })
    fireEvent.change(screen.getByLabelText('당직'), { target: { value: 'LEADER' } })
    fireEvent.change(screen.getByLabelText('대수'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/^직함/), { target: { value: '두체' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('취임').querySelector('input[aria-label="연도"]') as HTMLInputElement, {
      target: { value: '1921' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(createPartyMembership).toHaveBeenCalledWith(
      'mussolini',
      expect.objectContaining({
        partyId: 'pnf',
        roleCategory: 'LEADERSHIP',
        officeKind: 'LEADER',
        officeOrdinal: 1,
        roleTitle: '두체',
        isFounder: true,
        start: { era: 'AD', year: 1921 },
        end: null,
      }),
    )
  })

  it('지도부가 아니면 당직·대수를 비워 보낸다', async () => {
    renderWithTheme(
      withQuery(
        <PartyMembershipFormModal anchor={{ kind: 'person', personId: 'mussolini' }} onClose={jest.fn()} onSaved={jest.fn()} />,
      ),
    )
    await screen.findByRole('option', { name: /국가 파시스트당/ })
    fireEvent.change(screen.getByLabelText(/^정당/), { target: { value: 'pnf' } })
    expect(screen.queryByLabelText('당직')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(createPartyMembership).toHaveBeenCalled())
    expect(createPartyMembership).toHaveBeenCalledWith(
      'mussolini',
      expect.objectContaining({ roleCategory: 'GENERAL_MEMBER', officeKind: null, officeOrdinal: null, leadershipTier: null }),
    )
  })

  it('수정 — 연도만 저장된 기간을 일 정밀로 바꾸지 않는다(옛 인물 폼의 손상 경로)', async () => {
    renderWithTheme(
      withQuery(
        <PartyMembershipFormModal
          anchor={{ kind: 'person', personId: 'mussolini' }}
          initial={{
            id: 'm1',
            personId: 'mussolini',
            partyId: 'pnf',
            roleCategory: 'GENERAL_MEMBER',
            startEra: 'AD',
            startYear: 1921,
            startDate: '1921-01-01T00:00:00.000Z',
          }}
          onClose={jest.fn()}
          onSaved={jest.fn()}
        />,
      ),
    )
    await screen.findByLabelText(/^정당/)
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(updatePartyMembership).toHaveBeenCalled())
    expect(updatePartyMembership).toHaveBeenCalledWith(
      'mussolini',
      'm1',
      expect.objectContaining({ partyId: 'pnf', start: { era: 'AD', year: 1921 } }),
    )
  })

  it('정당 지면 — 인물을 고르기 전에는 막는다', () => {
    renderWithTheme(
      withQuery(<PartyMembershipFormModal anchor={{ kind: 'party', partyId: 'pnf' }} onClose={jest.fn()} onSaved={jest.fn()} />),
    )
    expect(screen.getByText('필수: 인물')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
