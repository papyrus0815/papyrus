import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PartyAliasFormModal, PartyLegalStatusFormModal } from './party-identity-sections'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/shared/api/election', () => ({
  getLaws: jest.fn(async () => [{ id: 'law-1926', name: '국가 방위법(1926)' }]),
}))
jest.mock('./linked-event-picker-field', () => ({
  LinkedEventPickerField: () => <div data-testid="event-picker" />,
}))

const withQuery = (node: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {node}
  </QueryClientProvider>
)

describe('정당 이름 모달', () => {
  it('번역명 + 언어 + 대표 + 기간(연도만)으로 저장', () => {
    const onSubmit = jest.fn()
    renderWithTheme(withQuery(<PartyAliasFormModal saving={false} onClose={jest.fn()} onSubmit={onSubmit} />))
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/^이름/), { target: { value: 'National Fascist Party' } })
    fireEvent.change(screen.getByLabelText('유형'), { target: { value: 'TRANSLATION' } })
    fireEvent.change(screen.getByLabelText(/^언어/), { target: { value: 'en' } })
    fireEvent.click(screen.getByRole('checkbox'))
    const startField = screen.getByLabelText('쓰기 시작')
    fireEvent.change(startField.querySelector('input[aria-label="연도"]') as HTMLInputElement, { target: { value: '1921' } })
    fireEvent.click(save)
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'National Fascist Party',
      type: 'TRANSLATION',
      languageCode: 'en',
      isPrimary: true,
      start: { era: 'AD', year: 1921 },
      end: null,
      note: null,
    })
  })

  it('언어 코드 형식이 틀리면 막는다', () => {
    renderWithTheme(withQuery(<PartyAliasFormModal saving={false} onClose={jest.fn()} onSubmit={jest.fn()} />))
    fireEvent.change(screen.getByLabelText(/^이름/), { target: { value: '파시스트당' } })
    fireEvent.change(screen.getByLabelText(/^언어/), { target: { value: '한국어' } })
    expect(screen.getByText(/ISO 639/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})

describe('정당 법적 지위 모달', () => {
  it('유일 합법 정당 · 1928 ~ (지속 아님) · 근거 법령', async () => {
    const onSubmit = jest.fn()
    renderWithTheme(
      withQuery(
        <PartyLegalStatusFormModal countryId="it" saving={false} onClose={jest.fn()} onSubmit={onSubmit} />,
      ),
    )
    fireEvent.change(screen.getByLabelText('지위'), { target: { value: 'SOLE_LEGAL' } })
    const startField = screen.getByLabelText('시작')
    fireEvent.change(startField.querySelector('input[aria-label="연도"]') as HTMLInputElement, { target: { value: '1928' } })
    const endField = screen.getByLabelText('끝')
    fireEvent.change(endField.querySelector('input[aria-label="연도"]') as HTMLInputElement, { target: { value: '1943' } })
    fireEvent.change(endField.querySelector('input[aria-label="월"]') as HTMLInputElement, { target: { value: '07' } })
    fireEvent.change(endField.querySelector('input[aria-label="일"]') as HTMLInputElement, { target: { value: '27' } })
    await screen.findByRole('option', { name: '국가 방위법(1926)' })
    fireEvent.change(screen.getByLabelText(/^근거 법령/), { target: { value: 'law-1926' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSubmit).toHaveBeenCalledWith({
      status: 'SOLE_LEGAL',
      start: { era: 'AD', year: 1928 },
      end: { era: 'AD', year: 1943, month: 7, day: 27 },
      isCurrent: false,
      lawId: 'law-1926',
      eventId: null,
      note: null,
    })
  })

  it('지속 중이면 끝을 비워 보낸다', () => {
    const onSubmit = jest.fn()
    renderWithTheme(
      withQuery(<PartyLegalStatusFormModal saving={false} onClose={jest.fn()} onSubmit={onSubmit} />),
    )
    const startField = screen.getByLabelText('시작')
    fireEvent.change(startField.querySelector('input[aria-label="연도"]') as HTMLInputElement, { target: { value: '1945' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'LEGAL', isCurrent: true, end: null, start: { era: 'AD', year: 1945 } }),
    )
  })
})
