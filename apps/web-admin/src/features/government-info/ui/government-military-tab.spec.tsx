import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { GovernmentMilitaryTab } from './government-military-tab.widget'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('@/shared/api/client', () => ({
  getApiConnection: () => ({ host: 'http://localhost:8000', headers: {} }),
  apiConnection: { host: 'http://localhost:8000', headers: {} },
}))

jest.mock('@/features/country/api/use-historical-countries-by-modern-country.hook', () => ({
  useHistoricalCountriesByModernCountry: () => ({ data: [] }),
}))

jest.mock('@/features/government-info/model/use-constituent-historical-polities', () => ({
  useConstituentHistoricalPolities: () => ({ data: [] }),
}))

jest.mock('./unlinked-country-tenures-bar', () => ({
  UnlinkedCountryTenuresBar: () => null,
}))

jest.mock('@/entities/military-unit', () => ({
  ...jest.requireActual('@/entities/military-unit'),
  fetchCountryScopedMilitaryUnits: jest.fn(async () => [
    {
      id: 'unit-jcs',
      name: '합동참모본부',
      abbreviation: '합참',
      unitType: 'GENERAL_STAFF',
      branch: 'JOINT',
      isActive: true,
      garrison: '서울 용산구',
      established: { era: 'AD', year: 1954, month: null, day: null, precision: 'year' },
      tenures: [
        {
          id: 'ten-1',
          rankTitle: '대장',
          person: { id: 'p-1', name: '김명수', surname: null },
        },
      ],
      sideDeployedUnits: [],
      eventRelations: [{ relationId: 'rel-1', role: 'ISSUER', event: { id: 'ev-1', title: '작전 지령' } }],
    },
    {
      id: 'unit-7corps',
      name: '제7기동군단',
      abbreviation: '7군단',
      nickname: '북진선봉',
      unitType: 'CORPS',
      branch: 'ARMY',
      parentUnitId: 'unit-jcs',
      isActive: true,
      garrison: '경기도 이천시',
      established: { era: 'AD', year: 1989, month: 10, day: null, precision: 'month' },
      tenures: [],
      sideDeployedUnits: [{ id: 'dep-1' }],
      eventRelations: [],
    },
  ]),
}))

function renderTab(
  props: Partial<React.ComponentProps<typeof GovernmentMilitaryTab>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GovernmentMilitaryTab
          effectiveCountryId="country-kr"
          country={{ id: 'country-kr', name: '대한민국', type: 'modern' } as never}
          onCreateUnit={jest.fn()}
          onEditUnit={jest.fn()}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GovernmentMilitaryTab (편제 · 사령부) — 원장 디자인 및 단독 상세 직행', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('최상단에 군종 탭 메뉴와 편제 계통 전환 버튼을 배치하고, 부대 클릭 시 단독 상세 페이지로 이동한다', async () => {
    renderTab()

    await screen.findByText('합동참모본부')
    expect(screen.getByText('제7기동군단')).toBeInTheDocument()
    expect(screen.getByText('경기도 이천시')).toBeInTheDocument()
    expect(screen.getByText('대장 김명수')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: '군종 탭' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /편제 계통/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /모두 접기/ }),
    ).toBeInTheDocument()

    // 접기 버튼 클릭 시 상세 이동이 발생하지 않고 하위 편제만 접혀야 함
    fireEvent.click(screen.getByRole('button', { name: '예하 부대 접기' }))
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.queryByText('제7기동군단')).not.toBeInTheDocument()

    // 다시 펼친 뒤 부대 행 클릭 → 단독 상세 URL로 곧장 이동
    fireEvent.click(screen.getByRole('button', { name: '예하 부대 펼치기' }))
    fireEvent.click(screen.getByRole('link', { name: '제7기동군단 상세 보기' }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/military/units/unit-7corps',
      expect.objectContaining({
        state: {
          fromCountry: {
            id: 'country-kr',
            name: '대한민국',
          },
        },
      }),
    )
  })

  it('원장 표 보기에서도 행 클릭 시 곧바로 단독 상세로 이동한다', async () => {
    const onOpenUnitDetail = jest.fn()
    renderTab({ onOpenUnitDetail })

    await screen.findByText('합동참모본부')
    fireEvent.click(screen.getByRole('button', { name: /원장 표/ }))

    await waitFor(() =>
      expect(
        screen.getByRole('columnheader', { name: /사령부 · 부대/ }),
      ).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByText('합동참모본부'))

    expect(onOpenUnitDetail).toHaveBeenCalledWith('unit-jcs')
  })
})
