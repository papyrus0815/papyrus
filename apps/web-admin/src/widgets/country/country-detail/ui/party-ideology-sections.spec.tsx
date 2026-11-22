import React from 'react'

import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { PartyPositionPeriodModal } from './party-ideology-sections'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))
jest.mock('@/shared/api/military-unit', () => ({}))
jest.mock('@/shared/api/election', () => ({ getLaws: jest.fn(async () => []) }))
jest.mock('./linked-event-picker-field', () => ({ LinkedEventPickerField: () => null }))

const withQuery = (node: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
)

describe('스펙트럼 기간 모달', () => {
  it('스펙트럼을 고르기 전에는 막고, 지속 중이면 끝 없이 보낸다', () => {
    const onSubmit = jest.fn()
    renderWithTheme(withQuery(<PartyPositionPeriodModal saving={false} onClose={jest.fn()} onSubmit={onSubmit} />))
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    expect(screen.getByText('필수: 스펙트럼')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '중도좌파' }))
    const startField = screen.getByLabelText('시작')
    fireEvent.change(startField.querySelector('input[aria-label="연도"]') as HTMLInputElement, { target: { value: '1990' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(save)
    expect(onSubmit).toHaveBeenCalledWith({
      position: 'CENTER_LEFT',
      start: { era: 'AD', year: 1990 },
      end: null,
      isCurrent: true,
      note: null,
    })
  })

  it('끝이 시작보다 앞서면 막는다', () => {
    renderWithTheme(withQuery(<PartyPositionPeriodModal saving={false} onClose={jest.fn()} onSubmit={jest.fn()} />))
    fireEvent.click(screen.getByRole('radio', { name: '우파' }))
    fireEvent.change(screen.getByLabelText('시작').querySelector('input[aria-label="연도"]') as HTMLInputElement, {
      target: { value: '1990' },
    })
    fireEvent.change(screen.getByLabelText('끝').querySelector('input[aria-label="연도"]') as HTMLInputElement, {
      target: { value: '1980' },
    })
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
