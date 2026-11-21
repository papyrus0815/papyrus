import React, { useState } from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen, within } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { type PlaceResult, PlaceSelect } from './place-autocomplete'

jest.mock('@/shared/api/city', () => ({
  cityApi: {
    searchCities: jest.fn(async () => []),
    searchAdministrativeDivisions: jest.fn(async () => []),
  },
}))
jest.mock('@/shared/api/country', () => ({ countryApi: { getAll: jest.fn(async () => []) } }))

const HISTORY = [
  { text: '신성로마 오스트리아 빈 호프부르크 궁', count: 5 },
  { text: '프랑스 왕국 퐁텐블로', count: 2 },
  { text: '나폴리 왕국 나폴리', count: 1 },
]

function Harness({ onOpen = jest.fn() }: { onOpen?: () => void }) {
  const [value, setValue] = useState<PlaceResult | null>(null)
  return (
    <>
      <PlaceSelect value={value} onChange={setValue} history={HISTORY} onOpen={onOpen} />
      <output data-testid="value">{value ? `${value.shortName}|${value.isManual ? 'manual' : 'db'}` : ''}</output>
    </>
  )
}

describe('PlaceSelect — 출생지·사망지 드롭다운', () => {
  it('칸을 누르면 바로 열린다 — 비었으면 자주 쓴 장소', () => {
    const onOpen = jest.fn()
    renderWithTheme(<Harness onOpen={onOpen} />)
    fireEvent.focus(screen.getByRole('combobox'))
    expect(onOpen).toHaveBeenCalled()
    const list = screen.getByRole('listbox', { name: '장소 후보' })
    expect(list).toHaveTextContent('자주 쓴 장소')
    expect(within(list).getAllByRole('option')).toHaveLength(3)
    expect(within(list).getAllByRole('option')[0]).toHaveTextContent('5명')
  })

  it('치면 직접 입력 행이 맨 앞(Enter = 친 그대로), 다른 인물 기록이 걸러진다', () => {
    renderWithTheme(<Harness />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '나폴리' } })
    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options[0]).toHaveTextContent('“나폴리”')
    expect(options[1]).toHaveTextContent('나폴리 왕국 나폴리')
    expect(screen.getByRole('listbox')).toHaveTextContent('다른 인물 기록')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByTestId('value')).toHaveTextContent('나폴리|manual')
  })

  it('다른 인물 기록을 고르면 그 지명이 값이 된다', () => {
    renderWithTheme(<Harness />)
    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /프랑스 왕국 퐁텐블로/ }))
    expect(screen.getByTestId('value')).toHaveTextContent('프랑스 왕국 퐁텐블로|manual')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
