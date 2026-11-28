import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import { getTheme } from '@/shared/styles/theme'

import { WarDeclarationFormModal } from './war-declaration-form-modal'

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  getApiBaseUrl: () => 'http://localhost:4000',
}))

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  __esModule: true,
  default: () => jest.fn(),
  useClickSound: () => jest.fn(),
}))

jest.mock('@/entities/political-system/api', () => ({
  usePoliticalSystems: () => ({
    data: [
      {
        id: 'ps-us',
        name: '합중국 헌법 체제',
        governmentForm: 'PRESIDENTIAL',
        legislatureType: 'BICAMERAL',
        startEra: 'AD',
        startYear: 1789,
        endYear: null,
        isCurrent: true,
        warPowerAuthority: 'LEGISLATURE_EXCLUSIVE',
        warConsentChamberId: 'ch-house',
        warPowerNotes: '연방의회가 전속 선전포고권을 보유함',
      },
    ],
  }),
}))

jest.mock('@/features/country/api/use-countries.hook', () => ({
  useCountries: () => ({ data: [], isLoading: false }),
}))

jest.mock('@/features/historical-country/use-historical-countries.hook', () => ({
  useHistoricalCountries: () => ({ data: [], isLoading: false }),
}))

jest.mock('@/shared/api/chamber', () => ({
  chamberKeys: { list: (s: unknown) => ['chambers', s] },
  chamberApi: {
    list: () =>
      Promise.resolve([
        { id: 'ch-house', name: '연방하원', shortName: null, localName: null, role: 'LOWER' },
      ]),
  },
  chamberLabel: (c: { name: string }) => c.name,
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getTenuresByCountry: () =>
      Promise.resolve([
        {
          id: 't-fdr',
          positionType: 'HEAD_OF_STATE',
          title: '대통령',
          startEra: 'AD',
          startYear: 1933,
          endYear: 1945,
          person: { name: '프랭클린 루스벨트', surname: null, middleName: null },
        },
      ]),
    getCabinets: () => Promise.resolve([]),
  },
}))

jest.mock('@/shared/api/person', () => ({
  personApi: { getByCountryId: () => Promise.resolve([]) },
}))

jest.mock('@/shared/api/persons', () => ({
  getPersonsByHistoricalCountryUnion: () => Promise.resolve([]),
}))

jest.mock('@/shared/api/treaty', () => ({
  treatyApi: { getAll: () => Promise.resolve({ items: [], total: 0 }) },
}))

jest.mock('./linked-event-picker-field', () => ({
  LinkedEventPickerField: ({ inputId }: { inputId?: string }) => (
    <input data-testid={inputId ?? 'linked-event-picker'} />
  ),
}))

describe('WarDeclarationFormModal friendly studio interactions', () => {
  const renderModal = (withParties = true) => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ThemeProvider theme={getTheme('light')}>
            <WarDeclarationFormModal
              open
              onClose={jest.fn()}
              defaultDeclaring={
                withParties
                  ? {
                      id: 'c-us',
                      name: '미국',
                      flagEmoji: '🇺🇸',
                      isHistorical: false,
                    }
                  : null
              }
              defaultTarget={
                withParties
                  ? {
                      id: 'hc-jp',
                      name: '일본 제국',
                      isHistorical: true,
                    }
                  : null
              }
            />
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('shows friendly step-by-step guidance when countries are not chosen yet', () => {
    renderModal(false)

    expect(
      screen.getByText(
        /위에서 선포한 국가와 상대 국가를 고르면, 입력한 내용이 한 줄 역사 기록 문장으로 자동 완성돼요/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '+ 선포한 국가 선택' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '+ 상대 국가 선택' }),
    ).toBeInTheDocument()
  })

  it('toggles casus belli sparks on/off, expands progressive drawers on demand, updates vote meter, and swaps parties', async () => {
    renderModal(true)

    // 1. 초기 위기 계기판 · 대치 전광판 · 자동 제목 미리보기 확인
    expect(
      screen.getByText('LV.5 · 전면 교전 돌입 · 정식 선전포고'),
    ).toBeInTheDocument()
    expect(screen.getByText('포고 전문 미리보기')).toBeInTheDocument()
    expect(
      screen.getByText(/미국.*측이 일본 제국에 공식 선전포고를 전달함/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/자동 문서 제목: 「미국의 대\(對\)일본 제국 선전포고」/),
    ).toBeInTheDocument()

    // 2. 명분 스파크 칩 클릭 시 추가되고, 다시 누르면 깔끔하게 제거되는지 확인
    fireEvent.click(screen.getByRole('button', { name: '+ 최후통첩 거부' }))
    expect(
      screen.getByDisplayValue('최후통첩 시한 만료 및 핵심 요구 조건 거부'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✓ 최후통첩 거부' }))
    expect(
      screen.queryByDisplayValue('최후통첩 시한 만료 및 핵심 요구 조건 거부'),
    ).not.toBeInTheDocument()

    // 3. 의회 표결 원클릭 도우미 + 찬성 388 입력 시 만장일치 가결 판정 확인
    fireEvent.click(
      screen.getByRole('button', { name: '반대·기권 0으로 채우기' }),
    )
    fireEvent.change(screen.getByPlaceholderText('예: 388'), {
      target: { value: '388' },
    })
    expect(screen.getByText('만장일치 가결')).toBeInTheDocument()
    expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(2)

    // 4. 종결 방식 칩을 누르기 전에는 종결 세부 입력이 접혀 있다가, 선택 시 상단 위기 계기판이 '종전·강화 기록됨'으로 전환되고 세부 입력이 펼쳐짐
    expect(screen.queryByText('종결 · 휴전 날짜')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '항복 조인' }))
    expect(screen.getByText('종결 · 휴전 날짜')).toBeInTheDocument()
    expect(screen.getByText('종전·강화 기록됨 (항복 조인)')).toBeInTheDocument()

    // 5. 관련 사건 서랍: 기본적으로 접혀 있고, 펼치면 새 사건 생성 없이 탭 전환으로 한 번에 하나의 검색창만 노출됨
    fireEvent.click(
      screen.getByRole('button', {
        name: /이미 등록된 관련 사건\(최후통첩·연설 등\)이 있을 때만 연결 — 없어도 됩니다/,
      }),
    )
    expect(screen.getByTestId('war-decl-ultimatum-event')).toBeInTheDocument()
    expect(
      screen.queryByTestId('war-decl-narrative-event'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /당일 연설·비화 사건/ }))
    expect(screen.getByTestId('war-decl-narrative-event')).toBeInTheDocument()
    expect(
      screen.queryByTestId('war-decl-ultimatum-event'),
    ).not.toBeInTheDocument()

    // 6. 공수 전환 클릭 시 선포국 ↔ 상대국 역전 확인
    fireEvent.click(screen.getByRole('button', { name: /공수 전환/ }))
    expect(
      screen.getByText(/일본 제국.*측이.*미국에 공식 선전포고를 전달함/),
    ).toBeInTheDocument()
  })
})
