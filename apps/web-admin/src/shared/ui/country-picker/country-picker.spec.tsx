/**
 * CountryPicker 계약 — 피커 3종(CountrySelectModal·CountrySearchModal·AdvancedCountrySelectModal)이
 * 이 한 구현으로 합쳐졌으므로, 세 피커가 각자 지키던 동작을 여기서 함께 못박는다.
 */
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { CountrySelectModal } from '@/shared/ui/country-select-modal/country-select-modal'

import { CountryPicker, type CountryPickerProps } from './country-picker'
import { sortHistoricalCountries } from './country-picker.lib'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({
  useClickSound: () => jest.fn(),
}))
jest.mock('@/features/continent/use-continents.hook', () => ({
  useContinents: () => ({ data: [] }),
}))
// 역사국가 등록 CTA는 API 계층(import.meta)을 끌어온다 — 이 spec의 관심사가 아니다.
jest.mock('@/shared/ui/country-picker-create/historical-country-create', () => ({
  HistoricalCountryCreateButton: () => null,
  HistoricalCountryCreateHost: () => null,
  HistoricalCountryCreateIcon: () => null,
  useCanCreateHistoricalCountry: () => false,
}))

const MODERN = [
  { id: 'kr', name: '대한민국', isoCode: 'KOR' },
  { id: 'jp', name: '일본', isoCode: 'JPN' },
]
const HISTORICAL = [
  { id: 'joseon', name: '조선', enName: 'Joseon' },
  { id: 'rome', name: '로마', startEra: 'BC', startYear: 753 },
]

function renderPicker(props: Partial<CountryPickerProps> & Pick<CountryPickerProps, 'mode'>) {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onCommit = jest.fn()
  const base = {
    isOpen: true,
    onClose,
    title: '국가 선택',
    modernCountries: MODERN,
    historicalCountries: HISTORICAL,
  }
  const modeProps =
    props.mode === 'batch' ? { mode: 'batch' as const, onCommit } : { mode: props.mode, onSelect }
  renderWithTheme(<CountryPicker {...base} {...props} {...modeProps} />)
  return { onClose, onSelect, onCommit }
}

