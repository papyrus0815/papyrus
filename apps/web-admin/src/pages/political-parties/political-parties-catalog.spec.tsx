import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PoliticalPartiesCatalogPage } from './political-parties-catalog.page'

const PARTIES = [
  {
    id: 'spd',
    name: '사회민주당',
    shortName: 'SPD',
    position: 'LEFT',
    ideology: '사회민주주의',
    foundedDate: '1875-05-22T00:00:00.000Z',
    dissolvedDate: null,
    historicalCountryId: 'de-empire',
    historicalCountry: { name: '독일 제국' },
    _count: { electionPartyResults: 3, transitionsFrom: 1 },
  },
  {
    id: 'zentrum',
    name: '중앙당',
    shortName: 'Zentrum',
    position: 'CENTER',
    ideology: '정치적 가톨릭',
    foundedDate: '1870-12-13T00:00:00.000Z',
    dissolvedDate: '1933-07-05T00:00:00.000Z',
    historicalCountryId: 'de-empire',
    historicalCountry: { name: '독일 제국' },
    _count: {},
  },
  {
    id: 'liberal',
    name: '자유당',
    shortName: 'Liberal',
    position: 'CENTER_LEFT',
    foundedDate: '1859-06-06T00:00:00.000Z',
    dissolvedDate: null,
    historicalCountryId: 'uk',
    historicalCountry: { name: '그레이트브리튼 및 아일랜드 연합왕국' },
    _count: { cabinetAffiliations: 1 },
  },
]

jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/widgets/political-party/political-party-quick-create-modal', () => ({
  PoliticalPartyQuickCreateModal: () => null,
}))
jest.mock('@/shared/api/political-party', () => {
  const actual = jest.requireActual('@/shared/api/political-party')
  return {
    ...actual,
    politicalPartyApi: {
      getAll: async () => PARTIES,
      getById: async () => null,
      getLineage: async () => ({ predecessors: [], successors: [] }),
      getEvents: async () => [],
    },
  }
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderWithTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/political-parties']}>
        <PoliticalPartiesCatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('정당 목록 — 국가 묶음 · 고정 열 · 배지', () => {
  it('국가·체제로 묶고(정당 많은 나라 먼저), 행마다 국가 알약을 되풀이하지 않는다', async () => {
    renderPage()
    const germany = await screen.findByRole('region', { name: '독일 제국 정당 2곳' })
    const britain = screen.getByRole('region', { name: /연합왕국 정당 1곳/ })
    expect(germany.compareDocumentPosition(britain) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // 묶음 안은 창당 오래된순 — 중앙당(1870) → 사민당(1875)
    const rowNames = within(germany).getAllByRole('button').map((row) => row.textContent ?? '')
    expect(rowNames[0]).toContain('중앙당')
    expect(rowNames[1]).toContain('사회민주당')
    expect(within(germany).queryByText('독일 제국', { selector: 'span:not(.name)' })).toBeNull()
  })

  it('배지는 낱말을 자르지 않는다 — 짧은 약칭은 그대로, 긴 약칭은 당명 앞 두 글자', async () => {
    renderPage()
    await screen.findByRole('region', { name: '독일 제국 정당 2곳' })
    expect(screen.getAllByText('SPD').length).toBeGreaterThan(0)
    expect(screen.queryByText('Libe')).toBeNull()
    expect(screen.queryByText('Zent')).toBeNull()
    expect(screen.getByText('자유')).toBeInTheDocument()
    expect(screen.getByText('중앙')).toBeInTheDocument()
  })

  it('그래프 카드 없이 스펙트럼 한 줄이 거르기를 맡고, 기록 수는 글자로', async () => {
    renderPage()
    await screen.findByRole('region', { name: '독일 제국 정당 2곳' })
    expect(screen.queryByText('주요 국가 · 시대 체제')).toBeNull()
    expect(screen.queryByText('존속 현황 · 아카이브 연동')).toBeNull()
    const spectrum = screen.getByRole('group', { name: '이념 스펙트럼 필터' })
    fireEvent.click(within(spectrum).getByRole('button', { name: /^좌파/ }))
    expect(screen.queryByRole('region', { name: /연합왕국/ })).toBeNull()
    const spdRow = screen.getByRole('button', { name: /사회민주당/ })
    expect(spdRow).toHaveTextContent('선거 3')
    expect(spdRow).toHaveTextContent('계보 1')
    expect(spdRow).toHaveTextContent('1875–현재')
  })
})
