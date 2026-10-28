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
