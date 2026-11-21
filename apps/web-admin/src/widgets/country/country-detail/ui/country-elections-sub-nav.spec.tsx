import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { CountryElectionsSection } from './country-elections-section.widget'

const electionsMock = jest.fn(async () => [] as unknown[])
const partiesMock = jest.fn(async () => [] as unknown[])

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/widgets/person/person-detail-panel/person-detail-panel', () => ({ PersonDetailPanel: () => null }))
jest.mock('@/shared/ui/rich-text-editor/rich-text-editor', () => ({ RichTextEditor: () => null }))
jest.mock('@/entities/country/api', () => ({ useCountry: () => ({ data: undefined }) }))
jest.mock('@/entities/person/api', () => ({ usePersons: () => ({ data: [] }) }))
jest.mock('@/features/country/api/use-historical-countries-by-modern-country.hook', () => ({
  useHistoricalCountriesByModernCountry: () => ({ data: [] }),
}))
jest.mock('@/shared/api/election', () => {
  const actual = jest.requireActual('@/shared/api/election')
  return {
    ...actual,
    getElections: () => electionsMock(),
    getPoliticalParties: () => partiesMock(),
    getElectoralDistricts: async () => [],
  }
})
jest.mock('./country-political-parties-block.widget', () => ({
  CountryPoliticalPartiesBlock: () => <div data-testid="parties-block" />,
}))

function renderSection(initialEntry = '/countries/de/elections') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CountryElectionsSection countryId="de" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('정당·선거 하위 메뉴 한 줄', () => {
  it('제목 머리 없이 하위 탭(정당·선거)만 — 위 탭 이름을 되풀이하지 않는다', async () => {
    renderSection()
    const tablist = await screen.findByRole('tablist', { name: '정당·선거 하위 메뉴' })
    expect(tablist).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^선거/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^정당/ })).toHaveAttribute('aria-selected', 'false')
    expect(screen.queryByRole('heading', { name: '선거·투표' })).not.toBeInTheDocument()
    expect(screen.queryByText(/탭에서 정당과 선거를 나눕니다/)).not.toBeInTheDocument()
  })

  it('선거가 없으면 등록 버튼은 빈 화면에 하나만', async () => {
    renderSection()
    expect(await screen.findByRole('region', { name: '아직 등록된 선거가 없습니다' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /선거 등록/ })).toHaveLength(1)
  })

  it('정당 하위 탭은 URL(?subtab=parties)로 열린다', async () => {
    renderSection('/countries/de/elections?subtab=parties')
    expect(await screen.findByTestId('parties-block')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^정당/ })).toHaveAttribute('aria-selected', 'true')
  })
})
