import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { politicalPartyApi } from '@/shared/api/political-party'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PartyExpressionFormModal, PartyHeadquartersFormModal, PartySymbolFormModal } from './party-mark-sections'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
  uploadImage: jest.fn(async () => ({ url: '/uploads/political-parties/fasces.png' })),
  validateImageFile: jest.fn(),
}))
jest.mock('@/shared/api/city', () => ({
  cityApi: { searchCities: jest.fn(async () => [{ id: 'rome', name: '로마', countryId: 'it', countryName: '이탈리아' }]) },
}))
jest.mock('@/shared/api/political-party', () => ({
  ...jest.requireActual('@/shared/api/political-party'),
  politicalPartyApi: {
    createSymbol: jest.fn(async () => ({})),
    updateSymbol: jest.fn(async () => ({})),
    createExpression: jest.fn(async () => ({})),
    updateExpression: jest.fn(async () => ({})),
    createHeadquarters: jest.fn(async () => ({})),
    updateHeadquarters: jest.fn(async () => ({})),
  },
}))

const withQuery = (node: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>
)

describe('표지 모달', () => {
  beforeEach(() => jest.clearAllMocks())

  it('이미지를 올리기 전에는 막고, 올리면 종류·대표·캡션과 함께 저장', async () => {
    const onSaved = jest.fn()
    renderWithTheme(withQuery(<PartySymbolFormModal partyId="pnf" onClose={jest.fn()} onSaved={onSaved} />))
    expect(screen.getByText('필수: 이미지')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'EMBLEM' } })
    fireEvent.change(screen.getByLabelText('이미지 파일'), {
      target: { files: [new File(['x'], 'fasces.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByLabelText('이미지 주소')).toHaveValue('/uploads/political-parties/fasces.png'))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText(/^캡션/), { target: { value: '파스케스' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(politicalPartyApi.createSymbol).toHaveBeenCalledWith('pnf', {
      kind: 'EMBLEM',
      imageUrl: '/uploads/political-parties/fasces.png',
      caption: '파스케스',
      isPrimary: true,
      start: null,
      end: null,
    })
  })
})

describe('표어·당가 모달', () => {
  beforeEach(() => jest.clearAllMocks())

  it('당가는 원문 칸이 제목 — 원문·언어·번역으로 저장', async () => {
    const onSaved = jest.fn()
    renderWithTheme(withQuery(<PartyExpressionFormModal partyId="pnf" onClose={jest.fn()} onSaved={onSaved} />))
    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'ANTHEM' } })
    fireEvent.change(screen.getByLabelText(/^제목\(원어\)/), { target: { value: 'Giovinezza' } })
    fireEvent.change(screen.getByLabelText('언어'), { target: { value: 'it' } })
    fireEvent.change(screen.getByLabelText(/^번역 제목/), { target: { value: '청춘이여' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(politicalPartyApi.createExpression).toHaveBeenCalledWith(
      'pnf',
      expect.objectContaining({ kind: 'ANTHEM', originalText: 'Giovinezza', languageCode: 'it', translation: '청춘이여' }),
    )
  })

  it('언어 코드 형식이 틀리면 막는다', () => {
    renderWithTheme(withQuery(<PartyExpressionFormModal partyId="pnf" onClose={jest.fn()} onSaved={jest.fn()} />))
    fireEvent.change(screen.getByLabelText(/^원문/), { target: { value: 'Credere' } })
    fireEvent.change(screen.getByLabelText('언어'), { target: { value: '이탈리아어' } })
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})

describe('당사 모달', () => {
  beforeEach(() => jest.clearAllMocks())

  it('도시·건물·주소가 모두 비면 막고, 도시를 골라 지금의 당사로 저장(끝은 비움)', async () => {
    const onSaved = jest.fn()
    renderWithTheme(withQuery(<PartyHeadquartersFormModal partyId="pnf" countryId="it" onClose={jest.fn()} onSaved={onSaved} />))
    expect(screen.getByText('필수: 도시·건물·주소 중 하나')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('도시 찾기'), { target: { value: '로마' } })
    fireEvent.click(await screen.findByRole('option', { name: /로마/ }))
    fireEvent.change(screen.getByLabelText(/^건물/), { target: { value: '팔라초 브라스키' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(politicalPartyApi.createHeadquarters).toHaveBeenCalledWith(
      'pnf',
      expect.objectContaining({ cityId: 'rome', buildingName: '팔라초 브라스키', isCurrent: true, end: null }),
    )
  })
})
