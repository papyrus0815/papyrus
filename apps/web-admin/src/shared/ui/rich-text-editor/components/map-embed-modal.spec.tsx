/**
 * 지도 넣기/고치기 모달 — 넣은 지도는 예전엔 고칠 길이 없었다(지우고 다시 넣어야 했다).
 */
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { MapEmbedModal } from './map-embed-modal'

const SRC = 'https://www.google.com/maps/d/embed?mid=1AbC'

it('고치기 모드 — 기존 주소·설명·크기가 채워지고, 삭제가 있다', () => {
  const onDelete = jest.fn()
  const onInsert = jest.fn()
  renderWithTheme(
    <MapEmbedModal
      isOpen
      onClose={jest.fn()}
      onInsert={onInsert}
      onDelete={onDelete}
      initial={{ input: SRC, caption: '진격로', size: 'small' }}
    />,
  )
  expect(screen.getByRole('heading', { name: '지도 고치기' })).toBeInTheDocument()
  expect(screen.getByLabelText('장소 · 주소 · 퍼가기 코드')).toHaveValue(SRC)
  expect(screen.getByLabelText('설명 (선택)')).toHaveValue('진격로')
  expect(screen.getByRole('radio', { name: '작게' })).toHaveAttribute('aria-checked', 'true')

  fireEvent.click(screen.getByRole('radio', { name: '세로로 길게' }))
  fireEvent.click(screen.getByRole('button', { name: '고치기' }))
  expect(onInsert).toHaveBeenCalledWith({ src: SRC, kind: 'mymaps' }, '진격로', 'tall')

  fireEvent.click(screen.getByRole('button', { name: '지도 삭제' }))
  expect(onDelete).toHaveBeenCalled()
})

it('넣기 모드 — 삭제가 없고 크기는 보통', () => {
  renderWithTheme(<MapEmbedModal isOpen onClose={jest.fn()} onInsert={jest.fn()} />)
  expect(screen.getByRole('heading', { name: '지도 넣기' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '지도 삭제' })).not.toBeInTheDocument()
  expect(screen.getByRole('radio', { name: '보통' })).toHaveAttribute('aria-checked', 'true')
})
