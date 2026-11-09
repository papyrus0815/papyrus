import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import {
  buildParentRecordsImportPlan,
  commitRegisterFacets,
  emptyRegisterFacetDrafts,
  suggestSideAssignment,
} from '@/features/event-facets/model/register-facets'
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
  getOrganizationMembers: jest.fn().mockResolvedValue([]),
}))
jest.mock('@/shared/api/persons', () => ({
  getAllPersons: jest.fn().mockResolvedValue([]),
}))
jest.mock('@/shared/ui/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
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
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={getTheme('light')}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </ThemeProvider>
    ),
  })
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

  it('참여국이 1개국(국내 혁명·정변)일 때도 진영 이름을 입력하고 참여 인물을 1편·2편에 배정할 수 있다', () => {
    const onDraftsChange = jest.fn()
    const drafts = {
      ...emptyRegisterFacetDrafts(),
      persons: [
        { personId: 'p-rob', name: '로베스피에르' },
        { personId: 'p-bri', name: '브리소' },
      ],
    }
    const participants = [{ countryId: 'fr', role: 'INITIATOR' as const }]

    renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={participants}
        participantName={() => '프랑스 제1공화국'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="프랑스 혁명"
        playClickSound={jest.fn()}
      />,
    )

    // 1개국 단독일 때는 suggestSideAssignment가 유일한 국가를 1편으로 자동 배정하지 않는다
    expect(suggestSideAssignment(participants, {})).toEqual({})

    // 미배정 인물 그룹에서 로베스피에르를 1번 진영에 배정
    const unassignedPersons = screen.getByRole('group', { name: '미배정 인물' })
    expect(
      within(unassignedPersons).getByText('미배정 인물 (2)'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: '로베스피에르 1번 진영 배정' }),
    )
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sides: expect.objectContaining({
          personAssignment: { 'p-rob': 'A' },
        }),
      }),
    )
  })

  it('참여국 배정 없이 진영 이름(산악파·지롱드파)·영구 계파·인물 배정만 있어도 commitRegisterFacets가 진영을 생성하고 인물 sideId를 저장한다', async () => {
    const { syncEventSides } = jest.requireMock('@/shared/api/event-sides') as {
      syncEventSides: jest.Mock
    }
    syncEventSides.mockResolvedValue([
      { id: 'side-a', name: '산악파' },
      { id: 'side-b', name: '지롱드파' },
    ])
    const eventsModule = await import('@/shared/api/events')
    const updateEventSpy = jest
      .spyOn(eventsModule, 'updateEvent')
      .mockResolvedValue({} as never)

    const drafts = {
      ...emptyRegisterFacetDrafts(),
      persons: [
        { personId: 'p-rob', name: '로베스피에르', role: '지도자' },
        { personId: 'p-bri', name: '브리소', role: '의원' },
      ],
      sides: {
        names: ['산악파', '지롱드파'] as [string, string],
        assignment: {},
        personGroupIds: ['grp-mont', 'grp-gir'] as [string | null, string | null],
        personAssignment: {
          'p-rob': 'A' as const,
          'p-bri': 'B' as const,
        },
      },
    }

    const res = await commitRegisterFacets({
      eventId: 'ev-1',
      eventTitle: '6월 2일 봉기',
      participants: [{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }],
      drafts,
      eventType: 'UPRISING',
      domain: 'POLITICS',
    })

    expect(syncEventSides).toHaveBeenCalledWith('ev-1', [
      {
        name: '산악파',
        level: 'COALITION',
        color: '#1d4ed8',
        personGroupId: 'grp-mont',
      },
      {
        name: '지롱드파',
        level: 'COALITION',
        color: '#b91c1c',
        personGroupId: 'grp-gir',
      },
    ])
    expect(updateEventSpy).toHaveBeenCalledWith('ev-1', {
      relatedPersons: [
        { personId: 'p-rob', role: '지도자', sideId: 'side-a' },
        { personId: 'p-bri', role: '의원', sideId: 'side-b' },
      ],
    })
    expect(res.done).toContain('진영 산악파 · 지롱드파')
    updateEventSpy.mockRestore()
  })

  it('참여 조직(예: 공안위원회)에서 소속 인물을 불러오면 참여 인물에 추가되고 조직이 속한 진영(1편)에도 자동 배정된다', async () => {
    const { getOrganizationMembers } = jest.requireMock(
      '@/shared/api/organizations',
    ) as { getOrganizationMembers: jest.Mock }
    getOrganizationMembers.mockResolvedValue([
      {
        personId: 'p-stjust',
        roleTitle: '공안위원회 위원',
        source: 'TENURE',
        person: {
          id: 'p-stjust',
          name: '생쥐스트',
          surname: null,
          originalName: 'Saint-Just',
          profileImageUrl: null,
        },
      },
    ])

    const onDraftsChange = jest.fn()
    const drafts = {
      ...emptyRegisterFacetDrafts(),
      organizations: [
        { id: 'org-cps', name: '공안위원회', role: 'PRINCIPAL' as const },
      ],
      sides: {
        names: ['산악파·혁명정부', '반혁명파'] as [string, string],
        assignment: {},
        organizationAssignment: { 'org-cps': 'A' as const },
      },
    }

    renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }]}
        participantName={() => '프랑스 제1공화국'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="공포정치"
        playClickSound={jest.fn()}
      />,
    )

    const importButtons = screen.getAllByRole('button', {
      name: '공안위원회 소속 인물 불러오기',
    })
    fireEvent.click(importButtons[0])

    // 비동기 호출 완료 대기
    await screen.findAllByRole('button', {
      name: '공안위원회 소속 인물 불러오기',
    })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onDraftsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        persons: [
          {
            personId: 'p-stjust',
            name: '생쥐스트',
            role: '공안위원회 위원',
          },
        ],
        sides: expect.objectContaining({
          personAssignment: { 'p-stjust': 'A' },
        }),
      }),
    )
  })

  it('다자 진영(3편: 산악파·지롱드파·평원파) 추가 및 commitRegisterFacets 저장이 정상 동작한다', async () => {
    const { syncEventSides } = jest.requireMock('@/shared/api/event-sides') as {
      syncEventSides: jest.Mock
    }
    syncEventSides.mockClear()
    syncEventSides.mockResolvedValue([
      { id: 'side-1', name: '산악파' },
      { id: 'side-2', name: '지롱드파' },
      { id: 'side-3', name: '평원파' },
    ])
    const eventsModule = await import('@/shared/api/events')
    const updateEventSpy = jest
      .spyOn(eventsModule, 'updateEvent')
      .mockResolvedValue({} as never)

    const onDraftsChange = jest.fn()
    renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={emptyRegisterFacetDrafts()}
        onDraftsChange={onDraftsChange}
        participants={[{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }]}
        participantName={() => '프랑스 제1공화국'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="국민공회 정쟁"
        playClickSound={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '3번 진영 추가' }))
    expect(onDraftsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sides: expect.objectContaining({
          names: ['', '', ''],
        }),
      }),
    )

    const res = await commitRegisterFacets({
      eventId: 'evt-conv',
      eventTitle: '국민공회 정쟁',
      participants: [{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }],
      drafts: {
        ...emptyRegisterFacetDrafts(),
        persons: [{ personId: 'p-sieyes', name: '시예스', role: '의원' }],
        sides: {
          names: ['산악파', '지롱드파', '평원파'],
          personGroupIds: ['grp-m', 'grp-g', 'grp-p'],
          assignment: {},
          personAssignment: { 'p-sieyes': 'C' },
        },
      },
      eventType: 'UPRISING',
      domain: 'POLITICS',
    })

    expect(syncEventSides).toHaveBeenCalledWith('evt-conv', [
      {
        name: '산악파',
        level: 'COALITION',
        color: '#1d4ed8',
        personGroupId: 'grp-m',
      },
      {
        name: '지롱드파',
        level: 'COALITION',
        color: '#b91c1c',
        personGroupId: 'grp-g',
      },
      {
        name: '평원파',
        level: 'COALITION',
        color: '#047857',
        personGroupId: 'grp-p',
      },
    ])
    expect(updateEventSpy).toHaveBeenCalledWith('evt-conv', {
      relatedPersons: [
        { personId: 'p-sieyes', role: '의원', sideId: 'side-3' },
      ],
    })
    expect(res.done).toContain('진영 산악파 · 지롱드파 · 평원파')
    updateEventSpy.mockRestore()
  })

  it('참여 인물과 기업·조직 행(Row) 내부의 [1편 | 2편] 토글 버튼으로 시선 이동 없이 진영을 바로 배정하고 역할 프리셋 칩으로 역할을 채울 수 있다', () => {
    const onDraftsChange = jest.fn()
    const drafts = {
      ...emptyRegisterFacetDrafts(),
      organizations: [
        { id: 'org-cps', name: '공안위원회', role: 'PRINCIPAL' as const },
      ],
      persons: [{ personId: 'p-rob', name: '로베스피에르' }],
    }

    renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }]}
        participantName={() => '프랑스 제1공화국'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="테르미도르의 반동"
        playClickSound={jest.fn()}
      />,
    )

    // 기업·조직 행 내부의 '1편' 토글 클릭
    fireEvent.click(screen.getByRole('button', { name: '공안위원회 1편 토글' }))
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sides: expect.objectContaining({
          organizationAssignment: { 'org-cps': 'A' },
        }),
      }),
    )

    // 참여 인물 행 내부의 '2편' 토글 클릭
    fireEvent.click(
      screen.getByRole('button', { name: '로베스피에르 2편 토글' }),
    )
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sides: expect.objectContaining({
          personAssignment: { 'p-rob': 'B' },
        }),
      }),
    )

    // 참여 인물 역할 입력칸 포커스 시 역할 프리셋 칩 노출 및 원클릭 반영
    const roleInput = screen.getByRole('textbox', {
      name: '로베스피에르이(가) 한 일',
    })
    fireEvent.focus(roleInput)
    const presetBtn = screen.getByRole('button', {
      name: '로베스피에르 역할 숙청·처형 지정',
    })
    fireEvent.click(presetBtn)
    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        persons: [
          { personId: 'p-rob', name: '로베스피에르', role: '숙청·처형' },
        ],
      }),
    )
  })

  it('인라인 빠른 검색창으로 모달을 열지 않고도 참여 인물과 기업·조직을 즉시 검색·추가할 수 있다', async () => {
    const { getAllPersons } = jest.requireMock('@/shared/api/persons') as {
      getAllPersons: jest.Mock
    }
    getAllPersons.mockResolvedValue([
      {
        id: 'p-danton',
        name: '당통',
        surname: '조르주',
        birthEra: 'AD',
        birthYear: 1759,
        deathEra: 'AD',
        deathYear: 1794,
      },
    ])
    const { getOrganizations } = jest.requireMock(
      '@/shared/api/organizations',
    ) as { getOrganizations: jest.Mock }
    getOrganizations.mockResolvedValue([
      { id: 'org-jac', name: '자코뱅 클럽', shortName: '자코뱅' },
    ])

    const onDraftsChange = jest.fn()
    renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={{
          ...emptyRegisterFacetDrafts(),
          organizations: [
            { id: 'org-existing', name: '국민공회', role: 'PRINCIPAL' },
          ],
          persons: [{ personId: 'p-existing', name: '마라' }],
        }}
        onDraftsChange={onDraftsChange}
        participants={[{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }]}
        participantName={() => '프랑스 제1공화국'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="혁명재판소 설치"
        playClickSound={jest.fn()}
      />,
    )

    // 기업·조직 인라인 빠른 검색 후 Enter로 추가
    const orgInput = screen.getByRole('searchbox', {
      name: '기업·조직 빠른 검색',
    })
    fireEvent.focus(orgInput)
    fireEvent.change(orgInput, { target: { value: '자코뱅' } })
    await screen.findByText('+ 🏢 자코뱅 클럽')
    fireEvent.keyDown(orgInput, { key: 'Enter' })

    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        organizations: [
          { id: 'org-existing', name: '국민공회', role: 'PRINCIPAL' },
          { id: 'org-jac', name: '자코뱅 클럽', role: 'PRINCIPAL' },
        ],
      }),
    )

    // 참여 인물 인라인 빠른 검색 후 Enter로 추가
    const personInput = screen.getByRole('searchbox', {
      name: '참여 인물 빠른 검색',
    })
    fireEvent.focus(personInput)
    fireEvent.change(personInput, { target: { value: '당통' } })
    await screen.findByText(/\+ 👤.*당통/)
    fireEvent.keyDown(personInput, { key: 'Enter' })

    expect(onDraftsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        persons: expect.arrayContaining([
          { personId: 'p-existing', name: '마라' },
          expect.objectContaining({ personId: 'p-danton' }),
        ]),
      }),
    )
  })

  it('상위 사건(buildParentRecordsImportPlan 및 parentRecordsSlot)에서 진영·인물·조직 구도를 원클릭으로 이어받을 수 있다', () => {
    const plan = buildParentRecordsImportPlan(
      {
        title: '프랑스 혁명',
        type: 'UPRISING',
        sides: [
          {
            id: 'side-m',
            name: '산악파',
            sortOrder: 0,
            personGroupId: 'grp-mont',
            persons: [
              {
                personId: 'p-rob',
                name: '로베스피에르',
                surname: null,
                role: '지도자',
              },
            ],
            organizations: [
              {
                organizationId: 'org-cps',
                name: '공안위원회',
                role: 'PRINCIPAL',
              },
            ],
          },
          {
            id: 'side-g',
            name: '지롱드파',
            sortOrder: 1,
            personGroupId: 'grp-gir',
            persons: [
              { personId: 'p-bri', name: '브리소', surname: null, role: '의원' },
            ],
            organizations: [],
          },
        ],
      },
      emptyRegisterFacetDrafts(),
    )

    expect(plan).not.toBeNull()
    expect(plan?.summaryLabel).toBe('진영 2 · 조직 1곳 · 인물 2명')
    expect(plan?.nextDrafts.sides.names).toEqual(['산악파', '지롱드파'])
    expect(plan?.nextDrafts.sides.personGroupIds).toEqual([
      'grp-mont',
      'grp-gir',
    ])
    expect(plan?.nextDrafts.sides.personAssignment).toEqual({
      'p-rob': 'A',
      'p-bri': 'B',
    })
    expect(plan?.nextDrafts.sides.organizationAssignment).toEqual({
      'org-cps': 'A',
    })
    expect(plan?.nextDrafts.persons).toHaveLength(2)
    expect(plan?.nextDrafts.organizations).toEqual([
      { id: 'org-cps', name: '공안위원회', role: 'PRINCIPAL' },
    ])

    const onImport = jest.fn()
    renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={emptyRegisterFacetDrafts()}
        onDraftsChange={jest.fn()}
        participants={[{ historicalCountryId: 'hc-fr', role: 'INITIATOR' }]}
        participantName={() => '프랑스 제1공화국'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="지롱드파 숙청"
        parentRecordsSlot={{
          parentTitle: '프랑스 혁명',
          summaryLabel: '진영 2 · 조직 1곳 · 인물 2명',
          onImport,
        }}
        playClickSound={jest.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '상위 사건 기록 불러오기' }),
    )
    expect(onImport).toHaveBeenCalledTimes(1)
  })

  it('진영 카드 내부의 인라인 검색창으로 인물·조직을 해당 진영에 바로 등록·배정하고, 1번·2번 진영 맞바꾸기를 수행할 수 있다', async () => {
    const { getAllPersons } = jest.requireMock('@/shared/api/persons') as {
      getAllPersons: jest.Mock
    }
    getAllPersons.mockResolvedValue([
      {
        id: 'p-생쥐스트',
        name: '생쥐스트',
        surname: '드',
        role: '의원',
        countryId: 'c-fr',
      } as never,
    ])
    const { getOrganizations } = jest.requireMock(
      '@/shared/api/organizations',
    ) as { getOrganizations: jest.Mock }
    getOrganizations.mockResolvedValue([
      {
        id: 'org-코르들리에',
        name: '코르들리에 클럽',
        shortName: '코르들리에',
        type: 'POLITICAL_PARTY',
      } as never,
    ])

    let drafts = emptyRegisterFacetDrafts()
    drafts.sides = {
      names: ['산악파', '지롱드파'],
      assignment: { 'm:c-fr': 'A', 'm:c-uk': 'B' },
      personGroupIds: ['grp-1', 'grp-2'],
      personAssignment: { 'p-rob': 'A', 'p-bri': 'B' },
      organizationAssignment: { 'org-cps': 'A' },
    }
    drafts.persons = [
      { personId: 'p-rob', name: '로베스피에르' },
      { personId: 'p-bri', name: '브리소' },
    ]
    drafts.organizations = [
      { id: 'org-cps', name: '공안위원회', role: 'PRINCIPAL' },
    ]

    const onDraftsChange = jest.fn((next) => {
      drafts = next
    })

    const { rerender } = renderGroup(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[
          { countryId: 'c-fr', role: 'INITIATOR' },
          { countryId: 'c-uk', role: 'ADVERSARY' },
        ]}
        participantName={(row) =>
          row.countryId === 'c-fr' ? '프랑스' : '영국'
        }
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="산악파 집권"
        playClickSound={jest.fn()}
      />,
    )

    // 1. 1번 진영 내부 인라인 빠른 검색으로 인물 추가 + 1편 즉시 배정
    const side1QuickInput = await screen.findByLabelText(
      '1번 진영 인물·조직 빠른 추가',
    )
    fireEvent.focus(side1QuickInput)
    fireEvent.change(side1QuickInput, { target: { value: '생쥐스트' } })

    const listbox = await screen.findByRole('listbox', {
      name: '1번 진영 빠른 추가 후보',
    })
    expect(await within(listbox).findByText(/생쥐스트/)).toBeInTheDocument()
    fireEvent.keyDown(side1QuickInput, { key: 'Enter' })

    expect(drafts.persons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ personId: 'p-생쥐스트' }),
      ]),
    )
    expect(drafts.sides.personAssignment?.['p-생쥐스트']).toBe('A')

    rerender(
      <CoreRecordsGroup
        type="UPRISING"
        domain="POLITICS"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[
          { countryId: 'c-fr', role: 'INITIATOR' },
          { countryId: 'c-uk', role: 'ADVERSARY' },
        ]}
        participantName={(row) =>
          row.countryId === 'c-fr' ? '프랑스' : '영국'
        }
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="산악파 집권"
        playClickSound={jest.fn()}
      />,
    )

    // 2. 1번·2번 진영 맞바꾸기 버튼 클릭 시 이름·계파·국가·인물·조직 배정이 서로 교환됨
    fireEvent.click(
      screen.getByRole('button', { name: '1번·2번 진영 맞바꾸기' }),
    )
    expect(drafts.sides.names).toEqual(['지롱드파', '산악파'])
    expect(drafts.sides.personGroupIds).toEqual(['grp-2', 'grp-1'])
    expect(drafts.sides.assignment).toEqual({
      'm:c-fr': 'B',
      'm:c-uk': 'A',
    })
    expect(drafts.sides.personAssignment).toEqual({
      'p-rob': 'B',
      'p-bri': 'A',
      'p-생쥐스트': 'B',
    })
    expect(drafts.sides.organizationAssignment).toEqual({
      'org-cps': 'B',
    })
  })

  it('세부 분야가 미선택(type=null)이어도 참여 인물 입력칸이 즉시 열리고 기관·조직을 추가할 수 있다', () => {
    renderGroup(
      <CoreRecordsGroup
        type={null}
        domain={null}
        drafts={emptyRegisterFacetDrafts()}
        onDraftsChange={jest.fn()}
        participants={[]}
        participantName={() => ''}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="일반 사건"
        playClickSound={jest.fn()}
      />,
    )

    expect(
      screen.getByRole('searchbox', { name: '참여 인물 빠른 검색' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /기관·조직·기업 추가/,
      }),
    )
    expect(
      screen.getByRole('searchbox', { name: '기업·조직 빠른 검색' }),
    ).toBeInTheDocument()
  })

  it('조약(TreatyField) 추천 조약명 원클릭 채우기 및 선거(election) 인라인 빠른 검색·연결이 동작한다', async () => {
    const { getElections } = jest.requireMock('@/shared/api/election') as {
      getElections: jest.Mock
    }
    getElections.mockResolvedValue([
      {
        id: 'el-1792',
        name: '1792년 프랑스 국민공회 선거',
        pollDate: '1792-09-02',
      },
    ])

    let drafts = emptyRegisterFacetDrafts()
    drafts.treaty = { mode: 'create', name: '' }
    const onDraftsChange = jest.fn((next) => {
      drafts = next
    })

    const { rerender } = renderGroup(
      <CoreRecordsGroup
        type="TREATY"
        domain="DIPLOMACY"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[
          { countryId: 'c1', role: 'PARTICIPANT' },
          { countryId: 'c2', role: 'PARTICIPANT' },
        ]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="베르사유 조약 체결"
        playClickSound={jest.fn()}
      />,
    )

    expect(
      screen.getByText('참여국 2곳이 서명국으로 함께 등록됩니다'),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: '추천 조약명 채우기' }),
    )
    expect(drafts.treaty).toEqual({
      mode: 'create',
      name: '베르사유 조약',
    })

    rerender(
      <CoreRecordsGroup
        type="ELECTION"
        domain="POLITICS"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ countryId: 'c1', role: 'PARTICIPANT' }]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="국민공회 선거"
        playClickSound={jest.fn()}
      />,
    )

    const electionSearch = screen.getByRole('searchbox', {
      name: '선거 빠른 검색',
    })
    fireEvent.focus(electionSearch)
    fireEvent.change(electionSearch, { target: { value: '국민공회' } })
    await screen.findByText('+ 🗳️ 1792년 프랑스 국민공회 선거')
    fireEvent.keyDown(electionSearch, { key: 'Enter' })

    expect(drafts.election).toEqual({
      id: 'el-1792',
      name: '1792년 프랑스 국민공회 선거',
    })
  })

  it('동시대·참여국 추천 인물 원클릭 추가, 인물 역할 비우기, 조약 인라인 빠른 검색 연결, 점프 이벤트 자동 펼침이 동작한다', async () => {
    const { getAllPersons } = jest.requireMock('@/shared/api/persons') as {
      getAllPersons: jest.Mock
    }
    getAllPersons.mockResolvedValue([
      {
        id: 'p-talleyrand',
        name: '탈레랑',
        surname: '샤를모리스 드',
        birthEra: 'AD',
        birthYear: 1754,
        deathEra: 'AD',
        deathYear: 1838,
        countryId: 'c-fr',
      },
    ])
    const { treatyApi } = jest.requireMock('@/shared/api/treaty') as {
      treatyApi: { getAll: jest.Mock }
    }
    treatyApi.getAll.mockResolvedValue({
      items: [
        {
          id: 'tr-amiens',
          name: '아미앵 조약',
          signDate: '1802-03-25',
        },
      ],
    })

    let drafts = emptyRegisterFacetDrafts()
    const onDraftsChange = jest.fn((next) => {
      drafts = next
    })

    const { rerender } = renderGroup(
      <CoreRecordsGroup
        type="TREATY"
        domain="DIPLOMACY"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ countryId: 'c-fr', role: 'PARTICIPANT' }]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="아미앵 강화"
        startDate="1802-03-25"
        playClickSound={jest.fn()}
      />,
    )

    // 1. 동시대·참여국 추천 인물 칩이 바로 노출되고 원클릭으로 추가된다
    const recommendBtn = await screen.findByRole('button', {
      name: /추천 인물 .*탈레랑.* 추가/,
    })
    fireEvent.click(recommendBtn)
    expect(drafts.persons).toEqual([
      expect.objectContaining({ personId: 'p-talleyrand' }),
    ])

    // 2. 조약(TreatyField)에서 '나중에' 모드로 전환 후 인라인 빠른 검색으로 기존 조약을 즉시 연결한다
    fireEvent.click(screen.getByRole('radio', { name: '나중에' }))
    rerender(
      <CoreRecordsGroup
        type="TREATY"
        domain="DIPLOMACY"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ countryId: 'c-fr', role: 'PARTICIPANT' }]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="아미앵 강화"
        startDate="1802-03-25"
        playClickSound={jest.fn()}
      />,
    )

    const treatySearch = screen.getByRole('searchbox', {
      name: '조약 빠른 검색',
    })
    fireEvent.focus(treatySearch)
    fireEvent.change(treatySearch, { target: { value: '아미앵' } })
    await screen.findByText('+ 📜 아미앵 조약')
    fireEvent.keyDown(treatySearch, { key: 'Enter' })
    expect(drafts.treaty).toEqual({
      mode: 'link',
      treatyId: 'tr-amiens',
      treatyName: '아미앵 조약',
    })

    // 3. 인물 역할이 입력된 상태에서 비우기 버튼으로 원클릭 초기화하고, 점프 이벤트로 접힌 조직 섹션을 펼친다
    drafts = {
      ...drafts,
      persons: [
        {
          personId: 'p-talleyrand',
          name: '탈레랑',
          role: '프랑스 외무장관으로서 협상 주도',
        },
      ],
    }
    rerender(
      <CoreRecordsGroup
        type="TREATY"
        domain="DIPLOMACY"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ countryId: 'c-fr', role: 'PARTICIPANT' }]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="아미앵 강화"
        startDate="1802-03-25"
        playClickSound={jest.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: '탈레랑 역할 비우기' }),
    )
    expect(drafts.persons[0].role).toBe('')

    fireEvent(
      window,
      new CustomEvent('papyrus:jump-core-record', {
        detail: { facet: 'organizations' },
      }),
    )
    expect(
      await screen.findByRole('searchbox', { name: '기업·조직 빠른 검색' }),
    ).toBeInTheDocument()
  })

  it('성립·소멸(StatehoodField) 인라인 국가 빠른 검색과 기업·조직 참여국 맞춤 추천 칩이 동작한다', async () => {
    const { getOrganizations } = jest.requireMock('@/shared/api/organizations') as {
      getOrganizations: jest.Mock
    }
    getOrganizations.mockResolvedValue([
      {
        id: 'org-cps',
        name: '공안위원회',
        shortName: 'CPS',
        countryId: 'c-fr',
        historicalCountryId: null,
      },
      {
        id: 'org-other',
        name: '동인도회사',
        shortName: 'EIC',
        countryId: 'c-gb',
        historicalCountryId: null,
      },
    ])

    let drafts = emptyRegisterFacetDrafts()
    const onDraftsChange = jest.fn((next) => {
      drafts = next
    })
    const onQuickAddCountryWithRole = jest.fn()

    const { rerender } = renderGroup(
      <CoreRecordsGroup
        type="STATEHOOD"
        domain="STATE"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ countryId: 'c-fr', role: 'PARTICIPANT' }]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onQuickAddCountryWithRole={onQuickAddCountryWithRole}
        availableHistoricalCountries={[
          { id: 'h-first-rep', name: '프랑스 제1공화국' },
          { id: 'h-bourbon', name: '부르봉 왕조' },
        ]}
        onRemoveParticipant={jest.fn()}
        eventTitle="프랑스 제1공화국 선포"
        startDate="1792-09-22"
        playClickSound={jest.fn()}
      />,
    )

    // 1. 성립·소멸의 '세워진 나라 빠른 검색'에서 타이핑 후 Enter로 즉시 추가
    const foundedSearch = screen.getByRole('textbox', {
      name: '세워진 나라 빠른 검색',
    })
    fireEvent.focus(foundedSearch)
    fireEvent.change(foundedSearch, { target: { value: '제1공화국' } })
    expect(screen.getByText('+ 프랑스 제1공화국')).toBeInTheDocument()
    fireEvent.keyDown(foundedSearch, { key: 'Enter' })
    expect(onQuickAddCountryWithRole).toHaveBeenCalledWith(
      { countryId: undefined, historicalCountryId: 'h-first-rep' },
      'FOUNDED',
    )

    // 2. 기업·조직 섹션이 열리면 참여국(c-fr)에 소속된 추천 조직('공안위원회')이 칩 바로 노출되고 원클릭 추가된다
    rerender(
      <CoreRecordsGroup
        type="INSTITUTION"
        domain="SOCIETY"
        drafts={drafts}
        onDraftsChange={onDraftsChange}
        participants={[{ countryId: 'c-fr', role: 'PARTICIPANT' }]}
        participantName={() => '프랑스'}
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="공안위원회 설치"
        startDate="1793-04-06"
        playClickSound={jest.fn()}
      />,
    )

    const orgChip = await screen.findByRole('button', {
      name: '+ 🏢 공안위원회',
    })
    expect(
      screen.queryByRole('button', { name: '+ 🏢 동인도회사' }),
    ).not.toBeInTheDocument()
    fireEvent.click(orgChip)
    expect(drafts.organizations).toEqual([
      { id: 'org-cps', name: '공안위원회', role: 'PRINCIPAL' },
    ])
  })

  it('진영 대결 구도(VS) 인포그래픽을 표시하고 국가·인물 칩을 드래그 앤 드롭하여 진영을 이동할 수 있다', () => {
    const onDraftsChange = jest.fn()
    renderGroup(
      <CoreRecordsGroup
        type="BATTLE"
        domain="MILITARY"
        drafts={{
          ...emptyRegisterFacetDrafts(),
          sides: {
            names: ['연합국', '추축국'],
            assignment: { 'm:c-fr': 'A' },
            personAssignment: { 'p-1': 'A' },
          },
          persons: [{ personId: 'p-1', name: '드골' }],
        }}
        onDraftsChange={onDraftsChange}
        participants={[
          { countryId: 'c-fr', role: 'INITIATOR' },
          { countryId: 'c-de', role: 'TARGET' },
        ]}
        participantName={(participant) =>
          participant.countryId === 'c-fr' ? '프랑스' : '독일'
        }
        onAddCountryWithRole={jest.fn()}
        onRemoveParticipant={jest.fn()}
        eventTitle="노르망디 상륙작전"
        playClickSound={jest.fn()}
      />,
    )

    expect(
      screen.getByRole('region', { name: '진영 대결 구도 인포그래픽' }),
    ).toBeInTheDocument()

    const side2Dropzone = document.querySelector('[data-side-dropzone="B"]')!
    expect(side2Dropzone).toBeTruthy()

    fireEvent.drop(side2Dropzone, {
      dataTransfer: {
        getData: () => 'country:m:c-de',
      },
    })

    expect(onDraftsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sides: expect.objectContaining({
          assignment: { 'm:c-fr': 'A', 'm:c-de': 'B' },
        }),
      }),
    )
  })
})
