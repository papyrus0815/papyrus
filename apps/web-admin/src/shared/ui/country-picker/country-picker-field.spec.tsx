import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { CountryPickerField } from './country-picker-field'

it('값이 없으면 안내 문구, 누르면 피커를 연다', () => {
  const onOpen = jest.fn()
  renderWithTheme(<CountryPickerField id="field" value={null} placeholder="선택 안 함" onOpen={onOpen} />)
  fireEvent.click(screen.getByRole('button', { name: /선택 안 함/ }))
  expect(onOpen).toHaveBeenCalledTimes(1)
})

it('고른 값은 이름·역사 표시와 함께 보이고 ✕로 비운다', () => {
  const onClear = jest.fn()
  renderWithTheme(
    <CountryPickerField value={{ name: '조선', isHistorical: true }} onOpen={jest.fn()} onClear={onClear} />,
  )
  expect(screen.getByText('조선')).toBeInTheDocument()
  expect(screen.getByText('역사')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '조선 비우기' }))
  expect(onClear).toHaveBeenCalledTimes(1)
})
