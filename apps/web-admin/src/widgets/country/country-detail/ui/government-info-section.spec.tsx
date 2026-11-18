import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { GovernmentInfoSection } from './government-info-section.widget'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/widgets/person/person-detail-panel/person-detail-panel', () => ({
  PersonDetailPanel: () => null,
}))

jest.mock('@/shared/api/client', () => ({
  getApiConnection: jest.fn(() => ({ host: 'http://localhost:3000' })),
  apiConnection: { host: 'http://localhost:3000' },
}))

jest.mock('@/shared/api/api.service', () => ({
  nestiaApiService: { getConnection: jest.fn(() => ({})) },
  API_BASE_URL: 'http://localhost:3000',
}))

jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
  uploadImage: jest.fn(),
  validateImageFile: jest.fn(),
}))

jest.mock('@/entities/political-system/api', () => ({
  usePoliticalSystems: jest.fn(() => ({
    data: [],
    isLoading: false,
    isFetched: true,
  })),
  useCreatePoliticalSystem: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useUpdatePoliticalSystem: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useDeletePoliticalSystem: jest.fn(() => ({ mutateAsync: jest.fn() })),
}))

jest.mock(
  '@/features/government-info/model/use-constituent-historical-polities',
  () => ({
    useConstituentHistoricalPolities: jest.fn(() => ({
      data: [],
      isLoading: false,
    })),
  }),
)

jest.mock(
  '@/features/country/api/use-historical-countries-by-modern-country.hook',
  () => ({
    useHistoricalCountriesByModernCountry: jest.fn(() => ({
      data: [],
      isLoading: false,
    })),
  }),
)

jest.mock('@/shared/api/administration-department', () => ({
  DEPARTMENT_KIND_LABEL: {
    MINISTRY: '중앙부처',
    AGENCY: '외청·위원회',
  },
  administrationDepartmentApi: {
    getByCountryId: jest.fn(async () => []),
    getByHistoricalCountryId: jest.fn(async () => []),
    getCategories: jest.fn(async () => [
      { id: 'cat-def', name: '국방', sortOrder: 1 },
    ]),
    getAll: jest.fn(async () => []),
  },
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getCabinets: jest.fn(async () => []),
    getPositionDefinitions: jest.fn(async () => [
      {
        id: 'pos-1',
        title: '국무총리',
        countryId: 'country-kr',
        historicalCountryId: null,
      },
    ]),
    getTenuresByCountry: jest.fn(async () => []),
    getUnlinkedCountryTenures: jest.fn(async () => []),
  },
}))

jest.mock('@/shared/api/persons', () => ({
  getAllPersons: jest.fn(async () => []),
}))

jest.mock('@/shared/api/treaty', () => ({
  TREATY_PARTICIPATION_LABELS: {},
  TREATY_TYPE_LABELS: {},
  treatyApi: {
    getAll: jest.fn(async () => []),
  },
}))

jest.mock('@/shared/api/military-unit', () => ({
  militaryUnitApi: {
    getByCountryId: jest.fn(async () => []),
    getByHistoricalCountryId: jest.fn(async () => []),
    getAll: jest.fn(async () => []),
  },
}))

const sampleCountry: UnifiedCountry = {
  id: 'country-kr',
  type: 'modern',
  name: '대한민국',
  isoCode: 'KR',
} as UnifiedCountry

describe('GovernmentInfoSection page declutter & three-dot menus', () => {
  it('consolidates top-bar tools into a three-dot menu and switches cleanly across all 4 sub-tabs', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    renderWithTheme(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/countries/country-kr?tab=government']}>
          <GovernmentInfoSection
            country={sampleCountry}
            countryId="country-kr"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Sub-tabs render cleanly
    expect(screen.getByRole('tab', { name: /정체·헌정/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /행정부·내각/ })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /중앙부처·국가기관/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /통계·연혁/ })).toBeInTheDocument()

    // Global tools are tucked inside the top-right three-dot menu instead of exposed side-by-side
    expect(
      screen.queryByRole('button', { name: /전 국가 정부·내각 허브/ }),
    ).not.toBeInTheDocument()

    const pageToolsTrigger = screen.getByRole('button', {
      name: '정부·행정 도구 및 사전 메뉴',
    })
    fireEvent.click(pageToolsTrigger)
    expect(
      screen.getByRole('menuitem', { name: /고유 관직 · 직제 사전/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /전역 직능 분류 관리/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /전 국가 정부·내각 허브/ }),
    ).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })

    // Switch to 행정부·내각 -> exposes clean toolbar with three-dot settings menu
    fireEvent.click(screen.getByRole('tab', { name: /행정부·내각/ }))
    expect(
      await screen.findByRole('button', {
        name: '행정부 목록 표시 및 필터 설정',
      }),
    ).toBeInTheDocument()

    // Switch to 중앙부처·국가기관 -> exposes clean toolbar with three-dot settings menu
    fireEvent.click(screen.getByRole('tab', { name: /중앙부처·국가기관/ }))
    expect(
      await screen.findByRole('button', {
        name: '기관 목록 보기 및 필터 설정',
      }),
    ).toBeInTheDocument()

    // Switch to 통계·연혁 -> renders clean KPI cards without verbose zero-count clutter
    fireEvent.click(screen.getByRole('tab', { name: /통계·연혁/ }))
    expect(screen.getByText('성격별 기관 구성')).toBeInTheDocument()
  })
})
