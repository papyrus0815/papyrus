import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { CountryMilitaryWarsPanel } from './country-military-wars-panel'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('@/shared/api/client', () => ({
  getApiConnection: () => ({ host: 'http://localhost:8000', headers: {} }),
  apiConnection: { host: 'http://localhost:8000', headers: {} },
}))

jest.mock('@/shared/api/api.service', () => ({
  apiService: {},
}))

jest.mock('@/widgets/event-form/ui/event-register-modal', () => ({
  EventRegisterModal: ({
    isOpen,
    initialDomain,
    initialParent,
  }: {
    isOpen: boolean
    initialDomain?: string | null
    initialParent?: { id: string; title: string }
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="군사 사건 등록 모달">
        <span>domain:{initialDomain}</span>
        {initialParent ? <span>parent:{initialParent.title}</span> : null}
      </div>
    ) : null,
}))

jest.mock('@/widgets/event/event-inline-modal/event-inline-modal', () => ({
  EventInlineModal: ({
    eventId,
    onClose,
    onNavigate,
    personContext,
  }: {
    eventId: string | null
    onClose: () => void
    onNavigate: (targetId: string) => void
    personContext?: { label?: string; role?: string | null } | null
  }) =>
    eventId ? (
      <div role="dialog" aria-label="사건 상세 미리보기">
        <span>preview:{eventId}</span>
        {personContext?.role ? <span>{personContext.role}</span> : null}
        <button
          type="button"
          onClick={() => {
            onClose()
            onNavigate(eventId)
          }}
        >
          사건 상세로 이동
        </button>
      </div>
    ) : null,
}))

jest.mock('@/shared/api/events', () => ({
  EVENTS_LIMIT_ALL: 5000,
  getAllEvents: jest.fn(async () => [
    {
      id: 'ev-korean-war',
      title: '6·25 전쟁',
      domain: 'MILITARY',
      type: 'WAR',
      kind: 'COLLECTION',
      startDate: '1950-06-25',
      endDate: '1953-07-27',
      startDatePrecision: 'DAY',
      endDatePrecision: 'DAY',
      relatedCountries: [
        {
          id: 'country-kr',
          name: '대한민국',
          role: 'DEFENDER',
          sideId: 'side-un',
          sideName: '유엔군·국군',
          sideOutcome: 'DRAW',
        },
        {
          id: 'country-kp',
          name: '조선민주주의인민공화국',
          role: 'INITIATOR',
          sideId: 'side-kp',
          sideName: '북한·중공군',
        },
      ],
      relatedHistoricalCountries: [],
    },
    {
      id: 'ev-incheon',
      title: '인천 상륙 작전',
      domain: 'MILITARY',
      type: 'BATTLE',
      parentEventId: 'ev-korean-war',
      parentEvent: {
        id: 'ev-korean-war',
        title: '6·25 전쟁',
      },
      startDate: '1950-09-15',
      endDate: '1950-09-19',
      startDatePrecision: 'DAY',
      endDatePrecision: 'DAY',
      relatedCountries: [
        {
          id: 'country-kr',
          name: '대한민국',
          role: 'PARTICIPANT',
          sideId: 'side-un',
          sideName: '유엔군·국군',
          sideOutcome: 'VICTORY',
        },
      ],
      relatedHistoricalCountries: [],
    },
    {
      id: 'ev-imjin',
      title: '임진왜란 발발 및 선전포고',
      domain: 'MILITARY',
      type: 'WAR_DECLARATION',
      startDate: '1592-05-23',
      startDatePrecision: 'DAY',
      relatedCountries: [],
      relatedHistoricalCountries: [
        {
          id: 'hist-joseon',
          name: '조선',
          role: 'TARGET',
        },
        {
          id: 'hist-japan',
          name: '아즈치모모야마 일본',
          role: 'INITIATOR',
        },
      ],
    },
  ]),
}))

function renderWarsPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CountryMilitaryWarsPanel
          country={{ id: 'country-kr', name: '대한민국', type: 'modern' } as never}
          linkedHistoricalCountryIds={['hist-joseon']}
          units={[
            {
              id: 'unit-1div',
              name: '제1보병사단',
              abbreviation: '1사단',
              unitType: 'DIVISION',
              sideDeployedUnits: [
                {
                  id: 'dep-1',
                  side: { event: { id: 'ev-incheon' } },
                },
              ],
            },
          ]}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CountryMilitaryWarsPanel (전쟁 · 참전사)', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('언더라인 탭 바와 분리된 컨트롤 툴바 우측에 군사 사건 등록 버튼을 두고, 사건 클릭 시 인라인 모달을 거쳐 상세로 이동한다', async () => {
    renderWarsPanel()

    await screen.findByText('6·25 전쟁')
    expect(screen.getByText('인천 상륙 작전')).toBeInTheDocument()
    expect(screen.getByText('피선포')).toBeInTheDocument()
    expect(screen.getByText('20세기')).toBeInTheDocument()
    expect(screen.getByText('16세기')).toBeInTheDocument()

    // 1차 언더라인 탭 바 안에는 등록 버튼이 들어가지 않고 2단 컨트롤 바에만 위치해야 함
    const tabNav = screen.getByRole('navigation', { name: '군사 사건 유형 탭' })
    expect(
      within(tabNav).queryByRole('button', { name: /군사 사건 등록/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /군사 사건 등록/ }),
    ).toBeInTheDocument()

    // 사건 제목 클릭 → 페이지 즉시 이탈 대신 미리보기 모달 오픈
    fireEvent.click(screen.getByRole('button', { name: '인천 상륙 작전' }))
    expect(mockNavigate).not.toHaveBeenCalled()

    const previewDialog = screen.getByRole('dialog', {
      name: '사건 상세 미리보기',
    })
    expect(within(previewDialog).getByText('preview:ev-incheon')).toBeInTheDocument()
    expect(
      within(previewDialog).getByText(/승리 · 유엔군·국군/),
    ).toBeInTheDocument()

    // 모달 내부 '사건 상세로 이동' 클릭 시 상세 페이지로 진입
    fireEvent.click(
      within(previewDialog).getByRole('button', { name: '사건 상세로 이동' }),
    )
    expect(mockNavigate).toHaveBeenCalledWith('/events/ev-incheon/')
  })

  it('군사 사건 등록 버튼 클릭 시 MILITARY 분야가 프리필된 등록 모달을 연다', async () => {
    renderWarsPanel()

    await screen.findByText('6·25 전쟁')
    fireEvent.click(screen.getByRole('button', { name: /군사 사건 등록/ }))

    const registerDialog = screen.getByRole('dialog', {
      name: '군사 사건 등록 모달',
    })
    expect(within(registerDialog).getByText('domain:MILITARY')).toBeInTheDocument()
  })
})
