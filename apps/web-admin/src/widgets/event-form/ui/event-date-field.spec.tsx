import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { EventDateField } from './event-date-field'

jest.mock('@/shared/ui/date-picker/date-picker-modal', () => ({
  DatePickerModal: () => null,
}))

function setup(props: Partial<React.ComponentProps<typeof EventDateField>> = {}) {
  const onChange = jest.fn()
  const onInputErrorChange = jest.fn()
  const view = renderWithTheme(
    <EventDateField
      value=""
      precision="day"
      allowPartial
      onChange={onChange}
      onInputErrorChange={onInputErrorChange}
      ariaLabel="시작 날짜"
      pickerTitle="시작 일자 선택"
      {...props}
    />,
  )
  return { onChange, onInputErrorChange, ...view }
}

it('칸에 연도만 치면 연도 정밀도로 넘긴다(달력 없이)', () => {
  const { onChange } = setup()
  fireEvent.change(screen.getByRole('textbox', { name: '연도' }), { target: { value: '1950' } })
  expect(onChange).toHaveBeenLastCalledWith('1950-01-01', 'year')
})

it('잘못된 날짜는 빈 값과 오류 문구로 알린다', () => {
  const { onChange, onInputErrorChange } = setup({ value: '2023-02-01', precision: 'month' })
  fireEvent.change(screen.getByRole('textbox', { name: '일' }), { target: { value: '30' } })
  expect(onChange).toHaveBeenLastCalledWith('', 'month')
  expect(onInputErrorChange).toHaveBeenLastCalledWith('2월은 28일까지입니다.')
})

it('바깥 값이 바뀌면(편집 로드) 칸을 다시 채운다', () => {
  const { rerender } = setup()
  rerender(
    <EventDateField
      value="-0044-03-15"
      precision="day"
      allowPartial
      onChange={jest.fn()}
      onInputErrorChange={jest.fn()}
      ariaLabel="시작 날짜"
      pickerTitle="시작 일자 선택"
    />,
  )
  expect(screen.getByRole('textbox', { name: '연도' })).toHaveValue('44')
  expect(screen.getByRole('button', { name: /기원전/ })).toBeInTheDocument()
})

it('월에 6을 입력하면 16월 등은 없으므로 자동으로 06이 되고 일 칸으로 포커스가 이동한다', () => {
  const { onChange } = setup({ value: '1950-01-01', precision: 'year' })
  const monthInput = screen.getByRole('textbox', { name: '월' })
  const dayInput = screen.getByRole('textbox', { name: '일' })

  fireEvent.change(monthInput, { target: { value: '6' } })
  expect(monthInput).toHaveValue('06')
  expect(dayInput).toHaveFocus()
  expect(onChange).toHaveBeenLastCalledWith('1950-06-01', 'month')
})

it('월이 1인 상태에서 6을 입력해 16이 되어도 자동으로 06으로 보정하고 일 칸으로 포커스가 이동한다', () => {
  const { onChange } = setup({ value: '1950-01-01', precision: 'year' })
  const monthInput = screen.getByRole('textbox', { name: '월' })
  const dayInput = screen.getByRole('textbox', { name: '일' })

  fireEvent.change(monthInput, { target: { value: '1' } })
  expect(monthInput).toHaveValue('1')

  fireEvent.change(monthInput, { target: { value: '16' } })
  expect(monthInput).toHaveValue('06')
  expect(dayInput).toHaveFocus()
  expect(onChange).toHaveBeenLastCalledWith('1950-06-01', 'month')
})

it('일에 5를 입력하면 40일~99일 등은 없으므로 자동으로 05가 되고, 3 뒤에 5를 쳐 35가 되어도 05로 보정한다', () => {
  const { onChange } = setup({ value: '1950-06-01', precision: 'month' })
  const dayInput = screen.getByRole('textbox', { name: '일' })

  fireEvent.change(dayInput, { target: { value: '5' } })
  expect(dayInput).toHaveValue('05')
  expect(onChange).toHaveBeenLastCalledWith('1950-06-05', 'day')

  fireEvent.change(dayInput, { target: { value: '3' } })
  expect(dayInput).toHaveValue('3')
  fireEvent.change(dayInput, { target: { value: '35' } })
  expect(dayInput).toHaveValue('05')
  expect(onChange).toHaveBeenLastCalledWith('1950-06-05', 'day')
})
