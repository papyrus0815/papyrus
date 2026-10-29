import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'
import { PersonActionsMenu } from './person-actions-menu'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => ({ playClickSound: jest.fn() }),
}))

describe('PersonActionsMenu', () => {
  it('더보기 트리거 클릭 시 새 인물 등록·인물 삭제 메뉴가 열리고 각 액션을 호출한다', () => {
    const onAdd = jest.fn()
    const onDelete = jest.fn()

    renderWithTheme(<PersonActionsMenu onAdd={onAdd} onDelete={onDelete} />)

    const trigger = screen.getByRole('button', { name: '인물 메뉴' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const addItem = screen.getByRole('menuitem', { name: /새 인물 등록/ })
    fireEvent.click(addItem)
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    const deleteItem = screen.getByRole('menuitem', { name: /인물 삭제/ })
    fireEvent.click(deleteItem)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('onAdd가 없으면 인물 삭제 항목만 표시하고 Escape로 닫힌다', () => {
    const onDelete = jest.fn()

    renderWithTheme(<PersonActionsMenu onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: '인물 메뉴' }))
    expect(screen.queryByRole('menuitem', { name: /새 인물 등록/ })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /인물 삭제/ })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
