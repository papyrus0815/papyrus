import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import { emptyRegisterFacetDrafts } from '@/features/event-facets/model/register-facets'
import { getTheme } from '@/shared/styles/theme'

import { CoreRecordsGroup } from './core-records-group'

jest.mock('@/shared/api/client', () => ({
  getApiConnection: jest.fn(() => ({ host: 'http://localhost:3000' })),
  apiConnection: { host: 'http://localhost:3000' },
}))
jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: { updateGovernmentPositionTenure: jest.fn() },
}))
jest.mock('@/shared/api/event-sides', () => ({
  syncEventSides: jest.fn(),
}))
jest.mock('@/shared/api/api.service', () => ({
  nestiaApiService: { getConnection: jest.fn(() => ({})) },
}))
jest.mock('@/shared/api/election', () => ({
  getElections: jest.fn().mockResolvedValue([]),
}))
jest.mock('@/shared/api/organizations', () => ({
  getOrganizations: jest.fn().mockResolvedValue([]),
}))
jest.mock('@/shared/api/treaty', () => ({
  treatyApi: { getAll: jest.fn().mockResolvedValue({ items: [] }) },
}))
jest.mock('@/shared/ui/person-picker', () => ({
  PersonPickerModal: () => null,
}))
jest.mock('@/shared/ui/select-modal/select-modal', () => ({
  SelectModal: () => null,
}))

function renderGroup(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <ThemeProvider theme={getTheme('light')}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  )
}

const NAMES: Record<string, string> = {
  'm:fr': '프랑스',
  'm:de': '독일',
  'm:gb': '영국',
}

describe('CoreRecordsGroup — 2열 진영 보드(SidesField) 및 성립·소멸(StatehoodField)', () => {
  it('참여국들을 미배정 칩 바에 표시하고, +1편/+2편 클릭으로 각 진영 보드에 배정·이동·해제할 수 있다', () => {
    const onDraftsChange = jest.fn()
    const drafts = emptyRegisterFacetDrafts()
    const participants = [
      { countryId: 'fr', role: 'INITIATOR' as const },
      { countryId: 'de', role: 'ADVERSARY' as const },
      { countryId: 'gb', role: 'ALLY' as const },
    ]

    const { rerender } = renderGroup(
      <CoreRecordsGroup
        type="BATTLE"
        domain="MILITARY"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={participants}
        participantName={(row) => NAMES[`m:${row.countryId}`] ?? ''}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="마른 전투"
        playClickSound={jest.fn()}
      />,
    )

    const unassignedGroup = screen.getByRole('group', { name: '미배정 참여국' })
    expect(within(unassignedGroup).getByText('미배정 (3)')).toBeInTheDocument()

    // 프랑스를 1번 진영에 배정
    fireEvent.click(screen.getByRole('button', { name: '프랑스 1번 진영 배정' }))
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sides: {
          names: ['', ''],
          assignment: { 'm:fr': 'A' },
        },
      }),
    )

    // 배정된 상태로 다시 렌더하여 진영 간 이동(→2편)과 배정 해제(×) 검증
    const assignedDrafts = {
      ...drafts,
      sides: {
        names: ['연합국', '동맹국'] as [string, string],
        assignment: { 'm:fr': 'A' as const, 'm:de': 'B' as const },
      },
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(
      <ThemeProvider theme={getTheme('light')}>
        <QueryClientProvider client={client}>
          <CoreRecordsGroup
            type="BATTLE"
            domain="MILITARY"
            drafts={assignedDrafts}
            onDraftsChange={onDraftsChange}
            participants={participants}
            participantName={(row) => NAMES[`m:${row.countryId}`] ?? ''}
            onAddCountryWithRole={jest.fn()}
            onRemoveParticipant={jest.fn()}
            eventTitle="마른 전투"
            playClickSound={jest.fn()}
          />
        </QueryClientProvider>
      </ThemeProvider>,
    )

    expect(
      within(screen.getByRole('group', { name: '미배정 참여국' })).getByText(
        '미배정 (1)',
      ),
    ).toBeInTheDocument()

    // 프랑스를 2번 진영으로 이동
    fireEvent.click(
      screen.getByRole('button', { name: '프랑스 2번 진영으로 이동' }),
    )
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sides: {
          names: ['연합국', '동맹국'],
          assignment: { 'm:fr': 'B', 'm:de': 'B' },
        },
      }),
    )

    // 독일 진영 배정 해제
    fireEvent.click(
      screen.getByRole('button', { name: '독일 진영 배정 해제' }),
    )
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sides: {
          names: ['연합국', '동맹국'],
          assignment: { 'm:fr': 'A' },
        },
      }),
    )
  })

  it('성립·소멸(StatehoodField)에서 미지정 참여국을 컴팩트 칩 바로 보여주고 원클릭으로 역할을 지정한다', () => {
    const onAssignParticipantRole = jest.fn()
    renderGroup(
      <CoreRecordsGroup
        type="STATEHOOD"
        domain="POLITICS"
        drafts={emptyRegisterFacetDrafts()}
        onDraftsChange={jest.fn()}
        participants={[{ countryId: 'de', role: 'PARTICIPANT' }]}
        participantName={(row) => NAMES[`m:${row.countryId}`] ?? ''}
        onAddCountryWithRole={jest.fn()}
        onAssignParticipantRole={onAssignParticipantRole}
        onRemoveParticipant={jest.fn()}
        eventTitle="독일 제국 선포"
        playClickSound={jest.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '독일 세워진 나라로 지정' }),
    )
    expect(onAssignParticipantRole).toHaveBeenCalledWith('m:de', 'FOUNDED')
  })
})
