import React, { useState } from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import {
  GovMoreFieldGroup,
  GovMoreFieldLabel,
  GovMorePopover,
  GovMoreTextInput,
} from './gov-more-popover'

function PopoverTestHarness({
  onActionClick,
}: {
  onActionClick: jest.Mock
}) {
  const [viewMode, setViewMode] = useState<'TREE' | 'LEDGER'>('TREE')
  const [groupByEra, setGroupByEra] = useState(true)
  const [yearVal, setYearVal] = useState('')

  return (
    <div>
      <span data-testid="current-view">{viewMode}</span>
      <span data-testid="current-era">{groupByEra ? 'ON' : 'OFF'}</span>
      <span data-testid="current-year">{yearVal}</span>
      <GovMorePopover
        ariaLabel="기관 목록 보기 및 필터 설정"
        hasActiveIndicator={viewMode !== 'TREE' || Boolean(yearVal)}
        segments={[
          {
            key: 'view',
            label: '목록 표시 방식',
            value: viewMode,
            options: [
              { value: 'TREE', label: '편제 트리' },
              { value: 'LEDGER', label: '원장 표' },
            ],
            onChange: (nextVal) => setViewMode(nextVal as 'TREE' | 'LEDGER'),
          },
        ]}
        customContent={
          <GovMoreFieldGroup>
            <GovMoreFieldLabel htmlFor="snap-year">
              기준 연도 스냅샷 필터
            </GovMoreFieldLabel>
            <GovMoreTextInput
              id="snap-year"
              value={yearVal}
              onChange={(changeEvt) => setYearVal(changeEvt.target.value)}
              placeholder="예: 1941"
            />
          </GovMoreFieldGroup>
        }
        toggles={[
          {
            key: 'group-era',
            label: '시대·정체별 묶음 표시',
            checked: groupByEra,
            onChange: setGroupByEra,
          },
        ]}
        actions={[
          {
            key: 'manage-categories',
            label: '전역 직능 분류 관리',
            badge: '12',
            onClick: () => onActionClick('manage-categories'),
          },
          {
            key: 'delete-item',
            label: '기관 삭제',
            danger: true,
            onClick: () => onActionClick('delete-item'),
          },
        ]}
      />
    </div>
  )
}

describe('GovMorePopover', () => {
  it('opens on trigger click, updates segmented/toggle/custom controls, and closes on action or Escape', () => {
    const handleActionClick = jest.fn()
    renderWithTheme(<PopoverTestHarness onActionClick={handleActionClick} />)

    const triggerBtn = screen.getByRole('button', {
      name: '기관 목록 보기 및 필터 설정',
    })
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(triggerBtn)
    expect(triggerBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Segmented switch stays open while changing view mode
    fireEvent.click(screen.getByRole('button', { name: '원장 표' }))
    expect(screen.getByTestId('current-view')).toHaveTextContent('LEDGER')
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Custom year input inside popover updates state
    const yearInput = screen.getByLabelText('기준 연도 스냅샷 필터')
    fireEvent.change(yearInput, { target: { value: '1941' } })
    expect(screen.getByTestId('current-year')).toHaveTextContent('1941')

    // Toggle checkbox updates state
    const eraToggle = screen.getByRole('menuitemcheckbox')
    fireEvent.click(eraToggle)
    expect(screen.getByTestId('current-era')).toHaveTextContent('OFF')

    // Escape closes popover
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    // Reopen and click action item -> invokes callback and closes menu
    fireEvent.click(triggerBtn)
    fireEvent.click(
      screen.getByRole('menuitem', { name: /전역 직능 분류 관리/ }),
    )
    expect(handleActionClick).toHaveBeenCalledWith('manage-categories')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