describe('선택 방식', () => {
  it('single — 고르면 넘기고 닫힌다', () => {
    const { onSelect, onClose } = renderPicker({ mode: 'single' })
    fireEvent.click(screen.getByText('일본'))
    expect(onSelect).toHaveBeenCalledWith({ id: 'jp', name: '일본', isHistorical: false })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggle — 누를 때마다 넘기고 닫지 않는다', () => {
    const { onSelect, onClose } = renderPicker({ mode: 'toggle' })
    fireEvent.click(screen.getByText('일본'))
    fireEvent.click(screen.getByText('대한민국'))
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('batch — 담았다 뺀 결과를 선택 완료에서 한 번에 넘긴다', () => {
    const { onCommit, onClose } = renderPicker({ mode: 'batch', selectedIds: ['kr'] })
    fireEvent.click(screen.getByRole('button', { name: /일본/ }))
    // 트레이 칩으로 빼기 — 목록 행과 같은 초안을 고친다
    fireEvent.click(screen.getByRole('button', { name: '대한민국 빼기' }))
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '선택 완료' }))
    expect(onCommit).toHaveBeenCalledWith([{ id: 'jp', name: '일본', isHistorical: false }])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('batch — 닫기(✕)로 나가면 아무것도 넘기지 않는다', () => {
    const { onCommit, onClose } = renderPicker({ mode: 'batch' })
    fireEvent.click(screen.getByRole('button', { name: /일본/ }))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('batch — 역사국가는 isHistorical true로 넘긴다(존속기간 유무로 추측하지 않는다)', () => {
    const { onCommit } = renderPicker({ mode: 'batch', scope: 'historical' })
    fireEvent.click(screen.getByRole('button', { name: /조선/ }))
    fireEvent.click(screen.getByRole('button', { name: '선택 완료' }))
    expect(onCommit).toHaveBeenCalledWith([{ id: 'joseon', name: '조선', isHistorical: true }])
  })
})

describe('모달 기본기 — 예전 두 피커엔 없던 것', () => {
  it('Esc로 닫힌다', () => {
    const { onClose } = renderPicker({ mode: 'single' })
    fireEvent.keyDown(screen.getByRole('dialog', { name: '국가 선택' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('scope가 한쪽이면 종류 전환이 없다', () => {
    renderPicker({ mode: 'single', scope: 'historical' })
    expect(screen.queryByRole('radiogroup', { name: '국가 종류' })).not.toBeInTheDocument()
    expect(screen.getByText('조선')).toBeInTheDocument()
    expect(screen.queryByText('대한민국')).not.toBeInTheDocument()
  })

  it('영문명으로도 찾는다(F19②)', () => {
    renderPicker({ mode: 'single', scope: 'historical' })
    fireEvent.change(screen.getByRole('textbox', { name: '국가 검색' }), {
      target: { value: 'joseon' },
    })
    expect(screen.getByText('조선')).toBeInTheDocument()
    expect(screen.queryByText('로마')).not.toBeInTheDocument()
  })
})

describe('어댑터', () => {
  it('CountrySelectModal — 단일 선택값에 체크가 걸리고, 역사국가면 역사 탭으로 연다', () => {
    renderWithTheme(
      <CountrySelectModal
        isOpen
        onClose={jest.fn()}
        onSelect={jest.fn()}
        modernCountries={MODERN as never}
        historicalCountries={HISTORICAL as never}
        selectedCountryId="joseon"
      />,
    )
    expect(screen.getByRole('radio', { name: '역사적 국가' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /조선/, pressed: true })).toBeInTheDocument()
  })

  it('CountrySearchModal — id가 빈 sentinel은 목록이 아니라 헤더 버튼이 되고, 누르면 id ""로 넘긴다', () => {
    const onSelect = jest.fn()
    const onClose = jest.fn()
    renderWithTheme(
      <CountrySearchModal
        isOpen
        onClose={onClose}
        historicalOnly
        modernCountries={[]}
        historicalCountries={[{ id: '', name: '선택 안 함' }, ...HISTORICAL]}
        selectedCountryId="joseon"
        onSelect={onSelect}
      />,
    )
    // 목록 행으로는 없다
    expect(screen.queryByRole('button', { name: /선택 안 함/, pressed: false })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '선택 안 함' }))
    expect(onSelect).toHaveBeenCalledWith({ id: '', name: '선택 안 함', isHistorical: true })
    expect(onClose).toHaveBeenCalled()
  })

  it('CountrySearchModal — onSelectMultiple이면 batch로 동작한다', () => {
    const onSelectMultiple = jest.fn()
    renderWithTheme(
      <CountrySearchModal
        isOpen
        onClose={jest.fn()}
        modernOnly
        modernCountries={MODERN}
        historicalCountries={[]}
        selectedCountryIds={['kr']}
        onSelectMultiple={onSelectMultiple}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /일본/ }))
    fireEvent.click(screen.getByRole('button', { name: '선택 완료' }))
    expect(onSelectMultiple).toHaveBeenCalledWith([
      { id: 'kr', name: '대한민국', isHistorical: false },
      { id: 'jp', name: '일본', isHistorical: false },
    ])
  })
})

it('시작년도순은 BC를 음수로 비교하고 미상은 뒤로 보낸다', () => {
  const sorted = sortHistoricalCountries(
    [
      { id: 'unknown', name: '미상국' },
      { id: 'tang', name: '당', startYear: 618 },
      { id: 'rome', name: '로마', startEra: 'BC', startYear: 753 },
    ],
    'startYear',
    'asc',
  )
  expect(sorted.map((country) => country.id)).toEqual(['rome', 'tang', 'unknown'])
})
