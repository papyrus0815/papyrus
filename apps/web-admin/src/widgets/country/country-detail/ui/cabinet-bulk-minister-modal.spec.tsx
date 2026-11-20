import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { AdministrationDepartment } from '@/shared/api/administration-department'
import {
  type CabinetListItemDto,
  personCareerApi,
} from '@/shared/api/person-career'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import {
  CabinetBulkMinisterModal,
  deriveDefaultPortfolioRoleTitle,
} from './cabinet-bulk-minister-modal.widget'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))

jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {
    getPositionDefinitions: jest.fn(async () => []),
    addGovernmentPositionTenure: jest.fn(async () => ({ id: 'tenure-new-1' })),
  },
}))

jest.mock('@/shared/api/persons', () => ({
  getPersonsByTenureCountry: jest.fn(async () => [
    { id: 'person-1', name: '병영', surname: '조', nameDisplayOrder: 'korean' },
    { id: 'person-2', name: '창욱', surname: '장', nameDisplayOrder: 'korean' },
  ]),
  getPersonsByHistoricalCountryUnion: jest.fn(async () => []),
  searchPersons: jest.fn(async () => []),
  createPerson: jest.fn(),
}))

const SAMPLE_CABINET: CabinetListItemDto = {
  id: 'cab-1',
  name: '제1공화국 초대 내각',
  countryId: 'country-kr',
  startEra: 'AD',
  startYear: 1948,
  startMonth: 8,
  startDay: 15,
  startDate: '1948-08-15',
  endDate: '1950-04-21',
} as unknown as CabinetListItemDto

const SAMPLE_DEPARTMENTS: AdministrationDepartment[] = [
  {
    id: 'dept-foreign',
    name: '외무부',
    kind: 'MINISTRY',
    countryId: 'country-kr',
  } as AdministrationDepartment,
  {
    id: 'dept-justice',
    name: '검찰청',
    kind: 'AGENCY',
    countryId: 'country-kr',
  } as AdministrationDepartment,
]

describe('CabinetBulkMinisterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('derives idiomatic default minister titles across modern and historical departments', () => {
    expect(
      deriveDefaultPortfolioRoleTitle(
        { id: 'd1', name: '외교부', kind: 'MINISTRY' },
        [],
      ).title,
    ).toBe('외교부 장관')
    expect(
      deriveDefaultPortfolioRoleTitle(
        { id: 'd2', name: '이조', kind: 'MINISTRY' },
        [],
      ).title,
    ).toBe('이조판서')
    expect(
      deriveDefaultPortfolioRoleTitle(
        { id: 'd3', name: '의정부', kind: 'MINISTRY' },
        [],
      ).title,
    ).toBe('영의정')
    expect(
      deriveDefaultPortfolioRoleTitle(
        { id: 'd4', name: '검찰청', kind: 'AGENCY' },
        [],
      ).title,
    ).toBe('검찰청장')
  })

  it('assigns persons across multiple ministry rows and batch-creates tenures on submit', async () => {
    const handleSaved = jest.fn()
    const handleClose = jest.fn()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })

    renderWithTheme(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CabinetBulkMinisterModal
            isOpen
            onClose={handleClose}
            onSaved={handleSaved}
            cabinet={SAMPLE_CABINET}
            departments={SAMPLE_DEPARTMENTS}
            existingMinisters={[]}
            countryId="country-kr"
            countryName="대한민국"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByDisplayValue('외무부 장관')).toBeInTheDocument()
    expect(screen.getByDisplayValue('검찰청장')).toBeInTheDocument()

    // Assign person to first row (외무부)
    const pickButtons = screen.getAllByRole('button', {
      name: /인물 검색 · 배정/,
    })
    fireEvent.click(pickButtons[0])

    const candidateBtn = await screen.findByRole('button', {
      name: /장\s*창욱/,
    })
    fireEvent.click(candidateBtn)

    expect(screen.getByText('1명 임명 준비됨')).toBeInTheDocument()

    // Submit batch appointment
    fireEvent.click(screen.getByRole('button', { name: '1명 일괄 임명' }))

    await waitFor(() => {
      expect(
        personCareerApi.addGovernmentPositionTenure,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: 'person-2',
          positionType: 'CABINET_MINISTER',
          title: '외무부 장관',
          administrationDepartmentId: 'dept-foreign',
          cabinetId: 'cab-1',
        }),
      )
    })
    expect(handleSaved).toHaveBeenCalledWith(1)
  })
})
