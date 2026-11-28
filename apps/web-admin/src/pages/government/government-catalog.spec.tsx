import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import type { AdministrationDepartment } from '@/shared/api/administration-department'
import type { CabinetListItemDto } from '@/shared/api/person-career'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import GovernmentCatalogPage from './government-catalog.page'

const mockGetCabinets = jest.fn()
const mockGetDepartments = jest.fn()
const mockGetCategories = jest.fn()
const mockGetAllContinents = jest.fn()

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/shared/api/treaty', () => ({
  treatyApi: {
    getAll: jest.fn().mockResolvedValue({ items: [] }),
  },
}))
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (pathValue: string) => pathValue,
}))

jest.mock('@/features/country/api', () => ({
  useCountries: () => ({
    data: [
      {
        id: 'kr',
        name: '대한민국',
        isoCode: 'KR',
        flagEmoji: '🇰🇷',
        continentId: 'cont-asia',
      },
      {
        id: 'de',
        name: '독일',
        isoCode: 'DE',
        flagEmoji: '🇩🇪',
        continentId: 'cont-europe',
      },
    ],
  }),
}))

jest.mock('@/features/historical-country/use-historical-countries.hook', () => ({
  useHistoricalCountries: () => ({ data: [] }),
}))

jest.mock('@/shared/api/continents', () => ({
  getAllContinents: (...args: unknown[]) => mockGetAllContinents(...args),
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getCabinets: (...args: unknown[]) => mockGetCabinets(...args),
  },
}))

jest.mock('@/shared/api/administration-department', () => {
  const actual = jest.requireActual('@/shared/api/administration-department')
  return {
    ...actual,
    administrationDepartmentApi: {
      getAll: (...args: unknown[]) => mockGetDepartments(...args),
      getCategories: (...args: unknown[]) => mockGetCategories(...args),
      getByHistoricalCountryId: jest.fn(),
    },
  }
})

jest.mock(
  '@/widgets/country/country-detail/ui/cabinet-form-modal.widget',
  () => ({
    CabinetFormModal: ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div data-testid="cabinet-form-modal">내각 등록 모달</div> : null,
  }),
)

jest.mock('./components/government-department-form-modal', () => ({
  GovernmentDepartmentFormModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="department-form-modal">기관 등록 모달</div>
    ) : null,
}))

jest.mock('@/widgets/person/person-inline-modal/person-inline-modal', () => ({
  PersonInlineModal: () => null,
}))

jest.mock(
  '@/widgets/country/country-inline-modal/country-inline-modal',
  () => ({
    CountryInlineModal: () => null,
    shouldInterceptEntityClick: () => true,
  }),
)

jest.mock('@/shared/ui/institution-appointment-modal', () => ({
  InstitutionAppointmentModal: () => null,
}))

jest.mock(
  '@/widgets/country/country-detail/ui/position-definitions-section.widget',
  () => ({
    PositionDefinitionsSection: ({
      embeddedInModal,
    }: {
      embeddedInModal?: boolean
    }) => (
      <div data-testid="position-definitions-section">
        관직 사전 본문 ({embeddedInModal ? '모달 내장' : '일반'})
      </div>
    ),
  }),
)

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
  window.localStorage.clear()
})

const SAMPLE_CABINETS: CabinetListItemDto[] = [
  {
    id: 'cab-1',
    name: '아데나워 제1차 내각',
    countryId: 'de',
    historicalCountryId: null,
    startDate: '1949-09-20',
    endDate: '1953-10-20',
    description: null,
    country: { id: 'de', name: '독일', flagEmoji: '🇩🇪' },
    historicalCountry: null,
    headTenure: {
      id: 'ten-1',
      startDate: '1949-09-20',
      endDate: '1953-10-20',
      title: '연방총리',
      appointmentMethod: 'PARLIAMENTARY_ELECTION',
      endReason: null,
      person: {
        id: 'per-1',
        name: '콘라트 아데나워',
        profileImageUrl: null,
      },
      positionDefinition: {
        id: 'pos-pm',
        title: '연방총리',
        positionType: 'HEAD_OF_GOVERNMENT',
      },
    },
    _count: {
      tenures: 14,
      events: 2,
      treatySignatories: 1,
    },
  } as unknown as CabinetListItemDto,
  {
    id: 'cab-2',
    name: '현직 샘플 행정부',
    countryId: 'kr',
    historicalCountryId: null,
    startDate: '2022-05-10',
    endDate: null,
    description: null,
    country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
    historicalCountry: null,
    headTenure: {
      id: 'ten-2',
      startDate: '2022-05-10',
      endDate: null,
      title: '대통령',
      appointmentMethod: 'DIRECT_ELECTION',
      endReason: null,
      person: {
        id: 'per-2',
        name: '샘플 수반',
        profileImageUrl: null,
      },
      positionDefinition: {
        id: 'pos-pres',
        title: '대통령',
        positionType: 'HEAD_OF_STATE',
      },
    },
    _count: {
      tenures: 18,
      events: 0,
      treatySignatories: 0,
    },
  } as unknown as CabinetListItemDto,
]

const SAMPLE_DEPARTMENTS: AdministrationDepartment[] = [
  {
    id: 'dept-1',
    name: '외교부',
    abbreviation: 'MOFA',
    nameLocal: null,
    nameEn: 'Ministry of Foreign Affairs',
    kind: 'MINISTRY',
    countryId: 'kr',
    historicalCountryId: null,
    categoryId: 'cat-foreign',
    category: { id: 'cat-foreign', name: '외교·통상' },
    country: { id: 'kr', name: '대한민국', flagEmoji: '🇰🇷' },
    historicalCountry: null,
    establishedDate: '1948-07-17',
    abolishedDate: null,
    established: null,
    abolished: null,
    parentId: null,
    parent: null,
    headquarters: '서울 종로구',
    primaryMission: '외교 정책 수립 및 재외국민 보호',
    tenureCount: 38,
    eventCount: 4,
  } as unknown as AdministrationDepartment,
]

function renderCatalog(initialEntry = '/government') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/government" element={<GovernmentCatalogPage />} />
          <Route
            path="/government/positions"
            element={<div>관직 정본 관리 전용 지면</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GovernmentCatalogPage — 행정 리스트 페이지 디자인 개선', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockGetAllContinents.mockResolvedValue([
      { id: 'cont-asia', name: '아시아' },
      { id: 'cont-europe', name: '유럽' },
    ])
    mockGetCategories.mockResolvedValue([
      { id: 'cat-foreign', name: '외교·통상' },
    ])
    mockGetCabinets.mockResolvedValue(SAMPLE_CABINETS)
    mockGetDepartments.mockResolvedValue(SAMPLE_DEPARTMENTS)
  })

  it('상단 헤더 타이틀·요약 지표·공통 보라색 등록 버튼과 도메인 탭 전환을 렌더한다', async () => {
    renderCatalog()

    expect(
      screen.getByRole('heading', { name: '정부 · 행정 카탈로그' }),
    ).toBeInTheDocument()

    expect(
      await screen.findByText('아데나워 제1차 내각'),
    ).toBeInTheDocument()

    const registerCabinetBtn = screen.getByRole('button', {
      name: '새 내각 등록',
    })
    expect(registerCabinetBtn).toBeInTheDocument()
    fireEvent.click(registerCabinetBtn)
    expect(screen.getByTestId('cabinet-form-modal')).toBeInTheDocument()

    const deptTab = screen.getByRole('tab', { name: /중앙부처 · 기관/ })
    fireEvent.click(deptTab)

    expect(await screen.findByText('외교부')).toBeInTheDocument()
    const registerDeptBtn = screen.getByRole('button', {
      name: '새 기관 등록',
    })
    fireEvent.click(registerDeptBtn)
    expect(screen.getByTestId('department-form-modal')).toBeInTheDocument()
  })

  it('세부 필터 팝오버에서 대륙 조건을 선택하면 배지와 적용 필터 칩이 표시되고 해제할 수 있다', async () => {
    renderCatalog()
    await screen.findByText('아데나워 제1차 내각')

    const filterBtn = screen.getByRole('button', { name: /필터/ })
    fireEvent.click(filterBtn)

    const filterDialog = await screen.findByRole('dialog', {
      name: '세부 필터 설정',
    })
    const continentSelect = within(filterDialog).getByLabelText('대륙 필터')
    fireEvent.change(continentSelect, { target: { value: 'cont-europe' } })

    await waitFor(() => {
      expect(screen.getByText('대륙: 유럽')).toBeInTheDocument()
    })
    expect(screen.queryByText('현직 샘플 행정부')).not.toBeInTheDocument()
    expect(screen.getByText('아데나워 제1차 내각')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '대륙: 유럽 해제' }))
    await waitFor(() => {
      expect(screen.queryByText('대륙: 유럽')).not.toBeInTheDocument()
    })
  })

  it('관직·직책 정본 탭 또는 관리 버튼 클릭 시 전용 관리 지면(/government/positions)으로 이동한다', async () => {
    renderCatalog()
    await screen.findByText('아데나워 제1차 내각')

    fireEvent.click(screen.getByRole('tab', { name: '관직 · 직책 정본' }))

    expect(
      await screen.findByText('관직 정본 관리 전용 지면'),
    ).toBeInTheDocument()
  })
})
